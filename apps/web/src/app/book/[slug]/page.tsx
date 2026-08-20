"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  User,
  Scissors,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
  Sun,
  Moon,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Download,
  RefreshCw,
} from "lucide-react";
import type {
  PublicBusinessInfo,
  PublicService,
  PublicStaff,
  BookingSlot,
  BookingConfirmation,
} from "@doloyal/shared";
import { BookingLanding } from "./booking-landing";
import { getApiBaseUrl, assertApiBaseUrlConfigured } from "@/lib/api-base";

const BASE_URL = getApiBaseUrl();

const STEPS = [
  { num: 1, label: "Business" },
  { num: 2, label: "Service" },
  { num: 3, label: "Staff" },
  { num: 4, label: "Date & Time" },
  { num: 5, label: "Details" },
  { num: 6, label: "Confirmed" },
] as const;

function formatPrice(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeShort(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarColor(seed: string): string {
  const palette = [
    "#2563EB", "#60A5FA", "#10B981", "#8B5CF6",
    "#EC4899", "#F59E0B", "#06B6D4", "#EF4444",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length] ?? palette[0];
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CalendarWidget({
  selected,
  onChange,
  minDate,
}: {
  selected: Date | null;
  onChange: (d: Date) => void;
  minDate: Date;
}) {
  const [viewMonth, setViewMonth] = React.useState(() => new Date().getMonth());
  const [viewYear, setViewYear] = React.useState(() => new Date().getFullYear());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const isPastMonth =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={isPastMonth}
          className="p-2 rounded-[var(--radius-sm)] hover:bg-[rgb(var(--color-muted))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-[var(--radius-sm)] hover:bg-[rgb(var(--color-muted))] transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-[rgb(var(--color-muted-foreground))] py-1"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const date = new Date(viewYear, viewMonth, day);
          date.setHours(0, 0, 0, 0);
          const isSelected =
            selected &&
            selected.getDate() === day &&
            selected.getMonth() === viewMonth &&
            selected.getFullYear() === viewYear;
          const isPast = date < minDate;
          const isToday = date.getTime() === today.getTime();

          return (
            <button
              key={`d-${day}`}
              onClick={() => {
                if (!isPast) onChange(date);
              }}
              disabled={isPast}
              className={`
                aspect-square rounded-[var(--radius-sm)] text-xs font-medium
                transition-all duration-150
                ${isSelected
                  ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] shadow-sm"
                  : isToday
                    ? "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))] border border-[rgb(var(--color-border))]"
                    : "hover:bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]"
                }
                ${isPast ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius)] bg-[rgb(var(--color-muted))] ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[lf-shimmer_1.5s_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgb(var(--color-surface) / 0.5), transparent)",
        }}
      />
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto mb-8">
      {STEPS.map((s, i) => {
        const isCompleted = s.num < current;
        const isActive = s.num === current;
        const isFuture = s.num > current;

        return (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  transition-all duration-300
                  ${isCompleted
                    ? "bg-[rgb(var(--color-success))] text-white"
                    : isActive
                      ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] ring-2 ring-[rgb(var(--color-primary)/0.3)]"
                      : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  s.num
                )}
              </div>
              <span
                className={`
                  text-[0.6rem] font-medium whitespace-nowrap
                  ${isActive
                    ? "text-[rgb(var(--color-foreground))]"
                    : isCompleted
                      ? "text-[rgb(var(--color-success))]"
                      : "text-[rgb(var(--color-subtle))]"
                  }
                `}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`
                  flex-1 h-px mx-1 mt-[-1.25rem]
                  ${s.num < current
                    ? "bg-[rgb(var(--color-success))]"
                    : "bg-[rgb(var(--color-border))]"
                  }
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function NoBusinessFound({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-[rgb(var(--color-muted))] flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-[rgb(var(--color-muted-foreground))]" />
        </div>
        <h1 className="text-xl font-bold mb-2">Booking page unavailable</h1>
        <p className="text-sm text-[rgb(var(--color-muted-foreground))] mb-6">
          {message ||
            "This booking link doesn't exist, is inactive, or has expired. Ask the business for an updated link."}
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back home
        </a>
      </div>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-[rgb(var(--color-danger)/0.1)] flex items-center justify-center mb-4">
        <AlertCircle className="h-7 w-7 text-[rgb(var(--color-danger))]" />
      </div>
      <p className="text-sm text-[rgb(var(--color-muted-foreground))] mb-4 max-w-xs">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}

function EmptyCard({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-[rgb(var(--color-muted))] flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-[rgb(var(--color-muted-foreground))] max-w-xs">
        {message}
      </p>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-[var(--radius-sm)] hover:bg-[rgb(var(--color-muted))] transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export default function BookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [step, setStep] = React.useState(1);
  const [direction, setDirection] = React.useState(0);
  const [phase, setPhase] = React.useState<"landing" | "flow">("landing");

  const [business, setBusiness] = React.useState<PublicBusinessInfo | null>(null);
  const [businessLoading, setBusinessLoading] = React.useState(true);
  const [businessError, setBusinessError] = React.useState(false);
  const [businessErrorMessage, setBusinessErrorMessage] = React.useState<string | null>(null);

  const [services, setServices] = React.useState<PublicService[]>([]);
  const [servicesLoading, setServicesLoading] = React.useState(true);

  const [staff, setStaff] = React.useState<PublicStaff[]>([]);
  const [staffLoading, setStaffLoading] = React.useState(true);

  const [selectedService, setSelectedService] = React.useState<PublicService | null>(null);
  const [selectedStaff, setSelectedStaff] = React.useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = React.useState<string | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);

  const [slots, setSlots] = React.useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [birthday, setBirthday] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [referralSource, setReferralSource] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("PAY_AT_STORE");
  const [honeypot, setHoneypot] = React.useState("");
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<BookingConfirmation | null>(null);

  const [today, setToday] = React.useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  React.useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setToday(d);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currency = business?.currency ?? "INR";

  React.useEffect(() => {
    async function loadBusiness() {
      try {
        assertApiBaseUrlConfigured();
        setBusinessLoading(true);
        setBusinessError(false);
        setBusinessErrorMessage(null);
        const res = await fetch(`${BASE_URL}/public/book/${slug}`);
        const json = await res.json();
        if (!res.ok || json.error) {
          setBusinessError(true);
          setBusinessErrorMessage(json.error?.message || "Booking link not found");
          return;
        }
        const info = json.data as PublicBusinessInfo;
        if (info.bookingLink?.isPaused) {
          setBusinessError(true);
          setBusinessErrorMessage("Bookings are temporarily paused for this link.");
          setBusiness(info);
          return;
        }
        setBusiness(info);
        const title = info.bookingLink?.metaTitle || (info.name ? `${info.name} — Book Online` : "Book Online");
        document.title = title;
        const desc = info.bookingLink?.metaDescription || info.tagline || "";
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("name", "description");
          document.head.appendChild(meta);
        }
        meta.setAttribute("content", desc);
        const seo = info.seo || info.bookingLink?.seo;
        if (seo?.keywords) {
          let kw = document.querySelector('meta[name="keywords"]');
          if (!kw) {
            kw = document.createElement("meta");
            kw.setAttribute("name", "keywords");
            document.head.appendChild(kw);
          }
          kw.setAttribute("content", seo.keywords);
        }
        // JSON-LD
        const existing = document.getElementById("lf-booking-schema");
        if (existing) existing.remove();
        const script = document.createElement("script");
        script.id = "lf-booking-schema";
        script.type = "application/ld+json";
        script.text = JSON.stringify({
          "@context": "https://schema.org",
          "@type": seo?.schemaType || "LocalBusiness",
          name: info.name,
          description: desc,
          telephone: info.phone || undefined,
          email: info.email || undefined,
          address: info.address || undefined,
          url: typeof window !== "undefined" ? window.location.href : undefined,
          image: info.logoUrl || info.coverBannerUrl || undefined,
        });
        document.head.appendChild(script);

        const src = new URLSearchParams(window.location.search).get("src") || "direct";
        const sessionId = sessionStorage.getItem("lf_book_session") || crypto.randomUUID();
        sessionStorage.setItem("lf_book_session", sessionId);
        fetch(`${BASE_URL}/public/book/${slug}/visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: src, referrer: document.referrer || undefined, sessionId }),
        }).catch(() => undefined);

        // Prefetch services + staff for landing
        Promise.all([
          fetch(`${BASE_URL}/public/book/${slug}/services`).then((r) => r.json()),
          fetch(`${BASE_URL}/public/book/${slug}/staff`).then((r) => r.json()),
        ]).then(([svc, st]) => {
          setServices((svc.data ?? info.services ?? []) as PublicService[]);
          setStaff((st.data ?? info.staff ?? []) as PublicStaff[]);
          setServicesLoading(false);
          setStaffLoading(false);
        }).catch(() => {
          setServices((info.services ?? []) as PublicService[]);
          setStaff((info.staff ?? []) as PublicStaff[]);
          setServicesLoading(false);
          setStaffLoading(false);
        });
      } catch {
        setBusinessError(true);
        setBusinessErrorMessage("Could not load this booking page. Please try again.");
      } finally {
        setBusinessLoading(false);
      }
    }
    if (slug) loadBusiness();
  }, [slug]);

  React.useEffect(() => {
    if (step < 2 || !slug) return;
    async function load() {
      try {
        setServicesLoading(true);
        const res = await fetch(`${BASE_URL}/public/book/${slug}/services`);
        const json = await res.json();
        setServices((json.data ?? []) as PublicService[]);
      } catch {
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    }
    load();
  }, [slug, step]);

  React.useEffect(() => {
    if (step < 3 || !slug) return;
    async function load() {
      try {
        setStaffLoading(true);
        const res = await fetch(`${BASE_URL}/public/book/${slug}/staff`);
        const json = await res.json();
        setStaff((json.data ?? []) as PublicStaff[]);
      } catch {
        setStaff([]);
      } finally {
        setStaffLoading(false);
      }
    }
    load();
  }, [slug, step]);

  const loadId = React.useRef(0);
  React.useEffect(() => {
    if (!slug || !selectedDate || !selectedService) {
      setSlots([]);
      return;
    }
    const currentId = ++loadId.current;
    const date = selectedDate;
    const svc = selectedService;
    async function loadSlots() {
      try {
        setSlotsLoading(true);
        const dateStr = date.toISOString().split("T")[0];
        const qs = new URLSearchParams({
          date: dateStr,
          serviceId: svc.id,
        });
        if (selectedStaff) qs.set("staffId", selectedStaff);
        const res = await fetch(
          `${BASE_URL}/public/book/${slug}/slots?${qs.toString()}`
        );
        const json = await res.json();
        if (currentId === loadId.current) {
          setSlots((json.data ?? []) as BookingSlot[]);
        }
      } catch {
        if (currentId === loadId.current) {
          setSlots([]);
        }
      } finally {
        if (currentId === loadId.current) {
          setSlotsLoading(false);
        }
      }
    }
    loadSlots();
  }, [slug, selectedDate, selectedService, selectedStaff]);

  function goToStep(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  }

  function resetFlow() {
    setPhase("landing");
    setStep(1);
    setDirection(0);
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedStaffName(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSlots([]);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setValidationErrors({});
    setSubmitError(null);
    setConfirmation(null);
  }

  function validateDetails(): boolean {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!phone.trim()) errors.phone = "Phone is required";
    else if (!/^[\d\s+\-()]{7,20}$/.test(phone.trim()))
      errors.phone = "Enter a valid phone number";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = "Enter a valid email address";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateDetails()) return;
    if (!selectedService || !selectedTime || !selectedDate) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const [h, m] = selectedTime.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(h ?? 0, m ?? 0, 0, 0);

      const payload: Record<string, unknown> = {
        serviceId: selectedService.id,
        startTime: startTime.toISOString(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        customerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
        customerPhone: phone.trim(),
        honeypot,
        paymentMethod,
      };
      if (selectedStaff) payload.staffId = selectedStaff;
      if (email.trim()) {
        payload.email = email.trim();
        payload.customerEmail = email.trim();
      }
      if (notes.trim()) payload.notes = notes.trim();
      if (birthday) payload.birthday = birthday;
      if (gender) payload.gender = gender;
      if (address.trim()) payload.address = address.trim();
      if (referralSource.trim()) payload.referralSource = referralSource.trim();

      const res = await fetch(`${BASE_URL}/public/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Booking failed. Please try again.");
      }
      setConfirmation(json.data as BookingConfirmation);
      goToStep(6);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (businessLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-end">
            <SkeletonBlock className="w-9 h-9 rounded-[var(--radius-sm)]" />
          </div>
          <div className="flex justify-center mb-8">
            <SkeletonBlock className="h-8 w-64" />
          </div>
          <SkeletonBlock className="h-48 w-full" />
          <SkeletonBlock className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (businessError || !business) {
    return <NoBusinessFound message={businessErrorMessage || undefined} />;
  }

  const startBooking = () => {
    setPhase("flow");
    setDirection(1);
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--color-background))]">
      <header className="sticky top-0 z-50 bg-[rgb(var(--color-background))/0.8] backdrop-blur-xl border-b border-[rgb(var(--color-border))]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {phase === "flow" && step > 1 && step < 6 && (
              <button
                type="button"
                className="mr-1 rounded-md p-1 hover:bg-[rgb(var(--color-muted))]"
                onClick={() => {
                  if (step === 2) {
                    setPhase("landing");
                    setStep(1);
                  } else {
                    goToStep(step - 1);
                  }
                }}
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-8 w-8 rounded-[var(--radius-sm)] object-cover"
              />
            ) : (
              <div
                className="h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: business.brandColor || "rgb(var(--color-primary))" }}
              >
                {getInitials(business.name)}
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold leading-tight">{business.name}</h1>
              <p className="text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
                {phase === "landing" ? (business.tagline || "Book an appointment") : "Book an appointment"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {phase === "landing" && (
              <button
                type="button"
                onClick={startBooking}
                className="hidden h-8 items-center rounded-md px-3 text-xs font-medium text-white sm:inline-flex"
                style={{ backgroundColor: business.brandColor || "rgb(var(--color-primary))" }}
              >
                Book Now
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        {phase === "landing" ? (
          <BookingLanding
            business={business}
            services={services}
            staff={staff}
            currency={currency}
            onBook={startBooking}
          />
        ) : (
          <>
        {step < 6 && <StepIndicator current={step} />}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          >
            {step === 1 && (
              <StepWelcome
                business={business}
                onContinue={() => goToStep(2)}
              />
            )}
            {step === 2 && (
              <StepService
                services={services}
                loading={servicesLoading}
                selected={selectedService}
                onSelect={(s) => setSelectedService(s)}
                currency={currency}
                onContinue={() => {
                  if (selectedService) goToStep(3);
                }}
                onBack={() => {
                  setPhase("landing");
                  setStep(1);
                }}
              />
            )}
            {step === 3 && (
              <StepStaff
                staff={staff}
                loading={staffLoading}
                selected={selectedStaff}
                selectedName={selectedStaffName}
                onSelect={(id, name) => {
                  setSelectedStaff(id);
                  setSelectedStaffName(name);
                }}
                onContinue={() => goToStep(4)}
                onBack={() => goToStep(2)}
              />
            )}
            {step === 4 && (
              <StepDateTime
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                selectedTime={selectedTime}
                onSelectTime={setSelectedTime}
                slots={slots}
                slotsLoading={slotsLoading}
                service={selectedService}
                minDate={today}
                onContinue={() => {
                  if (selectedDate && selectedTime) goToStep(5);
                }}
                onBack={() => goToStep(3)}
              />
            )}
            {step === 5 && (
              <StepDetails
                firstName={firstName}
                lastName={lastName}
                email={email}
                phone={phone}
                notes={notes}
                birthday={birthday}
                gender={gender}
                address={address}
                referralSource={referralSource}
                paymentMethod={paymentMethod}
                honeypot={honeypot}
                paymentMode={business?.bookingLink?.payment?.mode || "NONE"}
                paymentMethods={business?.bookingLink?.payment?.methods || ["CASH", "UPI"]}
                customerFields={business?.bookingLink?.customerFields}
                errors={validationErrors}
                onChangeFirstName={setFirstName}
                onChangeLastName={setLastName}
                onChangeEmail={setEmail}
                onChangePhone={setPhone}
                onChangeNotes={setNotes}
                onChangeBirthday={setBirthday}
                onChangeGender={setGender}
                onChangeAddress={setAddress}
                onChangeReferralSource={setReferralSource}
                onChangePaymentMethod={setPaymentMethod}
                onChangeHoneypot={setHoneypot}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitError={submitError}
                onBack={() => goToStep(4)}
              />
            )}
            {step === 6 && confirmation && (
              <StepConfirmation
                confirmation={confirmation}
                business={business}
                onBookAnother={resetFlow}
              />
            )}
            {step === 6 && !confirmation && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--color-primary))]" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Step 1: Welcome ────────────────────────────────────────────────────────

function StepWelcome({
  business,
  onContinue,
}: {
  business: PublicBusinessInfo;
  onContinue: () => void;
}) {
  const hours = business.businessHours as Record<
    string,
    { open: string; close: string } | null
  > | null;

  const dayOrder = [
    "monday", "tuesday", "wednesday", "thursday", "friday",
    "saturday", "sunday",
  ];
  const dayLabels: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        {business.logoUrl ? (
          <img
            src={business.logoUrl}
            alt={business.name}
            className="h-20 w-20 mx-auto rounded-xl object-cover mb-4 shadow-soft"
          />
        ) : (
          <div
            className="h-20 w-20 mx-auto rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-soft"
            style={{
              backgroundColor: business.brandColor || "rgb(var(--color-primary))",
            }}
          >
            {getInitials(business.name)}
          </div>
        )}
        <h2 className="text-2xl font-bold mb-1">{business.name}</h2>
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
          Book your appointment in a few simple steps
        </p>
      </div>

      <div className="bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-[var(--radius)] p-5 space-y-4 shadow-soft">
        {business.address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-[rgb(var(--color-muted-foreground))] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">
                Address
              </p>
              <p className="text-sm">{business.address}</p>
            </div>
          </div>
        )}
        {business.phone && (
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-[rgb(var(--color-muted-foreground))] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">
                Phone
              </p>
              <p className="text-sm">{business.phone}</p>
            </div>
          </div>
        )}
        {business.email && (
          <div className="flex items-start gap-3">
            <Mail className="h-4 w-4 text-[rgb(var(--color-muted-foreground))] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">
                Email
              </p>
              <p className="text-sm">{business.email}</p>
            </div>
          </div>
        )}
        {hours && (
          <div className="flex items-start gap-3">
            <CalendarDays className="h-4 w-4 text-[rgb(var(--color-muted-foreground))] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))] mb-1">
                Working Hours
              </p>
              <div className="space-y-0.5">
                {dayOrder.map((day) => {
                  const h = hours[day];
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-[rgb(var(--color-muted-foreground))] w-8">
                        {dayLabels[day]}
                      </span>
                      <span>
                        {h ? (
                          <>
                            {h.open.slice(0, 5)} – {h.close.slice(0, 5)}
                          </>
                        ) : (
                          <span className="text-[rgb(var(--color-muted-foreground))]">
                            Closed
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 px-6 rounded-[var(--radius)] bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] font-semibold text-sm hover:brightness-110 transition-all shadow-soft"
      >
        Continue
      </button>
    </div>
  );
}

// ─── Step 2: Service Selection ──────────────────────────────────────────────

function StepService({
  services,
  loading,
  selected,
  onSelect,
  currency,
  onContinue,
  onBack,
}: {
  services: PublicService[];
  loading: boolean;
  selected: PublicService | null;
  onSelect: (s: PublicService) => void;
  currency: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h2 className="text-lg font-bold">Select a Service</h2>
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
          Choose the service you&apos;d like to book
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyCard
          icon={<Scissors className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />}
          title="No services available"
          message="This business hasn&apos;t added any services yet. Please check back later."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {services
            .filter((s) => s.isActive)
            .map((s) => {
              const isSelected = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className={`
                    relative text-left p-4 rounded-[var(--radius)] border transition-all duration-200
                    ${isSelected
                      ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.05)] shadow-sm"
                      : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] hover:border-[rgb(var(--color-primary)/0.4)] hover:shadow-soft"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold leading-snug">
                      {s.name}
                    </h3>
                    <span className="text-sm font-bold text-[rgb(var(--color-primary))] shrink-0">
                      {formatPrice(s.price, currency)}
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-[rgb(var(--color-muted-foreground))] line-clamp-2 mb-2">
                      {s.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[0.6rem] font-medium bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))] px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3" />
                      {s.durationMinutes} min
                    </span>
                    {s.category && (
                      <span className="inline-flex items-center text-[0.6rem] font-medium bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))] px-2 py-0.5 rounded-full">
                        {s.category}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[rgb(var(--color-primary))] flex items-center justify-center">
                      <Check className="h-3 w-3 text-[rgb(var(--color-primary-foreground))]" />
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {services.length > 0 && (
        <button
          onClick={onContinue}
          disabled={!selected}
          className="w-full py-3 px-6 rounded-[var(--radius)] bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] font-semibold text-sm hover:brightness-110 transition-all shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      )}
    </div>
  );
}

// ─── Step 3: Staff Selection ────────────────────────────────────────────────

function StepStaff({
  staff,
  loading,
  selected,
  selectedName,
  onSelect,
  onContinue,
  onBack,
}: {
  staff: PublicStaff[];
  loading: boolean;
  selected: string | null;
  selectedName: string | null;
  onSelect: (id: string | null, name: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h2 className="text-lg font-bold">Select Staff</h2>
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
          Choose a preferred staff member or let us assign anyone
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => onSelect(null, null)}
            className={`
              w-full text-left p-4 rounded-[var(--radius)] border transition-all duration-200
              ${selected === null
                ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.05)] shadow-sm"
                : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] hover:border-[rgb(var(--color-primary)/0.4)] hover:shadow-soft"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${selected === null
                    ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))]"
                    : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]"
                  }
                `}
              >
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Any Available Staff</p>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  We&apos;ll assign the best available person
                </p>
              </div>
              {selected === null && (
                <div className="ml-auto w-5 h-5 rounded-full bg-[rgb(var(--color-primary))] flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-[rgb(var(--color-primary-foreground))]" />
                </div>
              )}
            </div>
          </button>

          {staff.length === 0 && (
            <p className="text-xs text-[rgb(var(--color-muted-foreground))] text-center py-2">
              No specific staff members listed
            </p>
          )}

          {staff.map((s) => {
            const isSelected = selected === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id, s.name)}
                className={`
                  w-full text-left p-4 rounded-[var(--radius)] border transition-all duration-200
                  ${isSelected
                    ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.05)] shadow-sm"
                    : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] hover:border-[rgb(var(--color-primary)/0.4)] hover:shadow-soft"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {s.avatarUrl ? (
                    <img
                      src={s.avatarUrl}
                      alt={s.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: getAvatarColor(s.name) }}
                    >
                      {getInitials(s.name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    {s.roleTitle && (
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        {s.roleTitle}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-[rgb(var(--color-primary))] flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-[rgb(var(--color-primary-foreground))]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full py-3 px-6 rounded-[var(--radius)] bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] font-semibold text-sm hover:brightness-110 transition-all shadow-soft"
      >
        Continue
      </button>
    </div>
  );
}

// ─── Step 4: Date & Time ────────────────────────────────────────────────────

function StepDateTime({
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  slots,
  slotsLoading,
  service,
  minDate,
  onContinue,
  onBack,
}: {
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
  selectedTime: string | null;
  onSelectTime: (t: string | null) => void;
  slots: BookingSlot[];
  slotsLoading: boolean;
  service: PublicService | null;
  minDate: Date;
  onContinue: () => void;
  onBack: () => void;
}) {
  const availableSlots = React.useMemo(
    () => slots.filter((s) => s.available),
    [slots]
  );

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h2 className="text-lg font-bold">Choose Date & Time</h2>
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
          {service
            ? `Pick a slot for ${service.name} (${service.durationMinutes} min)`
            : "Select your preferred date and time"}
        </p>
      </div>

      <div className="bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-[var(--radius)] p-4 shadow-soft">
        <CalendarWidget
          selected={selectedDate}
          onChange={(d) => {
            onSelectDate(d);
            onSelectTime(null);
          }}
          minDate={minDate}
        />
      </div>

      {selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Available Times
              <span className="text-[rgb(var(--color-muted-foreground))] font-normal ml-1">
                for {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </h3>
            {slotsLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--color-muted-foreground))]" />
            )}
          </div>

          {slotsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <EmptyCard
              icon={<CalendarDays className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />}
              title="No availability"
              message="No slots available on this date. Please select another date."
            />
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full bg-[rgb(var(--color-muted))] flex items-center justify-center mx-auto mb-2">
                <Clock className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />
              </div>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                Fully booked on this date
              </p>
              <p className="text-xs text-[rgb(var(--color-subtle))] mt-1">
                Try a different date
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {slots.map((slot) => {
                const isAvailable = slot.available;
                const isSelected = selectedTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => {
                      if (isAvailable) onSelectTime(slot.time);
                    }}
                    disabled={!isAvailable}
                    className={`
                      py-2.5 px-3 rounded-[var(--radius-sm)] text-sm font-medium
                      transition-all duration-150
                      ${isSelected
                        ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] shadow-sm"
                        : isAvailable
                          ? "bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary))] text-[rgb(var(--color-foreground))]"
                          : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))] opacity-40 cursor-not-allowed line-through"
                      }
                    `}
                  >
                    {slot.time.slice(0, 5)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={!selectedDate || !selectedTime}
        className="w-full py-3 px-6 rounded-[var(--radius)] bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] font-semibold text-sm hover:brightness-110 transition-all shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}

// ─── Step 5: Customer Details ───────────────────────────────────────────────

function StepDetails({
  firstName,
  lastName,
  email,
  phone,
  notes,
  birthday,
  gender,
  address,
  referralSource,
  paymentMethod,
  honeypot,
  paymentMode,
  paymentMethods,
  customerFields,
  errors,
  onChangeFirstName,
  onChangeLastName,
  onChangeEmail,
  onChangePhone,
  onChangeNotes,
  onChangeBirthday,
  onChangeGender,
  onChangeAddress,
  onChangeReferralSource,
  onChangePaymentMethod,
  onChangeHoneypot,
  onSubmit,
  submitting,
  submitError,
  onBack,
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  birthday: string;
  gender: string;
  address: string;
  referralSource: string;
  paymentMethod: string;
  honeypot: string;
  paymentMode: string;
  paymentMethods: string[];
  customerFields?: Record<string, { enabled?: boolean; required?: boolean }> | null;
  errors: Record<string, string>;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onChangeBirthday: (v: string) => void;
  onChangeGender: (v: string) => void;
  onChangeAddress: (v: string) => void;
  onChangeReferralSource: (v: string) => void;
  onChangePaymentMethod: (v: string) => void;
  onChangeHoneypot: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  const field = (key: string, fallbackEnabled = true) =>
    customerFields?.[key] ?? { enabled: fallbackEnabled, required: key === "name" || key === "phone" };

  const showEmail = field("email", true).enabled !== false;
  const showNotes = field("notes", true).enabled !== false;
  const showBirthday = field("birthday", false).enabled === true;
  const showGender = field("gender", false).enabled === true;
  const showAddress = field("address", false).enabled === true;
  const showReferral = field("referralSource", false).enabled === true;
  const needsPayment = paymentMode && paymentMode !== "NONE";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h2 className="text-lg font-bold">Your Details</h2>
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
          We need a few details to confirm your booking
        </p>
      </div>

      {/* Honeypot — hidden from users */}
      <input
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => onChangeHoneypot(e.target.value)}
        className="absolute opacity-0 h-0 w-0 -z-10"
        aria-hidden="true"
      />

      <div className="bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-[var(--radius)] p-5 space-y-4 shadow-soft">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="First Name" required error={errors.firstName}>
            <input value={firstName} onChange={(e) => onChangeFirstName(e.target.value)} placeholder="John" className={inputClass(!!errors.firstName)} />
          </FieldGroup>
          <FieldGroup label="Last Name" required error={errors.lastName}>
            <input value={lastName} onChange={(e) => onChangeLastName(e.target.value)} placeholder="Doe" className={inputClass(!!errors.lastName)} />
          </FieldGroup>
        </div>

        <FieldGroup label="Phone" required error={errors.phone}>
          <input type="tel" value={phone} onChange={(e) => onChangePhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass(!!errors.phone)} />
        </FieldGroup>

        {showEmail && (
          <FieldGroup label="Email" required={field("email").required} error={errors.email}>
            <input type="email" value={email} onChange={(e) => onChangeEmail(e.target.value)} placeholder="you@email.com" className={inputClass(!!errors.email)} />
          </FieldGroup>
        )}

        {showBirthday && (
          <FieldGroup label="Birthday" required={field("birthday").required}>
            <input type="date" value={birthday} onChange={(e) => onChangeBirthday(e.target.value)} className={inputClass(false)} />
          </FieldGroup>
        )}

        {showGender && (
          <FieldGroup label="Gender" required={field("gender").required}>
            <select value={gender} onChange={(e) => onChangeGender(e.target.value)} className={inputClass(false)}>
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
          </FieldGroup>
        )}

        {showAddress && (
          <FieldGroup label="Address" required={field("address").required}>
            <input value={address} onChange={(e) => onChangeAddress(e.target.value)} placeholder="Street, City" className={inputClass(false)} />
          </FieldGroup>
        )}

        {showReferral && (
          <FieldGroup label="Referral Source" required={field("referralSource").required}>
            <input value={referralSource} onChange={(e) => onChangeReferralSource(e.target.value)} placeholder="Instagram, Friend, Google..." className={inputClass(false)} />
          </FieldGroup>
        )}

        {showNotes && (
          <FieldGroup label="Notes" required={field("notes").required}>
            <textarea value={notes} onChange={(e) => onChangeNotes(e.target.value)} rows={3} placeholder="Any special requests?" className={inputClass(false)} />
          </FieldGroup>
        )}

        {needsPayment && (
          <FieldGroup label="Payment Method">
            <div className="flex flex-wrap gap-2">
              {(paymentMethods.length ? paymentMethods : ["CASH", "UPI"]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangePaymentMethod(m)}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium border ${
                    paymentMethod === m
                      ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                      : "border-[rgb(var(--color-border))]"
                  }`}
                >
                  {m === "PAY_AT_STORE" ? "Pay at Store" : m}
                </button>
              ))}
              {paymentMode === "PAY_AT_STORE" || paymentMode === "DEPOSIT" || paymentMode === "FULL" || paymentMode === "PARTIAL" ? (
                <button
                  type="button"
                  onClick={() => onChangePaymentMethod("PAY_AT_STORE")}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium border ${
                    paymentMethod === "PAY_AT_STORE"
                      ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                      : "border-[rgb(var(--color-border))]"
                  }`}
                >
                  Pay at Store
                </button>
              ) : null}
            </div>
            {paymentMode === "DEPOSIT" && (
              <p className="text-xs text-[rgb(var(--color-muted-foreground))] mt-2">A deposit is required to confirm this booking.</p>
            )}
          </FieldGroup>
        )}
      </div>

      {submitError && (
        <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-danger))]">
          <AlertCircle className="h-4 w-4" />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 px-6 rounded-[var(--radius)] bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] font-semibold text-sm hover:brightness-110 transition-all shadow-soft disabled:opacity-40 inline-flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Booking..." : needsPayment && paymentMethod !== "PAY_AT_STORE" && paymentMethod !== "CASH" ? "Pay & Confirm" : "Confirm Booking"}
      </button>
    </form>
  );
}

function FieldGroup({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[rgb(var(--color-foreground))] mb-1.5">
        {label}
        {required && <span className="text-[rgb(var(--color-danger))] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[0.6rem] text-[rgb(var(--color-danger))] mt-1">{error}</p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return `w-full px-3 py-2.5 text-sm rounded-[var(--radius-sm)] border bg-[rgb(var(--color-surface))] text-[rgb(var(--color-foreground))] placeholder:text-[rgb(var(--color-subtle))] transition-colors ${
    hasError
      ? "border-[rgb(var(--color-danger))] focus-visible:ring-[rgb(var(--color-danger))]"
      : "border-[rgb(var(--color-border))] focus-visible:ring-[rgb(var(--color-primary))]"
  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0`;
}

// ─── Step 6: Confirmation ───────────────────────────────────────────────────

function StepConfirmation({
  confirmation,
  business,
  onBookAnother,
}: {
  confirmation: BookingConfirmation;
  business: PublicBusinessInfo;
  onBookAnother: () => void;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="py-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-[rgb(var(--color-success)/0.15)] flex items-center justify-center mb-4 animate-[lf-scale-in_0.3s_ease]">
          <CheckCircle2 className="h-10 w-10 text-[rgb(var(--color-success))]" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Appointment Confirmed!</h2>
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
          Your booking has been confirmed. We&apos;ll see you soon!
        </p>
      </div>

      <div className="bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-[var(--radius)] p-5 shadow-soft text-left space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailItem label="Appointment ID" value={`#${confirmation.id.slice(0, 8).toUpperCase()}`} />
          <DetailItem label="Status" value={confirmation.status} />
          <DetailItem label="Date" value={formatDate(confirmation.startsAt)} />
          <DetailItem
            label="Time"
            value={`${formatTime(confirmation.startsAt)} – ${formatTime(confirmation.endsAt)}`}
          />
          <DetailItem label="Service" value={confirmation.serviceName} />
          <DetailItem label="Staff" value={confirmation.staffName ?? "To be assigned"} />
          {confirmation.location && (
            <DetailItem label="Location" value={confirmation.location} />
          )}
          {business.phone && (
            <DetailItem label="Contact" value={business.phone} />
          )}
        </div>
        {confirmation.notes && (
          <div className="pt-3 border-t border-[rgb(var(--color-border))]">
            <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))] mb-1">
              Notes
            </p>
            <p className="text-sm">{confirmation.notes}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {confirmation.googleCalendarUrl && (
          <a
            href={confirmation.googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-sm font-medium hover:bg-[rgb(var(--color-muted))] transition-colors shadow-soft"
          >
            <Calendar className="h-4 w-4" />
            Add to Google Calendar
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {confirmation.icsUrl && (
          <a
            href={confirmation.icsUrl}
            download
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-sm font-medium hover:bg-[rgb(var(--color-muted))] transition-colors shadow-soft"
          >
            <Download className="h-4 w-4" />
            Download ICS
          </a>
        )}
      </div>

      <div className="pt-2">
        <button
          onClick={onBookAnother}
          className="inline-flex items-center gap-2 py-2.5 px-6 rounded-[var(--radius)] bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] font-semibold text-sm hover:brightness-110 transition-all shadow-soft"
        >
          <CalendarDays className="h-4 w-4" />
          Book Another Appointment
        </button>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))] mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
