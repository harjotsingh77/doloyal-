import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { prismaTierToShared } from '../../common/helpers';
import { PLANS, getPlan } from './plan-definitions';

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

  async getSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId },
    });
    if (!sub) return null;

    return {
      id: sub.id,
      tenantId: sub.tenantId,
      plan: sub.plan,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      autoRenew: sub.autoRenew,
      stripeId: sub.stripeId,
      stripePriceId: sub.stripePriceId,
      stripeSubId: sub.stripeSubId,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
      planDetails: getPlan(sub.plan) ?? null,
    };
  }

  async changePlan(tenantId: string, planId: string) {
    const plan = getPlan(planId);
    if (!plan) throw new NotFoundException('Invalid plan');

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId },
    });
    if (!sub) throw new NotFoundException('No subscription found');

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { plan: planId },
    });

    return {
      plan: updated.plan,
      message: `Switched to ${plan.name} plan`,
    };
  }
}
