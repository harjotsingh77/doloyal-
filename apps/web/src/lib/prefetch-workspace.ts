import type { QueryKey } from "@tanstack/react-query";
import { api } from "./api";
import { getStaffAuthToken } from "./access-token";
import { writeQuerySnapshot } from "./api-cache";
import { TENANT_QUERY_KEY } from "./tenant-query";
import { warmCoreLoyaltyModules } from "./loyalty-features-context";

/** Same default window the dashboard page uses: last 30 days as UTC YMD. */
export function defaultDashboardRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400000);
  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  return { from: toYMD(start), to: toYMD(end) };
}

async function warm(queryKey: QueryKey, run: () => Promise<unknown>) {
  const data = await run();
  writeQuerySnapshot(queryKey, getStaffAuthToken(), data);
  return data;
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
    // Keys match loyalty-features-context / loyalty/page.tsx.
    queryKey: ["loyalty-feature-flags"],
    run: async () => {
      const [catalog] = await Promise.all([
        api.getFeatureFlags(),
        api
          .getLoyaltyOverview()
          .then((overview) =>
            writeQuerySnapshot(["loyalty-overview"], getStaffAuthToken(), overview),
          )
          .catch(() => undefined),
      ]);
      warmCoreLoyaltyModules(catalog);
      return catalog;
    },
  },
  "/app/rewards": {
    // Keys match rewards/page.tsx (default tab, no search).
    queryKey: ["rewards-lists", "STANDARD", ""],
    run: async () => {
      const [list, progs, reds] = await Promise.all([
        api.listRewards({ category: "STANDARD" }),
        api.listRewardPrograms(),
        api.getRedemptions({ page: 1, pageSize: 50 }),
        api
          .getRewardsOverview()
          .then((overview) =>
            writeQuerySnapshot(["rewards-overview"], getStaffAuthToken(), overview),
          )
          .catch(() => undefined),
      ]);
      return {
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
 * Callers decide when: the sidebar waits for hover intent or a press, so
 * sweeping the pointer across the menu does not fire every page's requests.
 */
export function prefetchHref(href: string) {
  const entry = HREF_PREFETCH[href];
  if (!entry) return;
  const key = typeof entry.queryKey === "function" ? entry.queryKey() : entry.queryKey;
  void warm(key, entry.run).catch(() => undefined);
}

/**
 * Warm the tenant as soon as the app shell mounts (sidebar, currency and
 * branding all read it). Other pages load their own data on visit or on
 * sidebar hover — warming the whole workspace up front sent ~16 requests on
 * every dashboard load and competed with the page for the DB pool.
 */
export function warmAppShell() {
  if (typeof window === "undefined") return;
  void warm([...TENANT_QUERY_KEY], () => api.getTenant()).catch(() => undefined);
}
