import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';

export type SupportAiContext = {
  businessName: string;
  plan: string;
  subscriptionStatus: string;
  integrations: { type: string; status: string }[];
  currentPage?: string;
};

export type SupportAiResult = {
  text: string;
  sources: { id: string; slug: string; title: string; category: string }[];
  escalate: boolean;
  suggestedCategory?: string;
  suggestedPriority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  suggestedSubject?: string;
  provider: string;
  model: string;
};

const ESCALATION_RULES: { re: RegExp; category: string; priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' }[] = [
  { re: /\b(refund|charge(d)? (me )?wrong|wrong charge|double charge|overcharged|billing (issue|error|problem)|wrong invoice|subscription (fee|charge) (issue|problem)|cancel my subscription|stop charging|downgrade my plan)\b/i, category: 'Billing & Payments' },
  { re: /\b(account (locked|blocked|hacked)|forgot password|reset password|2fa|two[- ]factor|unauthorized|security (issue|concern)|can'?t login|locked out)\b/i, category: 'Account & Login', priority: 'URGENT' },
  { re: /\b(payment failed|payment not (received|appearing)|payment didn'?t|not paid|payout (failed|missing)|gateway error|razorpay|stripe).*(fail|error|problem|not|missing|issue)/i, category: 'Billing & Payments' },
  { re: /\b(bug|glitch|error|broken|not working|failed|crash|stuck|shows (an )?error|data (lost|missing|disappeared)|can'?t (save|load|open|send)|stopped working)\b/i, category: 'Technical Issue' },
  { re: /\b(integration.*(not working|failed|broken|stopped)|not syncing|sync (issue|problem)|reconnect|webhook (not|failed)|calendar not syncing|whatsapp (not|failed) (sending|syncing))\b/i, category: 'Integrations' },
  { re: /\b(urgent|asap|immediately|emergency|right now)\b/i, category: 'Other', priority: 'URGENT' },
  { re: /\b(can'?t (book|schedule)|booking (not|didn'?t)|appointment (missing|wrong|not showing|duplicate)|no[- ]show)\b/i, category: 'Appointments & Booking' },
  { re: /\b(campaign (not|didn'?t|failed) (send|sent|go)|email (not|didn'?t) (send|sent|deliver))\b/i, category: 'Campaigns' },
  { re: /\b(points (not|stopped|missing|didn'?t)|reward (not|missing|didn'?t)|redeem.*(not|fail|error))\b/i, category: 'Loyalty & Rewards' },
  { re: /\b(website (not|didn'?t) (publish|update|show)|builder (error|broken|not working))\b/i, category: 'Website Builder' },
  { re: /\b(analytics|report|chart).*(not|stopped|missing|wrong|error)/i, category: 'Analytics' },
  { re: /\b(ai assistant|doloyal ai).*(not|error|broken|stuck|wrong)/i, category: 'AI Assistant' },
  { re: /\b(customer (missing|not (found|showing)|duplicate|merged wrongly)|can'?t (find|merge) customer)\b/i, category: 'Customers' },
  { re: /\b(membership (not|missing|wrong|error)|can'?t (assign|cancel) membership)\b/i, category: 'Memberships' },
];

@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Build a SAFE snapshot of account context for the AI — never secrets,
   * tokens, credentials, or raw customer PII beyond what's needed.
   */
  async buildContextSnapshot(tenantId: string): Promise<SupportAiContext> {
    const [tenant, sub, integrations] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
      this.prisma.subscription.findFirst({
        where: { tenantId },
        select: { plan: true, status: true },
      }),
      this.prisma.integration.findMany({
        where: { tenantId },
        select: { type: true, status: true },
      }),
    ]);

    return {
      businessName: tenant?.name || 'your business',
      plan: sub?.plan || 'Free',
      subscriptionStatus: sub?.status || 'ACTIVE',
      integrations: integrations.map((i) => ({ type: i.type, status: i.status })),
    };
  }

  /** Simple lexical retrieval over the knowledge base. */
  private async retrieve(query: string, limit = 5) {
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !this.stopWords.has(w));

    const articles = await this.prisma.supportArticle.findMany({
      where: { published: true },
      select: { id: true, slug: true, title: true, description: true, content: true, category: true, keywords: true },
      take: 300,
    });

    const scored = articles
      .map((a) => {
        const hayTitle = a.title.toLowerCase();
        const hayDesc = (a.description || '').toLowerCase();
        const hayContent = a.content.toLowerCase();
        const hayCat = a.category.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (hayTitle.includes(kw)) score += 3;
          if (hayDesc.includes(kw)) score += 2;
          if (hayCat.includes(kw)) score += 1.5;
          if (a.keywords.some((k) => k.toLowerCase() === kw)) score += 3;
          if (hayContent.includes(kw)) score += 1;
        }
        return { article: a, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => s.article);
  }

  private readonly stopWords = new Set([
    'the', 'and', 'for', 'with', 'how', 'why', 'what', 'when', 'where', 'does',
    'do', 'my', 'me', 'can', 'i', 'a', 'an', 'to', 'of', 'in', 'on', 'is', 'it',
    'not', 'you', 'your', 'are', 'am', 'was', 'be', 'this', 'that', 'help', 'about',
  ]);

  private getProviderConfig() {
    const provider = (
      this.config.get<string>('AI_PROVIDER') ||
      (this.config.get<string>('OPENAI_API_KEY') ? 'openai' : 'fallback')
    ).toLowerCase();

    const map: Record<string, { keyEnv: string; baseUrl?: string; defaultModel: string }> = {
      openai: { keyEnv: 'OPENAI_API_KEY', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
      openrouter: { keyEnv: 'OPENROUTER_API_KEY', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o-mini' },
      groq: { keyEnv: 'GROQ_API_KEY', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
      deepseek: { keyEnv: 'DEEPSEEK_API_KEY', baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' },
      gemini: { keyEnv: 'GEMINI_API_KEY', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', defaultModel: 'gemini-2.0-flash' },
    };

    const cfg = map[provider] || map.openai;
    const apiKey =
      this.config.get<string>('AI_API_KEY') ||
      this.config.get<string>(cfg.keyEnv) ||
      this.config.get<string>('OPENAI_API_KEY');
    const baseURL = this.config.get<string>('AI_BASE_URL') || cfg.baseUrl;
    const model = this.config.get<string>('AI_MODEL') || this.config.get<string>('OPENAI_MODEL') || cfg.defaultModel;

    return { provider: apiKey ? provider : 'fallback', apiKey, baseURL, model };
  }

  private systemPrompt(context: SupportAiContext, knowledge: string) {
    return `You are "Ask Doloyal", the AI support assistant for the Doloyal customer-retention SaaS for local businesses.

You help customers use Doloyal: dashboard, analytics, customers, appointments, booking links, loyalty, rewards, memberships, referrals, campaigns, workflows, Doloyal AI, website builder, website connections, integrations (Google Calendar, Stripe, Razorpay, WhatsApp Business, Resend), billing, invoices, staff, branches, and settings.

USE ONLY the knowledge base and the account context below. If the answer is not in the knowledge base, say you couldn't find a specific answer and offer to escalate to a human support agent. NEVER invent product features, limits, or prices.

ACCOUNT CONTEXT (safe snapshot only):
- Business: ${context.businessName}
- Plan: ${context.plan}
- Subscription status: ${context.subscriptionStatus}
- Connected integrations: ${context.integrations.map((i) => `${i.type} (${i.status})`).join(', ') || 'none'}
- Current dashboard page: ${context.currentPage || 'unknown'}

KNOWLEDGE BASE:
${knowledge}

RULES:
- Be concise and friendly. Use Markdown with short headings, lists, or steps when helpful.
- Give step-by-step guidance with exact sidebar/navigation paths when you can.
- Never claim to have taken an action, changed a setting, or processed a payment.
- Never ask for or handle passwords, API keys, card numbers, or OAuth tokens. If needed for an issue, tell the user to enter it on the relevant settings page.
- If the user's issue is about billing, refunds, urgent problems, technical errors, account access/security, or anything you cannot resolve from the knowledge base, end your reply with exactly: "I couldn't fully resolve this. Would you like to create a support ticket so our team can help?"`;
  }

  async answer(
    tenantId: string,
    conversationId: string,
    message: string,
    context: SupportAiContext,
  ): Promise<SupportAiResult> {
    const articles = await this.retrieve(message);
    const knowledge = articles
      .map(
        (a) =>
          `[${a.title}] (category: ${a.category})\n${(a.description || '')}\n${a.content}`,
      )
      .join('\n\n---\n\n');

    const history = await this.prisma.supportConversationMessage.findMany({
      where: { conversationId, tenantId },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { senderType: true, content: true },
    });

    let text = '';
    let provider = 'fallback';
    let model = 'rules';
    let fromAi = false;

    const { apiKey, baseURL, model: cfgModel } = this.getProviderConfig();
    if (apiKey && this.getProviderConfig().provider !== 'fallback') {
      try {
        const result = await this.generateWithProvider({
          apiKey,
          baseURL: baseURL!,
          model: cfgModel,
          context,
          knowledge,
          history,
          message,
        });
        text = result.text;
        provider = result.provider;
        model = result.model;
        fromAi = true;
      } catch (err: any) {
        this.logger.warn(`Ask Doloyal provider failed, using fallback: ${err?.message || err}`);
      }
    }

    if (!fromAi) {
      text = this.fallbackReply(message, articles);
      provider = 'fallback';
      model = 'rules';
    }

    const escalation = this.evaluateEscalation(message, text);

    return {
      text,
      sources: articles.map((a) => ({ id: a.id, slug: a.slug, title: a.title, category: a.category })),
      escalate: escalation.escalate,
      suggestedCategory: escalation.category,
      suggestedPriority: escalation.priority,
      suggestedSubject: escalation.subject,
      provider,
      model,
    };
  }

  private async generateWithProvider(opts: {
    apiKey: string;
    baseURL: string;
    model: string;
    context: SupportAiContext;
    knowledge: string;
    history: { senderType: string; content: string }[];
    message: string;
  }) {
    const historyMessages = opts.history
      .filter((m) => m.senderType === 'USER' || m.senderType === 'AI')
      .slice(-14)
      .map((m) => ({
        role: m.senderType === 'AI' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

    const res = await fetch(`${opts.baseURL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: 'system', content: this.systemPrompt(opts.context, opts.knowledge) },
          ...historyMessages,
          { role: 'user', content: opts.message },
        ],
        max_tokens: 900,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Provider ${res.status}: ${errText.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const text = json?.choices?.[0]?.message?.content || '';
    if (!text.trim()) throw new Error('Empty provider response');
    return { text, provider: opts.baseURL.includes('openrouter') ? 'openrouter' : 'openai', model: opts.model };
  }

  private fallbackReply(
    message: string,
    articles: { title: string; description: string | null; content: string; category: string }[],
  ) {
    if (articles.length === 0) {
      return `I couldn't find a specific article about that in the Doloyal help center, and I don't want to guess.\n\nI couldn't fully resolve this. Would you like to create a support ticket so our team can help?`;
    }

    const top = articles[0];
    const excerpt = top.content
      .split('\n')
      .filter((l) => l.trim())
      .slice(0, 8)
      .join('\n');

    return `Here's what I found in the Doloyal help center about "${top.title}":\n\n${excerpt}\n\nYou can read the full guide anytime in **Help & Support → Help Center**.${articles.length > 1 ? `\n\nRelated guides:\n${articles.slice(1, 4).map((a) => `- ${a.title}`).join('\n')}` : ''}`;
  }

  private evaluateEscalation(message: string, aiText: string) {
    // Keyword rules scan the USER message only — the AI reply legitimately
    // contains words like "reconnect" or "error" that would over-trigger.
    const explicitOffer = /couldn'?t (fully )?resolve|create a support ticket|create a ticket/i.test(aiText);

    for (const rule of ESCALATION_RULES) {
      if (rule.re.test(message)) {
        const subject = this.suggestSubject(message);
        return {
          escalate: true,
          category: rule.category,
          priority: rule.priority,
          subject,
        };
      }
    }

    return { escalate: explicitOffer, category: 'Other', priority: 'NORMAL' as const, subject: this.suggestSubject(message) };
  }

  private suggestSubject(message: string) {
    const clean = message.replace(/\s+/g, ' ').trim().slice(0, 90);
    if (!clean) return `Support request`;
    return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
  }

  /**
   * Admin-side assist: draft a reply to a support ticket using the knowledge
   * base + the latest customer message. Never returns customer PII beyond the
   * message content already visible to the agent.
   */
  async assistAgent(ticket: any, lastCustomerMessage: string, context: SupportAiContext) {
    const query = `${ticket.subject || ''} ${ticket.description || ''} ${lastCustomerMessage || ''}`;
    const articles = await this.retrieve(query, 5);
    const knowledge = articles
      .map((a) => `[${a.title}]\n${a.content}`)
      .join('\n\n---\n\n');

    let draft = '';
    let provider = 'fallback';
    let model = 'rules';
    let usedAi = false;

    const { apiKey, baseURL, model: cfgModel } = this.getProviderConfig();
    if (apiKey && this.getProviderConfig().provider !== 'fallback') {
      try {
        const res = await fetch(`${baseURL!.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: cfgModel,
            messages: [
              {
                role: 'system',
                content: `You are a Doloyal support agent drafting a reply to a customer support ticket.
Use ONLY the knowledge base below. Draft a warm, concise reply (under 200 words) with clear steps. If the issue is about billing, refunds, or needs account action, say you'll help further and ask for the specific details needed. Never invent policies or prices.
Business: ${context.businessName} (plan ${context.plan}, status ${context.subscriptionStatus}).

KNOWLEDGE BASE:
${knowledge}`,
              },
              { role: 'user', content: `Ticket subject: ${ticket.subject}\nDescription: ${ticket.description}\nLatest customer message: ${lastCustomerMessage || '(none)'}` },
            ],
            max_tokens: 400,
            temperature: 0.3,
          }),
        });
        if (!res.ok) throw new Error(`Provider ${res.status}`);
        const json: any = await res.json();
        draft = (json?.choices?.[0]?.message?.content || '').trim();
        usedAi = !!draft;
      } catch (err: any) {
        this.logger.warn(`Ask Doloyal assist failed, using fallback: ${err?.message || err}`);
      }
    }

    if (!usedAi) {
      draft = articles.length
        ? `Hi there,\n\nThanks for reaching out. Based on the help center, here's a summary for this issue:\n\n${articles[0].content.split('\n').filter(Boolean).slice(0, 10).join('\n')}\n\nPlease let me know if you need anything else.`
        : `Hi there,\n\nThanks for reaching out. I've looked into this for you. Could you share a bit more detail (screenshot or the exact error message) so I can help resolve it quickly?\n\nBest,\nThe Doloyal Support Team`;
      provider = 'fallback';
      model = 'rules';
    }

    return {
      draft,
      articles: articles.map((a) => ({ id: a.id, slug: a.slug, title: a.title, category: a.category })),
      provider,
      model,
    };
  }
}
