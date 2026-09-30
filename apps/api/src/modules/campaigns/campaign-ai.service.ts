import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';

export interface CampaignDraftInput {
  goal: string;
  channel: 'EMAIL' | 'WHATSAPP';
  audience?: 'All' | 'VIP' | 'At Risk' | 'Inactive';
}

export interface CampaignDraft {
  name: string;
  subject: string;
  body: string;
  /** "ai" when a model wrote it, "template" when no AI provider is configured or it failed. */
  source: 'ai' | 'template';
}

const AUDIENCE_NOTE: Record<string, string> = {
  All: 'every customer of the business',
  VIP: 'the most loyal, highest-spending customers',
  'At Risk': 'customers who are visiting less often and may stop coming',
  Inactive: 'customers who have not visited for a long time',
};

const PROVIDERS: Record<string, { keyEnv: string; baseUrl: string; defaultModel: string }> = {
  openai: { keyEnv: 'OPENAI_API_KEY', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
  openrouter: { keyEnv: 'OPENROUTER_API_KEY', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o-mini' },
  groq: { keyEnv: 'GROQ_API_KEY', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
  deepseek: { keyEnv: 'DEEPSEEK_API_KEY', baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' },
  gemini: {
    keyEnv: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-2.0-flash',
  },
  anthropic: { keyEnv: 'ANTHROPIC_API_KEY', baseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-5-sonnet-latest' },
};

/**
 * Drafts campaign copy with the workspace's configured AI provider (the same
 * AI_PROVIDER / AI_MODEL settings the assistant uses). The model only receives
 * the business name and category, the channel, the audience segment and the
 * owner's goal — never customer records.
 */
@Injectable()
export class CampaignAiService {
  private readonly logger = new Logger(CampaignAiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async draft(tenantId: string, input: CampaignDraftInput): Promise<CampaignDraft> {
    const goal = (input.goal || '').trim();
    if (goal.length < 3) throw new BadRequestException('Describe what the campaign is about.');
    const audience = input.audience || 'All';

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, category: true },
    });
    const business = tenant?.name || 'our business';

    const provider = this.providerConfig();
    if (provider) {
      try {
        const raw = await this.complete(provider, this.systemPrompt(input.channel), [
          `Business: ${business}${tenant?.category ? ` (${tenant.category})` : ''}`,
          `Channel: ${input.channel}`,
          `Audience: ${audience} — ${AUDIENCE_NOTE[audience]}`,
          `What the owner wants: ${goal}`,
        ].join('\n'));
        const draft = this.parse(raw);
        if (draft) return { ...draft, source: 'ai' };
        this.logger.warn('Campaign AI returned an unreadable draft; using template.');
      } catch (err: any) {
        this.logger.warn(`Campaign AI failed, using template: ${err?.message || err}`);
      }
    }
    return this.template(business, goal, input.channel);
  }

  private systemPrompt(channel: 'EMAIL' | 'WHATSAPP'): string {
    return [
      'You write short marketing messages that a local business sends to its own customers.',
      'Reply with ONLY a JSON object: {"name": string, "subject": string, "body": string}.',
      '- name: an internal campaign name, at most 6 words.',
      channel === 'EMAIL'
        ? '- subject: the email subject line, at most 60 characters, no emoji, no ALL CAPS.'
        : '- subject: an empty string.',
      channel === 'EMAIL'
        ? '- body: plain text, 60 to 120 words, short paragraphs separated by a blank line. No HTML or markdown.'
        : '- body: plain text, at most 500 characters, friendly and direct. No markdown.',
      '- Start the body with a greeting that uses the placeholder, for example "Hi {{firstName}}," (translated to the owner\'s language).',
      '- Only mention an offer, discount, price, date or deadline if the owner stated it. Never invent one.',
      '- End with one clear next step and sign off with the business name.',
      '- Write in the same language the owner used.',
    ].join('\n');
  }

  private providerConfig(): { name: string; apiKey: string; baseURL: string; model: string } | null {
    const name = (
      this.config.get<string>('AI_PROVIDER') ||
      (this.config.get<string>('OPENAI_API_KEY') ? 'openai' : '')
    ).toLowerCase();
    const cfg = PROVIDERS[name] || PROVIDERS.openai;
    const apiKey =
      this.config.get<string>('AI_API_KEY') ||
      this.config.get<string>(cfg.keyEnv) ||
      this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) return null;
    return {
      name: PROVIDERS[name] ? name : 'openai',
      apiKey,
      baseURL: (this.config.get<string>('AI_BASE_URL') || cfg.baseUrl).replace(/\/+$/, ''),
      model: this.config.get<string>('AI_MODEL') || this.config.get<string>('OPENAI_MODEL') || cfg.defaultModel,
    };
  }

  private async complete(
    provider: { name: string; apiKey: string; baseURL: string; model: string },
    system: string,
    user: string,
  ): Promise<string> {
    const signal = AbortSignal.timeout(25_000);
    if (provider.name === 'anthropic') {
      const res = await fetch(`${provider.baseURL}/messages`, {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: 700,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (!res.ok) throw new Error(`Provider ${res.status}`);
      const json: any = await res.json();
      return (json?.content || []).map((part: any) => part?.text || '').join('');
    }
    const res = await fetch(`${provider.baseURL}/chat/completions`, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 700,
        temperature: 0.6,
      }),
    });
    if (!res.ok) throw new Error(`Provider ${res.status}`);
    const json: any = await res.json();
    return json?.choices?.[0]?.message?.content || '';
  }

  private parse(raw: string): Omit<CampaignDraft, 'source'> | null {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      const data = JSON.parse(raw.slice(start, end + 1));
      const body = typeof data.body === 'string' ? data.body.trim() : '';
      if (!body) return null;
      return {
        name: String(data.name || 'New campaign').trim().slice(0, 200),
        subject: String(data.subject || '').trim().slice(0, 300),
        body: body.slice(0, 10_000),
      };
    } catch {
      return null;
    }
  }

  /** Used when no AI provider is configured: a plain starting point, not AI copy. */
  private template(business: string, goal: string, channel: 'EMAIL' | 'WHATSAPP'): CampaignDraft {
    const topic = goal.replace(/\s+/g, ' ').slice(0, 300);
    const name = topic.length > 40 ? `${topic.slice(0, 40).trim()}…` : topic;
    return {
      name,
      subject: channel === 'EMAIL' ? `A note from ${business}` : '',
      body: `Hi {{firstName}},\n\n${topic}\n\nWe would love to see you again soon.\n\n${business}`,
      source: 'template',
    };
  }
}
