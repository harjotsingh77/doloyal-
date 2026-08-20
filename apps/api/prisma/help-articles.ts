/**
 * Help center articles seeded into SupportArticle. Idempotent — the seed
 * upserts by slug so re-running `pnpm db:seed` never duplicates content.
 * Categories mirror HELP_CATEGORIES from @doloyal/shared.
 */
export interface HelpArticleSeed {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  keywords: string[];
  faq: boolean;
  sortOrder: number;
}

export const HELP_ARTICLES: HelpArticleSeed[] = [
  {
    slug: 'what-is-doloyal',
    title: 'What is Doloyal?',
    description:
      'An AI-powered customer retention platform for appointment-based local businesses.',
    content:
      'Doloyal is an AI-powered customer retention platform built for salons, spas, barber shops, gyms, clinics, and other appointment-based local businesses.\n\nIt unifies customer management, loyalty points, rewards, memberships, online booking, and marketing campaigns in one dashboard. The AI retention engine analyzes visit frequency, spend, and redemption history to predict churn and recommend win-back campaigns.\n\nEverything is designed to turn first-time visitors into lifelong regulars.',
    category: 'Getting Started',
    keywords: ['what is doloyal', 'platform', 'overview', 'introduction', 'about'],
    faq: true,
    sortOrder: 1,
  },
  {
    slug: 'getting-started-with-your-dashboard',
    title: 'Getting started with your dashboard',
    description:
      'Tour the main areas of your Doloyal dashboard after you sign up.',
    content:
      'After signing up you land on the Dashboard, which shows today’s KPIs: revenue, customer count, appointment activity, and recent customer activity.\n\nUse the sidebar to navigate:\n- Customers — manage your customer list and profiles.\n- Loyalty — set earning rules, reward tiers, and run your loyalty program.\n- Rewards — create rewards customers can redeem with points.\n- Appointments & Booking Links — manage your schedule and shareable booking pages.\n- Campaigns — send automated and manual marketing messages.\n- Analytics — review trends across revenue and customers.\n\nVisit Settings to update your business details, currency, and timezone.',
    category: 'Getting Started',
    keywords: ['getting started', 'dashboard', 'navigation', 'tour', 'first steps'],
    faq: false,
    sortOrder: 2,
  },
  {
    slug: 'add-staff-members',
    title: 'How do I add staff members to my account?',
    description:
      'Invite team members and assign roles and permissions.',
    content:
      'Go to Staff in the sidebar. From there you can invite team members by email, assign a role (Owner, Manager, Receptionist, Staff), and set permissions for each member.\n\nInvited members receive an invitation they can accept to join your workspace. You can also set their working hours and assign them to branches.',
    category: 'Getting Started',
    keywords: ['staff', 'team', 'invite', 'members', 'roles', 'permissions'],
    faq: false,
    sortOrder: 3,
  },
  {
    slug: 'set-up-loyalty-program',
    title: 'How do I set up my loyalty program?',
    description:
      'Define earning rules, tiers, and activate your loyalty program in minutes.',
    content:
      'Open the Loyalty section in your sidebar.\n\n1. Choose a mode — points per spend, points per visit, tiered, hybrid, or subscription.\n2. Set earning rules, e.g. how many points customers earn per dollar or per visit.\n3. Configure rewards and membership tiers customers can unlock.\n4. Activate the program.\n\nCustomers automatically start earning points on their next visit. You can always review the points ledger from the Loyalty section.',
    category: 'Core Features',
    keywords: ['loyalty', 'program', 'points', 'earning rules', 'setup', 'tiers'],
    faq: true,
    sortOrder: 10,
  },
  {
    slug: 'create-booking-link',
    title: 'How do I create a booking link?',
    description:
      'Create a shareable link so customers can book appointments online.',
    content:
      'Go to Appointments → Booking Links and click Create Booking Link.\n\nChoose whether it’s a company-wide link or a personal link for one staff member, then pick which services and staff are bookable. You can set booking rules such as advance notice, buffers, and payment options.\n\nOnce published, share the link anywhere — Instagram, WhatsApp, your website, or a QR code. Customers click it, pick a service and time, and the appointment lands in your calendar automatically.',
    category: 'Core Features',
    keywords: ['booking', 'booking link', 'appointments', 'share', 'schedule'],
    faq: true,
    sortOrder: 11,
  },
  {
    slug: 'how-customers-book-appointments',
    title: 'How customers book appointments',
    description:
      'What the customer sees and how bookings reach your calendar.',
    content:
      'When a customer opens your booking link they select a service, choose a staff member (if multiple are available), pick an available time slot, and enter their contact details.\n\nDepending on your settings they can book as a guest, log in, or sign in with Google. Once confirmed, the appointment appears on your dashboard and the customer receives a confirmation.',
    category: 'Core Features',
    keywords: ['booking', 'customer experience', 'appointments', 'online booking'],
    faq: false,
    sortOrder: 12,
  },
  {
    slug: 'manage-availability',
    title: 'How to manage availability',
    description:
      'Set business hours, buffer times, and block dates.',
    content:
      'Open Appointments → Availability to set your weekly business hours and slot intervals.\n\nUse Blocked Dates to close specific days (holidays, vacations) and buffers to add time between appointments. Availability automatically updates across all your booking links.',
    category: 'Core Features',
    keywords: ['availability', 'hours', 'blocked dates', 'buffers', 'holidays'],
    faq: false,
    sortOrder: 13,
  },
  {
    slug: 'cancel-an-appointment',
    title: 'How to cancel an appointment',
    description:
      'Cancel bookings and let customers self-serve cancellations.',
    content:
      'Open the Appointments list, find the booking, and use the action menu to cancel it. The customer receives a cancellation notice.\n\nIf your booking link allows it, customers can also cancel or reschedule from their confirmation email, so your calendar stays up to date automatically.',
    category: 'Core Features',
    keywords: ['cancel', 'appointment', 'reschedule', 'no-show'],
    faq: false,
    sortOrder: 14,
  },
  {
    slug: 'send-campaigns-and-automations',
    title: 'How do I send automated messages and campaigns?',
    description:
      'Set up birthday, win-back, and appointment-reminder campaigns.',
    content:
      'Use the Campaigns section to build marketing campaigns. Doloyal supports automated birthday messages, win-back campaigns for inactive customers, and appointment reminders.\n\nMessages are delivered over WhatsApp, SMS, and email. You can create one-off campaigns or let automations run on a schedule.',
    category: 'Core Features',
    keywords: ['campaigns', 'automation', 'messages', 'whatsapp', 'email', 'sms'],
    faq: false,
    sortOrder: 15,
  },
  {
    slug: 'ai-retention-engine',
    title: 'How does the AI retention engine work?',
    description:
      'How Doloyal predicts churn and recommends win-back campaigns.',
    content:
      'The AI engine analyzes customer behavior — visit frequency, average spend, redemption history — to predict which customers are at risk of churning.\n\nIt then recommends targeted campaigns to re-engage them, such as win-back offers for inactive customers. Open the Doloyal AI assistant to ask questions like “Who are my VIP customers?” and get answers backed by your live data.',
    category: 'Core Features',
    keywords: ['ai', 'retention', 'churn', 'prediction', 'assistant'],
    faq: false,
    sortOrder: 16,
  },
  {
    slug: 'change-plan',
    title: 'How do I change my plan?',
    description:
      'Upgrade or change your Doloyal subscription from the Billing page.',
    content:
      'Open Billing in your sidebar and review the available plans.\n\nSelect a new plan to upgrade or change your subscription. Payment details are processed securely, and billing history is available under Billing.\n\nYou’ll receive a notification if you approach your plan’s limits, and you can upgrade at any time.',
    category: 'Account & Billing',
    keywords: ['plan', 'billing', 'upgrade', 'subscription', 'pricing'],
    faq: true,
    sortOrder: 20,
  },
  {
    slug: 'payment-methods',
    title: 'What payment methods do you accept?',
    description:
      'Cards, UPI, net banking, and invoicing for enterprise plans.',
    content:
      'We accept all major credit and debit cards (Visa, Mastercard, Amex, RuPay), UPI, and net banking. Enterprise plans can also pay via invoice.\n\nAll payments are processed securely. You can update your payment method and see invoices from the Billing section.',
    category: 'Account & Billing',
    keywords: ['payment', 'card', 'upi', 'invoice', 'billing'],
    faq: false,
    sortOrder: 21,
  },
  {
    slug: 'troubleshoot-login',
    title: 'Troubleshooting: I can’t sign in',
    description:
      'Common fixes for login problems, including resetting your password.',
    content:
      'If you can’t sign in:\n\n1. Confirm you’re using the email you signed up with.\n2. Try Google sign-in if your account is linked.\n3. Use “Forgot password” to reset your password.\n4. If you were invited to a business, check your invitation email.\n\nStill stuck? Create a support ticket and select “Account & Login” — our team can help you recover access.',
    category: 'Troubleshooting',
    keywords: ['login', 'password', 'sign in', 'access', 'locked out'],
    faq: false,
    sortOrder: 30,
  },
  {
    slug: 'troubleshoot-booking-link-not-working',
    title: 'Troubleshooting: my booking link isn’t working',
    description:
      'Check availability, services, and publication status.',
    content:
      'If a booking link appears broken:\n\n1. Confirm the link is Published (not a Draft) in Booking Links.\n2. Check that at least one service and staff member are assigned.\n3. Verify your availability windows are open — with no open slots the page shows “no availability”.\n4. Test in an incognito window in case of cached data.\n\nIf customers still can’t book, create a ticket under “Appointments & Booking”.',
    category: 'Troubleshooting',
    keywords: ['booking link', 'broken', 'not working', 'error', 'availability'],
    faq: false,
    sortOrder: 31,
  },
  {
    slug: 'troubleshoot-emails-not-delivered',
    title: 'Troubleshooting: emails aren’t being delivered',
    description:
      'Why customers might not receive emails and what to check.',
    content:
      'If customers aren’t receiving emails:\n\n1. Check the customer’s email is correct in their profile.\n2. Look at the campaign or notification status — failed sends appear with an error.\n3. Ask the customer to check spam and add your sender address to contacts.\n4. Confirm your own business email is verified in Settings.\n\nFor WhatsApp messages, ensure the WhatsApp integration is connected and the number is valid.',
    category: 'Troubleshooting',
    keywords: ['email', 'delivery', 'spam', 'failed', 'whatsapp', 'notifications'],
    faq: false,
    sortOrder: 32,
  },
  {
    slug: 'connect-my-website',
    title: 'How can I connect my website?',
    description:
      'Use the Website Builder to create a site or connect an existing domain.',
    content:
      'Doloyal includes a Website Builder so you can launch a professional site for your business.\n\nOpen Website Builder in your sidebar to choose a template, add your services, and enable online booking. You can also connect your own custom domain under Website Connections.\n\nIf you’d like our team to build a custom website for you, submit a website request from the Website Builder section.',
    category: 'Website & Integrations',
    keywords: ['website', 'domain', 'builder', 'connect', 'custom site'],
    faq: true,
    sortOrder: 40,
  },
  {
    slug: 'connect-integrations',
    title: 'How do I connect integrations like Google Calendar and WhatsApp?',
    description:
      'Connect third-party tools from the Integrations page.',
    content:
      'Open Integrations in your sidebar to see available integrations, including Google Calendar, WhatsApp Business, Google Analytics, and payment providers.\n\nConnect each integration with a secure OAuth flow or API key. Once connected, data flows both ways — for example, Google Calendar events stay in sync with your appointments.',
    category: 'Website & Integrations',
    keywords: ['integrations', 'google calendar', 'whatsapp', 'google analytics', 'connect'],
    faq: false,
    sortOrder: 41,
  },
  {
    slug: 'connect-custom-domain',
    title: 'How to connect a custom domain',
    description:
      'Point your own domain to your Doloyal website.',
    content:
      'Under Website Connections you can add a custom domain for your booking page or website.\n\nFollow the DNS setup steps to add the CNAME/A record provided by Doloyal. Once the DNS propagates (usually within an hour), your domain connects automatically and the status updates in the dashboard.',
    category: 'Website & Integrations',
    keywords: ['domain', 'dns', 'custom domain', 'connect', 'website'],
    faq: false,
    sortOrder: 42,
  },
  {
    slug: 'connect-google-calendar',
    title: 'How do I connect Google Calendar?',
    description: 'Sync your bookings to Google Calendar with OAuth.',
    content:
      'Go to Integrations → Google Calendar → Connect. Sign in with Google and allow calendar access.\n\nAfter the connection is successful, your booking events can sync to the selected calendar. If the connection ever shows a “reconnect required” status, open Integrations → Google Calendar and sign in again to restore syncing.',
    category: 'Website & Integrations',
    keywords: ['google calendar', 'calendar', 'sync', 'connect', 'oauth', 'appointments'],
    faq: true,
    sortOrder: 43,
  },
  {
    slug: 'connect-stripe',
    title: 'How do I connect Stripe?',
    description: 'Accept card payments for bookings and subscriptions.',
    content:
      'Go to Integrations → Stripe → Connect. Enter your Stripe API keys (or complete the secure OAuth flow depending on the connection type).\n\nOnce connected, payments for booking links and subscriptions can be processed through Stripe. You can review the connection status and test it from the Integrations page at any time.',
    category: 'Website & Integrations',
    keywords: ['stripe', 'payments', 'card', 'connect', 'integration'],
    faq: false,
    sortOrder: 44,
  },
  {
    slug: 'connect-razorpay',
    title: 'How do I connect Razorpay?',
    description: 'Accept UPI, cards, and net banking payments.',
    content:
      'Go to Integrations → Razorpay → Connect and enter your Razorpay key ID and key secret.\n\nRazorpay supports UPI, cards, and net banking. Once connected, bookings that require payment collect money through your Razorpay account. If payments aren’t appearing after a booking, confirm the integration shows Connected and that your Razorpay account is active.',
    category: 'Website & Integrations',
    keywords: ['razorpay', 'payments', 'upi', 'india', 'connect', 'integration'],
    faq: true,
    sortOrder: 45,
  },
  {
    slug: 'connect-whatsapp',
    title: 'How do I connect WhatsApp Business?',
    description: 'Send WhatsApp messages to your customers.',
    content:
      'Go to Integrations → WhatsApp Business → Connect and enter your WhatsApp Business Cloud API access token.\n\nWhatsApp messages are simulated in test mode and are never sent without an explicit approval. After connecting, you can send WhatsApp campaigns and appointment reminders to customers.',
    category: 'Website & Integrations',
    keywords: ['whatsapp', 'whatsapp business', 'messaging', 'sms', 'connect'],
    faq: false,
    sortOrder: 46,
  },
  {
    slug: 'connect-resend',
    title: 'How do I connect Resend for email?',
    description: 'Send transactional and campaign emails through your own Resend account.',
    content:
      'Go to Integrations → Resend → Connect. Doloyal uses OAuth so your business sends email through its own connected Resend account — no API key is shared.\n\nAfter authorizing, verify a sending domain in your Resend dashboard and add it in the Resend manage dialog. Once verified, booking confirmations, reminders, workflows, and email campaigns send from your own address. If the connection shows a reconnect prompt, reauthorize to restore sending.',
    category: 'Website & Integrations',
    keywords: ['resend', 'email', 'oauth', 'sending domain', 'connect', 'transactional'],
    faq: false,
    sortOrder: 47,
  },
  {
    slug: 'connect-google-analytics',
    title: 'How do I connect Google Analytics?',
    description: 'Track website and booking-link traffic.',
    content:
      'Open Integrations and find Google Analytics. Connect it with your Google account, then choose the property you want to track.\n\nOnce connected, Doloyal can pull traffic insights alongside your booking and customer analytics.',
    category: 'Website & Integrations',
    keywords: ['google analytics', 'analytics', 'traffic', 'tracking', 'connect'],
    faq: false,
    sortOrder: 48,
  },
  {
    slug: 'fix-integration-disconnected',
    title: 'Why is my integration disconnected or needing reauthorization?',
    description: 'Common reasons integrations show a reconnect status.',
    content:
      'An integration can show Disconnected, Error, Expired, or Reauthorization Required for a few reasons:\n\n1. The provider’s OAuth token expired or was revoked.\n2. You disconnected it from the provider’s side.\n3. The provider requires re-consent after policy changes.\n\nTo fix it, open Integrations, find the affected service (Google Calendar, WhatsApp, Resend, etc.), and click Connect / Reconnect. Sign in again and re-approve the requested permissions. The status should update to Connected after the reauthorization completes.',
    category: 'Troubleshooting',
    keywords: ['disconnected', 'reauthorization', 'reconnect', 'expired', 'integration', 'status'],
    faq: true,
    sortOrder: 49,
  },
  {
    slug: 'understand-dashboard',
    title: 'How do I read my dashboard?',
    description: 'Understand today’s KPIs, trends, and activity.',
    content:
      'Your dashboard shows today’s revenue, new customers, active rewards, appointments, and recent customer activity.\n\nUse the Analytics page for longer trend lines — revenue by day, customer growth, and booking patterns over 7/30/90 days. Every KPI is computed from your real data.',
    category: 'Core Features',
    keywords: ['dashboard', 'kpi', 'revenue', 'trends', 'analytics', 'overview'],
    faq: false,
    sortOrder: 17,
  },
  {
    slug: 'manage-customers',
    title: 'How do I manage customers?',
    description: 'Search, edit, and understand your customer profiles.',
    content:
      'Open Customers in the sidebar to search by name, phone, or email and filter by tags or churn risk.\n\nOpen any profile to see lifetime value, visit history, points balance and ledger, memberships, and an AI churn-risk score. You can edit contact details, add notes, or adjust points from the profile.',
    category: 'Core Features',
    keywords: ['customers', 'profiles', 'search', 'churn', 'points', 'lifetime value'],
    faq: false,
    sortOrder: 18,
  },
  {
    slug: 'create-rewards',
    title: 'How do I create a reward?',
    description: 'Set up points-based rewards customers can redeem.',
    content:
      'Go to Rewards → Create Reward.\n\n1. Give the reward a name and description.\n2. Set the points cost and reward value.\n3. Choose a category and reward type (e.g. coupon, free service, gift card).\n4. Set quantity, validity, and any eligibility (tier or membership required).\n5. Publish it.\n\nCustomers redeem rewards with points from your loyalty program.',
    category: 'Core Features',
    keywords: ['rewards', 'redeem', 'points', 'create', 'coupon'],
    faq: true,
    sortOrder: 19,
  },
  {
    slug: 'manage-memberships',
    title: 'How do memberships work?',
    description: 'Create paid tiers with benefits and discounts.',
    content:
      'Memberships let you sell recurring access with benefits such as priority booking, discounts, and bonus points.\n\nOpen Memberships → Create Tier, set a price, validity, discount percent, and benefits. Assign customers to a tier from their profile. Customers renew per the validity period you configure.',
    category: 'Core Features',
    keywords: ['membership', 'tier', 'subscription', 'benefits', 'discount'],
    faq: false,
    sortOrder: 20,
  },
  {
    slug: 'set-up-referrals',
    title: 'How do I set up a referral program?',
    description: 'Reward customers for bringing in new customers.',
    content:
      'Open Referrals to create a referral campaign.\n\n1. Choose a reward type (points, cashback, discount, free service).\n2. Set the reward for the referrer and the new customer.\n3. Configure limits and expiry.\n4. Publish the campaign.\n\nCustomers share their referral link, and rewards are issued automatically when a new customer books.',
    category: 'Core Features',
    keywords: ['referrals', 'referral', 'campaign', 'refer', 'rewards', 'invite'],
    faq: false,
    sortOrder: 21,
  },
  {
    slug: 'create-campaign',
    title: 'How do I create a campaign?',
    description: 'Send emails and WhatsApp messages to customer segments.',
    content:
      'Go to Campaigns → Create Campaign.\n\n1. Name your campaign and write the subject and message.\n2. Choose the channel (email or WhatsApp).\n3. Pick an audience (All, VIP, At Risk, Inactive).\n4. Schedule it or send immediately.\n\nAfter sending you can track sent, failed, open, and redeem rates from the campaign list.',
    category: 'Core Features',
    keywords: ['campaign', 'email', 'whatsapp', 'send', 'audience', 'marketing'],
    faq: true,
    sortOrder: 22,
  },
  {
    slug: 'use-doloyal-ai',
    title: 'How do I use the Doloyal AI assistant?',
    description: 'Ask business questions and get answers from your live data.',
    content:
      'Open Doloyal AI from the sidebar (under AI Assistant).\n\nAsk questions like “Who are my VIP customers?”, “Why are sales down this week?”, or “Suggest a win-back campaign for inactive customers.” The assistant answers with your live data and can help you analyze customers, revenue, appointments, and campaigns.',
    category: 'Core Features',
    keywords: ['ai', 'assistant', 'doloyal ai', 'chat', 'business', 'analysis'],
    faq: false,
    sortOrder: 23,
  },
  {
    slug: 'create-workflow',
    title: 'How do I create a workflow or automation?',
    description: 'Automate follow-ups, reminders, and loyalty actions.',
    content:
      'Open Workflows in the sidebar.\n\n1. Click Create Workflow.\n2. Describe what you want to automate — for example “Send a follow-up email 24 hours after a booking.”\n3. Review the generated steps (trigger → condition → action).\n4. Activate the workflow.\n\nYou can pause, resume, or edit workflows anytime from the Workflows page.',
    category: 'Core Features',
    keywords: ['workflow', 'automation', 'trigger', 'action', 'reminders'],
    faq: false,
    sortOrder: 24,
  },
  {
    slug: 'request-website',
    title: 'How do I request or build a website?',
    description: 'Build a site with the Website Builder or request a custom one.',
    content:
      'Open Website Builder in the sidebar.\n\nTo build your own site, start a new project, pick a template, add your services and booking link, then publish it to a Doloyal subdomain or your own domain.\n\nTo have the Doloyal team build it for you, submit a website request from the Website Builder section with your business details and goals. Our team reviews it and starts building.',
    category: 'Core Features',
    keywords: ['website', 'builder', 'request', 'custom site', 'template', 'domain'],
    faq: true,
    sortOrder: 25,
  },
  {
    slug: 'use-website-connections',
    title: 'What are Website Connections?',
    description: 'Connect your existing website to Doloyal data.',
    content:
      'Website Connections let you embed Doloyal booking, loyalty, and customer widgets into an existing website you already own.\n\nOpen Website Connections to find your business ID, generate API keys, see widgets, and read the developer documentation and SDK. Connection logs show sync activity and errors.',
    category: 'Website & Integrations',
    keywords: ['website connections', 'sdk', 'api key', 'widget', 'embed', 'developer'],
    faq: false,
    sortOrder: 26,
  },
  {
    slug: 'billing-invoices',
    title: 'Where can I see invoices and billing history?',
    description: 'Find invoices, payment history, and plan details.',
    content:
      'Open Billing in the sidebar.\n\nIt shows your current plan, subscription status, next payment date, and payment method. The Invoices section lists every invoice with amounts and status. Billing history records plan changes and payments so you can always see what happened and when.',
    category: 'Account & Billing',
    keywords: ['billing', 'invoices', 'history', 'plan', 'payment', 'subscription'],
    faq: true,
    sortOrder: 27,
  },
  {
    slug: 'why-was-i-charged',
    title: 'Why was I charged?',
    description: 'Understand charges on your Doloyal subscription.',
    content:
      'Doloyal charges for your plan subscription (plus any applicable taxes) on a recurring basis depending on your billing cycle.\n\nTo see exactly what you were charged for, open Billing → Invoices. Every charge has a matching invoice. If you see a charge you don’t recognize, contact support with the invoice number and our team will review it.',
    category: 'Account & Billing',
    keywords: ['charged', 'billing', 'invoice', 'charge', 'subscription', 'payment'],
    faq: true,
    sortOrder: 28,
  },
  {
    slug: 'invite-team-member',
    title: 'How do I invite a team member?',
    description: 'Add staff and assign roles and permissions.',
    content:
      'Go to Staff → Invite Member.\n\nEnter the team member’s email, choose a role (Owner, Manager, Receptionist, Staff), and set permissions. The invitee receives an invitation email to accept and join your workspace.\n\nYou can also manage existing staff, set working hours, and assign them to branches from the Staff page.',
    category: 'Getting Started',
    keywords: ['staff', 'invite', 'team member', 'role', 'permission', 'team'],
    faq: true,
    sortOrder: 4,
  },
  {
    slug: 'manage-branches',
    title: 'How do I manage multiple branches?',
    description: 'Run separate locations under one account.',
    content:
      'Open Branches to create and manage locations.\n\nEach branch has its own dashboard, customers, appointments, and staff. Use the branch switcher to move between the global workspace and individual branches. Roles and staff can be assigned per branch.',
    category: 'Getting Started',
    keywords: ['branches', 'locations', 'multi location', 'switch branch', 'manage'],
    faq: false,
    sortOrder: 5,
  },
  {
    slug: 'update-settings',
    title: 'How do I update my business settings?',
    description: 'Change business details, currency, and preferences.',
    content:
      'Open Settings in the sidebar.\n\nYou can update your business name and details, currency, timezone, brand color, and notification preferences. Changes apply across your dashboard and booking experience.',
    category: 'Getting Started',
    keywords: ['settings', 'business details', 'currency', 'timezone', 'preferences'],
    faq: false,
    sortOrder: 6,
  },
  {
    slug: 'account-and-login-help',
    title: 'Account & login help',
    description: 'Password reset, profile, and account security.',
    content:
      'To reset your password use the “Forgot password” link on the sign-in page.\n\nYou can sign in with email/password or Google (if connected). For account security questions, two-factor settings, or recovering access to a business you were invited to, open the Help section and create a ticket under “Account & Login”.',
    category: 'Account & Billing',
    keywords: ['account', 'login', 'password', 'reset', 'security', 'profile'],
    faq: false,
    sortOrder: 29,
  },
  {
    slug: 'plan-limits-and-features',
    title: 'What’s included in each plan?',
    description: 'Understand plan features and limits.',
    content:
      'Your plan determines which features are available and their limits (for example, the number of customers, campaigns, or automated workflows).\n\nOpen Billing to see your current plan, usage, and available plans. If you reach a limit you’ll see a notification with options to upgrade. Upgrade anytime from Billing.',
    category: 'Account & Billing',
    keywords: ['plan', 'limits', 'features', 'upgrade', 'pricing', 'usage'],
    faq: false,
    sortOrder: 30,
  },
  {
    slug: 'analytics-overview',
    title: 'How do I use Analytics?',
    description: 'Revenue, customer, and booking trends.',
    content:
      'Open Analytics in the sidebar to see trends across revenue, customers, appointments, and campaign performance.\n\nUse the range selector to view 7, 30, or 90 days. Charts are interactive — hover for exact values. Use the data to decide promotions, staffing, and win-back campaigns.',
    category: 'Core Features',
    keywords: ['analytics', 'trends', 'revenue', 'reports', 'charts'],
    faq: false,
    sortOrder: 31,
  },
  {
    slug: 'troubleshoot-campaign-not-sending',
    title: 'Troubleshooting: my campaign didn’t send',
    description: 'Why a campaign may not have gone out.',
    content:
      'If a campaign didn’t send:\n\n1. Check the campaign status — a DRAFT campaign never sends. Publish/schedule it.\n2. Verify the channel is connected (Resend for email, WhatsApp for WhatsApp messages).\n3. Confirm there are recipients in the selected audience.\n4. Check the failed count and error details on the campaign.\n\nIf sends fail, create a ticket under “Campaigns” with the campaign name.',
    category: 'Troubleshooting',
    keywords: ['campaign', 'not sending', 'failed', 'email', 'whatsapp', 'error'],
    faq: false,
    sortOrder: 32,
  },
  {
    slug: 'troubleshoot-workflow-not-running',
    title: 'Troubleshooting: my workflow didn’t run',
    description: 'Why an automation may not have triggered.',
    content:
      'If a workflow didn’t run:\n\n1. Confirm the workflow is Active (not Paused).\n2. Check the trigger — did an event actually happen (booking, invoice, etc.)?\n3. Verify any conditions you set were met.\n4. Review the workflow run history for errors.\n\nStill stuck? Create a ticket under “Technical Issue” with the workflow name.',
    category: 'Troubleshooting',
    keywords: ['workflow', 'automation', 'not running', 'trigger', 'error'],
    faq: false,
    sortOrder: 33,
  },
  {
    slug: 'troubleshoot-razorpay-payments',
    title: 'Troubleshooting: Razorpay payment not appearing',
    description: 'Steps when a paid booking isn’t showing the payment.',
    content:
      'If a Razorpay payment isn’t appearing:\n\n1. Confirm Razorpay shows Connected in Integrations.\n2. Check the Razorpay dashboard for the payment status.\n3. Look at the booking’s payment status in Appointments.\n4. Wait a few minutes for webhook processing.\n\nIf the payment is captured but still missing, create a ticket under “Payments” with the booking and payment details so our team can check the webhook logs.',
    category: 'Troubleshooting',
    keywords: ['razorpay', 'payment', 'not appearing', 'webhook', 'booking'],
    faq: true,
    sortOrder: 34,
  },
  {
    slug: 'loyalty-points-not-earning',
    title: 'Troubleshooting: customers aren’t earning points',
    description: 'Why loyalty points may not be adding up.',
    content:
      'If customers aren’t earning points:\n\n1. Confirm your loyalty program is activated in Loyalty.\n2. Check the earning rule (points per spend or per visit).\n3. Verify invoices are marked Paid — points usually earn on paid invoices.\n4. Review the customer’s points ledger to see if entries were created.\n\nIf the ledger is empty, create a ticket under “Loyalty & Rewards”.',
    category: 'Troubleshooting',
    keywords: ['points', 'loyalty', 'not earning', 'ledger', 'rewards'],
    faq: false,
    sortOrder: 35,
  },
  {
    slug: 'how-to-contact-support',
    title: 'How do I contact Doloyal support?',
    description: 'Reach the support team from inside the dashboard.',
    content:
      'You can reach support in two ways:\n\n1. Click the “Ask Doloyal” button in the bottom-right corner — ask the AI assistant, and if it can’t resolve your issue, create a support ticket right from the chat.\n2. Open Help & Support from the sidebar to browse articles, start a conversation, or create a ticket directly.\n\nTickets are tracked in Help & Support → My Support Requests, and our team replies in the same conversation.',
    category: 'Getting Started',
    keywords: ['support', 'contact', 'help', 'ticket', 'ask doloyal'],
    faq: true,
    sortOrder: 7,
  },
];
