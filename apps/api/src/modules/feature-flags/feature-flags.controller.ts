import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Put,
  forwardRef,
} from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { LoyaltyModulesService } from '../loyalty/loyalty-modules.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { IsBoolean, IsObject, IsString, IsNotEmpty } from 'class-validator';

class ToggleDto {
  @IsString()
  @IsNotEmpty()
  featureKey: string;

  @IsBoolean()
  enabled: boolean;
}

class ConfigDto {
  @IsString()
  @IsNotEmpty()
  featureKey: string;

  @IsObject()
  config: Record<string, unknown>;
}

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(
    private readonly featureFlags: FeatureFlagsService,
    @Inject(forwardRef(() => LoyaltyModulesService))
    private readonly loyaltyModules: LoyaltyModulesService,
  ) {}

  @Get()
  getBusinessFeatures(@CurrentUser() user: any) {
    return this.featureFlags.getBusinessFeatures(user.activeTenantId);
  }

  @Get('enabled')
  async getEnabled(@CurrentUser() user: any) {
    const keys = await this.featureFlags.getEnabledKeys(user.activeTenantId);
    return { enabledKeys: keys };
  }

  /** Only business owners (admins) may enable/disable features. */
  @Put('toggle')
  @Roles('OWNER')
  async toggle(@Body() dto: ToggleDto, @CurrentUser() user: any) {
    if (user.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only business owners can enable or disable features');
    }
    const catalog = await this.featureFlags.setEnabled(
      user.activeTenantId,
      dto.featureKey,
      dto.enabled,
    );
    const actorId = user.userId || user.id;
    if (dto.enabled) {
      await this.loyaltyModules.onFeatureEnabled(user.activeTenantId, dto.featureKey, actorId);
    } else {
      await this.loyaltyModules.onFeatureDisabled(user.activeTenantId, dto.featureKey, actorId);
    }
    return catalog;
  }

  /** Only owners may configure feature settings. */
  @Put('config')
  @Roles('OWNER')
  async updateConfig(@Body() dto: ConfigDto, @CurrentUser() user: any) {
    if (user.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only business owners can configure features');
    }
    const catalog = await this.featureFlags.updateConfiguration(
      user.activeTenantId,
      dto.featureKey,
      dto.config,
    );
    if (dto.featureKey === 'program_settings') {
      await this.loyaltyModules.syncProgramSettingsFromConfig(
        user.activeTenantId,
        dto.config,
        user.userId || user.id,
      );
    }
    await this.loyaltyModules.audit(user.activeTenantId, 'FEATURE_CONFIG_UPDATED', {
      featureKey: dto.featureKey,
      actorId: user.userId || user.id,
      after: dto.config,
    });
    return catalog;
  }
}
