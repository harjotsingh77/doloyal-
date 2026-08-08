import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsIn,
  MaxLength,
} from 'class-validator';
import { WebsiteConnectionsService } from './website-connections.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';

const FRAMEWORKS = [
  'HTML',
  'PHP',
  'REACT',
  'NEXTJS',
  'VUE',
  'LARAVEL',
  'WORDPRESS',
  'SHOPIFY',
  'ANGULAR',
  'NODE',
  'EXPRESS',
  'CUSTOM',
] as const;

class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  websiteUrl!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(FRAMEWORKS)
  framework!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  businessName?: string;
}

class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  websiteUrl?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

@Controller('website-connections')
@Roles('OWNER', 'MANAGER')
export class WebsiteConnectionsController {
  constructor(private readonly service: WebsiteConnectionsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user.activeTenantId);
  }

  @Get('api-keys')
  listApiKeys(@CurrentUser() user: any) {
    return this.service.listApiKeys(user.activeTenantId);
  }

  @Get('webhooks')
  listWebhooks(@CurrentUser() user: any) {
    return this.service.listWebhooks(user.activeTenantId);
  }

  @Get('logs')
  listLogs(
    @CurrentUser() user: any,
    @Query('websiteId') websiteId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listLogs(
      user.activeTenantId,
      websiteId,
      limit ? Number(limit) : 50,
    );
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getById(user.activeTenantId, id);
  }

  @Get(':id/settings')
  getSettings(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getSettings(user.activeTenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateConnectionDto, @CurrentUser() user: any) {
    return this.service.create(user.activeTenantId, dto);
  }

  @Post(':id/disconnect')
  disconnect(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.disconnect(user.activeTenantId, id);
  }

  @Post(':id/reconnect')
  reconnect(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.reconnect(user.activeTenantId, id);
  }

  @Patch(':id/settings')
  updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateSettings(user.activeTenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.delete(user.activeTenantId, id);
  }
}
