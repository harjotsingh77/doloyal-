"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, User, Phone } from "lucide-react";
import { Button, Input, Card, CardContent, Logo, cn } from "@doloyal/ui";
import type { ClientSignInPublicConfig } from "@doloyal/shared";
import { GoogleIcon } from "./google-icon";

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return "37 99 235";
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  if (Number.isNaN(pa) || Number.isNaN(pb)) return a;
  const mix = (shift: number) => {
    const ca = (pa >> shift) & 255;
    const cb = (pb >> shift) & 255;
    return Math.round(ca + (cb - ca) * t);
  };
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(16))}${toHex(mix(8))}${toHex(mix(0))}`;
}

function useGoogleFont(family: string) {
  React.useEffect(() => {
    if (!family || family === "Inter") return;
    const id = `client-signin-font-${family.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }, [family]);
}

export function ClientAuthBrandScope({
  config,
  preview = false,
  children,
}: {
  config: ClientSignInPublicConfig;
  preview?: boolean;
  children: React.ReactNode;
}) {
  useGoogleFont(config.fontFamily);
  const muted = mixHex(config.textColor, config.backgroundColor, 0.45);
  const border = mixHex(config.textColor, config.backgroundColor, 0.82);
  const radius = `${config.cornerRadius}px`;
  const radiusSm = `${Math.max(4, config.cornerRadius - 6)}px`;
  const style = {
    ["--color-primary" as string]: hexToRgb(config.primaryColor),
    ["--color-accent" as string]: hexToRgb(config.accentColor),
    ["--color-background" as string]: hexToRgb(config.backgroundColor),
    ["--color-foreground" as string]: hexToRgb(config.textColor),
    ["--color-muted-foreground" as string]: hexToRgb(muted),
    ["--color-subtle" as string]: hexToRgb(mixHex(config.textColor, config.backgroundColor, 0.58)),
    ["--color-border" as string]: hexToRgb(border),
    ["--color-surface" as string]: hexToRgb(config.cardColor),
    ["--radius" as string]: radius,
    ["--radius-sm" as string]: radiusSm,
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    fontFamily: `${config.fontFamily}, ui-sans-serif, system-ui, sans-serif`,
  } as React.CSSProperties;

  return (
    <div className={preview ? "h-full min-h-0 overflow-hidden" : "min-h-screen"} style={style}>
      {children}
    </div>
  );
}

function BrandMark({ config }: { config: ClientSignInPublicConfig }) {
  if (!config.showLogo) return null;
  if (config.customized && config.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={config.logoUrl} alt={config.businessName} className="h-9 w-auto max-w-[160px] object-contain" />
    );
  }
  return <Logo size={36} />;
}

export function ClientAuthShell({
  config,
  title,
  subtitle,
  children,
  footer,
  preview = false,
}: {
  config: ClientSignInPublicConfig;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  preview?: boolean;
}) {
  const split = config.layout === "split";
  const form = (
    <motion.div
      initial={preview ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      <div className={cn("mb-8 flex flex-col", split ? "items-start text-left" : "items-center text-center")}>
        <BrandMark config={config} />
        <h1 className={cn("text-xl font-semibold tracking-tight", config.showLogo ? "mt-6" : "mt-0")}>{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-[rgb(var(--color-muted-foreground))]">{subtitle}</p>
        ) : null}
      </div>
      <Card style={{ borderRadius: config.cornerRadius }}>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
      {footer}
    </motion.div>
  );

  if (split) {
    return (
      <div className={cn("flex", preview ? "h-full min-h-0 overflow-hidden" : "min-h-screen")}>
        <div className="relative hidden w-[44%] overflow-hidden md:block">
          {config.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${config.primaryColor} 0%, ${config.accentColor} 100%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <p className="text-lg font-semibold tracking-tight">{config.businessName}</p>
            {config.tagline ? <p className="mt-1 text-sm text-white/80">{config.tagline}</p> : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center px-4 py-10">{form}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-10", preview ? "h-full min-h-0 overflow-hidden" : "min-h-screen")}>
      {form}
    </div>
  );
}

function GoogleDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[rgb(var(--color-border))]" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-[rgb(var(--color-surface))] px-2 text-[rgb(var(--color-muted-foreground))]">or</span>
      </div>
    </div>
  );
}

function GoogleButton({
  disabled,
  onClick,
  radius,
}: {
  disabled?: boolean;
  onClick: () => void;
  radius: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex w-full items-center justify-center gap-3 border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.99] disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
      style={{ borderRadius: Math.max(8, radius - 4) }}
    >
      <GoogleIcon className="h-5 w-5" />
      <span>Continue with Google</span>
    </button>
  );
}

export function ClientSignInForm({
  config,
  isLoading,
  error,
  onSubmit,
  onGoogle,
  preview = false,
}: {
  config: ClientSignInPublicConfig;
  isLoading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogle: () => void;
  preview?: boolean;
}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const inputRadius = Math.max(6, config.cornerRadius - 6);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (preview) return;
          void onSubmit(email, password);
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              style={{ borderRadius: inputRadius }}
              required={!preview}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            {config.showForgotPassword ? (
              preview ? (
                <span className="text-xs font-medium text-[rgb(var(--color-primary))]">Forgot password</span>
              ) : (
                <Link
                  href={`/forgot-password?next=${encodeURIComponent(`/book/${config.slug}/sign-in`)}`}
                  className="text-xs font-medium text-[rgb(var(--color-primary))] hover:underline"
                >
                  Forgot password
                </Link>
              )
            ) : null}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              style={{ borderRadius: inputRadius }}
              required={!preview}
            />
          </div>
        </div>
        {error && <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>}
        <Button type="submit" className="w-full" loading={isLoading} style={{ borderRadius: inputRadius }}>
          {config.buttonLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      {config.showGoogle ? (
        <>
          <GoogleDivider />
          <GoogleButton disabled={isLoading} onClick={onGoogle} radius={config.cornerRadius} />
        </>
      ) : null}
    </>
  );
}

export function ClientSignUpForm({
  isLoading,
  error,
  onSubmit,
  onGoogle,
  showGoogle = true,
  cornerRadius = 16,
}: {
  isLoading: boolean;
  error: string | null;
  onSubmit: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  onGoogle: () => void;
  showGoogle?: boolean;
  cornerRadius?: number;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const inputRadius = Math.max(6, cornerRadius - 6);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit({ name, email, phone, password });
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Full name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
            <Input id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" style={{ borderRadius: inputRadius }} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" style={{ borderRadius: inputRadius }} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10"
              style={{ borderRadius: inputRadius }}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              style={{ borderRadius: inputRadius }}
              required
              minLength={8}
            />
          </div>
        </div>
        {error && <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>}
        <Button type="submit" className="w-full" loading={isLoading} style={{ borderRadius: inputRadius }}>
          Create account
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      {showGoogle ? (
        <>
          <GoogleDivider />
          <GoogleButton disabled={isLoading} onClick={onGoogle} radius={cornerRadius} />
        </>
      ) : null}
    </>
  );
}

export function CompleteProfileForm({
  isLoading,
  error,
  onSubmit,
}: {
  isLoading: boolean;
  error: string | null;
  onSubmit: (phone: string) => Promise<void>;
}) {
  const [phone, setPhone] = React.useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(phone);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
        Add your phone number to finish setting up your account. This step can&apos;t be skipped.
      </p>
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input
            id="phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>}
      <Button type="submit" className="w-full" loading={isLoading}>
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
