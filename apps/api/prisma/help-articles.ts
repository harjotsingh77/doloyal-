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
];
