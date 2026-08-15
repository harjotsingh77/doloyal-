/**
 * Workflows service — CRUD, AI generation, versioning, activation, runs,
 * analytics, plan gating and audit logging.
 *
 * Tenant isolation: all queries filter by tenantId and the Prisma tenant
 * middleware re-applies it at the DB layer (see TENANT_MODELS).
 */
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WorkflowAiService, type AiWorkflowReply } from './workflow-ai.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { validateDefinition, toCanonicalDefinition, type WorkflowDefinition } from './workflow-schema';
import { actionNeedsApproval, TRIGGER_REGISTRY, CONDITION_REGISTRY, ACTION_REGISTRY, TRIGGER_LABELS } from './workflow-capability.registry';

const ACTIVE_WORKFLOW_CAP: Record<string, number> = {
  free: 0,
  starter: 0,
  growth: 5,
  professional: 20,
  enterprise: -1,
};

const ALLOWED_WORKFLOW_PLANS = new Set(['growth', 'professional', 'enterprise']);

export interface WorkflowListQuery {
  search?: string;
  status?: string;
  sort?: string;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: WorkflowAiService,
    private readonly engine: WorkflowEngineService,
  ) {}

  // ─── Plan entitlements ─────────────────────────────────────────────────────

  private async getEntitlements(tenantId: string): Promise<{ allowed: boolean; plan: string; activeCap: number }> {
    let plan = 'free';
    try {
      const sub = await this.prisma.subscription.findFirst({ where: { tenantId } });
      plan = sub?.plan || 'free';
    } catch {
      /* default free */
    }
    let activeCap = ACTIVE_WORKFLOW_CAP[plan] ?? ACTIVE_WORKFLOW_CAP.free!;
    try {
      const override = await this.prisma.planConfig.findUnique({ where: { plan } });
      const cfg = (override?.config as any) || {};
      if (typeof cfg.activeWorkflows === 'number') activeCap = cfg.activeWorkflows;
      if (typeof cfg.workflowsEnabled === 'boolean') {
        return { allowed: cfg.workflowsEnabled, plan, activeCap };
      }
    } catch {
      /* ignore */
    }
    const allowed = ALLOWED_WORKFLOW_PLANS.has(plan) && activeCap !== 0;
    return { allowed, plan, activeCap };
  }

  // ─── Workflow serialization ────────────────────────────────────────────────

  private toSummary(wf: any) {
    const def = (wf.definition as unknown as WorkflowDefinition) || { name: wf.name, trigger: wf.trigger, nodes: [], edges: [] };
    const triggerType = wf.trigger?.type || def.trigger?.type || '';
    return {
      id: wf.id,
      tenantId: wf.tenantId,
      name: wf.name,
      description: wf.description,
      trigger: { type: triggerType, params: wf.trigger?.params || wf.trigger?.config || {} },
      triggerLabel: TRIGGER_LABELS[triggerType] || triggerType,
      status: wf.status,
      version: wf.version,
      activatedAt: wf.activatedAt?.toISOString(),
      pausedAt: wf.pausedAt?.toISOString(),
      lastRunAt: wf.lastRunAt?.toISOString(),
      createdAt: wf.createdAt.toISOString(),
      updatedAt: wf.updatedAt.toISOString(),
      runs: wf._count?.runs || 0,
      completedRuns: 0,
      failedRuns: 0,
      successRate: undefined,
      customersReached: wf._count?.customersReached || undefined,
    };
  }

  private async attachRunStats(items: any[]) {
    const out: any[] = [];
    for (const item of items) {
      const [completed, failed] = await Promise.all([
        this.prisma.workflowRun.count({ where: { workflowId: item.id, status: 'COMPLETED' } }),
        this.prisma.workflowRun.count({ where: { workflowId: item.id, status: 'FAILED' } }),
      ]);
      const runs = (item._count?.runs || 0);
      out.push({
        ...this.toSummary(item),
        completedRuns: completed,
        failedRuns: failed,
        successRate: runs > 0 ? Math.round(((runs - failed) / runs) * 1000) / 10 : undefined,
      });
    }
    return out;
  }

  // ─── List / Get ────────────────────────────────────────────────────────────

  async list(tenantId: string, query: WorkflowListQuery = {}) {
    const where: any = { tenantId, archivedAt: null };
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const orderBy: any =
      query.sort === 'most_used' || query.sort === 'most_successful'
        ? { lastRunAt: 'desc' }
        : query.sort === 'recent'
          ? { updatedAt: 'desc' }
          : { updatedAt: 'desc' };

    const workflows = await this.prisma.workflow.findMany({
      where,
      orderBy,
      take: 100,
      include: { _count: { select: { runs: true } } },
    });
    return this.attachRunStats(workflows);
  }

  async get(tenantId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId, archivedAt: null } });
    if (!wf) throw new NotFoundException('Workflow not found');
    const [versions, runs] = await Promise.all([
      this.prisma.workflowVersion.findMany({
        where: { workflowId: id },
        orderBy: { version: 'desc' },
        take: 20,
      }),
      this.prisma.workflowRun.findMany({
        where: { workflowId: id },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: { steps: { orderBy: { createdAt: 'asc' } } },
      }),
    ]);

    const runInfos = await Promise.all(
      runs.map(async (r) => {
        let customerName: string | undefined;
        if (r.customerId) {
          const c = await this.prisma.customer.findFirst({ where: { id: r.customerId, tenantId } });
          customerName = c ? `${c.firstName} ${c.lastName}` : undefined;
        }
        return {
          id: r.id,
          workflowId: r.workflowId,
          customerId: r.customerId,
          customerName,
          version: r.version,
          status: r.status,
          trigger: r.trigger,
          startedAt: r.startedAt?.toISOString(),
          completedAt: r.completedAt?.toISOString(),
          error: r.error,
          createdAt: r.createdAt.toISOString(),
          steps: r.steps.map((s) => ({
            id: s.id,
            nodeKey: s.nodeKey,
            type: s.type,
            status: s.status,
            attempt: s.attempt,
            startedAt: s.startedAt?.toISOString(),
            completedAt: s.completedAt?.toISOString(),
            error: s.error,
            output: s.output,
          })),
        };
      }),
    );

    const base = this.toSummary(wf);
    return {
      ...base,
      definition: wf.definition,
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
        activatedAt: v.activatedAt?.toISOString(),
      })),
      recentRuns: runInfos,
    };
  }

  // ─── AI generation / editing ───────────────────────────────────────────────

  async generate(tenantId: string, userId: string, prompt: string): Promise<{ reply: AiWorkflowReply; workflow?: any }> {
    const reply = await this.ai.generate(tenantId, prompt);
    if (reply.needsClarification || !reply.definition) {
      return { reply };
    }
    const workflow = await this.persistDefinition(tenantId, userId, reply.definition, 'AI_GENERATED');
    return { reply, workflow: await this.get(tenantId, workflow.id) };
  }

  async editViaAi(
    tenantId: string,
    userId: string,
    id: string,
    instruction: string,
    opts: { definition?: any; context?: string } = {},
  ) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    const current = (opts.definition as unknown as WorkflowDefinition) ||
      ((wf.definition as unknown as WorkflowDefinition) || {
        name: wf.name,
        description: wf.description,
        trigger: wf.trigger as any,
        nodes: [],
        edges: [],
      });
    const reply = await this.ai.edit(tenantId, current, instruction, opts.context);
    if (!reply.definition) {
      return { reply, workflow: await this.get(tenantId, id) };
    }
    const updated = await this.persistDefinition(tenantId, userId, reply.definition, 'AI_EDIT', wf);
    return { reply, workflow: await this.get(tenantId, updated.id) };
  }

  async explain(tenantId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    const summary = await this.ai.explain(wf.definition as unknown as WorkflowDefinition);
    return { summary };
  }

  /**
   * Persist a definition. When the workflow is ACTIVE, this creates a new DRAFT
   * version (the running version is never mutated). Otherwise it updates in place.
   */
  private async persistDefinition(
    tenantId: string,
    userId: string,
    def: WorkflowDefinition,
    action: string,
    existing?: any,
  ) {
    const validated = validateDefinition(def as any);
    if (!validated.valid) {
      throw new BadRequestException(`Workflow is invalid: ${validated.errors.join(' ')}`);
    }
    const canonical = validated.definition!;

    if (existing) {
      if (existing.status === 'ACTIVE') {
        // create a new draft version
        const nextVersion = existing.version + 1;
        await this.prisma.workflowVersion.create({
          data: {
            workflowId: existing.id,
            version: nextVersion,
            status: 'DRAFT',
            definition: canonical as any,
            createdBy: userId,
          },
        });
        const updated = await this.prisma.workflow.update({
          where: { id: existing.id },
          data: { definition: canonical as any, version: nextVersion, status: 'DRAFT', activatedAt: null, pausedAt: null },
        });
        await this.replaceNodesAndEdges(existing.id, canonical);
        await this.audit(tenantId, existing.id, userId, action, updated.version, { versionBump: true });
        return updated;
      }
      const updated = await this.prisma.workflow.update({
        where: { id: existing.id },
        data: { definition: canonical as any, name: canonical.name, description: canonical.description, trigger: canonical.trigger as any },
      });
      await this.replaceNodesAndEdges(existing.id, canonical);
      await this.audit(tenantId, existing.id, userId, action, updated.version);
      return updated;
    }

    const wf = await this.prisma.workflow.create({
      data: {
        tenantId,
        name: canonical.name,
        description: canonical.description,
        trigger: canonical.trigger as any,
        definition: canonical as any,
        status: 'DRAFT',
        version: 1,
        createdBy: userId,
      },
    });
    await this.replaceNodesAndEdges(wf.id, canonical);
    await this.prisma.workflowVersion.create({
      data: { workflowId: wf.id, version: 1, status: 'DRAFT', definition: canonical as any, createdBy: userId },
    });
    await this.audit(tenantId, wf.id, userId, action, 1, { generated: true });
    return wf;
  }

  private async replaceNodesAndEdges(workflowId: string, def: WorkflowDefinition) {
    await this.prisma.workflowEdge.deleteMany({ where: { workflowId } });
    await this.prisma.workflowNode.deleteMany({ where: { workflowId } });
    await this.prisma.workflowNode.createMany({
      data: def.nodes.map((n, i) => ({
        workflowId,
        nodeKey: n.id,
        type: n.type,
        label: n.label || n.type,
        config: (n.config || {}) as any,
        position: i,
      })),
    });
    await this.prisma.workflowEdge.createMany({
      data: def.edges.map((e) => ({
        workflowId,
        sourceNode: e.source,
        targetNode: e.target,
        outcome: e.outcome ?? null,
      })),
    });
  }

  // ─── Manual save / create from template ────────────────────────────────────

  async save(tenantId: string, userId: string, id: string, definition: WorkflowDefinition) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    const updated = await this.persistDefinition(tenantId, userId, definition, 'MANUAL_EDIT', wf);
    return this.get(tenantId, updated.id);
  }

  async createFromTemplate(tenantId: string, userId: string, templateId: string) {
    const tpl = await this.prisma.workflowTemplate.findUnique({ where: { id: templateId } });
    if (!tpl) throw new NotFoundException('Template not found');
    const def = toCanonicalDefinition(tpl.definition as any);
    const wf = await this.persistDefinition(tenantId, userId, def, 'TEMPLATE_CREATED');
    return this.get(tenantId, wf.id);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async activate(tenantId: string, userId: string, id: string, confirm: { audience?: number } = {}) {
    const { allowed, activeCap } = await this.getEntitlements(tenantId);
    if (!allowed) {
      throw new ForbiddenException(
        { code: 'PLAN_LIMIT', message: 'AI Workflows are available on the Growth plan and above.' },
      ) as any;
    }

    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');

    if (wf.status === 'ACTIVE') throw new BadRequestException('Workflow is already active');

    if (activeCap !== -1) {
      const activeCount = await this.prisma.workflow.count({ where: { tenantId, status: 'ACTIVE', archivedAt: null } });
      if (activeCount >= activeCap) {
        throw new ForbiddenException(
          { code: 'PLAN_LIMIT', message: `Your plan allows ${activeCap} active workflows. Pause or archive one to continue.` },
        ) as any;
      }
    }

    const def = wf.definition as unknown as WorkflowDefinition;
    const hasExternalActions = def.nodes.some(
      (n) => n.type === 'action' && actionNeedsApproval(String(n.config?.type || n.data?.type || '')),
    );

    const audience = confirm.audience ?? (await this.estimateAudience(tenantId, def));

    await this.prisma.workflow.update({
      where: { id },
      data: { status: 'ACTIVE', activatedAt: new Date(), pausedAt: null },
    });
    await this.prisma.workflowVersion.updateMany({
      where: { workflowId: id, version: wf.version },
      data: { status: 'ACTIVE', activatedAt: new Date() },
    });
    await this.audit(tenantId, id, userId, 'WORKFLOW_ACTIVATED', wf.version, {
      audience,
      externalActions: hasExternalActions,
    });
    return { workflow: await this.get(tenantId, id), audience, externalActions: hasExternalActions };
  }

  async pause(tenantId: string, userId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    if (wf.status !== 'ACTIVE') throw new BadRequestException('Only active workflows can be paused.');
    await this.prisma.workflow.update({
      where: { id },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });
    await this.audit(tenantId, id, userId, 'WORKFLOW_PAUSED', wf.version);
    return this.get(tenantId, id);
  }

  async resume(tenantId: string, userId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    if (wf.status !== 'PAUSED') throw new BadRequestException('Only paused workflows can be resumed.');
    const { allowed } = await this.getEntitlements(tenantId);
    if (!allowed) {
      throw new ForbiddenException({ code: 'PLAN_LIMIT', message: 'Workflows are available on the Growth plan and above.' }) as any;
    }
    await this.prisma.workflow.update({
      where: { id },
      data: { status: 'ACTIVE', pausedAt: null, activatedAt: wf.activatedAt || new Date() },
    });
    await this.audit(tenantId, id, userId, 'WORKFLOW_RESUMED', wf.version);
    return this.get(tenantId, id);
  }

  async duplicate(tenantId: string, userId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    const def = wf.definition as unknown as WorkflowDefinition;
    const copy = await this.prisma.workflow.create({
      data: {
        tenantId,
        name: `${wf.name} (copy)`,
        description: wf.description,
        trigger: wf.trigger as any,
        definition: def as any,
        status: 'DRAFT',
        version: 1,
        createdBy: userId,
      },
    });
    await this.replaceNodesAndEdges(copy.id, def);
    await this.prisma.workflowVersion.create({
      data: { workflowId: copy.id, version: 1, status: 'DRAFT', definition: def as any, createdBy: userId },
    });
    await this.audit(tenantId, copy.id, userId, 'WORKFLOW_DUPLICATED', 1, { sourceWorkflowId: id });
    return this.get(tenantId, copy.id);
  }

  async archive(tenantId: string, userId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    await this.prisma.workflow.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date(), pausedAt: new Date() },
    });
    await this.audit(tenantId, id, userId, 'WORKFLOW_ARCHIVED', wf.version);
    return { ok: true, id };
  }

  // ─── Testing / simulation ──────────────────────────────────────────────────

  async test(tenantId: string, userId: string, id: string, mode: 'preview' | 'sample' | 'real' = 'sample') {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');

    let customerId: string | null = null;
    if (mode === 'sample') {
      const sample = await this.prisma.customer.findFirst({ where: { tenantId } });
      customerId = sample?.id || null;
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        tenantId,
        workflowId: id,
        version: wf.version,
        customerId,
        status: 'QUEUED',
        trigger: 'TEST',
        triggerData: { test: true, mode } as any,
        idempotencyKey: `test:${wf.id}:${Date.now()}`,
      },
    });
    await this.audit(tenantId, id, userId, 'WORKFLOW_TESTED', wf.version, { mode });
    await this.engine.executeRun(run.id);
    return this.getRun(tenantId, run.id);
  }

  // ─── Runs & analytics ──────────────────────────────────────────────────────

  async listRuns(tenantId: string, id: string, query: { limit?: number; status?: string }) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    const runs = await this.prisma.workflowRun.findMany({
      where: { workflowId: id, ...(query.status ? { status: query.status as any } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit || 25, 100),
      include: { steps: { orderBy: { createdAt: 'asc' as const } } },
    });
    return Promise.all(
      runs.map(async (r) => {
        let customerName: string | undefined;
        if (r.customerId) {
          const c = await this.prisma.customer.findFirst({ where: { id: r.customerId, tenantId } });
          customerName = c ? `${c.firstName} ${c.lastName}` : undefined;
        }
        return {
          id: r.id,
          workflowId: r.workflowId,
          customerId: r.customerId,
          customerName,
          version: r.version,
          status: r.status,
          trigger: r.trigger,
          startedAt: r.startedAt?.toISOString(),
          completedAt: r.completedAt?.toISOString(),
          error: r.error,
          createdAt: r.createdAt.toISOString(),
          steps: r.steps.map((s) => ({
            id: s.id,
            nodeKey: s.nodeKey,
            type: s.type,
            status: s.status,
            attempt: s.attempt,
            startedAt: s.startedAt?.toISOString(),
            completedAt: s.completedAt?.toISOString(),
            error: s.error,
            output: s.output,
          })),
        };
      }),
    );
  }

  async getRun(tenantId: string, runId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, tenantId },
      include: { steps: { orderBy: { createdAt: 'asc' } } },
    });
    if (!run) throw new NotFoundException('Run not found');
    let customerName: string | undefined;
    if (run.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: run.customerId, tenantId } });
      customerName = c ? `${c.firstName} ${c.lastName}` : undefined;
    }
    return {
      id: run.id,
      workflowId: run.workflowId,
      customerId: run.customerId,
      customerName,
      version: run.version,
      status: run.status,
      trigger: run.trigger,
      startedAt: run.startedAt?.toISOString(),
      completedAt: run.completedAt?.toISOString(),
      error: run.error,
      createdAt: run.createdAt.toISOString(),
      steps: run.steps.map((s) => ({
        id: s.id,
        nodeKey: s.nodeKey,
        type: s.type,
        status: s.status,
        attempt: s.attempt,
        startedAt: s.startedAt?.toISOString(),
        completedAt: s.completedAt?.toISOString(),
        error: s.error,
        output: s.output,
      })),
    };
  }

  async retryRun(tenantId: string, userId: string, runId: string) {
    const run = await this.prisma.workflowRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException('Run not found');
    if (run.status !== 'FAILED') throw new BadRequestException('Only failed runs can be retried.');
    await this.prisma.workflowRunStep.deleteMany({ where: { runId } });
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'QUEUED', error: null, completedAt: null, startedAt: null },
    });
    await this.audit(tenantId, run.workflowId, userId, 'RUN_RETRIED', run.version, { runId });
    await this.engine.executeRun(runId);
    return this.getRun(tenantId, runId);
  }

  async analytics(tenantId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');

    const [totalRuns, completedRuns, failedRuns, runningRuns, distinctCustomers] =
      await Promise.all([
        this.prisma.workflowRun.count({ where: { workflowId: id } }),
        this.prisma.workflowRun.count({ where: { workflowId: id, status: 'COMPLETED' } }),
        this.prisma.workflowRun.count({ where: { workflowId: id, status: 'FAILED' } }),
        this.prisma.workflowRun.count({ where: { workflowId: id, status: { in: ['QUEUED', 'RUNNING'] } } }),
        this.prisma.workflowRun.count({ where: { workflowId: id, customerId: { not: null } } }),
      ]);

    // Count messaging + reward actions from completed runs' step outputs.
    const completedSteps = await this.prisma.workflowRunStep.findMany({
      where: { run: { workflowId: id, status: 'COMPLETED' }, type: 'action', status: 'COMPLETED' },
      select: { output: true },
    });
    let messagesSent = 0;
    let rewardsGenerated = 0;
    for (const s of completedSteps) {
      const out = (s.output as any) || {};
      if (out.channel) messagesSent += 1;
      if (out.rewardId) rewardsGenerated += 1;
    }

    const successRate = totalRuns > 0 ? Math.round(((totalRuns - failedRuns) / totalRuns) * 1000) / 10 : 0;

    return {
      workflowId: id,
      name: wf.name,
      status: wf.status,
      totalRuns,
      completedRuns,
      failedRuns,
      runningRuns,
      customersReached: distinctCustomers,
      messagesSent,
      rewardsGenerated,
      bookingsGenerated: 0,
      revenueGenerated: 0,
      successRate,
    };
  }

  async estimateAudience(tenantId: string, def: WorkflowDefinition): Promise<number> {
    const type = def.trigger?.type;
    try {
      if (type === 'customer_inactive') {
        const days = Number(def.trigger?.params?.days || 30);
        const cutoff = new Date(Date.now() - days * 86400000);
        return this.prisma.customer.count({
          where: { tenantId, status: 'ACTIVE', OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }] },
        });
      }
      if (type === 'customer_birthday') {
        return this.prisma.customer.count({ where: { tenantId, dob: { not: null } } });
      }
      if (type === 'points_threshold_reached') {
        const points = Number(def.trigger?.params?.points || 1000);
        return this.prisma.customer.count({ where: { tenantId, pointsBalance: { gte: points } } });
      }
      if (type?.startsWith('customer_') || type?.startsWith('appointment_')) {
        return this.prisma.customer.count({ where: { tenantId } });
      }
      return this.prisma.customer.count({ where: { tenantId } });
    } catch {
      return 0;
    }
  }

  // ─── Templates / catalog / audit ───────────────────────────────────────────

  async listTemplates() {
    const rows = await this.prisma.workflowTemplate.findMany({ orderBy: { category: 'asc' } });
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      definition: t.definition,
    }));
  }

  async seedTemplatesIfEmpty() {
    const count = await this.prisma.workflowTemplate.count();
    if (count > 0) return;
    const templates = [
      {
        name: '30-Day Win Back',
        category: 'Retention',
        description: 'Bring back customers who have not visited in 30 days with a WhatsApp nudge then a reward.',
        definition: {
          name: '30-Day Win Back',
          description: 'Bring back customers who have not visited in 30 days.',
          trigger: { type: 'customer_inactive', params: { days: 30 } },
          nodes: [
            { id: 'trigger', type: 'trigger', label: 'Customer inactive', config: { days: 30 } },
            { id: 'step_1', type: 'action', label: 'Send WhatsApp', config: { type: 'send_whatsapp', message: 'We miss you at {business_name}, {first_name}! Here\u2019s a treat to welcome you back.' } },
            { id: 'step_2', type: 'delay', label: 'Wait 7 days', config: { duration: '7d' } },
            { id: 'step_3', type: 'condition', label: 'Customer returned?', config: { condition: 'customer_booked_again', operator: 'equals', value: false } },
            { id: 'step_4', type: 'action', label: 'Win-back reward', config: { type: 'create_reward', name: 'Win-Back Reward', value: '₹200 OFF', message: 'Still thinking about us? Enjoy ₹200 OFF your next visit.' } },
            { id: 'end', type: 'end', label: 'End', config: {} },
          ],
          edges: [
            { source: 'trigger', target: 'step_1' },
            { source: 'step_1', target: 'step_2' },
            { source: 'step_2', target: 'step_3' },
            { source: 'step_3', target: 'step_4', outcome: 'false' },
            { source: 'step_3', target: 'end', outcome: 'true' },
            { source: 'step_4', target: 'end' },
          ],
        },
      },
      {
        name: 'Birthday Reward',
        category: 'Retention',
        description: 'Send a birthday reward to every customer.',
        definition: {
          name: 'Birthday Reward',
          description: 'Send a birthday reward to every customer.',
          trigger: { type: 'customer_birthday', params: {} },
          nodes: [
            { id: 'trigger', type: 'trigger', label: 'Birthday', config: {} },
            { id: 'step_1', type: 'action', label: 'Send reward', config: { type: 'create_reward', name: 'Birthday Reward', message: 'Happy birthday {first_name}! Here\u2019s a gift from {business_name}.' } },
            { id: 'end', type: 'end', label: 'End', config: {} },
          ],
          edges: [
            { source: 'trigger', target: 'step_1' },
            { source: 'step_1', target: 'end' },
          ],
        },
      },
      {
        name: 'Appointment Reminder',
        category: 'Booking',
        description: 'Remind customers 24 hours before their appointment.',
        definition: {
          name: 'Appointment Reminder',
          description: 'Remind customers 24 hours before their appointment.',
          trigger: { type: 'appointment_booked', params: {} },
          nodes: [
            { id: 'trigger', type: 'trigger', label: 'Appointment booked', config: {} },
            { id: 'step_1', type: 'action', label: 'Booking reminder', config: { type: 'send_booking_reminder', channel: 'WHATSAPP' } },
            { id: 'end', type: 'end', label: 'End', config: {} },
          ],
          edges: [
            { source: 'trigger', target: 'step_1' },
            { source: 'step_1', target: 'end' },
          ],
        },
      },
      {
        name: 'Post-Visit Review Request',
        category: 'Booking',
        description: 'Ask for a review after every completed appointment.',
        definition: {
          name: 'Post-Visit Review Request',
          description: 'After a completed appointment, ask for a review.',
          trigger: { type: 'appointment_completed', params: {} },
          nodes: [
            { id: 'trigger', type: 'trigger', label: 'Appointment completed', config: {} },
            { id: 'step_1', type: 'delay', label: 'Wait 2 hours', config: { duration: '2h' } },
            { id: 'step_2', type: 'action', label: 'Send review request', config: { type: 'send_whatsapp', message: 'Thanks for visiting {business_name}! We\u2019d love your feedback.' } },
            { id: 'end', type: 'end', label: 'End', config: {} },
          ],
          edges: [
            { source: 'trigger', target: 'step_1' },
            { source: 'step_1', target: 'step_2' },
            { source: 'step_2', target: 'end' },
          ],
        },
      },
      {
        name: 'Points Milestone Reward',
        category: 'Loyalty',
        description: 'Send a VIP reward when a customer reaches 1,000 points.',
        definition: {
          name: 'Points Milestone Reward',
          description: 'Send a VIP reward at 1,000 points.',
          trigger: { type: 'points_threshold_reached', params: { points: 1000 } },
          nodes: [
            { id: 'trigger', type: 'trigger', label: '1,000 points', config: {} },
            { id: 'step_1', type: 'action', label: 'Send VIP reward', config: { type: 'create_reward', name: 'VIP Reward', message: 'You\u2019ve hit 1,000 points {first_name}! Enjoy a VIP reward.' } },
            { id: 'end', type: 'end', label: 'End', config: {} },
          ],
          edges: [
            { source: 'trigger', target: 'step_1' },
            { source: 'step_1', target: 'end' },
          ],
        },
      },
      {
        name: 'Membership Expiry Reminder',
        category: 'Membership',
        description: 'Remind customers about memberships that expire in 7 days.',
        definition: {
          name: 'Membership Expiry Reminder',
          description: 'Remind customers 7 days before membership expiry.',
          trigger: { type: 'membership_expiring', params: { days: 7 } },
          nodes: [
            { id: 'trigger', type: 'trigger', label: 'Membership expiring', config: {} },
            { id: 'step_1', type: 'action', label: 'Send reminder', config: { type: 'send_membership_reminder', message: 'Hi {first_name}, your {business_name} membership expires soon.' } },
            { id: 'end', type: 'end', label: 'End', config: {} },
          ],
          edges: [
            { source: 'trigger', target: 'step_1' },
            { source: 'step_1', target: 'end' },
          ],
        },
      },
    ];
    await this.prisma.workflowTemplate.createMany({ data: templates as any });
    this.logger.log(`Seeded ${templates.length} workflow templates`);
  }

  async catalog() {
    return {
      triggers: TRIGGER_REGISTRY,
      conditions: CONDITION_REGISTRY,
      actions: ACTION_REGISTRY,
    };
  }

  async auditLogs(tenantId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    const logs = await this.prisma.workflowAuditLog.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return logs.map((l) => ({
      id: l.id,
      workflowId: l.workflowId,
      actorName: l.actorName,
      action: l.action,
      version: l.version,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  private async audit(
    tenantId: string,
    workflowId: string,
    userId: string,
    action: string,
    version?: number,
    details?: Record<string, unknown>,
  ) {
    try {
      let actorName: string | undefined;
      if (userId) {
        const u = await this.prisma.user.findUnique({ where: { id: userId } });
        actorName = u ? `${u.firstName} ${u.lastName}`.trim() : undefined;
      }
      await this.prisma.workflowAuditLog.create({
        data: {
          workflowId,
          actorId: userId || null,
          actorName,
          action,
          version: version ?? null,
          details: details ? (details as any) : undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Audit log failed: ${err?.message}`);
    }
  }
}
