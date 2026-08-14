import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsObject,
  IsBoolean,
  IsArray,
  IsIn,
  IsNumber,
  MaxLength,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { FastifyRequest } from 'fastify';

class OnboardLoyaltyDto {
  @IsString()
  @IsOptional()
  mode?: string;

  @IsOptional()
  pointsPerCurrency?: number;

  @IsOptional()
  pointsPerVisit?: number;

  @IsOptional()
  currencyPerPoint?: number;

  @IsOptional()
  expiryDays?: number;
}

class OnboardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  gst?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  brandColor?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OnboardLoyaltyDto)
  loyalty?: OnboardLoyaltyDto;
}

class BusinessHoursDto {
  @IsString() @IsOptional() openingTime?: string;
  @IsString() @IsOptional() closingTime?: string;
  @IsArray() @IsOptional() weeklyOff?: string[];
  @IsString() @IsOptional() breakStart?: string;
  @IsString() @IsOptional() breakEnd?: string;
}

class SocialLinksDto {
  @IsString() @IsOptional() instagram?: string;
  @IsString() @IsOptional() facebook?: string;
  @IsString() @IsOptional() linkedin?: string;
  @IsString() @IsOptional() youtube?: string;
  @IsString() @IsOptional() googleBusiness?: string;
  @IsString() @IsOptional() whatsapp?: string;
}

class LegalPoliciesDto {
  @IsString() @IsOptional() privacyPolicy?: string;
  @IsString() @IsOptional() termsAndConditions?: string;
  @IsString() @IsOptional() refundPolicy?: string;
  @IsString() @IsOptional() cancellationPolicy?: string;
}

class BusinessStatusDto {
  @IsBoolean() @IsOptional() activeBusiness?: boolean;
  @IsBoolean() @IsOptional() onlineBooking?: boolean;
  @IsBoolean() @IsOptional() walkIns?: boolean;
  @IsBoolean() @IsOptional() showOnWebsite?: boolean;
}

class NotificationPrefsDto {
  @IsBoolean() @IsOptional() email?: boolean;
  @IsBoolean() @IsOptional() sms?: boolean;
  @IsBoolean() @IsOptional() whatsapp?: boolean;
  @IsBoolean() @IsOptional() marketingEmails?: boolean;
}

class UpdateTenantDto {
  @IsString() @IsOptional() @MaxLength(120) name?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() website?: string;
  @IsString() @IsOptional() @MaxLength(500) address?: string;
  @IsString() @IsOptional() @MaxLength(120) city?: string;
  @IsString() @IsOptional() @MaxLength(120) state?: string;
  @IsString() @IsOptional() @MaxLength(20) zip?: string;
  @IsString() @IsOptional() @MaxLength(60) country?: string;
  @IsString() @IsOptional() currency?: string;
  @IsString() @IsOptional() timezone?: string;
  @IsString() @IsOptional() language?: string;
  @IsString() @IsOptional() dateFormat?: string;
  @IsIn(['12h', '24h']) @IsOptional() timeFormat?: '12h' | '24h';
  @IsString() @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) brandColor?: string;
  @IsString() @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) secondaryColor?: string;
  @IsString() @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) accentColor?: string;
  @IsString() @IsOptional() fontFamily?: string;
  @IsNumber() @IsOptional() taxRate?: number;
  @IsString() @IsOptional() gst?: string;
  @IsString() @IsOptional() registrationNumber?: string;
  @IsString() @IsOptional() tagline?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() mapsUrl?: string;
  @IsOptional() logoUrl?: string | null;
  @IsOptional() coverBannerUrl?: string | null;
  @IsOptional() faviconUrl?: string | null;
  @IsOptional() @ValidateNested() @Type(() => BusinessHoursDto) businessHours?: BusinessHoursDto;
  @IsOptional() @ValidateNested() @Type(() => SocialLinksDto) socialLinks?: SocialLinksDto;
  @IsOptional() @ValidateNested() @Type(() => LegalPoliciesDto) legalPolicies?: LegalPoliciesDto;
  @IsOptional() @ValidateNested() @Type(() => BusinessStatusDto) businessStatus?: BusinessStatusDto;
  @IsOptional() @ValidateNested() @Type(() => NotificationPrefsDto) notificationPrefs?: NotificationPrefsDto;
}

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async onboard(@Body() dto: OnboardDto, @CurrentUser() user: any) {
    return this.tenantsService.onboard({ ...dto, userId: user.id });
  }

  @Get('current')
  async getCurrent(@CurrentUser() user: any) {
    return this.tenantsService.getById(user.activeTenantId);
  }

  @Patch('settings')
  async updateSettings(@Body() dto: UpdateTenantDto, @CurrentUser() user: any) {
    return this.tenantsService.updateSettings(user.activeTenantId, dto);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async uploadImage(
    @Req() req: FastifyRequest & { file: () => Promise<any> },
    @Query('kind') kind: string,
    @CurrentUser() user: any,
  ) {
    const file = await req.file();
    if (!file) throw new BadRequestException('No file uploaded');
    const buffer = await file.toBuffer();
    return this.tenantsService.uploadImage(
      user.activeTenantId,
      buffer,
      file.mimetype,
      file.filename,
      kind || 'logo',
    );
  }

  @Get(':id')
  @Roles('OWNER', 'MANAGER')
  async getById(@Param('id') id: string) {
    return this.tenantsService.getById(id);
  }

  @Patch(':id')
  @Roles('OWNER')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateSettings(id, dto);
  }

  @Get(':id/stats')
  @Roles('OWNER', 'MANAGER')
  async getStats(@Param('id') id: string) {
    return this.tenantsService.getStats(id);
  }
}
