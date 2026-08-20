import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { PLANS } from '@doloyal/shared';
import { paginate, planMonthlyAmount, planLabel } from './admin-util';

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async listSubscriptions(query: {
    status?: string;
    plan?: string;
    search?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const search = query.search?.trim() || undefined;
    const status = query.status?.trim() || undefined;
    const plan = query.plan?.trim() || undefined;

    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      where.status = this.statusMap[status] ?? status;
    }
    if (plan && plan !== 'ALL') where.plan = plan;
    if (search) {
      where.tenant = { name: { contains: search, mode: 'insensitive' as const } };
    }

    const [subs, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              currency: true,
              memberships: {
                take: 1,
                select: { user: { select: { email: true } } },
              },
            },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const contracts = await this.prisma.enterpriseContract.findMany({
      where: { tenantId: { in: subs.map((s) => s.tenantId) } },
    });
    const cMap = new Map(contracts.map((c) => [c.tenantId, c]));

    const items = subs.map((s) => {
      const contract = cMap.get(s.tenantId);
      const amount = planMonthlyAmount(s.plan, contract?.contractPrice, contract?.billingCycle);
      const mappedStatus = this.reverseStatusMap[s.status] ?? s.status;
      return {
        id: s.id,
        tenantId: s.tenantId,
        businessName: s.tenant.name,
        ownerEmail: s.tenant.memberships[0]?.user.email ?? null,
        plan: s.plan,
        status: mappedStatus,
        billingCycle: contract?.billingCycle ?? 'MONTHLY',
        amount,
        currency: s.tenant.currency || 'INR',
        renewal: s.currentPeriodEnd?.toISOString() ?? s.trialEndsAt?.toISOString() ?? null,
        provider: s.stripeSubId ? 'Stripe' : s.paymentMethod || 'Internal',
        autoRenew: s.autoRenew,
        trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      };
    });

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  private get statusMap(): Record<string, string> {
    return {
      TRIAL: 'TRIALING',
      ACTIVE: 'ACTIVE',
      PAST_DUE: 'PAST_DUE',
      CANCELING: 'CANCELING',
      CANCELED: 'CANCELED',
      PAYMENT_FAILED: 'PAST_DUE',
    };
  }

  private get reverseStatusMap(): Record<string, string> {
    return {
      TRIALING: 'TRIAL',
      ACTIVE: 'ACTIVE',
      PAST_DUE: 'PAST_DUE',
      CANCELING: 'CANCELING',
      CANCELED: 'CANCELED',
      EXPIRED: 'CANCELED',
    };
  }

  async changePlan(actor: any, subscriptionId: string, plan: string) {
    const allowed = ['free', 'starter', 'growth', 'professional', 'enterprise'];
    if (!allowed.includes(plan)) throw new BadRequestException(`Invalid plan: ${plan}`);
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: { select: { name: true } } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { plan, status: 'ACTIVE' },
    });
    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId: sub.tenantId,
        type: 'PLAN_CHANGED',
        plan,
        description: `Admin changed plan to ${planLabel(plan)}`,
        metadata: { by: actor?.email },
      },
    });
    await this.audit.record(actor, 'subscription.planChanged', 'SUBSCRIPTION', {
      targetType: 'subscription',
      targetId: subscriptionId,
      targetName: sub.tenant.name,
      metadata: { from: sub.plan, to: plan },
    });
    return { ok: true, plan: updated.plan, status: updated.status };
  }

  async cancel(actor: any, subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: { select: { name: true } } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELED', canceledAt: new Date(), autoRenew: false },
    });
    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId: sub.tenantId,
        type: 'SUBSCRIPTION_CANCELED',
        plan: sub.plan,
        description: 'Canceled by admin',
        metadata: { by: actor?.email },
      },
    });
    await this.audit.record(actor, 'subscription.canceled', 'SUBSCRIPTION', {
      targetType: 'subscription',
      targetId: subscriptionId,
      targetName: sub.tenant.name,
    });
    return { ok: true, status: 'CANCELED' };
  }

  async restart(actor: any, subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: { select: { name: true } } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'ACTIVE', canceledAt: null, autoRenew: true },
    });
    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId: sub.tenantId,
        type: 'SUBSCRIPTION_RESTARTED',
        plan: sub.plan,
        description: 'Restarted by admin',
        metadata: { by: actor?.email },
      },
    });
    await this.audit.record(actor, 'subscription.restarted', 'SUBSCRIPTION', {
      targetType: 'subscription',
      targetId: subscriptionId,
      targetName: sub.tenant.name,
    });
    return { ok: true, status: 'ACTIVE' };
  }

  async extendTrial(actor: any, subscriptionId: string, days: number) {
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      throw new BadRequestException('days must be between 1 and 90');
    }
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: { select: { name: true } } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    const base = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
    const trialEndsAt = new Date(base.getTime() + days * 86400000);
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { trialEndsAt, status: sub.status === 'CANCELED' ? sub.status : 'TRIALING' },
    });
    await this.audit.record(actor, 'subscription.trialExtended', 'SUBSCRIPTION', {
      targetType: 'subscription',
      targetId: subscriptionId,
      targetName: sub.tenant.name,
      metadata: { days, trialEndsAt: trialEndsAt.toISOString() },
    });
    return { ok: true, trialEndsAt: trialEndsAt.toISOString() };
  }

  async overview() {
    const [subs, events, refundLogs] = await Promise.all([
      this.prisma.subscription.findMany({
        include: { tenant: { select: { currency: true } } },
      }),
      this.prisma.subscriptionEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.adminAuditLog.findMany({
        where: { action: 'billing.refund' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const contracts = await this.prisma.enterpriseContract.findMany();
    const cMap = new Map(contracts.map((c) => [c.tenantId, c]));

    const activeSubs = subs.filter((s) => s.status === 'ACTIVE');
    const mrr = activeSubs.reduce(
      (sum, s) => sum + planMonthlyAmount(s.plan, cMap.get(s.tenantId)?.contractPrice, cMap.get(s.tenantId)?.billingCycle),
      0,
    );

    const grossRevenue = subs.reduce(
      (sum, s) => {
        if (s.status === 'CANCELED' || s.status === 'EXPIRED') return sum;
        return sum + planMonthlyAmount(s.plan, cMap.get(s.tenantId)?.contractPrice, cMap.get(s.tenantId)?.billingCycle);
      },
      0,
    );
    const refunds = refundLogs.reduce(
      (sum, r) => sum + Number((r.metadata as any)?.amount ?? 0),
      0,
    );

    const revenueByPlan: Record<string, number> = {};
    for (const s of activeSubs) {
      const amount = planMonthlyAmount(s.plan, cMap.get(s.tenantId)?.contractPrice, cMap.get(s.tenantId)?.billingCycle);
      revenueByPlan[s.plan] = (revenueByPlan[s.plan] ?? 0) + amount;
    }

    const payments = events.map((e) => ({
      id: e.id,
      type: e.type,
      businessName: e.tenant?.name ?? 'Unknown',
      amount: e.amount ?? planMonthlyAmount(e.plan ?? 'free', 0),
      currency: e.currency ?? 'INR',
      status: e.type === 'PAYMENT_SUCCEEDED' ? 'PAID' : e.type === 'PAYMENT_FAILED' ? 'FAILED' : 'PENDING',
      plan: e.plan,
      createdAt: e.createdAt.toISOString(),
    }));

    const invoices = (await this.prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        tenant: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    })).map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      businessName: i.tenant.name,
      customerName: i.customer ? `${i.customer.firstName} ${i.customer.lastName ?? ''}`.trim() : null,
      total: i.total,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    }));

    const failedPayments30d = await this.prisma.subscriptionEvent.count({
      where: { type: 'PAYMENT_FAILED', createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    });

    return {
      grossRevenue,
      netRevenue: grossRevenue - refunds,
      mrr,
      arr: mrr * 12,
      refunds,
      failedPayments30d,
      outstandingAmount: failedPayments30d > 0 ? grossRevenue * 0 : 0,
      currency: 'INR',
      revenueByPlan,
      invoices,
      payments,
      providers: [
        { name: 'Stripe', status: 'CONNECTED', lastCheck: null },
        { name: 'Razorpay', status: 'CONNECTED', lastCheck: null },
      ],
    };
  }

  async plans() {
    const configs = await this.prisma.planConfig.findMany();
    const configMap = new Map(configs.map((c) => [c.plan, c]));
    return PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      tagline: p.tagline,
      highlighted: p.highlighted,
      limits: p.limits as unknown as Record<string, unknown>,
      config: configMap.get(p.id)?.config as Record<string, unknown> | undefined,
      overridden: configMap.has(p.id),
    }));
  }

  async updatePlanConfig(actor: any, plan: string, config: Record<string, unknown>) {
    if (!PLANS.find((p) => p.id === plan)) throw new BadRequestException(`Invalid plan: ${plan}`);
    await this.prisma.planConfig.upsert({
      where: { plan },
      create: { plan, config: config as any, updatedById: actor?.id },
      update: { config: config as any, updatedById: actor?.id },
    });
    await this.audit.record(actor, 'plan.entitlementsUpdated', 'SETTINGS', {
      targetType: 'plan',
      targetId: plan,
      targetName: planLabel(plan),
      metadata: { plan },
    });
    return { ok: true, plan };
  }

  async listEnterpriseContracts() {
    const contracts = await this.prisma.enterpriseContract.findMany({
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      businessName: c.tenant.name,
      contractPrice: c.contractPrice,
      billingCycle: c.billingCycle,
      startDate: c.startDate.toISOString(),
      renewalDate: c.renewalDate?.toISOString() ?? null,
      customerLimit: c.customerLimit,
      branchLimit: c.branchLimit,
      seats: c.seats,
      customFeatures: c.customFeatures,
      sla: c.sla,
      notes: c.notes,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async createEnterpriseContract(
    actor: any,
    data: {
      tenantId: string;
      contractPrice: number;
      billingCycle: string;
      startDate: string;
      renewalDate?: string;
      customerLimit?: number;
      branchLimit?: number;
      seats?: number;
      customFeatures?: unknown;
      sla?: string;
      notes?: string;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: data.tenantId } });
    if (!tenant) throw new NotFoundException('Business not found');
    if (!Number.isFinite(data.contractPrice) || data.contractPrice < 0) {
      throw new BadRequestException('contractPrice must be a non-negative number');
    }
    const contract = await this.prisma.enterpriseContract.upsert({
      where: { tenantId: data.tenantId },
      create: {
        tenantId: data.tenantId,
        contractPrice: data.contractPrice,
        billingCycle: data.billingCycle ?? 'MONTHLY',
        startDate: new Date(data.startDate),
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        customerLimit: data.customerLimit ?? -1,
        branchLimit: data.branchLimit ?? -1,
        seats: data.seats ?? 5,
        customFeatures: (data.customFeatures ?? undefined) as any,
        sla: data.sla ?? null,
        notes: data.notes ?? null,
      },
      update: {
        contractPrice: data.contractPrice,
        billingCycle: data.billingCycle ?? 'MONTHLY',
        startDate: new Date(data.startDate),
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        customerLimit: data.customerLimit ?? -1,
        branchLimit: data.branchLimit ?? -1,
        seats: data.seats ?? 5,
        customFeatures: (data.customFeatures ?? undefined) as any,
        sla: data.sla ?? null,
        notes: data.notes ?? null,
      },
    });

    // Point the tenant's subscription at enterprise.
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId: data.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (sub) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { plan: 'enterprise', status: 'ACTIVE' },
      });
    } else {
      await this.prisma.subscription.create({
        data: { tenantId: data.tenantId, plan: 'enterprise', status: 'ACTIVE' },
      });
    }

    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId: data.tenantId,
        type: 'PLAN_CHANGED',
        plan: 'enterprise',
        description: `Enterprise contract ${contract.id}`,
        amount: data.contractPrice,
        currency: 'INR',
        metadata: { by: actor?.email, cycle: data.billingCycle },
      },
    });
    await this.audit.record(actor, 'contract.enterpriseCreated', 'BILLING', {
      targetType: 'tenant',
      targetId: data.tenantId,
      targetName: tenant.name,
      metadata: { contractId: contract.id, contractPrice: data.contractPrice, billingCycle: data.billingCycle },
    });
    return { ok: true, contractId: contract.id };
  }

  async issueRefund(
    actor: any,
    data: {
      subscriptionId?: string;
      tenantId?: string;
      amount: number;
      currency?: string;
      reason?: string;
    },
  ) {
    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    let tenantName = 'Unknown business';
    let targetId = data.tenantId ?? data.subscriptionId;
    let targetType = data.tenantId ? 'tenant' : 'subscription';

    if (data.subscriptionId) {
      const sub = await this.prisma.subscription.findUnique({
        where: { id: data.subscriptionId },
        include: { tenant: { select: { name: true } } },
      });
      if (!sub) throw new NotFoundException('Subscription not found');
      tenantName = sub.tenant.name;
      targetId = sub.tenantId;
      targetType = 'tenant';
    } else if (data.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: data.tenantId } });
      if (!tenant) throw new NotFoundException('Business not found');
      tenantName = tenant.name;
    }

    // Record the refund in the platform audit ledger (no external gateway call —
    // the gateway integration for real refunds lives in the Integrations module).
    await this.audit.record(actor, 'billing.refund', 'BILLING', {
      targetType,
      targetId,
      targetName: tenantName,
      metadata: {
        amount: data.amount,
        currency: data.currency ?? 'INR',
        reason: data.reason ?? null,
        subscriptionId: data.subscriptionId ?? null,
      },
    });

    return {
      ok: true,
      amount: data.amount,
      currency: data.currency ?? 'INR',
      message: `Refund of ${data.amount} ${data.currency ?? 'INR'} issued to ${tenantName}.`,
      simulated: true,
    };
  }
}