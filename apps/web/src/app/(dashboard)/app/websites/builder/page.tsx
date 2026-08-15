"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Rocket,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
} from "@doloyal/ui";
import { getPlan, PLANS, BUSINESS_CATEGORY_LABELS } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@doloyal/ui";

const EXAMPLE_PROMPTS = [
  "Create a premium salon website with online booking.",
  "Build a modern café website with menu and reservations.",
  "Create a minimal gym website with memberships and booking.",
];

const GENERATION_STEPS = [
  "Analyzing your business",
  "Generating structure",
  "Creating content",
  "Applying branding",
  "Connecting booking",
  "Preparing website",
];

type Phase =
  | "checking"
  | "blocked"
  | "prompt"
  | "generating"
  | "error"
  | "ready"
  | "publishing"
  | "published";

function slugToDomain(slug?: string): string {
  return slug ? `https://${slug}.doloyal.ai` : "";
}

export default function AiWebsiteBuilderPage() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("checking");

  const [subscription, setSubscription] = React.useState<any>(null);
  const [tenant, setTenant] = React.useState<any>(null);
  const [requiredPlan, setRequiredPlan] = React.useState<any>(null);

  const [prompt, setPrompt] = React.useState("");
  const [stepIndex, setStepIndex] = React.useState(0);
  const [error, setError] = React.useState("");

  const [websiteId, setWebsiteId] = React.useState<string | null>(null);
  const [websiteName, setWebsiteName] = React.useState("");
  const [websiteSlug, setWebsiteSlug] = React.useState("");
  const [pageCount, setPageCount] = React.useState(0);

  const [publishResult, setPublishResult] = React.useState<any>(null);
  const [publishing, setPublishing] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sub, currentTenant] = await Promise.all([
          api.getSubscription().catch(() => null),
          api.getTenant().catch(() => null),
        ]);
        if (cancelled) return;
        setSubscription(sub);
        setTenant(currentTenant);

        const planId = sub?.plan ?? "free";
        const plan = getPlan(planId as any);
        const included = Boolean(
          sub?.planDetails?.limits?.aiWebsiteBuilder ?? plan?.limits?.aiWebsiteBuilder ?? false,
        );
        if (included) {
          setPhase("prompt");
        } else {
          const needed = PLANS.find((p) => p.limits.aiWebsiteBuilder) ?? null;
          setRequiredPlan(needed);
          setPhase("blocked");
        }
      } catch {
        if (!cancelled) setPhase("blocked");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPlanName =
    subscription?.planDetails?.name ?? getPlan((subscription?.plan ?? "free") as any)?.name ?? "Free Trial";

  const businessCategory = (tenant?.category && BUSINESS_CATEGORY_LABELS[tenant.category as keyof typeof BUSINESS_CATEGORY_LABELS]) ?? tenant?.category ?? "Other";

  const generate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setPhase("generating");
    setStepIndex(0);
    setError("");

    const timer = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, GENERATION_STEPS.length - 1));
    }, 750);

    try {
      const site = await api.createWebsite({
        name: `${tenant?.name ?? "My Business"} Website`,
        description: trimmed,
        industry: tenant?.category ?? "OTHER",
      });
      await api.generateWebsite(site.id, {
        prompt: trimmed,
        industry: tenant?.category ?? "OTHER",
      });
      window.clearInterval(timer);
      setStepIndex(GENERATION_STEPS.length);
      setWebsiteId(site.id);
      setWebsiteName(site.name);
      setWebsiteSlug(site.slug);
      setPageCount(site.pages?.length ?? 0);
      setPhase("ready");
    } catch (err: any) {
      window.clearInterval(timer);
      console.error(err);
      setError(err?.message ?? "We couldn't generate your website. Please try again.");
      setPhase("error");
    }
  };

  const publish = async () => {
    if (!websiteId) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const result = await api.publishWebsite(websiteId);
      setPublishResult(result);
      setPhase("published");
      toast.success("Website published successfully!");
    } catch (err: any) {
      toast.error(err?.message ?? "Publishing failed. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (phase === "checking") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/app/websites")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-7 w-48" />
        </div>
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "blocked") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/app/websites")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
              AI Website Builder
            </h1>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              Upgrade to build your website with AI.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary)/0.1)]">
              <Sparkles className="h-7 w-7 text-[rgb(var(--color-primary))]" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
              AI Website Builder is available on your eligible plan
            </h2>
            <p className="mt-2 max-w-md text-sm text-[rgb(var(--color-muted-foreground))]">
              Upgrade to unlock AI website generation with your Doloyal business data. The
              Doloyal Team service stays available on every plan.
            </p>

            <div className="mt-6 grid w-full max-w-md gap-3 sm:grid-cols-2">
              <PlanCard label="Current Plan" name={currentPlanName} current />
              <PlanCard label="Required Plan" name={requiredPlan?.name ?? "Growth"} />
            </div>

            <div className="mt-6 flex w-full max-w-md flex-col gap-2 sm:flex-row">
              <Link href="/app/billing" className="flex-1">
                <Button className="w-full sm:w-auto sm:min-w-[12rem]">
                  Upgrade Plan
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/app/websites/new" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Users className="h-4 w-4" />
                  From Doloyal Team instead
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary)/0.1)] lf-pulse-soft">
            <Sparkles className="h-6 w-6 text-[rgb(var(--color-primary))]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
            Building your website with AI
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
            We&apos;re using your business data to design your site…
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <ol className="space-y-3">
              {GENERATION_STEPS.map((label, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6rem]",
                        done
                          ? "bg-[rgb(var(--color-success)/0.15)] text-[rgb(var(--color-success))]"
                          : active
                            ? "bg-[rgb(var(--color-primary))] text-white"
                            : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]",
                      )}
                    >
                      {done ? (
                        <Check className="h-3 w-3" />
                      ) : active ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        done || active
                          ? "font-medium text-[rgb(var(--color-foreground))]"
                          : "text-[rgb(var(--color-muted-foreground))]",
                      )}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
              <div
                className="h-full rounded-full bg-[rgb(var(--color-primary))] transition-all duration-500"
                style={{ width: `${Math.round((Math.min(stepIndex + 1, GENERATION_STEPS.length) / GENERATION_STEPS.length) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-center text-[0.6rem] uppercase tracking-widest text-[rgb(var(--color-muted-foreground))]">
              {GENERATION_STEPS[Math.min(stepIndex, GENERATION_STEPS.length - 1)]}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <Card>
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-danger)/0.1)]">
              <Loader2 className="h-6 w-6 text-[rgb(var(--color-danger))]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[rgb(var(--color-foreground))]">
              We couldn&apos;t generate your website
            </h2>
            <p className="mt-1 max-w-sm text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
            <div className="mt-6 flex gap-2">
              <Button onClick={() => setPhase("prompt")}>
                <ArrowLeft className="h-4 w-4" />
                Try again
              </Button>
              <Button variant="secondary" onClick={() => router.push("/app/websites")}>
                Back to Website Builder
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "ready" || phase === "publishing") {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-success)/0.12)]">
            <CheckCircle2 className="h-7 w-7 text-[rgb(var(--color-success))]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
            Website Ready
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
            {websiteName} is ready to preview, edit, and publish.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)]">
                  <Globe className="h-5 w-5 text-[rgb(var(--color-primary))]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{websiteName}</p>
                  <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                    {slugToDomain(websiteSlug)}
                  </p>
                </div>
              </div>
              <Badge variant="success">{pageCount || "—"} pages</Badge>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Button asChild>
                <Link href={`/app/websites/builder/${websiteId}`}>
                  <Globe className="h-4 w-4" />
                  Preview Website
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/app/websites/builder/${websiteId}`}>
                  <Sparkles className="h-4 w-4" />
                  Edit Website
                </Link>
              </Button>
              <Button variant="outline" onClick={publish} loading={publishing || phase === "publishing"}>
                {publishing ? "Publishing…" : "Publish Website"}
              </Button>
            </div>

            <p className="mt-4 text-center text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
              Preview and Edit open the full website workspace where you can refine sections,
              pages and settings before going live.
            </p>

            <div className="mt-5">
              <Button
                variant="ghost"
                className="w-full text-[rgb(var(--color-muted-foreground))]"
                onClick={() => {
                  setPrompt("");
                  setPhase("prompt");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Start another website
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── phase === "published" ──────────────────────────────────────────────────
  if (phase === "published") {
    const liveUrl = publishResult?.liveUrl;
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-success)/0.12)]">
            <Rocket className="h-7 w-7 text-[rgb(var(--color-success))]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
            Website Published
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
            Your website is live on your Doloyal subdomain.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] px-4 py-3">
              <div>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Live URL</p>
                <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{liveUrl}</p>
              </div>
              <Badge variant="success">Live</Badge>
            </div>
            <a href={liveUrl} target="_blank" rel="noreferrer">
              <Button className="w-full">
                Visit Website
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/app/websites/builder/${websiteId}`}>Continue editing</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── prompt phase ───────────────────────────────────────────────────────────
  const dataRows: { icon: React.ReactNode; label: string; value?: string }[] = [
    { icon: <Palette className="h-4 w-4" />, label: "Business", value: tenant?.name },
    { icon: <Sparkles className="h-4 w-4" />, label: "Category", value: businessCategory },
    { icon: <MapPin className="h-4 w-4" />, label: "Location", value: tenant ? [tenant.city, tenant.address].filter(Boolean).join(", ") : undefined },
    { icon: <Phone className="h-4 w-4" />, label: "Phone", value: tenant?.phone },
  ].filter((r) => r.value);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/app/websites")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
            Build Your Website with AI
          </h1>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Tell us about your business and what you want your website to look like.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">
                  We already have your business data
                </p>
                <p className="text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
                  Services, pricing, staff, brand colors, booking & loyalty — no need to re-enter anything.
                </p>
              </div>
            </div>
            <Badge variant="success" className="hidden sm:inline-flex">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {dataRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-2.5 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]">
                  {row.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.55rem] uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                    {row.label}
                  </p>
                  <p className="truncate text-xs font-medium text-[rgb(var(--color-foreground))]">{row.value}</p>
                </div>
              </div>
            ))}
            {tenant?.brandColor ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-3 py-2.5">
                <span
                  className="h-7 w-7 shrink-0 rounded-md border border-[rgb(var(--color-border))]"
                  style={{ backgroundColor: tenant.brandColor }}
                />
                <div className="min-w-0">
                  <p className="text-[0.55rem] uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                    Brand color
                  </p>
                  <p className="truncate text-xs font-medium uppercase text-[rgb(var(--color-foreground))]">
                    {tenant.brandColor}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-[1.25rem] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 shadow-soft">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void generate();
              }
            }}
            placeholder="Describe your business, your style, and what you want your website to include..."
            rows={4}
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-[rgb(var(--color-foreground))] outline-none placeholder:text-[rgb(var(--color-muted-foreground)/0.7)]"
          />
          <div className="mt-2 flex items-center justify-between border-t border-[rgb(var(--color-border))] pt-3">
            <span className="hidden text-[0.6rem] text-[rgb(var(--color-muted-foreground))] sm:block">
              Enter to generate · Shift+Enter for a new line
            </span>
            <Button onClick={generate} disabled={!prompt.trim()} className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4" />
              Generate Website
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-center text-[0.6rem] uppercase tracking-widest text-[rgb(var(--color-muted-foreground))]">
            Try an example
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3.5 py-1.5 text-xs text-[rgb(var(--color-muted-foreground))] transition-colors hover:border-[rgb(var(--color-primary)/0.4)] hover:text-[rgb(var(--color-primary))]"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ label, name, current }: { label: string; name: string; current?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-left",
        current ? "border-[rgb(var(--color-border))]" : "border-[rgb(var(--color-primary)/0.5)] bg-[rgb(var(--color-primary)/0.05)]",
      )}
    >
      <p className="text-[0.55rem] uppercase tracking-widest text-[rgb(var(--color-muted-foreground))]">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-base font-semibold text-[rgb(var(--color-foreground))]">{name}</p>
        {current ? <Badge variant="outline">Yours</Badge> : <Badge variant="primary">Required</Badge>}
      </div>
    </div>
  );
}