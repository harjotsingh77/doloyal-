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
  { type: 'GOOGLE_CALENDAR', name: 'Google Calendar', description: 'Sync appointments and staff schedules.', category: 'Calendar', icon: 'Calendar', hasApiKey: false, hasApiSecret: false, hasOAuth: true, hasWebhook: false, supportsSync: true, supportsTest: true, envKeys: ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET'], scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'] },
  { type: 'GOOGLE_BUSINESS_PROFILE', name: 'Google Business Profile', description: 'Connect your Google Business Profile locations.', category: 'Reviews', icon: 'Star', hasApiKey: false, hasApiSecret: false, hasOAuth: true, hasWebhook: false, supportsSync: true, supportsTest: true, envKeys: ['GOOGLE_BUSINESS_CLIENT_ID', 'GOOGLE_BUSINESS_CLIENT_SECRET'], scopes: ['https://www.googleapis.com/auth/business.manage'], configureInstructions: 'Connect Google Business Profile, then save the location resource name (accounts/…/locations/…) on the integration.' },
  { type: 'STRIPE', name: 'Stripe', description: 'Payment processing and subscription management.', category: 'Payments', icon: 'CreditCard', hasApiKey: true, hasApiSecret: false, hasOAuth: false, hasWebhook: true, supportsSync: true, supportsTest: true, envKeys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
  { type: 'RAZORPAY', name: 'Razorpay', description: 'Indian payment gateway for UPI, cards, net banking.', category: 'Payments', icon: 'CreditCard', hasApiKey: true, hasApiSecret: true, hasOAuth: false, hasWebhook: true, supportsSync: true, supportsTest: true, envKeys: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'] },
  { type: 'RESEND', name: 'Resend', description: 'Modern email API for developers.', category: 'Email', icon: 'Mail', hasApiKey: false, hasApiSecret: false, hasOAuth: true, hasWebhook: true, supportsSync: false, supportsTest: true, envKeys: ['RESEND_OAUTH_CLIENT_ID'], scopes: ['emails:send'], configureInstructions: 'Connect a Resend account to send automated emails. Doloyal registers a public OAuth client (PKCE) — no API key is stored. Sending is limited to the scopes you approve.' },
  { type: 'WHATSAPP', name: 'WhatsApp Business', description: 'Send real WhatsApp template & session messages via the Meta Cloud API, with delivery receipts.', category: 'Messaging', icon: 'MessageCircle', hasApiKey: true, hasApiSecret: true, hasOAuth: false, hasWebhook: true, supportsSync: false, supportsTest: true, envKeys: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID'], configureInstructions: 'Paste a permanent access token from your Meta app, plus the Phone Number ID and (optionally) the WABA ID. For delivery receipts, point your Meta webhook to this integration and store your App Secret — messages send for real once connected.' },
];

export function getIntegrationDef(type: string): IntegrationDefinition | undefined {
  return INTEGRATION_DEFINITIONS.find(d => d.type === type.toUpperCase());
}
