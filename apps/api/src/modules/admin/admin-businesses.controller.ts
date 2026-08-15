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
import { AdminBusinessesService } from './admin-businesses.service';

@Controller('admin/businesses')
@UseGuards(AdminGuard)
export class AdminBusinessesController {
  constructor(private readonly businesses: AdminBusinessesService) {}

  @Get()
  @AdminPermission('businesses:view')
  list(
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.businesses.list({ status, plan, search, sort, page, pageSize });
  }

  @Get(':id')
  @AdminPermission('businesses:view')
  detail(@Param('id') id: string) {
    return this.businesses.detail(id);
  }

  @Patch(':id/plan')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('businesses:manage', 'subscriptions:manage')
  changePlan(
    @Param('id') id: string,
    @Body() dto: { plan: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.plan) throw new BadRequestException('plan is required');
    return this.businesses.changePlan(user, id, dto.plan);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('businesses:manage')
  setStatus(
    @Param('id') id: string,
    @Body() dto: { status: string; note?: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.status) throw new BadRequestException('status is required');
    return this.businesses.setStatus(user, id, dto.status, dto.note);
  }

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @AdminPermission('businesses:manage')
  addNote(
    @Param('id') id: string,
    @Body() dto: { note: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.note?.trim()) throw new BadRequestException('note is required');
    return this.businesses.addNote(user, id, dto.note);
  }
}