/**
 * Workflow Engine — deterministic execution of approved workflows.
 *
 * The AI never executes actions. It produces a validated definition; this
 * engine walks the node graph, evaluates conditions against real customer
 * data, runs approved actions, schedules delays, retries failures and records
 * every step into workflow_runs / workflow_run_steps.
 *
 * Multi-tenant safety: every query is scoped with the run's tenantId and the
 * Prisma tenant middleware re-applies it at the DB layer.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  getAction,
  getCondition,
} from './workflow-capability.registry';
import {
  parseDurationMs,
  type WorkflowDefinition,
  type WorkflowNode,
} from './workflow-schema';

type RunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'RETRYING';

interface StepRecord {
  nodeKey: string;
  type: string;
  status: StepStatus;
  attempt: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  output?: Record<string, unknown>;
}

const MESSAGE_ACTIONS = new Set([
  'send_email',
  'send_sms',
  'send_whatsapp',
  'send_booking_reminder',
  'send_rebooking_message',
  'send_membership_reminder',
]);

/** Actions that mutate state and must never be retried blindly. */
const NON_IDEMPOTENT_ACTIONS = new Set([
  'add_points',
  'remove_points',
  'create_reward',
  'add_tag',
  'remove_tag',
  'create_task',
]);

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [0, 2000, 6000];

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  /** Simple in-process rate limiter: tenantId -> message count per minute. */
  private rateBuckets = new Map<string, { minute: number; count: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private allowMessage(tenantId: string, limitPerMinute = 100): boolean {
    const nowMinute = Math.floor(Date.now() / 60000);
    const bucket = this.rateBuckets.get(tenantId);
    if (!bucket || bucket.minute !== nowMinute) {
      this.rateBuckets.set(tenantId, { minute: nowMinute, count: 1 });
      return true;
    }
    if (bucket.count >= limitPerMinute) return false;
    bucket.count += 1;
    return true;
  }

  // ─── Event entrypoint ──────────────────────────────────────────────────────

  /**
   * Called by module hooks when a real application event occurs.
   * Finds ACTIVE (not paused) workflows whose trigger matches and enqueues a run.
   */
  async handleEvent(
    tenantId: string,
    eventType: string,
    payload: { customerId?: string; appointmentId?: string; [k: string]: unknown },
  ): Promise<string[]> {
    if (!tenantId) return [];
    const workflows = await this.prisma.workflow.findMany({
      where: { tenantId, status: 'ACTIVE', archivedAt: null },
    });
    const enqueued: string[] = [];

    for (const wf of workflows) {
      const trigger = (wf.trigger as any) || {};
      if (trigger.type !== eventType) continue;
      if (eventType.startsWith('customer_inactive') || eventType.startsWith('customer_birthday')) continue;

      const customerId = payload.customerId;
      const idempotencyKey = `wf:${wf.id}:${eventType}:${customerId || 'x'}:${wf.version}:${this.eventFingerprint(payload)}`;

      const existing = await this.prisma.workflowRun.findUnique({
        where: { idempotencyKey },
      });
      if (existing) continue;

      const run = await this.prisma.workflowRun.create({
        data: {
          tenantId,
          workflowId: wf.id,
          version: wf.version,
          customerId,
          status: 'QUEUED',
          trigger: eventType,
          triggerData: payload as any,
          idempotencyKey,
        },
      });
      enqueued.push(run.id);
      this.prisma.workflow
        .update({ where: { id: wf.id }, data: { lastRunAt: new Date() } })
        .catch(() => undefined);
      void this.executeRun(run.id);
    }
    return enqueued;
  }

  private eventFingerprint(payload: Record<string, unknown>): string {
    const sorted = Object.keys(payload)
      .sort()
      .map((k) => `${k}:${String(payload[k])}`)
      .join('|');
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) hash = (hash * 31 + sorted.charCodeAt(i)) >>> 0;
    return hash.toString(36);
  }

  // ─── Run execution ─────────────────────────────────────────────────────────

  async executeRun(runId: string): Promise<void> {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
    });
    if (!run || run.status === 'COMPLETED' || run.status === 'CANCELLED') return;

    const workflow = await this.prisma.workflow.findUnique({
      where: { id: run.workflowId },
    });
    if (!workflow) {
      await this.markRun(runId, 'FAILED', 'Workflow deleted');
      return;
    }

    const def = workflow.definition as unknown as WorkflowDefinition;
    const customer = run.customerId
      ? await this.prisma.customer.findUnique({ where: { id: run.customerId } })
      : null;
    // Guard: a run can only ever touch the customer on the same tenant.
    if (customer && customer.tenantId !== run.tenantId) {
      await this.markRun(runId, 'FAILED', 'Tenant isolation violation');
      return;
    }

    if (run.status === 'QUEUED') {
      await this.markRun(runId, 'RUNNING');
    }

    // Resolve start node: node after the trigger (or the first node).
    const startNode = this.resolveStartNode(def, run.triggerData as any);
    await this.traverse(runId, def, startNode, { customer: customer as any, payload: run.triggerData as any });
  }

  private resolveStartNode(def: WorkflowDefinition, triggerData: any): string {
    const triggerNode = def.nodes.find((n) => n.type === 'trigger');
    if (triggerNode) {
      const edge = def.edges.find((e) => e.source === triggerNode.id);
      if (edge) return edge.target;
      return triggerNode.id;
    }
    const step = triggerData?.stepId;
    return step || def.nodes[0]?.id || '';
  }

  private async traverse(
    runId: string,
    def: WorkflowDefinition,
    startNodeId: string,
    ctx: { customer: any; payload: any },
    visited = new Set<string>(),
  ): Promise<void> {
    let currentId = startNodeId;
    while (currentId) {
      if (visited.has(currentId)) {
        await this.markRun(runId, 'FAILED', 'Workflow loop detected');
        return;
      }
      visited.add(currentId);

      const node = def.nodes.find((n) => n.id === currentId);
      if (!node) break;

      if (node.type === 'end') {
        await this.recordStep(runId, node, { status: 'COMPLETED', output: { end: true } });
        break;
      }

      if (node.type === 'delay') {
        const resumeAt = new Date(Date.now() + parseDurationMs(String(node.config?.duration || node.data?.duration || '1d')));
        await this.recordStep(runId, node, { status: 'PENDING', output: { resumeAt: resumeAt.toISOString() } });
        return; // resume later via scheduler
      }

      if (node.type === 'condition') {
        const outcome = await this.evaluateCondition(ctx.customer, node, ctx.payload);
        await this.recordStep(runId, node, {
          status: 'COMPLETED',
          output: { outcome: outcome ? 'true' : 'false', condition: node.config?.condition || node.config?.key },
        });
        const next = def.edges.find(
          (e) => e.source === node.id && (e.outcome === null || e.outcome === undefined || e.outcome === String(outcome)),
        );
        currentId = next?.target || this.fallbackTarget(def, node.id);
        continue;
      }

      if (node.type === 'branch') {
        const outcome = await this.evaluateBranch(ctx.customer, node);
        const next = def.edges.find(
          (e) => e.source === node.id && (e.outcome === null || e.outcome === undefined || e.outcome === String(outcome)),
        );
        currentId = next?.target || this.fallbackTarget(def, node.id);
        continue;
      }

      if (node.type === 'action') {
        const handled = await this.runAction(runId, ctx.customer, node);
        if (handled.status === 'PENDING') return; // scheduled by rate-limit/retry
        if (handled.status === 'FAILED') return; // marked failed
        const next = def.edges.find(
          (e) => e.source === node.id && (e.outcome === null || e.outcome === undefined),
        );
        currentId = next?.target || this.fallbackTarget(def, node.id);
        continue;
      }

      // trigger node — move on
      const edge = def.edges.find((e) => e.source === node.id);
      currentId = edge?.target || this.fallbackTarget(def, node.id);
    }

    await this.completeRun(runId);
  }

  private fallbackTarget(def: WorkflowDefinition, sourceId: string): string {
    const idx = def.nodes.findIndex((n) => n.id === sourceId);
    const next = def.nodes[idx + 1];
    return next?.id || '';
  }

  private async completeRun(runId: string) {
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  private async markRun(runId: string, status: RunStatus, error?: string) {
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status,
        error: error || null,
        completedAt: status === 'RUNNING' ? null : new Date(),
      },
    });
  }

  private async recordStep(runId: string, node: WorkflowNode, partial: Partial<StepRecord>) {
    const existing = await this.prisma.workflowRunStep.findFirst({
      where: { runId, nodeKey: node.id },
    });
    if (existing) {
      await this.prisma.workflowRunStep.update({
        where: { id: existing.id },
        data: {
          status: partial.status || existing.status,
          attempt: partial.attempt ?? existing.attempt,
          startedAt: partial.startedAt || existing.startedAt,
          completedAt: partial.completedAt || existing.completedAt,
          error: partial.error ?? existing.error,
          output: partial.output ? (partial.output as any) : existing.output,
        },
      });
      return;
    }
    await this.prisma.workflowRunStep.create({
      data: {
        runId,
        nodeKey: node.id,
        type: node.type,
        status: (partial.status || 'RUNNING') as StepStatus,
        attempt: partial.attempt || 0,
        startedAt: partial.startedAt || new Date(),
        completedAt: partial.completedAt,
        error: partial.error,
        output: partial.output ? (partial.output as any) : undefined,
      },
    });
  }

  // ─── Conditions ────────────────────────────────────────────────────────────

  private async evaluateCondition(customer: any, node: WorkflowNode, payload: any): Promise<boolean> {
    const key = String(node.config?.condition || node.config?.key || node.data?.condition || 'customer_status');
    const operator = String(node.config?.operator || node.data?.operator || 'equals');
    const expected = node.config?.value ?? node.data?.value ?? node.config?.target;
    const cap = getCondition(key);
    if (!cap) return false;

    let actual: unknown;
    switch (key) {
      case 'last_visit_days': {
        const last = customer?.lastVisitAt;
        actual = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : 9999;
        break;
      }
      case 'total_visits':
        actual = customer?.totalVisits ?? 0;
        break;
      case 'total_spend':
        actual = customer?.totalSpent ?? 0;
        break;
      case 'customer_status':
        actual = customer?.status ?? 'ACTIVE';
        break;
      case 'customer_tag':
        actual = Array.isArray(customer?.tags) && customer.tags.includes(String(expected));
        break;
      case 'membership_status':
        actual = customer?.membershipStatus ?? 'NONE';
        break;
      case 'loyalty_points':
        actual = customer?.pointsBalance ?? 0;
        break;
      case 'birthday':
        actual = Boolean(customer?.dob);
        break;
      case 'has_email':
        actual = Boolean(customer?.email);
        break;
      case 'has_phone':
        actual = Boolean(customer?.phone);
        break;
      case 'has_whatsapp':
        actual = Boolean(customer?.phone);
        break;
      case 'customer_returned':
        actual = Boolean(payload?.returned);
        break;
      case 'customer_booked_again':
        actual = Boolean(payload?.bookedAgain);
        break;
      case 'appointment_status':
        actual = payload?.appointmentStatus ?? payload?.status;
        break;
      case 'campaign_opened':
        actual = Boolean(payload?.opened);
        break;
      case 'campaign_clicked':
        actual = Boolean(payload?.clicked);
        break;
      case 'payment_status':
        actual = payload?.paymentStatus;
        break;
      default:
        actual = payload?.[key] ?? customer?.[key];
    }

    return this.compare(actual, operator, expected);
  }

  private async evaluateBranch(customer: any, node: WorkflowNode): Promise<boolean> {
    // Branches typically encode if_true/if_false from AI; treat as condition result.
    const cond = node.config?.condition;
    if (cond && typeof cond === 'object') {
      return this.evaluateCondition(customer, { ...node, config: cond } as WorkflowNode, {});
    }
    return Boolean(node.config?.result);
  }

  private compare(actual: any, operator: string, expected: any): boolean {
    const a = typeof expected === 'number' ? Number(actual) : actual;
    const b = expected;
    switch (operator) {
      case 'equals':
        return String(a).toLowerCase() === String(b).toLowerCase();
      case 'not':
        return String(a).toLowerCase() !== String(b).toLowerCase();
      case 'gt':
        return Number(a) > Number(b);
      case 'gte':
        return Number(a) >= Number(b);
      case 'lt':
        return Number(a) < Number(b);
      case 'lte':
        return Number(a) <= Number(b);
      case 'contains':
        return String(a).toLowerCase().includes(String(b).toLowerCase());
      default:
        return false;
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  private async runAction(
    runId: string,
    customer: any,
    node: WorkflowNode,
  ): Promise<{ status: 'DONE' | 'PENDING' | 'FAILED' }> {
    const run = await this.prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) return { status: 'FAILED' };

    const actionType = String(node.config?.type || node.data?.type || 'notify_business_owner');
    const cap = getAction(actionType);
    if (!cap) {
      await this.recordStep(runId, node, {
        status: 'FAILED',
        error: `Action "${actionType}" is not supported.`,
        completedAt: new Date(),
      });
      await this.markRun(runId, 'FAILED', `Unsupported action ${actionType}`);
      return { status: 'FAILED' };
    }

    // Rate limiting for messaging actions → queue instead of burst.
    if (MESSAGE_ACTIONS.has(actionType)) {
      const resumeAt = new Date();
      if (!this.allowMessage(run.tenantId)) {
        resumeAt.setTime(Date.now() + 60000);
        await this.recordStep(runId, node, {
          status: 'PENDING',
          output: { resumeAt: resumeAt.toISOString(), reason: 'Rate limited' },
        });
        await this.markRun(runId, 'QUEUED');
        return { status: 'PENDING' };
      }
    }

    await this.recordStep(runId, node, { status: 'RUNNING', attempt: 0 });

    try {
      const output = await this.executeAction(run.tenantId, run.workflowId, customer, actionType, node.config || {});
      await this.recordStep(runId, node, { status: 'COMPLETED', output, completedAt: new Date() });
      return { status: 'DONE' };
    } catch (err: any) {
      const message = err?.message || String(err);
      const attempt = ((await this.countAttempts(runId, node.id)) || 0) + 1;

      if (attempt < MAX_RETRIES && !NON_IDEMPOTENT_ACTIONS.has(actionType)) {
        await this.recordStep(runId, node, {
          status: 'PENDING',
          attempt,
          error: message,
          output: { retry: true, attempt, retryAt: new Date(Date.now() + (RETRY_DELAYS_MS[attempt] || 0)).toISOString() },
        });
        await this.markRun(runId, 'QUEUED');
        return { status: 'PENDING' };
      }

      await this.recordStep(runId, node, {
        status: 'FAILED',
        attempt,
        error: message,
        completedAt: new Date(),
      });
      await this.markRun(runId, 'FAILED', message);
      return { status: 'FAILED' };
    }
  }

  private async countAttempts(runId: string, nodeKey: string): Promise<number> {
    const step = await this.prisma.workflowRunStep.findFirst({ where: { runId, nodeKey } });
    return step?.attempt || 0;
  }

  private async executeAction(
    tenantId: string,
    workflowId: string,
    customer: any,
    actionType: string,
    config: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    const vars = {
      first_name: customer?.firstName || 'there',
      customer_name: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'customer',
      business_name: '{business_name}',
    };
    const render = (s: string) =>
      String(s || '').replace(/\{\{?([a-z_]+)\}?\}/gi, (m, k: string) => (vars as any)[k.trim()] ?? m);

    switch (actionType) {
      case 'send_whatsapp':
      case 'send_sms':
      case 'send_email':
      case 'send_booking_reminder':
      case 'send_rebooking_message':
      case 'send_membership_reminder': {
        const channel = String(config.channel || (actionType === 'send_whatsapp' ? 'WHATSAPP' : actionType === 'send_sms' ? 'SMS' : 'EMAIL'));
        const body = render(config.message || config.body || `Hi ${vars.first_name}!`);
        const subject = config.subject ? render(String(config.subject)) : 'Doloyal';
        const recipient = customer?.email || customer?.phone || null;
        // Persist a notification record (real in-app audit of the message).
        await this.prisma.notification.create({
          data: {
            tenantId,
            customerId: customer?.id || null,
            type: 'WORKFLOW',
            channel,
            recipient,
            subject,
            body,
            status: 'SENT',
            sentAt: now,
            metadata: { workflowId },
          },
        });
        return { channel, simulated: true, sentAt: now.toISOString(), recipient };
      }

      case 'create_reward': {
        const reward = await this.prisma.reward.create({
          data: {
            tenantId,
            name: render(String(config.name || config.reward || 'Workflow Reward')),
            description: render(String(config.message || config.description || '')),
            rewardValue: Number(config.value || config.rewardValue || 0),
            discountVal: Number(config.value || config.rewardValue || 0),
            status: 'ACTIVE',
            category: 'WORKFLOW',
          },
        });
        return { rewardId: reward.id, rewardName: reward.name };
      }

      case 'add_points': {
        const amount = Number(config.points || config.amount || 0);
        if (customer && amount > 0) {
          const balanceAfter = (customer.pointsBalance || 0) + amount;
          await this.prisma.pointsLedger.create({
            data: {
              tenantId,
              customerId: customer.id,
              amount,
              balanceAfter,
              reason: 'Workflow automation',
            },
          });
          await this.prisma.customer.update({
            where: { id: customer.id },
            data: { pointsBalance: balanceAfter },
          });
          return { points: amount, balanceAfter };
        }
        return { points: 0 };
      }

      case 'remove_points': {
        const amount = Number(config.points || config.amount || 0);
        if (customer && amount > 0) {
          const balanceAfter = Math.max((customer.pointsBalance || 0) - amount, 0);
          await this.prisma.pointsLedger.create({
            data: { tenantId, customerId: customer.id, amount: -amount, balanceAfter, reason: 'Workflow automation' },
          });
          await this.prisma.customer.update({
            where: { id: customer.id },
            data: { pointsBalance: balanceAfter },
          });
          return { points: amount, balanceAfter };
        }
        return { points: 0 };
      }

      case 'add_tag': {
        const tag = String(config.tag || '');
        if (customer && tag) {
          const tags = Array.isArray(customer.tags) ? customer.tags : [];
          if (!tags.includes(tag)) {
            await this.prisma.customer.update({ where: { id: customer.id }, data: { tags: [...tags, tag] } });
          }
          return { tag, added: true };
        }
        return { tag };
      }

      case 'remove_tag': {
        const tag = String(config.tag || '');
        if (customer && tag) {
          const tags = Array.isArray(customer.tags) ? customer.tags : [];
          await this.prisma.customer.update({ where: { id: customer.id }, data: { tags: tags.filter((t: string) => t !== tag) } });
          return { tag, removed: true };
        }
        return { tag };
      }

      case 'notify_business_owner':
      case 'notify_staff': {
        await this.prisma.notification.create({
          data: {
            tenantId,
            customerId: customer?.id || null,
            type: 'WORKFLOW_ALERT',
            channel: 'IN_APP',
            subject: 'Workflow alert',
            body: render(String(config.message || config.title || `Workflow action ran for ${vars.customer_name}`)),
            status: 'SENT',
            sentAt: now,
            metadata: { workflowId, action: actionType },
          },
        });
        return { notified: true };
      }

      case 'create_task': {
        await this.prisma.notification.create({
          data: {
            tenantId,
            customerId: customer?.id || null,
            type: 'WORKFLOW_TASK',
            channel: 'IN_APP',
            subject: render(String(config.title || 'Follow-up task')),
            body: render(String(config.notes || config.message || '')),
            status: 'SENT',
            sentAt: now,
            metadata: { workflowId },
          },
        });
        return { task: String(config.title || 'Follow-up task') };
      }

      default:
        throw new Error(`Action "${actionType}" is not supported`);
    }
  }

  // ─── Scheduler: delays, retries, scan triggers ─────────────────────────────

  /**
   * Called on an interval. Resumes due runs (delay steps whose resumeAt passed)
   * and evaluates scan-based triggers (inactive / birthday / membership expiring).
   */
  async processDueRuns(): Promise<{ resumed: number; enqueued: number }> {
    let resumed = 0;
    let enqueued = 0;

    const dueSteps = await this.prisma.workflowRunStep.findMany({
      where: { status: 'PENDING', type: { in: ['delay', 'action'] } },
    });
    const now = Date.now();
    for (const step of dueSteps) {
      const output = (step.output as any) || {};
      const resumeAt = output.resumeAt ? new Date(output.resumeAt).getTime() : 0;
      const retryAt = output.retryAt ? new Date(output.retryAt).getTime() : 0;
      const due = (resumeAt && resumeAt <= now) || (retryAt && retryAt <= now);
      if (!due) continue;

      const run = await this.prisma.workflowRun.findUnique({ where: { id: step.runId } });
      if (!run || run.status !== 'QUEUED') continue;

      // For retries we re-run the same node; for delays we complete it and continue.
      if (output.retry) {
        const nodeKey = step.nodeKey;
        await this.prisma.workflowRunStep.update({
          where: { id: step.id },
          data: { status: 'RETRYING' },
        });
        await this.markRun(run.id, 'RUNNING');
        const def = await this.loadDefinition(run.workflowId);
        if (!def) continue;
        const node = def.nodes.find((n) => n.id === nodeKey);
        if (node) {
          await this.recordStep(run.id, node, { status: 'RUNNING', attempt: (output.attempt || 0) });
          const handled = await this.runAction(run.id, run.customerId ? await this.prisma.customer.findUnique({ where: { id: run.customerId } }) : null, node);
          if (handled.status === 'DONE') await this.continueFrom(run.id, def, node.id);
        }
        resumed += 1;
      } else {
        await this.prisma.workflowRunStep.update({
          where: { id: step.id },
          data: { status: 'COMPLETED', completedAt: new Date(), output: { ...output, waitedFor: output.resumeAt } },
        });
        await this.markRun(run.id, 'RUNNING');
        const def = await this.loadDefinition(run.workflowId);
        if (def) {
          await this.continueFrom(run.id, def, step.nodeKey);
        }
        resumed += 1;
      }
    }

    const scanned = await this.evaluateScanTriggers();
    enqueued += scanned;

    return { resumed, enqueued };
  }

  private async loadDefinition(workflowId: string): Promise<WorkflowDefinition | null> {
    const wf = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
    return wf ? (wf.definition as unknown as WorkflowDefinition) : null;
  }

  private async continueFrom(runId: string, def: WorkflowDefinition, afterNodeId: string) {
    const run = await this.prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) return;
    const customer = run.customerId ? await this.prisma.customer.findUnique({ where: { id: run.customerId } }) : null;
    const next = def.edges.find((e) => e.source === afterNodeId);
    await this.traverse(runId, def, next?.target || '', { customer: customer as any, payload: run.triggerData as any });
  }

  /**
   * Evaluates scan-style triggers (customer_inactive, customer_birthday,
   * membership_expiring) for ACTIVE workflows and enqueues idempotent runs.
   */
  private async evaluateScanTriggers(): Promise<number> {
    let enqueued = 0;
    const workflows = await this.prisma.workflow.findMany({
      where: { status: 'ACTIVE', archivedAt: null },
    });

    for (const wf of workflows) {
      const trigger = (wf.trigger as any) || {};
      const type = trigger.type;
      if (!['customer_inactive', 'customer_birthday', 'membership_expiring'].includes(type)) continue;

      const periodKey = Math.floor(Date.now() / 86400000).toString(); // daily bucket
      let customers: any[] = [];
      try {
        if (type === 'customer_inactive') {
          const days = Number(trigger.params?.days || trigger.config?.days || 30);
          const cutoff = new Date(Date.now() - days * 86400000);
          customers = await this.prisma.customer.findMany({
            where: { tenantId: wf.tenantId, status: 'ACTIVE', OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }] },
            take: 200,
          });
        } else if (type === 'customer_birthday') {
          const monthDay = new Date().toISOString().slice(5, 10);
          const all = await this.prisma.customer.findMany({ where: { tenantId: wf.tenantId, dob: { not: null } }, take: 500 });
          customers = all.filter((c) => c.dob && new Date(c.dob).toISOString().slice(5, 10) === monthDay);
        } else if (type === 'membership_expiring') {
          const days = Number(trigger.params?.days || trigger.config?.days || 7);
          const now = Date.now();
          const soon = now + days * 86400000;
          const rows = await this.prisma.customerMembership.findMany({
            where: { customer: { tenantId: wf.tenantId } },
            include: { customer: true, tier: true },
            take: 500,
          });
          customers = rows
            .map((r: any) => {
              const validityMs = Number(r.tier?.validityDays || 365) * 86400000;
              const exp = new Date(r.assignedAt).getTime() + validityMs;
              return exp > now && exp <= soon ? r.customer : null;
            })
            .filter(Boolean);
        }
      } catch (err: any) {
        this.logger.warn(`Scan trigger ${type} failed: ${err?.message}`);
        continue;
      }

      for (const customer of customers) {
        if (!customer) continue;
        const idempotencyKey = `wf:${wf.id}:${type}:${customer.id}:${periodKey}`;
        const existing = await this.prisma.workflowRun.findUnique({ where: { idempotencyKey } });
        if (existing) continue;
        await this.prisma.workflowRun.create({
          data: {
            tenantId: wf.tenantId,
            workflowId: wf.id,
            version: wf.version,
            customerId: customer.id,
            status: 'QUEUED',
            trigger: type,
            triggerData: { type, customerId: customer.id } as any,
            idempotencyKey,
          },
        });
        enqueued += 1;
      }
    }
    return enqueued;
  }
}
