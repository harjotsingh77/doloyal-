import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SupportRealtimeService } from './support-realtime.service';
import { SupportAiService } from './support-ai.service';

export const SUPPORT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'RESOLVED',
  'CLOSED',
] as const;

export const SUPPORT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

const ticketInclude = (viewerRole: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') => ({
  assignedAgent: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
    },
  },
  tenant: { select: { id: true, name: true, slug: true } },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      message: true,
      senderRole: true,
      senderId: true,
      createdAt: true,
      readAt: true,
    },
  },
  _count: {
    select: {
      // Filtered count of unread messages from the other side.
      messages:
        viewerRole === 'CUSTOMER'
          ? { where: { senderRole: { not: 'CUSTOMER' }, readAt: null } }
          : { where: { senderRole: 'CUSTOMER', readAt: null } },
    },
  },
});

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: SupportRealtimeService,
    private readonly ai: SupportAiService,
  ) {}

  // ─── helpers ───────────────────────────────────────────────────────────────

  private validateStatus(
    status: string,
  ): status is (typeof SUPPORT_STATUSES)[number] {
    return (SUPPORT_STATUSES as readonly string[]).includes(status);
  }

  private validatePriority(
    priority: string,
  ): priority is (typeof SUPPORT_PRIORITIES)[number] {
    return (SUPPORT_PRIORITIES as readonly string[]).includes(priority);
  }

  private async nextTicketNumber(): Promise<string> {
    const rows = await this.prisma.supportTicket.findMany({
      select: { ticketNumber: true },
    });
    let max = 0;
    for (const r of rows) {
      const m = r.ticketNumber.match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `DOY-${String(max + 1).padStart(4, '0')}`;
  }

  private async recordTicketEvent(
    ticket: { id: string; tenantId: string },
    eventType: string,
    actor?: any,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.supportTicketEvent.create({
      data: {
        ticketId: ticket.id,
        tenantId: ticket.tenantId,
        actorId: actor?.id || null,
        actorName: actor
          ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || null
          : null,
        eventType,
        metadata: (metadata as any) || undefined,
      },
    });
  }

  private async getOwnedTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: ticketInclude('CUSTOMER'),
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  private senderNameFor(
    role: string,
    ticket: { user?: any; assignedAgent?: any },
  ): string {
    if (role === 'ADMIN') {
      const a = ticket.assignedAgent;
      return a
        ? `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email
        : 'Doloyal Support';
    }
    if (role === 'SYSTEM') return 'Doloyal';
    const u = ticket.user;
    return u
      ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
      : 'You';
  }

  // ─── help articles ─────────────────────────────────────────────────────────

  async listArticles(query: any) {
    const search = query.search?.trim() || undefined;
    const category = query.category?.trim() || undefined;
    const faqOnly = query.faq === 'true';
    const limit = Math.min(50, parseInt(query.limit, 10) || 20);

    const where: Record<string, unknown> = { published: true };
    if (category) where.category = category;
    if (faqOnly) where.faq = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { keywords: { has: search.toLowerCase() } },
      ];
    }

    const articles = await this.prisma.supportArticle.findMany({
      where,
      orderBy: [{ faq: 'desc' }, { sortOrder: 'asc' }],
      take: limit,
    });
    const categories = await this.prisma.supportArticle.findMany({
      where: { published: true },
      distinct: ['category'],
      select: { category: true },
    });
    return {
      articles,
      categories: categories.map((c) => c.category),
      total: articles.length,
    };
  }

  async getArticle(idOrSlug: string) {
    const article = await this.prisma.supportArticle.findFirst({
      where: {
        published: true,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });
    if (!article) throw new NotFoundException('Help article not found');
    return article;
  }

  // ─── customer: tickets ─────────────────────────────────────────────────────

  async listTickets(user: any) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: ticketInclude('CUSTOMER'),
    });
    return tickets;
  }

  async getTicket(user: any, ticketId: string) {
    return this.getOwnedTicket(ticketId, user.id);
  }

  async createTicket(user: any, dto: any) {
    if (!dto.subject?.trim()) throw new BadRequestException('Subject is required');
    if (!dto.description?.trim()) {
      throw new BadRequestException('Description is required');
    }
    const priority = dto.priority || 'NORMAL';
    if (!this.validatePriority(priority)) {
      throw new BadRequestException(
        `priority must be one of ${SUPPORT_PRIORITIES.join(', ')}`,
      );
    }

    let conversation: any = null;
    if (dto.conversationId) {
      conversation = await this.prisma.supportConversation.findFirst({
        where: { id: dto.conversationId, tenantId: user.activeTenantId, userId: user.id },
      });
      if (!conversation) throw new NotFoundException('Conversation not found');
    }

    const ticketNumber = await this.nextTicketNumber();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        tenantId: user.activeTenantId,
        userId: user.id,
        subject: dto.subject.trim(),
        category: dto.category || 'Other',
        priority: priority as any,
        description: dto.description.trim(),
        conversationId: conversation?.id || null,
        currentPage: dto.currentPage?.trim() ? dto.currentPage.trim() : conversation?.currentPage || null,
      },
      include: ticketInclude('CUSTOMER'),
    });

    await this.prisma.supportStatusHistory.create({
      data: {
        ticketId: ticket.id,
        oldStatus: null,
        newStatus: 'OPEN',
        changedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
        note: 'Ticket created',
      },
    });

    await this.recordTicketEvent(ticket, 'TICKET_CREATED', user, {
      subject: ticket.subject,
      category: ticket.category,
      fromConversation: !!conversation,
    });

    // Human handoff — move the AI conversation into HUMAN mode and announce it.
    if (conversation) {
      await this.prisma.supportConversation.update({
        where: { id: conversation.id },
        data: { mode: 'HUMAN', updatedAt: new Date() },
      });
      await this.prisma.supportConversationMessage.create({
        data: {
          conversationId: conversation.id,
          tenantId: user.activeTenantId,
          senderType: 'SYSTEM',
          content: `Ticket ${ticketNumber} created — a human support agent has taken over this conversation.`,
          metadata: { ticketId: ticket.id, ticketNumber } as any,
        },
      });
    }

    this.realtime.publish(user.activeTenantId, ticket.id, 'ADMIN', 'ticket.created', {
      ticketId: ticket.id,
      ticketNumber,
      tenantId: user.activeTenantId,
    });

    return ticket;
  }

  async getMessages(user: any, ticketId: string, after?: string) {
    const ticket = await this.getOwnedTicket(ticketId, user.id);
    const messages = await this.prisma.supportMessage.findMany({
      where: {
        ticketId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ticket,
      messages: messages.map((m) => ({
        ...m,
        senderName: this.senderNameFor(m.senderRole, ticket),
      })),
    };
  }

  async sendMessage(user: any, ticketId: string, dto: any) {
    const ticket = await this.getOwnedTicket(ticketId, user.id);
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException(
        'This ticket is closed. Please create a new ticket to continue.',
      );
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        tenantId: ticket.tenantId,
        senderId: user.id,
        senderRole: 'CUSTOMER',
        message: dto.message,
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
        attachmentMimeType: dto.attachmentMimeType || null,
        isLink: Boolean(dto.isLink),
      },
    });

    await this.recordTicketEvent(
      { id: ticketId, tenantId: ticket.tenantId },
      'CUSTOMER_REPLIED',
      user,
    );

    // Reopen a resolved ticket when the customer replies.
    let reopened = false;
    if (ticket.status === 'RESOLVED') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'OPEN', closedAt: null },
      });
      await this.prisma.supportStatusHistory.create({
        data: {
          ticketId,
          oldStatus: 'RESOLVED',
          newStatus: 'OPEN',
          changedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
          note: 'Customer replied to a resolved ticket',
        },
      });
      await this.recordTicketEvent(
        { id: ticketId, tenantId: ticket.tenantId },
        'REOPENED',
        user,
        { oldStatus: 'RESOLVED', newStatus: 'OPEN' },
      );
      reopened = true;
    }

    this.realtime.publish(ticket.tenantId, ticketId, 'ADMIN', 'message.created', {
      ticketId,
      messageId: message.id,
      senderRole: 'CUSTOMER',
    });
    if (reopened) {
      this.realtime.publish(ticket.tenantId, ticketId, 'ADMIN', 'ticket.status_changed', {
        ticketId,
        oldStatus: 'RESOLVED',
        newStatus: 'OPEN',
      });
    }

    return { ...message, senderName: this.senderNameFor('CUSTOMER', ticket) };
  }

  async markConversationRead(user: any, ticketId: string) {
    await this.getOwnedTicket(ticketId, user.id);
    const result = await this.prisma.supportMessage.updateMany({
      where: {
        ticketId,
        senderRole: { not: 'CUSTOMER' },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ─── Ask Doloyal: conversations ────────────────────────────────────────────

  private async assertOwnedConversation(user: any, conversationId: string) {
    const conv = await this.prisma.supportConversation.findFirst({
      where: {
        id: conversationId,
        tenantId: user.activeTenantId,
        userId: user.id,
        status: 'ACTIVE',
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async listConversations(user: any) {
    const conversations = await this.prisma.supportConversation.findMany({
      where: { tenantId: user.activeTenantId, userId: user.id, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { messages: true } },
        tickets: { select: { id: true, ticketNumber: true, status: true }, take: 1 },
      },
    });
    const lastMessages = await this.prisma.supportConversationMessage.findMany({
      where: { conversationId: { in: conversations.map((c) => c.id) } },
      orderBy: { createdAt: 'asc' },
    });
    const lastByConv = new Map<string, (typeof lastMessages)[number]>();
    for (const m of lastMessages) lastByConv.set(m.conversationId, m);

    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      mode: c.mode,
      currentPage: c.currentPage,
      unreadCount: c.unreadCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
      lastMessage: lastByConv.get(c.id)
        ? {
            id: lastByConv.get(c.id)!.id,
            senderType: lastByConv.get(c.id)!.senderType,
            content: lastByConv.get(c.id)!.content,
            createdAt: lastByConv.get(c.id)!.createdAt,
          }
        : null,
      ticket: c.tickets[0]
        ? { id: c.tickets[0].id, ticketNumber: c.tickets[0].ticketNumber, status: c.tickets[0].status }
        : null,
    }));
  }

  async getConversation(user: any, conversationId: string) {
    const conv = await this.assertOwnedConversation(user, conversationId);
    const messages = await this.prisma.supportConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { conversationId },
      select: { id: true, ticketNumber: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ...conv,
      ticket,
      messages: messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        content: m.content,
        metadata: m.metadata as any,
        createdAt: m.createdAt,
      })),
    };
  }

  async createConversation(user: any, dto: any) {
    const context = await this.ai.buildContextSnapshot(user.activeTenantId);
    const conv = await this.prisma.supportConversation.create({
      data: {
        tenantId: user.activeTenantId,
        userId: user.id,
        title: dto.title?.trim()?.slice(0, 120) || 'New chat',
        currentPage: dto.currentPage?.trim()?.slice(0, 300) || null,
        context: context as any,
      },
    });
    return conv;
  }

  async renameConversation(user: any, conversationId: string, title: string) {
    await this.assertOwnedConversation(user, conversationId);
    const next = title.trim().slice(0, 120);
    if (!next) throw new BadRequestException('Title is required');
    return this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: { title: next, updatedAt: new Date() },
    });
  }

  async archiveConversation(user: any, conversationId: string) {
    await this.assertOwnedConversation(user, conversationId);
    await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: { status: 'ARCHIVED', updatedAt: new Date() },
    });
    return { ok: true };
  }

  /** Mark all AI/agent messages in a conversation as read. */
  async readConversation(user: any, conversationId: string) {
    await this.assertOwnedConversation(user, conversationId);
    await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0, lastReadAt: new Date() },
    });
    return { ok: true };
  }

  /** Total unread AI/agent replies across the user's active conversations. */
  async getUnreadBadge(user: any) {
    const agg = await this.prisma.supportConversation.aggregate({
      where: { tenantId: user.activeTenantId, userId: user.id, status: 'ACTIVE' },
      _sum: { unreadCount: true },
    });
    return { unread: agg._sum.unreadCount || 0 };
  }

  async chat(user: any, dto: any) {
    if (!dto.message?.trim()) throw new BadRequestException('message is required');

    let conv: any;
    if (dto.conversationId) {
      conv = await this.assertOwnedConversation(user, dto.conversationId);
      if (conv.mode === 'HUMAN') {
        throw new BadRequestException(
          'A human support agent is handling this conversation. Continue in your support ticket.',
        );
      }
    } else {
      const context = await this.ai.buildContextSnapshot(user.activeTenantId);
      conv = await this.prisma.supportConversation.create({
        data: {
          tenantId: user.activeTenantId,
          userId: user.id,
          title: this.autoTitle(dto.message),
          currentPage: dto.currentPage?.trim()?.slice(0, 300) || null,
          context: context as any,
        },
      });
    }

    await this.prisma.supportConversationMessage.create({
      data: {
        conversationId: conv.id,
        tenantId: user.activeTenantId,
        senderType: 'USER',
        content: dto.message.trim(),
      },
    });

    const context =
      (conv.context as any) ||
      (await this.ai.buildContextSnapshot(user.activeTenantId));
    const result = await this.ai.answer(user.activeTenantId, conv.id, dto.message.trim(), {
      ...context,
      currentPage: dto.currentPage?.trim()?.slice(0, 300) || conv.currentPage || undefined,
    });

    const aiMessage = await this.prisma.supportConversationMessage.create({
      data: {
        conversationId: conv.id,
        tenantId: user.activeTenantId,
        senderType: 'AI',
        content: result.text,
        metadata: {
          escalate: result.escalate,
          suggestedCategory: result.suggestedCategory,
          suggestedPriority: result.suggestedPriority,
          suggestedSubject: result.suggestedSubject,
          sources: result.sources,
          provider: result.provider,
          model: result.model,
        } as any,
      },
    });

    await this.prisma.supportConversation.update({
      where: { id: conv.id },
      data: {
        title: conv.title === 'New chat' ? this.autoTitle(dto.message) : conv.title,
        unreadCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    this.realtime.publish(user.activeTenantId, conv.id, 'CUSTOMER', 'conversation.updated', {
      conversationId: conv.id,
      messageId: aiMessage.id,
      unread: true,
    });

    return {
      conversationId: conv.id,
      messageId: aiMessage.id,
      message: result.text,
      escalate: result.escalate,
      suggestedCategory: result.suggestedCategory,
      suggestedPriority: result.suggestedPriority,
      suggestedSubject: result.suggestedSubject,
      sources: result.sources,
      mode: conv.mode,
      provider: result.provider,
      model: result.model,
    };
  }

  private autoTitle(message: string) {
    const clean = message.replace(/\s+/g, ' ').trim();
    if (!clean) return 'New chat';
    return clean.length > 48 ? `${clean.slice(0, 45)}…` : clean;
  }

  // ─── customer: files ───────────────────────────────────────────────────────

  async uploadFile(user: any, ticketId: string, dto: any) {
    const ticket = await this.getOwnedTicket(ticketId, user.id);
    const file = await this.prisma.supportAttachment.create({
      data: {
        ticketId,
        uploadedBy: user.id,
        fileUrl: dto.url,
        fileName: dto.fileName,
        fileType: dto.mimeType || null,
        fileSize: dto.sizeBytes ? Number(dto.sizeBytes) : null,
      },
    });
    this.realtime.publish(ticket.tenantId, ticketId, 'ADMIN', 'file.uploaded', {
      ticketId,
      fileId: file.id,
    });
    return file;
  }

  // ─── admin: tickets ────────────────────────────────────────────────────────

  async adminListTickets(query: any) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 25));
    const status = query.status || undefined;
    const priority = query.priority || undefined;
    const category = query.category || undefined;
    const assignedAgent = query.assignedAgent || undefined;
    const search = query.search?.trim() || undefined;

    const where: Record<string, unknown> = {};
    if (status && this.validateStatus(status)) where.status = status;
    if (priority && this.validatePriority(priority)) where.priority = priority;
    if (category) where.category = category;
    if (assignedAgent) where.assignedAgentId = assignedAgent;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: ticketInclude('ADMIN'),
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async adminGetTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId },
      include: {
        ...ticketInclude('ADMIN'),
        statusHistory: { orderBy: { createdAt: 'desc' as const } },
        attachments: { orderBy: { createdAt: 'desc' as const } },
      },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  async adminListAgents() {
    return this.prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async adminGetStats() {
    const [open, inProgress, waiting, resolved, closed, total] =
      await Promise.all([
        this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
        this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.supportTicket.count({
          where: { status: 'WAITING_FOR_CUSTOMER' },
        }),
        this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
        this.prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
        this.prisma.supportTicket.count(),
      ]);
    return {
      open,
      inProgress,
      waiting,
      resolved,
      closed,
      total,
    };
  }

  async adminUpdateTicket(admin: any, ticketId: string, dto: any) {
    const ticket = await this.adminGetTicket(ticketId);
    const data: Record<string, unknown> = {};
    if (dto.subject !== undefined) {
      if (!dto.subject?.trim()) throw new BadRequestException('Subject is required');
      data.subject = dto.subject.trim();
    }
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.priority !== undefined) {
      if (!this.validatePriority(dto.priority)) {
        throw new BadRequestException(
          `priority must be one of ${SUPPORT_PRIORITIES.join(', ')}`,
        );
      }
      data.priority = dto.priority;
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: ticketInclude('ADMIN'),
    });

    this.realtime.publish(ticket.tenantId, ticketId, 'CUSTOMER', 'ticket.updated', {
      ticketId,
      tenantId: ticket.tenantId,
    });

    return updated;
  }

  async adminUpdateStatus(admin: any, ticketId: string, dto: any) {
    const ticket = await this.adminGetTicket(ticketId);
    if (!dto.status || !this.validateStatus(dto.status)) {
      throw new BadRequestException(
        `status must be one of ${SUPPORT_STATUSES.join(', ')}`,
      );
    }
    if (dto.status === ticket.status) {
      return ticket;
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
        closedAt: dto.status === 'CLOSED' ? new Date() : null,
      },
    });

    await this.prisma.supportStatusHistory.create({
      data: {
        ticketId,
        oldStatus: ticket.status,
        newStatus: dto.status,
        changedById: admin.id,
        changedByName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Doloyal Team',
        note: dto.note || null,
      },
    });

    await this.recordTicketEvent(
      { id: ticketId, tenantId: ticket.tenantId },
      dto.status === 'RESOLVED' || dto.status === 'CLOSED' ? 'RESOLVED' : 'STATUS_CHANGED',
      admin,
      { oldStatus: ticket.status, newStatus: dto.status, note: dto.note || null },
    );

    this.realtime.publish(ticket.tenantId, ticketId, 'BOTH', 'ticket.status_changed', {
      ticketId,
      tenantId: ticket.tenantId,
      oldStatus: ticket.status,
      newStatus: dto.status,
    });

    return this.adminGetTicket(ticketId);
  }

  async adminAssign(admin: any, ticketId: string, adminId?: string) {
    const ticket = await this.adminGetTicket(ticketId);

    let target = admin;
    if (adminId && adminId !== admin.id) {
      const assigned = await this.prisma.user.findUnique({ where: { id: adminId } });
      if (!assigned || assigned.isAdmin !== true) {
        throw new BadRequestException('Assigned user must be a Doloyal admin');
      }
      target = assigned;
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedAgentId: target.id },
      include: ticketInclude('ADMIN'),
    });

    await this.recordTicketEvent(
      { id: ticketId, tenantId: ticket.tenantId },
      'ASSIGNED',
      admin,
      { assignedAgentId: target.id, assignedAgentName: `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email },
    );

    this.realtime.publish(ticket.tenantId, ticketId, 'BOTH', 'ticket.assigned', {
      ticketId,
      tenantId: ticket.tenantId,
      assignedAgentName: `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email,
    });

    return updated;
  }

  // ─── admin: chat ───────────────────────────────────────────────────────────

  async adminGetMessages(ticketId: string) {
    const ticket = await this.adminGetTicket(ticketId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ticket,
      messages: messages.map((m) => ({
        ...m,
        senderName: this.senderNameFor(m.senderRole, ticket),
      })),
    };
  }

  async adminSendMessage(admin: any, ticketId: string, dto: any) {
    const ticket = await this.adminGetTicket(ticketId);

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        tenantId: ticket.tenantId,
        senderId: admin.id,
        senderRole: 'ADMIN',
        message: dto.message,
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
        attachmentMimeType: dto.attachmentMimeType || null,
        isLink: Boolean(dto.isLink),
      },
    });

    await this.recordTicketEvent(
      { id: ticketId, tenantId: ticket.tenantId },
      'ADMIN_REPLIED',
      admin,
    );

    // Human handoff — surface the agent reply inside the Ask Doloyal chat.
    if (ticket.conversationId && dto.message?.trim()) {
      await this.prisma.supportConversationMessage.create({
        data: {
          conversationId: ticket.conversationId,
          tenantId: ticket.tenantId,
          senderType: 'AI',
          content: dto.message.trim(),
          metadata: { agentReply: true, ticketId } as any,
        },
      });
      await this.prisma.supportConversation.update({
        where: { id: ticket.conversationId },
        data: { mode: 'HUMAN', unreadCount: { increment: 1 }, updatedAt: new Date() },
      });
      this.realtime.publish(ticket.tenantId, ticket.conversationId, 'CUSTOMER', 'conversation.updated', {
        conversationId: ticket.conversationId,
        messageId: message.id,
        agentReply: true,
        unread: true,
      });
    }

    this.realtime.publish(ticket.tenantId, ticketId, 'CUSTOMER', 'message.created', {
      ticketId,
      messageId: message.id,
      senderRole: 'ADMIN',
    });

    return { ...message, senderName: this.senderNameFor('ADMIN', ticket) };
  }

  async adminMarkRead(ticketId: string) {
    await this.adminGetTicket(ticketId);
    const result = await this.prisma.supportMessage.updateMany({
      where: {
        ticketId,
        senderRole: 'CUSTOMER',
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ─── admin: notes ──────────────────────────────────────────────────────────

  async adminAddNote(admin: any, ticketId: string, note: string) {
    const ticket = await this.adminGetTicket(ticketId);
    if (!note?.trim()) throw new BadRequestException('note is required');
    const created = await this.prisma.supportInternalNote.create({
      data: {
        ticketId,
        adminId: admin.id,
        adminName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Doloyal Team',
        note: note.trim(),
      },
    });
    await this.recordTicketEvent(
      { id: ticketId, tenantId: ticket.tenantId },
      'NOTE_ADDED',
      admin,
    );
    return created;
  }

  async adminListNotes(ticketId: string) {
    await this.adminGetTicket(ticketId);
    return this.prisma.supportInternalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── admin: files ──────────────────────────────────────────────────────────

  async adminUploadFile(admin: any, ticketId: string, dto: any) {
    await this.adminGetTicket(ticketId);
    return this.prisma.supportAttachment.create({
      data: {
        ticketId,
        uploadedBy: admin.id,
        fileUrl: dto.url,
        fileName: dto.fileName,
        fileType: dto.mimeType || null,
        fileSize: dto.sizeBytes ? Number(dto.sizeBytes) : null,
      },
    });
  }

  // ─── admin: analytics ──────────────────────────────────────────────────────

  async adminGetAnalytics() {
    const since = new Date(Date.now() - 30 * 86400000);
    const dayStart = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    const tickets = await this.prisma.supportTicket.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, createdAt: true, closedAt: true, category: true, priority: true, conversationId: true },
    });

    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId: { in: tickets.map((t) => t.id) } },
      select: { ticketId: true, senderRole: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const firstAdminByTicket = new Map<string, string>();
    for (const m of messages) {
      if (m.senderRole === 'ADMIN' && !firstAdminByTicket.has(m.ticketId)) {
        firstAdminByTicket.set(m.ticketId, m.createdAt.toISOString());
      }
    }

    const createdByDay = new Map<number, number>();
    const resolvedByDay = new Map<number, number>();
    let sumFirstResponse = 0;
    let firstResponseCount = 0;
    let sumResolution = 0;
    let resolutionCount = 0;
    const categoryCount = new Map<string, number>();
    const priorityCount = new Map<string, number>();
    let escalatedFromChat = 0;

    for (const t of tickets) {
      const createdKey = dayStart(t.createdAt);
      createdByDay.set(createdKey, (createdByDay.get(createdKey) || 0) + 1);

      if (t.closedAt) {
        const resolvedKey = dayStart(t.closedAt);
        resolvedByDay.set(resolvedKey, (resolvedByDay.get(resolvedKey) || 0) + 1);
        sumResolution += t.closedAt.getTime() - t.createdAt.getTime();
        resolutionCount++;
      }

      const firstAdmin = firstAdminByTicket.get(t.id);
      if (firstAdmin) {
        sumFirstResponse += new Date(firstAdmin).getTime() - t.createdAt.getTime();
        firstResponseCount++;
      }

      categoryCount.set(t.category || 'Other', (categoryCount.get(t.category || 'Other') || 0) + 1);
      priorityCount.set(t.priority, (priorityCount.get(t.priority) || 0) + 1);
      if (t.conversationId) escalatedFromChat++;
    }

    // AI conversation analytics (Ask Doloyal).
    const aiMessages = await this.prisma.supportConversationMessage.findMany({
      where: {
        createdAt: { gte: since },
        senderType: 'AI',
      },
      select: { metadata: true },
    });
    const aiTotal = aiMessages.length;
    const aiEscalations = aiMessages.filter(
      (m: any) => (m.metadata as any)?.escalate === true,
    ).length;
    const totalConversations = await this.prisma.supportConversation.count({
      where: { createdAt: { gte: since } },
    });

    const days: { date: string; created: number; resolved: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const key = dayStart(new Date(since.getTime() + i * 86400000));
      days.push({
        date: new Date(key).toISOString().slice(0, 10),
        created: createdByDay.get(key) || 0,
        resolved: resolvedByDay.get(key) || 0,
      });
    }

    return {
      range: '30d',
      tickets: {
        created: tickets.length,
        resolved: resolutionCount,
        avgFirstResponseHours:
          firstResponseCount > 0 ? Math.round((sumFirstResponse / firstResponseCount) / 36e5 * 10) / 10 : null,
        avgResolutionHours:
          resolutionCount > 0 ? Math.round((sumResolution / resolutionCount) / 36e5 * 10) / 10 : null,
        byCategory: Array.from(categoryCount.entries()).map(([category, count]) => ({ category, count })),
        byPriority: Array.from(priorityCount.entries()).map(([priority, count]) => ({ priority, count })),
        daily: days,
      },
      ai: {
        conversations: totalConversations,
        aiAnswers: aiTotal,
        escalated: aiEscalations,
        escalationRate: aiTotal > 0 ? Math.round((aiEscalations / aiTotal) * 1000) / 10 : 0,
        aiResolutionRate: aiTotal > 0 ? Math.round(((aiTotal - aiEscalations) / aiTotal) * 1000) / 10 : 0,
        chatEscalationRate:
          totalConversations > 0 ? Math.round((escalatedFromChat / totalConversations) * 1000) / 10 : 0,
      },
    };
  }

  // ─── admin: AI assist ──────────────────────────────────────────────────────

  async adminGetConversation(conversationId: string) {
    const conv = await this.prisma.supportConversation.findFirst({
      where: { id: conversationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        tenant: { select: { id: true, name: true, slug: true } },
        tickets: { select: { id: true, ticketNumber: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' as const } },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async adminAiAssist(admin: any, ticketId: string) {
    const ticket = await this.adminGetTicket(ticketId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { senderRole: true, message: true },
    });
    const lastCustomer = messages.find((m) => m.senderRole === 'CUSTOMER')?.message || '';
    const context = await this.ai.buildContextSnapshot(ticket.tenantId);
    return this.ai.assistAgent(ticket, lastCustomer, context);
  }
}