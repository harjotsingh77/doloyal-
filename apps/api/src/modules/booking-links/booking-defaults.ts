/** Default configs for new booking links */

export const DEFAULT_CUSTOMER_FIELDS = {
  name: { enabled: true, required: true },
  phone: { enabled: true, required: true },
  email: { enabled: true, required: false },
  birthday: { enabled: false, required: false },
  gender: { enabled: false, required: false },
  address: { enabled: false, required: false },
  notes: { enabled: true, required: false },
  referralSource: { enabled: false, required: false },
};

export const DEFAULT_RULES = {
  maxAdvanceBookingDays: 60,
  minNoticeMinutes: 60,
  maxAppointmentsPerDay: 50,
  maxBookingsPerSlot: 1,
  cancellationWindowHours: 24,
  reschedulePolicyHours: 12,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  appointmentDurationMinutes: null as number | null,
  approvalMode: 'AUTOMATIC' as const,
};

export const DEFAULT_PAYMENT = {
  mode: 'NONE' as const,
  depositPercent: 20,
  depositAmount: 0,
  partialPercent: 50,
  methods: ['CASH', 'UPI'] as string[],
  payAtStore: true,
};

export const DEFAULT_LOYALTY = {
  earnPoints: true,
  redeemPoints: false,
  membershipDiscount: true,
  birthdayBonus: false,
  referralBonus: false,
  couponSupport: false,
  promoCodes: [] as string[],
  rewardRedemption: false,
};

export const DEFAULT_MEMBERSHIP_ACCESS = {
  access: 'EVERYONE' as const,
  tierIds: [] as string[],
};

export const DEFAULT_AUTH_MODE = {
  mode: 'GUEST' as const,
  googleLogin: false,
  otpLogin: false,
  emailLogin: true,
  returningCustomerLogin: true,
};

export const DEFAULT_BRANDING = {
  themeColor: '',
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  logoUrl: '',
  coverBannerUrl: '',
  fontFamily: '',
  borderRadius: '0.625rem',
  buttonStyle: 'solid' as const,
  backgroundColor: '',
  backgroundImage: '',
  customCss: '',
  confirmationMessage: 'Your appointment has been booked successfully!',
  redirectUrl: '',
  webhookUrl: '',
  qrColor: '#111827',
  qrLogoUrl: '',
  showRating: true,
  showMap: true,
  showWhatsApp: true,
  showSocial: true,
};

export const DEFAULT_AUTOMATIONS = {
  confirmationEmail: true,
  confirmationWhatsApp: true,
  confirmationSms: false,
  reminderSms: true,
  followUpMessage: false,
  reviewRequest: false,
  addLoyaltyPoints: true,
  generateInvoice: true,
  createCustomer: true,
  updateCrm: true,
  notifyStaff: true,
  notifyOwner: true,
};

export const DEFAULT_PAGE_SECTIONS = [
  { id: 'hero', enabled: true },
  { id: 'about', enabled: true },
  { id: 'services', enabled: true },
  { id: 'staff', enabled: true },
  { id: 'gallery', enabled: false },
  { id: 'testimonials', enabled: true },
  { id: 'membership', enabled: false },
  { id: 'loyalty', enabled: false },
  { id: 'booking', enabled: true },
  { id: 'faq', enabled: true },
  { id: 'contact', enabled: true },
  { id: 'map', enabled: true },
  { id: 'footer', enabled: true },
] as const;

export const DEFAULT_PAGE_CONFIG = {
  sections: DEFAULT_PAGE_SECTIONS.map((s) => ({ ...s })),
  tagline: 'Book your next appointment online',
  about:
    'We provide premium services with experienced professionals. Book online in minutes.',
  heroCta: 'Book Now',
  policies:
    'Cancellations must be made at least 24 hours in advance. Late arrivals may shorten your appointment.',
  faqs: [
    {
      question: 'How do I book?',
      answer: 'Select a service, choose staff and a time slot, then confirm your details.',
    },
    {
      question: 'Can I reschedule?',
      answer: 'Yes — contact us or use your confirmation link before the cutoff window.',
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'Cash, UPI, and card payments are supported depending on the business settings.',
    },
  ],
  gallery: [] as { url: string; caption?: string }[],
  testimonials: [
    {
      name: 'Priya S.',
      rating: 5,
      text: 'Smooth booking experience and wonderful service!',
    },
    {
      name: 'Amit K.',
      rating: 5,
      text: 'Staff was professional and the process was quick.',
    },
  ],
  membershipBlurb: 'Members enjoy priority booking and exclusive discounts.',
  loyaltyBlurb: 'Earn points on every visit and redeem rewards.',
};

export const DEFAULT_SEO = {
  keywords: '',
  ogImage: '',
  favicon: '',
  schemaType: 'LocalBusiness',
};

export function defaultDomain(slug: string) {
  return {
    subdomain: `${slug}.doloyal.ai`,
    customDomain: '',
    status: 'PENDING' as const,
  };
}

export function webBaseUrl(): string {
  return process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function bookingUrl(slug: string): string {
  return `${webBaseUrl()}/book/${slug}`;
}

export function subdomainUrl(slug: string): string {
  return `https://${slug}.doloyal.ai`;
}

export function qrCodeUrl(url: string, color = '111827'): string {
  const fg = color.replace('#', '');
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=${fg}&data=${encodeURIComponent(url)}`;
}

export function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
  return [];
}

export function mergeDefaults<T extends Record<string, unknown>>(
  value: unknown,
  defaults: T,
): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaults };
  }
  return { ...defaults, ...(value as T) };
}
