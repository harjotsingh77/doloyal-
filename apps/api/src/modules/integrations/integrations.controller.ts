import { Controller, Get, Post, Patch, Param, Body, Query, Headers } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { INTEGRATION_DEFINITIONS } from './integration-definitions';

class ConnectIntegrationDto {
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsOptional() apiKey?: string;
  @IsString() @IsOptional() apiSecret?: string;
  @IsString() @IsOptional() accessToken?: string;
  @IsString() @IsOptional() refreshToken?: string;
  @IsString() @IsOptional() label?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

class UpdateConfigDto {
  @IsNotEmpty() config: Record<string, unknown>;
}

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('providers')
  listProviders() {
    return INTEGRATION_DEFINITIONS.map(d => ({
      type: d.type,
      name: d.name,
      description: d.description,
      category: d.category,
      icon: d.icon,
      docsUrl: d.docsUrl,
      hasApiKey: d.hasApiKey,
      hasApiSecret: d.hasApiSecret,
      hasOAuth: d.hasOAuth,
      hasWebhook: d.hasWebhook,
      supportsSync: d.supportsSync,
    }));
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.integrationsService.list(user.activeTenantId);
  }

  @Get(':type')
  get(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.get(user.activeTenantId, type.toUpperCase());
  }

  @Get(':type/config')
  getConfig(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.getConfig(user.activeTenantId, type.toUpperCase());
  }

  @Get(':type/sync-logs')
  getSyncLogs(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.getSyncLogs(user.activeTenantId, type.toUpperCase());
  }

  @Get(':type/webhook-events')
  getWebhookEvents(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.getWebhookEvents(user.activeTenantId, type.toUpperCase());
  }

  @Post('connect')
  async connect(@Body() dto: ConnectIntegrationDto, @CurrentUser() user: any) {
    const type = dto.type.toUpperCase();
    return this.integrationsService.connect(user.activeTenantId, type, user.id, {
      apiKey: dto.apiKey,
      apiSecret: dto.apiSecret,
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
      label: dto.label,
      metadata: dto.metadata,
    });
  }

  @Post(':type/disconnect')
  async disconnect(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.disconnect(user.activeTenantId, type.toUpperCase());
  }

  @Post(':type/reconnect')
  async reconnect(@Param('type') type: string, @Body() dto: ConnectIntegrationDto, @CurrentUser() user: any) {
    return this.integrationsService.reconnect(user.activeTenantId, type.toUpperCase(), user.id, {
      apiKey: dto.apiKey,
      apiSecret: dto.apiSecret,
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
    });
  }

  @Post(':type/test')
  async testConnection(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.testConnection(user.activeTenantId, type.toUpperCase());
  }

  @Post(':type/sync')
  async sync(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.sync(user.activeTenantId, type.toUpperCase());
  }

  @Patch(':type/config')
  updateConfig(@Param('type') type: string, @Body() dto: UpdateConfigDto, @CurrentUser() user: any) {
    return this.integrationsService.updateConfig(user.activeTenantId, type.toUpperCase(), dto.config);
  }

  @Post('oauth/:type/url')
  getOAuthUrl(@Param('type') type: string, @Query('redirect_uri') redirectUri: string) {
    return this.integrationsService.getOAuthUrl(type.toUpperCase(), redirectUri || 'http://localhost:3000/app/integrations/callback');
  }

  @Post('oauth/:type/callback')
  async handleOAuthCallback(
    @Param('type') type: string,
    @Body() body: { code: string; redirect_uri?: string },
  ) {
    return this.integrationsService.handleOAuthCallback(
      type.toUpperCase(),
      body.code,
      body.redirect_uri || 'http://localhost:3000/app/integrations/callback',
    );
  }

  @Public()
  @Post('webhook/:type')
  async handleWebhook(
    @Param('type') type: string,
    @Headers() headers: any,
    @Body() body: any,
  ) {
    return this.integrationsService.handleWebhook(type.toUpperCase(), headers, body);
  }
}
