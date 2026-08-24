/**
 * Agent tool registry — write + read tools that let the AI assistant operate
 * the SaaS on the user's behalf (create booking links, campaigns, workflows,
 * invoices, etc.), following the same whitelist philosophy as
 * modules/workflows/workflow-capability.registry.ts: arbitrary behaviour can
 * never reach services — only these declared, tenant-scoped, role-gated calls.
 */
import { CustomersService } from '../customers/customers.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { BookingLinksService } from '../booking-links/booking-links.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ReferralsService } from '../referrals/referrals.service';
import { RewardsService } from '../rewards/rewards.service';
import { MembershipsService } from '../memberships/memberships.service';
import { BranchesService } from '../branches/branches.service';
import { InvoicesService } from '../invoices/invoices.service';
import { WorkflowService } from '../workflows/workflow.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

export interface AgentServices {
  customers: CustomersService;
  campaigns: CampaignsService;
  bookingLinks: BookingLinksService;
  appointments: AppointmentsService;
  referrals: ReferralsService;
  rewards: RewardsService;
  memberships: MembershipsService;
  branches: BranchesService;
  invoices: InvoicesService;
  workflows: WorkflowService;
  loyalty: LoyaltyService;
}

export interface AgentToolContext {
  tenantId: string;
  userId: string;
  role?: string;
  services: AgentServices;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  mutating?: boolean;
  /** Roles allowed to run this tool. Undefined = any authenticated role. */
  requiredRoles?: string[];
  /** When true (or returns true for the given args), the model must pass confirmed=true after the user explicitly agrees. */
  requiresConfirmation?: boolean | ((args: Record<string, any>) => boolean);
  handler: (ctx: AgentToolContext, args: Record<string, any>) => Promise<unknown>;
}

const str = (description: string) => ({ type: 'string', description });
const num = (description: string) => ({ type: 'number', description });

function pick<T extends Record<string, unknown>>(row: T | null | undefined, fields: string[]) {
  if (!row) return null;
  const out: Record<string, unknown> = { id: row.id };
  for (const f of fields) if (row[f] !== undefined && row[f] !== null) out[f] = row[f];
  return out;
}

export const AGENT_TOOLS: AgentTool[] = [
  // ─── Reads ──────────────────────────────────────────────────────────────────
  {
    name: 'getBookingLinks',
    description: 'List all booking links for the business (id, name, slug, publish state).',
    parameters: { type: 'object', properties: {} },
    handler: async (ctx) => {
      const rows = await ctx.services.bookingLinks.list(ctx.tenantId);
      return (rows as any[]).slice(0, 25).map((r) =>
        pick(r, ['name', 'slug', 'type', 'isActive', 'publishedAt', 'createdAt']),
      );
    },
  },
  {
    name: 'listAppointments',
    description:
      'List appointments with optional filters. Use getAppointmentsToday for today. startTime/endTime are ISO strings.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
        from: str('ISO date — range start'),
        to: str('ISO date — range end'),
      },
    },
    handler: async (ctx, args) => {
      const rows = await ctx.services.appointments.list(ctx.tenantId, {
        status: args.status || undefined,
        from: args.from || undefined,
        to: args.to || undefined,
      });
      return (rows as any[]).slice(0, 30);
    },
  },
  {
    name: 'listRewards',
    description: 'List loyalty rewards in the catalog with points cost and stock.',
    parameters: {
      type: 'object',
      properties: { search: str('optional name/description filter') },
    },
    handler: async (ctx, args) => {
      const rows = await ctx.services.rewards.list(ctx.tenantId, { search: args.search || undefined });
      return (rows as any[]).slice(0, 30).map((r) => pick(r, ['name', 'pointsCost', 'category', 'status']));
    },
  },
  {
    name: 'listWorkflows',
    description: 'List automation workflows with their status (DRAFT/ACTIVE/PAUSED).',
    parameters: { type: 'object', properties: {} },
    handler: async (ctx) => {
      const rows = await ctx.services.workflows.list(ctx.tenantId);
      return (rows as any[]).slice(0, 25).map((r) => pick(r, ['name', 'status', 'trigger', 'updatedAt']));
    },
  },
  {
    name: 'getLoyaltyOverview',
    description: 'Get loyalty program overview: members, points issued/redeemed, tiers.',
    parameters: { type: 'object', properties: {} },
    handler: async (ctx) => ctx.services.loyalty.getOverview(ctx.tenantId),
  },

  // ─── Customers ──────────────────────────────────────────────────────────────
  {
    name: 'createCustomer',
    description: 'Create a customer. Ask for name and phone if not provided.',
    parameters: {
      type: 'object',
      properties: {
        name: str('Full name'),
        phone: str('Phone number'),
        email: str('Optional email'),
        notes: str('Optional notes'),
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags e.g. ["VIP"]' },
      },
      required: ['name', 'phone'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    handler: async (ctx, args) => {
      const phone = String(args.phone || '').trim();
      if (!phone) {
        return { error: 'A phone number is required. Ask the user for the phone number.' };
      }
      const created = await ctx.services.customers.create(ctx.tenantId, {
        name: String(args.name),
        phone,
        email: args.email || undefined,
        notes: args.notes || undefined,
        tags: Array.isArray(args.tags) ? args.tags.map(String) : undefined,
      });
      return pick(created as any, ['firstName', 'lastName', 'phone', 'email']);
    },
  },
  {
    name: 'updateCustomer',
    description: "Update an existing customer's contact info, notes, tags, or status.",
    parameters: {
      type: 'object',
      properties: {
        customerId: str('ID of the customer to update — resolve via searchCustomers first'),
        name: str('New full name'),
        phone: str('New phone'),
        email: str('New email'),
        notes: str('Notes'),
        tags: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['ACTIVE', 'AT_RISK', 'INACTIVE', 'CHURNED'] },
      },
      required: ['customerId'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    handler: async (ctx, args) => {
      const data: Record<string, unknown> = {};
      if (args.name) data.name = String(args.name);
      if (args.phone) data.phone = String(args.phone);
      if (args.email) data.email = String(args.email);
      if (args.notes) data.notes = String(args.notes);
      if (Array.isArray(args.tags)) data.tags = args.tags.map(String);
      if (args.status) data.status = String(args.status);
      const updated = await ctx.services.customers.update(ctx.tenantId, String(args.customerId), data as any);
      return pick(updated as any, ['firstName', 'lastName', 'phone', 'email', 'status']);
    },
  },

  // ─── Loyalty ────────────────────────────────────────────────────────────────
  {
    name: 'adjustLoyaltyPoints',
    description:
      'Add or remove loyalty points for a customer. Negative points deduct balance. Always confirm the exact amount and reason with the user first when deducting.',
    parameters: {
      type: 'object',
      properties: {
        customerId: str('Customer ID — resolve via searchCustomers first'),
        points: num('Positive to add, negative to deduct'),
        reason: str('Why the adjustment is being made'),
        confirmed: { type: 'boolean', description: 'Must be true after the user explicitly confirms' },
      },
      required: ['customerId', 'points', 'reason'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    requiresConfirmation: (args) => Number(args.points) < 0,
    handler: async (ctx, args) => {
      const result = await ctx.services.loyalty.adjust(
        ctx.tenantId,
        String(args.customerId),
        Number(args.points),
        String(args.reason),
      );
      return result as unknown as Record<string, unknown>;
    },
  },

  // ─── Booking links ──────────────────────────────────────────────────────────
  {
    name: 'createBookingLink',
    description:
      'Create a booking page/link customers can use to book appointments online. Ask the user what the link is for (service name) before creating.',
    parameters: {
      type: 'object',
      properties: {
        name: str('Display name, e.g. "Haircut — 45 min"'),
        type: { type: 'string', enum: ['SERVICE', 'APPOINTMENT', 'CLASS', 'EVENT'], description: 'Defaults to SERVICE' },
        description: str('Short description shown on the page'),
      },
      required: ['name'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    handler: async (ctx, args) => {
      const created = (await ctx.services.bookingLinks.create(ctx.tenantId, {
        name: String(args.name),
        ...(args.type ? { type: args.type } : {}),
        ...(args.description ? { description: args.description } : {}),
      })) as any;
      return pick(created, ['name', 'slug', 'type', 'isActive']);
    },
  },
  {
    name: 'publishBookingLink',
    description: 'Publish a booking link so it goes live for customers.',
    parameters: {
      type: 'object',
      properties: { bookingLinkId: str('Booking link ID — resolve via getBookingLinks or the create result') },
      required: ['bookingLinkId'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    handler: async (ctx, args) => {
      const published = (await ctx.services.bookingLinks.publish(ctx.tenantId, String(args.bookingLinkId))) as any;
      return pick(published, ['name', 'slug', 'isActive', 'publishedAt']);
    },
  },

  // ─── Appointments ───────────────────────────────────────────────────────────
  {
    name: 'createAppointment',
    description:
      'Book an appointment for an existing customer. Resolve customerId via searchCustomers; ask for date/time if unclear.',
    parameters: {
      type: 'object',
      properties: {
        customerId: str('Customer ID'),
        serviceName: str('Service being booked'),
        startTime: str('ISO datetime, e.g. 2026-08-25T10:00:00Z'),
        endTime: str('ISO datetime'),
        notes: str('Optional notes'),
      },
      required: ['customerId', 'serviceName', 'startTime', 'endTime'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    handler: async (ctx, args) => {
      const created = (await ctx.services.appointments.create(ctx.tenantId, {
        customerId: String(args.customerId),
        serviceName: String(args.serviceName),
        startTime: String(args.startTime),
        endTime: String(args.endTime),
        notes: args.notes || undefined,
      })) as any;
      return pick(created, ['serviceName', 'startTime', 'endTime', 'status']);
    },
  },

  // ─── Campaigns ──────────────────────────────────────────────────────────────
  {
    name: 'createCampaign',
    description:
      'Create a marketing campaign (draft by default). Show the user the final message text before creating. If scheduleDate is set it will send automatically later.',
    parameters: {
      type: 'object',
      properties: {
        name: str('Campaign name'),
        channel: { type: 'string', enum: ['EMAIL', 'WHATSAPP', 'SMS'] },
        body: str('The message content. Use a clear offer + call to action.'),
        subject: str('Email subject (EMAIL channel)'),
        audience: { type: 'string', enum: ['All', 'VIP', 'At Risk', 'Inactive'] },
        scheduleDate: str('Optional ISO datetime to schedule auto-send'),
        confirmed: { type: 'boolean' },
      },
      required: ['name', 'channel', 'body'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    requiresConfirmation: (args) => !!args.scheduleDate,
    handler: async (ctx, args) => {
      const created = (await ctx.services.campaigns.create(ctx.tenantId, {
        name: String(args.name),
        body: String(args.body),
        channel: args.channel,
        subject: args.subject || undefined,
        audience: args.audience || undefined,
        scheduleDate: args.scheduleDate || undefined,
      })) as any;
      return pick(created, ['name', 'channel', 'audience', 'recipients', 'status', 'scheduleDate']);
    },
  },
  {
    name: 'sendCampaign',
    description:
      'Send an existing campaign NOW to its audience. This contacts real customers — always summarize name/channel/audience/message and get explicit confirmation first.',
    parameters: {
      type: 'object',
      properties: {
        campaignId: str('Campaign ID — resolve via listCampaigns first'),
        confirmed: { type: 'boolean', description: 'Must be true after explicit user confirmation' },
      },
      required: ['campaignId'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    requiresConfirmation: true,
    handler: async (ctx, args) => ctx.services.campaigns.send(ctx.tenantId, String(args.campaignId)),
  },

  // ─── Rewards ────────────────────────────────────────────────────────────────
  {
    name: 'createReward',
    description: 'Add a reward to the redemption catalog customers spend points on.',
    parameters: {
      type: 'object',
      properties: {
        name: str('Reward name, e.g. "Free haircut"'),
        pointsCost: num('Points needed to redeem'),
        discountValue: num('Optional flat discount value'),
        category: str('Optional category label'),
        description: str('Optional description'),
      },
      required: ['name'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    handler: async (ctx, args) => {
      const created = (await ctx.services.rewards.create(ctx.tenantId, {
        name: String(args.name),
        ...(args.pointsCost != null ? { pointsCost: Number(args.pointsCost) } : {}),
        ...(args.discountValue != null ? { discountVal: Number(args.discountValue) } : {}),
        ...(args.category ? { category: String(args.category) } : {}),
        ...(args.description ? { description: String(args.description) } : {}),
      })) as any;
      return pick(created, ['name', 'pointsCost', 'discountVal', 'category', 'status']);
    },
  },

  // ─── Workflows / automations ────────────────────────────────────────────────
  {
    name: 'generateWorkflow',
    description:
      'Create an automation workflow from a natural-language description, e.g. "when a customer books, send a thank-you email". Saved as DRAFT (not live). Summarize what was built afterwards.',
    parameters: {
      type: 'object',
      properties: { prompt: str('Plain-English automation description, include trigger + actions') },
      required: ['prompt'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    handler: async (ctx, args) => {
      const { reply, workflow } = await ctx.services.workflows.generate(
        ctx.tenantId,
        ctx.userId,
        String(args.prompt).slice(0, 4000),
      );
      return {
        reply,
        workflow: workflow ? pick(workflow as any, ['name', 'status', 'trigger']) : null,
      };
    },
  },
  {
    name: 'activateWorkflow',
    description:
      'Activate (make live) a workflow so it runs automatically on real events. Confirm with the user first and state which events will trigger it.',
    parameters: {
      type: 'object',
      properties: {
        workflowId: str('Workflow ID — resolve via listWorkflows or generateWorkflow result'),
        confirmed: { type: 'boolean' },
      },
      required: ['workflowId'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    requiresConfirmation: true,
    handler: async (ctx, args) => {
      const wf = (await ctx.services.workflows.activate(ctx.tenantId, ctx.userId, String(args.workflowId))) as any;
      return pick(wf?.workflow ?? wf, ['name', 'status']);
    },
  },

  // ─── Referrals ──────────────────────────────────────────────────────────────
  {
    name: 'createReferralLink',
    description: 'Generate a referral share link, optionally tied to a specific customer.',
    parameters: {
      type: 'object',
      properties: {
        name: str('Label for the link'),
        customerId: str('Optional customer ID to attribute referrals'),
        customSlug: str('Optional custom slug (lowercase, unique)'),
      },
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    handler: async (ctx, args) => {
      const link = (await ctx.services.referrals.generateLink(ctx.tenantId, {
        name: args.name || undefined,
        customerId: args.customerId || undefined,
        customSlug: args.customSlug || undefined,
      })) as any;
      return pick(link, ['name', 'code', 'customSlug', 'url']);
    },
  },

  // ─── Invoices ───────────────────────────────────────────────────────────────
  {
    name: 'createInvoice',
    description:
      'Create a PAID invoice for a customer. Updates their visit count/spend and may award loyalty points. Always read back line items and total for confirmation first.',
    parameters: {
      type: 'object',
      properties: {
        customerId: str('Customer ID — resolve via searchCustomers first'),
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              serviceName: str('Line item name'),
              quantity: num('Quantity'),
              unitPrice: num('Price per unit'),
            },
            required: ['serviceName', 'quantity', 'unitPrice'],
          },
        },
        paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'] },
        notes: str('Optional notes'),
        confirmed: { type: 'boolean' },
      },
      required: ['customerId', 'items'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    requiresConfirmation: true,
    handler: async (ctx, args) => {
      const invoice = (await ctx.services.invoices.create(ctx.tenantId, {
        customerId: String(args.customerId),
        items: (args.items || []).map((i: any) => ({
          serviceName: String(i.serviceName),
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
        })),
        paymentMethod: args.paymentMethod || undefined,
        notes: args.notes || undefined,
      })) as any;
      return pick(invoice, ['invoiceNumber', 'subtotal', 'discount', 'tax', 'total', 'status']);
    },
  },

  // ─── Memberships ────────────────────────────────────────────────────────────
  {
    name: 'createMembershipTier',
    description: 'Create a paid membership tier customers can subscribe to.',
    parameters: {
      type: 'object',
      properties: {
        name: str('Tier name, e.g. "Gold"'),
        price: num('Price per period'),
        validityDays: num('Validity in days (default 365)'),
        discountPercent: num('% discount members get'),
        bonusPointsPercent: num('% extra points members earn'),
      },
      required: ['name'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    handler: async (ctx, args) => {
      const tier = (await ctx.services.memberships.createTier(ctx.tenantId, {
        name: String(args.name),
        ...(args.price != null ? { price: Number(args.price) } : {}),
        ...(args.validityDays != null ? { validityDays: Number(args.validityDays) } : {}),
        ...(args.discountPercent != null ? { discountPercent: Number(args.discountPercent) } : {}),
        ...(args.bonusPointsPercent != null ? { bonusPointsPercent: Number(args.bonusPointsPercent) } : {}),
      })) as any;
      return pick(tier, ['name', 'price', 'validityDays', 'discountPercent']);
    },
  },
  {
    name: 'assignMembership',
    description: 'Assign a membership tier to a customer. Resolve both IDs via searchCustomers / listMembershipTiers context.',
    parameters: {
      type: 'object',
      properties: {
        customerId: str('Customer ID'),
        tierId: str('Membership tier ID'),
      },
      required: ['customerId', 'tierId'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    handler: async (ctx, args) =>
      (await ctx.services.memberships.assignCustomer(
        ctx.tenantId,
        String(args.customerId),
        String(args.tierId),
      )) as unknown as Record<string, unknown>,
  },

  // ─── Branches ───────────────────────────────────────────────────────────────
  {
    name: 'createBranch',
    description: 'Create a business branch/location.',
    parameters: {
      type: 'object',
      properties: {
        name: str('Branch name'),
        phone: str('Optional phone'),
        address: str('Optional address'),
        city: str('Optional city'),
      },
      required: ['name'],
    },
    mutating: true,
    requiredRoles: ['OWNER', 'MANAGER'],
    handler: async (ctx, args) => {
      const branch = (await ctx.services.branches.create(ctx.tenantId, {
        name: String(args.name),
        phone: args.phone || undefined,
        address: args.address || undefined,
        city: args.city || undefined,
      })) as any;
      return pick(branch, ['name', 'city', 'address']);
    },
  },
];

const TOOL_MAP = new Map(AGENT_TOOLS.map((t) => [t.name, t]));

export function getAgentTool(name: string): AgentTool | undefined {
  return TOOL_MAP.get(name);
}

export function agentToolDefinitions() {
  return AGENT_TOOLS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function isMutationTool(name: string): boolean {
  return !!TOOL_MAP.get(name)?.mutating;
}

/**
 * Hard gate executed server-side before any agent tool runs.
 * Returns a non-null result object when execution must be blocked.
 */
export function checkAgentToolPermission(
  tool: AgentTool,
  role: string | undefined,
  args: Record<string, any>,
): { error: string } | { needsConfirmation: true; instruction: string } | null {
  if (tool.requiredRoles?.length && !tool.requiredRoles.includes(role || '')) {
    return {
      error: `Forbidden: this action requires role ${tool.requiredRoles.join(' or ')}. The current user (${role || 'unknown'}) cannot perform it. Inform the user.`,
    };
  }
  const needsConfirm =
    typeof tool.requiresConfirmation === 'function' ? tool.requiresConfirmation(args) : tool.requiresConfirmation;
  if (needsConfirm && args.confirmed !== true) {
    return {
      needsConfirmation: true,
      instruction:
        'BLOCKED pending user confirmation. Do NOT retry with confirmed=true unless the user has explicitly agreed in this conversation. Present exactly what will happen (names, amounts, audience, timing), then ask for approval.',
    };
  }
  return null;
}
