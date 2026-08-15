import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';

@Injectable()
export class AdminIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async overview() {
    const integrations = await this.prisma.integration.findMany({
      include: { tenant: { select: { name: true } } },
    });
    const failures24h = await this.prisma.syncLog.count({
      where: { status: 'FAILED', startedAt: { gte: new Date(Date.now() - 24 * 3600000) } },
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
      label: e.type,
      status: e.errors > 0 ? 'ERROR' : e.connected > 0 ? 'CONNECTED' : 'DISCONNECTED',
      connectedCount: e.connected,
      errorCount: e.errors,
      lastSyncAt: e.lastSync?.toISOString() ?? null,
      lastError: e.lastError,
      usage: e.connected,
    }));

    return {
      items,
      totalConnected: integrations.filter((i) => i.status === 'CONNECTED').length,
      failures24h,
      paymentsStatus: integrations.find((i) => i.type === 'STRIPE' || i.type === 'RAZORPAY')?.status ?? 'DISCONNECTED',
    };
  }
}