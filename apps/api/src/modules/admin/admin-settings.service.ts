import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';

const SETTING_DEFINITIONS: Array<{ key: string; group: string; type: string; description?: string }> = [
  // general
  { key: 'general.platformName', group: 'general', type: 'string', description: 'Display name of the platform' },
  { key: 'general.supportEmail', group: 'general', type: 'string', description: 'Support email shown to customers' },
  { key: 'general.defaultCurrency', group: 'general', type: 'string', description: 'Default currency for new businesses' },
  // brand
  { key: 'brand.primaryColor', group: 'brand', type: 'string', description: 'Primary brand color' },
  { key: 'brand.landingLogo', group: 'brand', type: 'string', description: 'Landing page logo URL' },
  // email
  { key: 'email.fromName', group: 'email', type: 'string', description: 'From name for transactional emails' },
  { key: 'email.fromAddress', group: 'email', type: 'string', description: 'From address for transactional emails' },
  // notifications
  { key: 'notifications.enableAdminAlerts', group: 'notifications', type: 'boolean', description: 'Send admin alert emails for payment failures etc.' },
  { key: 'notifications.digestFrequency', group: 'notifications', type: 'string', description: 'Admin digest frequency' },
  // billing
  { key: 'billing.currency', group: 'billing', type: 'string', description: 'Billing currency' },
  { key: 'billing.trialDays', group: 'billing', type: 'number', description: 'Default trial length in days' },
  // auth
  { key: 'auth.allowGoogleOAuth', group: 'auth', type: 'boolean', description: 'Allow Google sign-in' },
  { key: 'auth.requireTwoFactorAdmins', group: 'auth', type: 'boolean', description: 'Require 2FA for admin accounts' },
  // security
  { key: 'security.adminSessionTtlHours', group: 'security', type: 'number', description: 'Admin session lifetime in hours' },
  // ai
  { key: 'ai.provider', group: 'ai', type: 'string', description: 'AI provider (openrouter / openai)' },
  { key: 'ai.model', group: 'ai', type: 'string', description: 'Default AI model' },
  // integrations
  { key: 'integrations.sandboxMode', group: 'integrations', type: 'boolean', description: 'Run payments in sandbox mode' },
  // support
  { key: 'support.slaHours', group: 'support', type: 'number', description: 'Target first-response time in hours' },
];

const DEFAULT_VALUES: Record<string, unknown> = {
  'general.platformName': 'Doloyal',
  'general.supportEmail': 'hello@doloyal.ai',
  'general.defaultCurrency': 'INR',
  'brand.primaryColor': '#105EF6',
  'brand.landingLogo': '',
  'email.fromName': 'Doloyal',
  'email.fromAddress': 'noreply@doloyal.ai',
  'notifications.enableAdminAlerts': true,
  'notifications.digestFrequency': 'daily',
  'billing.currency': 'INR',
  'billing.trialDays': 14,
  'auth.allowGoogleOAuth': true,
  'auth.requireTwoFactorAdmins': false,
  'security.adminSessionTtlHours': 12,
  'ai.provider': 'openrouter',
  'ai.model': 'gpt-4o-mini',
  'integrations.sandboxMode': true,
  'support.slaHours': 24,
};

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async getAll() {
    const rows = await this.prisma.platformSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const groups: Record<string, Record<string, unknown>> = {};
    for (const def of SETTING_DEFINITIONS) {
      groups[def.group] = groups[def.group] ?? {};
      const val = map.has(def.key) ? map.get(def.key) : DEFAULT_VALUES[def.key];
      groups[def.group][def.key.split('.')[1]] = val ?? '';
    }
    // Return definitions too so the UI can render unknown groups.
    return {
      ...groups,
      _definitions: SETTING_DEFINITIONS,
    } as any;
  }

  async update(actor: any, updates: Record<string, Record<string, unknown>>) {
    const changes: Array<{ key: string; value: unknown }> = [];
    for (const [group, values] of Object.entries(updates)) {
      if (typeof values !== 'object' || values === null) continue;
      for (const [name, value] of Object.entries(values as Record<string, unknown>)) {
        const key = `${group}.${name}`;
        const def = SETTING_DEFINITIONS.find((d) => d.key === key);
        if (!def) continue; // unknown settings are ignored (never stored)
        const stored =
          def.type === 'number' && typeof value === 'string'
            ? Number(value)
            : def.type === 'boolean' && typeof value === 'string'
              ? value === 'true'
              : value;
        await this.prisma.platformSetting.upsert({
          where: { key },
          create: { key, value: stored as any, type: def.type, updatedById: actor?.id },
          update: { value: stored as any, updatedById: actor?.id },
        });
        changes.push({ key, value: stored });
      }
    }
    await this.audit.record(actor, 'settings.updated', 'SETTINGS', {
      metadata: { keys: changes.map((c) => c.key) },
    });
    return { ok: true, updated: changes.map((c) => c.key) };
  }
}