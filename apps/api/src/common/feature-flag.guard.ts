import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from './require-feature.decorator';
import { FeatureFlagsService } from '../modules/feature-flags/feature-flags.service';
import { isCoreLoyaltyFeature } from '@doloyal/shared';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;
    if (isCoreLoyaltyFeature(featureKey)) return true;

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    const tenantId = user?.activeTenantId;
    if (!tenantId) {
      throw new ForbiddenException('No active tenant');
    }

    const enabled = await this.featureFlags.isFeatureEnabled(tenantId, featureKey);
    if (!enabled) {
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        message: `Feature "${featureKey}" is disabled for this business`,
        featureKey,
      });
    }
    return true;
  }
}
