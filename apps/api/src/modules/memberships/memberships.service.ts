import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { prismaTierToShared } from '../../common/helpers';
import { getPlan } from './plan-definitions';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

interface PaymentMethodRecord {
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
  isDefault?: boolean;
  addedAt?: string;
}

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTiers(tenantId: string) {
    const tiers = await this.prisma.membershipTier.findMany({
      where: { tenantId },
      orderBy: { price: 'asc' },
    });

    const memberships = await this.prisma.customerMembership.findMany({
      where: { tier: { tenantId } },
      select: { tierId: true },
    });

    const countMap = new Map<string, number>();
    for (const m of memberships) {
      countMap.set(m.tierId, (countMap.get(m.tierId) ?? 0) + 1);
    }

    return tiers.map((t) => ({
      ...prismaTierToShared(t),
      memberCount: countMap.get(t.id) ?? 0,
    }));
  }

  async createTier(tenantId: string, data: {
    name: string;
    price?: number;
    validityDays?: number;
    discountPercent?: number;
    bonusPointsPercent?: number;
    priorityBooking?: boolean;
    benefits?: string[];
    color?: string;
  }) {
    const existing = await this.prisma.membershipTier.findFirst({
      where: { tenantId, name: data.name },
    });
    if (existing) {
      throw new ConflictException('Tier with this name already exists');
    }

    const tier = await this.prisma.membershipTier.create({
      data: {
        tenantId,
        name: data.name,
        price: data.price ?? 0,
        validityDays: data.validityDays ?? 365,
        discountPercent: data.discountPercent ?? 0,
        bonusPointsPercent: data.bonusPointsPercent ?? 0,
        priorityBooking: data.priorityBooking ?? false,
        benefits: data.benefits ?? [],
        color: data.color,
      },
    });

    return prismaTierToShared(tier);
  }

  async updateTier(tenantId: string, id: string, data: Record<string, unknown>) {
    const tier = await this.prisma.membershipTier.findFirst({
      where: { id, tenantId },
    });
    if (!tier) throw new NotFoundException('Tier not found');

    const updated = await this.prisma.membershipTier.update({
      where: { id },
      data: data as any,
    });

    return prismaTierToShared(updated);
  }

  async deleteTier(tenantId: string, id: string) {
    const tier = await this.prisma.membershipTier.findFirst({
      where: { id, tenantId },
    });
    if (!tier) throw new NotFoundException('Tier not found');

    await this.prisma.customerMembership.deleteMany({
      where: { tierId: id },
    });

    await this.prisma.membershipTier.delete({ where: { id } });

    return { message: 'Tier deleted successfully' };
  }

  async assignCustomer(tenantId: string, customerId: string, tierId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const tier = await this.prisma.membershipTier.findFirst({
      where: { id: tierId, tenantId },
    });
    if (!tier) throw new NotFoundException('Tier not found');

    const existing = await this.prisma.customerMembership.findUnique({
      where: { customerId_tierId: { customerId, tierId } },
    });
    if (existing) {
      throw new ConflictException('Customer is already assigned to this tier');
    }

    const membership = await this.prisma.customerMembership.create({
      data: { customerId, tierId },
      include: { tier: true, customer: true },
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        customerId,
        type: 'TIER_UPGRADED',
        message: `Customer assigned to ${tier.name} tier`,
      },
    });

    return {
      id: membership.id,
      customerId: membership.customerId,
      tierId: membership.tierId,
      tierName: membership.tier.name,
      assignedAt: membership.assignedAt.toISOString(),
    };
  }

  async removeAssignment(tenantId: string, id: string) {
    const membership = await this.prisma.customerMembership.findFirst({
      where: { id },
      include: { tier: true, customer: true },
    });

    if (!membership || membership.tier.tenantId !== tenantId) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.customerMembership.delete({ where: { id } });

    return { message: 'Customer removed from tier successfully' };
  }

  private normalizePlan(id: string): string {
    const raw = (id || 'free').toLowerCase();
    if (raw === 'professional') return 'growth';
    return raw;
  }

  private parsePaymentMethod(raw: string | null): PaymentMethodRecord | null {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return typeof parsed === 'object' && parsed !== null ? (parsed as PaymentMethodRecord) : null;
    } catch {
      return null;
    }
  }

  private billingCycle(sub: { currentPeriodStart?: Date | null; currentPeriodEnd?: Date | null }): 'monthly' | 'yearly' {
    if (sub.currentPeriodStart && sub.currentPeriodEnd) {
      const days = Math.round((sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()) / (24 * 60 * 60 * 1000));
      if (days >= 300) return 'yearly';
    }
    return 'monthly';
  }

  /** Normalized subscription status used by the Billing Center UI. */
  private deriveStatus(sub: {
    status: string;
    autoRenew: boolean;
    canceledAt: Date | null;
    trialEndsAt: Date | null;
    plan: string;
  }): string {
    const raw = (sub.status || 'ACTIVE').toUpperCase();
    const isTrial =
      raw === 'TRIALING' ||
      (sub.plan.toLowerCase() === 'free' && !!sub.trialEndsAt && sub.trialEndsAt.getTime() > Date.now());
    if (isTrial) return 'TRIAL';
    if (raw === 'CANCELED' || raw === 'EXPIRED') return 'CANCELED';
    if (raw === 'PAST_DUE') return 'PAST_DUE';
    // Active subscription with auto-renew turned off = scheduled to cancel.
    if (!sub.autoRenew && sub.canceledAt) return 'CANCELING';
    return 'ACTIVE';
  }

  async getSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { tenantId } });
    if (!sub) return null;

    const planId = this.normalizePlan(sub.plan);
    const usage = await this.computeUsage(tenantId, planId);
    const lastEvent = await this.prisma.subscriptionEvent.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      id: sub.id,
      tenantId: sub.tenantId,
      plan: planId,
      status: this.deriveStatus(sub),
      rawStatus: sub.status,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      nextBillingDate:
        sub.currentPeriodEnd?.toISOString() ??
        new Date(sub.createdAt.getTime() + MONTH_MS).toISOString(),
      autoRenew: sub.autoRenew,
      canceledAt: sub.canceledAt?.toISOString() ?? null,
      billingCycle: this.billingCycle(sub),
      paymentMethod: this.parsePaymentMethod(sub.paymentMethod),
      provider: sub.stripeSubId ? 'stripe' : 'doloyal',
      hasPaymentFailed: lastEvent?.type === 'PAYMENT_FAILED',
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
      planDetails: getPlan(planId) ?? null,
      usage,
    };
  }

  async getBillingHistory(tenantId: string) {
    const events = await this.prisma.subscriptionEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return events.map((e) => ({
      id: e.id,
      type: e.type,
      description: e.description,
      plan: e.plan,
      amount: e.amount,
      currency: e.currency,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  async changePlan(tenantId: string, planId: string) {
    const normalized = this.normalizePlan(planId);
    const plan = getPlan(normalized);
    if (!plan) throw new NotFoundException('Invalid plan');

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId },
    });
    if (!sub) throw new NotFoundException('No subscription found');

    if (this.normalizePlan(sub.plan) === normalized) {
      return {
        plan: this.normalizePlan(sub.plan),
        message: `You're already on the ${plan.name} plan`,
        alreadyOnPlan: true,
      };
    }

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { plan: normalized },
    });

    await this.logEvent(tenantId, {
      type: 'PLAN_CHANGED',
      plan: normalized,
      description: `Plan changed to ${plan.name}`,
      metadata: { previousPlan: this.normalizePlan(sub.plan) },
    });

    return {
      plan: this.normalizePlan(updated.plan),
      message: `Switched to ${plan.name} plan`,
    };
  }

  async cancelSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { tenantId } });
    if (!sub) throw new NotFoundException('No subscription found');

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { autoRenew: false, canceledAt: new Date() },
    });

    await this.logEvent(tenantId, {
      type: 'SUBSCRIPTION_CANCELED',
      plan: this.normalizePlan(updated.plan),
      description: 'Subscription scheduled to cancel',
      metadata: { effectiveEnd: updated.currentPeriodEnd?.toISOString() ?? null },
    });

    return { message: 'Subscription scheduled to cancel', autoRenew: false, status: 'CANCELING' };
  }

  async restartSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { tenantId } });
    if (!sub) throw new NotFoundException('No subscription found');

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { autoRenew: true, canceledAt: null, status: 'ACTIVE' },
    });

    await this.logEvent(tenantId, {
      type: 'SUBSCRIPTION_RESTARTED',
      plan: this.normalizePlan(updated.plan),
      description: 'Subscription restarted',
    });

    return { message: 'Subscription restarted', autoRenew: true, status: 'ACTIVE' };
  }

  async updatePaymentMethod(tenantId: string, data: PaymentMethodRecord) {
    const sub = await this.prisma.subscription.findFirst({ where: { tenantId } });
    if (!sub) throw new NotFoundException('No subscription found');

    const existing = this.parsePaymentMethod(sub.paymentMethod);
    const next: PaymentMethodRecord = {
      ...(existing ?? {}),
      brand: data.brand ?? existing?.brand ?? 'Card',
      last4: data.last4 ?? existing?.last4,
      expMonth: data.expMonth ?? existing?.expMonth,
      expYear: data.expYear ?? existing?.expYear,
      isDefault: true,
      addedAt: new Date().toISOString(),
    };

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { paymentMethod: JSON.stringify(next) },
    });

    await this.logEvent(tenantId, {
      type: 'PAYMENT_METHOD_UPDATED',
      description: `Payment method updated (${next.brand} •••• ${next.last4 ?? '—'})`,
      metadata: { brand: next.brand, last4: next.last4 },
    });

    return next;
  }

  private async computeUsage(tenantId: string, planId: string) {
    const plan = getPlan(planId) ?? getPlan('free')!;
    const limits = plan.limits;
    const periodStart = new Date(new Date().getTime() - MONTH_MS);

    const [customers, branches, staff, aiQueries, campaigns] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.branch.count({ where: { tenantId } }),
      this.prisma.staff.count({ where: { tenantId } }),
      this.prisma.aiUsage.count({ where: { tenantId, createdAt: { gte: periodStart } } }),
      this.prisma.campaign.count({ where: { tenantId } }),
    ]);

    return {
      customers: { used: customers, limit: limits.customers },
      branches: { used: branches, limit: limits.branches },
      staff: { used: staff, limit: limits.staff },
      aiQueries: { used: aiQueries, limit: limits.aiQueries },
      campaigns: { used: campaigns, limit: null as number | null },
    };
  }

  private async logEvent(
    tenantId: string,
    data: {
      type: string;
      plan?: string;
      description?: string;
      amount?: number;
      currency?: string;
      status?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId,
        type: data.type,
        plan: data.plan,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        metadata: data.metadata as any,
      },
    });
  }
}
