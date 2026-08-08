import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';

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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

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
    message: string,
    conversationId?: string,
    attachments: ChatAttachmentInput[] = [],
  ) {
    const started = Date.now();
    const conv = await this.ensureConversation(tenantId, userId, conversationId, message);
    await this.persistUserTurn(conv.id, tenantId, message, attachments);

    const { text, toolCalls, provider, model } = await this.generateReply(
      tenantId,
      conv.id,
      message,
      attachments,
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
    message: string,
    conversationId: string | undefined,
    attachments: ChatAttachmentInput[],
    handlers: StreamHandlers,
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
      conv.id,
      message,
      attachments,
      async (token) => {
        if (handlers.signal?.aborted) return;
        handlers.onToken(token);
      },
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
    conversationId: string,
    messageId: string,
    handlers?: StreamHandlers,
  ) {
    const conv = await this.assertConversation(tenantId, userId, conversationId);
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
      return this.streamChat(tenantId, userId, priorUser.content, conversationId, attachments, handlers);
    }
    return this.chat(tenantId, userId, priorUser.content, conversationId, attachments);
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
    const clean = message.replace(/\s+/g, ' ').trim();
    if (!clean) return 'New chat';
    return clean.length > 48 ? `${clean.slice(0, 45)}…` : clean;
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
    conversationId: string,
    message: string,
    attachments: ChatAttachmentInput[],
    onToken?: (token: string) => void | Promise<void>,
  ) {
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

    if (apiKey && provider !== 'fallback' && provider !== 'anthropic') {
      try {
        return await this.chatWithOpenAICompatible({
          tenantId,
          apiKey,
          baseURL: baseURL!,
          model,
          provider,
          history,
          message,
          attachmentContext,
          onToken,
        });
      } catch (err: any) {
        this.logger.warn(`Provider ${provider} failed, using fallback: ${err?.message || err}`);
      }
    }

    const fallback = await this.chatWithFallback(tenantId, message, attachmentContext);
    if (onToken) {
      await this.streamText(fallback.text, onToken);
    }
    return { ...fallback, provider: 'fallback', model: 'rules' };
  }

  private async streamText(text: string, onToken: (t: string) => void | Promise<void>) {
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      await onToken(part);
      await new Promise((r) => setTimeout(r, 12));
    }
  }

  private systemPrompt() {
    return `You are Doloyal AI Assistant — an enterprise AI business partner for local business owners using Doloyal.
You help with customers, revenue, loyalty, appointments, campaigns, memberships, rewards, invoices, referrals, booking links, staff, branches, analytics, and growth.
Use tools when you need live business data. Respond in clear Markdown with headings, lists, and tables when helpful.
Be concise, professional, and actionable. Never invent numbers — use tool results.`;
  }

  private async chatWithOpenAICompatible(opts: {
    tenantId: string;
    apiKey: string;
    baseURL: string;
    model: string;
    provider: string;
    history: { role: string; content: string }[];
    message: string;
    attachmentContext: string;
    onToken?: (token: string) => void | Promise<void>;
  }) {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
    const tools = this.toolDefinitions();

    const messages: any[] = [
      { role: 'system', content: this.systemPrompt() },
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

    const completion = await client.chat.completions.create({
      model: opts.model,
      messages,
      tools,
      tool_choice: 'auto',
    });

    const responseMessage = completion.choices[0]?.message;
    const toolCalls: { name: string; args: Record<string, unknown>; result: string }[] = [];

    if (responseMessage?.tool_calls?.length) {
      for (const toolCall of responseMessage.tool_calls) {
        const name = toolCall.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          args = {};
        }
        const result = await this.runTool(opts.tenantId, name, args);
        toolCalls.push({ name, args, result: JSON.stringify(result) });
      }

      const second = await client.chat.completions.create({
        model: opts.model,
        messages: [
          ...messages,
          responseMessage,
          ...toolCalls.map((tc, i) => ({
            role: 'tool' as const,
            tool_call_id: responseMessage.tool_calls![i].id,
            content: tc.result,
          })),
        ],
        stream: !!opts.onToken,
      });

      if (opts.onToken && Symbol.asyncIterator in Object(second)) {
        let text = '';
        for await (const chunk of second as any) {
          const token = chunk.choices?.[0]?.delta?.content || '';
          if (token) {
            text += token;
            await opts.onToken(token);
          }
        }
        return { text: text || 'I could not process your request.', toolCalls, provider: opts.provider, model: opts.model };
      }

      const text =
        (second as any).choices?.[0]?.message?.content || 'I could not process your request.';
      if (opts.onToken) await this.streamText(text, opts.onToken);
      return { text, toolCalls, provider: opts.provider, model: opts.model };
    }

    let text = responseMessage?.content || 'I could not process your request.';
    if (opts.onToken) {
      // Prefer true stream for simple completions
      try {
        const streamed = await client.chat.completions.create({
          model: opts.model,
          messages,
          stream: true,
        });
        text = '';
        for await (const chunk of streamed as any) {
          const token = chunk.choices?.[0]?.delta?.content || '';
          if (token) {
            text += token;
            await opts.onToken(token);
          }
        }
      } catch {
        await this.streamText(text, opts.onToken);
      }
    }

    return { text, toolCalls, provider: opts.provider, model: opts.model };
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
    ];
  }

  private async runTool(tenantId: string, name: string, args: Record<string, unknown>) {
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
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  private async chatWithFallback(tenantId: string, message: string, attachmentContext: string) {
    const lower = message.toLowerCase();
    let response = '';
    const toolCalls: { name: string; args: Record<string, unknown>; result: string }[] = [];

    if (attachmentContext) {
      response += `I reviewed your uploaded file(s).\n\n`;
    }

    if (lower.includes('kpi') || lower.includes('dashboard') || lower.includes('how are things') || lower.includes("today's sales") || lower.includes('today sales')) {
      const kpis = await this.getKpisData(tenantId);
      response += `### Today's business snapshot\n\n| Metric | Value |\n| --- | --- |\n| Today's revenue | ₹${kpis.todayRevenue.toLocaleString('en-IN')} |\n| New customers today | ${kpis.todayCustomers} |\n| Active rewards | ${kpis.activeRewards} |\n| Appointments today | ${kpis.appointmentsToday} |\n| Monthly growth | ${kpis.monthlyGrowthPct}% |\n`;
      toolCalls.push({ name: 'getKpis', args: {}, result: JSON.stringify(kpis) });
    } else if (lower.includes('vip') || lower.includes('top customer')) {
      const top = await this.getTopCustomersData(tenantId, 5);
      response += `### Top customers by lifetime value\n\n${top.map((c: any, i: number) => `${i + 1}. **${c.name}** — ₹${c.totalSpent.toLocaleString('en-IN')} (${c.visitCount} visits)`).join('\n')}`;
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
      response += `### Revenue report (30 days)\n\n- **Total:** ₹${total.toLocaleString('en-IN')}\n- **Daily average:** ₹${Math.round(avg).toLocaleString('en-IN')}\n- **Projected next month:** ₹${Math.round(avg * 30).toLocaleString('en-IN')}\n\nRecent days:\n${revenue.slice(-7).map((d: any) => `- ${d.date}: ₹${d.revenue.toLocaleString('en-IN')}`).join('\n')}`;
      toolCalls.push({ name: 'getRevenueTrend', args: {}, result: JSON.stringify(revenue) });
    } else if (lower.includes('appointment')) {
      const appts = await this.getAppointmentsToday(tenantId);
      response += `### Appointments today (${appts.length})\n\n${appts.length ? appts.map((a: any) => `- **${a.customerName}** — ${a.serviceName} · ${a.time} · ${a.status}`).join('\n') : 'No appointments scheduled for today.'}`;
      toolCalls.push({ name: 'getAppointmentsToday', args: {}, result: JSON.stringify(appts) });
    } else if (lower.includes('referral')) {
      const ref = await this.getReferralOverview(tenantId);
      response += `### Referral program\n\n| Metric | Value |\n| --- | --- |\n| Links | ${ref.links} |\n| Clicks | ${ref.clicks} |\n| Conversions | ${ref.conversions} |\n| Revenue | ₹${ref.revenue.toLocaleString('en-IN')} |\n`;
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
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
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
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        lastVisitAt: true,
        totalVisits: true,
        totalSpent: true,
      },
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
}
