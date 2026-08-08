import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  LOYALTY_FEATURE_CATALOG,
  isCoreLoyaltyFeature,
  getLoyaltyFeatureDef,
  type LoyaltyFeatureKey,
} from '@doloyal/shared';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCatalog(tenantId: string) {
    const existing = await this.prisma.featureFlag.findMany({
      where: { tenantId },
      select: { featureKey: true },
    });
    const existingKeys = new Set(existing.map((e) => e.featureKey));
    const missing = LOYALTY_FEATURE_CATALOG.filter((f) => !existingKeys.has(f.key));
    if (missing.length === 0) return;

    await this.prisma.featureFlag.createMany({
      data: missing.map((f) => ({
        tenantId,
        featureKey: f.key,
        enabled: f.core,
        config: (f.defaultConfig ?? {}) as any,
      })),
      skipDuplicates: true,
    });
  }

  async getBusinessFeatures(tenantId: string) {
    await this.ensureCatalog(tenantId);
    const rows = await this.prisma.featureFlag.findMany({ where: { tenantId } });
    const byKey = new Map(rows.map((r) => [r.featureKey, r]));

    const features = LOYALTY_FEATURE_CATALOG.map((def) => {
      const row = byKey.get(def.key);
      const enabled = def.core ? true : !!row?.enabled;
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        core: def.core,
        enabled,
        config: {
          ...(def.defaultConfig || {}),
          ...((row?.config && typeof row.config === 'object' ? row.config : {}) as object),
        },
        sectionId: def.sectionId,
        updatedAt: row?.updatedAt?.toISOString() ?? null,
      };
    });

    return {
      features,
      enabledKeys: features.filter((f) => f.enabled).map((f) => f.key),
    };
  }

  async isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    if (isCoreLoyaltyFeature(featureKey)) return true;
    await this.ensureCatalog(tenantId);
    const row = await this.prisma.featureFlag.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } },
    });
    return !!row?.enabled;
  }

  async assertFeatureEnabled(tenantId: string, featureKey: string) {
    const enabled = await this.isFeatureEnabled(tenantId, featureKey);
    if (!enabled) {
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        message: `Feature "${featureKey}" is disabled for this business`,
        featureKey,
      });
    }
  }

  async enableFeature(tenantId: string, featureKey: string) {
    return this.setEnabled(tenantId, featureKey, true);
  }

  async disableFeature(tenantId: string, featureKey: string) {
    return this.setEnabled(tenantId, featureKey, false);
  }

  async setEnabled(tenantId: string, featureKey: string, enabled: boolean) {
    const def = getLoyaltyFeatureDef(featureKey);
    if (!def) throw new BadRequestException(`Unknown feature: ${featureKey}`);
    if (def.core && !enabled) {
      throw new BadRequestException(`Core feature "${featureKey}" cannot be disabled`);
    }
    if (def.core && enabled) {
      return this.getBusinessFeatures(tenantId);
    }

    await this.ensureCatalog(tenantId);
    await this.prisma.featureFlag.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      create: {
        tenantId,
        featureKey,
        enabled,
        config: (def.defaultConfig ?? {}) as any,
      },
      update: { enabled },
    });

    return this.getBusinessFeatures(tenantId);
  }

  async updateConfiguration(
    tenantId: string,
    featureKey: string,
    config: Record<string, unknown>,
  ) {
    const def = getLoyaltyFeatureDef(featureKey);
    if (!def) throw new BadRequestException(`Unknown feature: ${featureKey}`);

    await this.ensureCatalog(tenantId);
    const existing = await this.prisma.featureFlag.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } },
    });
    const prev =
      existing?.config && typeof existing.config === 'object'
        ? (existing.config as object)
        : def.defaultConfig || {};

    await this.prisma.featureFlag.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      create: {
        tenantId,
        featureKey,
        enabled: def.core,
        config: { ...prev, ...config } as any,
      },
      update: { config: { ...prev, ...config } as any },
    });

    return this.getBusinessFeatures(tenantId);
  }

  async getEnabledKeys(tenantId: string): Promise<LoyaltyFeatureKey[]> {
    const { enabledKeys } = await this.getBusinessFeatures(tenantId);
    return enabledKeys as LoyaltyFeatureKey[];
  }
}
