import { createHash, randomBytes } from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type {
  WebsiteConnectionStatus,
  WebsiteFramework,
  ConnectionLogLevel,
  Prisma,
} from '@prisma/client';

const DEFAULT_STATS = {
  customers: 0,
  appointments: 0,
  memberships: 0,
  rewards: 0,
  forms: 0,
};

const DEFAULT_WEBHOOK_EVENTS = [
  'customer.created',
  'customer.updated',
  'appointment.created',
  'membership.created',
  'reward.redeemed',
  'payment.completed',
  'lead.created',
];

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function generateKey(prefix: string, bytes = 24): string {
  return `${prefix}${randomBytes(bytes).toString('hex')}`;
}

function generateToken(): string {
  return `conn_${randomBytes(24).toString('hex')}`;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function extractDomain(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return url;
  }
}

export interface CreateConnectionInput {
  name: string;
  websiteUrl: string;
  framework: WebsiteFramework | string;
  businessName?: string;
}

@Injectable()
export class WebsiteConnectionsService {
  private readonly logger = new Logger(WebsiteConnectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rows = await this.prisma.connectedWebsite.findMany({
      where: { tenantId },
      include: {
        apiKeys: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { logs: true, sdkInstallations: true, webhooks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return rows.map((row) => this.mapWebsite(row, tenant?.name ?? ''));
  }

  async getById(tenantId: string, id: string) {
    const row = await this.prisma.connectedWebsite.findFirst({
      where: { id, tenantId },
      include: {
        apiKeys: { orderBy: { createdAt: 'desc' } },
        webhooks: { orderBy: { createdAt: 'desc' } },
        sdkInstallations: { orderBy: { lastSeenAt: 'desc' } },
        _count: { select: { logs: true } },
      },
    });
    if (!row) throw new NotFoundException('Connected website not found');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return this.mapWebsite(row, tenant?.name ?? '', true);
  }

  async create(tenantId: string, input: CreateConnectionInput) {
    if (!input.name?.trim()) throw new BadRequestException('Website name is required');
    if (!input.websiteUrl?.trim()) throw new BadRequestException('Website URL is required');
    if (!input.framework) throw new BadRequestException('Website type / framework is required');

    const framework = this.parseFramework(input.framework);
    const websiteUrl = normalizeUrl(input.websiteUrl);
    const businessId = `biz_${tenantId.replace(/-/g, '').slice(0, 16)}`;
    const connectionToken = generateToken();
    const publicKey = generateKey('lf_pk_');
    const secretKey = generateKey('lf_sk_');
    const webhookSecret = generateKey('lf_whsec_');

    const created = await this.prisma.$transaction(async (tx) => {
      const website = await tx.connectedWebsite.create({
        data: {
          tenantId,
          businessId,
          name: input.name.trim(),
          websiteUrl,
          framework,
          status: 'PENDING',
          connectionToken,
          stats: DEFAULT_STATS,
          settings: {
            businessName: input.businessName?.trim() || undefined,
            allowedOrigins: [websiteUrl],
            syncEnabled: true,
          },
        },
      });

      const apiKey = await tx.websiteApiKey.create({
        data: {
          tenantId,
          connectedWebsiteId: website.id,
          businessId,
          publicKey,
          secretKeyHash: hashSecret(secretKey),
          secretKeyPrefix: secretKey.slice(0, 12),
          webhookSecretHash: hashSecret(webhookSecret),
          webhookSecretPrefix: webhookSecret.slice(0, 14),
          label: 'Primary',
          isActive: true,
        },
      });

      await tx.websiteWebhook.create({
        data: {
          tenantId,
          connectedWebsiteId: website.id,
          businessId,
          url: `${websiteUrl.replace(/\/$/, '')}/doloyal/webhooks`,
          secretHash: hashSecret(webhookSecret),
          secretPrefix: webhookSecret.slice(0, 14),
          events: DEFAULT_WEBHOOK_EVENTS,
          isActive: true,
        },
      });

      await tx.connectionLog.create({
        data: {
          tenantId,
          connectedWebsiteId: website.id,
          businessId,
          level: 'INFO',
          event: 'connection.created',
          message: `Connection generated for ${website.name}`,
          metadata: { framework, websiteUrl },
        },
      });

      return { website, apiKey };
    });

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    return {
      ...this.mapWebsite(
        {
          ...created.website,
          apiKeys: [created.apiKey],
          _count: { logs: 1, sdkInstallations: 0, webhooks: 1 },
        },
        tenant?.name ?? input.businessName ?? '',
        true,
      ),
      credentials: {
        businessId,
        publicKey,
        secretKey,
        webhookSecret,
        connectionToken,
      },
    };
  }

  async disconnect(tenantId: string, id: string) {
    const website = await this.requireWebsite(tenantId, id);
    const lastConnectedAt = (
      website.lastSyncAt ?? website.updatedAt
    ).toISOString();
    const settings = {
      ...((website.settings as Record<string, unknown>) ?? {}),
      lastConnectedAt,
    };

    const updated = await this.prisma.connectedWebsite.update({
      where: { id: website.id },
      data: {
        status: 'DISCONNECTED',
        settings: settings as Prisma.InputJsonValue,
      },
      include: {
        apiKeys: { where: { isActive: true }, take: 1, orderBy: { createdAt: 'desc' } },
        _count: { select: { logs: true, sdkInstallations: true, webhooks: true } },
      },
    });
    await this.addLog(tenantId, website.id, website.businessId, 'INFO', 'connection.disconnected', 'Website disconnected');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return this.mapWebsite(updated, tenant?.name ?? '');
  }

  async reconnect(tenantId: string, id: string) {
    const website = await this.requireWebsite(tenantId, id);
    const updated = await this.prisma.connectedWebsite.update({
      where: { id: website.id },
      data: { status: 'CONNECTED', lastSyncAt: new Date() },
      include: {
        apiKeys: { where: { isActive: true }, take: 1, orderBy: { createdAt: 'desc' } },
        _count: { select: { logs: true, sdkInstallations: true, webhooks: true } },
      },
    });
    await this.addLog(tenantId, website.id, website.businessId, 'INFO', 'connection.reconnected', 'Website reconnected');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return this.mapWebsite(updated, tenant?.name ?? '');
  }

  async markConnected(tenantId: string, id: string) {
    return this.reconnect(tenantId, id);
  }

  async listApiKeys(tenantId: string) {
    const keys = await this.prisma.websiteApiKey.findMany({
      where: { tenantId },
      include: { connectedWebsite: { select: { id: true, name: true, websiteUrl: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((k) => ({
      id: k.id,
      businessId: k.businessId,
      publicKey: k.publicKey,
      secretKeyPrefix: `${k.secretKeyPrefix}…`,
      webhookSecretPrefix: `${k.webhookSecretPrefix}…`,
      label: k.label,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
      revokedAt: k.revokedAt?.toISOString() ?? null,
      website: k.connectedWebsite,
    }));
  }

  async listLogs(tenantId: string, connectedWebsiteId?: string, limit = 50) {
    const logs = await this.prisma.connectionLog.findMany({
      where: {
        tenantId,
        ...(connectedWebsiteId ? { connectedWebsiteId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: { connectedWebsite: { select: { id: true, name: true } } },
    });
    return logs.map((l) => ({
      id: l.id,
      businessId: l.businessId,
      connectedWebsiteId: l.connectedWebsiteId,
      websiteName: l.connectedWebsite?.name ?? null,
      level: l.level,
      event: l.event,
      message: l.message,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async listWebhooks(tenantId: string) {
    const rows = await this.prisma.websiteWebhook.findMany({
      where: { tenantId },
      include: { connectedWebsite: { select: { id: true, name: true, websiteUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((w) => ({
      id: w.id,
      businessId: w.businessId,
      url: w.url,
      secretPrefix: `${w.secretPrefix}…`,
      events: w.events,
      isActive: w.isActive,
      failureCount: w.failureCount,
      lastDeliveryAt: w.lastDeliveryAt?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
      website: w.connectedWebsite,
    }));
  }

  async getSettings(tenantId: string, id: string) {
    const website = await this.requireWebsite(tenantId, id);
    return {
      id: website.id,
      name: website.name,
      websiteUrl: website.websiteUrl,
      framework: website.framework,
      status: website.status,
      businessId: website.businessId,
      settings: (website.settings as Record<string, unknown>) ?? {},
    };
  }

  async updateSettings(
    tenantId: string,
    id: string,
    data: { name?: string; websiteUrl?: string; settings?: Record<string, unknown> },
  ) {
    const website = await this.requireWebsite(tenantId, id);
    const updated = await this.prisma.connectedWebsite.update({
      where: { id: website.id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.websiteUrl ? { websiteUrl: normalizeUrl(data.websiteUrl) } : {}),
        ...(data.settings
          ? {
              settings: {
                ...((website.settings as object) ?? {}),
                ...data.settings,
              } as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: {
        apiKeys: { where: { isActive: true }, take: 1, orderBy: { createdAt: 'desc' } },
        _count: { select: { logs: true, sdkInstallations: true, webhooks: true } },
      },
    });
    await this.addLog(tenantId, website.id, website.businessId, 'INFO', 'connection.settings_updated', 'Connection settings updated');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return this.mapWebsite(updated, tenant?.name ?? '');
  }

  async delete(tenantId: string, id: string) {
    const website = await this.requireWebsite(tenantId, id);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.websiteApiKey.deleteMany({
          where: { connectedWebsiteId: website.id, tenantId },
        });
        await tx.websiteWebhook.deleteMany({
          where: { connectedWebsiteId: website.id, tenantId },
        });
        await tx.sdkInstallation.deleteMany({
          where: { connectedWebsiteId: website.id, tenantId },
        });
        await tx.connectionLog.deleteMany({
          where: { connectedWebsiteId: website.id, tenantId },
        });
        await tx.connectedWebsite.delete({
          where: { id: website.id },
        });
      });

      this.logger.log(`Deleted website connection ${website.id} for tenant ${tenantId}`);
      return { success: true, message: 'Website connection deleted successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to delete website connection ${website.id} for tenant ${tenantId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to delete connection. Please try again.');
    }
  }

  private async requireWebsite(tenantId: string, id: string) {
    const website = await this.prisma.connectedWebsite.findFirst({ where: { id, tenantId } });
    if (!website) throw new NotFoundException('Connected website not found');
    return website;
  }

  private async addLog(
    tenantId: string,
    connectedWebsiteId: string,
    businessId: string,
    level: ConnectionLogLevel,
    event: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.connectionLog.create({
      data: {
        tenantId,
        connectedWebsiteId,
        businessId,
        level,
        event,
        message,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  private parseFramework(value: string): WebsiteFramework {
    const normalized = value.trim().toUpperCase().replace(/\./g, '').replace(/-/g, '') as WebsiteFramework;
    const allowed: WebsiteFramework[] = [
      'HTML', 'PHP', 'REACT', 'NEXTJS', 'VUE', 'LARAVEL', 'WORDPRESS', 'SHOPIFY', 'ANGULAR', 'NODE', 'EXPRESS', 'CUSTOM',
    ];
    const mapped: Record<string, WebsiteFramework> = {
      NEXTJS: 'NEXTJS',
      'NEXT.JS': 'NEXTJS',
      NEXT: 'NEXTJS',
      REACT: 'REACT',
      VUE: 'VUE',
      ANGULAR: 'ANGULAR',
      HTML: 'HTML',
      PHP: 'PHP',
      LARAVEL: 'LARAVEL',
      WORDPRESS: 'WORDPRESS',
      SHOPIFY: 'SHOPIFY',
      NODE: 'NODE',
      EXPRESS: 'EXPRESS',
      CUSTOM: 'CUSTOM',
    };
    const key = value.trim().toUpperCase();
    const framework = mapped[key] ?? (allowed.includes(normalized) ? normalized : null);
    if (!framework) throw new BadRequestException(`Unsupported website type: ${value}`);
    return framework;
  }

  private mapWebsite(row: any, businessName: string, detailed = false) {
    const stats = {
      ...DEFAULT_STATS,
      ...((row.stats as Record<string, number>) ?? {}),
    };
    const activeKey = Array.isArray(row.apiKeys) ? row.apiKeys[0] : null;
    const settings = (row.settings as Record<string, unknown>) ?? {};
    const lastConnectedAt =
      (settings.lastConnectedAt as string | undefined) ??
      row.lastSyncAt?.toISOString?.() ??
      row.lastSyncAt ??
      null;

    const base = {
      id: row.id,
      tenantId: row.tenantId,
      businessId: row.businessId,
      businessName: (settings.businessName as string) || businessName,
      name: row.name,
      websiteUrl: row.websiteUrl,
      framework: row.framework,
      status: row.status as WebsiteConnectionStatus,
      connectionToken: row.connectionToken,
      lastSyncAt: row.lastSyncAt?.toISOString?.() ?? row.lastSyncAt ?? null,
      lastConnectedAt,
      stats,
      domain: extractDomain(row.websiteUrl),
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
      publicKey: activeKey?.publicKey ?? null,
      secretKeyPrefix: activeKey ? `${activeKey.secretKeyPrefix}…` : null,
      logCount: row._count?.logs ?? 0,
      webhookCount: row._count?.webhooks ?? 0,
      sdkInstallCount: row._count?.sdkInstallations ?? 0,
    };

    if (!detailed) return base;

    return {
      ...base,
      settings: row.settings ?? {},
      apiKeys: (row.apiKeys ?? []).map((k: any) => ({
        id: k.id,
        publicKey: k.publicKey,
        secretKeyPrefix: `${k.secretKeyPrefix}…`,
        webhookSecretPrefix: `${k.webhookSecretPrefix}…`,
        label: k.label,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt?.toISOString?.() ?? null,
        createdAt: k.createdAt?.toISOString?.() ?? k.createdAt,
      })),
      webhooks: (row.webhooks ?? []).map((w: any) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        isActive: w.isActive,
        secretPrefix: `${w.secretPrefix}…`,
      })),
      sdkInstallations: row.sdkInstallations ?? [],
    };
  }
}
