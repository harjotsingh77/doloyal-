import type { QueryKey } from "@tanstack/react-query";
import { api } from "./api";
import { getStaffAuthToken } from "./access-token";
import { writeQuerySnapshot } from "./api-cache";
import { TENANT_QUERY_KEY } from "./tenant-query";

let queued = false;
let pausedUntil = 0;

/** Same default window the dashboard page uses: last 30 days as UTC YMD. */
export function defaultDashboardRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400000);
  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  return { from: toYMD(start), to: toYMD(end) };
}

/** Pause background warm-up while the user is opening another page. */
export function pausePrefetch(ms = 2500) {
  pausedUntil = Date.now() + ms;
}

async function warm(queryKey: QueryKey, run: () => Promise<unknown>) {
  const data = await run();
  writeQuerySnapshot(queryKey, getStaffAuthToken(), data);
  return data;
}

/**
 * Warm a short list of sidebar destinations, one request at a time,
 * only after the current page has painted. Skips work that would fight
 * the active navigation for bandwidth / DB connections.
 */
export function prefetchWorkspace() {
  if (queued || typeof window === "undefined") return;
  queued = true;
  const range = defaultDashboardRange();
  const jobs: Array<() => Promise<unknown>> = [
    () => warm([...TENANT_QUERY_KEY], () => api.getTenant()),
    () => warm(["customers", "", "ALL", "ALL"], () => api.listCustomers({ limit: 50 })),
    () => warm(["campaigns"], () => api.listCampaigns()),
    () => warm(["membership-tiers"], () => api.getTiers()),
    () => warm(["appointments", "ALL", "", ""], () => api.listAppointments()),
    () => warm(["invoices-page", "ALL"], () => api.listInvoices()),
    () =>
      api.listBookingLinks().then((links) => {
        const token = getStaffAuthToken();
        writeQuerySnapshot(["client-page-booking-links"], token, links);
        writeQuerySnapshot(["booking-links"], token, links);
        return links;
      }),
    () =>
      warm(["dashboard-overview", range.from, range.to], () =>
        api.getDashboardOverview({ from: range.from, to: range.to }),
      ),
    () => {
      const entry = HREF_PREFETCH["/app/customers/products"];
      const key = typeof entry.queryKey === "function" ? entry.queryKey() : entry.queryKey;
      return warm(key, entry.run);
    },
    () => {
      const entry = HREF_PREFETCH["/app/customers/orders"];
      const key = typeof entry.queryKey === "function" ? entry.queryKey() : entry.queryKey;
      return warm(key, entry.run);
    },
    () => {
      const entry = HREF_PREFETCH["/app/reviews"];
      const key = typeof entry.queryKey === "function" ? entry.queryKey() : entry.queryKey;
      return warm(key, entry.run);
    },
  ];
  const run = (index: number) => {
    if (index >= jobs.length) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      window.setTimeout(() => run(index), 1000);
      return;
    }
    if (Date.now() < pausedUntil) {
      window.setTimeout(() => run(index), Math.max(200, pausedUntil - Date.now()));
      return;
    }
    jobs[index]()
      .catch(() => undefined)
      .finally(() => {
        window.setTimeout(() => run(index + 1), 450);
      });
  };
  window.setTimeout(() => run(0), 1200);
}

type PrefetchEntry = {
  queryKey: QueryKey | (() => QueryKey);
  run: () => Promise<unknown>;
};

const HREF_PREFETCH: Record<string, PrefetchEntry> = {
  "/app/dashboard": {
    queryKey: () => {
      const range = defaultDashboardRange();
      return ["dashboard-overview", range.from, range.to];
    },
    run: () => {
      const range = defaultDashboardRange();
      return api.getDashboardOverview({ from: range.from, to: range.to });
    },
  },
  "/app/analytics": {
    queryKey: () => {
      const to = new Date().toISOString().split("T")[0];
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      const from = fromDate.toISOString().split("T")[0];
      return ["analytics-overview", "30", from, to];
    },
    run: () => api.getDashboardOverview({ days: "30" }),
  },
  "/app/customers": {
    queryKey: ["customers", "", "ALL", "ALL"],
    run: () => api.listCustomers({ limit: 50 }),
  },
  "/app/customers/products": {
    queryKey: ["products-page", "", "__all__", "ALL", "ALL", "updatedAt", "desc", 1],
    run: async () => {
      const query = {
        page: 1,
        limit: 20,
        sort: "updatedAt" as const,
        order: "desc" as const,
        status: "ALL" as const,
        stock: "ALL" as const,
      };
      const [list, stats, cats] = await Promise.all([
        api.listProducts(query),
        api.getProductSummary(),
        api.listProductCategories(),
      ]);
      return {
        products: list.items,
        total: list.total,
        summary: stats,
        categories: cats,
      };
    },
  },
  "/app/customers/orders": {
    queryKey: ["orders-page", "", "__all__", "ALL", "ALL", "", "", 1],
    run: async () => {
      const query = {
        page: 1,
        limit: 20,
        status: "ALL" as const,
        paymentStatus: "ALL" as const,
      };
      const [list, stats] = await Promise.all([
        api.listOrders(query),
        api.getOrderSummary(),
      ]);
      return {
        orders: list.items,
        total: list.total,
        summary: stats,
      };
    },
  },
  "/app/campaigns": {
    queryKey: ["campaigns"],
    run: () => api.listCampaigns(),
  },
  "/app/loyalty": {
    queryKey: ["loyalty-overview", ""],
    run: () => api.getLoyaltyOverview(),
  },
  "/app/rewards": {
    queryKey: ["rewards-page", "STANDARD", ""],
    run: async () => {
      const [ov, list, progs, reds] = await Promise.all([
        api.getRewardsOverview(),
        api.listRewards({ category: "STANDARD" }),
        api.listRewardPrograms(),
        api.getRedemptions({ page: 1, pageSize: 50 }),
      ]);
      return {
        overview: ov,
        rewards: list,
        programs: progs,
        redemptions: reds.items || [],
      };
    },
  },
  "/app/memberships": {
    queryKey: ["membership-tiers"],
    run: () => api.getTiers(),
  },
  "/app/referrals": {
    queryKey: ["referrals-page", { range: "30d" }, ""],
    run: async () => {
      const rangeParams = { range: "30d" };
      const [ov, an, fn, lb, camps, ln, conv] = await Promise.all([
        api.getReferralOverview(rangeParams),
        api.getReferralAnalytics(rangeParams),
        api.getReferralFunnel(rangeParams),
        api.getReferralLeaderboard(),
        api.listReferralCampaigns(),
        api.listReferralLinks(),
        api.listReferralConversions({ pageSize: 30 }),
      ]);
      return {
        overview: ov,
        analytics: an,
        funnel: Array.isArray(fn) ? fn : [],
        leaderboard: Array.isArray(lb) ? lb : [],
        campaigns: (camps || []).map((c: any) => ({
          ...c,
          startsAt: c.startsAt?.toISOString?.() || c.startsAt,
          endsAt: c.endsAt?.toISOString?.() || c.endsAt,
          createdAt: c.createdAt?.toISOString?.() || c.createdAt,
          updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
        })),
        links: ln || [],
        conversions: conv?.items || [],
      };
    },
  },
  "/app/appointments": {
    queryKey: ["appointments", "ALL", "", ""],
    run: () => api.listAppointments(),
  },
  "/app/appointments/booking-links": {
    queryKey: ["booking-links"],
    run: () => api.listBookingLinks(),
  },
  "/app/invoices": {
    queryKey: ["invoices-page", "ALL"],
    run: () => api.listInvoices(),
  },
  "/app/reviews": {
    queryKey: ["reviews-page", "", "ALL", "ALL"],
    run: async () => {
      const [summary, page] = await Promise.all([
        api.getReviewSummary(),
        api.listReviews({ filter: "ALL", limit: 30 }),
      ]);
      return {
        summary,
        reviews: page.items,
        hasMore: page.hasMore,
        cursor: page.nextCursor,
      };
    },
  },
  "/app/staff": {
    queryKey: ["staff-members", "", "ALL", "ALL", "dateJoined", "desc", 1],
    run: () =>
      api.listStaffMembers({
        page: 1,
        pageSize: 20,
        sortBy: "dateJoined",
        sortDir: "desc",
      }),
  },
  "/app/branches": {
    queryKey: ["branches"],
    run: () => api.listBranches(),
  },
  "/app/integrations": {
    queryKey: ["integrations-boot"],
    run: async () => {
      const [provs, list] = await Promise.all([
        api.listIntegrationProviders().catch(() => []),
        api.listIntegrations().catch(() => []),
      ]);
      const validProvs = Array.isArray(provs) ? provs : [];
      const providers = validProvs.filter(
        (p: any) => p && p.type !== "SMS" && p.type !== "sms" && p.name !== "SMS Provider",
      );
      const map: Record<string, any> = {};
      if (Array.isArray(list)) {
        for (const i of list) {
          if (i?.type) map[i.type.toLowerCase()] = i;
        }
      }
      return { providers, integrations: map };
    },
  },
  "/app/billing": {
    queryKey: ["billing-boot"],
    run: async () => {
      const [nextSub, nextTenant, nextHistory] = await Promise.all([
        api.getSubscription().catch(() => null),
        api.getTenant(),
        api.getBillingHistory().catch(() => []),
      ]);
      return { sub: nextSub, tenant: nextTenant, history: nextHistory };
    },
  },
  "/app/help": {
    queryKey: ["help-boot"],
    run: async () => {
      const [faqRes, ticketRes] = await Promise.all([
        api.listHelpArticles({ faq: true }),
        api.listSupportTickets(),
      ]);
      return { faqs: faqRes.articles, tickets: ticketRes };
    },
  },
  "/app/settings": {
    queryKey: [...TENANT_QUERY_KEY],
    run: () => api.getTenant(),
  },
  "/app/settings/profile": {
    queryKey: [...TENANT_QUERY_KEY],
    run: () => api.getTenant(),
  },
  "/app/client-page": {
    queryKey: ["client-page-booking-links"],
    run: () => api.listBookingLinks(),
  },
  "/app/client-signin": {
    queryKey: [...TENANT_QUERY_KEY],
    run: () => api.getTenant(),
  },
};

/**
 * Prefetch destination data into both the GET cache and the React Query
 * snapshot store so the target page can paint without a loading gate.
 *
 * @param immediate — run now (pointerdown/click). Hover uses idle scheduling.
 */
export function prefetchHref(href: string, immediate = false) {
  const entry = HREF_PREFETCH[href];
  if (!entry) return;
  pausePrefetch(immediate ? 800 : 1200);

  const key = typeof entry.queryKey === "function" ? entry.queryKey() : entry.queryKey;
  const exec = () => {
    void warm(key, entry.run).catch(() => undefined);
  };

  if (immediate) {
    exec();
    return;
  }

  const schedule =
    typeof window !== "undefined" && "requestIdleCallback" in window
      ? (cb: () => void) =>
          (
            window as Window & {
              requestIdleCallback: (fn: () => void, opts?: { timeout: number }) => number;
            }
          ).requestIdleCallback(cb, { timeout: 400 })
      : (cb: () => void) => window.setTimeout(cb, 60);
  schedule(exec);
}

/** Warm tenant + booking links as soon as the app shell mounts. */
export function warmAppShell() {
  if (typeof window === "undefined") return;
  void warm([...TENANT_QUERY_KEY], () => api.getTenant()).catch(() => undefined);
  // One network call → both cache keys (client-page + booking-links pages).
  void api
    .listBookingLinks()
    .then((links) => {
      const token = getStaffAuthToken();
      writeQuerySnapshot(["client-page-booking-links"], token, links);
      writeQuerySnapshot(["booking-links"], token, links);
    })
    .catch(() => undefined);
}
