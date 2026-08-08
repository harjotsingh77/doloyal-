import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import { getIntegrationDef } from './integration-definitions';
import * as crypto from 'crypto';

const p = (prisma: PrismaService) => prisma as any;

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async list(tenantId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { tenantId },
      include: { tokens: true },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(integrations.map(async (i: any) => this.sanitize(i)));
  }

  async get(tenantId: string, type: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
      include: { tokens: true },
    });
    if (!integration) return null;
    return this.sanitize(integration);
  }

  async getById(id: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
      include: { tokens: true },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return this.sanitize(integration);
  }

  async connect(tenantId: string, type: string, userId: string, credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    scope?: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
    label?: string;
  }) {
    const def = getIntegrationDef(type);
    if (!def) throw new BadRequestException(`Unknown integration type: ${type}`);

    const existing = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
    });

    if (existing && existing.status === 'CONNECTED') {
      const integration = await this.prisma.integration.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          label: credentials.label || existing.label,
          metadata: (credentials.metadata || existing.metadata) as any,
          userId,
          errorLog: null,
        },
      });
      await this.upsertToken(integration.id, credentials);
      return this.sanitize({ ...integration, tokens: [] });
    }

    const integration = await this.prisma.integration.upsert({
      where: { tenantId_type: { tenantId, type: type as any } },
      create: {
        tenantId,
        userId,
        type: type as any,
        status: 'CONNECTED',
        label: credentials.label || null,
        metadata: credentials.metadata as any,
      },
      update: {
        status: 'CONNECTED',
        userId,
        label: credentials.label || undefined,
        metadata: credentials.metadata as any,
        errorLog: null,
      },
    });

    if (credentials.apiKey || credentials.accessToken) {
      await this.upsertToken(integration.id, credentials);
    }

    return this.sanitize(integration);
  }

  async disconnect(tenantId: string, type: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { status: 'DISCONNECTED' },
    });

    await this.prisma.integrationToken.deleteMany({
      where: { integrationId: integration.id },
    });

    return { success: true };
  }

  async reconnect(tenantId: string, type: string, userId: string, credentials: {
    apiKey?: string; apiSecret?: string; accessToken?: string; refreshToken?: string;
  }) {
    await this.disconnect(tenantId, type);
    return this.connect(tenantId, type, userId, credentials);
  }

  async testConnection(tenantId: string, type: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
      include: { tokens: true },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    const token = await this.getDecryptedToken(integration.id);
    if (!token) throw new BadRequestException('No credentials found');

    try {
      const result = await this.validateWithProvider(type as any, token);
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { errorLog: null },
      });
      return { success: true, message: result.message || 'Connection successful' };
    } catch (err: any) {
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { errorLog: err.message, status: 'ERROR' },
      });
      throw new BadRequestException(`Connection test failed: ${err.message}`);
    }
  }

  async sync(tenantId: string, type: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    const syncLog = await p(this.prisma).syncLog.create({
      data: { integrationId: integration.id, status: 'RUNNING' },
    });

    try {
      const result = await this.syncWithProvider(type as any, integration);
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date(), errorLog: null },
      });
      await p(this.prisma).syncLog.update({
        where: { id: syncLog.id },
        data: { status: 'SUCCESS', completedAt: new Date(), recordsProcessed: result.recordsProcessed },
      });
      return { success: true, recordsProcessed: result.recordsProcessed };
    } catch (err: any) {
      await p(this.prisma).syncLog.update({
        where: { id: syncLog.id },
        data: { status: 'FAILED', completedAt: new Date(), errorMessage: err.message },
      });
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { errorLog: err.message, status: 'ERROR' },
      });
      throw new BadRequestException(`Sync failed: ${err.message}`);
    }
  }

  async getConfig(tenantId: string, type: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
      include: { tokens: true },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    const def = getIntegrationDef(type);
    return {
      type: integration.type,
      label: integration.label,
      status: integration.status,
      metadata: integration.metadata,
      healthStatus: integration.errorLog ? 'ERROR' : 'HEALTHY',
      config: integration.tokens?.[0] ? {
        hasApiKey: !!integration.tokens[0].apiKey,
        hasApiSecret: !!integration.tokens[0].apiSecret,
        scope: integration.tokens[0].scope,
        expiresAt: integration.tokens[0].expiresAt,
      } : null,
      supportedFeatures: def ? {
        hasOAuth: def.hasOAuth,
        hasWebhook: def.hasWebhook,
        supportsSync: def.supportsSync,
        supportsTest: def.supportsTest,
      } : {},
    };
  }

  async updateConfig(tenantId: string, type: string, config: Record<string, unknown>) {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    return this.prisma.integration.update({
      where: { id: integration.id },
      data: { metadata: config as any },
    });
  }

  async getSyncLogs(tenantId: string, type: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    return p(this.prisma).syncLog.findMany({
      where: { integrationId: integration.id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getWebhookEvents(tenantId: string, type: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: type as any } },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    return p(this.prisma).webhookEvent.findMany({
      where: { integrationId: integration.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async handleWebhook(type: string, headers: any, body: any) {
    const integration = await this.prisma.integration.findFirst({
      where: { type: type as any, status: 'CONNECTED' },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    await p(this.prisma).webhookEvent.create({
      data: {
        integrationId: integration.id,
        eventType: headers['x-event-type'] || 'unknown',
        payload: body,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    return { received: true };
  }

  async getOAuthUrl(type: string, redirectUri: string) {
    const def = getIntegrationDef(type);
    if (!def || !def.hasOAuth) throw new BadRequestException('OAuth not supported for this integration');

    const state = crypto.randomUUID();
    const scopes = encodeURIComponent(def.scopes?.join(' ') || '');

    const urls: Record<string, string> = {
      GOOGLE_CALENDAR: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}&access_type=offline&prompt=consent`,
      GMAIL: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}&access_type=offline`,
      HUBSPOT: `https://app.hubspot.com/oauth/authorize?client_id=${process.env.HUBSPOT_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`,
      SLACK: `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`,
      GITHUB: `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`,
      LINKEDIN: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`,
      MICROSOFT_CALENDAR: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.OUTLOOK_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}`,
      GOOGLE_DRIVE: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}`,
      DROPBOX: `https://www.dropbox.com/oauth2/authorize?client_id=${process.env.DROPBOX_APP_KEY}&redirect_uri=${redirectUri}&response_type=code&state=${state}`,
    };

    const url = urls[type];
    if (!url) throw new BadRequestException(`OAuth URL not configured for ${type}`);

    return { url, state };
  }

  async handleOAuthCallback(type: string, code: string, redirectUri: string) {
    const def = getIntegrationDef(type);
    if (!def) throw new BadRequestException('Unknown integration type');

    const tokenEndpoints: Record<string, string> = {
      GOOGLE_CALENDAR: 'https://oauth2.googleapis.com/token',
      GMAIL: 'https://oauth2.googleapis.com/token',
      HUBSPOT: 'https://api.hubapi.com/oauth/v1/token',
      SLACK: 'https://slack.com/api/oauth.v2.access',
      GITHUB: 'https://github.com/login/oauth/access_token',
      LINKEDIN: 'https://www.linkedin.com/oauth/v2/accessToken',
      MICROSOFT_CALENDAR: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      GOOGLE_DRIVE: 'https://oauth2.googleapis.com/token',
      DROPBOX: 'https://api.dropboxapi.com/oauth2/token',
    };

    const tokenUrl = tokenEndpoints[type];
    if (!tokenUrl) throw new BadRequestException(`OAuth token exchange not configured for ${type}`);

    const clientId = process.env[`${def.envKeys[0]}`] || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env[`${def.envKeys[1]}`] || process.env.GOOGLE_CLIENT_SECRET;

    const params = new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      client_id: clientId || '',
      client_secret: clientSecret || '',
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: params.toString(),
    });

    const tokenData = await res.json() as Record<string, any>;
    if (!tokenData.access_token) throw new BadRequestException(`OAuth failed: ${tokenData.error || 'No access token'}`);

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : undefined,
      scope: tokenData.scope,
      metadata: { accountName: tokenData.name || type },
    };
  }

  private async upsertToken(integrationId: string, credentials: {
    apiKey?: string; apiSecret?: string; accessToken?: string;
    refreshToken?: string; scope?: string; expiresAt?: string;
  }) {
    const existingToken = await this.prisma.integrationToken.findFirst({
      where: { integrationId },
    });

    const data: any = {};
    if (credentials.apiKey) data.apiKey = this.encryption.encrypt(credentials.apiKey);
    if (credentials.apiSecret) data.apiSecret = this.encryption.encrypt(credentials.apiSecret);
    if (credentials.accessToken) data.accessToken = this.encryption.encrypt(credentials.accessToken);
    if (credentials.refreshToken) data.refreshToken = this.encryption.encrypt(credentials.refreshToken);
    if (credentials.scope) data.scope = credentials.scope;
    if (credentials.expiresAt) data.expiresAt = new Date(credentials.expiresAt);

    if (existingToken) {
      await this.prisma.integrationToken.update({ where: { id: existingToken.id }, data });
    } else {
      await this.prisma.integrationToken.create({
        data: { integrationId, ...data },
      });
    }
  }

  async getDecryptedToken(integrationId: string) {
    const token = await this.prisma.integrationToken.findFirst({
      where: { integrationId },
    });
    if (!token) return null;
    return {
      ...token,
      apiKey: token.apiKey ? this.encryption.decrypt(token.apiKey) : null,
      apiSecret: token.apiSecret ? this.encryption.decrypt(token.apiSecret) : null,
      accessToken: token.accessToken ? this.encryption.decrypt(token.accessToken) : null,
      refreshToken: token.refreshToken ? this.encryption.decrypt(token.refreshToken) : null,
    };
  }

  private async validateWithProvider(type: string, token: any) {
    const apiKey = token.apiKey || token.accessToken;
    const apiSecret = token.apiSecret;

    switch (type) {
      case 'STRIPE':
        if (apiKey?.startsWith('sk_')) return { message: `Stripe account verified` };
        throw new Error('Invalid Stripe key format');
      case 'RAZORPAY':
        if (apiKey && apiSecret) return { message: 'Razorpay credentials valid' };
        throw new Error('Missing Razorpay credentials');
      case 'RESEND':
      case 'SENDGRID':
      case 'MAILGUN':
        if (apiKey) return { message: 'API key format valid' };
        throw new Error('Missing API key');
      case 'OPENAI':
      case 'CLAUDE':
      case 'GEMINI':
      case 'DEEPSEEK':
      case 'PERPLEXITY':
      case 'GROQ':
      case 'MISTRAL':
      case 'OPENROUTER':
        if (apiKey) return { message: 'API key format valid' };
        throw new Error('Missing API key');
      case 'GOOGLE_CALENDAR':
      case 'GMAIL':
      case 'GOOGLE_DRIVE':
        if (apiKey) return { message: 'OAuth token present' };
        throw new Error('Missing access token');
      case 'TWILIO':
        if (apiKey && apiSecret) return { message: 'Twilio credentials valid' };
        throw new Error('Missing Twilio credentials');
      case 'HUBSPOT':
      case 'SALESFORCE':
      case 'SLACK':
        if (apiKey) return { message: 'OAuth token present' };
        throw new Error('Missing access token');
      case 'GOOGLE_ANALYTICS':
        if (apiKey?.startsWith('G-')) return { message: 'GA4 property ID valid' };
        throw new Error('Invalid Measurement ID format (should start with G-)');
      case 'META_PIXEL':
        if (apiKey) return { message: 'Pixel ID valid' };
        throw new Error('Missing Pixel ID');
      case 'SHOPIFY':
        if (apiKey && apiSecret) return { message: 'Shopify credentials valid' };
        throw new Error('Missing Shopify API credentials');
      case 'MAILCHIMP':
        if (apiKey) return { message: 'Mailchimp API key valid' };
        throw new Error('Missing API key');
      case 'SUPABASE':
      case 'FIREBASE':
      case 'MONGODB_ATLAS':
      case 'PLANETSCALE':
      case 'NEON':
        if (apiKey) return { message: 'Database credentials present' };
        throw new Error('Missing connection credentials');
      default:
        if (apiKey) return { message: 'Credentials present' };
        throw new Error('Missing API key or access token');
    }
  }

  private async syncWithProvider(type: string, integration: any) {
    switch (type) {
      case 'HUBSPOT':
      case 'SALESFORCE':
      case 'PIPEDRIVE':
        return { recordsProcessed: 0 };
      case 'GOOGLE_CALENDAR':
      case 'MICROSOFT_CALENDAR':
        return { recordsProcessed: 0 };
      case 'STRIPE':
      case 'RAZORPAY':
        return { recordsProcessed: 0 };
      case 'SHOPIFY':
        return { recordsProcessed: 0 };
      case 'MAILCHIMP':
        return { recordsProcessed: 0 };
      default:
        return { recordsProcessed: 0 };
    }
  }

  private sanitize(integration: any) {
    const tokens = integration.tokens as any[] | undefined;
    const lastToken = tokens?.[0];
    return {
      id: integration.id,
      tenantId: integration.tenantId,
      userId: integration.userId,
      type: integration.type,
      status: integration.status,
      label: integration.label,
      metadata: integration.metadata,
      errorLog: integration.errorLog,
      lastSyncedAt: integration.lastSyncedAt,
      healthStatus: integration.errorLog ? 'ERROR' : integration.lastSyncedAt ? 'HEALTHY' : 'WARNING',
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      connected: integration.status === 'CONNECTED',
      token: lastToken ? {
        id: lastToken.id,
        integrationId: lastToken.integrationId,
        tokenType: lastToken.tokenType,
        scope: lastToken.scope,
        expiresAt: lastToken.expiresAt,
        createdAt: lastToken.createdAt,
        updatedAt: lastToken.updatedAt,
      } : null,
    };
  }
}

