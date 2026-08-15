import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SupportRealtimeService } from './support-realtime.service';

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
    return `DL-${String(max + 1).padStart(6, '0')}`;
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
    await this.adminGetTicket(ticketId);
    if (!note?.trim()) throw new BadRequestException('note is required');
    return this.prisma.supportInternalNote.create({
      data: {
        ticketId,
        adminId: admin.id,
        adminName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Doloyal Team',
        note: note.trim(),
      },
    });
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
}