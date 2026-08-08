import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
} from '@nestjs/common';
import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsNumber, IsArray, IsObject } from 'class-validator';
import { BookingLinksService } from './booking-links.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { BookingAnalyticsService } from './booking-analytics.service';
import { BookingOrchestratorService } from './booking-orchestrator.service';
import { AiSchedulingService } from './ai-scheduling.service';
import { CurrentUser } from '../../common/current-user.decorator';
import * as crypto from 'crypto';

class CreateBookingLinkDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() slug?: string;
  @IsString() @IsOptional() type?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsBoolean() @IsOptional() allowCustomTime?: boolean;
  @IsString() @IsOptional() staffId?: string;
  @IsArray() @IsOptional() staffIds?: string[];
  @IsString() @IsOptional() assignmentMode?: string;
  @IsArray() @IsOptional() serviceIds?: string[];
  @IsObject() @IsOptional() customerFields?: any;
  @IsObject() @IsOptional() rules?: any;
  @IsObject() @IsOptional() payment?: any;
  @IsObject() @IsOptional() loyalty?: any;
  @IsObject() @IsOptional() membershipAccess?: any;
  @IsObject() @IsOptional() authMode?: any;
  @IsObject() @IsOptional() branding?: any;
  @IsObject() @IsOptional() automations?: any;
  @IsObject() @IsOptional() pageConfig?: any;
  @IsObject() @IsOptional() seo?: any;
  @IsObject() @IsOptional() domain?: any;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() confirmationMessage?: string;
  @IsString() @IsOptional() redirectUrl?: string;
  @IsString() @IsOptional() webhookUrl?: string;
  @IsString() @IsOptional() metaTitle?: string;
  @IsString() @IsOptional() metaDescription?: string;
  @IsString() @IsOptional() expiresAt?: string;
}

class UpdateBookingLinkDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() slug?: string;
  @IsString() @IsOptional() type?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsBoolean() @IsOptional() isPaused?: boolean;
  @IsBoolean() @IsOptional() allowCustomTime?: boolean;
  @IsString() @IsOptional() staffId?: string;
  @IsArray() @IsOptional() staffIds?: string[];
  @IsString() @IsOptional() assignmentMode?: string;
  @IsArray() @IsOptional() serviceIds?: string[];
  @IsObject() @IsOptional() customerFields?: any;
  @IsObject() @IsOptional() rules?: any;
  @IsObject() @IsOptional() payment?: any;
  @IsObject() @IsOptional() loyalty?: any;
  @IsObject() @IsOptional() membershipAccess?: any;
  @IsObject() @IsOptional() authMode?: any;
  @IsObject() @IsOptional() branding?: any;
  @IsObject() @IsOptional() automations?: any;
  @IsObject() @IsOptional() pageConfig?: any;
  @IsObject() @IsOptional() seo?: any;
  @IsObject() @IsOptional() domain?: any;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() confirmationMessage?: string;
  @IsString() @IsOptional() redirectUrl?: string;
  @IsString() @IsOptional() webhookUrl?: string;
  @IsString() @IsOptional() metaTitle?: string;
  @IsString() @IsOptional() metaDescription?: string;
  @IsString() @IsOptional() expiresAt?: string;
}

class CreatePublicBookingDto {
  @IsString() @IsNotEmpty() serviceId: string;
  @IsString() @IsOptional() staffId?: string;
  @IsString() @IsNotEmpty() startTime: string;
  @IsString() @IsOptional() customerName?: string;
  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() lastName?: string;
  @IsString() @IsOptional() customerPhone?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() customerEmail?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() birthday?: string;
  @IsString() @IsOptional() gender?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() referralSource?: string;
  @IsString() @IsOptional() promoCode?: string;
  @IsNumber() @IsOptional() redeemPoints?: number;
  @IsString() @IsOptional() paymentMethod?: string;
  @IsString() @IsOptional() honeypot?: string;
  @IsString() @IsOptional() customerToken?: string;
}

class TrackVisitDto {
  @IsString() @IsOptional() source?: string;
  @IsString() @IsOptional() referrer?: string;
  @IsString() @IsOptional() sessionId?: string;
}

class SendNotificationDto {
  @IsString() @IsNotEmpty() appointmentId: string;
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsNotEmpty() channel: string;
}

class CreateTemplateDto {
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsNotEmpty() channel: string;
  @IsString() @IsOptional() subject?: string;
  @IsString() @IsNotEmpty() body: string;
}

class UpdateAvailabilityDto {
  @IsOptional() monday?: any;
  @IsOptional() tuesday?: any;
  @IsOptional() wednesday?: any;
  @IsOptional() thursday?: any;
  @IsOptional() friday?: any;
  @IsOptional() saturday?: any;
  @IsOptional() sunday?: any;
  @IsNumber() @IsOptional() slotIntervalMinutes?: number;
}

class AddBlockDateDto {
  @IsString() @IsNotEmpty() date: string;
  @IsString() @IsOptional() reason?: string;
}

class UpdateWidgetSettingsDto {
  @IsString() @IsOptional() primaryColor?: string;
  @IsString() @IsOptional() fontFamily?: string;
  @IsString() @IsOptional() borderRadius?: string;
  @IsBoolean() @IsOptional() showStaff?: boolean;
  @IsBoolean() @IsOptional() showServices?: boolean;
  @IsBoolean() @IsOptional() showDuration?: boolean;
  @IsBoolean() @IsOptional() showPrice?: boolean;
  @IsString() @IsOptional() customCss?: string;
  @IsString() @IsOptional() greeting?: string;
}

class UpdateAppointmentDto {
  @IsString() @IsOptional() customerId?: string;
  @IsString() @IsOptional() staffId?: string;
  @IsString() @IsOptional() serviceName?: string;
  @IsString() @IsOptional() startTime?: string;
  @IsString() @IsOptional() endTime?: string;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() paymentStatus?: string;
}

class AnalyticsQueryDto {
  @IsString() @IsOptional() from?: string;
  @IsString() @IsOptional() to?: string;
}

class AiSuggestSlotDto {
  @IsString() @IsNotEmpty() serviceId: string;
  @IsString() @IsNotEmpty() date: string;
  @IsString() @IsOptional() staffId?: string;
  @IsString() @IsOptional() customerId?: string;
}

class AiDetectConflictsDto {
  @IsString() @IsNotEmpty() date: string;
  @IsString() @IsOptional() staffId?: string;
}

class AiPredictNoShowDto {
  @IsString() @IsNotEmpty() appointmentId: string;
}

class AiOptimizeScheduleDto {
  @IsString() @IsNotEmpty() date: string;
}

class ConfirmPaymentDto {
  @IsString() @IsNotEmpty() appointmentId: string;
  @IsString() @IsOptional() status?: string;
}

@Controller()
export class BookingLinksController {
  constructor(
    private readonly bookingLinksService: BookingLinksService,
    private readonly notificationsService: BookingNotificationsService,
    private readonly analyticsService: BookingAnalyticsService,
    private readonly aiSchedulingService: AiSchedulingService,
    private readonly orchestrator: BookingOrchestratorService,
  ) {}

  @Get('booking-links')
  listBookingLinks(@CurrentUser() user: any) {
    return this.bookingLinksService.list(user.activeTenantId);
  }

  @Post('booking-links')
  createBookingLink(@Body() dto: CreateBookingLinkDto, @CurrentUser() user: any) {
    return this.bookingLinksService.create(user.activeTenantId, dto);
  }

  @Get('booking-links/:id')
  getBookingLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.getById(user.activeTenantId, id);
  }

  @Patch('booking-links/:id')
  updateBookingLink(@Param('id') id: string, @Body() dto: UpdateBookingLinkDto, @CurrentUser() user: any) {
    return this.bookingLinksService.update(user.activeTenantId, id, dto);
  }

  @Get('booking-links/:id/settings')
  getSettings(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.getSettings(user.activeTenantId, id);
  }

  @Patch('booking-links/:id/settings')
  updateSettings(@Param('id') id: string, @Body() dto: UpdateBookingLinkDto, @CurrentUser() user: any) {
    return this.bookingLinksService.updateSettings(user.activeTenantId, id, dto);
  }

  @Get('booking-links/:id/analytics')
  getLinkAnalytics(
    @Param('id') id: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingLinksService.getLinkAnalytics(user.activeTenantId, id, query.from, query.to);
  }

  @Post('booking-links/:id/duplicate')
  duplicateBookingLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.duplicate(user.activeTenantId, id);
  }

  @Get('booking-links/:id/page')
  getBookingPage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.getPage(user.activeTenantId, id);
  }

  @Patch('booking-links/:id/page')
  updateBookingPage(@Param('id') id: string, @Body() dto: UpdateBookingLinkDto, @CurrentUser() user: any) {
    return this.bookingLinksService.updatePage(user.activeTenantId, id, dto);
  }

  @Post('booking-links/:id/publish')
  publishBookingLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.publish(user.activeTenantId, id);
  }

  @Delete('booking-links/:id')
  deleteBookingLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.delete(user.activeTenantId, id);
  }

  @Post('booking-links/:id/regenerate')
  regenerateBookingLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.regenerate(user.activeTenantId, id);
  }

  @Get('public/book/:slug')
  getPublicBusinessInfo(@Param('slug') slug: string) {
    return this.bookingLinksService.getPublicBusinessInfo(slug);
  }

  @Get('public/book/:slug/services')
  getPublicServices(@Param('slug') slug: string) {
    return this.bookingLinksService.getPublicServices(slug);
  }

  @Get('public/book/:slug/staff')
  getPublicStaff(@Param('slug') slug: string) {
    return this.bookingLinksService.getPublicStaff(slug);
  }

  @Get('public/book/:slug/slots')
  getPublicSlots(
    @Param('slug') slug: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.bookingLinksService.getAvailableSlots(slug, date, serviceId, staffId);
  }

  @Post('public/book/:slug/visit')
  trackVisit(
    @Param('slug') slug: string,
    @Body() dto: TrackVisitDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwarded?: string,
  ) {
    const ip = (forwarded || '').split(',')[0]?.trim() || 'local';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    return this.bookingLinksService.trackVisit(slug, {
      source: dto.source,
      referrer: dto.referrer,
      userAgent,
      ipHash,
      sessionId: dto.sessionId,
    });
  }

  @Post('public/book/:slug')
  createPublicBooking(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicBookingDto,
    @Headers('x-forwarded-for') forwarded?: string,
  ) {
    const ip = (forwarded || '').split(',')[0]?.trim() || 'local';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    return this.orchestrator.book(slug, dto, { ipHash });
  }

  @Post('public/book/:slug/confirm-payment')
  confirmPublicPayment(@Param('slug') slug: string, @Body() dto: ConfirmPaymentDto) {
    return this.bookingLinksService.findBySlug(slug).then(({ tenant }) =>
      this.orchestrator.confirmPayment(tenant.id, dto.appointmentId, (dto.status as any) || 'PAID'),
    );
  }

  @Get('public/book/:slug/confirm/:bookingId')
  getPublicBookingConfirmation(@Param('slug') slug: string, @Param('bookingId') bookingId: string) {
    return this.bookingLinksService.getBookingConfirmation(slug, bookingId);
  }

  @Get('notifications')
  listNotifications(@CurrentUser() user: any) {
    return this.notificationsService.list(user.activeTenantId);
  }

  @Post('notifications/send')
  sendNotification(@Body() dto: SendNotificationDto, @CurrentUser() user: any) {
    return this.notificationsService.send(dto.appointmentId, dto.type, dto.channel);
  }

  @Get('notifications/templates')
  listNotificationTemplates(@CurrentUser() user: any) {
    return this.notificationsService.listTemplates(user.activeTenantId);
  }

  @Post('notifications/templates')
  createNotificationTemplate(@Body() dto: CreateTemplateDto, @CurrentUser() user: any) {
    return this.notificationsService.upsertTemplate(user.activeTenantId, dto);
  }

  @Delete('notifications/templates/:id')
  deleteNotificationTemplate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.deleteTemplate(user.activeTenantId, id);
  }

  @Get('availability')
  getAvailability(@CurrentUser() user: any) {
    return this.bookingLinksService.getAvailability(user.activeTenantId);
  }

  @Put('availability')
  updateAvailability(@Body() dto: UpdateAvailabilityDto, @CurrentUser() user: any) {
    return this.bookingLinksService.updateAvailability(user.activeTenantId, dto);
  }

  @Post('availability/block-dates')
  addBlockDate(@Body() dto: AddBlockDateDto, @CurrentUser() user: any) {
    return this.bookingLinksService.addBlockDate(user.activeTenantId, dto);
  }

  @Delete('availability/block-dates/:id')
  removeBlockDate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.removeBlockDate(user.activeTenantId, id);
  }

  @Get('availability/block-dates')
  listBlockDates(@CurrentUser() user: any) {
    return this.bookingLinksService.listBlockDates(user.activeTenantId);
  }

  @Get('analytics/bookings')
  getBookingAnalytics(@Query() query: AnalyticsQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getAnalytics(user.activeTenantId, query.from, query.to);
  }

  @Post('ai/suggest-slot')
  suggestSlot(@Body() dto: AiSuggestSlotDto, @CurrentUser() user: any) {
    return this.aiSchedulingService.suggestBestSlot(user.activeTenantId, dto.serviceId, dto.date, dto.staffId, dto.customerId);
  }

  @Post('ai/detect-conflicts')
  detectConflicts(@Body() dto: AiDetectConflictsDto, @CurrentUser() user: any) {
    return this.aiSchedulingService.detectConflicts(user.activeTenantId, dto.date, dto.staffId);
  }

  @Post('ai/predict-no-show')
  predictNoShow(@Body() dto: AiPredictNoShowDto, @CurrentUser() user: any) {
    return this.aiSchedulingService.predictNoShow(user.activeTenantId, dto.appointmentId);
  }

  @Post('ai/optimize-schedule')
  optimizeSchedule(@Body() dto: AiOptimizeScheduleDto, @CurrentUser() user: any) {
    return this.aiSchedulingService.optimizeSchedule(user.activeTenantId, dto.date);
  }

  @Get('widget/settings')
  getWidgetSettings(@CurrentUser() user: any) {
    return this.bookingLinksService.getWidgetSettings(user.activeTenantId);
  }

  @Put('widget/settings')
  updateWidgetSettings(@Body() dto: UpdateWidgetSettingsDto, @CurrentUser() user: any) {
    return this.bookingLinksService.updateWidgetSettings(user.activeTenantId, dto);
  }

  @Get('widget/embed')
  getWidgetEmbed(@CurrentUser() user: any) {
    return this.bookingLinksService.getWidgetEmbed(user.activeTenantId);
  }

  @Patch('appointments/:id')
  updateAppointment(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @CurrentUser() user: any) {
    return this.bookingLinksService.updateAppointment(user.activeTenantId, id, dto);
  }

  @Delete('appointments/:id')
  deleteAppointment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.deleteAppointment(user.activeTenantId, id);
  }

  @Get('appointments/:id')
  getAppointmentDetail(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingLinksService.getAppointmentDetail(user.activeTenantId, id);
  }
}
