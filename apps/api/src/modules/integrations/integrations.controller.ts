import { Controller, Get, Post, Patch, Param, Body, Query, Headers, Req, Res, BadRequestException } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { IntegrationsService } from './integrations.service';
import { WhatsAppIntegrationService } from './services/whatsapp.service';
import { EmailService } from './services/email.service';
import { ResendIntegrationService } from './services/resend.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../../common/roles.decorator';
import { RateLimit } from '../../common/rate-limit.guard';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsIn, MaxLength, ArrayMaxSize, Matches } from 'class-validator';
import { INTEGRATION_DEFINITIONS } from './integration-definitions';

class ConnectIntegrationDto {
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsOptional() apiKey?: string;
  @IsString() @IsOptional() apiSecret?: string;
  @IsString() @IsOptional() accessToken?: string;
  @IsString() @IsOptional() refreshToken?: string;
  @IsString() @IsOptional() label?: string;
  @IsOptional() metadata?: Record<string, unknown>;
  @IsString() @IsOptional() webhookSecret?: string;
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

class WhatsAppSendDto {
  @IsString() @IsNotEmpty() customerId: string;
  @IsIn(['text', 'template']) @IsOptional() messageType?: 'text' | 'template';
  @IsString() @MaxLength(4096) @IsOptional() body?: string;
  @IsString() @MaxLength(512) @IsOptional() templateName?: string;
  @IsString() @MaxLength(20) @IsOptional() templateLanguage?: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(1024, { each: true }) @IsOptional()
  templateParams?: string[];
  @IsBoolean() @IsOptional() demo?: boolean;
}

class WhatsAppEmbeddedSignupDto {
  @IsString() @IsNotEmpty() @MaxLength(2048) state: string;
  @IsString() @IsNotEmpty() @MaxLength(2048) code: string;
  @IsString() @IsNotEmpty() @MaxLength(32) phoneNumberId: string;
  @IsString() @IsNotEmpty() @MaxLength(32) wabaId: string;
  @IsString() @IsOptional() @MaxLength(32) businessId?: string;
  @IsOptional() @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits.' }) pin?: string;
}

class WhatsAppRegisterPhoneDto {
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits.' }) pin: string;
}

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly emailService: EmailService,
    private readonly resendService: ResendIntegrationService,
    private readonly whatsappService: WhatsAppIntegrationService,
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
      hasEmbeddedSignup: Boolean(d.hasEmbeddedSignup),
      hasWebhook: d.hasWebhook,
      supportsSync: d.supportsSync,
    }));
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.integrationsService.list(user.activeTenantId);
  }

  @Get('whatsapp/status')
  async whatsappStatus(@CurrentUser() user: any) {
    return this.whatsappService.getConnectionSummary(user.activeTenantId);
  }

  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  @Get('whatsapp/templates')
  async whatsappTemplates(@CurrentUser() user: any) {
    const result = await this.whatsappService.fetchTemplates(user.activeTenantId);
    if (!result.ok) {
      throw new BadRequestException(result.error || 'Could not load WhatsApp templates.');
    }
    return { templates: result.templates || [] };
  }

  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  @RateLimit(20, 60)
  @Post('whatsapp/send')
  async sendWhatsAppMessage(@Body() dto: WhatsAppSendDto, @CurrentUser() user: any) {
    const result = await this.whatsappService.sendToCustomer(user.activeTenantId, dto.customerId, {
      messageType: dto.messageType === 'template' ? 'template' : 'text',
      body: dto.body,
      templateName: dto.templateName,
      templateLanguage: dto.templateLanguage,
      templateParams: Array.isArray(dto.templateParams) ? dto.templateParams : undefined,
      demo: dto.demo,
      sentByUserId: user.id,
    });
    if (!result.ok) {
      throw new BadRequestException(
        result.error ||
          'WhatsApp message could not be sent. Please check your WhatsApp Business connection and permissions.',
      );
    }
    return result;
  }

  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST')
  @Get('whatsapp/messages/:notificationId')
  async whatsappMessageStatus(@Param('notificationId') notificationId: string, @CurrentUser() user: any) {
    return this.whatsappService.getMessageStatus(user.activeTenantId, notificationId);
  }

  @Roles('OWNER', 'MANAGER')
  @RateLimit(10, 60)
  @Post('whatsapp/embedded-signup/start')
  async startWhatsAppEmbeddedSignup(@CurrentUser() user: any) {
    return this.integrationsService.startWhatsAppEmbeddedSignup(user.activeTenantId, user.id);
  }

  @Roles('OWNER', 'MANAGER')
  @RateLimit(5, 60)
  @Post('whatsapp/register-phone')
  async registerWhatsAppPhone(@Body() dto: WhatsAppRegisterPhoneDto, @CurrentUser() user: any) {
    return this.whatsappService.registerConnectedPhone(user.activeTenantId, dto.pin);
  }

  @Roles('OWNER', 'MANAGER')
  @RateLimit(10, 60)
  @Post('whatsapp/embedded-signup')
  async completeWhatsAppEmbeddedSignup(
    @Body() dto: WhatsAppEmbeddedSignupDto,
    @CurrentUser() user: any,
  ) {
    return this.integrationsService.completeWhatsAppEmbeddedSignup(
      user.activeTenantId,
      user.id,
      {
        state: dto.state,
        code: dto.code,
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        businessId: dto.businessId,
        pin: dto.pin,
      },
    );
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
      webhookSecret: dto.webhookSecret,
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
  @Get('webhook/:type')
  async verifyWebhook(
    @Param('type') type: string,
    @Query() query: Record<string, string>,
    @Res() res: FastifyReply,
  ) {
    // Meta Cloud API handshake: echo hub.challenge when the token matches.
    if (type.toUpperCase() === 'WHATSAPP') {
      const candidates = new Set<string>();
      if (process.env.META_WEBHOOK_VERIFY_TOKEN) {
        candidates.add(process.env.META_WEBHOOK_VERIFY_TOKEN);
      }
      const rows = await this.integrationsService.getWebhookSecretsForType('WHATSAPP');
      for (const secret of rows) candidates.add(secret);
      for (const candidate of candidates) {
        const challenge = WhatsAppIntegrationService.verifyWebhookHandshake(query, candidate);
        if (challenge !== null) {
          return res.type('text/plain').send(challenge);
        }
      }
      return res.status(403).send('Forbidden');
    }
    return res.status(404).send('Not Found');
  }

  @Public()
  @Post('webhook/:type')
  async handleWebhook(
    @Param('type') type: string,
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers() headers: any,
    @Body() body: any,
  ) {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : '';
    return this.integrationsService.handleWebhook(type.toUpperCase(), headers, raw, body);
  }
}
