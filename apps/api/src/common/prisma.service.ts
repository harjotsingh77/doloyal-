import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import * as crypto from 'crypto';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

const TENANT_MODELS = new Set([
  'Membership', 'Branch', 'Staff', 'Customer', 'Service',
  'Appointment', 'Invoice', 'LoyaltyConfig', 'PointsLedger',
  'Reward', 'RewardRedemption', 'MembershipTier', 'Campaign',
  'Activity', 'Subscription',
  'ReferralCampaign', 'ReferralLink', 'ReferralVisit', 'ReferralShare',
  'ReferralConversion', 'ReferralRewardRecord', 'ReferralEvent',
  'ReferralRegistration', 'ReferralSource', 'ReferralLeaderboard',
  'AiConversation', 'AiMessage', 'AiAttachment', 'AiFeedback', 'AiUsage',
]);

const ALL_MODELS = [
  'user', 'tenant', 'membership', 'branch', 'staff', 'customer',
  'service', 'appointment', 'invoice', 'invoiceItem', 'loyaltyConfig',
  'pointsLedger', 'reward', 'rewardRedemption', 'membershipTier',
  'customerMembership', 'campaign', 'activity', 'subscription',
  'bookingLink', 'bookingLinkVisit', 'notification', 'notificationTemplate', 'blockedDate',
  'calendarEvent', 'widgetSettings', 'availabilityConfig', 'website',
  'websitePage', 'websiteSection', 'websiteAsset', 'websiteDomain',
  'websiteDeployment', 'integration', 'integrationToken',
  'syncLog', 'webhookEvent',
  'referralCampaign', 'referralLink', 'referralVisit', 'referralShare',
  'referralConversion', 'referralRewardRecord', 'referralEvent',
  'referralRegistration', 'referralSource', 'referralLeaderboard',
  'aiConversation', 'aiMessage', 'aiAttachment', 'aiFeedback', 'aiUsage',
  'websiteProject', 'websiteProjectRequirement', 'websiteProjectFile',
  'websiteConversation', 'websiteMessage', 'websiteProjectStatusHistory',
  'websiteConversationNote',
];

function uid() {
  return crypto.randomUUID();
}

function matchWhere(record: any, where: any): boolean {
  if (!where) return true;
  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(val)) {
      if (!val.some((cond: any) => matchWhere(record, cond))) return false;
    } else if (key === 'AND' && Array.isArray(val)) {
      if (!val.every((cond: any) => matchWhere(record, cond))) return false;
    } else if (key === 'NOT' && typeof val === 'object') {
      if (matchWhere(record, val)) return false;
    } else {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const cond = val as Record<string, any>;
        if (cond.equals !== undefined && record[key] !== cond.equals) return false;
        if (cond.not !== undefined && record[key] === cond.not) return false;
        if (cond.in !== undefined && Array.isArray(cond.in) && !cond.in.includes(record[key])) return false;
        if (cond.notIn !== undefined && Array.isArray(cond.notIn) && cond.notIn.includes(record[key])) return false;
        if (cond.lt !== undefined && !(record[key] < cond.lt)) return false;
        if (cond.lte !== undefined && !(record[key] <= cond.lte)) return false;
        if (cond.gt !== undefined && !(record[key] > cond.gt)) return false;
        if (cond.gte !== undefined && !(record[key] >= cond.gte)) return false;
        if (cond.contains !== undefined && typeof record[key] === 'string' && !record[key].includes(cond.contains)) return false;
        if (cond.startsWith !== undefined && typeof record[key] === 'string' && !record[key].startsWith(cond.startsWith)) return false;
        if (cond.endsWith !== undefined && typeof record[key] === 'string' && !record[key].endsWith(cond.endsWith)) return false;
        if (cond.mode !== undefined) continue;
      } else if (Array.isArray(val)) {
        const rv = record[key];
        if (!val.every((v: any) => Array.isArray(rv) && rv.includes(v))) return false;
      } else {
        if (record[key] !== val) return false;
      }
    }
  }
  return true;
}

const RELATION_STORE_MAP: Record<string, string> = {
  memberships: 'membership',
  integrations: 'integration',
  tokens: 'integrationToken',
  user: 'user',
  tenant: 'tenant',
  customer: 'customer',
  staff: 'staff',
  appointments: 'appointment',
  invoices: 'invoice',
  items: 'invoiceItem',
  services: 'service',
  branches: 'branch',
  rewards: 'reward',
  redemptions: 'rewardRedemption',
  pointsLedger: 'pointsLedger',
  activities: 'activity',
  campaigns: 'campaign',
  subscriptions: 'subscription',
  bookingLinks: 'bookingLink',
  visits: 'bookingLinkVisit',
  notifications: 'notification',
  notificationTemplates: 'notificationTemplate',
  blockedDateEntries: 'blockedDate',
  calendarEvents: 'calendarEvent',
  pages: 'websitePage',
  sections: 'websiteSection',
  syncLogs: 'syncLog',
  webhookEvents: 'webhookEvent',
  bookingLink: 'bookingLink',
};

const HAS_MANY = new Set([
  'memberships', 'integrations', 'tokens', 'items',
  'appointments', 'invoices', 'services', 'pages', 'sections',
  'rewards', 'redemptions', 'pointsLedger', 'activities',
  'campaigns', 'subscriptions', 'bookingLinks', 'visits', 'notifications',
  'notificationTemplates', 'blockedDateEntries', 'calendarEvents',
  'branches', 'syncLogs', 'webhookEvents',
]);

const FK_MAP: Record<string, string> = {
  tokens: 'integrationId',
  items: 'invoiceId',
  memberships: 'userId',
  integrations: 'tenantId',
  appointments: 'customerId',
  invoices: 'customerId',
  services: 'tenantId',
  pages: 'websiteId',
  sections: 'websitePageId',
  branches: 'tenantId',
  pointsLedger: 'customerId',
  activities: 'tenantId',
  rewards: 'tenantId',
  redemptions: 'rewardId',
  campaigns: 'tenantId',
  bookingLinks: 'tenantId',
  visits: 'bookingLinkId',
  subscriptions: 'tenantId',
  notifications: 'tenantId',
  notificationTemplates: 'tenantId',
  blockedDateEntries: 'tenantId',
  calendarEvents: 'tenantId',
};

function resolveInclude(record: any, include: any, stores: Map<string, Map<string, any>>) {
  if (!include) return record;
  const result = { ...record };
  for (const [rel, val] of Object.entries(include)) {
    const includeOpts = (typeof val === 'object' && val !== null) ? (val as Record<string, any>) : {};
    if (!val) continue;

    const storeName = RELATION_STORE_MAP[rel];
    const relMap = storeName ? stores.get(storeName) : undefined;
    if (!relMap) continue;

    let related: any[];
    const allRelated = [...relMap.values()];
    if (HAS_MANY.has(rel)) {
      const fk = FK_MAP[rel] || `${rel.slice(0, -1)}Id`;
      related = allRelated.filter((r: any) => r[fk] === record.id);
    } else {
      const fk = rel === 'user' ? 'userId' : rel === 'tenant' ? 'tenantId' : `${rel}Id`;
      const found = allRelated.find((r: any) => r.id === record[fk]) || null;
      related = found ? [found] : [];
    }

    const isPlural = HAS_MANY.has(rel);
    if (includeOpts.include) {
      related = related.map(r => resolveInclude(r, includeOpts.include, stores));
    }
    result[rel] = isPlural ? related : (related[0] || null);
  }
  return result;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private inMemory = false;
  private stores = new Map<string, Map<string, any>>();

  constructor(config: ConfigService) {
    const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/doloyal';
    super({
      datasources: { db: { url } },
    });
    this.applyTenantMiddleware();
  }

  async onModuleInit() {
    const maxAttempts = 8;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Connected to database');
        this.inMemory = false;
        return;
      } catch (err: any) {
        this.logger.warn(
          `Database connection attempt ${attempt}/${maxAttempts} failed: ${err?.message || err}`,
        );
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 750 * attempt));
        }
      }
    }

    // Last resort for local demos only — incomplete vs full schema.
    // Prefer fixing DATABASE_URL / starting Postgres (pnpm db:up).
    this.logger.error(
      'Database unreachable after retries. Starting limited in-memory mode. Run `pnpm db:up` for a real Postgres.',
    );
    this.inMemory = true;
    this.initStores();
    this.seedDemoData();
    this.applyInMemoryProxy();
  }

  private initStores() {
    for (const name of ALL_MODELS) {
      this.stores.set(name, new Map());
    }
  }

  private seedDemoData() {
    const userId = uid();
    const tenantId = uid();
    const membershipId = uid();
    const now = new Date();

    const user = {
      id: userId,
      clerkId: null,
      email: 'demo@doloyal.ai',
      firstName: 'Demo',
      lastName: 'User',
      phone: '+1-555-0100',
      avatarUrl: null,
      password: '$2b$12$1ElJvJT6uumeo5qaLIRKyOtebE5YS54UfB/MlwxgUReon0vTrpiEO',
      googleId: null,
      createdAt: now,
      updatedAt: now,
    };

    const tenant = {
      id: tenantId,
      name: "Demo's Business",
      slug: `demo-${Date.now().toString(36)}`,
      category: 'OTHER',
      phone: '+1-555-0100',
      email: 'demo@doloyal.ai',
      website: null,
      logoUrl: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      country: 'US',
      currency: 'USD',
      timezone: 'UTC',
      businessHours: null,
      taxRate: 0,
      brandColor: '#2563EB',
      gst: null,
      onboardingComplete: false,
      maxDailyBookings: 50,
      minBookingNotice: 60,
      maxAdvanceBookingDays: 30,
      bufferTime: 15,
      holidays: null,
      blockedDates: null,
      createdAt: now,
      updatedAt: now,
    };

    const membership = {
      id: membershipId,
      userId,
      tenantId,
      role: 'OWNER',
      createdAt: now,
      updatedAt: now,
    };

    this.stores.get('user')!.set(userId, user);
    this.stores.get('tenant')!.set(tenantId, tenant);
    this.stores.get('membership')!.set(membershipId, membership);

    const subscriptionId = uid();
    const subscriptionRecord = {
      id: subscriptionId,
      tenantId,
      plan: 'growth',
      status: 'ACTIVE',
      stripeId: null,
      stripePriceId: null,
      stripeSubId: null,
      trialEndsAt: null,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
      canceledAt: null,
      paymentMethod: null,
      autoRenew: true,
      createdAt: now,
      updatedAt: now,
    };
    this.stores.get('subscription')!.set(subscriptionId, subscriptionRecord);

    this.seedDashboardData(tenantId, now);

    this.logger.log(`In-memory demo user: ${user.email} / "test"`);
  }

  private seedDashboardData(tenantId: string, now: Date) {
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
    const USD = 'USD';

    const customers = [
      { id: uid(), tenantId, firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@example.com', phone: '+1-555-1001', pointsBalance: 1250, totalSpent: 8750, totalVisits: 24, status: 'ACTIVE', lastVisitAt: daysAgo(2), tags: ['VIP', 'Regular'], churnRiskScore: 10, notes: null, dob: daysAgo(10000), avatarUrl: null, createdAt: daysAgo(90), updatedAt: now },
      { id: uid(), tenantId, firstName: 'Mike', lastName: 'Chen', email: 'mike@example.com', phone: '+1-555-1002', pointsBalance: 800, totalSpent: 5200, totalVisits: 15, status: 'ACTIVE', lastVisitAt: daysAgo(5), tags: ['Regular'], churnRiskScore: 20, notes: 'Prefers morning appointments', dob: daysAgo(9000), avatarUrl: null, createdAt: daysAgo(60), updatedAt: now },
      { id: uid(), tenantId, firstName: 'Emma', lastName: 'Davis', email: 'emma@example.com', phone: '+1-555-1003', pointsBalance: 300, totalSpent: 2100, totalVisits: 8, status: 'ACTIVE', lastVisitAt: daysAgo(14), tags: ['New'], churnRiskScore: 35, notes: null, dob: daysAgo(8000), avatarUrl: null, createdAt: daysAgo(30), updatedAt: now },
      { id: uid(), tenantId, firstName: 'James', lastName: 'Wilson', email: 'james@example.com', phone: '+1-555-1004', pointsBalance: 50, totalSpent: 450, totalVisits: 3, status: 'AT_RISK', lastVisitAt: daysAgo(45), tags: ['At Risk'], churnRiskScore: 65, notes: 'Did not like last service', dob: daysAgo(11000), avatarUrl: null, createdAt: daysAgo(20), updatedAt: now },
      { id: uid(), tenantId, firstName: 'Lisa', lastName: 'Brown', email: 'lisa@example.com', phone: '+1-555-1005', pointsBalance: 2200, totalSpent: 15000, totalVisits: 40, status: 'ACTIVE', lastVisitAt: daysAgo(1), tags: ['VIP'], churnRiskScore: 5, notes: null, dob: daysAgo(9500), avatarUrl: null, createdAt: daysAgo(180), updatedAt: now },
      { id: uid(), tenantId, firstName: 'Alex', lastName: 'Taylor', email: 'alex@example.com', phone: '+1-555-1006', pointsBalance: 0, totalSpent: 0, totalVisits: 0, status: 'INACTIVE', lastVisitAt: daysAgo(120), tags: ['Inactive'], churnRiskScore: 95, notes: null, dob: daysAgo(7000), avatarUrl: null, createdAt: daysAgo(5), updatedAt: now },
      { id: uid(), tenantId, firstName: 'Olivia', lastName: 'Martinez', email: 'olivia@example.com', phone: '+1-555-1007', pointsBalance: 600, totalSpent: 3800, totalVisits: 12, status: 'ACTIVE', lastVisitAt: daysAgo(7), tags: ['Regular'], churnRiskScore: 25, notes: null, dob: daysAgo(8500), avatarUrl: null, createdAt: daysAgo(45), updatedAt: now },
      { id: uid(), tenantId, firstName: 'Noah', lastName: 'Anderson', email: 'noah@example.com', phone: '+1-555-1008', pointsBalance: 150, totalSpent: 1200, totalVisits: 5, status: 'ACTIVE', lastVisitAt: daysAgo(21), tags: [], churnRiskScore: 40, notes: null, dob: daysAgo(7500), avatarUrl: null, createdAt: daysAgo(15), updatedAt: now },
    ];

    const custStore = this.stores.get('customer')!;
    for (const c of customers) custStore.set(c.id, c);

    const rewardIds = [];
    const rewards = [
      { id: uid(), tenantId, name: 'Free Haircut', description: 'Complimentary haircut on your next visit', pointsCost: 500, discountVal: 30, status: 'ACTIVE', imageUrl: null, quantity: null, redeemedCount: 2, validityDays: 90, createdAt: daysAgo(90), updatedAt: now },
      { id: uid(), tenantId, name: '20% Off Services', description: '20% off any service', pointsCost: 300, discountVal: 20, status: 'ACTIVE', imageUrl: null, quantity: 50, redeemedCount: 5, validityDays: 60, createdAt: daysAgo(80), updatedAt: now },
      { id: uid(), tenantId, name: 'Free Beard Trim', description: null, pointsCost: 200, discountVal: 15, status: 'ACTIVE', imageUrl: null, quantity: null, redeemedCount: 8, validityDays: 90, createdAt: daysAgo(70), updatedAt: now },
      { id: uid(), tenantId, name: '$50 Gift Card', description: 'Redeem for $50 off any service', pointsCost: 1000, discountVal: 50, status: 'ACTIVE', imageUrl: null, quantity: 20, redeemedCount: 3, validityDays: 180, createdAt: daysAgo(60), updatedAt: now },
      { id: uid(), tenantId, name: 'VIP Treatment', description: 'Premium service package', pointsCost: 2000, discountVal: 100, status: 'ACTIVE', imageUrl: null, quantity: 10, redeemedCount: 1, validityDays: 365, createdAt: daysAgo(50), updatedAt: now },
    ];

    const rewardStore = this.stores.get('reward')!;
    for (const r of rewards) { rewardStore.set(r.id, r); rewardIds.push(r.id); }

    const appointmentIds = [];
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const twoHoursAgo = new Date(now.getTime() - 7200000);
    const threeHoursAgo = new Date(now.getTime() - 10800000);
    const appointments = [
      { id: uid(), tenantId, customerId: customers[0].id, staffId: null, serviceName: 'Haircut', startTime: twoHoursAgo, endTime: new Date(twoHoursAgo.getTime() + 3600000), status: 'COMPLETED', notes: null, createdAt: daysAgo(1), updatedAt: now },
      { id: uid(), tenantId, customerId: customers[1].id, staffId: null, serviceName: 'Beard Trim', startTime: threeHoursAgo, endTime: new Date(threeHoursAgo.getTime() + 1800000), status: 'COMPLETED', notes: null, createdAt: daysAgo(2), updatedAt: now },
      { id: uid(), tenantId, customerId: customers[4].id, staffId: null, serviceName: 'Hair Coloring', startTime: new Date(todayStart.getTime() + 14 * 3600000), endTime: new Date(todayStart.getTime() + 16 * 3600000), status: 'CONFIRMED', notes: 'Full color', createdAt: daysAgo(1), updatedAt: now },
      { id: uid(), tenantId, customerId: customers[0].id, staffId: null, serviceName: 'Haircut', startTime: daysAgo(5), endTime: daysAgo(5), status: 'COMPLETED', notes: null, createdAt: daysAgo(6), updatedAt: daysAgo(5) },
      { id: uid(), tenantId, customerId: customers[2].id, staffId: null, serviceName: 'Blow Dry', startTime: daysAgo(3), endTime: daysAgo(3), status: 'COMPLETED', notes: null, createdAt: daysAgo(4), updatedAt: daysAgo(3) },
      { id: uid(), tenantId, customerId: customers[1].id, staffId: null, serviceName: 'Haircut', startTime: daysAgo(10), endTime: daysAgo(10), status: 'COMPLETED', notes: null, createdAt: daysAgo(11), updatedAt: daysAgo(10) },
      { id: uid(), tenantId, customerId: customers[3].id, staffId: null, serviceName: 'Shave', startTime: daysAgo(15), endTime: daysAgo(15), status: 'COMPLETED', notes: null, createdAt: daysAgo(16), updatedAt: daysAgo(15) },
      { id: uid(), tenantId, customerId: customers[6].id, staffId: null, serviceName: 'Haircut', startTime: daysAgo(7), endTime: daysAgo(7), status: 'COMPLETED', notes: null, createdAt: daysAgo(8), updatedAt: daysAgo(7) },
    ];

    const apptStore = this.stores.get('appointment')!;
    for (const a of appointments) { apptStore.set(a.id, a); appointmentIds.push(a.id); }

    const todayInvoicesData = [
      { customerId: customers[0].id, total: 45 },
      { customerId: customers[1].id, total: 25 },
      { customerId: customers[4].id, total: 150 },
    ];
    const nowISO = now.toISOString();
    const invoices = [
      { id: uid(), tenantId, customerId: customers[0].id, invoiceNumber: 'INV-0001', subtotal: 45, discount: 0, tax: 0, total: 45, status: 'PAID', paymentMethod: 'CARD', paidAt: now, createdAt: now, updatedAt: now },
      { id: uid(), tenantId, customerId: customers[1].id, invoiceNumber: 'INV-0002', subtotal: 25, discount: 0, tax: 0, total: 25, status: 'PAID', paymentMethod: 'CARD', paidAt: now, createdAt: now, updatedAt: now },
      { id: uid(), tenantId, customerId: customers[4].id, invoiceNumber: 'INV-0003', subtotal: 150, discount: 0, tax: 0, total: 150, status: 'PENDING', paymentMethod: 'CARD', paidAt: null, createdAt: now, updatedAt: now },
      { id: uid(), tenantId, customerId: customers[0].id, invoiceNumber: 'INV-0004', subtotal: 45, discount: 0, tax: 0, total: 45, status: 'PAID', paymentMethod: 'CARD', paidAt: daysAgo(5), createdAt: daysAgo(6), updatedAt: daysAgo(5) },
      { id: uid(), tenantId, customerId: customers[2].id, invoiceNumber: 'INV-0005', subtotal: 35, discount: 0, tax: 0, total: 35, status: 'PAID', paymentMethod: 'CARD', paidAt: daysAgo(3), createdAt: daysAgo(4), updatedAt: daysAgo(3) },
      { id: uid(), tenantId, customerId: customers[1].id, invoiceNumber: 'INV-0006', subtotal: 45, discount: 0, tax: 0, total: 45, status: 'PAID', paymentMethod: 'CARD', paidAt: daysAgo(10), createdAt: daysAgo(11), updatedAt: daysAgo(10) },
      { id: uid(), tenantId, customerId: customers[3].id, invoiceNumber: 'INV-0007', subtotal: 30, discount: 0, tax: 0, total: 30, status: 'PAID', paymentMethod: 'CARD', paidAt: daysAgo(15), createdAt: daysAgo(16), updatedAt: daysAgo(15) },
      { id: uid(), tenantId, customerId: customers[6].id, invoiceNumber: 'INV-0008', subtotal: 45, discount: 0, tax: 0, total: 45, status: 'PAID', paymentMethod: 'CARD', paidAt: daysAgo(7), createdAt: daysAgo(8), updatedAt: daysAgo(7) },
    ];

    const invStore = this.stores.get('invoice')!;
    for (const inv of invoices) invStore.set(inv.id, inv);

    const invoiceItems = [
      { id: uid(), invoiceId: invoices[0].id, description: 'Haircut', quantity: 1, unitPrice: 45, total: 45 },
      { id: uid(), invoiceId: invoices[1].id, description: 'Beard Trim', quantity: 1, unitPrice: 25, total: 25 },
      { id: uid(), invoiceId: invoices[2].id, description: 'Hair Coloring', quantity: 1, unitPrice: 150, total: 150 },
      { id: uid(), invoiceId: invoices[3].id, description: 'Haircut', quantity: 1, unitPrice: 45, total: 45 },
      { id: uid(), invoiceId: invoices[4].id, description: 'Blow Dry', quantity: 1, unitPrice: 35, total: 35 },
      { id: uid(), invoiceId: invoices[5].id, description: 'Haircut', quantity: 1, unitPrice: 45, total: 45 },
      { id: uid(), invoiceId: invoices[6].id, description: 'Shave', quantity: 1, unitPrice: 30, total: 30 },
      { id: uid(), invoiceId: invoices[7].id, description: 'Haircut', quantity: 1, unitPrice: 45, total: 45 },
    ];
    const itemStore = this.stores.get('invoiceItem')!;
    for (const item of invoiceItems) itemStore.set(item.id, item);

    const pointsEntries = [
      { id: uid(), tenantId, customerId: customers[0].id, amount: 50, balanceAfter: 1250, reason: 'Service purchase', expiresAt: null, createdAt: daysAgo(2) },
      { id: uid(), tenantId, customerId: customers[0].id, amount: 45, balanceAfter: 1200, reason: 'Haircut - points earned', expiresAt: null, createdAt: daysAgo(5) },
      { id: uid(), tenantId, customerId: customers[1].id, amount: 30, balanceAfter: 800, reason: 'Beard Trim - points earned', expiresAt: null, createdAt: daysAgo(5) },
      { id: uid(), tenantId, customerId: customers[4].id, amount: 150, balanceAfter: 2200, reason: 'Hair Coloring - points earned', expiresAt: null, createdAt: daysAgo(1) },
      { id: uid(), tenantId, customerId: customers[2].id, amount: 35, balanceAfter: 300, reason: 'Blow Dry - points earned', expiresAt: null, createdAt: daysAgo(3) },
      { id: uid(), tenantId, customerId: customers[1].id, amount: 40, balanceAfter: 770, reason: 'Haircut - points earned', expiresAt: null, createdAt: daysAgo(10) },
    ];

    const pointsStore = this.stores.get('pointsLedger')!;
    for (const p of pointsEntries) pointsStore.set(p.id, p);

    const activities = [
      { id: uid(), tenantId, customerId: customers[0].id, type: 'INVOICE_PAID', message: 'Sarah Johnson paid $45.00 for Haircut', metadata: null, createdAt: now },
      { id: uid(), tenantId, customerId: customers[1].id, type: 'INVOICE_PAID', message: 'Mike Chen paid $25.00 for Beard Trim', metadata: null, createdAt: now },
      { id: uid(), tenantId, customerId: customers[4].id, type: 'APPOINTMENT_BOOKED', message: 'Lisa Brown booked a Hair Coloring appointment', metadata: null, createdAt: daysAgo(1) },
      { id: uid(), tenantId, customerId: customers[4].id, type: 'INVOICE_PAID', message: 'Lisa Brown paid $150.00 for Hair Coloring', metadata: null, createdAt: daysAgo(1) },
      { id: uid(), tenantId, customerId: customers[0].id, type: 'APPOINTMENT_BOOKED', message: 'Sarah Johnson booked a Haircut', metadata: null, createdAt: daysAgo(1) },
      { id: uid(), tenantId, customerId: customers[2].id, type: 'POINTS_EARNED', message: 'Emma Davis earned 35 points', metadata: null, createdAt: daysAgo(3) },
      { id: uid(), tenantId, customerId: customers[0].id, type: 'INVOICE_PAID', message: 'Sarah Johnson paid $45.00 for Haircut', metadata: null, createdAt: daysAgo(5) },
      { id: uid(), tenantId, customerId: customers[1].id, type: 'INVOICE_PAID', message: 'Mike Chen paid $25.00 for Beard Trim', metadata: null, createdAt: daysAgo(5) },
      { id: uid(), tenantId, customerId: customers[5].id, type: 'CUSTOMER_CREATED', message: 'New customer Alex Taylor joined', metadata: null, createdAt: daysAgo(5) },
      { id: uid(), tenantId, customerId: customers[1].id, type: 'INVOICE_PAID', message: 'Mike Chen paid $45.00 for Haircut', metadata: null, createdAt: daysAgo(10) },
      { id: uid(), tenantId, customerId: customers[3].id, type: 'INVOICE_PAID', message: 'James Wilson paid $30.00 for Shave', metadata: null, createdAt: daysAgo(15) },
    ];

    const activityStore = this.stores.get('activity')!;
    for (const a of activities) activityStore.set(a.id, a);

    const loyaltyConfig = {
      id: uid(), tenantId, mode: 'POINTS_PER_SPEND', pointsPerUnit: 1, currencyUnit: 1.0,
      expiryDays: 365, pointsPerVisit: 10, signupBonus: 50, referralBonus: 100,
      createdAt: daysAgo(90), updatedAt: now,
    };
    this.stores.get('loyaltyConfig')!.set(loyaltyConfig.id, loyaltyConfig);

    // Staff + services for booking links demo
    const staffId1 = uid();
    const staffId2 = uid();
    const staffStore = this.stores.get('staff')!;
    staffStore.set(staffId1, {
      id: staffId1, tenantId, branchId: null, name: 'Meera', email: 'meera@demo.com',
      phone: '+1-555-0101', roleTitle: 'Stylist', avatarUrl: null, isAvailable: true,
      createdAt: daysAgo(60), updatedAt: now,
    });
    staffStore.set(staffId2, {
      id: staffId2, tenantId, branchId: null, name: 'Rohan', email: 'rohan@demo.com',
      phone: '+1-555-0102', roleTitle: 'Specialist', avatarUrl: null, isAvailable: true,
      createdAt: daysAgo(60), updatedAt: now,
    });

    const serviceStore = this.stores.get('service')!;
    const demoServices = [
      { id: uid(), tenantId, name: 'Haircut', description: 'Classic cut and style', durationMinutes: 30, price: 45, category: 'Hair', pointsMultiplier: 1, isActive: true, createdAt: daysAgo(60), updatedAt: now },
      { id: uid(), tenantId, name: 'Hair Spa', description: 'Deep conditioning spa', durationMinutes: 60, price: 80, category: 'Hair', pointsMultiplier: 1.2, isActive: true, createdAt: daysAgo(60), updatedAt: now },
      { id: uid(), tenantId, name: 'Facial', description: 'Refreshing facial treatment', durationMinutes: 45, price: 70, category: 'Skin', pointsMultiplier: 1, isActive: true, createdAt: daysAgo(60), updatedAt: now },
      { id: uid(), tenantId, name: 'Consultation', description: 'Style consultation', durationMinutes: 20, price: 0, category: 'General', pointsMultiplier: 1, isActive: true, createdAt: daysAgo(60), updatedAt: now },
    ];
    for (const s of demoServices) serviceStore.set(s.id, s);

    const blId = uid();
    const blId2 = uid();
    const blId3 = uid();
    const defaultPage = {
      sections: [
        { id: 'hero', enabled: true },
        { id: 'about', enabled: true },
        { id: 'services', enabled: true },
        { id: 'staff', enabled: true },
        { id: 'gallery', enabled: false },
        { id: 'testimonials', enabled: true },
        { id: 'membership', enabled: false },
        { id: 'loyalty', enabled: false },
        { id: 'booking', enabled: true },
        { id: 'faq', enabled: true },
        { id: 'contact', enabled: true },
        { id: 'map', enabled: true },
        { id: 'footer', enabled: true },
      ],
      tagline: 'Book your next appointment online',
      about: 'Premium salon services with experienced stylists. Book online in minutes.',
      heroCta: 'Book Now',
      policies: 'Cancellations must be made at least 24 hours in advance.',
      faqs: [
        { question: 'How do I book?', answer: 'Select a service, choose staff and a time, then confirm.' },
        { question: 'Can I reschedule?', answer: 'Yes — contact us before the cutoff window.' },
      ],
      gallery: [],
      testimonials: [
        { name: 'Priya S.', rating: 5, text: 'Smooth booking and wonderful service!' },
        { name: 'Amit K.', rating: 5, text: 'Professional staff and quick process.' },
      ],
      membershipBlurb: 'Members enjoy priority booking and exclusive discounts.',
      loyaltyBlurb: 'Earn points on every visit and redeem rewards.',
    };
    this.stores.get('bookingLink')!.set(blId, {
      id: blId,
      tenantId,
      staffId: null,
      slug: 'demo-book',
      type: 'COMPANY',
      name: 'Main Booking Link',
      description: 'Book with Demo Business',
      isActive: true,
      isPaused: false,
      allowCustomTime: true,
      assignmentMode: 'AUTO',
      staffIds: [staffId1, staffId2],
      serviceIds: [],
      customerFields: null,
      rules: { maxAdvanceBookingDays: 60, minNoticeMinutes: 30, maxAppointmentsPerDay: 50, maxBookingsPerSlot: 1, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, approvalMode: 'AUTOMATIC', cancellationWindowHours: 24, reschedulePolicyHours: 12 },
      payment: { mode: 'NONE', methods: ['CASH', 'UPI'], payAtStore: true },
      loyalty: { earnPoints: true, membershipDiscount: true },
      membershipAccess: { access: 'EVERYONE' },
      authMode: { mode: 'GUEST', emailLogin: true, returningCustomerLogin: true },
      branding: {
        confirmationMessage: 'You are booked! See you soon.',
        themeColor: '#2563EB',
        primaryColor: '#2563EB',
        showRating: true,
        showMap: true,
        showWhatsApp: true,
        showSocial: true,
        qrColor: '#111827',
      },
      automations: { confirmationEmail: true, confirmationWhatsApp: true, addLoyaltyPoints: true, generateInvoice: true, notifyStaff: true, createCustomer: true },
      pageConfig: defaultPage,
      seo: { keywords: 'salon, booking, appointment', ogImage: '', favicon: '', schemaType: 'LocalBusiness' },
      domain: { subdomain: 'demo-book.doloyal.ai', customDomain: '', status: 'PENDING' },
      confirmationMessage: 'You are booked! See you soon.',
      redirectUrl: null,
      webhookUrl: null,
      theme: null,
      expiresAt: null,
      visitCount: 12,
      bookingCount: 3,
      revenueGenerated: 195,
      lastBookingAt: daysAgo(1),
      roundRobinIndex: 0,
      metaTitle: "Demo's Business — Book Online",
      metaDescription: 'Book your next appointment online',
      status: 'PUBLISHED',
      publishedAt: daysAgo(14),
      createdAt: daysAgo(14),
      updatedAt: now,
    });
    this.stores.get('bookingLink')!.set(blId2, {
      id: blId2,
      tenantId,
      staffId: staffId1,
      slug: 'meera',
      type: 'PERSONAL',
      name: "Meera's Booking Link",
      description: 'Book directly with Meera',
      isActive: true,
      isPaused: false,
      allowCustomTime: true,
      assignmentMode: 'SINGLE',
      staffIds: [staffId1],
      serviceIds: [],
      customerFields: null,
      rules: { maxAdvanceBookingDays: 45, minNoticeMinutes: 60, approvalMode: 'AUTOMATIC' },
      payment: { mode: 'NONE', methods: ['CASH', 'UPI'], payAtStore: true },
      loyalty: { earnPoints: true },
      membershipAccess: { access: 'EVERYONE' },
      authMode: { mode: 'GUEST' },
      branding: { themeColor: '#EC4899', primaryColor: '#EC4899', confirmationMessage: 'Booked with Meera!' },
      automations: { confirmationEmail: true, addLoyaltyPoints: true, generateInvoice: true },
      pageConfig: { ...defaultPage, tagline: 'Book with Meera', about: 'Senior stylist specializing in cuts and color.' },
      seo: { keywords: 'meera, stylist', schemaType: 'LocalBusiness' },
      domain: { subdomain: 'meera.doloyal.ai', customDomain: '', status: 'PENDING' },
      confirmationMessage: 'Booked with Meera!',
      redirectUrl: null,
      webhookUrl: null,
      theme: null,
      expiresAt: null,
      visitCount: 8,
      bookingCount: 2,
      revenueGenerated: 90,
      lastBookingAt: daysAgo(3),
      roundRobinIndex: 0,
      metaTitle: 'Book with Meera',
      metaDescription: 'Book an appointment with Meera',
      status: 'PUBLISHED',
      publishedAt: daysAgo(10),
      createdAt: daysAgo(10),
      updatedAt: now,
    });
    this.stores.get('bookingLink')!.set(blId3, {
      id: blId3,
      tenantId,
      staffId: staffId2,
      slug: 'rohan',
      type: 'PERSONAL',
      name: "Rohan's Booking Link",
      description: 'Book directly with Rohan',
      isActive: true,
      isPaused: false,
      allowCustomTime: true,
      assignmentMode: 'SINGLE',
      staffIds: [staffId2],
      serviceIds: [],
      customerFields: null,
      rules: { maxAdvanceBookingDays: 45, minNoticeMinutes: 60, approvalMode: 'AUTOMATIC' },
      payment: { mode: 'NONE', methods: ['CASH'], payAtStore: true },
      loyalty: { earnPoints: true },
      membershipAccess: { access: 'EVERYONE' },
      authMode: { mode: 'GUEST' },
      branding: { themeColor: '#10B981', primaryColor: '#10B981' },
      automations: { confirmationEmail: true, addLoyaltyPoints: true },
      pageConfig: { ...defaultPage, tagline: 'Book with Rohan' },
      seo: { keywords: 'rohan', schemaType: 'LocalBusiness' },
      domain: { subdomain: 'rohan.doloyal.ai', customDomain: '', status: 'PENDING' },
      confirmationMessage: null,
      redirectUrl: null,
      webhookUrl: null,
      theme: null,
      expiresAt: null,
      visitCount: 4,
      bookingCount: 1,
      revenueGenerated: 45,
      lastBookingAt: daysAgo(5),
      roundRobinIndex: 0,
      metaTitle: 'Book with Rohan',
      metaDescription: 'Book an appointment with Rohan',
      status: 'PUBLISHED',
      publishedAt: daysAgo(7),
      createdAt: daysAgo(7),
      updatedAt: now,
    });

    const availId = uid();
    this.stores.get('availabilityConfig')!.set(availId, {
      id: availId,
      tenantId,
      monday: { start: '09:00', end: '18:00', isAvailable: true },
      tuesday: { start: '09:00', end: '18:00', isAvailable: true },
      wednesday: { start: '09:00', end: '18:00', isAvailable: true },
      thursday: { start: '09:00', end: '18:00', isAvailable: true },
      friday: { start: '09:00', end: '18:00', isAvailable: true },
      saturday: { start: '10:00', end: '16:00', isAvailable: true },
      sunday: { start: '10:00', end: '14:00', isAvailable: false },
      slotIntervalMinutes: 30,
      createdAt: daysAgo(30),
      updatedAt: now,
    });
  }

  private applyInMemoryProxy() {
    for (const name of ALL_MODELS) {
      Object.defineProperty(this, name, {
        get: () => this.createDelegate(name),
        configurable: true,
      });
    }
  }

  private createDelegate(model: string) {
    const store = this.stores.get(model)!;

    const findUnique = async (args: any) => {
      const records = [...store.values()];
      const found = records.find(r => this.matchUnique(r, args?.where));
      if (!found) return null;
      return resolveInclude(found, args?.include, this.stores);
    };

    const findFirst = async (args: any) => {
      const records = [...store.values()];
      const found = this.applyOrderBy(
        records.filter(r => matchWhere(r, args?.where)),
        args?.orderBy,
      )[0];
      if (!found) return null;
      return resolveInclude(found, args?.include, this.stores);
    };

    const findMany = async (args: any) => {
      let records = [...store.values()];
      if (args?.where) {
        records = records.filter(r => matchWhere(r, args.where));
      }
      records = this.applyOrderBy(records, args?.orderBy);
      if (args?.skip) records = records.slice(args.skip);
      if (args?.take) records = records.slice(0, args.take);
      return records.map(r => resolveInclude(r, args?.include, this.stores));
    };

    const create = async (args: any) => {
      const id = uid();
      const now = new Date();
      const record = {
        id,
        ...args.data,
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, record);

      let result = { ...record };
      if (args?.include) {
        result = resolveInclude(result, args.include, this.stores);
      }
      return result;
    };

    const update = async (args: any) => {
      let record: any;
      if (args.where.id) {
        record = store.get(args.where.id);
      } else {
        record = [...store.values()].find(r => this.matchUnique(r, args.where));
      }
      if (!record) throw new Error(`Record not found in ${model}`);

      const updated = {
        ...record,
        ...args.data,
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: new Date(),
      };
      store.set(record.id, updated);

      let result = { ...updated };
      if (args?.include) {
        result = resolveInclude(result, args.include, this.stores);
      }
      return result;
    };

    const upsert = async (args: any) => {
      let record: any;
      if (args.where.id) {
        record = store.get(args.where.id);
      } else {
        record = [...store.values()].find(r => this.matchUnique(r, args.where));
      }

      if (record) {
        const updated = {
          ...record,
          ...args.update,
          id: record.id,
          createdAt: record.createdAt,
          updatedAt: new Date(),
        };
        store.set(record.id, updated);

        let result = { ...updated };
        if (args?.include) {
          result = resolveInclude(result, args.include, this.stores);
        }
        return result;
      } else {
        return create({ data: args.create, include: args.include });
      }
    };

    const deleteFn = async (args: any) => {
      let record: any;
      if (args.where.id) {
        record = store.get(args.where.id);
      } else {
        record = [...store.values()].find(r => this.matchUnique(r, args.where));
      }
      if (!record) throw new Error(`Record not found in ${model}`);
      store.delete(record.id);
      return record;
    };

    const count = async (args: any) => {
      let records = [...store.values()];
      if (args?.where) {
        records = records.filter(r => matchWhere(r, args.where));
      }
      return records.length;
    };

    const deleteMany = async (args: any) => {
      let records = [...store.values()];
      if (args?.where) {
        records = records.filter(r => matchWhere(r, args.where));
      }
      const ids = records.map(r => r.id);
      ids.forEach(id => store.delete(id));
      return { count: ids.length };
    };

    const aggregate = async (args: any) => {
      let records = [...store.values()];
      if (args?.where) records = records.filter(r => matchWhere(r, args.where));
      const result: Record<string, any> = {};
      if (args._sum) {
        result._sum = {};
        for (const field of Object.keys(args._sum)) {
          result._sum[field] = records.reduce((s, r) => s + (Number(r[field]) || 0), 0);
        }
      }
      if (args._count === true) {
        result._count = records.length;
      }
      if (args._avg) {
        result._avg = {};
        for (const field of Object.keys(args._avg)) {
          const sum = records.reduce((s, r) => s + (Number(r[field]) || 0), 0);
          result._avg[field] = records.length > 0 ? sum / records.length : 0;
        }
      }
      if (args._min) {
        result._min = {};
        for (const field of Object.keys(args._min)) {
          result._min[field] = records.length > 0 ? Math.min(...records.map(r => Number(r[field]) || 0)) : 0;
        }
      }
      if (args._max) {
        result._max = {};
        for (const field of Object.keys(args._max)) {
          result._max[field] = records.length > 0 ? Math.max(...records.map(r => Number(r[field]) || 0)) : 0;
        }
      }
      return result;
    };

    const groupBy = async (args: any) => {
      let records = [...store.values()];
      if (args?.where) records = records.filter(r => matchWhere(r, args.where));
      const byField = Array.isArray(args.by) ? args.by[0] : args.by;
      const groups = new Map<string, any[]>();
      for (const r of records) {
        const key = String(r[byField] ?? 'null');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
      const result: any[] = [];
      for (const [key, group] of groups) {
        const item: Record<string, any> = { [byField]: key };
        if (args._count) {
          item._count = {};
          for (const field of Object.keys(args._count)) {
            item._count[field] = args._count[field] === true ? group.length : undefined;
          }
        }
        if (args.having) {
          const havingKey = Object.keys(args.having)[0];
          const havingOp = Object.keys(args.having[havingKey])[0];
          const havingVal = args.having[havingKey][havingOp];
          const havingField = Object.keys(args.having[havingKey][havingOp] || {})[0];
          if (havingOp === '_count') {
            const count = group.length;
            if (havingField) {
              const thresholdValue = args.having[havingKey][havingOp][havingField]?.gte ?? 0;
              if (count < thresholdValue) continue;
            }
          }
        }
        result.push(item);
      }
      return result;
    };

    return {
      findUnique,
      findFirst,
      findMany,
      create,
      update,
      upsert,
      delete: deleteFn,
      count,
      deleteMany,
      aggregate,
      groupBy,
    };
  }

  private matchUnique(record: any, where: any): boolean {
    if (!where) return false;
    if (where.id && record.id === where.id) return true;

    // compound unique keys like userId_tenantId, tenantId_type
    for (const key of Object.keys(where)) {
      if (key.includes('_') && typeof where[key] === 'object') {
        const fields = key.split('_');
        const vals = where[key] as Record<string, any>;
        if (fields.every((f: string) => record[f] === vals[f])) return true;
      }
    }

    return matchWhere(record, where);
  }

  private applyOrderBy(records: any[], orderBy?: any) {
    if (!orderBy) return records;
    const sorted = [...records];
    const orderKey = Object.keys(orderBy)[0];
    const orderDir = orderBy[orderKey];
    sorted.sort((a, b) => {
      if (a[orderKey] < b[orderKey]) return orderDir === 'asc' ? -1 : 1;
      if (a[orderKey] > b[orderKey]) return orderDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  private applyTenantMiddleware() {
    this.$use(async (params: any, next: any) => {
      const store = tenantContext.getStore();
      if (!store || !TENANT_MODELS.has(params.model || '')) {
        return next(params);
      }
      const { tenantId } = store;

      if (
        params.action === 'create' ||
        params.action === 'createMany'
      ) {
        if (params.action === 'create') {
          params.args.data = { ...params.args.data, tenantId };
        } else if (params.action === 'createMany') {
          params.args.data = (params.args.data as any[]).map((d) => ({
            ...d,
            tenantId,
          }));
        }
        return next(params);
      }

      if (
        params.action === 'findUnique' ||
        params.action === 'findFirst'
      ) {
        if (params.action === 'findUnique') {
          params.action = 'findFirst';
        }
        params.args.where = { ...params.args.where, tenantId };
        return next(params);
      }

      if (
        params.action === 'findMany' ||
        params.action === 'count' ||
        params.action === 'aggregate' ||
        params.action === 'groupBy'
      ) {
        params.args.where = { ...params.args.where, tenantId };
        return next(params);
      }

      if (
        params.action === 'update' ||
        params.action === 'updateMany' ||
        params.action === 'delete' ||
        params.action === 'deleteMany'
      ) {
        params.args.where = { ...params.args.where, tenantId };
        return next(params);
      }

      if (params.action === 'upsert') {
        params.args.where = { ...params.args.where, tenantId };
        params.args.create = { ...params.args.create, tenantId };
        params.args.update = { ...params.args.update, tenantId };
        return next(params);
      }

      return next(params);
    });
  }
}