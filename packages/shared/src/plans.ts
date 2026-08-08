/**
 * Doloyal — subscription plan definitions.
 *
 * Single source of truth for both the marketing pricing grid and the
 * backend's feature-gate / usage-limit checks.
 */
import type { Permission } from "./enums";

export interface PlanLimit {
  customers: number; // max customers; -1 = unlimited
  branches: number;
  staff: number;
  monthlyMessages: number; // WhatsApp/SMS/Email combined
  aiQueries: number; // assistant messages / month
  campaignAutomations: boolean;
  retentionEngine: boolean;
  multiBranch: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number; // INR
  priceYearly: number;
  highlighted?: boolean;
  cta: string;
  features: string[];
  limits: PlanLimit;
  /** Permissions granted to the tenant while on this plan. */
  permissions: Permission[];
}

const COMMON_FEATURED: Permission[] = [
  "customers:read",
  "customers:write",
  "loyalty:read",
  "rewards:redeem",
  "appointments:read",
  "invoices:read",
  "analytics:read",
];

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Trial",
    tagline: "14 days, every feature unlocked.",
    priceMonthly: 0,
    priceYearly: 0,
    cta: "Start free trial",
    features: [
      "Up to 100 customers",
      "Loyalty points + 3 rewards",
      "Dashboard & analytics",
      "AI assistant (50 queries)",
      "Email support",
    ],
    limits: {
      customers: 100,
      branches: 1,
      staff: 2,
      monthlyMessages: 50,
      aiQueries: 50,
      campaignAutomations: false,
      retentionEngine: false,
      multiBranch: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false,
    },
    permissions: [...COMMON_FEATURED, "ai:use"],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For single-location shops getting started.",
    priceMonthly: 1499,
    priceYearly: 14990,
    cta: "Choose Starter",
    features: [
      "Up to 500 customers",
      "Loyalty + 10 rewards",
      "Memberships (Silver/Gold)",
      "Campaigns (manual)",
      "AI assistant (500 queries)",
      "Email + chat support",
    ],
    limits: {
      customers: 500,
      branches: 1,
      staff: 5,
      monthlyMessages: 500,
      aiQueries: 500,
      campaignAutomations: false,
      retentionEngine: false,
      multiBranch: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false,
    },
    permissions: [...COMMON_FEATURED, "loyalty:manage", "rewards:manage", "memberships:manage", "campaigns:manage", "ai:use"],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For growing businesses that need automation.",
    priceMonthly: 3499,
    priceYearly: 34990,
    highlighted: true,
    cta: "Choose Growth",
    features: [
      "Up to 5,000 customers",
      "Unlimited rewards + 3 memberships",
      "Automated campaigns (birthday/win-back)",
      "AI retention engine",
      "AI assistant (5,000 queries)",
      "WhatsApp + SMS + Email",
      "Priority support",
    ],
    limits: {
      customers: 5000,
      branches: 2,
      staff: 20,
      monthlyMessages: 5000,
      aiQueries: 5000,
      campaignAutomations: true,
      retentionEngine: true,
      multiBranch: true,
      apiAccess: false,
      prioritySupport: true,
      whiteLabel: false,
    },
    permissions: [
      ...COMMON_FEATURED,
      "loyalty:manage",
      "rewards:manage",
      "memberships:manage",
      "campaigns:manage",
      "appointments:manage",
      "invoices:manage",
      "ai:use",
      "settings:manage",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "Multi-branch operations with advanced AI.",
    priceMonthly: 7999,
    priceYearly: 79990,
    cta: "Choose Professional",
    features: [
      "Up to 25,000 customers",
      "Unlimited branches & staff",
      "Full automation suite",
      "Advanced retention predictions",
      "AI assistant (unlimited)",
      "API access",
      "Dedicated success manager",
    ],
    limits: {
      customers: 25000,
      branches: 10,
      staff: 100,
      monthlyMessages: 50000,
      aiQueries: -1,
      campaignAutomations: true,
      retentionEngine: true,
      multiBranch: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: false,
    },
    permissions: [
      ...COMMON_FEATURED,
      "loyalty:manage",
      "rewards:manage",
      "memberships:manage",
      "campaigns:manage",
      "appointments:manage",
      "invoices:manage",
      "ai:use",
      "settings:manage",
      "tenant:manage",
      "staff:manage",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom-built for chains & franchises.",
    priceMonthly: -1, // custom
    priceYearly: -1,
    cta: "Contact sales",
    features: [
      "Unlimited everything",
      "White-label branding",
      "Custom integrations & SLA",
      "Onboarding & training",
      "SSO + audit logs",
      "Dedicated infrastructure",
    ],
    limits: {
      customers: -1,
      branches: -1,
      staff: -1,
      monthlyMessages: -1,
      aiQueries: -1,
      campaignAutomations: true,
      retentionEngine: true,
      multiBranch: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: true,
    },
    permissions: [
      "tenant:manage",
      "billing:manage",
      "staff:manage",
      "customers:read",
      "customers:write",
      "loyalty:manage",
      "loyalty:read",
      "rewards:manage",
      "rewards:redeem",
      "memberships:manage",
      "appointments:manage",
      "appointments:read",
      "invoices:manage",
      "invoices:read",
      "campaigns:manage",
      "analytics:read",
      "ai:use",
      "settings:manage",
    ],
  },
];

export const DEFAULT_PLAN_ID = "growth";

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function formatPrice(price: number): string {
  if (price < 0) return "Custom";
  if (price === 0) return "Free";
  return `₹${price.toLocaleString("en-IN")}`;
}
