import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { OrdersService } from './orders.service';

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'] as const;
const PAYMENTS = ['PAID', 'PENDING', 'PARTIALLY_PAID', 'REFUNDED'] as const;

class ListOrdersQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsIn(['ALL', ...STATUSES])
  @IsOptional()
  status?: 'ALL' | (typeof STATUSES)[number];

  @IsIn(['ALL', ...PAYMENTS])
  @IsOptional()
  paymentStatus?: 'ALL' | (typeof PAYMENTS)[number];

  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  to?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

class OrderBodyDto {
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number;

  @IsIn(STATUSES)
  @IsOptional()
  status?: (typeof STATUSES)[number];

  @IsIn(PAYMENTS)
  @IsOptional()
  paymentStatus?: (typeof PAYMENTS)[number];

  @IsString()
  @IsOptional()
  orderDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string | null;

  @IsString()
  @IsOptional()
  assignedStaffId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  assignedStaffName?: string | null;
}

class CreateOrderDto extends OrderBodyDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders/summary')
  summary(@CurrentUser() user: { activeTenantId: string }) {
    return this.orders.summary(user.activeTenantId);
  }

  @Get('orders')
  list(@CurrentUser() user: { activeTenantId: string }, @Query() query: ListOrdersQuery) {
    return this.orders.list(user.activeTenantId, query);
  }

  @Get('orders/:id')
  getById(@CurrentUser() user: { activeTenantId: string }, @Param('id') id: string) {
    return this.orders.getById(user.activeTenantId, id);
  }

  @Post('orders')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: { activeTenantId: string }, @Body() body: CreateOrderDto) {
    return this.orders.create(user.activeTenantId, body);
  }

  @Patch('orders/:id')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  update(
    @CurrentUser() user: { activeTenantId: string },
    @Param('id') id: string,
    @Body() body: OrderBodyDto,
  ) {
    return this.orders.update(user.activeTenantId, id, body);
  }

  @Delete('orders/:id')
  @Roles('OWNER', 'MANAGER')
  remove(@CurrentUser() user: { activeTenantId: string }, @Param('id') id: string) {
    return this.orders.remove(user.activeTenantId, id);
  }
}
