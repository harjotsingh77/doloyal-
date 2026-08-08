import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Sse,
  MessageEvent,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ReferralsService } from './referrals.service';
import { ReferralsRealtimeService } from './referrals-realtime.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { Public } from '../auth/public.decorator';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { publicClaimLimiter, publicTrackLimiter } from './referrals-rate-limit';

function rateLimited(message = 'Too many requests') {
  throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
}

class CampaignDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() campaignType?: string;
  @IsString() @IsOptional() rewardType?: string;
  @IsNumber() @IsOptional() rewardValue?: number;
  @IsString() @IsOptional() friendRewardType?: string;
  @IsNumber() @IsOptional() friendRewardValue?: number;
  @IsNumber() @IsOptional() minPurchase?: number;
  @IsNumber() @IsOptional() minAppointmentValue?: number;
  @IsNumber() @IsOptional() maxRewardLimit?: number;
  @IsString() @IsOptional() startsAt?: string;
  @IsString() @IsOptional() endsAt?: string;
  @IsString() @IsOptional() status?: string;
  @IsNumber() @IsOptional() usageLimit?: number;
  @IsNumber() @IsOptional() referralExpiryDays?: number;
  @IsString() @IsOptional() terms?: string;
}

class GenerateLinkDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() customerId?: string;
  @IsString() @IsOptional() campaignId?: string;
  @IsString() @IsOptional() customSlug?: string;
  @IsString() @IsOptional() expiresAt?: string;
}

class ShareDto {
  @IsString() @IsNotEmpty() linkId: string;
  @IsString() @IsNotEmpty() channel: string;
}

class CheckSlugDto {
  @IsString() @IsNotEmpty() slug: string;
}

class TrackDto {
  @IsString() @IsOptional() code?: string;
  @IsString() @IsOptional() fingerprint?: string;
  @IsString() @IsOptional() referrerUrl?: string;
  @IsString() @IsOptional() language?: string;
  @IsString() @IsOptional() timezone?: string;
  @IsString() @IsOptional() landingPage?: string;
  @IsString() @IsOptional() utmSource?: string;
  @IsString() @IsOptional() utmMedium?: string;
  @IsString() @IsOptional() utmCampaign?: string;
  @IsString() @IsOptional() utmContent?: string;
  @IsString() @IsOptional() channel?: string;
  @IsString() @IsOptional() sessionId?: string;
  @IsString() @IsOptional() userAgent?: string;
}

class ClaimDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() lastName?: string;
  @IsString() @IsOptional() sessionId?: string;
  @IsString() @IsOptional() fingerprint?: string;
}

class ConvertDto {
  @IsString() @IsOptional() invoiceId?: string;
  @IsNumber() @IsOptional() orderValue?: number;
  @IsBoolean() @IsOptional() paymentSuccessful?: boolean;
  @IsString() @IsOptional() customerId?: string;
}

class BookDto {
  @IsString() @IsOptional() appointmentId?: string;
  @IsNumber() @IsOptional() bookingValue?: number;
  @IsString() @IsOptional() customerId?: string;
}

class ProcessRewardDto {
  @IsString() @IsNotEmpty() conversionId: string;
}

function clientIp(req: any) {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

@Controller('referrals')
export class ReferralsController {
  constructor(
    private readonly referrals: ReferralsService,
    private readonly realtime: ReferralsRealtimeService,
  ) {}

  // ─── Realtime (SSE) ────────────────────────────────────────────────────────

  @Sse('events')
  events(@CurrentUser() user: any): Observable<MessageEvent> {
    return this.realtime.stream(user.activeTenantId);
  }

  // ─── Analytics / Dashboard ─────────────────────────────────────────────────

  @Get('dashboard')
  dashboard(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.referrals.getDashboard(user.activeTenantId, range || '30d', from, to);
  }

  @Get('overview')
  overview(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.referrals.getOverview(user.activeTenantId, range || '30d', from, to);
  }

  @Get('analytics')
  analytics(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.referrals.getAnalytics(user.activeTenantId, range || '30d', from, to);
  }

  @Get('funnel')
  funnel(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.referrals.getFunnel(user.activeTenantId, range || '30d', from, to);
  }

  @Get('leaderboard')
  leaderboard(@CurrentUser() user: any) {
    return this.referrals.getLeaderboard(user.activeTenantId);
  }

  @Get('sources')
  sources(@CurrentUser() user: any) {
    return this.referrals.getStoredSources(user.activeTenantId);
  }

  @Get('revenue')
  revenue(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.referrals.getRevenue(user.activeTenantId, range || '30d', from, to);
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  @Get('campaigns')
  listCampaigns(@CurrentUser() user: any) {
    return this.referrals.listCampaigns(user.activeTenantId);
  }

  @Get('campaigns/:id')
  getCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referrals.getCampaign(user.activeTenantId, id);
  }

  @Post('campaigns')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  createCampaign(@Body() dto: CampaignDto, @CurrentUser() user: any) {
    return this.referrals.createCampaign(user.activeTenantId, dto, user.id);
  }

  @Put('campaigns/:id')
  @Roles('OWNER', 'MANAGER')
  putCampaign(@Param('id') id: string, @Body() dto: CampaignDto, @CurrentUser() user: any) {
    return this.referrals.updateCampaign(user.activeTenantId, id, dto);
  }

  @Patch('campaigns/:id')
  @Roles('OWNER', 'MANAGER')
  updateCampaign(@Param('id') id: string, @Body() dto: CampaignDto, @CurrentUser() user: any) {
    return this.referrals.updateCampaign(user.activeTenantId, id, dto);
  }

  @Post('campaigns/:id/duplicate')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  duplicateCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referrals.duplicateCampaign(user.activeTenantId, id);
  }

  @Post('campaigns/:id/status')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: any,
  ) {
    return this.referrals.setCampaignStatus(user.activeTenantId, id, body.status);
  }

  @Delete('campaigns/:id')
  @Roles('OWNER', 'MANAGER')
  deleteCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referrals.deleteCampaign(user.activeTenantId, id);
  }

  // ─── Links ─────────────────────────────────────────────────────────────────

  @Get('check-slug')
  checkSlugGet(@Query('slug') slug: string, @CurrentUser() user: any) {
    return this.referrals.checkSlug(user.activeTenantId, slug);
  }

  @Post('links/check-slug')
  @HttpCode(HttpStatus.OK)
  checkSlugPost(@Body() dto: CheckSlugDto, @CurrentUser() user: any) {
    return this.referrals.checkSlug(user.activeTenantId, dto.slug);
  }

  @Get('links')
  listLinks(@CurrentUser() user: any, @Query('customerId') customerId?: string) {
    return this.referrals.listLinks(user.activeTenantId, customerId);
  }

  @Get('links/:id')
  getLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referrals.getLink(user.activeTenantId, id);
  }

  @Post('links')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  createLink(@Body() dto: GenerateLinkDto, @CurrentUser() user: any) {
    return this.referrals.generateLink(user.activeTenantId, dto);
  }

  /** @deprecated Prefer POST /links */
  @Post('generate-link')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  generateLink(@Body() dto: GenerateLinkDto, @CurrentUser() user: any) {
    return this.referrals.generateLink(user.activeTenantId, dto);
  }

  @Post('links/:id/regenerate')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  regenerate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referrals.regenerateLink(user.activeTenantId, id);
  }

  @Post('links/:id/status')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  setLinkStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: any,
  ) {
    if (!body?.status) throw new BadRequestException('status is required');
    return this.referrals.setLinkStatus(user.activeTenantId, id, body.status);
  }

  @Delete('links/:id')
  @Roles('OWNER', 'MANAGER')
  deleteLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referrals.deleteLink(user.activeTenantId, id);
  }

  @Post('links/share')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  shareLink(@Body() dto: ShareDto, @CurrentUser() user: any) {
    return this.referrals.recordShare(user.activeTenantId, dto.linkId, dto.channel);
  }

  @Post('share')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  share(@Body() dto: ShareDto, @CurrentUser() user: any) {
    return this.referrals.recordShare(user.activeTenantId, dto.linkId, dto.channel);
  }

  @Post('links/qr')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  qr(@Body() body: { linkId: string }, @CurrentUser() user: any) {
    return this.referrals.ensureQr(user.activeTenantId, body.linkId);
  }

  // ─── Conversions / tracking (auth) ─────────────────────────────────────────

  @Get('conversions')
  listConversions(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.referrals.listConversions(user.activeTenantId, {
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 25,
    });
  }

  @Post('booking')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  booking(@Body() dto: BookDto, @CurrentUser() user: any) {
    if (!dto.customerId) throw new BadRequestException('customerId required');
    return this.referrals.trackBooking(user.activeTenantId, {
      customerId: dto.customerId,
      appointmentId: dto.appointmentId,
      bookingValue: dto.bookingValue,
    });
  }

  @Post('payment')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  payment(@Body() dto: ConvertDto, @CurrentUser() user: any) {
    if (!dto.customerId) throw new BadRequestException('customerId required');
    return this.referrals.trackPayment(user.activeTenantId, {
      customerId: dto.customerId,
      invoiceId: dto.invoiceId,
      orderValue: dto.orderValue,
      paymentSuccessful: dto.paymentSuccessful,
    });
  }

  @Post('conversions/:id/book')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  book(@Param('id') id: string, @Body() dto: BookDto, @CurrentUser() user: any) {
    return this.referrals.markBooked(user.activeTenantId, id, dto);
  }

  @Post('conversions/:id/convert')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  convert(@Param('id') id: string, @Body() dto: ConvertDto, @CurrentUser() user: any) {
    return this.referrals.markConverted(user.activeTenantId, id, dto);
  }

  @Post('conversions/:id/credit-reward')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  credit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referrals.creditRewards(user.activeTenantId, id);
  }

  @Post('rewards/process')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  processReward(@Body() dto: ProcessRewardDto, @CurrentUser() user: any) {
    return this.referrals.creditRewards(user.activeTenantId, dto.conversionId);
  }

  @Get('rewards/history')
  rewardHistoryNew(@CurrentUser() user: any) {
    return this.referrals.getRewardHistory(user.activeTenantId);
  }

  @Get('reward-history')
  rewardHistory(@CurrentUser() user: any) {
    return this.referrals.getRewardHistory(user.activeTenantId);
  }

  @Get('export')
  @Roles('OWNER', 'MANAGER')
  export(@CurrentUser() user: any, @Query('format') format?: string) {
    const fmt = (format || 'csv').toLowerCase();
    if (!['csv', 'excel', 'pdf'].includes(fmt)) {
      throw new BadRequestException('format must be csv, excel, or pdf');
    }
    return this.referrals.exportReport(user.activeTenantId, fmt as 'csv' | 'excel' | 'pdf');
  }

  // ─── Public tracking ───────────────────────────────────────────────────────

  @Public()
  @Post('track-click')
  @HttpCode(HttpStatus.OK)
  trackClick(@Body() dto: TrackDto, @Req() req: any, @Headers('user-agent') ua?: string) {
    const ip = clientIp(req);
    if (!publicTrackLimiter.allow(`click:${ip}`)) {
      rateLimited('Too many tracking requests');
    }
    if (!dto.code) throw new BadRequestException('code required');
    return this.referrals.validateAndTrack(dto.code, {
      ...dto,
      ip,
      userAgent: ua || dto.userAgent,
    });
  }

  @Public()
  @Post('track-visit')
  @HttpCode(HttpStatus.OK)
  trackVisit(@Body() dto: TrackDto, @Req() req: any, @Headers('user-agent') ua?: string) {
    const ip = clientIp(req);
    if (!publicTrackLimiter.allow(`visit:${ip}`)) {
      rateLimited('Too many tracking requests');
    }
    if (!dto.code) throw new BadRequestException('code required');
    return this.referrals.validateAndTrack(dto.code, {
      ...dto,
      ip,
      userAgent: ua || dto.userAgent,
      channel: dto.channel || 'landing',
    });
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: ClaimDto, @Req() req: any) {
    const ip = clientIp(req);
    if (!publicClaimLimiter.allow(`claim:${ip}`)) {
      rateLimited('Too many claim attempts');
    }
    return this.referrals.claimReferral(dto);
  }

  @Public()
  @Post('public/validate/:code')
  @HttpCode(HttpStatus.OK)
  validate(
    @Param('code') code: string,
    @Body() dto: TrackDto,
    @Req() req: any,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = clientIp(req);
    if (!publicTrackLimiter.allow(`validate:${ip}`)) {
      rateLimited('Too many tracking requests');
    }
    return this.referrals.validateAndTrack(code, {
      ...dto,
      ip,
      userAgent: userAgent || dto.userAgent,
    });
  }

  @Public()
  @Get('public/:code')
  getPublic(@Param('code') code: string, @Req() req: any, @Headers('user-agent') ua?: string) {
    const ip = clientIp(req);
    return this.referrals.validateAndTrack(code, { ip, userAgent: ua });
  }

  @Public()
  @Post('public/claim')
  @HttpCode(HttpStatus.CREATED)
  claim(@Body() dto: ClaimDto, @Req() req: any) {
    const ip = clientIp(req);
    if (!publicClaimLimiter.allow(`claim:${ip}`)) {
      rateLimited('Too many claim attempts');
    }
    return this.referrals.claimReferral(dto);
  }
}
