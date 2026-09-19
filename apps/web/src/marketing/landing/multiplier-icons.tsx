import * as React from "react";

function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-white shadow-[0_10px_28px_rgba(99,102,241,0.14),0_2px_8px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]"
      style={{ borderRadius: "24%" }}
    >
      {children}
    </div>
  );
}

/* 1 · Booking */
function BookingIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 40 40" className="h-[65%] w-[65%]" fill="none" aria-hidden="true">
        <rect x="7" y="10" width="26" height="23" rx="4.5" stroke="#7C3AED" strokeWidth="2.8" />
        <path d="M7 17h26" stroke="#7C3AED" strokeWidth="2.8" />
        <path d="M13 6v6M27 6v6" stroke="#7C3AED" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="14" cy="22.5" r="1.7" fill="#7C3AED" />
        <circle cx="20" cy="22.5" r="1.7" fill="#7C3AED" />
        <circle cx="26" cy="22.5" r="1.7" fill="#7C3AED" />
        <circle cx="14" cy="27.5" r="1.7" fill="#7C3AED" />
        <circle cx="20" cy="27.5" r="1.7" fill="#7C3AED" />
        <circle cx="26" cy="27.5" r="1.7" fill="#7C3AED" />
      </svg>
    </IconTile>
  );
}

/* 2 · CRM */
function CrmIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 40 40" className="h-[66%] w-[66%]" fill="none" aria-hidden="true">
        <circle cx="16" cy="14" r="5" fill="#3B82F6" />
        <circle cx="26" cy="16" r="4" fill="#60A5FA" />
        <path d="M8 30c1.2-5.5 4.5-8 8-8s6.8 2.5 8 8" fill="#3B82F6" />
        <path d="M22 30c.8-4.5 3.5-6.5 6-6.5s5.2 2 6 6.5" fill="#60A5FA" />
      </svg>
    </IconTile>
  );
}

/* 3 · Loyalty */
function LoyaltyIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 40 40" className="h-[66%] w-[66%]" fill="none" aria-hidden="true">
        <path
          d="M8 26L6 13l7 5 7-9 7 9 7-5-2 13H8z"
          fill="#F59E0B"
        />
        <rect x="7" y="27" width="26" height="3.5" rx="1.5" fill="#D97706" />
        <circle cx="6" cy="12" r="1.8" fill="#FBBF24" />
        <circle cx="20" cy="8" r="2" fill="#FBBF24" />
        <circle cx="34" cy="12" r="1.8" fill="#FBBF24" />
      </svg>
    </IconTile>
  );
}

/* 4 · Offers */
function OffersIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 40 40" className="h-[66%] w-[66%]" fill="none" aria-hidden="true">
        <path
          d="M21 8l12 12a3 3 0 0 1 0 4.2l-9 9a3 3 0 0 1-4.2 0L8 21a3 3 0 0 1-.9-2.1L7 10a3 3 0 0 1 3-3l8.9.1A3 3 0 0 1 21 8z"
          fill="#EF4444"
        />
        <circle cx="14" cy="14" r="2.5" fill="#FFFFFF" />
      </svg>
    </IconTile>
  );
}

/* 5 · Campaigns */
function CampaignsIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 40 40" className="h-[66%] w-[66%]" fill="none" aria-hidden="true">
        <path
          d="M10 16h7l12-6v20l-12-6h-7a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z"
          fill="#3B82F6"
        />
        <path d="M16 26v5a1.8 1.8 0 0 0 2.8 1.4L23 29" fill="#60A5FA" />
        <path
          d="M31 16c1.5 1.2 2.5 2.6 2.5 4s-1 2.8-2.5 4"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M34 13c2.5 2 4 4.5 4 7s-1.5 5-4 7"
          stroke="#60A5FA"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </IconTile>
  );
}

/* 6 · WhatsApp */
function WhatsAppIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="h-[69%] w-[69%]" fill="none" aria-hidden="true">
        {/* Authentic WhatsApp Green Speech Bubble */}
        <path
          d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z"
          fill="#25D366"
        />
        {/* Authentic WhatsApp White Phone Receiver */}
        <path
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
          fill="#FFFFFF"
        />
      </svg>
    </IconTile>
  );
}

/* 7 · Analytics */
function AnalyticsIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 40 40" className="h-[65%] w-[65%]" fill="none" aria-hidden="true">
        <rect x="8" y="22" width="6.5" height="12" rx="2" fill="#60A5FA" />
        <rect x="17" y="14" width="6.5" height="20" rx="2" fill="#3B82F6" />
        <rect x="26" y="8" width="6.5" height="26" rx="2" fill="#2563EB" />
      </svg>
    </IconTile>
  );
}

/* 8 · AI Insights */
function AiInsightsIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 40 40" className="h-[68%] w-[68%]" fill="none" aria-hidden="true">
        <path
          d="M20 6c1.2 6.5 4 9.5 10.5 10.8-6.5 1.3-9.3 4.3-10.5 10.8-1.2-6.5-4-9.5-10.5-10.8C16 15.5 18.8 12.5 20 6z"
          fill="#7C3AED"
        />
        <path
          d="M31 25c.6 3.2 2 4.6 5.2 5.2-3.2.6-4.6 2-5.2 5.2-.6-3.2-2-4.6-5.2-5.2 3.2-.6 4.6-2 5.2-5.2z"
          fill="#A78BFA"
        />
      </svg>
    </IconTile>
  );
}

/* 9 · Resend */
function ResendIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="h-[64%] w-[64%]" fill="none" aria-hidden="true">
        <path
          fill="#000000"
          d="M14.679 0c4.648 0 7.413 2.765 7.413 6.434s-2.765 6.434-7.413 6.434H12.33L24 24h-8.245l-8.88-8.44c-.636-.588-.93-1.273-.93-1.86 0-.831.587-1.565 1.713-1.883l4.574-1.224c1.737-.465 2.936-1.81 2.936-3.572 0-2.153-1.761-3.4-3.939-3.4H0V0z"
        />
      </svg>
    </IconTile>
  );
}

/* 10 · Google */
function GoogleIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="h-[66%] w-[66%]" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
    </IconTile>
  );
}

/* 11 · Razorpay */
function RazorpayIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 286 326" className="h-[65%] w-[65%]" aria-hidden="true" fill="none">
        <polygon fill="#3395FF" points="122.6338 105.6902 106.8778 163.6732 197.0338 105.3642 138.0748 325.3482 197.9478 325.4032 285.0458 0.4822" />
        <path fill="#072654" d="M25.5947 232.9246 L0.8077 325.4026 L123.5337 325.4026 C123.5337 325.4026 173.7317 137.3196 173.7457 137.2656 C173.6987 137.2956 25.5947 232.9246 25.5947 232.9246" />
      </svg>
    </IconTile>
  );
}

/* 12 · Stripe */
function StripeIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="h-[66%] w-[66%]" aria-hidden="true">
        <path
          fill="#635BFF"
          d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
        />
      </svg>
    </IconTile>
  );
}

export interface MultiplierIconItem {
  id: string;
  label: string;
  node: React.ReactNode;
}

export const DOLOYAL_ICONS: MultiplierIconItem[] = [
  { id: "booking", label: "Booking", node: <BookingIcon /> },
  { id: "google", label: "Google", node: <GoogleIcon /> },
  { id: "crm", label: "CRM", node: <CrmIcon /> },
  { id: "stripe", label: "Stripe", node: <StripeIcon /> },
  { id: "loyalty", label: "Loyalty", node: <LoyaltyIcon /> },
  { id: "whatsapp", label: "WhatsApp", node: <WhatsAppIcon /> },
  { id: "offers", label: "Offers", node: <OffersIcon /> },
  { id: "razorpay", label: "Razorpay", node: <RazorpayIcon /> },
  { id: "campaigns", label: "Campaigns", node: <CampaignsIcon /> },
  { id: "resend", label: "Resend", node: <ResendIcon /> },
  { id: "analytics", label: "Analytics", node: <AnalyticsIcon /> },
  { id: "ai-insights", label: "AI Insights", node: <AiInsightsIcon /> },
];
