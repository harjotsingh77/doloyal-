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
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { ProductsService } from './products.service';

class ListProductsQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsIn(['ALL', 'ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';

  @IsIn(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'])
  @IsOptional()
  stock?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

  @IsIn(['name', 'sku', 'category', 'price', 'stock', 'status', 'updatedAt'])
  @IsOptional()
  sort?: 'name' | 'sku' | 'category' | 'price' | 'stock' | 'status' | 'updatedAt';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc';

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

class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

class ProductBodyDto {
  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  sku?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  originalPrice?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  productCode?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string | null;

  @IsIn(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';

  @IsIn(['IN_STOCK', 'OUT_OF_STOCK'])
  @IsOptional()
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK';
}

class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  originalPrice?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  productCode?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string | null;

  @IsIn(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';

  @IsIn(['IN_STOCK', 'OUT_OF_STOCK'])
  @IsOptional()
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK';
}

class StatusDto {
  @IsIn(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}

@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('products/summary')
  summary(@CurrentUser() user: { activeTenantId: string }) {
    return this.products.summary(user.activeTenantId);
  }

  @Get('products/categories')
  listCategories(@CurrentUser() user: { activeTenantId: string }) {
    return this.products.listCategories(user.activeTenantId);
  }

  @Post('products/categories')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  @HttpCode(HttpStatus.CREATED)
  createCategory(
    @CurrentUser() user: { activeTenantId: string },
    @Body() body: CreateCategoryDto,
  ) {
    return this.products.createCategory(user.activeTenantId, body);
  }

  @Get('products')
  list(@CurrentUser() user: { activeTenantId: string }, @Query() query: ListProductsQuery) {
    return this.products.list(user.activeTenantId, query);
  }

  @Get('products/:id')
  getById(@CurrentUser() user: { activeTenantId: string }, @Param('id') id: string) {
    return this.products.getById(user.activeTenantId, id);
  }

  @Post('products')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: { activeTenantId: string }, @Body() body: CreateProductDto) {
    return this.products.create(user.activeTenantId, body);
  }

  @Patch('products/:id')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  update(
    @CurrentUser() user: { activeTenantId: string },
    @Param('id') id: string,
    @Body() body: ProductBodyDto,
  ) {
    return this.products.update(user.activeTenantId, id, body);
  }

  @Post('products/:id/duplicate')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  @HttpCode(HttpStatus.CREATED)
  duplicate(@CurrentUser() user: { activeTenantId: string }, @Param('id') id: string) {
    return this.products.duplicate(user.activeTenantId, id);
  }

  @Post('products/:id/status')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  changeStatus(
    @CurrentUser() user: { activeTenantId: string },
    @Param('id') id: string,
    @Body() body: StatusDto,
  ) {
    return this.products.changeStatus(user.activeTenantId, id, body.status);
  }

  @Post('products/:id/image')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  async uploadImage(
    @CurrentUser() user: { activeTenantId: string },
    @Param('id') id: string,
    @Req() req: FastifyRequest & { file?: () => Promise<any> },
  ) {
    const file = await req.file?.();
    if (!file) throw new BadRequestException('No image uploaded');
    const buffer = await file.toBuffer();
    return this.products.setImage(
      user.activeTenantId,
      id,
      buffer,
      file.mimetype,
      file.filename || 'upload.png',
    );
  }

  @Delete('products/:id')
  @Roles('OWNER', 'MANAGER')
  remove(@CurrentUser() user: { activeTenantId: string }, @Param('id') id: string) {
    return this.products.remove(user.activeTenantId, id);
  }
}
