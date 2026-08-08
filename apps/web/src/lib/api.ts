import type {
  DashboardOverview, Customer, CustomerProfile, LoyaltyConfig,
  PointsLedgerEntry, Reward, RewardRedemption,
  MembershipTier, CustomerMembership, Appointment, Invoice,
  AuthUser, Tenant, BookingLink, BookingLinkAnalytics,
  BookingConfirmation, BookingAnalytics, NotificationRecord,
  NotificationTemplate, WidgetSettings, AvailabilitySettings,
  BlockedDateRecord, PublicBusinessInfo, PublicService,
  PublicStaff, BookingSlot, AppointmentDetail,
  ConnectedWebsite, ConnectedWebsiteCreateResult, WebsiteConnectionApiKey,
  WebsiteConnectionWebhook, ConnectionLogEntry, CreateConnectedWebsiteInput,
} from "@doloyal/shared";
import type {
  CustomerQuery, CreateCustomerInput, UpdateCustomerInput,
  UpdateLoyaltyConfigInput, ManualAdjustmentInput,
  CreateRewardInput, UpdateRewardInput, RedeemRewardInput,
  CreateMembershipTierInput, CreateInvoiceInput, AssistantMessageInput,
  CreateBookingLinkInput, UpdateBookingLinkInput,
  UpdateAvailabilityInput, BlockDateInput,
} from "@doloyal/shared";
import type { ApiResponse, Paginated } from "@doloyal/shared";
import { MOCK } from "./mock-data";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    cache: options.cache ?? "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let body: { error?: { code?: string; message?: string; details?: unknown } } = {};
    if (ct.includes("json")) { try { body = await res.json(); } catch {} }
    throw new ApiError(res.status, body.error?.code ?? "UNKNOWN", body.error?.message ?? `Request failed with status ${res.status}`, body.error?.details);
  }
  if (res.status === 204 || !ct.includes("json")) return undefined as T;
  const envelope = (await res.json()) as ApiResponse<T>;
  if ("error" in envelope) throw new ApiError(res.status, envelope.error.code, envelope.error.message, envelope.error.details);
  return envelope.data;
}

async function withFallback<T>(apiCall: () => Promise<T>, mockKey: string, ...mockArgs: any[]): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
  const useMock =
    !token || token === "mock-token" || token === "demo-token";

  if (useMock) {
    const mockFn = MOCK[mockKey];
    if (mockFn) return mockFn(...mockArgs) as T;
  }

  try {
    return await apiCall();
  } catch (err) {
    const mockFn = MOCK[mockKey];
    if (mockFn) {
      console.warn(`API request for "${mockKey}" failed, falling back to mock data:`, err);
      return mockFn(...mockArgs) as T;
    }
    throw err;
  }
}

export const api = {
  getMe: () => withFallback(() => request<AuthUser>("/auth/me"), "getMe"),

  getDashboardOverview: () =>
    withFallback(() => request<DashboardOverview>("/dashboard/overview"), "getDashboardOverview"),

  listCustomers: (params?: CustomerQuery) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.tags?.length) searchParams.set("tags", params.tags.join(","));
    if (params?.band) searchParams.set("band", params.band);
    if (params?.churnRisk) searchParams.set("churnRisk", params.churnRisk);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    const qs = searchParams.toString();
    return withFallback(() => request<Paginated<Customer>>(`/customers${qs ? `?${qs}` : ""}`), "listCustomers", params);
  },

  getCustomer: (id: string) =>
    withFallback(() => request<CustomerProfile>(`/customers/${id}`), "getCustomer", id),

  createCustomer: (data: CreateCustomerInput) =>
    withFallback(() => request<Customer>("/customers", { method: "POST", body: JSON.stringify(data) }), "createCustomer", data),

  updateCustomer: (id: string, data: UpdateCustomerInput) =>
    withFallback(() => request<Customer>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }), "updateCustomer", id, data),

  deleteCustomer: (id: string) =>
    withFallback(() => request<void>(`/customers/${id}`, { method: "DELETE" }), "deleteCustomer", id),

  importCustomers: (file: File) =>
    withFallback(async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
      const form = new FormData();
      form.append("file", file);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}/customers/import`, {
        method: "POST",
        headers,
        body: form,
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        let body: { error?: { code?: string; message?: string; details?: unknown } } = {};
        if (ct.includes("json")) {
          try {
            body = await res.json();
          } catch {}
        }
        throw new ApiError(
          res.status,
          body.error?.code ?? "UNKNOWN",
          body.error?.message ?? `Request failed with status ${res.status}`,
          body.error?.details,
        );
      }
      const envelope = (await res.json()) as ApiResponse<{
        imported: number;
        skipped: number;
        errors: Array<{ row: number; reason: string }>;
        customers: Customer[];
      }>;
      if ("error" in envelope) {
        throw new ApiError(res.status, envelope.error.code, envelope.error.message, envelope.error.details);
      }
      return envelope.data;
    }, "importCustomers", file),

  exportCustomers: () =>
    withFallback(async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}/customers/export`, { headers });
      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        let message = `Export failed with status ${res.status}`;
        if (ct.includes("json")) {
          try {
            const body = await res.json();
            message = body.error?.message ?? message;
          } catch {}
        }
        throw new ApiError(res.status, "EXPORT_FAILED", message);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `customers-${new Date().toISOString().slice(0, 10)}.xlsx`;
      return { blob, filename };
    }, "exportCustomers"),

  getLoyaltyConfig: () =>
    withFallback(() => request<LoyaltyConfig>("/loyalty/config"), "getLoyaltyConfig"),

  getFeatureFlags: () =>
    withFallback(
      () => request<import("@doloyal/shared").FeatureFlagCatalogResponse>("/feature-flags"),
      "getFeatureFlags",
    ),

  getEnabledFeatureKeys: () =>
    withFallback(
      () => request<{ enabledKeys: string[] }>("/feature-flags/enabled"),
      "getEnabledFeatureKeys",
    ),

  toggleFeatureFlag: (featureKey: string, enabled: boolean) =>
    withFallback(
      () =>
        request<import("@doloyal/shared").FeatureFlagCatalogResponse>("/feature-flags/toggle", {
          method: "PUT",
          body: JSON.stringify({ featureKey, enabled }),
        }),
      "toggleFeatureFlag",
      featureKey,
      enabled,
    ),

  updateFeatureConfig: (featureKey: string, config: Record<string, unknown>) =>
    withFallback(
      () =>
        request<import("@doloyal/shared").FeatureFlagCatalogResponse>("/feature-flags/config", {
          method: "PUT",
          body: JSON.stringify({ featureKey, config }),
        }),
      "updateFeatureConfig",
      featureKey,
      config,
    ),

  getLoyaltyModuleSnapshot: (featureKey: string) =>
    withFallback(
      () => request<any>(`/loyalty/modules/${encodeURIComponent(featureKey)}`),
      "getLoyaltyModuleSnapshot",
      featureKey,
    ),

  listLoyaltyModuleEntities: (featureKey: string) =>
    withFallback(
      () => request<any[]>(`/loyalty/modules/${encodeURIComponent(featureKey)}/entities`),
      "listLoyaltyModuleEntities",
      featureKey,
    ),

  createLoyaltyModuleEntity: (
    featureKey: string,
    data: { name?: string; status?: string; data: Record<string, unknown>; sortOrder?: number },
  ) =>
    withFallback(
      () =>
        request<any>(`/loyalty/modules/${encodeURIComponent(featureKey)}/entities`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      "createLoyaltyModuleEntity",
      featureKey,
      data,
    ),

  updateLoyaltyModuleEntity: (
    featureKey: string,
    id: string,
    data: { name?: string; status?: string; data?: Record<string, unknown>; sortOrder?: number },
  ) =>
    withFallback(
      () =>
        request<any>(`/loyalty/modules/${encodeURIComponent(featureKey)}/entities/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      "updateLoyaltyModuleEntity",
      featureKey,
      id,
      data,
    ),

  deleteLoyaltyModuleEntity: (featureKey: string, id: string) =>
    withFallback(
      () =>
        request<{ ok: boolean }>(
          `/loyalty/modules/${encodeURIComponent(featureKey)}/entities/${id}/delete`,
          { method: "POST", body: "{}" },
        ),
      "deleteLoyaltyModuleEntity",
      featureKey,
      id,
    ),

  getLoyaltyAuditLogs: (params?: { featureKey?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.featureKey) q.set("featureKey", params.featureKey);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    const qs = q.toString();
    return withFallback(
      () => request<any>(`/loyalty/audit-logs${qs ? `?${qs}` : ""}`),
      "getLoyaltyAuditLogs",
      params,
    );
  },

  updateLoyaltyConfig: (data: UpdateLoyaltyConfigInput) =>
    withFallback(() => request<LoyaltyConfig>("/loyalty/config", { method: "PUT", body: JSON.stringify(data) }), "updateLoyaltyConfig", data),

  getLoyaltyOverview: () =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyOverview>("/loyalty/overview"), "getLoyaltyOverview"),

  loyaltyCopilot: (data: { message: string; conversationId?: string }) =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyCopilotResponse>("/loyalty/copilot", { method: "POST", body: JSON.stringify(data) }), "loyaltyCopilot", data),

  getLoyaltyRecommendations: () =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyRecommendation[]>("/loyalty/recommendations"), "getLoyaltyRecommendations"),

  applyLoyaltyRecommendation: (action: string) =>
    withFallback(() => request<any>("/loyalty/recommendations/apply", { method: "POST", body: JSON.stringify({ action }) }), "applyLoyaltyRecommendation", action),

  getLoyaltyLeaderboard: (params?: { period?: string; metric?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.period) q.set("period", params.period);
    if (params?.metric) q.set("metric", params.metric);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return withFallback(() => request<import("@doloyal/shared").LoyaltyLeaderboardEntry[]>(`/loyalty/leaderboard${qs ? `?${qs}` : ""}`), "getLoyaltyLeaderboard", params);
  },

  rewardLoyaltyTop: (data?: { count?: number; points?: number }) =>
    withFallback(() => request<{ rewarded: number; pointsEach: number }>("/loyalty/leaderboard/reward-top", { method: "POST", body: JSON.stringify(data || {}) }), "rewardLoyaltyTop", data),

  getLoyaltyChallenges: () =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyChallenge[]>("/loyalty/challenges"), "getLoyaltyChallenges"),

  createLoyaltyChallenge: (data: Record<string, unknown>) =>
    withFallback(
      () => request<any>("/loyalty/challenges", { method: "POST", body: JSON.stringify(data) }),
      "createLoyaltyChallenge",
      data,
    ),

  generateLoyaltyChallenge: () =>
    withFallback(() => request<any>("/loyalty/challenges/generate", { method: "POST", body: "{}" }), "generateLoyaltyChallenge"),

  getLoyaltyBadges: () =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyBadgeDef[]>("/loyalty/badges"), "getLoyaltyBadges"),

  createLoyaltyBadge: (data: import("@doloyal/shared").CreateLoyaltyBadgeInput) =>
    withFallback(() => request<any>("/loyalty/badges", { method: "POST", body: JSON.stringify(data) }), "createLoyaltyBadge", data),

  getLoyaltySegments: () =>
    withFallback(() => request<import("@doloyal/shared").LoyaltySegment[]>("/loyalty/segments"), "getLoyaltySegments"),

  getLoyaltyChurn: () =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyChurnRow[]>("/loyalty/churn"), "getLoyaltyChurn"),

  getLoyaltyAnalytics: () =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyAnalytics>("/loyalty/analytics"), "getLoyaltyAnalytics"),

  getLoyaltyReferrals: () =>
    withFallback(() => request<{ tree: import("@doloyal/shared").LoyaltyReferralNode[]; stats: any }>("/loyalty/referrals"), "getLoyaltyReferrals"),

  // ─── Referrals OS (live only) ──────────────────────────────────────────────
  getReferralOverview: (params?: { range?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.range) q.set("range", params.range);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<import("@doloyal/shared").ReferralOverview>(`/referrals/overview${qs ? `?${qs}` : ""}`);
  },

  getReferralAnalytics: (params?: { range?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.range) q.set("range", params.range);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<any>(`/referrals/analytics${qs ? `?${qs}` : ""}`);
  },

  getReferralFunnel: (params?: { range?: string; from?: string; to?: string } | string) => {
    const opts = typeof params === "string" ? { range: params } : params || {};
    const q = new URLSearchParams();
    if (opts.range) q.set("range", opts.range);
    if (opts.from) q.set("from", opts.from);
    if (opts.to) q.set("to", opts.to);
    const qs = q.toString();
    return request<import("@doloyal/shared").ReferralFunnelStage[]>(
      `/referrals/funnel${qs ? `?${qs}` : ""}`,
    );
  },

  getReferralLeaderboard: () =>
    request<import("@doloyal/shared").ReferralLeaderboardRow[]>("/referrals/leaderboard"),

  listReferralCampaigns: () =>
    request<import("@doloyal/shared").ReferralCampaign[]>("/referrals/campaigns"),

  createReferralCampaign: (data: Record<string, unknown>) =>
    request<import("@doloyal/shared").ReferralCampaign>("/referrals/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateReferralCampaign: (id: string, data: Record<string, unknown>) =>
    request<import("@doloyal/shared").ReferralCampaign>(`/referrals/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  duplicateReferralCampaign: (id: string) =>
    request<import("@doloyal/shared").ReferralCampaign>(`/referrals/campaigns/${id}/duplicate`, {
      method: "POST",
      body: "{}",
    }),

  setReferralCampaignStatus: (id: string, status: string) =>
    request<import("@doloyal/shared").ReferralCampaign>(`/referrals/campaigns/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  setReferralLinkStatus: (id: string, status: string) =>
    request<import("@doloyal/shared").ReferralLink>(`/referrals/links/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  deleteReferralCampaign: (id: string) =>
    request<{ ok: boolean }>(`/referrals/campaigns/${id}`, { method: "DELETE" }),

  listReferralLinks: (customerId?: string) =>
    request<import("@doloyal/shared").ReferralLink[]>(
      `/referrals/links${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ""}`,
    ),

  generateReferralLink: (data: { name?: string; customerId?: string; campaignId?: string; customSlug?: string; expiresAt?: string }) =>
    request<import("@doloyal/shared").ReferralLink>("/referrals/links", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getReferralLink: (id: string) =>
    request<import("@doloyal/shared").ReferralLink>(`/referrals/links/${id}`),

  deleteReferralLink: (id: string) =>
    request<{ ok: boolean }>(`/referrals/links/${id}`, { method: "DELETE" }),

  regenerateReferralLink: (id: string) =>
    request<import("@doloyal/shared").ReferralLink>(`/referrals/links/${id}/regenerate`, {
      method: "POST",
      body: "{}",
    }),

  checkReferralSlug: (slug: string) =>
    request<{ available: boolean; message?: string }>("/referrals/links/check-slug", {
      method: "POST",
      body: JSON.stringify({ slug }),
    }),

  shareReferralLink: (linkId: string, channel: string) =>
    request<{ ok: boolean }>("/referrals/links/share", {
      method: "POST",
      body: JSON.stringify({ linkId, channel }),
    }),

  getReferralQr: (linkId: string) =>
    request<{ qrUrl: string; url: string }>("/referrals/links/qr", {
      method: "POST",
      body: JSON.stringify({ linkId }),
    }),

  getReferralRevenue: (params?: { range?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.range) q.set("range", params.range);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<{ revenue: number; conversions: number; rewardCost: number }>(
      `/referrals/revenue${qs ? `?${qs}` : ""}`,
    );
  },

  getReferralSources: () => request<Array<{ source: string; clicks: number }>>("/referrals/sources"),

  getReferralDashboard: (params?: { range?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.range) q.set("range", params.range);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<import("@doloyal/shared").ReferralOverview>(
      `/referrals/dashboard${qs ? `?${qs}` : ""}`,
    );
  },

  processReferralReward: (conversionId: string) =>
    request("/referrals/rewards/process", {
      method: "POST",
      body: JSON.stringify({ conversionId }),
    }),

  getReferralRewardHistory: () => request("/referrals/rewards/history"),

  /** Subscribe to referral realtime events (SSE). Returns an EventSource. */
  subscribeReferralEvents: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
    const url = `${base}/referrals/events`;
    // EventSource cannot set Authorization headers in browsers; token query fallback for SSE.
    const withAuth = token ? `${url}?access_token=${encodeURIComponent(token)}` : url;
    return new EventSource(withAuth);
  },

  listReferralConversions: (params?: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    const qs = q.toString();
    return request<{
      items: import("@doloyal/shared").ReferralConversionRow[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/referrals/conversions${qs ? `?${qs}` : ""}`);
  },

  exportReferralReport: async (format: "csv" | "excel" | "pdf" = "csv") => {
    const data = await request<{
      csv: string;
      content?: string;
      filename: string;
      mimeType?: string;
    }>(`/referrals/export?format=${encodeURIComponent(format)}`);
    const body = data.content || data.csv;
    return {
      blob: new Blob([body], {
        type: data.mimeType || "text/csv;charset=utf-8",
      }),
      filename: data.filename || `referrals-report.${format === "excel" ? "xls" : format === "pdf" ? "txt" : "csv"}`,
    };
  },

  validateReferralCode: (code: string, meta?: Record<string, unknown>) =>
    request<any>(`/referrals/public/validate/${encodeURIComponent(code)}`, {
      method: "POST",
      body: JSON.stringify(meta || {}),
    }),

  claimReferral: (data: Record<string, unknown>) =>
    request<any>("/referrals/public/claim", { method: "POST", body: JSON.stringify(data) }),

  getLoyaltyCard: (customerId: string) =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyDigitalCard>(`/loyalty/card/${customerId}`), "getLoyaltyCard", customerId),

  getLoyaltyJourney: (customerId: string) =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyJourneyEvent[]>(`/loyalty/journey/${customerId}`), "getLoyaltyJourney", customerId),

  getLoyaltyStreaks: () =>
    withFallback(() => request<{ milestones: import("@doloyal/shared").LoyaltyStreakMilestone[]; topStreak: number; activeStreaks: number }>("/loyalty/streaks"), "getLoyaltyStreaks"),

  getSurpriseRewards: () =>
    withFallback(() => request<import("@doloyal/shared").SurpriseReward[]>("/loyalty/surprise-rewards"), "getSurpriseRewards"),

  upsertSurpriseReward: (data: import("@doloyal/shared").CreateSurpriseRewardInput & { id?: string }) =>
    withFallback(() => request<any>("/loyalty/surprise-rewards", { method: "POST", body: JSON.stringify(data) }), "upsertSurpriseReward", data),

  getLoyaltyAutomations: () =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyAutomationRule[]>("/loyalty/automations"), "getLoyaltyAutomations"),

  createLoyaltyAutomation: (data: import("@doloyal/shared").CreateLoyaltyAutomationInput) =>
    withFallback(() => request<any>("/loyalty/automations", { method: "POST", body: JSON.stringify(data) }), "createLoyaltyAutomation", data),

  toggleLoyaltyAutomation: (id: string, status: string) =>
    withFallback(() => request<any>(`/loyalty/automations/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }), "toggleLoyaltyAutomation", id, status),

  getLoyaltyActivity: (limit = 30) =>
    withFallback(() => request<import("@doloyal/shared").LoyaltyActivityItem[]>(`/loyalty/activity?limit=${limit}`), "getLoyaltyActivity", limit),

  generateLoyaltyCampaign: (data: import("@doloyal/shared").GenerateLoyaltyCampaignInput) =>
    withFallback(() => request<any>("/loyalty/campaigns/generate", { method: "POST", body: JSON.stringify(data) }), "generateLoyaltyCampaign", data),

  getLoyaltyTiers: () =>
    withFallback(() => request<MembershipTier[]>("/loyalty/tiers"), "getLoyaltyTiers"),

  getLoyaltyConfigVersions: () =>
    withFallback(() => request<any[]>("/loyalty/config/versions"), "getLoyaltyConfigVersions"),

  restoreLoyaltyConfigVersion: (id: string) =>
    withFallback(() => request<LoyaltyConfig>(`/loyalty/config/versions/${id}/restore`, { method: "POST", body: "{}" }), "restoreLoyaltyConfigVersion", id),

  searchLoyaltyCustomers: (q: string) =>
    withFallback(() => request<Customer[]>(`/loyalty/customers/search?q=${encodeURIComponent(q)}`), "searchLoyaltyCustomers", q),

  earnPoints: (data: { customerId: string; points: number; reason: string; invoiceId?: string }) =>
    withFallback(() => request<PointsLedgerEntry>("/loyalty/earn", { method: "POST", body: JSON.stringify({ customerId: data.customerId, amount: data.points, reason: data.reason }) }), "earnPoints", data),

  redeemReward: (data: RedeemRewardInput) =>
    withFallback(() => request<RewardRedemption>("/loyalty/redeem", { method: "POST", body: JSON.stringify(data) }), "redeemReward", data),

  adjustPoints: (data: ManualAdjustmentInput) =>
    withFallback(() => request<PointsLedgerEntry>("/loyalty/adjust", { method: "POST", body: JSON.stringify(data) }), "adjustPoints", data),

  getLedger: (customerId: string) =>
    withFallback(async () => {
      const res = await request<{ items: PointsLedgerEntry[] } | PointsLedgerEntry[]>(`/loyalty/ledger?customerId=${customerId}`);
      return Array.isArray(res) ? res : res.items;
    }, "getLedger", customerId),

  getLoyaltyLedger: (params?: { customerId?: string; page?: number; pageSize?: number; type?: string; search?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.customerId) q.set("customerId", params.customerId);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    if (params?.type) q.set("type", params.type);
    if (params?.search) q.set("search", params.search);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    return withFallback(() => request<{ items: PointsLedgerEntry[]; total: number; page: number; pageSize: number; totalPages: number }>(`/loyalty/ledger?${q}`), "getLoyaltyLedger", params);
  },

  listRewards: (params?: { category?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return request<Reward[]>(`/rewards${qs ? `?${qs}` : ""}`);
  },

  getRewardsOverview: () =>
    request<import("@doloyal/shared").RewardsOverview>("/rewards/overview"),

  createReward: (data: CreateRewardInput) =>
    request<Reward>("/rewards", { method: "POST", body: JSON.stringify(data) }),

  updateReward: (id: string, data: UpdateRewardInput) =>
    request<Reward>(`/rewards/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  duplicateReward: (id: string) =>
    request<Reward>(`/rewards/${id}/duplicate`, { method: "POST", body: "{}" }),

  archiveReward: (id: string) =>
    request<Reward>(`/rewards/${id}/archive`, { method: "POST", body: "{}" }),

  deleteReward: (id: string, hard = false) =>
    request<{ ok?: boolean } | Reward>(`/rewards/${id}${hard ? "?hard=true" : ""}`, {
      method: "DELETE",
    }),

  getRedemptions: (params?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.category) q.set("category", params.category);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    const qs = q.toString();
    return request<{
      items: RewardRedemption[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/rewards/redemptions${qs ? `?${qs}` : ""}`);
  },

  exportRedemptions: async () => {
    const data = await request<{ csv: string; filename: string }>("/rewards/redemptions/export");
    const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
    return { blob, filename: data.filename || "reward-redemptions.csv" };
  },

  listRewardPrograms: () =>
    request<import("@doloyal/shared").RewardProgramConfig[]>("/rewards/programs"),

  updateRewardProgram: (
    programType: string,
    data: { enabled?: boolean; config?: Record<string, unknown> },
  ) =>
    request<import("@doloyal/shared").RewardProgramConfig>(
      `/rewards/programs/${encodeURIComponent(programType)}`,
      { method: "PATCH", body: JSON.stringify(data) },
    ),

  runBirthdayRewards: () =>
    request<{ processed: number; issued: number }>("/rewards/automations/birthday/run", {
      method: "POST",
      body: "{}",
    }),

  runAnniversaryRewards: () =>
    request<{ processed: number; issued: number }>("/rewards/automations/anniversary/run", {
      method: "POST",
      body: "{}",
    }),

  listRewardClaims: (programType?: string) => {
    const qs = programType ? `?programType=${encodeURIComponent(programType)}` : "";
    return request<import("@doloyal/shared").RewardEngagementClaim[]>(`/rewards/claims${qs}`);
  },

  submitRewardClaim: (data: {
    customerId: string;
    programType: string;
    evidence?: Record<string, unknown>;
  }) =>
    request<import("@doloyal/shared").RewardEngagementClaim>("/rewards/claims", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  reviewRewardClaim: (id: string, approve: boolean) =>
    request<import("@doloyal/shared").RewardEngagementClaim>(`/rewards/claims/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    }),

  listCashbackTransactions: () =>
    request<import("@doloyal/shared").CashbackTransaction[]>("/rewards/cashback"),

  redeemCashback: (data: { customerId: string; points: number }) =>
    request<import("@doloyal/shared").CashbackTransaction & { pointsBalance?: number }>(
      "/rewards/cashback/redeem",
      { method: "POST", body: JSON.stringify(data) },
    ),

  getTiers: () =>
    withFallback(() => request<MembershipTier[]>("/memberships/tiers"), "getTiers"),

  createTier: (data: CreateMembershipTierInput) =>
    withFallback(() => request<MembershipTier>("/memberships/tiers", { method: "POST", body: JSON.stringify(data) }), "createTier", data),

  assignMembership: (customerId: string, tierId: string) =>
    withFallback(() => request<CustomerMembership>("/memberships/assign", { method: "POST", body: JSON.stringify({ customerId, tierId }) }), "assignMembership", customerId, tierId),

  listSubscriptionPlans: () =>
    withFallback(() => request<any[]>("/memberships/plans"), "listSubscriptionPlans"),

  getSubscription: () =>
    withFallback(() => request<any>("/memberships/subscription"), "getSubscription"),

  changePlan: (plan: string) =>
    withFallback(() => request<{ plan: string; message: string }>("/memberships/plan", { method: "PUT", body: JSON.stringify({ plan }) }), "changePlan", plan),

  // ─── Doloyal AI Assistant (live) ────────────────────────────────────────────
  chatWithAssistant: (data: AssistantMessageInput) =>
    request<{
      conversationId: string;
      messageId?: string;
      message: string;
      toolCalls: { name: string; args: Record<string, unknown>; result: string }[];
      mode: "OPENAI" | "FALLBACK";
      citations?: { label: string; href?: string }[];
      provider?: string;
      model?: string;
    }>("/assistant/chat", { method: "POST", body: JSON.stringify(data) }),

  listAiConversations: () =>
    request<
      Array<{
        id: string;
        title: string;
        pinned: boolean;
        createdAt: string;
        updatedAt: string;
        _count?: { messages: number };
      }>
    >("/assistant/conversations"),

  getAiConversation: (id: string) =>
    request<{
      id: string;
      title: string;
      pinned: boolean;
      messages: Array<{
        id: string;
        role: string;
        content: string;
        createdAt: string;
        attachments?: Array<{
          id: string;
          fileName: string;
          mimeType: string;
          previewUrl?: string | null;
        }>;
        feedback?: Array<{ rating: string }>;
      }>;
    }>(`/assistant/conversations/${id}`),

  createAiConversation: (title?: string) =>
    request<{ id: string; title: string }>("/assistant/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  renameAiConversation: (id: string, title: string) =>
    request(`/assistant/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  pinAiConversation: (id: string, pinned: boolean) =>
    request(`/assistant/conversations/${id}/pin`, {
      method: "POST",
      body: JSON.stringify({ pinned }),
    }),

  deleteAiConversation: (id: string) =>
    request<{ ok: boolean }>(`/assistant/conversations/${id}`, { method: "DELETE" }),

  submitAiFeedback: (messageId: string, rating: "like" | "dislike", comment?: string) =>
    request("/assistant/feedback", {
      method: "POST",
      body: JSON.stringify({ messageId, rating, comment }),
    }),

  searchAiConversation: (conversationId: string, q: string) =>
    request<Array<{ id: string; role: string; content: string; createdAt: string }>>(
      `/assistant/search?conversationId=${encodeURIComponent(conversationId)}&q=${encodeURIComponent(q)}`,
    ),

  /** Stream chat via SSE. Returns an abort controller. */
  streamAssistantChat: async (
    data: Record<string, unknown>,
    handlers: {
      onToken?: (token: string) => void;
      onMeta?: (meta: Record<string, unknown>) => void;
      onDone?: (result: Record<string, unknown>) => void;
      onError?: (message: string) => void;
      onStatus?: (status: Record<string, unknown>) => void;
    },
    path: "/assistant/chat/stream" | "/assistant/regenerate" = "/assistant/chat/stream",
  ) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      let message = "Unable to reach Doloyal AI Assistant.";
      try {
        const body = await res.json();
        message = body?.error?.message || message;
      } catch {
        /* ignore */
      }
      handlers.onError?.(message);
      return { abort: () => controller.abort() };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const processBlock = (block: string) => {
      const lines = block.split("\n");
      let event = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) return;
      let payload: any = {};
      try {
        payload = JSON.parse(dataLines.join("\n"));
      } catch {
        return;
      }
      if (event === "token") handlers.onToken?.(payload.token || "");
      else if (event === "meta") handlers.onMeta?.(payload);
      else if (event === "status") handlers.onStatus?.(payload);
      else if (event === "done") handlers.onDone?.(payload);
      else if (event === "error") handlers.onError?.(payload.message || "Unable to generate a response.");
    };

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) processBlock(part);
        }
        if (buffer.trim()) processBlock(buffer);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          handlers.onError?.("Unable to generate a response. Please try again.");
        }
      }
    })();

    return { abort: () => controller.abort() };
  },

  onBoardTenant: (data: { name: string; category: string; phone: string; email: string; address?: string; currency?: string; timezone?: string; brandColor?: string; loyalty?: { mode: string; pointsPerCurrency: number; pointsPerVisit: number; currencyPerPoint: number; expiryDays: number } }) =>
    withFallback(() => request<Tenant>("/tenants", { method: "POST", body: JSON.stringify(data) }), "onBoardTenant", data),

  updateTenantSettings: (data: Record<string, unknown>) =>
    withFallback(() => request<Tenant>("/tenants/settings", { method: "PATCH", body: JSON.stringify(data) }), "updateTenantSettings", data),

  getTenant: () =>
    withFallback(() => request<Tenant>("/tenants/current"), "getTenant"),

  uploadTenantImage: (file: File, kind: "logo" | "cover" | "favicon") =>
    withFallback(async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}/tenants/upload?kind=${encodeURIComponent(kind)}`, { method: "POST", headers, body: form });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        let body: { error?: { message?: string } } = {};
        if (ct.includes("json")) { try { body = await res.json(); } catch {} }
        throw new ApiError(res.status, "UPLOAD_FAILED", body.error?.message ?? "Upload failed");
      }
      const envelope = (await res.json()) as ApiResponse<{ url: string; field: string; tenant: Tenant }>;
      if ("error" in envelope) throw new ApiError(res.status, envelope.error.code, envelope.error.message);
      return envelope.data;
    }, "uploadTenantImage", file, kind),

  changePassword: (currentPassword: string, newPassword: string) =>
    withFallback(
      () => request<{ message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
      "changePassword",
      currentPassword,
      newPassword,
    ),

  setTwoFactor: (enabled: boolean) =>
    withFallback(
      () => request<{ twoFactorEnabled: boolean }>("/auth/two-factor", { method: "POST", body: JSON.stringify({ enabled }) }),
      "setTwoFactor",
      enabled,
    ),

  listSessions: () =>
    withFallback(
      () => request<Array<{ id: string; device: string; ip?: string | null; lastActiveAt: string; current?: boolean }>>("/auth/sessions"),
      "listSessions",
    ),

  logoutAllDevices: () =>
    withFallback(
      () => request<{ message: string }>("/auth/logout-all", { method: "POST", body: JSON.stringify({}) }),
      "logoutAllDevices",
    ),

  listAppointments: (params?: { status?: string; from?: string; to?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);
    const qs = searchParams.toString();
    return withFallback(() => request<Appointment[]>(`/appointments${qs ? `?${qs}` : ""}`), "listAppointments", params);
  },

  createAppointment: (data: { customerId: string; serviceName: string; startsAt: string; staffName?: string; branchName?: string; notes?: string }) => {
    const start = new Date(data.startsAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const payload = {
      customerId: data.customerId,
      serviceName: data.serviceName,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      notes: data.notes,
    };
    return withFallback(() => request<Appointment>("/appointments", { method: "POST", body: JSON.stringify(payload) }), "createAppointment", data);
  },

  updateAppointmentStatus: (id: string, status: string) =>
    withFallback(() => request<Appointment>(`/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }), "updateAppointmentStatus", id, status),

  getTodaysAppointments: () =>
    withFallback(() => request<Appointment[]>("/appointments/today"), "getTodaysAppointments"),

  createInvoice: (data: CreateInvoiceInput) =>
    withFallback(() => request<Invoice>("/invoices", { method: "POST", body: JSON.stringify(data) }), "createInvoice", data),

  getInvoice: (id: string) =>
    withFallback(() => request<Invoice>(`/invoices/${id}`), "getInvoice", id),

  listInvoices: (params?: { customerId?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.customerId) searchParams.set("customerId", params.customerId);
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return withFallback(() => request<Invoice[]>(`/invoices${qs ? `?${qs}` : ""}`), "listInvoices", params);
  },

  getMembers: () =>
    withFallback(() => request<AuthUser[]>("/users/members"), "getMembers"),

  updateMemberRole: (id: string, role: string) =>
    withFallback(() => request<AuthUser>(`/users/members/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }), "updateMemberRole", id, role),

  removeMember: (id: string) =>
    withFallback(() => request<void>(`/users/members/${id}`, { method: "DELETE" }), "removeMember", id),

  // ─── Team Management (staff module) ──────────────────────────────────────
  getStaffStats: () =>
    request<import("@doloyal/shared").StaffStats>("/staff/stats"),

  listStaffMembers: (params?: import("@doloyal/shared").StaffQuery) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.role) q.set("role", params.role);
    if (params?.branchId) q.set("branchId", params.branchId);
    if (params?.status) q.set("status", params.status);
    if (params?.invitationStatus) q.set("invitationStatus", params.invitationStatus);
    if (params?.online) q.set("online", params.online);
    if (params?.dateJoinedFrom) q.set("dateJoinedFrom", params.dateJoinedFrom);
    if (params?.dateJoinedTo) q.set("dateJoinedTo", params.dateJoinedTo);
    if (params?.lastLoginFrom) q.set("lastLoginFrom", params.lastLoginFrom);
    if (params?.lastLoginTo) q.set("lastLoginTo", params.lastLoginTo);
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    const qs = q.toString();
    return request<import("@doloyal/shared").StaffMemberList>(`/staff/members${qs ? `?${qs}` : ""}`);
  },

  getStaffMember: (id: string) =>
    request<import("@doloyal/shared").StaffProfileDetail>(`/staff/members/${id}`),

  updateStaffMember: (id: string, data: Partial<import("@doloyal/shared").UpdateStaffInput>) =>
    request<import("@doloyal/shared").StaffMember>(`/staff/members/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  changeStaffRole: (id: string, role: string) =>
    request<import("@doloyal/shared").StaffMember>(`/staff/members/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),

  updateStaffPermissions: (id: string, permissions: string[]) =>
    request<import("@doloyal/shared").StaffMember>(`/staff/members/${id}/permissions`, { method: "PATCH", body: JSON.stringify({ permissions }) }),

  setStaffStatus: (id: string, status: string) =>
    request<import("@doloyal/shared").StaffMember>(`/staff/members/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  setStaffTwoFactor: (id: string, action: "REQUIRE" | "DISABLE" | "RESET") =>
    request<{ twoFactorRequired: boolean; twoFactorEnabled: boolean }>(`/staff/members/${id}/two-factor`, { method: "PATCH", body: JSON.stringify({ action }) }),

  removeStaffMember: (id: string) =>
    request<{ message: string }>(`/staff/members/${id}`, { method: "DELETE" }),

  addStaffNote: (id: string, body: string, category?: string) =>
    request<import("@doloyal/shared").EmployeeNote>(`/staff/members/${id}/notes`, { method: "POST", body: JSON.stringify({ body, category }) }),

  deleteStaffNote: (id: string, noteId: string) =>
    request<{ message: string }>(`/staff/members/${id}/notes/${noteId}`, { method: "DELETE" }),

  staffHeartbeat: () =>
    request<{ online: boolean; at: string }>("/staff/presence", { method: "PATCH" }),

  staffOffline: () =>
    request<{ online: boolean }>("/staff/presence/offline", { method: "POST", body: "{}" }),

  listStaffInvitations: (params?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    const qs = q.toString();
    return request<{ items: import("@doloyal/shared").StaffInvitation[]; total: number; page: number; pageSize: number; totalPages: number }>(`/staff/invitations${qs ? `?${qs}` : ""}`);
  },

  inviteMember: (data: import("@doloyal/shared").InviteMemberInput) =>
    request<import("@doloyal/shared").StaffInvitation>("/staff/invitations", { method: "POST", body: JSON.stringify(data) }),

  resendInvitation: (id: string) =>
    request<import("@doloyal/shared").StaffInvitation>(`/staff/invitations/${id}/resend`, { method: "POST", body: "{}" }),

  cancelInvitation: (id: string) =>
    request<import("@doloyal/shared").StaffInvitation>(`/staff/invitations/${id}/cancel`, { method: "POST", body: "{}" }),

  getInvitationLink: (id: string) =>
    request<{ invitationUrl: string; expiresAt: string }>(`/staff/invitations/${id}/link`),

  staffBulkAction: (data: import("@doloyal/shared").BulkStaffActionInput) =>
    request<{ action: string; total: number; succeeded: number; failed: number; results: Array<{ id: string; ok: boolean; message?: string }> }>("/staff/bulk", { method: "POST", body: JSON.stringify(data) }),

  exportStaff: async (format: "csv" | "xlsx" = "csv") => {
    const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/staff/export?format=${format}`, { headers });
    if (!res.ok) {
      let message = `Export failed with status ${res.status}`;
      try { const b = await res.json(); message = b.error?.message ?? message; } catch {}
      throw new ApiError(res.status, "EXPORT_FAILED", message);
    }
    const disposition = res.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `staff-${new Date().toISOString().slice(0, 10)}.${format === "xlsx" ? "xlsx" : "csv"}`;
    return { blob: await res.blob(), filename };
  },

  uploadStaffPhoto: async (id: string, file: File) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("doloyal_token") : null;
    const form = new FormData();
    form.append("file", file);
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/staff/members/${id}/photo`, { method: "POST", headers, body: form });
    if (!res.ok) {
      let message = "Photo upload failed";
      try { const b = await res.json(); message = b.error?.message ?? message; } catch {}
      throw new ApiError(res.status, "UPLOAD_FAILED", message);
    }
    const envelope = (await res.json()) as ApiResponse<import("@doloyal/shared").StaffProfileDetail>;
    if ("error" in envelope) throw new ApiError(res.status, envelope.error.code, envelope.error.message);
    return envelope.data;
  },

  removeStaffPhoto: (id: string) =>
    request<import("@doloyal/shared").StaffProfileDetail>(`/staff/members/${id}/photo`, { method: "DELETE" }),

  getInvitationForAccept: (token: string) =>
    request<{ id: string; email: string; firstName?: string | null; lastName?: string | null; phone?: string | null; role: string; branchIds: string[]; department?: string | null; jobTitle?: string | null; businessName: string; expiresAt: string }>(`/staff/invitations/by-token/${encodeURIComponent(token)}`),

  acceptInvitation: (token: string, data: { password: string; firstName?: string; lastName?: string; phone?: string }) =>
    request<{ message: string; email: string }>(`/staff/invitations/by-token/${encodeURIComponent(token)}/accept`, { method: "POST", body: JSON.stringify(data) }),

  // Booking Links ---------------------------------------------------------
  listBookingLinks: (opts?: { bustCache?: boolean }) => {
    const qs = opts?.bustCache ? `?_=${Date.now()}` : "";
    return withFallback(() => request<BookingLink[]>(`/booking-links${qs}`), "listBookingLinks");
  },

  getBookingLink: (id: string) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}`), "getBookingLink", id),

  createBookingLink: (data: CreateBookingLinkInput | Record<string, unknown>) =>
    withFallback(() => request<BookingLink>("/booking-links", { method: "POST", body: JSON.stringify(data) }), "createBookingLink", data),

  updateBookingLink: (id: string, data: UpdateBookingLinkInput | Record<string, unknown>) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}`, { method: "PATCH", body: JSON.stringify(data) }), "updateBookingLink", id, data),

  getBookingLinkSettings: (id: string) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}/settings`), "getBookingLinkSettings", id),

  updateBookingLinkSettings: (id: string, data: UpdateBookingLinkInput | Record<string, unknown>) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}/settings`, { method: "PATCH", body: JSON.stringify(data) }), "updateBookingLinkSettings", id, data),

  getBookingLinkAnalytics: (id: string, params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return withFallback(
      () => request<BookingLinkAnalytics>(`/booking-links/${id}/analytics${qs ? `?${qs}` : ""}`),
      "getBookingLinkAnalytics",
      id,
      params,
    );
  },

  duplicateBookingLink: (id: string) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}/duplicate`, { method: "POST" }), "duplicateBookingLink", id),

  getBookingPage: (id: string) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}/page`), "getBookingPage", id),

  updateBookingPage: (id: string, data: Record<string, unknown>) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}/page`, { method: "PATCH", body: JSON.stringify(data) }), "updateBookingPage", id, data),

  publishBookingLink: (id: string) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}/publish`, { method: "POST" }), "publishBookingLink", id),

  deleteBookingLink: (id: string) =>
    withFallback(() => request<void>(`/booking-links/${id}`, { method: "DELETE" }), "deleteBookingLink", id),

  regenerateBookingLink: (id: string) =>
    withFallback(() => request<BookingLink>(`/booking-links/${id}/regenerate`, { method: "POST" }), "regenerateBookingLink", id),

  trackBookingVisit: (slug: string, data?: { source?: string; referrer?: string; sessionId?: string }) =>
    request<{ ok: boolean }>(`/public/book/${slug}/visit`, { method: "POST", body: JSON.stringify(data ?? {}) }).catch(() => ({ ok: false })),

  // Notifications ---------------------------------------------------------
  listNotifications: () =>
    withFallback(() => request<NotificationRecord[]>("/notifications"), "listNotifications"),

  sendNotification: (data: { appointmentId: string; type: string; channel?: string }) =>
    withFallback(() => request<void>("/notifications/send", { method: "POST", body: JSON.stringify(data) }), "sendNotification", data),

  listNotificationTemplates: () =>
    withFallback(() => request<NotificationTemplate[]>("/notifications/templates"), "listNotificationTemplates"),

  saveNotificationTemplate: (data: { type: string; channel?: string; subject?: string; body: string }) =>
    withFallback(() => request<NotificationTemplate>("/notifications/templates", { method: "POST", body: JSON.stringify(data) }), "saveNotificationTemplate", data),

  deleteNotificationTemplate: (id: string) =>
    withFallback(() => request<void>(`/notifications/templates/${id}`, { method: "DELETE" }), "deleteNotificationTemplate", id),

  // Availability ----------------------------------------------------------
  getAvailability: () =>
    withFallback(() => request<AvailabilitySettings>("/availability"), "getAvailability"),

  updateAvailability: (data: Record<string, unknown>) =>
    withFallback(() => request<AvailabilitySettings>("/availability", { method: "PUT", body: JSON.stringify(data) }), "updateAvailability", data),

  listBlockedDates: () =>
    withFallback(() => request<BlockedDateRecord[]>("/availability/block-dates"), "listBlockedDates"),

  addBlockedDate: (data: { date: string; reason?: string; isFullDay?: boolean; staffId?: string; startTime?: string; endTime?: string }) =>
    withFallback(() => request<BlockedDateRecord>("/availability/block-dates", { method: "POST", body: JSON.stringify(data) }), "addBlockedDate", data),

  removeBlockedDate: (id: string) =>
    withFallback(() => request<void>(`/availability/block-dates/${id}`, { method: "DELETE" }), "removeBlockedDate", id),

  // Analytics -------------------------------------------------------------
  getBookingAnalytics: (params?: { from?: string; to?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);
    const qs = searchParams.toString();
    return withFallback(() => request<BookingAnalytics>(`/analytics/bookings${qs ? `?${qs}` : ""}`), "getBookingAnalytics", params);
  },

  // Widget ----------------------------------------------------------------
  getWidgetSettings: () =>
    withFallback(() => request<WidgetSettings>("/widget/settings"), "getWidgetSettings"),

  updateWidgetSettings: (data: Record<string, unknown>) =>
    withFallback(() => request<WidgetSettings>("/widget/settings", { method: "PUT", body: JSON.stringify(data) }), "updateWidgetSettings", data),

  // Appointment Detail ----------------------------------------------------
  getAppointmentDetail: (id: string) =>
    withFallback(() => request<AppointmentDetail>(`/appointments/${id}`), "getAppointmentDetail", id),

  updateAppointment: (id: string, data: Record<string, unknown>) =>
    withFallback(() => request<Appointment>(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) }), "updateAppointment", id, data),

  deleteAppointment: (id: string) =>
    withFallback(() => request<void>(`/appointments/${id}`, { method: "DELETE" }), "deleteAppointment", id),

  // ─── Website Builder ────────────────────────────────────────────────────
  listWebsites: () =>
    withFallback(() => request<any[]>("/websites"), "listWebsites"),

  createWebsite: (data: { name: string; description?: string; industry?: string }) =>
    withFallback(() => request<any>("/websites", { method: "POST", body: JSON.stringify(data) }), "createWebsite", data),

  getWebsite: (id: string) =>
    withFallback(() => request<any>(`/websites/${id}`), "getWebsite", id),

  deleteWebsite: (id: string) =>
    withFallback(() => request<void>(`/websites/${id}`, { method: "DELETE" }), "deleteWebsite", id),

  duplicateWebsite: (id: string) =>
    withFallback(() => request<any>(`/websites/${id}/duplicate`, { method: "POST" }), "duplicateWebsite", id),

  generateWebsite: (id: string, data: { prompt: string; industry?: string }) =>
    withFallback(() => request<any>(`/websites/${id}/generate`, { method: "POST", body: JSON.stringify(data) }), "generateWebsite", id, data),

  regenerateSection: (id: string, data: { pageSlug: string; sectionId: string; prompt: string }) =>
    withFallback(() => request<any>(`/websites/${id}/regenerate-section`, { method: "POST", body: JSON.stringify(data) }), "regenerateSection", id, data),

  listPages: (id: string) =>
    withFallback(() => request<any[]>(`/websites/${id}/pages`), "listPages", id),

  createPage: (id: string, data: { title: string; slug: string; isHome?: boolean }) =>
    withFallback(() => request<any>(`/websites/${id}/pages`, { method: "POST", body: JSON.stringify(data) }), "createPage", id, data),

  updatePage: (id: string, pageId: string, data: Record<string, unknown>) =>
    withFallback(() => request<any>(`/websites/${id}/pages/${pageId}`, { method: "PATCH", body: JSON.stringify(data) }), "updatePage", id, pageId, data),

  deletePage: (id: string, pageId: string) =>
    withFallback(() => request<void>(`/websites/${id}/pages/${pageId}`, { method: "DELETE" }), "deletePage", id, pageId),

  updateSection: (id: string, sectionId: string, data: Record<string, unknown>) =>
    withFallback(() => request<any>(`/websites/${id}/sections/${sectionId}`, { method: "PATCH", body: JSON.stringify(data) }), "updateSection", id, sectionId, data),

  addSection: (id: string, pageId: string, data: { component: string; content: Record<string, unknown>; sortOrder?: number; styles?: Record<string, unknown> }) =>
    withFallback(() => request<any>(`/websites/${id}/pages/${pageId}/sections`, { method: "POST", body: JSON.stringify(data) }), "addSection", id, pageId, data),

  deleteSection: (id: string, sectionId: string) =>
    withFallback(() => request<void>(`/websites/${id}/sections/${sectionId}`, { method: "DELETE" }), "deleteSection", id, sectionId),

  reorderSections: (id: string, pageId: string, sectionIds: string[]) =>
    withFallback(() => request<any>(`/websites/${id}/pages/${pageId}/reorder`, { method: "POST", body: JSON.stringify({ sectionIds }) }), "reorderSections", id, pageId, sectionIds),

  publishWebsite: (id: string) =>
    withFallback(() => request<any>(`/websites/${id}/publish`, { method: "POST" }), "publishWebsite", id),

  getPreview: (id: string) =>
    withFallback(() => request<any>(`/websites/${id}/preview`), "getPreview", id),

  getDeployments: (id: string) =>
    withFallback(() => request<any[]>(`/websites/${id}/deployments`), "getDeployments", id),

  addDomain: (id: string, domain: string) =>
    withFallback(() => request<any>(`/websites/${id}/domains`, { method: "POST", body: JSON.stringify({ domain }) }), "addDomain", id, domain),

  listDomains: (id: string) =>
    withFallback(() => request<any[]>(`/websites/${id}/domains`), "listDomains", id),

  verifyDomain: (id: string, domainId: string) =>
    withFallback(() => request<any>(`/websites/${id}/domains/${domainId}/verify`, { method: "POST" }), "verifyDomain", id, domainId),

  removeDomain: (id: string, domainId: string) =>
    withFallback(() => request<void>(`/websites/${id}/domains/${domainId}`, { method: "DELETE" }), "removeDomain", id, domainId),

  // ─── Auth ────────────────────────────────────────────────────────────────

  login: (email: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  signUp: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    request<{ token: string; user: any }>("/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  googleLogin: (idToken: string) =>
    request<{ token: string; user: any }>("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }),

  googleLoginFromAccessToken: (accessToken: string) =>
    request<{ token: string; user: any }>("/auth/google", { method: "POST", body: JSON.stringify({ accessToken }) }),

  demoLogin: (): Promise<{ token: string; user: any }> =>
    Promise.resolve({
      token: "mock-token",
      user: {
        id: "dev-user-id",
        externalId: "dev-user",
        email: "demo@doloyal.ai",
        firstName: "Demo",
        lastName: "User",
        memberships: [
          {
            id: "dev-membership-id",
            userId: "dev-user-id",
            tenantId: "t1",
            role: "OWNER",
            createdAt: new Date().toISOString(),
          },
        ],
        activeTenantId: "t1",
        activeRole: "OWNER",
      },
    }),

  // ─── Integrations ────────────────────────────────────────────────────────

  listIntegrationProviders: () =>
    request<any[]>("/integrations/providers"),

  listIntegrations: (tenantId?: string) =>
    withFallback(() => request<any[]>("/integrations"), "listIntegrations", tenantId),

  getIntegration: (type: string) =>
    withFallback(() => request<any>(`/integrations/${type}`), "getIntegration", type),

  connectIntegration: (data: { type: string; apiKey?: string; apiSecret?: string; accessToken?: string; refreshToken?: string; label?: string; metadata?: Record<string, unknown> }) =>
    withFallback(() => request<any>("/integrations/connect", { method: "POST", body: JSON.stringify(data) }), "connectIntegration", data),

  disconnectIntegration: (type: string) =>
    withFallback(() => request<any>(`/integrations/${type}/disconnect`, { method: "POST" }), "disconnectIntegration", type),

  reconnectIntegration: (type: string, data: { apiKey?: string; apiSecret?: string; accessToken?: string; refreshToken?: string }) =>
    request<any>(`/integrations/${type}/reconnect`, { method: "POST", body: JSON.stringify(data) }),

  testIntegration: (type: string) =>
    request<any>(`/integrations/${type}/test`, { method: "POST" }),

  syncIntegration: (type: string) =>
    request<any>(`/integrations/${type}/sync`, { method: "POST" }),

  getIntegrationConfig: (type: string) =>
    request<any>(`/integrations/${type}/config`),

  updateIntegrationConfig: (type: string, config: Record<string, unknown>) =>
    withFallback(() => request<any>(`/integrations/${type}/config`, { method: "PATCH", body: JSON.stringify({ config }) }), "updateIntegrationConfig", type, config),

  getIntegrationSyncLogs: (type: string) =>
    request<any[]>(`/integrations/${type}/sync-logs`),

  getIntegrationWebhookEvents: (type: string) =>
    request<any[]>(`/integrations/${type}/webhook-events`),

  getOAuthUrl: (type: string, redirectUri?: string) =>
    request<{ url: string; state: string }>(`/integrations/oauth/${type}/url?redirect_uri=${encodeURIComponent(redirectUri || 'http://localhost:3000/app/integrations/callback')}`, { method: "POST" }),

  handleOAuthCallback: (type: string, code: string, redirectUri?: string) =>
    request<any>(`/integrations/oauth/${type}/callback`, { method: "POST", body: JSON.stringify({ code, redirect_uri: redirectUri || 'http://localhost:3000/app/integrations/callback' }) }),

  // ─── Website Connections ─────────────────────────────────────────────────

  listConnectedWebsites: () =>
    withFallback(() => request<ConnectedWebsite[]>("/website-connections"), "listConnectedWebsites"),

  getConnectedWebsite: (id: string) =>
    withFallback(() => request<ConnectedWebsite>(`/website-connections/${id}`), "getConnectedWebsite", id),

  createConnectedWebsite: (data: CreateConnectedWebsiteInput) =>
    withFallback(
      () => request<ConnectedWebsiteCreateResult>("/website-connections", { method: "POST", body: JSON.stringify(data) }),
      "createConnectedWebsite",
      data,
    ),

  disconnectConnectedWebsite: (id: string) =>
    withFallback(
      () => request<ConnectedWebsite>(`/website-connections/${id}/disconnect`, { method: "POST", body: JSON.stringify({}) }),
      "disconnectConnectedWebsite",
      id,
    ),

  reconnectConnectedWebsite: (id: string) =>
    withFallback(
      () => request<ConnectedWebsite>(`/website-connections/${id}/reconnect`, { method: "POST", body: JSON.stringify({}) }),
      "reconnectConnectedWebsite",
      id,
    ),

  deleteConnectedWebsite: (id: string) =>
    withFallback(
      () => request<{ success: boolean }>(`/website-connections/${id}`, { method: "DELETE" }),
      "deleteConnectedWebsite",
      id,
    ),

  listWebsiteConnectionApiKeys: () =>
    withFallback(() => request<WebsiteConnectionApiKey[]>("/website-connections/api-keys"), "listWebsiteConnectionApiKeys"),

  listWebsiteConnectionWebhooks: () =>
    withFallback(() => request<WebsiteConnectionWebhook[]>("/website-connections/webhooks"), "listWebsiteConnectionWebhooks"),

  listWebsiteConnectionLogs: (params?: { websiteId?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.websiteId) searchParams.set("websiteId", params.websiteId);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return withFallback(
      () => request<ConnectionLogEntry[]>(`/website-connections/logs${qs ? `?${qs}` : ""}`),
      "listWebsiteConnectionLogs",
      params,
    );
  },

  updateConnectedWebsiteSettings: (id: string, data: { name?: string; websiteUrl?: string; settings?: Record<string, unknown> }) =>
    withFallback(
      () => request<ConnectedWebsite>(`/website-connections/${id}/settings`, { method: "PATCH", body: JSON.stringify(data) }),
      "updateConnectedWebsiteSettings",
      id,
      data,
    ),
};
