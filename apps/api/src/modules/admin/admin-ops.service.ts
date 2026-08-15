import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { paginate } from './admin-util';

const SERVICES = [
  'DATABASE',
  'AUTH',
  'API',
  'REALTIME',
  'PAYMENTS',
  'EMAIL',
  'SMS',
  'WHATSAPP',
  'AI',
  'STORAGE',
  'BACKGROUND_JOBS',
  'CRON',
  'WEBHOOKS',
  'INTEGRATIONS',
];

const SERVICE_LABELS: Record<string, string> = {
  DATABASE: 'Database',
  AUTH: 'Authentication',
  API: 'API',
  REALTIME: 'Realtime',
  PAYMENTS: 'Payments',
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  AI: 'AI',
  STORAGE: 'Storage',
  BACKGROUND_JOBS: 'Background Jobs',
  CRON: 'Cron Jobs',
  WEBHOOKS: 'Webhooks',
  INTEGRATIONS: 'Integrations',
};

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async systemHealth() {
    const now = Date.now();
    const services = await Promise.all(
      SERVICES.map(async (key) => {
        const recent = await this.prisma.systemLog.count({
          where: { service: key, createdAt: { gte: new Date(now - 24 * 3600000) } },
        });
        const errors = await this.prisma.systemLog.count({
          where: { service: key, severity: { in: ['ERROR', 'CRITICAL'] }, createdAt: { gte: new Date(now - 24 * 3600000) } },
        });
        let status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' = 'OPERATIONAL';
        if (errors > 3) status = 'DOWN';
        else if (errors > 0) status = 'DEGRADED';

        // Derive live signals where possible.
        if (key === 'DATABASE') {
          try {
            await this.prisma.$queryRaw`SELECT 1`;
          } catch {
            status = 'DOWN';
          }
        }
        if (key === 'PAYMENTS') {
          const stripeFailures = await this.prisma.subscriptionEvent.count({
            where: { type: 'PAYMENT_FAILED', createdAt: { gte: new Date(now - 24 * 3600000) } },
          });
          if (stripeFailures > 3) status = 'DEGRADED';
        }
        if (key === 'AI') {
          const aiFailures = await this.prisma.systemLog.count({
            where: { service: 'AI', severity: 'ERROR', createdAt: { gte: new Date(now - 3600000) } },
          });
          if (aiFailures > 5) status = 'DOWN';
        }

        return {
          key,
          label: SERVICE_LABELS[key] ?? key,
          status,
          latencyMs: undefined,
          errorRate: recent > 0 ? Math.round((errors / recent) * 1000) / 10 : 0,
          uptime: undefined,
        };
      }),
    );

    const overall: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' = services.some((s) => s.status === 'DOWN')
      ? 'DOWN'
      : services.some((s) => s.status === 'DEGRADED')
        ? 'DEGRADED'
        : 'OPERATIONAL';

    const incidents24h = await this.prisma.systemLog.count({
      where: { severity: 'CRITICAL', createdAt: { gte: new Date(now - 24 * 3600000) } },
    });

    return {
      services,
      overall,
      uptime: 99.9,
      incidents24h,
      lastChecked: new Date(now).toISOString(),
    };
  }

  async listLogs(query: {
    severity?: string;
    service?: string;
    date?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.severity && query.severity !== 'ALL') where.severity = query.severity;
    if (query.service && query.service !== 'ALL') where.service = query.service;
    if (query.date) {
      const start = new Date(query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }
    const [items, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.systemLog.count({ where }),
    ]);
    return {
      items: items.map((l) => ({
        id: l.id,
        service: l.service,
        severity: l.severity,
        message: l.message,
        error: l.error,
        requestId: l.requestId,
        environment: l.environment,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async securityEvents(query: {
    type?: string;
    severity?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.type && query.type !== 'ALL') where.type = query.type;
    if (query.severity && query.severity !== 'ALL') where.severity = query.severity;
    const [items, total] = await Promise.all([
      this.prisma.adminSecurityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.adminSecurityEvent.count({ where }),
    ]);
    return {
      items: items.map((e) => ({
        id: e.id,
        type: e.type,
        severity: e.severity,
        message: e.message,
        userName: e.user
          ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() || e.user.email
          : null,
        ip: e.ip,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async adminSessions() {
    // Active sessions = admins with recent successful logins.
    const admins = await this.prisma.user.findMany({
      where: { isAdmin: true },
      include: {
        loginHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          where: { successful: true },
        },
      },
    });
    return admins.map((a) => ({
      id: a.id,
      email: a.email,
      name: `${a.firstName} ${a.lastName}`.trim(),
      adminRole: a.adminRole,
      device: a.loginHistory[0]?.device ?? null,
      browser: a.loginHistory[0]?.browser ?? null,
      ip: a.loginHistory[0]?.ip ?? null,
      lastActive: a.loginHistory[0]?.createdAt?.toISOString() ?? null,
      sessions: a.loginHistory.length,
    }));
  }

  async terminateSession(actor: any, userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 }, sessions: [] },
    });
    await this.audit.record(actor, 'session.terminated', 'SECURITY', {
      targetType: 'user',
      targetId: userId,
      targetName: (await this.prisma.user.findUnique({ where: { id: userId } }))?.email,
    });
    return { ok: true };
  }

  async auditLogs(query: {
    category?: string;
    action?: string;
    search?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.category && query.category !== 'ALL') where.category = query.category;
    if (query.action?.trim()) where.action = query.action.trim();
    if (query.search?.trim()) {
      where.OR = [
        { actorEmail: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { actorName: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { targetName: { contains: query.search.trim(), mode: 'insensitive' as const } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return {
      items: items.map((a) => ({
        id: a.id,
        actorName: a.actorName,
        actorEmail: a.actorEmail,
        action: a.action,
        category: a.category,
        targetType: a.targetType,
        targetName: a.targetName,
        metadata: a.metadata,
        ip: a.ip,
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}