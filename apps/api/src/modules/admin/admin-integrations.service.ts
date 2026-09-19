import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { paginate } from './admin-util';

const SENSITIVE_KEY = /secret|token|password|api[_-]?key|authorization|credential/i;

function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizePayload(v, depth + 1));
  if (typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizePayload(val, depth + 1);
  }
  return out;
}

@Injectable()
export class AdminIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async overview() {
    const integrations = await this.prisma.integration.findMany({
      select: {
        type: true,
        status: true,
        lastSyncedAt: true,
        errorLog: true,
      },
    });
    const failures24h = await this.prisma.syncLog.count({
      where: {
        status: 'FAILED',
        resolvedAt: null,
        startedAt: { gte: new Date(Date.now() - 24 * 3600000) },
      },
    });

    const byType: Record<
      string,
      { type: string; status: string; connected: number; errors: number; lastSync: Date | null; lastError: string | null }
    > = {};
    for (const i of integrations) {
      const entry = byType[i.type] ?? {
        type: i.type,
        status: 'CONNECTED',
        connected: 0,
        errors: 0,
        lastSync: null,
        lastError: null,
      };
      if (i.status === 'CONNECTED' || i.status === 'ERROR') entry.connected++;
      if (i.status === 'ERROR') entry.errors++;
      if (i.lastSyncedAt && (!entry.lastSync || i.lastSyncedAt > entry.lastSync)) {
        entry.lastSync = i.lastSyncedAt;
      }
      if (i.errorLog) entry.lastError = String(i.errorLog);
      byType[i.type] = entry;
    }

    const items = Object.values(byType).map((e) => ({
      type: e.type,
      label: e.type.replace(/_/g, ' '),
      status: e.errors > 0 ? 'ERROR' : e.connected > 0 ? 'CONNECTED' : 'DISCONNECTED',
      connectedCount: e.connected,
      errorCount: e.errors,
      lastSyncAt: e.lastSync?.toISOString() ?? null,
      lastError: e.lastError,
      usage: e.connected,
    }));

    const payments = integrations.find((i) => i.type === 'STRIPE' || i.type === 'RAZORPAY');

    return {
      items,
      totalConnected: integrations.filter((i) => i.status === 'CONNECTED').length,
      failures24h,
      paymentsStatus: payments?.status ?? 'DISCONNECTED',
    };
  }

  async listErrors(query: {
    status?: string;
    type?: string;
    businessId?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.status === 'RESOLVED') where.resolvedAt = { not: null };
    else if (query.status === 'OPEN' || !query.status || query.status === 'ALL_OPEN') {
      if (query.status !== 'ALL') where.resolvedAt = null;
    }
    if (!query.status || query.status === 'OPEN' || query.status === 'ALL_OPEN') {
      where.status = 'FAILED';
      if (query.status !== 'RESOLVED') where.resolvedAt = null;
    } else if (query.status === 'FAILED') {
      where.status = 'FAILED';
    } else if (query.status && query.status !== 'ALL' && query.status !== 'RESOLVED') {
      where.status = query.status;
    }

    const integrationFilter: Record<string, unknown> = {};
    if (query.type && query.type !== 'ALL') integrationFilter.type = query.type;
    if (query.businessId && query.businessId !== 'ALL') integrationFilter.tenantId = query.businessId;
    if (Object.keys(integrationFilter).length) where.integration = integrationFilter;

    const [rows, total] = await Promise.all([
      this.prisma.syncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          integration: {
            select: {
              id: true,
              type: true,
              status: true,
              tenantId: true,
              tenant: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.syncLog.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        integrationId: row.integrationId,
        integration: row.integration.type,
        businessId: row.integration.tenantId,
        businessName: row.integration.tenant.name,
        status: row.resolvedAt ? 'RESOLVED' : row.status,
        severity: row.status === 'FAILED' && !row.resolvedAt ? 'ERROR' : 'INFO',
        error: row.errorMessage,
        recordsProcessed: row.recordsProcessed,
        retryCount: 0,
        startedAt: row.startedAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null,
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        lastRetryAt: null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async resolveError(actor: any, id: string) {
    const row = await this.prisma.syncLog.findUnique({
      where: { id },
      include: { integration: { include: { tenant: { select: { name: true } } } } },
    });
    if (!row) throw new NotFoundException('Sync error not found');
    await this.prisma.syncLog.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
    await this.audit.record(actor, 'integration.errorResolved', 'INTEGRATION', {
      targetType: 'sync_log',
      targetId: id,
      targetName: row.integration.tenant.name,
      metadata: { integration: row.integration.type },
    });
    return { ok: true, status: 'RESOLVED' };
  }

  async retryError(actor: any, id: string) {
    const row = await this.prisma.syncLog.findUnique({
      where: { id },
      include: { integration: { include: { tenant: { select: { name: true } } } } },
    });
    if (!row) throw new NotFoundException('Sync error not found');
    await this.prisma.syncLog.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
    const queued = await this.prisma.syncLog.create({
      data: {
        integrationId: row.integrationId,
        status: 'PENDING',
        metadata: { retriedFrom: row.id, by: actor?.email ?? null },
      },
    });
    await this.audit.record(actor, 'integration.errorRetried', 'INTEGRATION', {
      targetType: 'sync_log',
      targetId: queued.id,
      targetName: row.integration.tenant.name,
      metadata: { from: row.id, integration: row.integration.type },
    });
    return { ok: true, id: queued.id, status: 'PENDING' };
  }

  async listWebhookEvents(query: {
    status?: string;
    type?: string;
    businessId?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.status && query.status !== 'ALL') where.status = query.status;
    const integrationFilter: Record<string, unknown> = {};
    if (query.type && query.type !== 'ALL') integrationFilter.type = query.type;
    if (query.businessId && query.businessId !== 'ALL') integrationFilter.tenantId = query.businessId;
    if (Object.keys(integrationFilter).length) where.integration = integrationFilter;

    const [rows, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          integration: {
            select: {
              type: true,
              tenantId: true,
              tenant: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        source: row.integration.type,
        businessId: row.integration.tenantId,
        businessName: row.integration.tenant.name,
        status: row.status,
        error: row.errorMessage,
        processedAt: row.processedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        payload: sanitizePayload(row.payload),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getWebhookEvent(id: string) {
    const row = await this.prisma.webhookEvent.findUnique({
      where: { id },
      include: {
        integration: {
          select: { type: true, tenantId: true, tenant: { select: { name: true } } },
        },
      },
    });
    if (!row) throw new NotFoundException('Webhook event not found');
    return {
      id: row.id,
      eventType: row.eventType,
      source: row.integration.type,
      businessId: row.integration.tenantId,
      businessName: row.integration.tenant.name,
      status: row.status,
      error: row.errorMessage,
      processedAt: row.processedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      payload: sanitizePayload(row.payload),
    };
  }
}
