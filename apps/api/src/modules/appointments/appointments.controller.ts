import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

class CreateAppointmentDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsOptional() staffId?: string;
  @IsString() @IsNotEmpty() serviceName: string;
  @IsString() @IsNotEmpty() startTime: string;
  @IsString() @IsNotEmpty() endTime: string;
  @IsString() @IsOptional() notes?: string;
}

class UpdateStatusDto {
  @IsString() @IsNotEmpty() status: string;
  @IsString() @IsOptional() startTime?: string;
  @IsString() @IsOptional() endTime?: string;
}

class ListQueryDto {
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() from?: string;
  @IsString() @IsOptional() to?: string;
}

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  list(@Query() query: ListQueryDto, @CurrentUser() user: any) {
    return this.appointmentsService.list(user.activeTenantId, query);
  }

  @Get('today')
  getToday(@CurrentUser() user: any) {
    return this.appointmentsService.getToday(user.activeTenantId);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: any) {
    return this.appointmentsService.create(user.activeTenantId, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: any) {
    return this.appointmentsService.updateStatus(user.activeTenantId, id, dto.status, {
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
  }
}
