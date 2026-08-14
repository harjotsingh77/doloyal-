/**
 * Doloyal — subscription plan definitions (backend).
 *
 * The single source of truth for plan pricing, features, and usage limits is
 * `@doloyal/shared` (used by both the marketing pricing grid and the web app's
 * Billing Center). This module re-exports those plans so the memberships
 * module validates against the exact same plan list the customer sees.
 */
import { PLANS as SHARED_PLANS, getPlan as sharedGetPlan } from '@doloyal/shared';

export type PlanLimit = import('@doloyal/shared').PlanLimit;
export type PlanDefinition = import('@doloyal/shared').Plan;

export const PLANS: PlanDefinition[] = SHARED_PLANS;

export function getPlan(id: string): PlanDefinition | undefined {
  return sharedGetPlan(id);
}
