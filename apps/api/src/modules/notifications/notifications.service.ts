import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface AppNotification {
  id: string;
  /** ANNOUNCEMENT | TICKET | WEBSITE | BILLING | FEEDBACK | TREND */
  type: string;
  title: string;
  message: string | null;
  /** INFO | SUCCESS | WARNING */
  severity: string;
  link: string | null;
  createdAt: string;
}

const DAY_MS = 86_400_000;
const FEED_LIMIT = 40;

const TICKET_EVENTS = ['ADMIN_REPLIED', 'STATUS_CHANGED', 'RESOLVED'];
const BILLING_ACTIONS = [
  'subscription.planChanged',
  'subscription.canceled',
  'subscription.restarted',
  'subscription.trialExtended',
  'contract.enterpriseCreated',
];
const BILLING_TITLES: Record<string, string> = {
  'subscription.planChanged': 'Your plan was changed',
  'subscription.canceled': 'Your subscription was cancelled',
  'subscription.restarted': 'Your subscription was restarted',
  'subscription.trialExtended': 'Your free trial was extended',
  'contract.enterpriseCreated': 'An enterprise contract was added to your account',
};

function label(value: unknown): string {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function percentChange(current: number, previous: number): number {
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * The staff notification feed. It is derived from records that already exist
 * (announcements, support ticket events, website request status changes,
 * admin billing actions, feedback status and last week's numbers) rather than
 * a table of its own, so a platform-wide announcement needs no per-business
 * fan-out and removing one in the admin panel removes it here too.
 *
 * Every source is filtered by the caller's tenant (and, for tickets, the
 * caller's own tickets). Read state is kept by the client.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(user: any): Promise<{ items: AppNotification[] }> {
    const tenantId: string = user.activeTenantId;
    const canSeeBusiness = user.activeRole === 'OWNER' || user.activeRole === 'MANAGER';
    const now = new Date();

    // Five concurrent statements: the production pool holds five connections.
    const [announcements, ticketEvents, websiteChanges, billing, business] = await Promise.all([
      this.prisma.announcement
        .findMany({
          where: {
            published: true,
            AND: [
              { OR: [{ publishDate: null }, { publishDate: { lte: now } }] },
              { OR: [{ expiryDate: null }, { expiryDate: { gt: now } }] },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        })
        .catch(() => []),
      this.prisma.supportTicketEvent
        .findMany({
          where: { tenantId, eventType: { in: TICKET_EVENTS }, ticket: { userId: user.id } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { ticket: { select: { id: true, subject: true, ticketNumber: true } } },
        })
        .catch(() => []),
      this.prisma.websiteProjectStatusHistory
        .findMany({
          where: { oldStatus: { not: null }, project: { tenantId } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { project: { select: { id: true, name: true } } },
        })
        .catch(() => []),
      canSeeBusiness ? this.loadBillingActions(tenantId) : Promise.resolve([]),
      this.loadBusiness(tenantId, now),
    ]);

    const items: AppNotification[] = [];

    for (const a of announcements) {
      if (!this.audienceMatches(a, tenantId, business)) continue;
      items.push({
        id: `announcement-${a.id}`,
        type: 'ANNOUNCEMENT',
        title: a.title,
        message: a.message,
        severity: a.type === 'MAINTENANCE' || a.type === 'IMPORTANT' ? 'WARNING' : 'INFO',
        link: null,
        createdAt: (a.publishDate ?? a.createdAt).toISOString(),
      });
    }

    for (const e of ticketEvents) {
      const meta = (e.metadata ?? {}) as { newStatus?: string; note?: string | null };
      const ref = `#${e.ticket.ticketNumber}`;
      const title =
        e.eventType === 'ADMIN_REPLIED'
          ? `Support replied to ticket ${ref}`
          : e.eventType === 'RESOLVED'
            ? `Ticket ${ref} was ${meta.newStatus === 'CLOSED' ? 'closed' : 'resolved'}`
            : `Ticket ${ref} is now ${label(meta.newStatus).toLowerCase() || 'updated'}`;
      items.push({
        id: `ticket-${e.id}`,
        type: 'TICKET',
        title,
        message: meta.note || e.ticket.subject,
        severity: e.eventType === 'RESOLVED' ? 'SUCCESS' : 'INFO',
        link: `/app/help/tickets/${e.ticket.id}`,
        createdAt: e.createdAt.toISOString(),
      });
    }

    for (const w of websiteChanges) {
      items.push({
        id: `website-${w.id}`,
        type: 'WEBSITE',
        title: `Website request "${w.project.name}" is now ${label(w.newStatus).toLowerCase()}`,
        message: w.note,
        severity: w.newStatus === 'PUBLISHED' || w.newStatus === 'COMPLETED' ? 'SUCCESS' : 'INFO',
        link: `/app/websites/${w.project.id}`,
        createdAt: w.createdAt.toISOString(),
      });
    }

    for (const b of billing) {
      const meta = (b.metadata ?? {}) as { from?: string; to?: string };
      items.push({
        id: `billing-${b.id}`,
        type: 'BILLING',
        title: BILLING_TITLES[b.action] ?? 'Your account was updated',
        message: meta.to ? `${meta.from ? `${label(meta.from)} → ` : ''}${label(meta.to)}` : null,
        severity: b.action === 'subscription.canceled' ? 'WARNING' : 'INFO',
        link: '/app/billing',
        createdAt: b.createdAt.toISOString(),
      });
    }

    for (const f of business?.feedback ?? []) {
      items.push({
        id: `feedback-${f.id}-${f.status}`,
        type: 'FEEDBACK',
        title: `Your request "${f.title}" is now ${label(f.status).toLowerCase()}`,
        message: null,
        severity: f.status === 'RELEASED' ? 'SUCCESS' : f.status === 'REJECTED' ? 'WARNING' : 'INFO',
        link: null,
        createdAt: new Date(f.updatedAt).toISOString(),
      });
    }

    if (canSeeBusiness && business) items.push(...this.trendItems(business));

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return { items: items.slice(0, FEED_LIMIT) };
  }

  private audienceMatches(
    announcement: { audience: string; selectedTenantIds: string[] },
    tenantId: string,
    business: { plan: string | null; status: string | null } | null,
  ): boolean {
    if (announcement.audience === 'ALL') return true;
    if (announcement.audience === 'SELECTED_BUSINESSES') {
      return announcement.selectedTenantIds.includes(tenantId);
    }
    const plan = (business?.plan ?? '').toLowerCase();
    if (announcement.audience === 'TRIAL') {
      return business?.status === 'TRIALING' || plan.includes('trial');
    }
    return plan === announcement.audience.toLowerCase();
  }

  private loadBillingActions(tenantId: string) {
    return this.prisma
      .$queryRaw<Array<{ id: string; action: string; metadata: unknown; createdAt: Date }>>`
        SELECT a.id, a.action, a.metadata, a."createdAt"
        FROM "AdminAuditLog" a
        WHERE a.action = ANY(${BILLING_ACTIONS})
          AND (
            (a."targetType" = 'tenant' AND a."targetId" = ${tenantId})
            OR (
              a."targetType" = 'subscription'
              AND a."targetId" IN (SELECT s.id FROM "Subscription" s WHERE s."tenantId" = ${tenantId})
            )
          )
        ORDER BY a."createdAt" DESC
        LIMIT 10
      `
      .catch(() => []);
  }

  /**
   * Plan, feedback updates and the last two completed weeks (Mon–Sun, UTC) of
   * revenue and new customers, in one statement. Revenue uses the dashboard's
   * definition: paid invoices plus paid or completed orders.
   */
  private async loadBusiness(tenantId: string, now: Date) {
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const weekStart = new Date(today - ((now.getUTCDay() + 6) % 7) * DAY_MS);
    const lastStart = new Date(weekStart.getTime() - 7 * DAY_MS);
    const prevStart = new Date(weekStart.getTime() - 14 * DAY_MS);
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{
          plan: string | null;
          status: string | null;
          lastRevenue: number;
          prevRevenue: number;
          lastCustomers: number;
          prevCustomers: number;
          feedback: Array<{ id: string; title: string; status: string; updatedAt: string }> | null;
        }>
      >`
        SELECT
          (SELECT s.plan FROM "Subscription" s WHERE s."tenantId" = ${tenantId} LIMIT 1) AS plan,
          (SELECT s.status FROM "Subscription" s WHERE s."tenantId" = ${tenantId} LIMIT 1) AS status,
          (
            COALESCE((SELECT SUM(i.total) FROM "Invoice" i
              WHERE i."tenantId" = ${tenantId} AND i.status = 'PAID'::"InvoiceStatus"
                AND i."createdAt" >= ${lastStart} AND i."createdAt" < ${weekStart}), 0)
            + COALESCE((SELECT SUM(o.total) FROM "ClientOrder" o
              WHERE o."tenantId" = ${tenantId}
                AND o.status <> 'CANCELLED'::"ClientOrderStatus"
                AND o."paymentStatus" <> 'REFUNDED'::"ClientOrderPaymentStatus"
                AND (o."paymentStatus" = 'PAID'::"ClientOrderPaymentStatus" OR o.status = 'COMPLETED'::"ClientOrderStatus")
                AND o."orderDate" >= ${lastStart} AND o."orderDate" < ${weekStart}), 0)
          )::float8 AS "lastRevenue",
          (
            COALESCE((SELECT SUM(i.total) FROM "Invoice" i
              WHERE i."tenantId" = ${tenantId} AND i.status = 'PAID'::"InvoiceStatus"
                AND i."createdAt" >= ${prevStart} AND i."createdAt" < ${lastStart}), 0)
            + COALESCE((SELECT SUM(o.total) FROM "ClientOrder" o
              WHERE o."tenantId" = ${tenantId}
                AND o.status <> 'CANCELLED'::"ClientOrderStatus"
                AND o."paymentStatus" <> 'REFUNDED'::"ClientOrderPaymentStatus"
                AND (o."paymentStatus" = 'PAID'::"ClientOrderPaymentStatus" OR o.status = 'COMPLETED'::"ClientOrderStatus")
                AND o."orderDate" >= ${prevStart} AND o."orderDate" < ${lastStart}), 0)
          )::float8 AS "prevRevenue",
          (SELECT COUNT(*) FROM "Customer" c
            WHERE c."tenantId" = ${tenantId} AND c."createdAt" >= ${lastStart} AND c."createdAt" < ${weekStart})::float8 AS "lastCustomers",
          (SELECT COUNT(*) FROM "Customer" c
            WHERE c."tenantId" = ${tenantId} AND c."createdAt" >= ${prevStart} AND c."createdAt" < ${lastStart})::float8 AS "prevCustomers",
          (SELECT json_agg(f) FROM (
            SELECT fr.id, fr.title, fr.status::text AS status, fr."updatedAt"
            FROM "FeedbackRequest" fr
            WHERE fr."tenantId" = ${tenantId} AND fr.status <> 'NEW'::"FeedbackStatus"
            ORDER BY fr."updatedAt" DESC
            LIMIT 10
          ) f) AS feedback
      `;
      const row = rows[0];
      return row ? { ...row, feedback: row.feedback ?? [], weekStart } : null;
    } catch {
      return null;
    }
  }

  private trendItems(business: {
    lastRevenue: number;
    prevRevenue: number;
    lastCustomers: number;
    prevCustomers: number;
    weekStart: Date;
  }): AppNotification[] {
    const items: AppNotification[] = [];
    const createdAt = business.weekStart.toISOString();
    const week = createdAt.slice(0, 10);
    const { lastRevenue, prevRevenue, lastCustomers, prevCustomers } = business;

    if (prevRevenue > 0 && lastRevenue !== prevRevenue) {
      const change = percentChange(lastRevenue, prevRevenue);
      if (Math.abs(change) >= 10) {
        items.push({
          id: `trend-revenue-${week}`,
          type: 'TREND',
          title: `Revenue ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change)}% last week`,
          message: 'Compared with the week before.',
          severity: change > 0 ? 'SUCCESS' : 'WARNING',
          link: '/app/analytics',
          createdAt,
        });
      }
    } else if (prevRevenue === 0 && lastRevenue > 0) {
      items.push({
        id: `trend-revenue-${week}`,
        type: 'TREND',
        title: 'Revenue increased last week',
        message: 'You had sales last week after none the week before.',
        severity: 'SUCCESS',
        link: '/app/analytics',
        createdAt,
      });
    }

    if (lastCustomers !== prevCustomers && (lastCustomers > 0 || prevCustomers > 0)) {
      const up = lastCustomers > prevCustomers;
      items.push({
        id: `trend-customers-${week}`,
        type: 'TREND',
        title: `New customers ${up ? 'increased' : 'decreased'} last week`,
        message: `${lastCustomers} new last week, ${prevCustomers} the week before.`,
        severity: up ? 'SUCCESS' : 'WARNING',
        link: '/app/customers',
        createdAt,
      });
    }
    return items;
  }
}
