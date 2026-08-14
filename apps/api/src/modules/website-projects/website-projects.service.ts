import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WebsiteProjectsRealtimeService } from './website-projects-realtime.service';

export const WEBSITE_PROJECT_STATUSES = [
  'REQUESTED',
  'REVIEWING',
  'IN_DISCUSSION',
  'IN_PROGRESS',
  'DESIGN_REVIEW',
  'DEVELOPMENT',
  'READY_FOR_REVIEW',
  'PUBLISHED',
  'COMPLETED',
] as const;

const projectInclude = {
  requirements: true,
  files: {
    orderBy: { createdAt: 'desc' as const },
  },
  conversation: {
    include: {
      _count: {
        select: {
          messages: {
            where: { senderRole: 'CUSTOMER', readAt: null },
          },
        },
      },
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
  },
  customerUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
  tenant: {
    select: { id: true, name: true, slug: true },
  },
};

const conversationInclude = {
  messages: {
    orderBy: { createdAt: 'asc' as const },
  },
  project: {
    select: { id: true, name: true, websiteType: true, status: true },
  },
  admin: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
};

@Injectable()
export class WebsiteProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: WebsiteProjectsRealtimeService,
  ) {}

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async getOwnedProject(projectId: string, userId: string) {
    const project = await this.prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });
    if (!project) throw new NotFoundException('Website project not found');
    if (project.customerUserId !== userId) {
      throw new NotFoundException('Website project not found');
    }
    return project;
  }

  private async getConversation(projectId: string) {
    const conversation = await this.prisma.websiteConversation.findUnique({
      where: { projectId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  private validateStatus(status: string): status is (typeof WEBSITE_PROJECT_STATUSES)[number] {
    return (WEBSITE_PROJECT_STATUSES as readonly string[]).includes(status);
  }

  // ─── customer: projects ────────────────────────────────────────────────────

  async listProjects(user: any) {
    const projects = await this.prisma.websiteProject.findMany({
      where: { customerUserId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        requirements: true,
        conversation: {
          include: {
            _count: {
              select: {
                messages: {
                  where: { senderRole: { not: 'CUSTOMER' }, readAt: null },
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    return projects;
  }

  async getProject(user: any, projectId: string) {
    return this.getOwnedProject(projectId, user.id);
  }

  async createProject(user: any, dto: any) {
    const requirement = dto.requirements || {};
    const requirementDefaults = {
      businessName: requirement.businessName || dto.name || '',
      businessType: requirement.businessType || '',
      businessLocation: requirement.businessLocation || null,
      businessPhone: requirement.businessPhone || null,
      businessEmail: requirement.businessEmail || null,
      existingWebsiteUrl: requirement.existingWebsiteUrl || null,
      websiteTypes: requirement.websiteTypes || [],
      designStyle: requirement.designStyle || [],
      designPreference: requirement.designPreference || 'SUGGEST',
      referenceUrl: requirement.referenceUrl || null,
      hasLogo: requirement.hasLogo ?? false,
      logoUrl: requirement.logoUrl || null,
      pageCount: requirement.pageCount || '',
      requiredFeatures: requirement.requiredFeatures || [],
      additionalRequirements: requirement.additionalRequirements || null,
    };

    const project = await this.prisma.websiteProject.create({
      data: {
        tenantId: user.activeTenantId,
        customerUserId: user.id,
        name: dto.name,
        websiteType: dto.websiteType,
        goal: dto.goal || null,
        requirements: {
          create: requirementDefaults,
        },
        conversation: {
          create: {
            tenantId: user.activeTenantId,
          },
        },
      },
      include: {
        requirements: true,
        conversation: true,
      },
    });

    await this.prisma.websiteProjectStatusHistory.create({
      data: {
        projectId: project.id,
        oldStatus: null,
        newStatus: project.status,
        changedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
        note: 'Request submitted',
      },
    });

    this.realtime.publish(user.activeTenantId, 'BOTH', 'project.created', {
      projectId: project.id,
      name: project.name,
      websiteType: project.websiteType,
      tenantId: user.activeTenantId,
    });

    return this.prisma.websiteProject.findUnique({
      where: { id: project.id },
      include: projectInclude,
    });
  }

  async updateProject(user: any, projectId: string, dto: any) {
    const project = await this.getOwnedProject(projectId, user.id);
    if (project.status !== 'REQUESTED' && project.status !== 'REVIEWING') {
      throw new BadRequestException(
        'Project details can only be edited while the request is under review',
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.websiteType !== undefined) data.websiteType = dto.websiteType;
    if (dto.goal !== undefined) data.goal = dto.goal || null;

    const updated = await this.prisma.websiteProject.update({
      where: { id: projectId },
      data,
    });

    if (dto.requirements && project.requirements) {
      const r = dto.requirements;
      const patch: Record<string, unknown> = {};
      const fields = [
        'businessName', 'businessType', 'businessLocation', 'businessPhone',
        'businessEmail', 'existingWebsiteUrl', 'websiteTypes', 'designStyle',
        'designPreference', 'referenceUrl', 'hasLogo', 'logoUrl', 'pageCount',
        'requiredFeatures', 'additionalRequirements',
      ];
      for (const f of fields) {
        if (r[f] !== undefined) patch[f] = r[f];
      }
      if (Object.keys(patch).length > 0) {
        await this.prisma.websiteProjectRequirement.update({
          where: { projectId },
          data: patch,
        });
      }
    }

    this.realtime.publish(user.activeTenantId, 'ADMIN', 'project.updated', {
      projectId,
      tenantId: user.activeTenantId,
    });

    return this.prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });
  }

  // ─── customer: chat ────────────────────────────────────────────────────────

  async getMessages(user: any, projectId: string, after?: string) {
    await this.getOwnedProject(projectId, user.id);
    const conversation = await this.getConversation(projectId);
    const messages = await this.prisma.websiteMessage.findMany({
      where: {
        conversationId: conversation.id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return { conversation, messages };
  }

  async sendMessage(user: any, projectId: string, dto: any) {
    await this.getOwnedProject(projectId, user.id);
    const conversation = await this.getConversation(projectId);

    const message = await this.prisma.websiteMessage.create({
      data: {
        conversationId: conversation.id,
        tenantId: user.activeTenantId,
        senderId: user.id,
        senderRole: 'CUSTOMER',
        message: dto.message,
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
        attachmentMimeType: dto.attachmentMimeType || null,
        isLink: Boolean(dto.isLink),
      },
    });

    await this.prisma.websiteConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    this.realtime.publish(user.activeTenantId, 'ADMIN', 'message.created', {
      projectId,
      messageId: message.id,
      senderRole: 'CUSTOMER',
    });

    return message;
  }

  async markConversationRead(user: any, projectId: string) {
    await this.getOwnedProject(projectId, user.id);
    const conversation = await this.getConversation(projectId);
    const result = await this.prisma.websiteMessage.updateMany({
      where: {
        conversationId: conversation.id,
        senderRole: { not: 'CUSTOMER' },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ─── customer: files ───────────────────────────────────────────────────────

  async uploadFile(user: any, projectId: string, dto: any) {
    await this.getOwnedProject(projectId, user.id);
    const file = await this.prisma.websiteProjectFile.create({
      data: {
        projectId,
        uploadedByUserId: user.id,
        uploadedByRole: 'CUSTOMER',
        category: dto.category || 'REFERENCE',
        fileName: dto.fileName,
        mimeType: dto.mimeType || null,
        sizeBytes: dto.sizeBytes ? Number(dto.sizeBytes) : null,
        url: dto.url,
      },
    });
    this.realtime.publish(user.activeTenantId, 'ADMIN', 'file.uploaded', {
      projectId,
      fileId: file.id,
    });
    return file;
  }

  async deleteFile(user: any, projectId: string, fileId: string) {
    const project = await this.getOwnedProject(projectId, user.id);
    const file = project.files?.find((f: any) => f.id === fileId);
    if (!file) throw new NotFoundException('File not found');
    if (file.uploadedByUserId !== user.id) {
      throw new BadRequestException('Only the uploader can delete this file');
    }
    await this.prisma.websiteProjectFile.delete({ where: { id: fileId } });
    return { id: fileId, deleted: true };
  }

  // ─── customer: status history ──────────────────────────────────────────────

  async getStatusHistory(user: any, projectId: string) {
    await this.getOwnedProject(projectId, user.id);
    return this.prisma.websiteProjectStatusHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── admin: projects ───────────────────────────────────────────────────────

  async adminListProjects(query: any) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 25));
    const status = query.status || undefined;
    const search = query.search?.trim() || undefined;

    const where: Record<string, unknown> = {};
    if (status && this.validateStatus(status)) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
        {
          customerUser: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          requirements: {
            businessName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.websiteProject.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: projectInclude,
      }),
      this.prisma.websiteProject.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async adminGetProject(projectId: string) {
    const project = await this.prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });
    if (!project) throw new NotFoundException('Website project not found');
    return project;
  }

  async adminUpdateProject(projectId: string, dto: any) {
    await this.adminGetProject(projectId);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.websiteType !== undefined) data.websiteType = dto.websiteType;
    if (dto.goal !== undefined) data.goal = dto.goal || null;
    if (dto.liveUrl !== undefined) data.liveUrl = dto.liveUrl || null;

    const updated = await this.prisma.websiteProject.update({
      where: { id: projectId },
      data,
    });

    const project = await this.prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });

    this.realtime.publish(updated.tenantId, 'CUSTOMER', 'project.updated', {
      projectId,
      tenantId: updated.tenantId,
    });

    return project;
  }

  async adminUpdateStatus(admin: any, projectId: string, dto: any) {
    const project = await this.adminGetProject(projectId);
    if (!dto.status || !this.validateStatus(dto.status)) {
      throw new BadRequestException(
        `status must be one of ${WEBSITE_PROJECT_STATUSES.join(', ')}`,
      );
    }
    if (dto.status === project.status) {
      return project;
    }

    const updated = await this.prisma.websiteProject.update({
      where: { id: projectId },
      data: { status: dto.status },
    });

    await this.prisma.websiteProjectStatusHistory.create({
      data: {
        projectId,
        oldStatus: project.status,
        newStatus: dto.status,
        changedById: admin.id,
        changedByName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Doloyal Team',
        note: dto.note || null,
      },
    });

    this.realtime.publish(project.tenantId, 'BOTH', 'project.status_changed', {
      projectId,
      tenantId: project.tenantId,
      oldStatus: project.status,
      newStatus: dto.status,
    });

    return updated;
  }

  async adminAssign(admin: any, projectId: string, adminId?: string) {
    const project = await this.adminGetProject(projectId);

    let target = admin;
    if (adminId && adminId !== admin.id) {
      const assigned = await this.prisma.user.findUnique({ where: { id: adminId } });
      if (!assigned || assigned.isAdmin !== true) {
        throw new BadRequestException('Assigned user must be a Doloyal admin');
      }
      target = assigned;
    }

    const targetName = `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email;

    await this.prisma.websiteProject.update({
      where: { id: projectId },
      data: {
        conversation: {
          update: {
            assignedAdminId: target.id,
            assignedAdminName: targetName,
          },
        },
      },
    });

    this.realtime.publish(project.tenantId, 'BOTH', 'project.assigned', {
      projectId,
      tenantId: project.tenantId,
      assignedAdminName: targetName,
    });

    return this.adminGetProject(projectId);
  }

  // ─── admin: chat ───────────────────────────────────────────────────────────

  async adminGetMessages(projectId: string) {
    await this.adminGetProject(projectId);
    const conversation = await this.getConversation(projectId);
    const messages = await this.prisma.websiteMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
    return { conversation, messages };
  }

  async adminSendMessage(admin: any, projectId: string, dto: any) {
    const project = await this.adminGetProject(projectId);
    const conversation = await this.getConversation(projectId);

    const message = await this.prisma.websiteMessage.create({
      data: {
        conversationId: conversation.id,
        tenantId: project.tenantId,
        senderId: admin.id,
        senderRole: 'ADMIN',
        message: dto.message,
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
        attachmentMimeType: dto.attachmentMimeType || null,
        isLink: Boolean(dto.isLink),
      },
    });

    await this.prisma.websiteConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    this.realtime.publish(project.tenantId, 'CUSTOMER', 'message.created', {
      projectId,
      messageId: message.id,
      senderRole: 'ADMIN',
    });

    return message;
  }

  // ─── admin: notes ──────────────────────────────────────────────────────────

  async adminAddNote(admin: any, projectId: string, note: string) {
    const project = await this.adminGetProject(projectId);
    const conversation = await this.getConversation(projectId);
    if (!note?.trim()) throw new BadRequestException('note is required');
    return this.prisma.websiteConversationNote.create({
      data: {
        conversationId: conversation.id,
        authorId: admin.id,
        authorName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Doloyal Team',
        note: note.trim(),
      },
    });
  }

  async adminListNotes(projectId: string) {
    await this.adminGetProject(projectId);
    const conversation = await this.getConversation(projectId);
    return this.prisma.websiteConversationNote.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── admin: files ──────────────────────────────────────────────────────────

  async adminUploadFile(admin: any, projectId: string, dto: any) {
    const project = await this.adminGetProject(projectId);
    const file = await this.prisma.websiteProjectFile.create({
      data: {
        projectId,
        uploadedByUserId: admin.id,
        uploadedByRole: 'ADMIN',
        category: dto.category || 'REFERENCE',
        fileName: dto.fileName,
        mimeType: dto.mimeType || null,
        sizeBytes: dto.sizeBytes ? Number(dto.sizeBytes) : null,
        url: dto.url,
      },
    });
    this.realtime.publish(project.tenantId, 'CUSTOMER', 'file.uploaded', {
      projectId,
      fileId: file.id,
    });
    return file;
  }
}
