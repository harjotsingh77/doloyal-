import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RequireFeature } from '../../common/require-feature.decorator';
import { FeatureFlagGuard } from '../../common/feature-flag.guard';
import { LoyaltyModulesService } from './loyalty-modules.service';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';

class UpdateConfigDto {
  @IsString() @IsOptional() mode?: string;
  @IsNumber() @IsOptional() pointsPerCurrency?: number;
  @IsNumber() @IsOptional() pointsPerVisit?: number;
  @IsNumber() @IsOptional() currencyPerPoint?: number;
  @IsNumber() @IsOptional() expiryDays?: number;
  @IsNumber() @IsOptional() welcomeBonus?: number;
  @IsNumber() @IsOptional() referralBonus?: number;
  @IsObject() @IsOptional() settings?: Record<string, unknown>;
}

class EarnPointsDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsNumber() @Min(1) amount: number;
  @IsString() @IsNotEmpty() reason: string;
}

class RedeemDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsNotEmpty() rewardId: string;
}

class AdjustDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsNumber() points: number;
  @IsString() @IsNotEmpty() reason: string;
}

class CopilotDto {
  @IsString() @IsNotEmpty() message: string;
  @IsString() @IsOptional() conversationId?: string;
}

class ApplyRecDto {
  @IsString() @IsNotEmpty() action: string;
}

class ChallengeDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() type?: string;
  @IsNumber() @IsOptional() targetValue?: number;
  @IsNumber() @IsOptional() rewardPoints?: number;
  @IsString() @IsOptional() rewardLabel?: string;
  @IsString() @IsOptional() endsAt?: string;
  @IsBoolean() @IsOptional() aiGenerated?: boolean;
}

class BadgeDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() icon?: string;
  @IsString() @IsOptional() color?: string;
  @IsObject() @IsOptional() criteria?: Record<string, unknown>;
  @IsBoolean() @IsOptional() aiSuggested?: boolean;
}

class AutomationDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() trigger: string;
  @IsObject() @IsOptional() conditions?: Record<string, unknown>;
  @IsOptional() actions: any;
  @IsString() @IsOptional() status?: string;
}

class SurpriseDto {
  @IsString() @IsOptional() id?: string;
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() type: string;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
  @IsBoolean() @IsOptional() enabled?: boolean;
}

class CampaignGenDto {
  @IsString() @IsNotEmpty() businessType: string;
  @IsString() @IsNotEmpty() campaignType: string;
  @IsString() @IsOptional() notes?: string;
}

@Controller('loyalty')
@UseGuards(FeatureFlagGuard)
export class LoyaltyController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly modulesService: LoyaltyModulesService,
  ) {}

  @Get('config')
  @RequireFeature('program_settings')
  getConfig(@CurrentUser() user: any) {
    return this.loyaltyService.getConfig(user.activeTenantId);
  }

  @Put('config')
  @Roles('OWNER', 'MANAGER')
  @RequireFeature('program_settings')
  updateConfig(@Body() dto: UpdateConfigDto, @CurrentUser() user: any) {
    return this.loyaltyService.updateConfig(user.activeTenantId, dto as any);
  }

  @Get('config/versions')
  @RequireFeature('program_settings')
  getVersions(@CurrentUser() user: any) {
    return this.loyaltyService.getConfigVersions(user.activeTenantId);
  }

  @Post('config/versions/:id/restore')
  @Roles('OWNER', 'MANAGER')
  @RequireFeature('program_settings')
  restoreVersion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.loyaltyService.restoreConfigVersion(user.activeTenantId, id);
  }

  @Get('overview')
  getOverview(@CurrentUser() user: any) {
    return this.loyaltyService.getOverview(user.activeTenantId);
  }

  @Post('copilot')
  @HttpCode(HttpStatus.OK)
  @RequireFeature('gamification')
  copilot(@Body() dto: CopilotDto, @CurrentUser() user: any) {
    return this.loyaltyService.copilot(user.activeTenantId, dto.message, dto.conversationId);
  }

  @Get('recommendations')
  @RequireFeature('reward_automation')
  getRecommendations(@CurrentUser() user: any) {
    return this.loyaltyService.getRecommendations(user.activeTenantId);
  }

  @Post('recommendations/apply')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @RequireFeature('reward_automation')
  applyRecommendation(@Body() dto: ApplyRecDto, @CurrentUser() user: any) {
    return this.loyaltyService.applyRecommendation(user.activeTenantId, dto.action);
  }

  @Get('leaderboard')
  @RequireFeature('leaderboard')
  getLeaderboard(
    @Query('period') period: string,
    @Query('metric') metric: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    return this.loyaltyService.getLeaderboard(user.activeTenantId, {
      period,
      metric,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Post('leaderboard/reward-top')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @RequireFeature('leaderboard_rewards')
  rewardTop(@Body() body: { count?: number; points?: number }, @CurrentUser() user: any) {
    return this.loyaltyService.rewardTopCustomers(
      user.activeTenantId,
      body.count || 10,
      body.points || 200,
    );
  }

  @Get('challenges')
  @RequireFeature('customer_challenges')
  listChallenges(@CurrentUser() user: any) {
    return this.loyaltyService.listChallenges(user.activeTenantId);
  }

  @Post('challenges')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @RequireFeature('customer_challenges')
  createChallenge(@Body() dto: ChallengeDto, @CurrentUser() user: any) {
    return this.loyaltyService.createChallenge(user.activeTenantId, dto);
  }

  @Post('challenges/generate')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @RequireFeature('customer_challenges')
  generateChallenge(@CurrentUser() user: any) {
    return this.loyaltyService.generateChallenge(user.activeTenantId);
  }

  @Get('badges')
  @RequireFeature('badges_achievements')
  listBadges(@CurrentUser() user: any) {
    return this.loyaltyService.listBadges(user.activeTenantId);
  }

  @Post('badges')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @RequireFeature('badges_achievements')
  createBadge(@Body() dto: BadgeDto, @CurrentUser() user: any) {
    return this.loyaltyService.createBadge(user.activeTenantId, dto);
  }

  @Get('segments')
  @RequireFeature('loyalty_analytics')
  getSegments(@CurrentUser() user: any) {
    return this.loyaltyService.getSegments(user.activeTenantId);
  }

  @Get('churn')
  @RequireFeature('loyalty_analytics')
  getChurn(@CurrentUser() user: any) {
    return this.loyaltyService.getChurnPredictions(user.activeTenantId);
  }

  @Get('analytics')
  @RequireFeature('loyalty_analytics')
  getAnalytics(@CurrentUser() user: any) {
    return this.loyaltyService.getAnalytics(user.activeTenantId);
  }

  @Get('referrals')
  @RequireFeature('referral_campaigns')
  getReferrals(@CurrentUser() user: any) {
    return this.loyaltyService.getReferralTree(user.activeTenantId);
  }

  @Get('card/:customerId')
  @RequireFeature('wallet_pass')
  getCard(@Param('customerId') customerId: string, @CurrentUser() user: any) {
    return this.loyaltyService.getDigitalCard(user.activeTenantId, customerId);
  }

  @Get('journey/:customerId')
  @RequireFeature('customer_milestones')
  getJourney(@Param('customerId') customerId: string, @CurrentUser() user: any) {
    return this.loyaltyService.getCustomerJourney(user.activeTenantId, customerId);
  }

  @Get('streaks')
  @RequireFeature('streak_system')
  getStreaks(@CurrentUser() user: any) {
    return this.loyaltyService.getStreaks(user.activeTenantId);
  }

  @Get('surprise-rewards')
  @RequireFeature('surprise_rewards')
  listSurprise(@CurrentUser() user: any) {
    return this.loyaltyService.listSurpriseRewards(user.activeTenantId);
  }

  @Post('surprise-rewards')
  @Roles('OWNER', 'MANAGER')
  @RequireFeature('surprise_rewards')
  upsertSurprise(@Body() dto: SurpriseDto, @CurrentUser() user: any) {
    return this.loyaltyService.upsertSurpriseReward(user.activeTenantId, dto);
  }

  @Get('automations')
  @RequireFeature('automation_rules')
  listAutomations(@CurrentUser() user: any) {
    return this.loyaltyService.listAutomations(user.activeTenantId);
  }

  @Post('automations')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @RequireFeature('automation_rules')
  createAutomation(@Body() dto: AutomationDto, @CurrentUser() user: any) {
    return this.loyaltyService.createAutomation(user.activeTenantId, dto);
  }

  @Put('automations/:id/status')
  @Roles('OWNER', 'MANAGER')
  @RequireFeature('automation_rules')
  toggleAutomation(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: any,
  ) {
    return this.loyaltyService.toggleAutomation(user.activeTenantId, id, body.status);
  }

  @Get('activity')
  @RequireFeature('activity_feed')
  getActivity(@Query('limit') limit: string, @CurrentUser() user: any) {
    return this.loyaltyService.getActivityFeed(
      user.activeTenantId,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Post('campaigns/generate')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @RequireFeature('seasonal_campaigns')
  generateCampaign(@Body() dto: CampaignGenDto, @CurrentUser() user: any) {
    return this.loyaltyService.generateCampaign(user.activeTenantId, dto);
  }

  @Get('tiers')
  @RequireFeature('loyalty_tiers')
  getTiers(@CurrentUser() user: any) {
    return this.loyaltyService.ensureDefaultTiers(user.activeTenantId);
  }

  @Get('customers/search')
  searchCustomers(@Query('q') q: string, @CurrentUser() user: any) {
    return this.loyaltyService.searchCustomers(user.activeTenantId, q || '');
  }

  @Post('earn')
  @HttpCode(HttpStatus.CREATED)
  @RequireFeature('program_settings')
  earnPoints(@Body() dto: EarnPointsDto, @CurrentUser() user: any) {
    return this.loyaltyService.earnPoints(
      user.activeTenantId,
      dto.customerId,
      dto.amount,
      dto.reason,
    );
  }

  @Post('redeem')
  @HttpCode(HttpStatus.CREATED)
  redeem(@Body() dto: RedeemDto, @CurrentUser() user: any) {
    return this.loyaltyService.redeem(user.activeTenantId, dto.customerId, dto.rewardId);
  }

  @Post('adjust')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @RequireFeature('manual_point_adjustment')
  adjust(@Body() dto: AdjustDto, @CurrentUser() user: any) {
    return this.loyaltyService.adjust(
      user.activeTenantId,
      dto.customerId,
      dto.points,
      dto.reason,
    );
  }

  @Get('ledger')
  @RequireFeature('points_ledger_explorer')
  getLedger(
    @Query('customerId') customerId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('type') type: string,
    @Query('search') search: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: any,
  ) {
    return this.loyaltyService.getLedger(user.activeTenantId, {
      customerId,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      type,
      search,
      from,
      to,
    });
  }

  // ─── Modular feature entities / snapshots ────────────────────────────────

  @Get('modules/:featureKey')
  getModuleSnapshot(@Param('featureKey') featureKey: string, @CurrentUser() user: any) {
    return this.modulesService.getModuleSnapshot(user.activeTenantId, featureKey);
  }

  @Get('modules/:featureKey/entities')
  listModuleEntities(@Param('featureKey') featureKey: string, @CurrentUser() user: any) {
    return this.modulesService.listEntities(user.activeTenantId, featureKey);
  }

  @Post('modules/:featureKey/entities')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  createModuleEntity(
    @Param('featureKey') featureKey: string,
    @Body() body: { name?: string; status?: string; data: Record<string, unknown>; sortOrder?: number },
    @CurrentUser() user: any,
  ) {
    return this.modulesService.createEntity(
      user.activeTenantId,
      featureKey,
      body,
      user.userId || user.id,
    );
  }

  @Put('modules/:featureKey/entities/:id')
  @Roles('OWNER', 'MANAGER')
  updateModuleEntity(
    @Param('featureKey') featureKey: string,
    @Param('id') id: string,
    @Body() body: { name?: string; status?: string; data?: Record<string, unknown>; sortOrder?: number },
    @CurrentUser() user: any,
  ) {
    return this.modulesService.updateEntity(
      user.activeTenantId,
      featureKey,
      id,
      body,
      user.userId || user.id,
    );
  }

  @Post('modules/:featureKey/entities/:id/delete')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  deleteModuleEntity(
    @Param('featureKey') featureKey: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.modulesService.deleteEntity(
      user.activeTenantId,
      featureKey,
      id,
      user.userId || user.id,
    );
  }

  @Get('audit-logs')
  @RequireFeature('audit_logs')
  listAuditLogs(
    @Query('featureKey') featureKey: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @CurrentUser() user: any,
  ) {
    return this.modulesService.listAuditLogs(user.activeTenantId, {
      featureKey,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }
}
