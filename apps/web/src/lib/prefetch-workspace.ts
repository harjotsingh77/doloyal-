import { api } from "./api";

let queued = false;

/**
 * Warm the pages people open from the sidebar, one request at a time,
 * after the screen they are on has already rendered.
 */
export function prefetchWorkspace() {
  if (queued || typeof window === "undefined") return;
  queued = true;
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
    () => api.getDashboardOverview({ days: 30 }),
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
  "/app/dashboard": () => api.getDashboardOverview({ days: 30 }),
  "/app/analytics": () => api.getDashboardOverview({ days: 30 }),
  "/app/customers": () => api.listCustomers({ limit: 50 }),
  "/app/campaigns": () => api.listCampaigns(),
  "/app/loyalty": () => api.getLoyaltyOverview(),
  "/app/rewards": () => api.getRewardsOverview(),
  "/app/memberships": () => api.getTiers(),
  "/app/appointments": () => api.listAppointments(),
  "/app/invoices": () => api.listInvoices(),
  "/app/reviews": () => api.listReviews({ limit: 30 }),
};

export function prefetchHref(href: string) {
  const run = HREF_PREFETCH[href];
  if (!run) return;
  void run().catch(() => undefined);
}
