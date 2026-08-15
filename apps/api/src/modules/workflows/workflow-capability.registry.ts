/**
 * Doloyal Workflows — approved capability registry.
 *
 * The Workflow AI may ONLY emit nodes/actions defined in this registry.
 * Anything outside this list is rejected during validation so that
 * arbitrary AI-generated behaviour can never reach the engine.
 */

export type CapabilityKind = 'trigger' | 'condition' | 'action';

export interface TriggerCapability {
  type: string;
  label: string;
  category: 'CUSTOMER' | 'APPOINTMENT' | 'LOYALTY' | 'MEMBERSHIP' | 'CAMPAIGN' | 'WEBSITE' | 'BILLING' | 'AI' | 'SCHEDULE';
  description: string;
  params?: { key: string; label: string; type: 'number' | 'string' | 'boolean' }[];
}

export interface ConditionCapability {
  key: string;
  label: string;
  category: 'CUSTOMER' | 'APPOINTMENT' | 'CAMPAIGN' | 'MEMBERSHIP' | 'BILLING' | 'WEBSITE';
  operators: string[];
  valueType: 'number' | 'string' | 'enum' | 'boolean';
  values?: string[];
  description: string;
}

export interface ActionCapability {
  type: string;
  label: string;
  category: 'MESSAGING' | 'LOYALTY' | 'CUSTOMER' | 'CAMPAIGN' | 'APPOINTMENT' | 'MEMBERSHIP' | 'INTERNAL' | 'CONTROL';
  description: string;
  channels?: string[];
  needsApproval?: boolean; // requires activation confirmation (costs money / touches customers)
  fields?: { key: string; label: string; type: 'string' | 'number' | 'select'; values?: string[] }[];
  testOnly?: boolean; // reserved / not yet wired to a real provider
}

/** Triggers that the engine can actually listen for today. */
export const TRIGGER_REGISTRY: TriggerCapability[] = [
  { type: 'customer_created', label: 'Customer created', category: 'CUSTOMER', description: 'Fires when a new customer profile is created.' },
  { type: 'customer_updated', label: 'Customer updated', category: 'CUSTOMER', description: 'Fires when a customer profile is updated.' },
  { type: 'customer_inactive', label: 'Customer inactive', category: 'CUSTOMER', description: 'Fires when a customer has not visited for N days.', params: [{ key: 'days', label: 'Inactive days', type: 'number' }] },
  { type: 'customer_birthday', label: 'Customer birthday', category: 'CUSTOMER', description: 'Fires on a customer’s birthday (daily scan).' },
  { type: 'customer_returned', label: 'Customer returned', category: 'CUSTOMER', description: 'Fires when a customer books after being inactive.' },
  { type: 'customer_tag_added', label: 'Customer tag added', category: 'CUSTOMER', description: 'Fires when a tag is added to a customer.', params: [{ key: 'tag', label: 'Tag', type: 'string' }] },
  { type: 'customer_tag_removed', label: 'Customer tag removed', category: 'CUSTOMER', description: 'Fires when a tag is removed from a customer.' },
  { type: 'appointment_booked', label: 'Appointment booked', category: 'APPOINTMENT', description: 'Fires when a customer books an appointment.' },
  { type: 'appointment_confirmed', label: 'Appointment confirmed', category: 'APPOINTMENT', description: 'Fires when an appointment is confirmed.' },
  { type: 'appointment_completed', label: 'Appointment completed', category: 'APPOINTMENT', description: 'Fires when an appointment is marked completed.' },
  { type: 'appointment_canceled', label: 'Appointment cancelled', category: 'APPOINTMENT', description: 'Fires when an appointment is cancelled.' },
  { type: 'appointment_no_show', label: 'Appointment no-show', category: 'APPOINTMENT', description: 'Fires when an appointment is marked no-show.' },
  { type: 'points_earned', label: 'Points earned', category: 'LOYALTY', description: 'Fires when a customer earns loyalty points.' },
  { type: 'points_threshold_reached', label: 'Points threshold reached', category: 'LOYALTY', description: 'Fires when a customer crosses a points threshold.', params: [{ key: 'points', label: 'Points', type: 'number' }] },
  { type: 'reward_created', label: 'Reward created', category: 'LOYALTY', description: 'Fires when a reward is created.' },
  { type: 'reward_redeemed', label: 'Reward redeemed', category: 'LOYALTY', description: 'Fires when a reward is redeemed.' },
  { type: 'membership_created', label: 'Membership created', category: 'MEMBERSHIP', description: 'Fires when a customer joins a membership plan.' },
  { type: 'membership_expiring', label: 'Membership expiring', category: 'MEMBERSHIP', description: 'Fires when a membership is close to expiring (daily scan).' },
  { type: 'membership_expired', label: 'Membership expired', category: 'MEMBERSHIP', description: 'Fires when a membership expires.' },
  { type: 'campaign_sent', label: 'Campaign sent', category: 'CAMPAIGN', description: 'Fires when a campaign is sent.' },
  { type: 'campaign_delivered', label: 'Campaign delivered', category: 'CAMPAIGN', description: 'Fires when a campaign message is delivered.' },
  { type: 'campaign_opened', label: 'Campaign opened', category: 'CAMPAIGN', description: 'Fires when a campaign message is opened.' },
  { type: 'campaign_clicked', label: 'Campaign clicked', category: 'CAMPAIGN', description: 'Fires when a campaign link is clicked.' },
  { type: 'website_lead_created', label: 'Website lead created', category: 'WEBSITE', description: 'Fires when a lead is created from a website.' },
  { type: 'booking_submitted', label: 'Booking submitted', category: 'WEBSITE', description: 'Fires when a booking is submitted via a website / booking page.' },
  { type: 'contact_form_submitted', label: 'Contact form submitted', category: 'WEBSITE', description: 'Fires when a contact form is submitted on a website.' },
  { type: 'payment_failed', label: 'Payment failed', category: 'BILLING', description: 'Fires when a payment fails.' },
  { type: 'subscription_canceled', label: 'Subscription cancelled', category: 'BILLING', description: 'Fires when a membership subscription is cancelled.' },
  { type: 'retention_risk_high', label: 'High retention risk', category: 'AI', description: 'Fires when a customer is flagged at high retention risk.' },
];

/** Human-friendly label map used when rendering triggers. */
export const TRIGGER_LABELS: Record<string, string> = Object.fromEntries(
  TRIGGER_REGISTRY.map((t) => [t.type, t.label]),
);

export const CONDITION_REGISTRY: ConditionCapability[] = [
  { key: 'last_visit_days', label: 'Last visit (days ago)', category: 'CUSTOMER', operators: ['gt', 'gte', 'lt', 'lte', 'equals'], valueType: 'number', description: 'Days since the customer’s last visit.' },
  { key: 'customer_returned', label: 'Customer returned', category: 'CUSTOMER', operators: ['equals'], valueType: 'boolean', description: 'Whether the customer returned after the previous step.' },
  { key: 'customer_booked_again', label: 'Booked again', category: 'CUSTOMER', operators: ['equals'], valueType: 'boolean', description: 'Whether the customer booked again after the previous step.' },
  { key: 'total_visits', label: 'Total visits', category: 'CUSTOMER', operators: ['gt', 'gte', 'lt', 'lte', 'equals'], valueType: 'number', description: 'Total number of visits.' },
  { key: 'total_spend', label: 'Total spend', category: 'CUSTOMER', operators: ['gt', 'gte', 'lt', 'lte', 'equals'], valueType: 'number', description: 'Total lifetime spend.' },
  { key: 'customer_status', label: 'Customer status', category: 'CUSTOMER', operators: ['equals'], valueType: 'enum', values: ['ACTIVE', 'AT_RISK', 'CHURNED', 'INACTIVE'], description: 'Customer status band.' },
  { key: 'customer_tag', label: 'Has tag', category: 'CUSTOMER', operators: ['equals'], valueType: 'string', description: 'Customer carries a specific tag.' },
  { key: 'membership_status', label: 'Membership status', category: 'CUSTOMER', operators: ['equals'], valueType: 'enum', values: ['ACTIVE', 'EXPIRED', 'NONE', 'EXPIRING'], description: 'Customer membership state.' },
  { key: 'loyalty_points', label: 'Loyalty points', category: 'CUSTOMER', operators: ['gt', 'gte', 'lt', 'lte', 'equals'], valueType: 'number', description: 'Current loyalty points balance.' },
  { key: 'birthday', label: 'Has birthday set', category: 'CUSTOMER', operators: ['equals'], valueType: 'boolean', description: 'Customer has a birthday on file.' },
  { key: 'has_email', label: 'Has email', category: 'CUSTOMER', operators: ['equals'], valueType: 'boolean', description: 'Customer has an email address.' },
  { key: 'has_phone', label: 'Has phone', category: 'CUSTOMER', operators: ['equals'], valueType: 'boolean', description: 'Customer has a phone number.' },
  { key: 'has_whatsapp', label: 'Has WhatsApp', category: 'CUSTOMER', operators: ['equals'], valueType: 'boolean', description: 'Customer has a WhatsApp-capable number.' },
  { key: 'appointment_status', label: 'Appointment status', category: 'APPOINTMENT', operators: ['equals'], valueType: 'enum', values: ['BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], description: 'Status of the triggering appointment.' },
  { key: 'appointment_service', label: 'Appointment service', category: 'APPOINTMENT', operators: ['equals'], valueType: 'string', description: 'Service of the triggering appointment.' },
  { key: 'appointment_branch', label: 'Appointment branch', category: 'APPOINTMENT', operators: ['equals'], valueType: 'string', description: 'Branch of the triggering appointment.' },
  { key: 'campaign_opened', label: 'Campaign opened', category: 'CAMPAIGN', operators: ['equals'], valueType: 'boolean', description: 'Customer opened the campaign message.' },
  { key: 'campaign_clicked', label: 'Campaign clicked', category: 'CAMPAIGN', operators: ['equals'], valueType: 'boolean', description: 'Customer clicked the campaign link.' },
  { key: 'membership_plan', label: 'Membership plan', category: 'MEMBERSHIP', operators: ['equals'], valueType: 'string', description: 'Membership plan name.' },
  { key: 'payment_status', label: 'Payment status', category: 'BILLING', operators: ['equals'], valueType: 'enum', values: ['PAID', 'PENDING', 'FAILED'], description: 'Payment status.' },
];

export const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITION_REGISTRY.map((c) => [c.key, c.label]),
);

export const ACTION_REGISTRY: ActionCapability[] = [
  { type: 'send_email', label: 'Send email', category: 'MESSAGING', description: 'Send an email to the customer.', channels: ['EMAIL'], needsApproval: true, fields: [{ key: 'subject', label: 'Subject', type: 'string' }, { key: 'body', label: 'Body', type: 'string' }] },
  { type: 'send_sms', label: 'Send SMS', category: 'MESSAGING', description: 'Send an SMS to the customer.', channels: ['SMS'], needsApproval: true, fields: [{ key: 'message', label: 'Message', type: 'string' }] },
  { type: 'send_whatsapp', label: 'Send WhatsApp', category: 'MESSAGING', description: 'Send a WhatsApp message to the customer.', channels: ['WHATSAPP'], needsApproval: true, fields: [{ key: 'message', label: 'Message', type: 'string' }] },
  { type: 'add_points', label: 'Add points', category: 'LOYALTY', description: 'Award loyalty points to the customer.', fields: [{ key: 'points', label: 'Points', type: 'number' }] },
  { type: 'remove_points', label: 'Remove points', category: 'LOYALTY', description: 'Deduct loyalty points from the customer.', fields: [{ key: 'points', label: 'Points', type: 'number' }] },
  { type: 'create_reward', label: 'Create reward', category: 'LOYALTY', description: 'Create a reward offer for the customer.', needsApproval: true, fields: [{ key: 'name', label: 'Reward name', type: 'string' }, { key: 'value', label: 'Value', type: 'string' }, { key: 'message', label: 'Message', type: 'string' }] },
  { type: 'add_tag', label: 'Add tag', category: 'CUSTOMER', description: 'Add a tag to the customer.', fields: [{ key: 'tag', label: 'Tag', type: 'string' }] },
  { type: 'remove_tag', label: 'Remove tag', category: 'CUSTOMER', description: 'Remove a tag from the customer.', fields: [{ key: 'tag', label: 'Tag', type: 'string' }] },
  { type: 'send_booking_reminder', label: 'Send booking reminder', category: 'APPOINTMENT', description: 'Remind the customer about an upcoming appointment.', channels: ['WHATSAPP', 'SMS', 'EMAIL'], needsApproval: true },
  { type: 'send_rebooking_message', label: 'Send rebooking message', category: 'APPOINTMENT', description: 'Encourage the customer to rebook after a visit.', channels: ['WHATSAPP', 'SMS', 'EMAIL'], needsApproval: true },
  { type: 'notify_business_owner', label: 'Notify business owner', category: 'INTERNAL', description: 'Send an in-app notification to the business owner.' },
  { type: 'notify_staff', label: 'Notify staff', category: 'INTERNAL', description: 'Send an in-app notification to staff.' },
  { type: 'create_task', label: 'Create internal task', category: 'INTERNAL', description: 'Create a follow-up task for staff.', fields: [{ key: 'title', label: 'Task title', type: 'string' }, { key: 'notes', label: 'Notes', type: 'string' }] },
  // CONTROL nodes
  { type: 'wait', label: 'Wait', category: 'CONTROL', description: 'Wait for a fixed duration before continuing.' },
  { type: 'condition', label: 'Condition', category: 'CONTROL', description: 'Evaluate a condition and branch.' },
  { type: 'branch', label: 'Branch', category: 'CONTROL', description: 'Split the flow based on an outcome.' },
  { type: 'end', label: 'End', category: 'CONTROL', description: 'Stop the workflow run.' },
];

export const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  ACTION_REGISTRY.map((a) => [a.type, a.label]),
);

export const SUPPORTED_OPERATORS = ['equals', 'gt', 'gte', 'lt', 'lte', 'contains'];

/** Actions that require explicit user confirmation before activation. */
export function actionNeedsApproval(type: string): boolean {
  return ACTION_REGISTRY.some((a) => a.type === type && a.needsApproval);
}

export function isSupportedTrigger(type: string): boolean {
  return TRIGGER_REGISTRY.some((t) => t.type === type);
}

export function isSupportedAction(type: string): boolean {
  return ACTION_REGISTRY.some((a) => a.type === type);
}

export function isSupportedCondition(key: string): boolean {
  return CONDITION_REGISTRY.some((c) => c.key === key);
}

export function getTrigger(type: string) {
  return TRIGGER_REGISTRY.find((t) => t.type === type);
}

export function getAction(type: string) {
  return ACTION_REGISTRY.find((a) => a.type === type);
}

export function getCondition(key: string) {
  return CONDITION_REGISTRY.find((c) => c.key === key);
}

/** Which capabilities are currently wired to real data/events. */
export const WIRED_TRIGGERS = new Set<string>([
  'customer_created',
  'customer_updated',
  'customer_inactive',
  'customer_birthday',
  'customer_returned',
  'customer_tag_added',
  'customer_tag_removed',
  'appointment_booked',
  'appointment_confirmed',
  'appointment_completed',
  'appointment_canceled',
  'appointment_no_show',
  'points_earned',
  'points_threshold_reached',
  'reward_redeemed',
  'membership_created',
  'membership_expiring',
  'membership_expired',
  'payment_failed',
]);
