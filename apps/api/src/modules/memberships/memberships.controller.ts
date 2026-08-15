import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { IsString, IsNumber, IsArray, IsOptional, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { PLANS } from './plan-definitions';

class CreateTierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  validityDays?: number;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  bonusPointsPercent?: number;

  @IsOptional()
  priorityBooking?: boolean;

  @IsArray()
  @IsOptional()
  benefits?: string[];

  @IsString()
  @IsOptional()
  color?: string;
}

class UpdateTierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  validityDays?: number;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  bonusPointsPercent?: number;

  @IsOptional()
  priorityBooking?: boolean;

  @IsArray()
  @IsOptional()
  benefits?: string[];

  @IsString()
  @IsOptional()
  color?: string;
}

class AssignCustomerDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  tierId: string;
}

class PaymentMethodDto {
  @IsString()
  @IsOptional()
  @MaxLength(30)
  brand?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'last4 must be exactly 4 digits' })
  last4?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'expMonth must be MM' })
  expMonth?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}$|^\d{4}$/, { message: 'expYear must be YY or YYYY' })
  expYear?: string;
}

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('tiers')
  async listTiers(@CurrentUser() user: any) {
    return this.membershipsService.listTiers(user.activeTenantId);
  }

  @Post('tiers')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  async createTier(
    @Body() dto: CreateTierDto,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.createTier(user.activeTenantId, dto);
  }

  @Put('tiers/:id')
  @Roles('OWNER', 'MANAGER')
  async updateTier(
    @Param('id') id: string,
    @Body() dto: UpdateTierDto,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.updateTier(user.activeTenantId, id, dto as any);
  }

  @Delete('tiers/:id')
  @Roles('OWNER')
  async deleteTier(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.deleteTier(user.activeTenantId, id);
  }

  @Post('assign')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  async assignCustomer(
    @Body() dto: AssignCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.assignCustomer(user.activeTenantId, dto.customerId, dto.tierId);
  }

  @Delete('assign/:id')
  @Roles('OWNER', 'MANAGER')
  async removeAssignment(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.removeAssignment(user.activeTenantId, id);
  }

  // --- Subscription Plan Management ---

  @Get('plans')
  async listPlans() {
    return PLANS.map(p => ({
      ...p,
      limits: undefined, // Don't expose internal limits to all callers
    }));
  }

  @Get('subscription')
  @Roles('OWNER', 'MANAGER')
  async getSubscription(@CurrentUser() user: any) {
    const sub = await this.membershipsService.getSubscription(user.activeTenantId);
    if (!sub) throw new NotFoundException('No subscription found');
    return sub;
  }

  @Get('subscription/history')
  @Roles('OWNER', 'MANAGER')
  async getBillingHistory(@CurrentUser() user: any) {
    return this.membershipsService.getBillingHistory(user.activeTenantId);
  }

  @Put('plan')
  @Roles('OWNER')
  async changePlan(
    @Body('plan') plan: string,
    @CurrentUser() user: any,
  ) {
    if (!PLANS.some(p => p.id === plan)) {
      throw new NotFoundException('Invalid plan');
    }
    return this.membershipsService.changePlan(user.activeTenantId, plan);
  }

  @Post('subscription/cancel')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser() user: any) {
    return this.membershipsService.cancelSubscription(user.activeTenantId);
  }

  @Post('subscription/restart')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  async restartSubscription(@CurrentUser() user: any) {
    return this.membershipsService.restartSubscription(user.activeTenantId);
  }

  @Put('subscription/payment-method')
  @Roles('OWNER')
  async updatePaymentMethod(@Body() dto: PaymentMethodDto, @CurrentUser() user: any) {
    return this.membershipsService.updatePaymentMethod(user.activeTenantId, dto);
  }
}
