/**
 * Workflow validation service — readiness check for the Test / pre-activation
 * flow. Validates every node against the real Doloyal state: capability
 * registry, business config, connected integrations, plan entitlements and
 * customer data coverage.
 *
 * This is a READ-ONLY validation. It never persists anything and never sends
 * real messages (the engine's test runs are always simulated).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import {
  getAction,
  getTrigger,
  getCondition,
  isSupportedTrigger,
  isSupportedAction,
  isSupportedCondition,
  SUPPORTED_OPERATORS,
  WIRED_TRIGGERS,
} from './workflow-capability.registry';
import {
  validateDefinition,
  normalizeDefinition,
  parseDurationMs,
  DELAY_PATTERN,
  type WorkflowDefinition,
  type WorkflowNode,
} from './workflow-schema';

export type ValidationStatus = 'OK' | 'ERROR' | 'WARNING';

export interface ValidationCheck {
  label: string;
  status: ValidationStatus;
  message?: string;
}

export type ValidationAction =
  | { kind: 'fix_node' }
  | { kind: 'connect_integration'; integration: string; label: string; url: string }
  | { kind: 'upgrade_plan' };

export interface WorkflowNodeValidation {
  nodeKey: string;
  type: string;
  label: string;
  status: ValidationStatus;
  summary: string;
  checks: ValidationCheck[];
  canContinue: boolean;
  action?: ValidationAction;
}

export interface WorkflowValidationResult {
  ok: boolean;
  simulated: true;
  testedAt: string;
  plan: string;
  nodes: WorkflowNodeValidation[];
  errors: number;
  warnings: number;
  message: string;
}

interface ChannelAvailability {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
}

/** Actions whose config keys are mandatory before the workflow can run. */
const REQUIRED_ACTION_CONFIG: Record<string, string[]> = {
  send_whatsapp: ['message'],
  send_sms: ['message'],
  send_email: ['subject', 'body'],
  add_points: ['points'],
  remove_points: ['points'],
  create_reward: ['name', 'value'],
  add_tag: ['tag'],
  remove_tag: ['tag'],
  create_task: ['title'],
};

/** Numeric config keys that must be present and > 0. */
const NUMERIC_ACTION_CONFIG: Record<string, string[]> = {
  add_points: ['points'],
  remove_points: ['points'],
};

/** Human-readable config key labels. */
const CONFIG_LABELS: Record<string, string> = {
  message: 'Message',
  subject: 'Email subject',
  body: 'Email body',
  points: 'Points',
  name: 'Reward name',
  value: 'Reward value',
  tag: 'Tag',
  title: 'Task title',
  duration: 'Duration',
  condition: 'Condition',
  operator: 'Operator',
};

const MIN_DELAY_MS = 60_000; // 1m
const MAX_DELAY_MS = 366 * 24 * 60 * 60_000; // ~1 year

@Injectable()
export class WorkflowValidationService {
  private readonly logger = new Logger(WorkflowValidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  async validate(tenantId: string, definition?: WorkflowDefinition): Promise<WorkflowValidationResult> {
    const def = definition ? (validateDefinition(definition).definition ?? normalizeDefinition(definition) ?? definition) : null;
    const schemaErrors = definition ? validateDefinition(definition).errors : [];
    const plan = await this.planFor(tenantId);
    const channels = await this.resolveChannels(tenantId);
    const customerCount = await this.prisma.customer.count({ where: { tenantId } }).catch(() => 0);
    const emailCoverage = customerCount > 0
      ? await this.prisma.customer.count({ where: { tenantId, email: { not: null } } }).catch(() => 0)
      : 0;

    const nodes: WorkflowNodeValidation[] = [];

    // Plan gate (workflow-level).
    if (!plan.allowed) {
      nodes.push({
        nodeKey: '__plan__',
        type: 'plan',
        label: 'Plan entitlement',
        status: 'ERROR',
        summary: `AI Workflows are not available on the ${plan.name} plan.`,
        checks: [
          { label: 'Plan entitlement', status: 'ERROR', message: 'Upgrade to the Growth plan or above to use AI Workflows.' },
        ],
        canContinue: false,
        action: { kind: 'upgrade_plan' },
      });
    }

    if (!def) {
      return this.result(nodes, plan.name, customerCount);
    }

    // Structural validation from the schema validator.
    for (const err of schemaErrors) {
      const match = err.match(/"([^"]+)"/);
      const nodeId = match ? match[1] : null;
      const entry = nodes.find((n) => nodeId && n.nodeKey === nodeId);
      if (entry) {
        entry.status = 'ERROR';
        entry.canContinue = false;
        entry.checks.push({ label: 'Structure', status: 'ERROR', message: err });
      } else {
        nodes.push({
          nodeKey: '__structure__',
          type: 'structure',
          label: 'Workflow structure',
          status: 'ERROR',
          summary: err,
          checks: [{ label: 'Structure', status: 'ERROR', message: err }],
          canContinue: false,
          action: { kind: 'fix_node' },
        });
      }
    }

    for (const node of def.nodes) {
      nodes.push(this.validateNode(node, channels, customerCount, emailCoverage));
    }

    // If the trigger lives only in `definition.trigger` (not materialized as a
    // node), validate it as a synthetic trigger step.
    if (!def.nodes.some((n) => n.type === 'trigger')) {
      nodes.push(
        this.validateNode(
          { id: 'trigger', type: 'trigger', label: 'Trigger', config: { type: def.trigger.type, ...def.trigger.config, ...def.trigger.params } },
          channels,
          customerCount,
          emailCoverage,
        ),
      );
    }

    // Trigger-level data availability.
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    if (triggerNode && customerCount === 0) {
      triggerNode.status = 'WARNING';
      triggerNode.summary = 'No customers on record yet — the test will use a sample customer.';
      triggerNode.checks.push({
        label: 'Customer data',
        status: 'WARNING',
        message: 'Your customer list is empty. The test uses a sample customer and no real messages are sent.',
      });
    }

    return this.result(nodes, plan.name, customerCount);
  }

  // ─── Node validation ───────────────────────────────────────────────────────

  private validateNode(
    node: WorkflowNode,
    channels: ChannelAvailability,
    customerCount: number,
    emailCoverage: number,
  ): WorkflowNodeValidation {
    const checks: ValidationCheck[] = [];
    let nodeAction: ValidationAction | undefined;
    const fail = (label: string, message: string, action?: ValidationAction) => {
      checks.push({ label, status: 'ERROR', message });
      if (action && !nodeAction) nodeAction = action;
    };
    const warn = (label: string, message: string) => checks.push({ label, status: 'WARNING', message });
    const ok = (label: string, message?: string) => checks.push({ label, status: 'OK', message });
    const config = (node.config || node.data || {}) as Record<string, unknown>;

    switch (node.type) {
      case 'trigger': {
        const triggerType = String(config.type || node.label || '');
        const trigger = getTrigger(triggerType);
        if (!triggerType || !trigger) {
          fail('Trigger type', `Trigger "${triggerType || '(none)'}" is not supported by Doloyal.`, { kind: 'fix_node' });
        } else {
          ok('Trigger type', `${trigger.label} (${trigger.category})`);
          if (!WIRED_TRIGGERS.has(triggerType)) {
            warn('Trigger wiring', `${trigger.label} is not yet wired to live data and will fire from simulated events during tests.`);
          }
          if (trigger.params?.length) {
            for (const p of trigger.params) {
              const val = config[p.key];
              if (val === undefined || val === null || val === '') {
                fail('Required param', `${p.label} is required for this trigger.`, { kind: 'fix_node' });
              } else if (p.type === 'number' && Number(val) <= 0) {
                fail('Required param', `${p.label} must be greater than zero.`, { kind: 'fix_node' });
              } else {
                ok(p.label, `${p.label}: ${val}`);
              }
            }
          }
        }
        break;
      }

      case 'action': {
        const actionType = String(config.type || config.action || node.data?.type || '');
        const cap = getAction(actionType);
        if (!actionType || !cap) {
          fail('Action type', `Action "${actionType || '(none)'}" is not supported by Doloyal.`, { kind: 'fix_node' });
          break;
        }
        if (!isSupportedAction(actionType)) {
          fail('Action type', `Action "${actionType}" is not supported by Doloyal.`, { kind: 'fix_node' });
          break;
        }
        ok('Action type', `${cap.label} (${cap.category})`);

        // Required config
        const required = REQUIRED_ACTION_CONFIG[actionType];
        if (required) {
          for (const key of required) {
            const val = config[key];
            if (val === undefined || val === null || String(val).trim() === '') {
              fail('Missing config', `${CONFIG_LABELS[key] || key} is missing.`, { kind: 'fix_node' });
            } else if (NUMERIC_ACTION_CONFIG[actionType]?.includes(key) && Number(val) <= 0) {
              fail('Invalid config', `${CONFIG_LABELS[key] || key} must be greater than zero.`, { kind: 'fix_node' });
            } else {
              ok(CONFIG_LABELS[key] || key, String(val));
            }
          }
        }

        // Channel / provider availability
        const channel = String(config.channel || cap.channels?.[0] || '');
        if (channel && channel !== 'INTERNAL') {
          const available = this.channelAvailable(channels, channel);
          if (available) {
            ok('Channel connected', `${channel} is connected for this workspace.`);
          } else {
            const res = this.channelError(channel);
            fail('Channel', res.message, { kind: 'connect_integration', integration: channel, label: res.label, url: '/app/integrations' });
          }
        }

        // Data coverage for messaging
        if (channel === 'EMAIL' && customerCount > 0 && emailCoverage === 0) {
          warn('Customer data', 'No customers have an email address — emails will be skipped for everyone.');
        } else if ((channel === 'WHATSAPP' || channel === 'SMS') && customerCount === 0) {
          warn('Customer data', 'No customers have phone numbers yet — messages will be skipped until contacts exist.');
        }
        break;
      }

      case 'delay': {
        const duration = String(config.duration ?? config.wait ?? node.data?.duration ?? '');
        if (!duration || !DELAY_PATTERN.test(duration)) {
          fail('Duration', 'Wait needs a duration like "7d" or "2h".', { kind: 'fix_node' });
        } else {
          const ms = parseDurationMs(duration);
          if (ms < MIN_DELAY_MS) {
            warn('Duration', `The wait is quite short (${duration}). Consider at least a few minutes.`);
          } else if (ms > MAX_DELAY_MS) {
            warn('Duration', `The wait (${duration}) is longer than a year — customers may forget the context.`);
          } else {
            ok('Duration', `Wait for ${duration}.`);
          }
        }
        break;
      }

      case 'condition': {
        const key = String(config.condition ?? config.key ?? node.data?.condition ?? '');
        const condition = getCondition(key);
        if (!key || !condition) {
          fail('Condition', `Condition "${key || '(none)'}" is not supported by Doloyal.`, { kind: 'fix_node' });
          break;
        }
        ok('Condition', `${condition.label} (${condition.category})`);
        const operator = String(config.operator ?? 'equals');
        if (!SUPPORTED_OPERATORS.includes(operator)) {
          fail('Operator', `Operator "${operator}" is not supported.`, { kind: 'fix_node' });
        } else {
          ok('Operator', operator);
        }
        const value = config.value ?? config.compareValue;
        if (value === undefined || value === null || value === '') {
          fail('Condition value', 'A comparison value is required for this condition.', { kind: 'fix_node' });
        } else if (condition.valueType === 'boolean' && value !== true && value !== false) {
          fail('Condition value', 'Expected a true/false value for this condition.', { kind: 'fix_node' });
        } else {
          ok('Condition value', String(value));
        }
        break;
      }

      case 'branch':
        ok('Branch', 'Outcome-based branch — no extra configuration required.');
        break;

      case 'end':
        ok('End', 'Stops the workflow run here.');
        break;

      default:
        fail('Unknown step', `Step type "${node.type}" is not recognised.`, { kind: 'fix_node' });
    }

    const hasError = checks.some((c) => c.status === 'ERROR');
    const hasWarning = checks.some((c) => c.status === 'WARNING');
    const status: ValidationStatus = hasError ? 'ERROR' : hasWarning ? 'WARNING' : 'OK';
    const summary = hasError
      ? (checks.find((c) => c.status === 'ERROR')?.message || 'Needs attention.')
      : hasWarning
        ? (checks.find((c) => c.status === 'WARNING')?.message || 'OK with notes.')
        : 'Ready.';

    return {
      nodeKey: node.id,
      type: node.type,
      label: node.label || node.type,
      status,
      summary,
      checks,
      canContinue: !hasError,
      action: hasError ? (nodeAction || { kind: 'fix_node' }) : undefined,
    };
  }

  // ─── Channel availability ──────────────────────────────────────────────────

  private channelAvailable(channels: ChannelAvailability, channel: string): boolean {
    const c = channel.toUpperCase();
    if (c === 'EMAIL') return channels.email;
    if (c === 'WHATSAPP') return channels.whatsapp;
    if (c === 'SMS') return channels.sms;
    return true;
  }

  private channelError(channel: string): { message: string; label: string } {
    if (channel.toUpperCase() === 'WHATSAPP') {
      return { message: 'WhatsApp is not connected. Connect WhatsApp to send real messages.', label: 'Connect WhatsApp' };
    }
    if (channel.toUpperCase() === 'EMAIL') {
      return { message: 'Email is not connected. Connect an email provider (e.g. Resend) to send real emails.', label: 'Connect Email' };
    }
    return { message: 'SMS is not connected. Connect an SMS provider to send real text messages.', label: 'Connect SMS' };
  }

  private async resolveChannels(tenantId: string): Promise<ChannelAvailability> {
    const connected = new Set<string>();
    try {
      const integrations = await this.integrations.list(tenantId);
      for (const i of integrations) {
        if (i.connected) connected.add(String(i.type).toUpperCase());
      }
    } catch {
      /* ignore */
    }
    let whatsapp = connected.has('WHATSAPP');
    let email = connected.has('RESEND');
    const sms = connected.has('SMS');

    // WhatsApp can also be enabled per business via a booking link's branding.
    if (!whatsapp) {
      try {
        const link: any = await this.prisma.bookingLink.findFirst({ where: { tenantId } });
        whatsapp = Boolean(link?.branding?.showWhatsApp);
      } catch {
        /* ignore */
      }
    }
    if (!email) {
      try {
        const link: any = await this.prisma.bookingLink.findFirst({ where: { tenantId } });
        email = Boolean(link?.branding?.confirmationEmail);
      } catch {
        /* ignore */
      }
    }
    return { email, whatsapp, sms };
  }

  // ─── Plan entitlement ──────────────────────────────────────────────────────

  private async planFor(tenantId: string): Promise<{ name: string; allowed: boolean }> {
    const allowedPlans = new Set(['growth', 'professional', 'enterprise']);
    let plan = 'free';
    try {
      const sub = await this.prisma.subscription.findFirst({ where: { tenantId } });
      plan = sub?.plan || 'free';
    } catch {
      /* default free */
    }
    try {
      const override = await this.prisma.planConfig.findUnique({ where: { plan } });
      const cfg = (override?.config as any) || {};
      if (typeof cfg.workflowsEnabled === 'boolean') {
        return { name: plan, allowed: cfg.workflowsEnabled };
      }
      if (typeof cfg.activeWorkflows === 'number' && cfg.activeWorkflows === 0) {
        return { name: plan, allowed: false };
      }
    } catch {
      /* ignore */
    }
    return { name: plan, allowed: allowedPlans.has(plan) };
  }

  private result(nodes: WorkflowNodeValidation[], plan: string, customerCount: number): WorkflowValidationResult {
    const errors = nodes.filter((n) => n.status === 'ERROR').length;
    const warnings = nodes.filter((n) => n.status === 'WARNING').length;
    const ok = errors === 0;
    const message = ok
      ? customerCount === 0
        ? 'All steps passed. The test used a sample customer — no real messages were sent.'
        : 'All steps passed. The test is simulated — no real messages were sent.'
      : `${errors} step${errors === 1 ? '' : 's'} need${errors === 1 ? 's' : ''} attention before this workflow can run.`;
    return {
      ok,
      simulated: true,
      testedAt: new Date().toISOString(),
      plan,
      nodes,
      errors,
      warnings,
      message,
    };
  }
}