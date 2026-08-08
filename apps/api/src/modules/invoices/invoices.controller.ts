import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { IsString, IsOptional, IsArray, IsNumber, Min, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class InvoiceItemDto {
  @IsString() @IsNotEmpty() serviceName: string;
  @IsNumber() @Min(1) quantity: number;
  @IsNumber() @Min(0) unitPrice: number;
}

class CreateInvoiceDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceItemDto) items: InvoiceItemDto[];
  @IsNumber() @IsOptional() discount?: number;
  @IsNumber() @IsOptional() taxRate?: number;
  @IsString() @IsOptional() paymentMethod?: string;
}

class ListQueryDto {
  @IsString() @IsOptional() customerId?: string;
  @IsString() @IsOptional() status?: string;
}

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(@Query() query: ListQueryDto, @CurrentUser() user: any) {
    return this.invoicesService.list(user.activeTenantId, query);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.invoicesService.getById(user.activeTenantId, id);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: any) {
    return this.invoicesService.create(user.activeTenantId, dto);
  }
}
