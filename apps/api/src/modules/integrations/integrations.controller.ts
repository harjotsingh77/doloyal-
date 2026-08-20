import { Controller, Get, Post, Patch, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { EmailService } from './services/email.service';
import { ResendIntegrationService } from './services/resend.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../../common/roles.decorator';
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

class ResendTestEmailDto {
  @IsString() @IsOptional() to?: string;
}

class ResendCreateDomainDto {
  @IsString() @IsNotEmpty() domain: string;
  @IsString() @IsOptional() region?: string;
}

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly emailService: EmailService,
    private readonly resendService: ResendIntegrationService,
  ) {}

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

  @Roles('OWNER', 'MANAGER')
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

  @Roles('OWNER', 'MANAGER')
  @Post(':type/disconnect')
  async disconnect(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.disconnect(user.activeTenantId, type.toUpperCase());
  }

  @Roles('OWNER', 'MANAGER')
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

  @Roles('OWNER', 'MANAGER')
  @Post(':type/sync')
  async sync(@Param('type') type: string, @CurrentUser() user: any) {
    return this.integrationsService.sync(user.activeTenantId, type.toUpperCase());
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':type/config')
  updateConfig(@Param('type') type: string, @Body() dto: UpdateConfigDto, @CurrentUser() user: any) {
    return this.integrationsService.updateConfig(user.activeTenantId, type.toUpperCase(), dto.config);
  }

  @Roles('OWNER', 'MANAGER')
  @Post('oauth/:type/url')
  getOAuthUrl(@Param('type') type: string, @Query('redirect_uri') redirectUri: string | undefined, @CurrentUser() user: any) {
    return this.integrationsService.getOAuthUrl(type.toUpperCase(), redirectUri, user);
  }

  @Roles('OWNER', 'MANAGER')
  @Post('oauth/:type/callback')
  async handleOAuthCallback(
    @Param('type') type: string,
    @Body() body: { code: string; state?: string; redirect_uri?: string },
    @CurrentUser() user: any,
  ) {
    return this.integrationsService.handleOAuthCallback(
      user.activeTenantId,
      user.id,
      type.toUpperCase(),
      body.code,
      body.state,
      body.redirect_uri,
    );
  }

  @Roles('OWNER', 'MANAGER')
  @Post('resend/test-email')
  async sendResendTestEmail(@Body() dto: ResendTestEmailDto, @CurrentUser() user: any) {
    const integration = await this.integrationsService.get(user.activeTenantId, 'RESEND');
    if (!integration || !integration.connected) {
      throw new BadRequestException('Resend is not connected. Connect Resend before sending a test email.');
    }
    const to = dto.to || user.email;
    if (!to) throw new BadRequestException('A recipient email is required.');

    const result = await this.emailService.sendBusinessEmail({
      tenantId: user.activeTenantId,
      to,
      subject: 'Doloyal test email',
      text: 'This is a test email from Doloyal, sent through your connected Resend account.',
      notificationType: 'TEST',
    });

    if (result.status === 'FAILED') {
      throw new BadRequestException(`Test email failed to send: ${result.error}`);
    }
    return { success: true, message: `Test email sent to ${to}`, providerMessageId: result.providerMessageId };
  }

  @Roles('OWNER', 'MANAGER')
  @Get('resend/domains')
  async listResendDomains(@CurrentUser() user: any) {
    return this.resendService.listDomains(user.activeTenantId);
  }

  @Roles('OWNER', 'MANAGER')
  @Post('resend/domains')
  async createResendDomain(@Body() dto: ResendCreateDomainDto, @CurrentUser() user: any) {
    return this.resendService.createDomain(user.activeTenantId, dto.domain, dto.region);
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
