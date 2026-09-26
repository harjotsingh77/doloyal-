import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { resolveOverviewRange, type BusinessHealthInsight, type BusinessHealthStatus, currencySymbol, formatMoney, DEFAULT_CURRENCY } from '@doloyal/shared';
import {
  AgentServices,
  AgentToolContext,
  agentToolDefinitions,
  checkAgentToolPermission,
  getAgentTool,
} from './agent-tools';
import { CustomersService } from '../customers/customers.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { BookingLinksService } from '../booking-links/booking-links.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ReferralsService } from '../referrals/referrals.service';
import { RewardsService } from '../rewards/rewards.service';
import { MembershipsService } from '../memberships/memberships.service';
import { BranchesService } from '../branches/branches.service';
import { InvoicesService } from '../invoices/invoices.service';
import { WorkflowService } from '../workflows/workflow.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

export type ChatAttachmentInput = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  textExtract?: string;
  previewUrl?: string;
  contentBase64?: string;
};

type StreamHandlers = {
  onToken: (token: string) => void;
  onMeta?: (meta: Record<string, unknown>) => void;
  signal?: AbortSignal;
};

type HealthSnapshot = Record<string, number>;

type MoneyCtx = {
  code: string;
  symbol: string;
  money: (amount: number) => string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly healthCache = new Map<
    string,
    { fingerprint: string; result: BusinessHealthInsight; expiresAt: number }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly campaignsService: CampaignsService,
    private readonly bookingLinksService: BookingLinksService,
    private readonly appointmentsService: AppointmentsService,
    private readonly referralsService: ReferralsService,
    private readonly rewardsService: RewardsService,
    private readonly membershipsService: MembershipsService,
    private readonly branchesService: BranchesService,
    private readonly invoicesService: InvoicesService,
    private readonly workflowsService: WorkflowService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  private agentServices(): AgentServices {
    return {
      customers: this.customersService,
      campaigns: this.campaignsService,
      bookingLinks: this.bookingLinksService,
      appointments: this.appointmentsService,
      referrals: this.referralsService,
      rewards: this.rewardsService,
      memberships: this.membershipsService,
      branches: this.branchesService,
      invoices: this.invoicesService,
      workflows: this.workflowsService,
      loyalty: this.loyaltyService,
    };
  }

  // ─── Conversations ─────────────────────────────────────────────────────────

  async listConversations(tenantId: string, userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { tenantId, userId, deletedAt: null, archived: false },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        title: true,
        pinned: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true },
        },
      },
    });
  }

  async getConversation(tenantId: string, userId: string, id: string) {
    const conv = await this.prisma.aiConversation.findFirst({
      where: { id, tenantId, userId, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { attachments: true, feedback: { where: { userId } } },
        },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async createConversation(tenantId: string, userId: string, title?: string) {
    return this.prisma.aiConversation.create({
      data: {
        tenantId,
        userId,
        title: title?.trim() || 'New chat',
      },
    });
  }

  async renameConversation(tenantId: string, userId: string, id: string, title: string) {
    await this.assertConversation(tenantId, userId, id);
    const next = title.trim().slice(0, 120);
    if (!next) throw new BadRequestException('Title is required');
    return this.prisma.aiConversation.update({
      where: { id },
      data: { title: next },
    });
  }

  async pinConversation(tenantId: string, userId: string, id: string, pinned: boolean) {
    await this.assertConversation(tenantId, userId, id);
    return this.prisma.aiConversation.update({
      where: { id },
      data: { pinned: !!pinned },
    });
  }

  async deleteConversation(tenantId: string, userId: string, id: string) {
    await this.assertConversation(tenantId, userId, id);
    await this.prisma.aiConversation.update({
      where: { id },
      data: { deletedAt: new Date(), archived: true },
    });
    return { ok: true };
  }

  async submitFeedback(
    tenantId: string,
    userId: string,
    messageId: string,
    rating: 'like' | 'dislike',
    comment?: string,
  ) {
    const message = await this.prisma.aiMessage.findFirst({
      where: { id: messageId, tenantId },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertConversation(tenantId, userId, message.conversationId);

    return this.prisma.aiFeedback.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: {
        tenantId,
        userId,
        messageId,
        conversationId: message.conversationId,
        rating,
        comment: comment || null,
      },
      update: { rating, comment: comment || null },
    });
  }

  // ─── Chat ──────────────────────────────────────────────────────────────────

  async chat(
    tenantId: string,
    userId: string,
    role: string | undefined,
    message: string,
    conversationId?: string,
    attachments: ChatAttachmentInput[] = [],
    currency?: string,
  ) {
    const started = Date.now();
    const conv = await this.ensureConversation(tenantId, userId, conversationId, message);
    await this.persistUserTurn(conv.id, tenantId, message, attachments);

    const { text, toolCalls, provider, model } = await this.generateReply(
      tenantId,
      userId,
      role,
      conv.id,
      message,
      attachments,
      undefined,
      currency,
    );

    const assistant = await this.prisma.aiMessage.create({
      data: {
        conversationId: conv.id,
        tenantId,
        role: 'assistant',
        content: text,
        provider,
        model,
        toolCalls: toolCalls.length ? (toolCalls as any) : undefined,
        latencyMs: Date.now() - started,
      },
    });

    await this.prisma.aiUsage.create({
      data: {
        tenantId,
        userId,
        conversationId: conv.id,
        provider,
        model,
        latencyMs: Date.now() - started,
        tokensOut: Math.ceil(text.length / 4),
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conv.id,
      messageId: assistant.id,
      message: text,
      toolCalls,
      mode: provider === 'fallback' ? ('FALLBACK' as const) : ('OPENAI' as const),
      citations: [],
      provider,
      model,
    };
  }

  async streamChat(
    tenantId: string,
    userId: string,
    role: string | undefined,
    message: string,
    conversationId: string | undefined,
    attachments: ChatAttachmentInput[],
    handlers: StreamHandlers,
    currency?: string,
  ) {
    const started = Date.now();
    const conv = await this.ensureConversation(tenantId, userId, conversationId, message);
    handlers.onMeta?.({ conversationId: conv.id, title: conv.title });
    await this.persistUserTurn(conv.id, tenantId, message, attachments);

    if (handlers.signal?.aborted) {
      throw new BadRequestException('Generation stopped');
    }

    const { text, toolCalls, provider, model } = await this.generateReply(
      tenantId,
      userId,
      role,
      conv.id,
      message,
      attachments,
      async (token) => {
        if (handlers.signal?.aborted) return;
        handlers.onToken(token);
      },
      currency,
    );

    if (handlers.signal?.aborted) {
      const partial = await this.prisma.aiMessage.create({
        data: {
          conversationId: conv.id,
          tenantId,
          role: 'assistant',
          content: text || '…',
          provider,
          model,
          metadata: { stopped: true },
          latencyMs: Date.now() - started,
        },
      });
      return {
        conversationId: conv.id,
        messageId: partial.id,
        message: text,
        stopped: true,
      };
    }

    const assistant = await this.prisma.aiMessage.create({
      data: {
        conversationId: conv.id,
        tenantId,
        role: 'assistant',
        content: text,
        provider,
        model,
        toolCalls: toolCalls.length ? (toolCalls as any) : undefined,
        latencyMs: Date.now() - started,
      },
    });

    await this.prisma.aiUsage.create({
      data: {
        tenantId,
        userId,
        conversationId: conv.id,
        provider,
        model,
        latencyMs: Date.now() - started,
        tokensOut: Math.ceil(text.length / 4),
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    handlers.onMeta?.({
      messageId: assistant.id,
      provider,
      model,
      toolCalls,
      done: true,
    });

    return {
      conversationId: conv.id,
      messageId: assistant.id,
      message: text,
      toolCalls,
      provider,
      model,
    };
  }

  async regenerate(
    tenantId: string,
    userId: string,
    role: string | undefined,
    conversationId: string,
    messageId: string,
    handlers?: StreamHandlers,
    currency?: string,
  ) {
    await this.assertConversation(tenantId, userId, conversationId);
    const target = await this.prisma.aiMessage.findFirst({
      where: { id: messageId, conversationId, tenantId, role: 'assistant' },
    });
    if (!target) throw new NotFoundException('Message not found');

    const priorUser = await this.prisma.aiMessage.findFirst({
      where: {
        conversationId,
        tenantId,
        role: 'user',
        createdAt: { lt: target.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      include: { attachments: true },
    });
    if (!priorUser) throw new BadRequestException('No user message to regenerate from');

    await this.prisma.aiMessage.delete({ where: { id: target.id } });

    const attachments: ChatAttachmentInput[] = (priorUser.attachments || []).map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      textExtract: a.textExtract || undefined,
      previewUrl: a.previewUrl || undefined,
    }));

    if (handlers) {
      return this.streamChat(tenantId, userId, role, priorUser.content, conversationId, attachments, handlers, currency);
    }
    return this.chat(tenantId, userId, role, priorUser.content, conversationId, attachments, currency);
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private async assertConversation(tenantId: string, userId: string, id: string) {
    const conv = await this.prisma.aiConversation.findFirst({
      where: { id, tenantId, userId, deletedAt: null },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  private async ensureConversation(
    tenantId: string,
    userId: string,
    conversationId: string | undefined,
    firstMessage: string,
  ) {
    if (conversationId) {
      return this.assertConversation(tenantId, userId, conversationId);
    }
    const title = this.autoTitle(firstMessage);
    return this.prisma.aiConversation.create({
      data: { tenantId, userId, title },
    });
  }

  private autoTitle(message: string) {
    const clean = message
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^["'“”*#>\s]+/, '')
      .replace(/[\s]*[.!?,;:—–-]+$/, '');
    if (!clean) return 'New chat';
    if (clean.length <= 48) return clean;
    const cut = clean.slice(0, 48);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 24 ? cut.slice(0, lastSpace) : cut).replace(/[\s]*[.!?,;:—–-]+$/, '')}…`;
  }

  private async persistUserTurn(
    conversationId: string,
    tenantId: string,
    message: string,
    attachments: ChatAttachmentInput[],
  ) {
    const msg = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        tenantId,
        role: 'user',
        content: message,
      },
    });

    for (const file of attachments.slice(0, 5)) {
      if (!file.fileName || !file.mimeType) continue;
      if (file.sizeBytes > 10 * 1024 * 1024) {
        throw new BadRequestException('Attachment exceeds 10MB limit');
      }
      const allowed = /^(image\/(png|jpeg|jpg|webp)|application\/pdf|text\/csv|application\/vnd\.|application\/json|text\/plain)/i;
      if (!allowed.test(file.mimeType) && !/\.(png|jpe?g|webp|pdf|csv|xlsx?|xls)$/i.test(file.fileName)) {
        throw new BadRequestException(`Unsupported file type: ${file.mimeType}`);
      }
      await this.prisma.aiAttachment.create({
        data: {
          conversationId,
          messageId: msg.id,
          tenantId,
          fileName: file.fileName.slice(0, 200),
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes || 0,
          textExtract: file.textExtract?.slice(0, 20000) || null,
          previewUrl: file.previewUrl?.slice(0, 500000) || null,
          storageKey: file.contentBase64 ? 'inline' : null,
        },
      });
    }

    return msg;
  }

  private getProviderConfig() {
    const provider = (
      this.config.get<string>('AI_PROVIDER') ||
      (this.config.get<string>('OPENAI_API_KEY') ? 'openai' : 'fallback')
    ).toLowerCase();

    const map: Record<string, { keyEnv: string; baseUrl?: string; defaultModel: string }> = {
      openai: { keyEnv: 'OPENAI_API_KEY', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
      openrouter: {
        keyEnv: 'OPENROUTER_API_KEY',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'openai/gpt-4o-mini',
      },
      groq: {
        keyEnv: 'GROQ_API_KEY',
        baseUrl: 'https://api.groq.com/openai/v1',
        defaultModel: 'llama-3.3-70b-versatile',
      },
      deepseek: {
        keyEnv: 'DEEPSEEK_API_KEY',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
      },
      gemini: {
        keyEnv: 'GEMINI_API_KEY',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        defaultModel: 'gemini-2.0-flash',
      },
      anthropic: {
        keyEnv: 'ANTHROPIC_API_KEY',
        baseUrl: this.config.get<string>('AI_BASE_URL') || 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-5-sonnet-latest',
      },
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

  private async generateReply(
    tenantId: string,
    userId: string,
    role: string | undefined,
    conversationId: string,
    message: string,
    attachments: ChatAttachmentInput[],
    onToken?: (token: string) => void | Promise<void>,
    currency?: string,
  ) {
    const money = await this.resolveMoney(tenantId, currency);
    const { provider, apiKey, baseURL, model } = this.getProviderConfig();
    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId, tenantId },
      orderBy: { createdAt: 'asc' },
      take: 40,
      select: { role: true, content: true },
    });

    const attachmentContext = attachments
      .map((a) => {
        const extract = a.textExtract?.slice(0, 8000);
        return `[Attachment: ${a.fileName} (${a.mimeType})]${extract ? `\n${extract}` : ''}`;
      })
      .join('\n\n');

    if (apiKey && provider !== 'fallback') {
      try {
        if (provider === 'anthropic') {
          const result = await this.chatWithAnthropic({
            apiKey,
            baseURL: baseURL!,
            model,
            history,
            message,
            attachmentContext,
            onToken,
            money,
          });
          return { ...result, text: this.applyDisplayCurrency(result.text, money) };
        }
        const result = await this.chatWithOpenAICompatible({
          tenantId,
          userId,
          role,
          apiKey,
          baseURL: baseURL!,
          model,
          provider,
          history,
          message,
          attachmentContext,
          onToken,
          money,
        });
        return { ...result, text: this.applyDisplayCurrency(result.text, money) };
      } catch (err: any) {
        this.logger.warn(`Provider ${provider} failed, using fallback: ${err?.message || err}`);
      }
    }

    const fallback = await this.chatWithFallback(tenantId, message, attachmentContext, money);
    const text = this.applyDisplayCurrency(fallback.text, money);
    if (onToken) {
      await this.streamText(text, onToken);
    }
    return { ...fallback, text, provider: 'fallback', model: 'rules' };
  }

  private async streamText(text: string, onToken: (t: string) => void | Promise<void>) {
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      await onToken(part);
      await new Promise((r) => setTimeout(r, 12));
    }
  }

  /**
   * Anthropic uses the Messages API, which is NOT OpenAI-compatible
   * (`x-api-key` header, different request/stream shape). Called directly
   * here so an Anthropic key actually works instead of silently falling back.
   */
  private async chatWithAnthropic(opts: {
    apiKey: string;
    baseURL: string;
    model: string;
    history: { role: string; content: string }[];
    message: string;
    attachmentContext: string;
    onToken?: (token: string) => void | Promise<void>;
    money: MoneyCtx;
  }) {
    const baseURL = (opts.baseURL || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    const system = opts.attachmentContext
      ? [`${this.systemPrompt(opts.money)}\n\nAttached files:\n${opts.attachmentContext}`]
      : this.systemPrompt(opts.money);

    const messages = opts.history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, -1)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    messages.push({ role: 'user', content: opts.message });

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    };

    let text = '';

    if (opts.onToken) {
      const res = await fetch(`${baseURL}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: opts.model,
          max_tokens: 2048,
          system,
          messages,
          stream: true,
        }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Anthropic ${res.status}: ${errText}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta' && json.delta.text) {
              text += json.delta.text;
              await opts.onToken(json.delta.text);
            }
          } catch {
            /* skip malformed event */
          }
        }
      }
    } else {
      const res = await fetch(`${baseURL}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: opts.model,
          max_tokens: 2048,
          system,
          messages,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Anthropic ${res.status}: ${errText}`);
      }
      const json: any = await res.json();
      text =
        json.content
          ?.filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('') || 'I could not process your request.';
    }

    return { text, toolCalls: [], provider: 'anthropic', model: opts.model };
  }

  private systemPrompt(money?: MoneyCtx) {
    const code = money?.code || DEFAULT_CURRENCY;
    const symbol = money?.symbol || currencySymbol(code);
    return `You are Doloyal AI — an agentic AI operator for local business owners using Doloyal. You don't just answer questions; you complete tasks using the business's tools.

## Currency
The workspace display currency is ${code} (symbol ${symbol}).
- Write every money amount with ${symbol} and ${code} (example: ${symbol}1,465).
- Never use $, USD, or the word "dollars" unless the workspace currency is USD.
- Tool JSON money fields are already in ${code}. Do not convert them to another currency.

## How you work
1. **Understand the goal.** If a request is ambiguous or missing required details (names, phones, dates, prices, message text), ask short clarifying questions BEFORE acting. Never guess IDs — resolve them with search/get tools first.
2. **Act.** Once you have what you need, call the right tools to do the work. Chain multiple tools when needed (e.g. searchCustomers → createInvoice → adjustLoyaltyPoints).
3. **Confirm before irreversible actions.** For sending campaigns, activating workflows, deducting points, creating invoices, or anything contacting real customers or moving money: summarize exactly what will happen (who, what, when) and get explicit approval. Only pass confirmed=true after the user agrees in this conversation.
4. **Report results.** After executing, confirm what was done with concrete details (IDs, links/slugs, totals). If a tool returns needsConfirmation, ask the user — never retry with confirmed=true without their explicit approval.

## Rules
- Tenant scoping is automatic; never fabricate IDs — always resolve via tools.
- Creating an invoice ALREADY updates the customer's visit/spend stats and may award loyalty points automatically per the program config. Do NOT call adjustLoyaltyPoints after an invoice unless the user explicitly asks for a separate manual adjustment.
- If a tool errors, explain simply and suggest a fix (e.g. connect email provider).
- You cannot manage platform billing, staff accounts, or settings — say so if asked.
- Respond in clear Markdown. Be concise, professional, actionable. Never invent numbers — use tool results.

## Business Health signals
When the user message starts with "Business Health signal" or "KPI detail:" or asks why a metric is down and how to fix it:
1. Call getBusinessSnapshot first (use from/to dates in the message when present).
2. Pull extra SaaS data as needed: getRevenueTrend, listInactiveCustomers, getChurnRisks, listRecentInvoices, listOrders, listReviews, listProducts, getLoyaltyOverview, listCampaigns, listAppointments, getReferralOverview.
3. Always reply in this order:
   - **What's happening** — live numbers tied to the clicked signal.
   - **Why this problem is happening** — 3–5 root causes in plain language. Link each cause to a number.
   - **How to fix it** — specific Doloyal actions.
   - **How the fix will work** — what each action changes.
   Then output the exact line:
   <<<STRATEGIST>>>
   Then a self-contained **Business Strategist** briefing (do not repeat the full metric table). Write as a senior local-business strategist: the one priority, the real risk if they do nothing, a 30/90-day sequence, and what not to waste time on. This briefing is shown in a separate panel, so it must read on its own.`;
  }

  private async chatWithOpenAICompatible(opts: {
    tenantId: string;
    userId: string;
    role: string | undefined;
    apiKey: string;
    baseURL: string;
    model: string;
    provider: string;
    history: { role: string; content: string }[];
    message: string;
    attachmentContext: string;
    onToken?: (token: string) => void | Promise<void>;
    money: MoneyCtx;
  }) {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
    const tools = [...this.toolDefinitions(), ...agentToolDefinitions()];

    const messages: any[] = [
      { role: 'system', content: this.systemPrompt(opts.money) },
      ...opts.history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content })),
      {
        role: 'user',
        content: opts.attachmentContext
          ? `${opts.message}\n\n---\nAttached files:\n${opts.attachmentContext}`
          : opts.message,
      },
    ];

    // Agentic loop: allow the model to chain tool calls across multiple rounds
    // (e.g. searchCustomers → createCustomer → createAppointment) before the
    // final answer. Streaming is applied to the final text only.
    const MAX_TOOL_ROUNDS = 5;
    const toolCalls: { name: string; args: Record<string, unknown>; result: string }[] = [];
    let finalText: string | null = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await client.chat.completions.create({
        model: opts.model,
        messages,
        tools,
        tool_choice: 'auto',
      });

      const responseMessage = completion.choices[0]?.message;

      if (!responseMessage?.tool_calls?.length) {
        finalText = responseMessage?.content || 'I could not process your request.';
        break;
      }

      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const name = toolCall.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          args = {};
        }
        const result = await this.runTool(
          { tenantId: opts.tenantId, userId: opts.userId, role: opts.role },
          name,
          args,
          opts.money,
        );
        const serialized = JSON.stringify(result ?? {}).slice(0, 12000);
        toolCalls.push({ name, args, result: serialized });
        messages.push({
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: serialized,
        });
      }
    }

    if (finalText === null) {
      // Round budget exhausted — force a text-only wrap-up.
      const wrapUp = await client.chat.completions.create({
        model: opts.model,
        messages: [
          ...messages,
          {
            role: 'user' as const,
            content:
              'Summarize for the user now: what you completed, what still needs their input, and any next steps.',
          },
        ],
      });
      finalText = (wrapUp.choices[0]?.message as any)?.content || 'I could not process your request.';
    }

    finalText = this.applyDisplayCurrency(finalText ?? 'I could not process your request.', opts.money);

    if (opts.onToken) {
      await this.streamText(finalText, opts.onToken);
    }
    return {
      text: finalText,
      toolCalls,
      provider: opts.provider,
      model: opts.model,
    };
  }

  private toolDefinitions() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'getKpis',
          description: 'Get current business KPIs',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'searchCustomers',
          description: 'Search customers by name, phone, or email',
          parameters: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'getRevenueTrend',
          description: 'Get revenue trend for last 30 days',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'getChurnRisks',
          description: 'Get customers at high churn risk',
          parameters: {
            type: 'object',
            properties: { level: { type: 'string', enum: ['HIGH', 'CRITICAL'] } },
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'listInactiveCustomers',
          description: 'List customers inactive for 60+ days',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'getTopCustomers',
          description: 'Get top customers by lifetime value',
          parameters: {
            type: 'object',
            properties: { limit: { type: 'number' } },
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'getAppointmentsToday',
          description: 'List appointments scheduled for today',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'getReferralOverview',
          description: 'Get referral program performance overview',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'listCampaigns',
          description: 'List marketing / referral campaigns',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'getBusinessSnapshot',
          description:
            'Fetch a live cross-SaaS business snapshot: customers, revenue, orders, products, reviews, appointments, loyalty, campaigns, referrals, staff, branches. Use this before explaining Business Health signals.',
          parameters: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'YYYY-MM-DD period start' },
              to: { type: 'string', description: 'YYYY-MM-DD period end' },
              days: { type: 'string', description: 'Inclusive day count if from/to omitted' },
            },
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'listRecentInvoices',
          description: 'List recent invoices (paid and unpaid) with totals and status',
          parameters: { type: 'object', properties: { limit: { type: 'number' } } },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'listOrders',
          description: 'List recent catalog orders',
          parameters: { type: 'object', properties: { limit: { type: 'number' } } },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'listProducts',
          description: 'List catalog products with price and stock',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'listReviews',
          description: 'List recent customer reviews with rating and status',
          parameters: { type: 'object', properties: { limit: { type: 'number' } } },
        },
      },
    ];
  }

  private async runTool(
    ctx: Omit<AgentToolContext, 'services'>,
    name: string,
    args: Record<string, unknown>,
    money?: MoneyCtx,
  ) {
    // Agent registry first — write tools + extended reads.
    const agentTool = getAgentTool(name);
    if (agentTool) {
      const blocked = checkAgentToolPermission(agentTool, ctx.role, args);
      if (blocked) return blocked;
      try {
        return await agentTool.handler({ ...ctx, services: this.agentServices() }, args);
      } catch (err: any) {
        this.logger.warn(`Agent tool ${name} failed: ${err?.message || err}`);
        return { error: err?.message || `Tool ${name} failed` };
      }
    }

    const { tenantId } = ctx;
    switch (name) {
      case 'getKpis':
        return this.getKpisData(tenantId);
      case 'searchCustomers':
        return this.searchCustomersData(tenantId, String(args.query || ''));
      case 'getRevenueTrend':
        return this.getRevenueData(tenantId);
      case 'getChurnRisks':
        return this.getChurnRiskData(tenantId, String(args.level || 'HIGH'));
      case 'listInactiveCustomers':
        return this.getInactiveCustomers(tenantId);
      case 'getTopCustomers':
        return this.getTopCustomersData(tenantId, Number(args.limit || 10));
      case 'getAppointmentsToday':
        return this.getAppointmentsToday(tenantId);
      case 'getReferralOverview':
        return this.getReferralOverview(tenantId);
      case 'listCampaigns':
        return this.listCampaignsData(tenantId);
      case 'getBusinessSnapshot': {
        const range = resolveOverviewRange({
          from: args.from ? String(args.from) : undefined,
          to: args.to ? String(args.to) : undefined,
          days: args.days ? String(args.days) : undefined,
        });
        const snapshot = await this.gatherHealthSnapshot(
          tenantId,
          range.currentFrom,
          range.currentTo,
          range.prevFrom,
          range.prevTo,
        );
        const ctxMoney = money || this.defaultMoney();
        return {
          ...snapshot,
          displayCurrency: ctxMoney.code,
          currencySymbol: ctxMoney.symbol,
          revenueFormatted: ctxMoney.money(snapshot.revenue),
          previousRevenueFormatted: ctxMoney.money(snapshot.previousRevenue),
          orderRevenueFormatted: ctxMoney.money(snapshot.orderRevenue),
        };
      }
      case 'listRecentInvoices':
        return this.prisma.invoice.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: Math.min(Number(args.limit) || 15, 30),
          select: { id: true, total: true, status: true, createdAt: true, customerId: true },
        });
      case 'listOrders':
        return this.prisma.clientOrder.findMany({
          where: { tenantId },
          orderBy: { orderDate: 'desc' },
          take: Math.min(Number(args.limit) || 15, 30),
          select: {
            orderNumber: true,
            total: true,
            status: true,
            paymentStatus: true,
            orderDate: true,
            customerId: true,
          },
        }).catch(() => []);
      case 'listProducts':
        return this.prisma.product.findMany({
          where: { tenantId },
          orderBy: { updatedAt: 'desc' },
          take: 25,
          select: { name: true, sku: true, price: true, stockQuantity: true, status: true },
        }).catch(() => []);
      case 'listReviews':
        return this.prisma.review.findMany({
          where: { tenantId },
          orderBy: { publishedAt: 'desc' },
          take: Math.min(Number(args.limit) || 15, 30),
          select: { rating: true, status: true, authorName: true, body: true, publishedAt: true },
        }).catch(() => []);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  private async chatWithFallback(tenantId: string, message: string, attachmentContext: string, money: MoneyCtx) {
    const lower = message.toLowerCase();
    let response = '';
    const toolCalls: { name: string; args: Record<string, unknown>; result: string }[] = [];

    if (attachmentContext) {
      response += `I reviewed your uploaded file(s).\n\n`;
    }

    if (
      lower.includes('business health signal') ||
      lower.includes('kpi detail:') ||
      (lower.includes('how to fix') && (lower.includes('revenue') || lower.includes('inactive') || lower.includes('repeat')))
    ) {
      const fromMatch = message.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
      const range = resolveOverviewRange(
        fromMatch ? { from: fromMatch[1], to: fromMatch[2] } : { days: '30' },
      );
      const snapshot = await this.gatherHealthSnapshot(
        tenantId,
        range.currentFrom,
        range.currentTo,
        range.prevFrom,
        range.prevTo,
      );
      const inactive = await this.getInactiveCustomers(tenantId);
      response += this.formatHealthSignalReply(message, snapshot, inactive, money);
      toolCalls.push({ name: 'getBusinessSnapshot', args: {}, result: JSON.stringify(snapshot) });
    } else if (lower.includes('kpi') || lower.includes('dashboard') || lower.includes('how are things') || lower.includes("today's sales") || lower.includes('today sales')) {
      const kpis = await this.getKpisData(tenantId);
      response += `### Today's business snapshot\n\n| Metric | Value |\n| --- | --- |\n| Today's revenue | ${money.money(kpis.todayRevenue)} |\n| New customers today | ${kpis.todayCustomers} |\n| Active rewards | ${kpis.activeRewards} |\n| Appointments today | ${kpis.appointmentsToday} |\n| Monthly growth | ${kpis.monthlyGrowthPct}% |\n`;
      toolCalls.push({ name: 'getKpis', args: {}, result: JSON.stringify(kpis) });
    } else if (lower.includes('vip') || lower.includes('top customer')) {
      const top = await this.getTopCustomersData(tenantId, 5);
      response += `### Top customers by lifetime value\n\n${top.map((c: any, i: number) => `${i + 1}. **${c.name}** — ${money.money(c.totalSpent)} (${c.visitCount} visits)`).join('\n')}`;
      toolCalls.push({ name: 'getTopCustomers', args: { limit: 5 }, result: JSON.stringify(top) });
    } else if (lower.includes('churn') || lower.includes('at risk')) {
      const risks = await this.getChurnRiskData(tenantId, 'HIGH');
      response += risks.length
        ? `### Customers at high churn risk\n\n${risks.slice(0, 8).map((c: any) => `- **${c.name}** — ${c.risk} · Last visit: ${c.lastVisit}`).join('\n')}`
        : 'No customers are at high churn risk right now.';
      toolCalls.push({ name: 'getChurnRisks', args: { level: 'HIGH' }, result: JSON.stringify(risks) });
    } else if (lower.includes('inactive') || lower.includes('not visited') || lower.includes('win-back')) {
      const inactive = await this.getInactiveCustomers(tenantId);
      response += inactive.length
        ? `### Inactive customers (60+ days)\n\n${inactive.slice(0, 8).map((c: any) => `- **${c.name}** — Last visit: ${c.lastVisit}`).join('\n')}`
        : 'All customers have visited recently.';
      toolCalls.push({ name: 'listInactiveCustomers', args: {}, result: JSON.stringify(inactive) });
    } else if (lower.includes('revenue') || lower.includes('sales') || lower.includes('predict')) {
      const revenue = await this.getRevenueData(tenantId);
      const total = revenue.reduce((s: number, d: any) => s + d.revenue, 0);
      const avg = total / Math.max(revenue.length, 1);
      response += `### Revenue report (30 days)\n\n- **Total:** ${money.money(total)}\n- **Daily average:** ${money.money(Math.round(avg))}\n- **Projected next month:** ${money.money(Math.round(avg * 30))}\n\nRecent days:\n${revenue.slice(-7).map((d: any) => `- ${d.date}: ${money.money(d.revenue)}`).join('\n')}`;
      toolCalls.push({ name: 'getRevenueTrend', args: {}, result: JSON.stringify(revenue) });
    } else if (lower.includes('appointment')) {
      const appts = await this.getAppointmentsToday(tenantId);
      response += `### Appointments today (${appts.length})\n\n${appts.length ? appts.map((a: any) => `- **${a.customerName}** — ${a.serviceName} · ${a.time} · ${a.status}`).join('\n') : 'No appointments scheduled for today.'}`;
      toolCalls.push({ name: 'getAppointmentsToday', args: {}, result: JSON.stringify(appts) });
    } else if (lower.includes('referral')) {
      const ref = await this.getReferralOverview(tenantId);
      response += `### Referral program\n\n| Metric | Value |\n| --- | --- |\n| Links | ${ref.links} |\n| Clicks | ${ref.clicks} |\n| Conversions | ${ref.conversions} |\n| Revenue | ${money.money(ref.revenue)} |\n`;
      toolCalls.push({ name: 'getReferralOverview', args: {}, result: JSON.stringify(ref) });
    } else if (lower.includes('campaign') || lower.includes('whatsapp')) {
      const camps = await this.listCampaignsData(tenantId);
      response += lower.includes('whatsapp')
        ? `### WhatsApp campaign draft\n\n**Goal:** Win back inactive customers\n\n**Message:**\n> Hi {{first_name}}! We miss you at our studio. Enjoy 15% off your next visit this week — book anytime from your Doloyal link.\n\n**Audience:** Customers inactive 45–90 days\n**Send window:** Tue–Thu, 11am–2pm\n\nWould you like me to refine the offer or audience?`
        : `### Campaigns\n\n${camps.length ? camps.map((c: any) => `- **${c.name}** (${c.status})`).join('\n') : 'No campaigns yet. I can draft a win-back or referral campaign for you.'}`;
      toolCalls.push({ name: 'listCampaigns', args: {}, result: JSON.stringify(camps) });
    } else if (lower.includes('search') || lower.includes('find') || lower.includes('customer')) {
      const query = message.replace(/search|find|customer/gi, '').trim();
      if (query) {
        const results = await this.searchCustomersData(tenantId, query);
        response += results.length
          ? `Found **${results.length}** customer(s):\n\n${results.slice(0, 8).map((c: any) => `- **${c.name}** — ${c.phone || c.email || 'No contact'}`).join('\n')}`
          : `No customers found matching "${query}".`;
        toolCalls.push({ name: 'searchCustomers', args: { query }, result: JSON.stringify(results) });
      } else {
        response += 'Share a name, phone, or email and I’ll look them up.';
      }
    } else {
      response += `I can help you analyze your business and take action. Try asking me to:\n\n- Analyze today's sales\n- Show a revenue report\n- Find inactive customers\n- Generate a campaign\n- Predict next month's revenue\n- Create a WhatsApp campaign\n\nOr upload an invoice, report, CSV, or screenshot and I’ll review it.`;
    }

    return { text: response.trim(), toolCalls };
  }

  private async getKpisData(tenantId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [todayRev, lastMonthRev, todayCust, activeRewards, apptsToday] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { tenantId, createdAt: { gte: startOfDay }, status: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.customer.count({ where: { tenantId, createdAt: { gte: startOfDay } } }),
      this.prisma.reward.count({ where: { tenantId, status: 'ACTIVE' as any } }),
      this.prisma.appointment.count({
        where: {
          tenantId,
          startTime: { gte: startOfDay },
          status: { in: ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }),
    ]);

    return {
      todayRevenue: todayRev._sum.total || 0,
      lastMonthRevenue: lastMonthRev._sum.total || 0,
      todayCustomers: todayCust,
      activeRewards,
      appointmentsToday: apptsToday,
      monthlyGrowthPct:
        (lastMonthRev._sum.total || 0) > 0
          ? Math.round(
              (((todayRev._sum.total || 0) - (lastMonthRev._sum.total || 0)) /
                (lastMonthRev._sum.total || 0)) *
                100,
            )
          : 0,
    };
  }

  private async searchCustomersData(tenantId: string, query: string) {
    const terms = query.trim().split(/\s+/).filter(Boolean).slice(0, 4);
    if (!terms.length) return [];
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        AND: terms.map((term) => ({
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        })),
      },
      take: 10,
    });
    return customers.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
      email: c.email,
      points: c.pointsBalance,
      totalSpent: c.totalSpent,
    }));
  }

  private async getRevenueData(tenantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo }, status: 'PAID' },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 86400000);
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const inv of invoices) {
      const key = inv.createdAt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) || 0) + inv.total);
    }
    return Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));
  }

  private async getChurnRiskData(tenantId: string, level: string) {
    const minDays =
      level === 'CRITICAL' ? 90 : level === 'HIGH' ? 60 : level === 'MEDIUM' ? 30 : 0;
    const cutoff = new Date(Date.now() - minDays * 86400000);
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        lastVisitAt: true,
        totalVisits: true,
        totalSpent: true,
      },
      take: 200,
      orderBy: { lastVisitAt: 'asc' },
    });
    return customers
      .map((c) => {
        const daysSince = c.lastVisitAt
          ? Math.floor((Date.now() - c.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        let risk = 'LOW';
        if (daysSince > 90) risk = 'CRITICAL';
        else if (daysSince > 60) risk = 'HIGH';
        else if (daysSince > 30) risk = 'MEDIUM';
        return {
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          risk,
          lastVisit: c.lastVisitAt?.toISOString().slice(0, 10) || 'Never',
          daysSinceLastVisit: daysSince,
          totalVisits: c.totalVisits,
          totalSpent: c.totalSpent,
        };
      })
      .filter((c) => c.risk === level || (level === 'HIGH' && (c.risk === 'HIGH' || c.risk === 'CRITICAL')))
      .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);
  }

  private async getInactiveCustomers(tenantId: string) {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [{ lastVisitAt: { lt: sixtyDaysAgo } }, { lastVisitAt: null }],
        status: 'ACTIVE',
      },
      select: { id: true, firstName: true, lastName: true, lastVisitAt: true, totalSpent: true },
      take: 200,
      orderBy: { lastVisitAt: 'asc' },
    });
    return customers.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      lastVisit: c.lastVisitAt?.toISOString().slice(0, 10) || 'Never',
      totalSpent: c.totalSpent,
    }));
  }

  private async getTopCustomersData(tenantId: string, limit: number) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { totalSpent: 'desc' },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        totalSpent: true,
        totalVisits: true,
        pointsBalance: true,
      },
    });
    return customers.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      totalSpent: c.totalSpent,
      visitCount: c.totalVisits,
      pointsBalance: c.pointsBalance,
    }));
  }

  private async getAppointmentsToday(tenantId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 86400000);
    const rows = await this.prisma.appointment.findMany({
      where: { tenantId, startTime: { gte: start, lt: end } },
      orderBy: { startTime: 'asc' },
      take: 50,
    });
    return (rows as any[]).map((a) => ({
      id: a.id,
      customerName: a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : 'Guest',
      serviceName: a.service?.name || 'Service',
      time: a.startTime.toISOString(),
      status: a.status,
    }));
  }

  private async getReferralOverview(tenantId: string) {
    const [links, clicks, conversions, revenue] = await Promise.all([
      this.prisma.referralLink.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.referralVisit.count({ where: { tenantId } }),
      this.prisma.referralConversion.count({
        where: { tenantId, status: { in: ['CONVERTED', 'REWARD_SENT'] } },
      }),
      this.prisma.referralConversion.aggregate({
        where: { tenantId, status: { in: ['CONVERTED', 'REWARD_SENT'] } },
        _sum: { orderValue: true, bookingValue: true },
      }),
    ]);
    return {
      links,
      clicks,
      conversions,
      revenue: (revenue._sum.orderValue || 0) + (revenue._sum.bookingValue || 0),
    };
  }

  private async listCampaignsData(tenantId: string) {
    const [referral, marketing] = await Promise.all([
      this.prisma.referralCampaign.findMany({
        where: { tenantId, deletedAt: null },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, status: true },
      }),
      this.prisma.campaign.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, status: true },
      }),
    ]);
    return [
      ...referral.map((c) => ({ ...c, type: 'referral' })),
      ...marketing.map((c) => ({ ...c, type: 'marketing' })),
    ];
  }

  async getBusinessHealth(
    tenantId: string,
    query?: { days?: string; from?: string; to?: string },
  ): Promise<BusinessHealthInsight> {
    const range = resolveOverviewRange(query);
    const cacheKey = `${tenantId}:${range.currentFromYmd}:${range.currentToYmd}`;
    const cached = this.healthCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.result;

    // Fast path: lean metrics for the rule score (no LLM, fewer queries).
    const lean = await this.gatherLeanHealthSnapshot(
      tenantId,
      range.currentFrom,
      range.currentTo,
      range.prevFrom,
      range.prevTo,
    );
    const fingerprint = JSON.stringify(lean);
    const result = this.ruleBasedHealth(lean, range.currentFromYmd, range.currentToYmd);
    // Keep free for ~12s so analytics date changes and new customers show up quickly.
    // Never long-cache an unavailable/early empty score.
    const ttl = result.available === false ? 5_000 : 12_000;
    this.healthCache.set(cacheKey, {
      fingerprint,
      result,
      expiresAt: now + ttl,
    });

    return result;
  }

  /** Only the fields ruleBasedHealth reads — keeps analytics health off the LLM path. */
  private async gatherLeanHealthSnapshot(
    tenantId: string,
    from: Date,
    to: Date,
    prevFrom: Date,
    prevTo: Date,
  ): Promise<HealthSnapshot> {
    const period = { gte: from, lte: to };
    const prev = { gte: prevFrom, lte: prevTo };
    const orderPredicate = {
      status: { not: 'CANCELLED' as const },
      OR: [{ paymentStatus: 'PAID' as const }, { status: 'COMPLETED' as const }],
    };
    const [
      customersTotal,
      customersNew,
      inactiveCustomers,
      paidInvoiceAgg,
      prevPaidInvoiceAgg,
      orderAgg,
      prevOrderAgg,
      repeatGroups,
      rewardsActive,
      reviewsApproved,
      reviewRating,
      campaignsSent,
      orderCount,
      appointments,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, createdAt: { lte: to } } }),
      this.prisma.customer.count({ where: { tenantId, createdAt: period } }),
      this.prisma.customer.count({
        where: { tenantId, lastVisitAt: { lt: from, not: null }, status: 'ACTIVE' },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, status: 'PAID', createdAt: period },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, status: 'PAID', createdAt: prev },
        _sum: { total: true },
      }),
      this.prisma.clientOrder
        .aggregate({
          where: { tenantId, orderDate: period, ...orderPredicate },
          _sum: { total: true },
          _count: true,
        })
        .catch(() => ({ _sum: { total: 0 }, _count: 0 })),
      this.prisma.clientOrder
        .aggregate({
          where: { tenantId, orderDate: prev, ...orderPredicate },
          _sum: { total: true },
          _count: true,
        })
        .catch(() => ({ _sum: { total: 0 }, _count: 0 })),
      this.prisma.invoice.groupBy({
        by: ['customerId'],
        where: { tenantId, status: 'PAID', createdAt: period },
        _count: { id: true },
        having: { id: { _count: { gte: 2 } } },
      }),
      this.prisma.reward.count({ where: { tenantId, status: 'ACTIVE' as any } }),
      this.prisma.review
        .count({ where: { tenantId, status: 'APPROVED', publishedAt: period } })
        .catch(() => 0),
      this.prisma.review
        .aggregate({
          where: { tenantId, status: 'APPROVED', publishedAt: period },
          _avg: { rating: true },
        })
        .catch(() => ({ _avg: { rating: 0 } })),
      this.prisma.campaign.count({ where: { tenantId, sentAt: period } }).catch(() => 0),
      this.prisma.clientOrder
        .count({
          where: { tenantId, orderDate: period, status: { not: 'CANCELLED' } },
        })
        .catch(() => 0),
      this.prisma.appointment
        .count({
          where: {
            tenantId,
            startTime: period,
            status: { not: 'CANCELLED' },
          },
        })
        .catch(() => 0),
    ]);

    const invoiceRev = paidInvoiceAgg._sum.total || 0;
    const prevInvoiceRev = prevPaidInvoiceAgg._sum.total || 0;
    const orderRev = Number(orderAgg._sum?.total || 0) || 0;
    const prevOrderRev = Number(prevOrderAgg._sum?.total || 0) || 0;
    const revenue = invoiceRev + orderRev;
    const prevRevenue = prevInvoiceRev + prevOrderRev;
    const repeatCustomers = repeatGroups.length;
    const repeatDenom = repeatCustomers + customersNew;
    const repeatRate = repeatDenom > 0 ? (repeatCustomers / repeatDenom) * 100 : 0;
    const revenueChangePct =
      prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : revenue > 0 ? 100 : 0;

    return {
      periodRevenue: revenue,
      previousRevenue: prevRevenue,
      customersTotal: Number(customersTotal) || 0,
      customersNew,
      orders: Number(orderCount) || Number(orderAgg._count) || 0,
      appointments: Number(appointments) || 0,
      repeatRate: Math.round(repeatRate * 10) / 10,
      revenueChangePct: Math.round(revenueChangePct * 10) / 10,
      rewardsActive: Number(rewardsActive) || 0,
      inactiveCustomers,
      averageRating: Math.round(((reviewRating._avg?.rating as number) || 0) * 10) / 10,
      campaignsSent: Number(campaignsSent) || 0,
      reviewsApproved: Number(reviewsApproved) || 0,
    };
  }

  private async gatherHealthSnapshot(
    tenantId: string,
    from: Date,
    to: Date,
    prevFrom: Date,
    prevTo: Date,
  ): Promise<HealthSnapshot> {
    const period = { gte: from, lte: to };
    const prev = { gte: prevFrom, lte: prevTo };
    const paidOrders = {
      status: { not: 'CANCELLED' as const },
      OR: [{ paymentStatus: 'PAID' as const }, { status: 'COMPLETED' as const }],
    };
    const [
      customersTotal,
      customersNew,
      customersPrevNew,
      inactiveCustomers,
      highChurnCustomers,
      paidInvoiceAgg,
      prevPaidInvoiceAgg,
      repeatGroups,
      prevRepeatGroups,
      orderAgg,
      prevOrderAgg,
      productsActive,
      reviewsApproved,
      reviewRating,
      reviewsPending,
      appointments,
      prevAppointments,
      rewardsActive,
      redemptions,
      memberships,
      campaignsSent,
      referralConversions,
      pointsIssued,
      pointsRedeemed,
      branches,
      staff,
      websites,
      bookingLinks,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, createdAt: { lte: to } } }),
      this.prisma.customer.count({ where: { tenantId, createdAt: period } }),
      this.prisma.customer.count({ where: { tenantId, createdAt: prev } }),
      this.prisma.customer.count({
        where: { tenantId, lastVisitAt: { lt: from, not: null }, status: 'ACTIVE' },
      }),
      this.prisma.customer.count({ where: { tenantId, churnRiskScore: { gte: 70 } } }),
      this.prisma.invoice.aggregate({
        where: { tenantId, status: 'PAID', createdAt: period },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, status: 'PAID', createdAt: prev },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: ['customerId'],
        where: { tenantId, status: 'PAID', createdAt: period },
        _count: { id: true },
        having: { id: { _count: { gte: 2 } } },
      }),
      this.prisma.invoice.groupBy({
        by: ['customerId'],
        where: { tenantId, status: 'PAID', createdAt: prev },
        _count: { id: true },
        having: { id: { _count: { gte: 2 } } },
      }),
      this.prisma.clientOrder.aggregate({
        where: { tenantId, orderDate: period, ...paidOrders },
        _sum: { total: true },
        _count: true,
      }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),
      this.prisma.clientOrder.aggregate({
        where: { tenantId, orderDate: prev, ...paidOrders },
        _sum: { total: true },
        _count: true,
      }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),
      this.prisma.product.count({ where: { tenantId, status: 'ACTIVE' } }).catch(() => 0),
      this.prisma.review.count({
        where: { tenantId, status: 'APPROVED', publishedAt: period },
      }).catch(() => 0),
      this.prisma.review.aggregate({
        where: { tenantId, status: 'APPROVED', publishedAt: period },
        _avg: { rating: true },
      }).catch(() => ({ _avg: { rating: 0 } })),
      this.prisma.review.count({ where: { tenantId, status: 'PENDING' } }).catch(() => 0),
      this.prisma.appointment.count({
        where: { tenantId, startTime: period, status: { not: 'CANCELLED' } },
      }),
      this.prisma.appointment.count({
        where: { tenantId, startTime: prev, status: { not: 'CANCELLED' } },
      }),
      this.prisma.reward.count({ where: { tenantId, status: 'ACTIVE' as any } }),
      this.prisma.rewardRedemption.count({ where: { tenantId, createdAt: period } }).catch(() => 0),
      this.prisma.customerMembership.count({
        where: { assignedAt: period, customer: { tenantId } },
      }).catch(() => 0),
      this.prisma.campaign.count({ where: { tenantId, sentAt: period } }).catch(() => 0),
      this.prisma.referralConversion.count({
        where: { tenantId, createdAt: period, status: { in: ['CONVERTED', 'REWARD_SENT'] } },
      }).catch(() => 0),
      this.prisma.pointsLedger.aggregate({
        where: { tenantId, createdAt: period, amount: { gt: 0 } },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      this.prisma.pointsLedger.aggregate({
        where: { tenantId, createdAt: period, amount: { lt: 0 } },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      this.prisma.branch.count({ where: { tenantId } }).catch(() => 0),
      this.prisma.staff.count({ where: { tenantId } }).catch(() => 0),
      this.prisma.website.count({ where: { tenantId } }).catch(() => 0),
      this.prisma.bookingLink.count({ where: { tenantId } }).catch(() => 0),
    ]);

    const revenue = paidInvoiceAgg._sum.total || 0;
    const prevRevenue = prevPaidInvoiceAgg._sum.total || 0;
    const repeatCustomers = repeatGroups.length;
    const prevRepeat = prevRepeatGroups.length;
    const repeatDenom = repeatCustomers + customersNew;
    const prevRepeatDenom = prevRepeat + customersPrevNew;
    const repeatRate = repeatDenom > 0 ? (repeatCustomers / repeatDenom) * 100 : 0;
    const prevRepeatRate = prevRepeatDenom > 0 ? (prevRepeat / prevRepeatDenom) * 100 : 0;
    const revenueChangePct =
      prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : revenue > 0 ? 100 : 0;

    return {
      customersTotal,
      customersNew,
      inactiveCustomers,
      highChurnCustomers,
      revenue: Math.round(revenue * 100) / 100,
      previousRevenue: Math.round(prevRevenue * 100) / 100,
      revenueChangePct: Math.round(revenueChangePct * 10) / 10,
      paidInvoices: paidInvoiceAgg._count || 0,
      repeatCustomers,
      repeatRate: Math.round(repeatRate * 10) / 10,
      previousRepeatRate: Math.round(prevRepeatRate * 10) / 10,
      orders: orderAgg._count || 0,
      orderRevenue: Math.round((orderAgg._sum.total || 0) * 100) / 100,
      previousOrders: prevOrderAgg._count || 0,
      productsActive: Number(productsActive) || 0,
      reviewsApproved: Number(reviewsApproved) || 0,
      averageRating: Math.round(((reviewRating._avg?.rating as number) || 0) * 10) / 10,
      reviewsPending: Number(reviewsPending) || 0,
      appointments: Number(appointments) || 0,
      previousAppointments: Number(prevAppointments) || 0,
      rewardsActive: Number(rewardsActive) || 0,
      redemptions: Number(redemptions) || 0,
      memberships: Number(memberships) || 0,
      campaignsSent: Number(campaignsSent) || 0,
      referralConversions: Number(referralConversions) || 0,
      pointsIssued: Math.abs(pointsIssued._sum.amount || 0),
      pointsRedeemed: Math.abs(pointsRedeemed._sum.amount || 0),
      branches: Number(branches) || 0,
      staff: Number(staff) || 0,
      websites: Number(websites) || 0,
      bookingLinks: Number(bookingLinks) || 0,
    };
  }

  private formatHealthSignalReply(
    message: string,
    snapshot: HealthSnapshot,
    inactive: { name: string; lastVisit: string }[],
    money: MoneyCtx,
  ) {
    const signal = (message.match(/Business Health signal:\s*"([^"]+)"/i) || [])[1] || 'this metric';
    const inactivePct =
      snapshot.customersTotal > 0
        ? Math.round((snapshot.inactiveCustomers / snapshot.customersTotal) * 100)
        : 0;
    const why: string[] = [];
    if (snapshot.revenueChangePct < 0) {
      why.push(
        `Revenue fell ${Math.abs(snapshot.revenueChangePct)}% versus the previous period (${money.money(snapshot.revenue)} vs ${money.money(snapshot.previousRevenue)}), so cash coming in is weaker even if appointments look busy.`,
      );
    }
    if (snapshot.inactiveCustomers > 0) {
      why.push(
        `${snapshot.inactiveCustomers} customers (${inactivePct}% of ${snapshot.customersTotal}) have not visited in this window, so a large share of the base is not spending.`,
      );
    }
    if (snapshot.repeatRate < snapshot.previousRepeatRate) {
      why.push(
        `Repeat rate dropped from ${snapshot.previousRepeatRate}% to ${snapshot.repeatRate}% (${snapshot.repeatCustomers} returning buyers), so growth depends on new people instead of loyal ones.`,
      );
    }
    if (snapshot.orders === 0) {
      why.push(`Catalog orders are 0 this period, so product sales are not covering the invoice drop.`);
    }
    if (snapshot.campaignsSent <= 1) {
      why.push(`Only ${snapshot.campaignsSent} campaign(s) went out, so inactive customers were barely re-engaged.`);
    }
    if (snapshot.referralConversions === 0) {
      why.push(`Referral conversions are 0, so the pipeline is not replacing lost repeat spend.`);
    }
    if (!why.length) {
      why.push(`The signal is mixed: some activity exists, but spend and retention are not moving together.`);
    }

    return `### What's happening

**${signal}** — based on live Doloyal data:

| Metric | Value |
| --- | --- |
| Revenue this period | ${money.money(snapshot.revenue)} |
| vs previous period | ${snapshot.revenueChangePct}% |
| Repeat rate | ${snapshot.repeatRate}% (was ${snapshot.previousRepeatRate}%) |
| Repeat customers | ${snapshot.repeatCustomers} |
| Inactive customers | ${snapshot.inactiveCustomers} |
| High churn risk | ${snapshot.highChurnCustomers} |
| Orders | ${snapshot.orders} |
| Appointments | ${snapshot.appointments} |
| Campaigns sent | ${snapshot.campaignsSent} |
| Active rewards | ${snapshot.rewardsActive} |

${inactive.length ? `Inactive sample:\n${inactive.slice(0, 6).map((c) => `- **${c.name}** — last visit ${c.lastVisit}`).join('\n')}` : ''}

### Why this problem is happening

${why.map((line, i) => `${i + 1}. ${line}`).join('\n')}

### How to fix it

1. **Win-back campaign** — target inactive / high-churn customers with a time-boxed offer.
2. **Loyalty rewards** — keep ${snapshot.rewardsActive} rewards live and add a repeat-visit reward if the catalog is thin.
3. **Booking link** — send a personal booking link so returning visits are one tap.
4. **Follow-up invoices / orders** — close unpaid work so revenue is recognized in this period.

### How the fix will work

1. A win-back message brings inactive customers back into a visit or order, which raises period revenue and cuts the inactive count.
2. A repeat-visit reward makes the next purchase cheaper or more valuable, so repeat rate should climb from ${snapshot.repeatRate}% toward the previous ${snapshot.previousRepeatRate}%.
3. Booking links turn “I’ll come later” into a booked slot, converting the ${snapshot.appointments} appointments into paid work instead of empty interest.
4. Closing invoices/orders records the money you already earned so the revenue number matches real activity.

Tell me which of these to create and I’ll draft it in Doloyal (I’ll confirm before sending anything to customers).

<<<STRATEGIST>>>

### Business Strategist view

The numbers say this is a **retention leak**, not a traffic problem. Appointments and customers can look fine while cash falls because ${inactivePct}% of the book is idle and repeat rate slid from ${snapshot.previousRepeatRate}% to ${snapshot.repeatRate}%.

**Priority:** Win back the ${snapshot.inactiveCustomers} inactive customers before spending on new acquisition. One returning buyer is cheaper than replacing them.

**If you do nothing:** Revenue stays compressed (${snapshot.revenueChangePct}% vs last period), points sit unused, and campaigns at ${snapshot.campaignsSent} send(s) will not refill the pipeline.

**30 days:** Send one win-back offer to inactive / high-churn customers, then a repeat-visit reward for people who book.

**90 days:** Rebuild referrals (currently ${snapshot.referralConversions} conversions) and put catalog orders back above zero so income is not invoice-only.

**Ignore for now:** Broad brand campaigns and extra products until the idle ${inactivePct}% of customers get a reason to return.`;
  }

  private defaultMoney(): MoneyCtx {
    const code = DEFAULT_CURRENCY;
    return { code, symbol: currencySymbol(code), money: (amount) => formatMoney(amount, code) };
  }

  private async resolveMoney(tenantId: string, requested?: string): Promise<MoneyCtx> {
    const fromClient = (requested || '').trim().toUpperCase();
    let code = /^[A-Z]{3}$/.test(fromClient) ? fromClient : '';
    if (!code) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: tenantId },
        select: { currency: true },
      });
      code = (tenant?.currency || DEFAULT_CURRENCY).toUpperCase();
    }
    if (!/^[A-Z]{3}$/.test(code)) code = DEFAULT_CURRENCY;
    return {
      code,
      symbol: currencySymbol(code),
      money: (amount) => formatMoney(amount, code),
    };
  }

  private applyDisplayCurrency(text: string, money: MoneyCtx) {
    if (!text || money.code === 'USD') return text;
    return text.replace(/\$\s?([\d,]+(?:\.\d+)?)/g, (_match, raw) => {
      const value = Number(String(raw).replace(/,/g, ''));
      return Number.isFinite(value) ? money.money(value) : `${money.symbol}${raw}`;
    });
  }

  private statusFromScore(score: number, earlyStage = false): BusinessHealthStatus {
    if (earlyStage) return 'building';
    if (score >= 70) return 'healthy';
    if (score >= 40) return 'fair';
    return 'at_risk';
  }

  private ruleBasedHealth(snapshot: HealthSnapshot, from: string, to: string): BusinessHealthInsight {
    const periodRevenue = snapshot.periodRevenue ?? 0;
    const previousRevenue = snapshot.previousRevenue ?? 0;
    const customersNew = snapshot.customersNew ?? 0;
    const customersTotal = snapshot.customersTotal ?? customersNew;
    const orders = snapshot.orders ?? 0;
    const appointments = snapshot.appointments ?? 0;
    const reviewsApproved = snapshot.reviewsApproved ?? 0;
    const repeatRate = snapshot.repeatRate ?? 0;
    const revenueChangePct = snapshot.revenueChangePct ?? 0;
    const rewardsActive = snapshot.rewardsActive ?? 0;
    const inactiveCustomers = snapshot.inactiveCustomers ?? 0;
    const averageRating = snapshot.averageRating ?? 0;
    const campaignsSent = snapshot.campaignsSent ?? 0;

    // Empty commerce period → no score. Catalog leftovers must not invent risk.
    const noActivity =
      periodRevenue === 0 &&
      previousRevenue === 0 &&
      customersNew === 0 &&
      reviewsApproved === 0 &&
      orders === 0 &&
      appointments === 0;
    if (noActivity) {
      return {
        score: 0,
        status: 'fair',
        summary: 'Not enough activity in this period to score business health.',
        factors: [],
        source: 'rules',
        generatedAt: new Date().toISOString(),
        period: { from, to },
        available: false,
        earlyStage: true,
      };
    }

    // Brand-new windows (1–2 customers, little/no paid history) unlock signals
    // as real activity arrives — never punish with "Needs attention" yet.
    const earlyStage =
      customersTotal < 5 ||
      (previousRevenue === 0 && periodRevenue === 0 && orders < 3 && customersTotal < 10);

    const canJudgeRepeat = customersTotal >= 5 && (orders >= 3 || periodRevenue > 0 || repeatRate > 0);
    const canJudgeRevenue = previousRevenue > 0 || periodRevenue > 0;
    const canJudgeRewards = customersTotal >= 5 || rewardsActive >= 1;
    const canJudgeInactive = customersTotal >= 5;

    type Factor = { label: string; positive: boolean; pending?: boolean };
    const factors: Factor[] = [];

    if (!canJudgeRepeat) {
      factors.push({
        label:
          customersNew > 0
            ? `${customersNew} new customer${customersNew === 1 ? '' : 's'} this period — repeat rate unlocks after return visits`
            : 'Repeat rate unlocks after customers return',
        positive: true,
        pending: true,
      });
    } else {
      factors.push({
        label: repeatRate >= 50 ? 'Repeat rate is strong' : 'Repeat rate needs improvement',
        positive: repeatRate >= 50,
      });
    }

    if (!canJudgeRevenue) {
      factors.push({
        label: 'Revenue tracking starts after the first paid sale in this period',
        positive: true,
        pending: true,
      });
    } else if (previousRevenue === 0 && periodRevenue > 0) {
      factors.push({
        label: 'First revenue in this period — growth baseline starts next window',
        positive: true,
        pending: true,
      });
    } else if (periodRevenue === 0 && previousRevenue > 0) {
      factors.push({
        label: 'No revenue in this period',
        positive: false,
      });
    } else {
      factors.push({
        label: revenueChangePct > 0 ? 'Revenue is growing' : 'Revenue is declining',
        positive: revenueChangePct > 0 && periodRevenue > 0,
      });
    }

    if (!canJudgeRewards) {
      factors.push({
        label: 'Loyalty rewards unlock as you set up your program',
        positive: true,
        pending: true,
      });
    } else {
      factors.push({
        label: rewardsActive >= 3 ? 'Active rewards program' : 'Few active rewards',
        positive: rewardsActive >= 3,
      });
    }

    if (!canJudgeInactive) {
      factors.push({
        label:
          customersNew > 0
            ? 'New customers just arrived — inactivity is measured after visits'
            : 'Inactivity tracking needs a larger customer base',
        positive: true,
        pending: true,
      });
    } else {
      factors.push({
        label:
          inactiveCustomers <= 5
            ? 'Low customer inactivity'
            : `${inactiveCustomers} inactive customers`,
        positive: inactiveCustomers <= 5,
      });
    }

    if (reviewsApproved > 0) {
      factors.push({
        label:
          averageRating >= 4
            ? `${averageRating} star reviews`
            : 'Review rating needs attention',
        positive: averageRating >= 4,
      });
    } else if (earlyStage) {
      factors.push({
        label: 'Reviews appear here after customers leave feedback',
        positive: true,
        pending: true,
      });
    }

    if (appointments > 0 && earlyStage) {
      factors.push({
        label: `${appointments} appointment${appointments === 1 ? '' : 's'} in this period`,
        positive: true,
      });
    }

    // Score only from factors that are ready. Early stage stays in a calm
    // "building" band so one new customer never looks like a 28% crisis.
    let score: number;
    if (earlyStage) {
      let building = 48;
      if (customersNew > 0) building += 8;
      if (periodRevenue > 0 || orders > 0) building += 12;
      if (appointments > 0) building += 6;
      if (reviewsApproved > 0) building += 6;
      if (rewardsActive > 0) building += 4;
      if (campaignsSent > 0) building += 4;
      score = Math.min(72, building);
    } else {
      score = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (Math.min(repeatRate, 100) / 100) * 30 +
              (revenueChangePct > 0
                ? Math.min(revenueChangePct / 2, 20)
                : periodRevenue > 0
                  ? 8
                  : 4) +
              Math.min(rewardsActive * 4, 16) +
              (inactiveCustomers === 0 ? 16 : Math.max(16 - inactiveCustomers, 4)) +
              Math.min(averageRating * 3, 10) +
              (campaignsSent > 0 ? 8 : 4),
          ),
        ),
      );
    }

    return {
      score,
      status: this.statusFromScore(score, earlyStage),
      summary: earlyStage
        ? `Business health is building for ${from} to ${to}. Signals unlock as customers, sales, and loyalty activity accumulate in this window.`
        : `Business health is ${score}% for ${from} to ${to}, based on revenue, retention, loyalty, and activity across Doloyal.`,
      factors: factors.slice(0, 6),
      source: 'rules',
      generatedAt: new Date().toISOString(),
      period: { from, to },
      available: true,
      earlyStage,
    };
  }

  private async analyzeHealthWithAi(
    snapshot: HealthSnapshot,
    from: string,
    to: string,
  ): Promise<BusinessHealthInsight | null> {
    const { provider, apiKey, baseURL, model } = this.getProviderConfig();
    if (!apiKey || provider === 'fallback' || provider === 'anthropic') return null;

    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are Doloyal AI. Score local-business health from live SaaS metrics. Return JSON only: {"score":0-100 integer,"status":"healthy"|"fair"|"at_risk","summary":"one sentence for the owner","factors":[{"label":"short owner-facing sentence","positive":true|false}]}. Use exactly 4 factors. Never invent numbers. Never use raw field names (no revenueChangePct). Prefer phrasing like "Revenue is declining" or "47 inactive customers". If you mention money, use the workspace currency symbol from the snapshot (never assume USD). status must match score (healthy>=70, fair>=40, else at_risk).',
        },
        {
          role: 'user',
          content: `Period ${from} to ${to}. Live Doloyal snapshot:\n${JSON.stringify(snapshot)}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || '';
    const parsed = this.parseHealthJson(text);
    if (!parsed) return null;

    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0)));
    const factors = (parsed.factors || [])
      .filter((f) => f && typeof f.label === 'string' && f.label.trim())
      .slice(0, 6)
      .map((f) => ({ label: f.label.trim().slice(0, 80), positive: !!f.positive }));
    if (!factors.length) return null;

    return {
      score,
      status: this.statusFromScore(score),
      summary: (parsed.summary || '').trim().slice(0, 280) || `Doloyal AI scored this business at ${score}%.`,
      factors,
      source: 'ai',
      generatedAt: new Date().toISOString(),
      period: { from, to },
    };
  }

  private parseHealthJson(text: string): {
    score?: number;
    summary?: string;
    factors?: { label: string; positive: boolean }[];
  } | null {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
