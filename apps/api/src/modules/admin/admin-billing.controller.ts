import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminBillingService } from './admin-billing.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminBillingController {
  constructor(private readonly billing: AdminBillingService) {}

  @Get('subscriptions')
  @AdminPermission('subscriptions:view', 'billing:view')
  list(
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.billing.listSubscriptions({ status, plan, search, page, pageSize });
  }

  @Patch('subscriptions/:id/plan')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('subscriptions:manage')
  changePlan(
    @Param('id') id: string,
    @Body() dto: { plan: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.plan) throw new BadRequestException('plan is required');
    return this.billing.changePlan(user, id, dto.plan);
  }

  @Patch('subscriptions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('subscriptions:manage')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.billing.cancel(user, id);
  }

  @Patch('subscriptions/:id/restart')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('subscriptions:manage')
  restart(@Param('id') id: string, @CurrentUser() user: any) {
    return this.billing.restart(user, id);
  }

  @Post('subscriptions/:id/extend-trial')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('subscriptions:manage')
  extendTrial(
    @Param('id') id: string,
    @Body() dto: { days: number },
    @CurrentUser() user: any,
  ) {
    const days = Number(dto.days);
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      throw new BadRequestException('days must be between 1 and 90');
    }
    return this.billing.extendTrial(user, id, days);
  }

  @Get('billing/overview')
  @AdminPermission('billing:view', 'subscriptions:view')
  billingOverview() {
    return this.billing.overview();
  }

  @Get('plans')
  @AdminPermission('billing:view', 'subscriptions:view')
  plans() {
    return this.billing.plans();
  }

  @Patch('plans/:planId')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('billing:manage')
  updatePlan(
    @Param('planId') planId: string,
    @Body() dto: Record<string, unknown>,
    @CurrentUser() user: any,
  ) {
    return this.billing.updatePlanConfig(user, planId, dto);
  }

  @Get('enterprise-contracts')
  @AdminPermission('billing:view', 'subscriptions:view')
  enterpriseContracts() {
    return this.billing.listEnterpriseContracts();
  }

  @Post('enterprise-contracts')
  @HttpCode(HttpStatus.CREATED)
  @AdminPermission('billing:manage')
  createEnterpriseContract(@Body() dto: Record<string, unknown>, @CurrentUser() user: any) {
    return this.billing.createEnterpriseContract(user, dto as any);
  }

  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('refunds:manage')
  issueRefund(@Body() dto: Record<string, unknown>, @CurrentUser() user: any) {
    return this.billing.issueRefund(user, dto as any);
  }
}