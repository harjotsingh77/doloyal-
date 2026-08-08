export interface PlanLimit {
  customers: number;
  staff: number;
  branches: number;
  aiQueries: number;
  storage: number;
  apiLimits: number;
  automationLimits: number;
}

export interface PlanDefinition {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: PlanLimit;
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For small businesses just getting started',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Up to 50 customers',
      '1 staff account',
      'Basic loyalty program',
      'Manual campaign sending',
      'Email support',
    ],
    limits: { customers: 50, staff: 1, branches: 1, aiQueries: 10, storage: 100, apiLimits: 100, automationLimits: 0 },
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For growing salons and studios',
    priceMonthly: 2999,
    priceYearly: 29990,
    features: [
      'Up to 500 customers',
      '3 staff accounts',
      'Full loyalty program',
      'SMS & email campaigns',
      'Basic analytics',
      'Rewards & tiers',
      'Priority support',
    ],
    limits: { customers: 500, staff: 3, branches: 1, aiQueries: 100, storage: 500, apiLimits: 1000, automationLimits: 50 },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For established businesses with multiple locations',
    priceMonthly: 7999,
    priceYearly: 79990,
    features: [
      'Up to 2,000 customers',
      '10 staff accounts',
      'Up to 3 branches',
      'AI-powered insights',
      'Advanced analytics & reports',
      'Automated campaigns',
      'Integrations (email, SMS, calendar)',
      'Custom rewards & tiers',
      'API access',
      'Priority support',
    ],
    limits: { customers: 2000, staff: 10, branches: 3, aiQueries: 500, storage: 2000, apiLimits: 5000, automationLimits: 500 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large chains with advanced needs',
    priceMonthly: 19999,
    priceYearly: 199990,
    features: [
      'Unlimited customers',
      'Unlimited staff',
      'Unlimited branches',
      'Full AI suite',
      'Custom integrations',
      'White-label options',
      'Dedicated account manager',
      'Custom development',
      'SLA guarantee',
      'Priority 24/7 support',
    ],
    limits: { customers: 999999, staff: 999, branches: 99, aiQueries: 9999, storage: 50000, apiLimits: 50000, automationLimits: 9999 },
  },
];

export function getPlan(id: string): PlanDefinition | undefined {
  return PLANS.find(p => p.id === id);
}
