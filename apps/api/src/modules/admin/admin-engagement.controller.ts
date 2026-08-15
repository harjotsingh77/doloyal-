import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminEngagementService } from './admin-engagement.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminEngagementController {
  constructor(private readonly engagement: AdminEngagementService) {}

  @Get('customers')
  @AdminPermission('customers:view')
  customers(
    @Query('search') search?: string,
    @Query('businessId') businessId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.engagement.listCustomers({ search, businessId, page, pageSize });
  }

  @Get('bookings/overview')
  @AdminPermission('bookings:view')
  bookingsOverview() {
    return this.engagement.bookingsOverview();
  }

  @Get('bookings')
  @AdminPermission('bookings:view')
  bookings(
    @Query('status') status?: string,
    @Query('businessId') businessId?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.engagement.listBookings({ status, businessId, date, page, pageSize });
  }

  @Get('loyalty/overview')
  @AdminPermission('engagement:view')
  loyalty() {
    return this.engagement.loyaltyOverview();
  }

  @Get('rewards/overview')
  @AdminPermission('engagement:view')
  rewards() {
    return this.engagement.rewardsOverview();
  }

  @Get('memberships/overview')
  @AdminPermission('engagement:view')
  memberships() {
    return this.engagement.membershipsOverview();
  }

  @Get('campaigns/overview')
  @AdminPermission('engagement:view')
  campaigns() {
    return this.engagement.campaignsOverview();
  }
}