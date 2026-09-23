import { api } from "./api";

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

/**
 * Warm a short list of sidebar destinations, one request at a time,
 * only after the current page has painted. Skips work that would fight
 * the active navigation for bandwidth / DB connections.
 */
export function prefetchWorkspace() {
  if (queued || typeof window === "undefined") return;
  queued = true;
  const jobs = [
    () => api.listCustomers({ limit: 50 }),
    () => api.listCampaigns(),
    () => api.getLoyaltyOverview(),
    () => api.getTiers(),
    () => api.listAppointments(),
    () => api.listInvoices(),
    () => api.getReviewSummary(),
    () => api.listReviews({ limit: 30 }),
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
  // Give the current page's in-flight requests headroom first.
  window.setTimeout(() => run(0), 1800);
}

const HREF_PREFETCH: Record<string, () => Promise<unknown>> = {
  "/app/dashboard": () => api.getDashboardOverview(defaultDashboardRange()),
  "/app/analytics": () => api.getDashboardOverview({ days: "30" }),
  "/app/customers": () => api.listCustomers({ limit: 50 }),
  "/app/customers/products": () =>
    api.listProducts({ page: 1, limit: 20, sort: "updatedAt", order: "desc", status: "ALL", stock: "ALL" }),
  "/app/customers/orders": () =>
    api.listOrders({ page: 1, limit: 20, status: "ALL", paymentStatus: "ALL" }),
  "/app/campaigns": () => api.listCampaigns(),
  "/app/loyalty": () => api.getLoyaltyOverview(),
  "/app/rewards": () => api.getRewardsOverview(),
  "/app/memberships": () => api.getTiers(),
  "/app/referrals": () => api.getReferralOverview({ range: "30d" }),
  "/app/appointments": () => api.listAppointments(),
  "/app/appointments/booking-links": () => api.listBookingLinks(),
  "/app/invoices": () => api.listInvoices(),
  "/app/reviews": () => api.listReviews({ limit: 30 }),
  "/app/staff": () => api.listStaffMembers({ page: 1, pageSize: 20 }),
  "/app/branches": () => api.listBranches(),
  "/app/integrations": () => api.listIntegrations(),
  "/app/billing": () => api.getSubscription(),
  "/app/help": () => api.listHelpArticles({ faq: true }),
  "/app/settings": () => api.getTenant(),
  "/app/settings/profile": () => api.getTenant(),
  "/app/client-page": () => api.listBookingLinks(),
  "/app/client-signin": () => api.getTenant(),
};

export function prefetchHref(href: string) {
  const run = HREF_PREFETCH[href];
  if (!run) return;
  pausePrefetch(1200);
  const schedule =
    typeof window !== "undefined" && "requestIdleCallback" in window
      ? (cb: () => void) =>
          (
            window as Window & {
              requestIdleCallback: (fn: () => void, opts?: { timeout: number }) => number;
            }
          ).requestIdleCallback(cb, { timeout: 800 })
      : (cb: () => void) => window.setTimeout(cb, 120);
  schedule(() => {
    void run().catch(() => undefined);
  });
}
