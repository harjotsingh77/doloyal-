import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { getLoyaltyFeatureDef, isCoreLoyaltyFeature } from '@doloyal/shared';
import { LoyaltyService } from './loyalty.service';

@Injectable()
export class LoyaltyModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly loyalty: LoyaltyService,
  ) {}

  private async assertEnabled(tenantId: string, featureKey: string) {
    if (isCoreLoyaltyFeature(featureKey)) return;
    const enabled = await this.featureFlags.isFeatureEnabled(tenantId, featureKey);
    if (!enabled) {
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        message: `Feature "${featureKey}" is disabled`,
        featureKey,
      });
    }
  }

  async audit(
    tenantId: string,
    action: string,
    opts: {
      featureKey?: string;
      actorId?: string;
      entityType?: string;
      entityId?: string;
      before?: unknown;
      after?: unknown;
      metadata?: unknown;
    } = {},
  ) {
    return this.prisma.loyaltyAuditLog.create({
      data: {
        tenantId,
        action,
        featureKey: opts.featureKey,
        actorId: opts.actorId,
        entityType: opts.entityType,
        entityId: opts.entityId,
        before: (opts.before as any) ?? undefined,
        after: (opts.after as any) ?? undefined,
        metadata: (opts.metadata as any) ?? undefined,
      },
    });
  }

  async listEntities(tenantId: string, featureKey: string, status?: string) {
    await this.assertEnabled(tenantId, featureKey);
    return this.prisma.loyaltyFeatureEntity.findMany({
      where: {
        tenantId,
        featureKey,
        ...(status ? { status } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createEntity(
    tenantId: string,
    featureKey: string,
    data: { name?: string; status?: string; data: Record<string, unknown>; sortOrder?: number },
    actorId?: string,
  ) {
    await this.assertEnabled(tenantId, featureKey);
    if (!getLoyaltyFeatureDef(featureKey)) {
      throw new BadRequestException(`Unknown feature: ${featureKey}`);
    }
    const row = await this.prisma.loyaltyFeatureEntity.create({
      data: {
        tenantId,
        featureKey,
        name: data.name,
        status: data.status || 'ACTIVE',
        data: data.data as any,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    await this.audit(tenantId, 'ENTITY_CREATED', {
      featureKey,
      actorId,
      entityType: 'LoyaltyFeatureEntity',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  async updateEntity(
    tenantId: string,
    featureKey: string,
    id: string,
    data: { name?: string; status?: string; data?: Record<string, unknown>; sortOrder?: number },
    actorId?: string,
  ) {
    await this.assertEnabled(tenantId, featureKey);
    const existing = await this.prisma.loyaltyFeatureEntity.findFirst({
      where: { id, tenantId, featureKey },
    });
    if (!existing) throw new NotFoundException('Entity not found');

    const row = await this.prisma.loyaltyFeatureEntity.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.data !== undefined ? { data: data.data as any } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    await this.audit(tenantId, 'ENTITY_UPDATED', {
      featureKey,
      actorId,
      entityType: 'LoyaltyFeatureEntity',
      entityId: id,
      before: existing,
      after: row,
    });
    return row;
  }

  async deleteEntity(tenantId: string, featureKey: string, id: string, actorId?: string) {
    await this.assertEnabled(tenantId, featureKey);
    const existing = await this.prisma.loyaltyFeatureEntity.findFirst({
      where: { id, tenantId, featureKey },
    });
    if (!existing) throw new NotFoundException('Entity not found');
    await this.prisma.loyaltyFeatureEntity.delete({ where: { id } });
    await this.audit(tenantId, 'ENTITY_DELETED', {
      featureKey,
      actorId,
      entityType: 'LoyaltyFeatureEntity',
      entityId: id,
      before: existing,
    });
    return { ok: true };
  }

  /** Snapshot used by module UIs: config + live aggregates when available */
  async getModuleSnapshot(tenantId: string, featureKey: string) {
    await this.assertEnabled(tenantId, featureKey);
    const catalog = await this.featureFlags.getBusinessFeatures(tenantId);
    const feature = catalog.features.find((f) => f.key === featureKey);
    if (!feature) throw new NotFoundException('Feature not found');

    const entities = await this.prisma.loyaltyFeatureEntity.findMany({
      where: { tenantId, featureKey },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    let live: Record<string, unknown> = {};
    switch (featureKey) {
      case 'program_settings':
        live = { config: await this.loyalty.getConfig(tenantId) };
        break;
      case 'leaderboard': {
        const cfg = feature.config || {};
        live = {
          entries: await this.loyalty.getLeaderboard(tenantId, {
            period: String(cfg.period || 'monthly'),
            metric: String(cfg.metric || 'points'),
            limit: Number(cfg.topCount || 10),
          }),
        };
        break;
      }
      case 'loyalty_tiers':
        live = { tiers: await this.loyalty.ensureDefaultTiers(tenantId) };
        break;
      case 'customer_challenges':
        live = { challenges: await this.loyalty.listChallenges(tenantId) };
        break;
      case 'badges_achievements':
        live = { badges: await this.loyalty.listBadges(tenantId) };
        break;
      case 'streak_system':
        live = { streaks: await this.loyalty.getStreaks(tenantId) };
        break;
      case 'loyalty_analytics':
        live = { analytics: await this.loyalty.getAnalytics(tenantId) };
        break;
      case 'activity_feed':
        live = {
          activity: await this.loyalty.getActivityFeed(
            tenantId,
            Number((feature.config as any)?.limit || 40),
          ),
        };
        break;
      case 'points_ledger_explorer':
        live = { ledger: await this.loyalty.getLedger(tenantId, { page: 1, pageSize: 25 }) };
        break;
      case 'automation_rules':
      case 'reward_automation':
        live = { automations: await this.loyalty.listAutomations(tenantId) };
        break;
      case 'referral_campaigns':
        live = { referrals: await this.loyalty.getReferralTree(tenantId) };
        break;
      case 'surprise_rewards':
        live = { rules: await this.loyalty.listSurpriseRewards(tenantId) };
        break;
      case 'coupon_rewards':
      case 'gift_card_rewards':
      case 'vip_rewards':
      case 'custom_rewards': {
        const categoryMap: Record<string, string[]> = {
          coupon_rewards: ['DISCOUNT', 'COUPON'],
          gift_card_rewards: ['GIFT_CARD'],
          vip_rewards: ['VIP'],
          custom_rewards: ['OTHER', 'PRODUCT', 'SERVICE', 'EXPERIENCE', 'CUSTOM'],
        };
        const cats = categoryMap[featureKey] || [];
        const rewards = await this.prisma.reward.findMany({
          where: {
            tenantId,
            category: { in: cats },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        live = { rewards };
        break;
      }
      case 'audit_logs': {
        const logs = await this.prisma.loyaltyAuditLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: Number((feature.config as any)?.pageSize || 50),
        });
        live = { logs };
        break;
      }
      case 'smart_notifications':
      case 'email_notifications':
      case 'sms_notifications':
      case 'whatsapp_notifications':
      case 'push_notifications': {
        const channelMap: Record<string, string | undefined> = {
          email_notifications: 'EMAIL',
          sms_notifications: 'SMS',
          whatsapp_notifications: 'WHATSAPP',
          push_notifications: 'PUSH',
          smart_notifications: undefined,
        };
        const channel = channelMap[featureKey];
        const templates = await this.prisma.notificationTemplate.findMany({
          where: { tenantId, ...(channel ? { channel } : {}) },
          orderBy: { updatedAt: 'desc' },
        });
        live = { templates };
        break;
      }
      case 'multi_branch_loyalty': {
        const branches = await this.prisma.branch.findMany({
          where: { tenantId },
          orderBy: { name: 'asc' },
        });
        live = { branches };
        break;
      }
      default:
        live = {};
    }

    return {
      feature,
      entities: entities.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      live,
    };
  }

  /** When a feature is disabled — pause related runtime work */
  async onFeatureDisabled(tenantId: string, featureKey: string, actorId?: string) {
    if (featureKey === 'automation_rules' || featureKey === 'reward_automation') {
      await this.prisma.loyaltyAutomation.updateMany({
        where: { tenantId, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
    }
    if (featureKey === 'customer_challenges') {
      await this.prisma.loyaltyChallenge.updateMany({
        where: { tenantId, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      });
    }
    if (featureKey === 'surprise_rewards') {
      await this.prisma.surpriseRewardRule.updateMany({
        where: { tenantId, enabled: true },
        data: { enabled: false },
      });
    }
    // Soft-archive modular entities so they stop participating in calculations
    await this.prisma.loyaltyFeatureEntity.updateMany({
      where: { tenantId, featureKey, status: 'ACTIVE' },
      data: { status: 'DISABLED' },
    });
    await this.audit(tenantId, 'FEATURE_DISABLED', { featureKey, actorId });
  }

  async onFeatureEnabled(tenantId: string, featureKey: string, actorId?: string) {
    await this.prisma.loyaltyFeatureEntity.updateMany({
      where: { tenantId, featureKey, status: 'DISABLED' },
      data: { status: 'ACTIVE' },
    });
    await this.audit(tenantId, 'FEATURE_ENABLED', { featureKey, actorId });
  }

  async syncProgramSettingsFromConfig(
    tenantId: string,
    config: Record<string, unknown>,
    actorId?: string,
  ) {
    const payload: any = {};
    if (config.mode != null) payload.mode = String(config.mode);
    if (config.pointsPerCurrency != null) payload.pointsPerCurrency = Number(config.pointsPerCurrency);
    if (config.pointsPerVisit != null) payload.pointsPerVisit = Number(config.pointsPerVisit);
    if (config.currencyPerPoint != null) payload.currencyPerPoint = Number(config.currencyPerPoint);
    if (config.expiryDays != null) payload.expiryDays = Number(config.expiryDays);
    if (config.welcomeBonus != null) payload.welcomeBonus = Number(config.welcomeBonus);
    if (config.referralBonus != null) payload.referralBonus = Number(config.referralBonus);
    if (config.signupBonus != null) payload.welcomeBonus = Number(config.signupBonus);

    const settingsKeys = [
      'minSpend',
      'maxRedemption',
      'minRedemption',
      'tierMultiplier',
      'weekendMultiplier',
      'holidayMultiplier',
      'birthdayBonus',
      'reviewBonus',
      'autoExpiry',
      'doublePoints',
      'weekendBonus',
      'holidayBonus',
    ];
    const settings: Record<string, unknown> = {};
    for (const k of settingsKeys) {
      if (config[k] !== undefined) settings[k] = config[k];
    }
    if (Object.keys(settings).length) payload.settings = settings;

    if (Object.keys(payload).length) {
      await this.loyalty.updateConfig(tenantId, payload);
      await this.audit(tenantId, 'PROGRAM_SETTINGS_SYNCED', {
        featureKey: 'program_settings',
        actorId,
        after: payload,
      });
    }
  }

  async listAuditLogs(
    tenantId: string,
    opts: { featureKey?: string; page?: number; pageSize?: number } = {},
  ) {
    await this.assertEnabled(tenantId, 'audit_logs');
    const page = opts.page || 1;
    const pageSize = Math.min(opts.pageSize || 50, 200);
    const where = {
      tenantId,
      ...(opts.featureKey ? { featureKey: opts.featureKey } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.loyaltyAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.loyaltyAuditLog.count({ where }),
    ]);
    return {
      items: items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }
}
