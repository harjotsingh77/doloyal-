export interface IntegrationDefinition {
  type: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  docsUrl?: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  hasOAuth: boolean;
  hasWebhook: boolean;
  supportsSync: boolean;
  supportsTest: boolean;
  envKeys: string[];
  scopes?: string[];
  oauthUrl?: string;
  tokenUrl?: string;
  configureInstructions?: string;
}

export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  { type: 'GOOGLE_CALENDAR', name: 'Google Calendar', description: 'Sync appointments and staff schedules.', category: 'Calendar', icon: 'Calendar', hasApiKey: false, hasApiSecret: false, hasOAuth: true, hasWebhook: false, supportsSync: true, supportsTest: true, envKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'] },
  { type: 'STRIPE', name: 'Stripe', description: 'Payment processing and subscription management.', category: 'Payments', icon: 'CreditCard', hasApiKey: true, hasApiSecret: false, hasOAuth: false, hasWebhook: true, supportsSync: true, supportsTest: true, envKeys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
  { type: 'RAZORPAY', name: 'Razorpay', description: 'Indian payment gateway for UPI, cards, net banking.', category: 'Payments', icon: 'CreditCard', hasApiKey: true, hasApiSecret: true, hasOAuth: false, hasWebhook: true, supportsSync: true, supportsTest: true, envKeys: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'] },
  { type: 'RESEND', name: 'Resend', description: 'Modern email API for developers.', category: 'Email', icon: 'Mail', hasApiKey: true, hasApiSecret: false, hasOAuth: false, hasWebhook: true, supportsSync: false, supportsTest: true, envKeys: ['RESEND_API_KEY'] },
];

export function getIntegrationDef(type: string): IntegrationDefinition | undefined {
  return INTEGRATION_DEFINITIONS.find(d => d.type === type.toUpperCase());
}
