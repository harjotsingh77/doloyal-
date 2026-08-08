import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { IsString, IsNumber, IsArray, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
import { PLANS, getPlan } from './plan-definitions';

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
  async getSubscription(@CurrentUser() user: any) {
    const sub = await this.membershipsService.getSubscription(user.activeTenantId);
    if (!sub) throw new NotFoundException('No subscription found');
    return sub;
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
}
