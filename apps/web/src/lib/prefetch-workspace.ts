import { api } from "./api";

let queued = false;

/** Same default window the dashboard page uses: last 30 days as UTC YMD. */
export function defaultDashboardRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400000);
  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  return { from: toYMD(start), to: toYMD(end) };
}

/**
 * Warm the pages people open from the sidebar, one request at a time,
 * after the screen they are on has already rendered.
 *
 * Query strings MUST match what each page requests, or the GET cache misses.
 */
export function prefetchWorkspace() {
  if (queued || typeof window === "undefined") return;
  queued = true;
  const range = defaultDashboardRange();
  const jobs = [
    () => api.listCustomers({ limit: 50 }),
    () => api.listCampaigns(),
    () => api.getLoyaltyOverview(),
    () => api.getTiers(),
    () => api.getRewardsOverview(),
    () => api.listRewards(),
    () => api.listAppointments(),
    () => api.listInvoices(),
    () => api.getReviewSummary(),
    () => api.listReviews({ limit: 30 }),
    () => api.listBookingLinks(),
    () => api.listProducts({ page: 1, limit: 20, sort: "updatedAt", order: "desc", status: "ALL", stock: "ALL" }),
    () => api.getProductSummary(),
    () => api.listOrders({ page: 1, limit: 20, status: "ALL", paymentStatus: "ALL" }),
    () => api.getOrderSummary(),
    () => api.getReferralOverview({ range: "30d" }),
    () => api.getDashboardOverview(range),
    () => api.getDashboardOverview({ days: "30" }),
  ];
  const run = (index: number) => {
    if (index >= jobs.length) return;
    jobs[index]()
      .catch(() => undefined)
      .finally(() => {
        window.setTimeout(() => run(index + 1), 200);
      });
  };
  window.setTimeout(() => run(0), 600);
}

const HREF_PREFETCH: Record<string, () => Promise<unknown>> = {
  "/app/dashboard": () => api.getDashboardOverview(defaultDashboardRange()),
  "/app/analytics": () => api.getDashboardOverview({ days: "30" }),
  "/app/customers": () => api.listCustomers({ limit: 50 }),
  "/app/customers/products": () =>
    Promise.all([
      api.listProducts({ page: 1, limit: 20, sort: "updatedAt", order: "desc", status: "ALL", stock: "ALL" }),
      api.getProductSummary(),
      api.listProductCategories(),
    ]),
  "/app/customers/orders": () =>
    Promise.all([
      api.listOrders({ page: 1, limit: 20, status: "ALL", paymentStatus: "ALL" }),
      api.getOrderSummary(),
    ]),
  "/app/campaigns": () => api.listCampaigns(),
  "/app/loyalty": () => api.getLoyaltyOverview(),
  "/app/rewards": () =>
    Promise.all([api.getRewardsOverview(), api.listRewards(), api.listRewardPrograms()]),
  "/app/memberships": () => api.getTiers(),
  "/app/referrals": () => api.getReferralOverview({ range: "30d" }),
  "/app/appointments": () => api.listAppointments(),
  "/app/appointments/booking-links": () => api.listBookingLinks(),
  "/app/invoices": () => api.listInvoices(),
  "/app/reviews": () =>
    Promise.all([api.getReviewSummary(), api.listReviews({ limit: 30 })]),
};

export function prefetchHref(href: string) {
  const run = HREF_PREFETCH[href];
  if (!run) return;
  void run().catch(() => undefined);
}
