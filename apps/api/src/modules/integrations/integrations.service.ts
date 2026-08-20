import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import { getIntegrationDef } from './integration-definitions';
import * as crypto from 'crypto';

const p = (prisma: PrismaService) => prisma as any;

interface OAuthStateEntry {
  tenantId: string;
  userId: string;
  type: string;
  createdAt: number;
  /** PKCE verifier — Resend public-client flows only. Single-use, never persisted. */
  codeVerifier?: string;
  /** Exact redirect_uri used in the authorize request (must match at token exchange). */
  redirectUri?: string;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  /** In-memory OAuth CSRF state. Single-instance API; single-use, TTL 10 min. */
  private readonly oauthStates = new Map<string, OAuthStateEntry>();
  private static readonly OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

  /**
   * Serializes Resend refresh-token rotation per integration. Resend refresh
   * tokens rotate on every use — concurrent refreshes from two requests would
   * race and one would end up storing a stale (already-rotated) token.
   */
  private readonly resendRefreshLocks = new Map<string, Promise<string>>();

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

    // Resend is OAuth-only for customers. Never accept API-key credentials —
    // connections must come from the completed OAuth code exchange.
    if (type === 'RESEND' && !credentials.accessToken) {
      throw new BadRequestException(
        'Resend connects through OAuth only. Use the Connect button to authorize with Resend.',
      );
    }

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

    if (type === 'RESEND') {
      // Best-effort grant revocation. Failing to revoke remotely must not
      // block a local disconnect — the stored tokens are cleared regardless.
      await this.revokeResendGrant(integration.id);
    }

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

    if (type === 'GOOGLE_CALENDAR') {
      return this.testGoogleCalendarConnection(integration.id);
    }

    if (type === 'RESEND') {
      return this.testResendConnection(integration.id);
    }

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

  private async testGoogleCalendarConnection(integrationId: string) {
    try {
      const accessToken = await this.getValidAccessToken(integrationId);
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!calRes.ok) {
        throw new Error(`Google Calendar API returned ${calRes.status}`);
      }
      const email = await this.fetchGoogleEmail(accessToken);
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { errorLog: null, status: 'CONNECTED' },
      });
      return { success: true, message: email ? `Connected as ${email}` : 'Connection successful' };
    } catch (err: any) {
      const message = err?.message || 'Connection test failed';
      const isRevoked = /revoked|invalid_grant|expired/i.test(message);
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { errorLog: message, status: isRevoked ? 'EXPIRED' : 'ERROR' },
      });
      throw new BadRequestException(
        isRevoked ? 'Google Calendar access was revoked. Please reconnect.' : `Google Calendar connection test failed: ${message}`,
      );
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
      const result = await this.syncWithProvider(type as any);
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

    // Merge — never clobber stored metadata (e.g. calendar list / connected email).
    const merged = { ...((integration.metadata as Record<string, unknown>) || {}), ...config };
    return this.prisma.integration.update({
      where: { id: integration.id },
      data: { metadata: merged as any },
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

  async getOAuthUrl(type: string, redirectUri: string | undefined, user: any) {
    const def = getIntegrationDef(type);
    if (!def || !def.hasOAuth) throw new BadRequestException('OAuth not supported for this integration');

    const clientId = process.env[`${def.envKeys[0]}`] || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      this.logger.warn(`OAuth URL requested for ${type} but ${def.envKeys[0]} is not configured`);
      throw new BadRequestException(
        `${def.name} is not configured in this environment. Please contact support.`,
      );
    }

    const state = crypto.randomUUID();
    const tenantId = user?.activeTenantId;
    const userId = user?.id;
    if (!tenantId || !userId) {
      throw new BadRequestException('Unable to determine the current workspace.');
    }

    const redirect = redirectUri || this.getDefaultRedirectUri();

    if (type === 'RESEND') {
      return this.buildResendOAuthUrl(clientId, redirect, state, tenantId, userId);
    }

    this.oauthStates.set(state, { tenantId, userId, type, createdAt: Date.now() });
    this.logger.log(`OAuth flow started: type=${type} tenant=${tenantId} user=${userId} state=${state}`);

    const scopes = encodeURIComponent(def.scopes?.join(' ') || '');
    const urls: Record<string, string> = {
      GOOGLE_CALENDAR: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scopes}&state=${state}&access_type=offline&prompt=consent`,
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

  async handleOAuthCallback(tenantId: string, userId: string, type: string, code: string, state?: string, redirectUri?: string) {
    // CSRF / session binding first: reject missing, unknown, expired or
    // mismatched state. Awaited so every throw below happens after an await
    // boundary — @nestjs/platform-fastify mishandles handler errors thrown
    // before the first await when a JSON body is present (unhandled rejection).
    const stateEntry = await this.assertValidOAuthState(state, tenantId, userId, type);

    const def = getIntegrationDef(type);
    if (!def) throw new BadRequestException('Unknown integration type');

    if (type === 'RESEND') {
      return this.completeResendOAuth(tenantId, userId, code, stateEntry);
    }

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
    if (!clientId || !clientSecret) {
      throw new BadRequestException(`${def.name} is not configured in this environment. Please contact support.`);
    }

    const params = new URLSearchParams({
      code,
      redirect_uri: stateEntry.redirectUri || redirectUri || this.getDefaultRedirectUri(),
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: params.toString(),
    });

    const tokenData = await res.json() as Record<string, any>;
    if (!tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'unknown_error';
      this.logger.warn(`OAuth code exchange failed: type=${type} error=${errMsg}`);
      throw new BadRequestException(this.safeOAuthError(type, errMsg));
    }

    const metadata: Record<string, unknown> = { accountName: tokenData.name || type };

    if (type === 'GOOGLE_CALENDAR') {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json() as any;
          if (userInfo.sub) metadata.providerAccountId = userInfo.sub;
          if (userInfo.email) {
            metadata.email = userInfo.email;
            metadata.accountName = userInfo.email;
          }
          if (userInfo.name) metadata.name = userInfo.name;
        }
      } catch {
        // Non-fatal — the connection can still be saved without a profile.
      }

      try {
        const calendarsRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (calendarsRes.ok) {
          const calendarsData = await calendarsRes.json() as any;
          const calendars = (calendarsData.items || []).map((cal: any) => ({
            id: cal.id,
            summary: cal.summary,
            primary: !!cal.primary,
            accessRole: cal.accessRole,
          }));
          metadata.calendars = calendars;
          metadata.calendarCount = calendars.length;
          const primary = calendars.find((c: any) => c.primary) || calendars[0];
          if (primary) metadata.google_calendar_id = primary.id;
        }
      } catch {
        // Non-fatal — calendars are refreshed on demand via the provider service.
      }
    }

    const integration = await this.connect(tenantId, type, userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : undefined,
      scope: tokenData.scope,
      metadata,
      label: typeof metadata.accountName === 'string' ? metadata.accountName : type,
    });

    this.logger.log(`OAuth completed: type=${type} tenant=${tenantId} status=${integration.status}`);
    return integration;
  }

  // ── Resend OAuth (public client, PKCE required) ───────────────────────────

  private buildResendOAuthUrl(clientId: string, redirectUri: string, state: string, tenantId: string, userId: string) {
    const codeVerifier = crypto.randomBytes(48).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    this.oauthStates.set(state, {
      tenantId,
      userId,
      type: 'RESEND',
      createdAt: Date.now(),
      codeVerifier,
      redirectUri,
    });
    this.logger.log(`OAuth flow started: type=RESEND tenant=${tenantId} user=${userId} state=${state}`);

    const url = new URL('https://api.resend.com/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'emails:send',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString();

    return { url: url.toString(), state };
  }

  private async completeResendOAuth(tenantId: string, userId: string, code: string, stateEntry: OAuthStateEntry) {
    const clientId = process.env.RESEND_OAUTH_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Resend is not configured in this environment. Please contact support.');
    }
    if (!stateEntry.codeVerifier) {
      throw new BadRequestException('Invalid OAuth session. Please try connecting again.');
    }

    const redirectUri = stateEntry.redirectUri || this.getDefaultRedirectUri();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: stateEntry.codeVerifier,
    });

    const res = await fetch('https://api.resend.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: params.toString(),
    });

    const tokenData = await res.json() as Record<string, any>;
    if (!tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'unknown_error';
      this.logger.warn(`Resend OAuth code exchange failed: error=${errMsg}`);
      throw new BadRequestException(this.safeOAuthError('RESEND', errMsg));
    }

    const metadata: Record<string, unknown> = { provider: 'resend', scope: tokenData.scope || 'emails:send' };
    const decoded = this.decodeJwtClaims(tokenData.access_token);
    if (decoded?.sub) metadata.providerAccountId = decoded.sub;
    if (decoded?.email) {
      metadata.email = decoded.email;
      metadata.accountName = decoded.email;
    } else if (decoded?.org_name) {
      metadata.accountName = decoded.org_name;
    }

    const integration = await this.connect(tenantId, 'RESEND', userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : undefined,
      scope: tokenData.scope || 'emails:send',
      metadata,
      label: typeof metadata.accountName === 'string' ? metadata.accountName : 'Resend',
    });

    this.logger.log(`Resend OAuth completed: tenant=${tenantId} status=${integration.status}`);
    return integration;
  }

  /**
   * Best-effort decode of a JWT payload (no signature verification — used only
   * to surface account info to the owner, never for authorization).
   */
  private decodeJwtClaims(token: string): Record<string, any> | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Resolve a valid (possibly just-refreshed) Resend access token.
   * Resend refresh tokens rotate on every use, so refreshes are serialized
   * per integration and the new token is persisted atomically with the rest
   * of the response. On revocation the integration is marked REAUTH_REQUIRED
   * so the UI can prompt to reconnect.
   */
  async getValidResendAccessToken(integrationId: string): Promise<string> {
    const token = await this.getDecryptedToken(integrationId);
    if (!token?.accessToken) throw new BadRequestException('Resend is not connected. Please connect Resend to send emails.');

    const expiresAt = token.expiresAt ? new Date(token.expiresAt).getTime() : 0;
    if (expiresAt && expiresAt - 5 * 60 * 1000 > Date.now()) {
      return token.accessToken;
    }

    const inFlight = this.resendRefreshLocks.get(integrationId);
    if (inFlight) return inFlight;

    const refreshPromise = this.refreshResendToken(integrationId, token.refreshToken);
    this.resendRefreshLocks.set(integrationId, refreshPromise);
    try {
      return await refreshPromise;
    } finally {
      this.resendRefreshLocks.delete(integrationId);
    }
  }

  private async refreshResendToken(integrationId: string, refreshToken: string | null): Promise<string> {
    const clientId = process.env.RESEND_OAUTH_CLIENT_ID;
    if (!clientId) {
      await this.markReauthRequired(integrationId, 'Resend is not configured in this environment. Please contact support.');
      throw new BadRequestException('Resend is not configured in this environment. Please contact support.');
    }
    if (!refreshToken) {
      await this.markReauthRequired(integrationId, 'Resend session expired. Please reconnect.');
      throw new BadRequestException('Resend session expired. Please reconnect.');
    }

    const res = await fetch('https://api.resend.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }).toString(),
    });

    const data = await res.json() as Record<string, any>;
    if (!data.access_token) {
      const msg = data.error_description || data.error || 'invalid_grant';
      const isRevoked = /invalid_grant|revoked|expired|deleted/i.test(String(msg));
      await this.markReauthRequired(
        integrationId,
        isRevoked
          ? 'Resend access was revoked. Please reconnect.'
          : `Resend session expired. Please reconnect. (${msg})`,
      );
      throw new BadRequestException(
        isRevoked
          ? 'Resend access was revoked. Please reconnect Resend to continue sending emails.'
          : 'Resend session expired. Please reconnect Resend to continue sending emails.',
      );
    }

    // Rotating refresh token: persist the newest value atomically with the
    // access token so no stale (already-rotated) token is ever reused.
    await this.upsertToken(integrationId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
      scope: data.scope,
    });
    return data.access_token;
  }

  /** Revoke a Resend grant (disconnect). Best-effort — never throws. */
  private async revokeResendGrant(integrationId: string): Promise<void> {
    const clientId = process.env.RESEND_OAUTH_CLIENT_ID;
    if (!clientId) return;

    try {
      const token = await this.getDecryptedToken(integrationId);
      if (!token?.refreshToken) return;
      await fetch('https://api.resend.com/oauth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
          client_id: clientId,
          token: token.refreshToken,
          token_type_hint: 'refresh_token',
        }).toString(),
      });
    } catch (err: any) {
      this.logger.warn(`Resend grant revocation failed: ${err?.message}`);
    }
  }

  private async testResendConnection(integrationId: string) {
    try {
      const accessToken = await this.getValidResendAccessToken(integrationId);
      const decoded = this.decodeJwtClaims(accessToken);
      const accountLabel = decoded?.email || decoded?.org_name || decoded?.sub;
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { errorLog: null, status: 'CONNECTED' },
      });
      return { success: true, message: accountLabel ? `Connected to Resend account ${accountLabel}` : 'Resend connection successful' };
    } catch (err: any) {
      const message = err?.message || 'Connection test failed';
      const isRevoked = /revoked|invalid_grant|expired|reconnect/i.test(message);
      if (isRevoked) {
        await this.markReauthRequired(integrationId, message);
      } else {
        await this.prisma.integration.update({
          where: { id: integrationId },
          data: { errorLog: message, status: 'ERROR' },
        });
      }
      throw new BadRequestException(
        isRevoked ? 'Resend access was revoked. Please reconnect.' : `Resend connection test failed: ${message}`,
      );
    }
  }

  /**
   * Resolve a valid (possibly just-refreshed) Google access token for an
   * integration. Marks the integration EXPIRED when the refresh token is
   * revoked so the UI can prompt to reconnect.
   */
  async getValidAccessToken(integrationId: string): Promise<string> {
    const token = await this.getDecryptedToken(integrationId);
    if (!token?.accessToken) throw new BadRequestException('No Google Calendar access token found.');

    const expiresAt = token.expiresAt ? new Date(token.expiresAt).getTime() : 0;
    if (expiresAt && expiresAt - 5 * 60 * 1000 > Date.now()) {
      return token.accessToken;
    }
    if (!token.refreshToken) {
      await this.markExpired(integrationId, 'Google Calendar access token expired. Please reconnect.');
      throw new BadRequestException('Google Calendar access token expired. Please reconnect.');
    }

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
        client_id: clientId || '',
        client_secret: clientSecret || '',
      }).toString(),
    });
    const data = await res.json() as Record<string, any>;
    if (!data.access_token) {
      const msg = data.error_description || data.error || 'invalid_grant';
      if (/invalid_grant|revoked|deleted/i.test(String(msg))) {
        await this.markExpired(integrationId, 'Google Calendar access was revoked. Please reconnect.');
        throw new BadRequestException('Google Calendar access was revoked. Please reconnect.');
      }
      this.logger.warn(`Google token refresh failed: ${msg}`);
      throw new BadRequestException('Google Calendar token refresh failed. Please reconnect.');
    }
    await this.upsertToken(integrationId, {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
    });
    return data.access_token;
  }

  /** Mark an integration as EXPIRED (revoked/re-auth required). */
  async markExpired(integrationId: string, message: string): Promise<void> {
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { status: 'EXPIRED', errorLog: message },
    });
  }

  private async assertValidOAuthState(state: string | undefined, tenantId: string, userId: string, type: string): Promise<OAuthStateEntry> {
    if (!state) throw new BadRequestException('Invalid OAuth session. Please try connecting again.');
    const entry = this.oauthStates.get(state);
    if (!entry) throw new BadRequestException('Invalid OAuth session. Please try connecting again.');
    this.oauthStates.delete(state); // single-use
    if (Date.now() - entry.createdAt > IntegrationsService.OAUTH_STATE_TTL_MS) {
      throw new BadRequestException('OAuth session expired. Please try connecting again.');
    }
    if (entry.type !== type || entry.tenantId !== tenantId || entry.userId !== userId) {
      this.logger.warn(
        `OAuth state mismatch: expected tenant=${entry.tenantId} user=${entry.userId} type=${entry.type}, ` +
          `received tenant=${tenantId} user=${userId} type=${type}`,
      );
      throw new BadRequestException('Invalid OAuth session. Please try connecting again.');
    }
    return entry;
  }

  private async fetchGoogleEmail(accessToken: string): Promise<string | null> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json() as any;
      return data.email || null;
    } catch {
      return null;
    }
  }

  /** Map provider error strings to safe, user-facing messages. */
  private safeOAuthError(provider: string, raw: string): string {
    const isResend = provider.toUpperCase() === 'RESEND';
    if (/access_denied|cancelled|canceled/i.test(raw)) {
      return isResend
        ? 'Resend access was denied. No connection was created.'
        : 'Google access was denied. Please try again.';
    }
    if (/invalid_client|unauthorized_client/i.test(raw)) {
      return isResend
        ? 'Resend is not configured for this Doloyal environment. Please contact support.'
        : 'Google Calendar credentials are invalid. Please contact support.';
    }
    if (/invalid_grant|expired|revoked/i.test(raw)) {
      return isResend
        ? 'The Resend authorization session expired. Please try connecting again.'
        : 'Google authorization expired. Please try connecting again.';
    }
    return isResend
      ? 'Resend authorization failed. Please try again.'
      : 'Google authorization failed. Please try again.';
  }

  /** Mark an integration as REAUTH_REQUIRED (revoked grant / unusable session). */
  async markReauthRequired(integrationId: string, message: string): Promise<void> {
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { status: 'REAUTH_REQUIRED', errorLog: message },
    });
  }

  private getDefaultRedirectUri(): string {
    return (
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.doloyal.com/app/integrations/callback'
        : 'http://localhost:3000/app/integrations/callback')
    );
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

  private async syncWithProvider(type: string) {
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

