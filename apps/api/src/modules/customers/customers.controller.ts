import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsNotEmpty,
  IsIn,
  IsEmail,
  MaxLength,
} from 'class-validator';
import type { FastifyRequest, FastifyReply } from 'fastify';

class ListCustomersQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  band?: string;

  @IsString()
  @IsOptional()
  churnRisk?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  cursor?: string;
}

class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(40)
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsIn(['ACTIVE', 'AT_RISK', 'INACTIVE', 'CHURNED'])
  @IsOptional()
  status?: 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'CHURNED';
}

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(
    @Query() query: ListCustomersQuery,
    @CurrentUser() user: any,
  ) {
    return this.customersService.list(user.activeTenantId, query);
  }

  @Get('export')
  async export(
    @CurrentUser() user: any,
    @Res() reply: FastifyReply,
  ) {
    const { buffer, filename } = await this.customersService.exportToExcel(
      user.activeTenantId,
    );
    reply
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async import(
    @Req() req: FastifyRequest & { file: () => Promise<any> },
    @CurrentUser() user: any,
  ) {
    const file = await req.file();
    if (!file) {
      throw new BadRequestException('Please select an Excel file to import');
    }

    const filename = file.filename || '';
    const buffer = await file.toBuffer();
    return this.customersService.importFromExcel(
      user.activeTenantId,
      buffer,
      filename,
    );
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.customersService.getById(user.activeTenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.create(user.activeTenantId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.update(user.activeTenantId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.customersService.softDelete(user.activeTenantId, id);
  }
}
