import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
  IsIn,
  IsBoolean,
  IsArray,
  IsObject,
} from 'class-validator';

const REWARD_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'SCHEDULED'] as const;
const REWARD_CATEGORIES = [
  'STANDARD',
  'BIRTHDAY',
  'ANNIVERSARY',
  'REVIEW',
  'SOCIAL',
  'WHATSAPP',
  'CASHBACK',
] as const;

class CreateRewardDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0) @IsOptional() pointsCost?: number;
  @IsNumber() @IsOptional() discountVal?: number;
  @IsNumber() @IsOptional() rewardValue?: number;
  @IsString() @IsOptional() imageUrl?: string;
  @IsString() @IsOptional() terms?: string;
  @IsString() @IsIn(REWARD_STATUSES) @IsOptional() status?: string;
  @IsNumber() @IsOptional() validityDays?: number;
  @IsNumber() @IsOptional() totalQuantity?: number;
  @IsBoolean() @IsOptional() unlimitedStock?: boolean;
  @IsString() @IsIn(REWARD_CATEGORIES) @IsOptional() category?: string;
  @IsString() @IsOptional() rewardType?: string;
  @IsString() @IsOptional() startsAt?: string;
  @IsString() @IsOptional() expiresAt?: string;
  @IsArray() @IsOptional() branchIds?: string[];
  @IsString() @IsOptional() tierRequired?: string;
  @IsString() @IsOptional() membershipRequired?: string;
}

class UpdateRewardDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @IsOptional() pointsCost?: number;
  @IsNumber() @IsOptional() discountVal?: number;
  @IsNumber() @IsOptional() rewardValue?: number;
  @IsString() @IsOptional() imageUrl?: string;
  @IsString() @IsOptional() terms?: string;
  @IsString() @IsIn(REWARD_STATUSES) @IsOptional() status?: string;
  @IsNumber() @IsOptional() validityDays?: number;
  @IsNumber() @IsOptional() totalQuantity?: number;
  @IsBoolean() @IsOptional() unlimitedStock?: boolean;
  @IsString() @IsIn(REWARD_CATEGORIES) @IsOptional() category?: string;
  @IsString() @IsOptional() rewardType?: string;
  @IsString() @IsOptional() startsAt?: string;
  @IsString() @IsOptional() expiresAt?: string;
  @IsArray() @IsOptional() branchIds?: string[];
  @IsString() @IsOptional() tierRequired?: string;
  @IsString() @IsOptional() membershipRequired?: string;
}

class ProgramDto {
  @IsBoolean() @IsOptional() enabled?: boolean;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
}

class ClaimDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsIn(['REVIEW', 'SOCIAL', 'WHATSAPP']) programType: string;
  @IsObject() @IsOptional() evidence?: Record<string, unknown>;
}

class CashbackDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsNumber() @Min(1) points: number;
}

class ReviewClaimDto {
  @IsBoolean() approve: boolean;
}

@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('overview')
  overview(@CurrentUser() user: any) {
    return this.rewardsService.getOverview(user.activeTenantId);
  }

  @Get('programs')
  listPrograms(@CurrentUser() user: any) {
    return this.rewardsService.listPrograms(user.activeTenantId);
  }

  @Patch('programs/:programType')
  @Roles('OWNER', 'MANAGER')
  updateProgram(
    @Param('programType') programType: string,
    @Body() dto: ProgramDto,
    @CurrentUser() user: any,
  ) {
    return this.rewardsService.updateProgram(user.activeTenantId, programType, dto);
  }

  @Get('claims')
  listClaims(@CurrentUser() user: any, @Query('programType') programType?: string) {
    return this.rewardsService.listClaims(user.activeTenantId, programType);
  }

  @Post('claims')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  submitClaim(@Body() dto: ClaimDto, @CurrentUser() user: any) {
    return this.rewardsService.submitClaim(user.activeTenantId, dto);
  }

  @Post('claims/:id/review')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  reviewClaim(
    @Param('id') id: string,
    @Body() dto: ReviewClaimDto,
    @CurrentUser() user: any,
  ) {
    return this.rewardsService.reviewClaim(user.activeTenantId, id, dto.approve);
  }

  @Get('cashback')
  listCashback(@CurrentUser() user: any) {
    return this.rewardsService.listCashback(user.activeTenantId);
  }

  @Post('cashback/redeem')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  redeemCashback(@Body() dto: CashbackDto, @CurrentUser() user: any) {
    return this.rewardsService.redeemCashback(
      user.activeTenantId,
      dto.customerId,
      dto.points,
    );
  }

  @Post('automations/birthday/run')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  runBirthday(@CurrentUser() user: any) {
    return this.rewardsService.runBirthdayAutomation(user.activeTenantId);
  }

  @Post('automations/anniversary/run')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  runAnniversary(@CurrentUser() user: any) {
    return this.rewardsService.runAnniversaryAutomation(user.activeTenantId);
  }

  @Get('redemptions/export')
  @Roles('OWNER', 'MANAGER')
  async exportRedemptions(@CurrentUser() user: any) {
    const data = await this.rewardsService.listRedemptions(user.activeTenantId, {
      page: 1,
      pageSize: 5000,
    });
    const header = [
      'Transaction ID',
      'Customer',
      'Reward',
      'Category',
      'Points Used',
      'Cashback',
      'Branch',
      'Date',
      'Status',
    ];
    const rows = data.items.map((r) =>
      [
        r.transactionId,
        r.customerName,
        r.rewardName,
        r.category || '',
        r.pointsUsed,
        r.cashbackAmount,
        r.branchName || '',
        r.createdAt,
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return { csv: [header.join(','), ...rows].join('\n'), filename: 'reward-redemptions.csv' };
  }

  @Get('redemptions')
  listRedemptions(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('rewardId') rewardId?: string,
    @Query('customerId') customerId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.rewardsService.listRedemptions(user.activeTenantId, {
      status,
      rewardId,
      customerId,
      category,
      search,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.rewardsService.list(user.activeTenantId, { category, status, search });
  }

  @Post()
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRewardDto, @CurrentUser() user: any) {
    return this.rewardsService.create(user.activeTenantId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateRewardDto, @CurrentUser() user: any) {
    return this.rewardsService.update(user.activeTenantId, id, dto as any);
  }

  @Post(':id/duplicate')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  duplicate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rewardsService.duplicate(user.activeTenantId, id);
  }

  @Post(':id/archive')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rewardsService.archive(user.activeTenantId, id);
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  async remove(@Param('id') id: string, @Query('hard') hard: string, @CurrentUser() user: any) {
    if (hard === 'true') {
      return this.rewardsService.hardDelete(user.activeTenantId, id);
    }
    return this.rewardsService.deactivate(user.activeTenantId, id);
  }
}
