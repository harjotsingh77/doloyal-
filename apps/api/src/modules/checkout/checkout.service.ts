import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { getPlan } from '../memberships/plan-definitions';
import Razorpay from 'razorpay';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type BillingCycle = 'monthly' | 'yearly';

/** Paid plans that can be purchased through checkout. */
const PAID_PLAN_IDS = ['starter', 'growth'];

interface SubscriptionLike {
  id: string;
  plan: string;
  status: string;
}

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Platform-level Razorpay client (Doloyal's own billing account) ───── */

  private platformClient(): Razorpay | null {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  private requireClient(): Razorpay {
    const client = this.platformClient();
    if (!client) {
      throw new ServiceUnavailableException(
        'Online payments are not configured yet. Please contact support.',
      );
    }
    return client;
  }

  private normalizePlan(id: string): string {
    const raw = (id || '').toLowerCase().trim();
    if (raw === 'professional') return 'growth';
    return raw;
  }

  private assertPurchasablePlan(planId: string) {
    const normalized = this.normalizePlan(planId);
    if (!PAID_PLAN_IDS.includes(normalized)) {
      throw new BadRequestException(
        'Invalid plan. Choose Starter or Growth to continue with checkout.',
      );
    }
    const plan = getPlan(normalized);
    if (!plan || plan.priceMonthly <= 0) {
      throw new BadRequestException('This plan cannot be purchased online.');
    }
    return plan;
  }

  private assertCycle(cycle: BillingCycle): BillingCycle {
    if (cycle !== 'monthly' && cycle !== 'yearly') {
      throw new BadRequestException('Invalid billing cycle.');
    }
    return cycle;
  }

  private priceFor(planId: string, cycle: BillingCycle): number {
    const plan = getPlan(planId)!;
    return cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  }

  /** Get (or provision) the tenant subscription row. */
  private async ensureSubscription(tenantId: string): Promise<SubscriptionLike> {
    const sub = await this.prisma.subscription.findFirst({ where: { tenantId } });
    if (sub) return sub;
    return this.prisma.subscription.create({
      data: { tenantId, plan: 'free', status: 'ACTIVE' },
    });
  }

  private isActiveOn(sub: SubscriptionLike, planId: string): boolean {
    const samePlan = this.normalizePlan(sub.plan) === this.normalizePlan(planId);
    const activeStatus = ['ACTIVE', 'TRIALING'].includes((sub.status || '').toUpperCase());
    return samePlan && activeStatus;
  }

  /* ── Session creation ─────────────────────────────────────────────────── */

  async createSession(
    tenantId: string,
    planIdRaw: string,
    cycleRaw: BillingCycle,
    customer?: {
      email?: string;
      name?: string;
      country?: string;
      pincode?: string;
      businessName?: string;
      gstin?: string;
      address?: string;
    },
  ) {
    const cycle = this.assertCycle(cycleRaw);
    const plan = this.assertPurchasablePlan(planIdRaw);

    const sub = await this.ensureSubscription(tenantId);
    if (this.isActiveOn(sub, plan.id)) {
      throw new ConflictException(
        `You already have an active ${plan.name} subscription.`,
      );
    }

    const client = this.requireClient();
    const amount = this.priceFor(plan.id, cycle);
    const receipt = `dol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Only short string notes — Razorpay rejects long/complex note values.
    const notes: Record<string, string> = { tenantId, plan: plan.id, cycle };
    if (customer?.email) notes.email = customer.email.slice(0, 255);
    if (customer?.country) notes.country = customer.country.slice(0, 255);
    if (customer?.pincode) notes.pincode = customer.pincode.slice(0, 255);
    if (customer?.businessName) notes.businessName = customer.businessName.slice(0, 255);
    if (customer?.gstin) notes.gstin = customer.gstin.toUpperCase().slice(0, 255);

    const order = await client.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      notes,
    });

    return {
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: plan.id,
      planName: plan.name,
      cycle,
      prefill: { email: customer?.email ?? null, name: customer?.name ?? null },
    };
  }

  /* ── Payment verification + activation ────────────────────────────────── */

  async verifyPayment(
    tenantId: string,
    data: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      planId: string;
      cycle: BillingCycle;
    },
  ) {
    const cycle = this.assertCycle(data.cycle);
    const plan = this.assertPurchasablePlan(data.planId);
    const client = this.requireClient();

    // 1. Signature check (proves the callback came from Razorpay).
    const crypto = await import('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== data.razorpaySignature) {
      throw new BadRequestException('Payment verification failed. Please contact support.');
    }

    // 2. Independent verification against the Razorpay API: the payment must
    //    belong to the order, be successful, and match the server-side price.
    const expectedAmountPaise = Math.round(this.priceFor(plan.id, cycle) * 100);
    let payment: any;
    try {
      payment = await client.payments.fetch(data.razorpayPaymentId);
    } catch {
      throw new BadRequestException('Unable to confirm the payment. Please contact support.');
    }

    if (
      !payment ||
      payment.order_id !== data.razorpayOrderId ||
      !['captured', 'authorized'].includes(payment.status) ||
      Number(payment.amount) !== expectedAmountPaise
    ) {
      throw new BadRequestException('Payment could not be verified. Please contact support.');
    }

    // 3. Activate the subscription.
    const now = new Date();
    const periodEnd = cycle === 'yearly' ? new Date(now.getTime() + YEAR_MS) : this.addMonths(now, 1);

    await this.ensureSubscription(tenantId);
    await this.prisma.subscription.updateMany({
      where: { tenantId },
      data: {
        plan: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
        canceledAt: null,
        trialEndsAt: null,
      },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId,
        type: 'PAYMENT_SUCCEEDED',
        plan: plan.id,
        description: `Payment received — ${plan.name} (${cycle})`,
        amount: this.priceFor(plan.id, cycle),
        currency: 'INR',
        status: 'SUCCESS',
        metadata: {
          razorpayOrderId: data.razorpayOrderId,
          razorpayPaymentId: data.razorpayPaymentId,
          cycle,
        },
      },
    });

    return {
      success: true,
      plan: plan.id,
      planName: plan.name,
      status: 'ACTIVE',
      transactionId: data.razorpayPaymentId,
      orderId: data.razorpayOrderId,
      amount: this.priceFor(plan.id, cycle),
      currency: 'INR',
      currentPeriodStart: now.toISOString(),
      nextBillingDate: periodEnd.toISOString(),
    };
  }

  /* ── Free trial activation ────────────────────────────────────────────── */

  async activateTrial(tenantId: string) {
    const plan = getPlan('free');
    const sub = await this.ensureSubscription(tenantId);

    if (this.normalizePlan(sub.plan) === 'free') {
      return {
        success: true,
        plan: 'free',
        planName: plan?.name ?? 'Free Trial',
        status: 'TRIALING',
        trialEndsAt: null,
        alreadyActive: true,
      };
    }

    const now = new Date();
    const trialEnd = this.addMonths(now, 1);

    await this.prisma.subscription.updateMany({
      where: { tenantId },
      data: {
        plan: 'free',
        status: 'TRIALING',
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        autoRenew: false,
        canceledAt: null,
      },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId,
        type: 'TRIAL_STARTED',
        plan: 'free',
        description: '1 month free trial started',
        amount: 0,
        currency: 'INR',
        status: 'SUCCESS',
      },
    });

    return {
      success: true,
      plan: 'free',
      planName: plan?.name ?? 'Free Trial',
      status: 'TRIALING',
      trialEndsAt: trialEnd.toISOString(),
      nextBillingDate: trialEnd.toISOString(),
      alreadyActive: false,
    };
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }
}
