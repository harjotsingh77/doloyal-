"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Switch,
} from "@doloyal/ui";
import {
  WEBSITE_TYPES,
  WEBSITE_TYPE_LABELS,
  DESIGN_STYLES,
  DESIGN_STYLE_LABELS,
  WEBSITE_FEATURES,
  WEBSITE_FEATURE_LABELS,
  PAGE_COUNT_OPTIONS,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { cn } from "@doloyal/ui";

const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Business" },
  { id: 3, label: "Design" },
  { id: 4, label: "Review" },
];

type Requirement = {
  businessName: string;
  businessType: string;
  businessLocation: string;
  businessPhone: string;
  businessEmail: string;
  existingWebsiteUrl: string;
  websiteTypes: string[];
  designStyle: string[];
  designPreference: string;
  referenceUrl: string;
  hasLogo: boolean;
  pageCount: string;
  requiredFeatures: string[];
  additionalRequirements: string;
};

export default function NewWebsiteProjectPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);

  const [name, setName] = React.useState("");
  const [websiteType, setWebsiteType] = React.useState("BUSINESS");
  const [goal, setGoal] = React.useState("");

  const [req, setReq] = React.useState<Requirement>({
    businessName: "",
    businessType: "",
    businessLocation: "",
    businessPhone: "",
    businessEmail: "",
    existingWebsiteUrl: "",
    websiteTypes: [],
    designStyle: [],
    designPreference: "SUGGEST",
    referenceUrl: "",
    hasLogo: false,
    pageCount: "4-6",
    requiredFeatures: [],
    additionalRequirements: "",
  });

  const set = <K extends keyof Requirement>(key: K, value: Requirement[K]) =>
    setReq((r) => ({ ...r, [key]: value }));

  const toggleArray = (key: "designStyle" | "websiteTypes" | "requiredFeatures", value: string) =>
    set(key, req[key].includes(value) ? req[key].filter((v) => v !== value) : [...req[key], value]);

  const canContinue = React.useMemo(() => {
    if (step === 1) return name.trim().length > 0 && websiteType.length > 0;
    if (step === 2) return req.businessName.trim().length > 0 && req.businessType.trim().length > 0;
    if (step === 3) return req.designPreference.length > 0;
    return true;
  }, [step, name, websiteType, req.businessName, req.businessType, req.designPreference]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const project = await api.createWebsiteProject({
        name: name.trim(),
        websiteType,
        goal: goal.trim() || undefined,
        requirements: {
          businessName: req.businessName.trim(),
          businessType: req.businessType.trim(),
          businessLocation: req.businessLocation.trim() || undefined,
          businessPhone: req.businessPhone.trim() || undefined,
          businessEmail: req.businessEmail.trim() || undefined,
          existingWebsiteUrl: req.existingWebsiteUrl.trim() || undefined,
          websiteTypes: req.websiteTypes,
          designStyle: req.designStyle,
          designPreference: req.designPreference,
          referenceUrl: req.referenceUrl.trim() || undefined,
          hasLogo: req.hasLogo,
          pageCount: req.pageCount,
          requiredFeatures: req.requiredFeatures,
          additionalRequirements: req.additionalRequirements.trim() || undefined,
        },
      });
      router.push(`/app/websites/${project.id}`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/websites">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
            From Doloyal Team
          </h1>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Tell us what you need and our team will design, build, and connect your website for you.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <li className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  step > s.id
                    ? "bg-[rgb(var(--color-success)/0.15)] text-[rgb(var(--color-success))]"
                    : step === s.id
                      ? "bg-[rgb(var(--color-primary))] text-white"
                      : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]",
                )}
              >
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  step === s.id ? "text-[rgb(var(--color-foreground))]" : "text-[rgb(var(--color-muted-foreground))]",
                )}
              >
                {s.label}
              </span>
            </li>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-[rgb(var(--color-border))]" />}
          </React.Fragment>
        ))}
      </ol>

      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <SectionHeading
                icon={<Globe className="h-4 w-4" />}
                title="What should we build?"
                description="Pick the kind of website that best fits your business."
              />
              <div>
                <Label>Project name *</Label>
                <Input
                  placeholder="e.g. My Salon Website"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Website type *</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {WEBSITE_TYPES.map((t) => (
                    <TypeOption
                      key={t}
                      active={websiteType === t}
                      onClick={() => setWebsiteType(t)}
                      title={WEBSITE_TYPE_LABELS[t]}
                      description={typeDescription(t)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>What&apos;s your main goal?</Label>
                <Textarea
                  placeholder="e.g. Get more online bookings, showcase our services, accept orders…"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <SectionHeading
                icon={<Sparkles className="h-4 w-4" />}
                title="About your business"
                description="This helps our team design a site that's genuinely yours."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Business name *</Label>
                  <Input
                    placeholder="e.g. Elegance Salon"
                    value={req.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Business type *</Label>
                  <Input
                    placeholder="e.g. Beauty salon, restaurant, clinic…"
                    value={req.businessType}
                    onChange={(e) => set("businessType", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. Mumbai, India"
                    value={req.businessLocation}
                    onChange={(e) => set("businessLocation", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={req.businessPhone}
                    onChange={(e) => set("businessPhone", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Business email</Label>
                  <Input
                    type="email"
                    placeholder="hello@yourbusiness.com"
                    value={req.businessEmail}
                    onChange={(e) => set("businessEmail", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Existing website (optional)</Label>
                  <Input
                    placeholder="https://…"
                    value={req.existingWebsiteUrl}
                    onChange={(e) => set("existingWebsiteUrl", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <SectionHeading
                icon={<Sparkles className="h-4 w-4" />}
                title="Design direction"
                description="Pick the styles you love — our designers will take it from there."
              />
              <div>
                <Label>Design style (pick any)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DESIGN_STYLES.map((s) => (
                    <Chip
                      key={s}
                      active={req.designStyle.includes(s)}
                      onClick={() => toggleArray("designStyle", s)}
                    >
                      {DESIGN_STYLE_LABELS[s]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>Design preference *</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <PreferenceOption
                    active={req.designPreference === "SUGGEST"}
                    onClick={() => set("designPreference", "SUGGEST")}
                    title="Surprise me"
                    description="Our designers choose the best direction for your business."
                  />
                  <PreferenceOption
                    active={req.designPreference === "REFERENCE"}
                    onClick={() => set("designPreference", "REFERENCE")}
                    title="I have a reference"
                    description="Share a website you love and we'll take inspiration from it."
                  />
                </div>
                {req.designPreference === "REFERENCE" && (
                  <div className="mt-3">
                    <Label>Reference website URL</Label>
                    <Input
                      placeholder="https://…"
                      value={req.referenceUrl}
                      onChange={(e) => set("referenceUrl", e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--color-border))] p-4">
                <div>
                  <Label className="text-sm font-medium">I have a logo ready</Label>
                  <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                    You can share brand files later in the project chat.
                  </p>
                </div>
                <Switch checked={req.hasLogo} onCheckedChange={(v) => set("hasLogo", Boolean(v))} />
              </div>
              <div>
                <Label>Approximate number of pages</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PAGE_COUNT_OPTIONS.map((p) => (
                    <Chip key={p} active={req.pageCount === p} onClick={() => set("pageCount", p)}>
                      {p} pages
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>Features you need (pick any)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEBSITE_FEATURES.map((f) => (
                    <Chip
                      key={f}
                      active={req.requiredFeatures.includes(f)}
                      onClick={() => toggleArray("requiredFeatures", f)}
                    >
                      {WEBSITE_FEATURE_LABELS[f]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>Anything else we should know?</Label>
                <Textarea
                  placeholder="Colors, tone, pages you need, ideas…"
                  value={req.additionalRequirements}
                  onChange={(e) => set("additionalRequirements", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <ReviewStep
              name={name}
              websiteType={websiteType}
              goal={goal}
              req={req}
            />
          )}

          <div className="mt-8 flex items-center justify-between border-t border-[rgb(var(--color-border))] pt-5">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} loading={submitting}>
                {submitting ? "Submitting…" : "Submit Request"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionHeading({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.08)] text-[rgb(var(--color-primary))]">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{title}</h2>
        <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">{description}</p>
      </div>
    </div>
  );
}

function TypeOption({ active, onClick, title, description }: { active: boolean; onClick: () => void; title: string; description: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        active
          ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.06)] ring-1 ring-[rgb(var(--color-primary)/0.4)]"
          : "border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-muted))]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))] text-white" : "border-[rgb(var(--color-border))]",
        )}
      >
        {active && <Check className="h-3 w-3" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-[rgb(var(--color-foreground))]">{title}</span>
        <span className="mt-0.5 block text-xs text-[rgb(var(--color-muted-foreground))]">{description}</span>
      </span>
    </button>
  );
}

function PreferenceOption({ active, onClick, title, description }: { active: boolean; onClick: () => void; title: string; description: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        active
          ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.06)] ring-1 ring-[rgb(var(--color-primary)/0.4)]"
          : "border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-muted))]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))] text-white" : "border-[rgb(var(--color-border))]",
        )}
      >
        {active && <Check className="h-3 w-3" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-[rgb(var(--color-foreground))]">{title}</span>
        <span className="mt-0.5 block text-xs text-[rgb(var(--color-muted-foreground))]">{description}</span>
      </span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
          : "border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]",
      )}
    >
      {children}
    </button>
  );
}

function typeDescription(t: string): string {
  const map: Record<string, string> = {
    BUSINESS: "A polished site that tells your story and builds trust.",
    BOOKING: "Online booking so customers can schedule anytime.",
    E_COMMERCE: "Sell products or services directly from your site.",
    PORTFOLIO: "Showcase your work and attract new clients.",
    LANDING_PAGE: "A focused, high-converting single page.",
    BLOG: "Publish content, tips, and updates for your audience.",
  };
  return map[t] ?? "";
}

function ReviewStep({
  name,
  websiteType,
  goal,
  req,
}: {
  name: string;
  websiteType: string;
  goal: string;
  req: Requirement;
}) {
  return (
    <div className="space-y-5">
      <SectionHeading
        icon={<CheckCircle2 className="h-4 w-4" />}
        title="Review your request"
        description="Once submitted, our team will review it and reach out in the project chat."
      />
      <dl className="space-y-3 rounded-xl border border-[rgb(var(--color-border))] p-5 text-sm">
        <ReviewRow label="Project name" value={name} />
        <ReviewRow
          label="Website type"
          value={WEBSITE_TYPE_LABELS[websiteType as keyof typeof WEBSITE_TYPE_LABELS] ?? websiteType}
        />
        {goal ? <ReviewRow label="Goal" value={goal} /> : null}
        <ReviewRow label="Business" value={`${req.businessName} · ${req.businessType}`} />
        {req.businessLocation ? <ReviewRow label="Location" value={req.businessLocation} /> : null}
        <ReviewRow
          label="Design styles"
          value={req.designStyle.map((s) => DESIGN_STYLE_LABELS[s as keyof typeof DESIGN_STYLE_LABELS]).join(", ") || "Let our designers decide"}
        />
        <ReviewRow
          label="Preference"
          value={req.designPreference === "REFERENCE" ? `Reference website${req.referenceUrl ? ` (${req.referenceUrl})` : ""}` : "Surprise me"}
        />
        <ReviewRow label="Pages" value={`${req.pageCount} pages`} />
        <ReviewRow
          label="Features"
          value={req.requiredFeatures.map((f) => WEBSITE_FEATURE_LABELS[f as keyof typeof WEBSITE_FEATURE_LABELS]).join(", ") || "None selected"}
        />
        {req.hasLogo ? <ReviewRow label="Logo" value="Have a logo ready" /> : null}
        {req.additionalRequirements ? <ReviewRow label="Notes" value={req.additionalRequirements} /> : null}
      </dl>
      <div className="flex items-center gap-2 rounded-xl bg-[rgb(var(--color-primary)/0.06)] p-4 text-xs text-[rgb(var(--color-muted-foreground))]">
        <Sparkles className="h-4 w-4 shrink-0 text-[rgb(var(--color-primary))]" />
        <p>Our team typically responds within one business day. You&apos;ll chat with us right here on this project.</p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-[rgb(var(--color-muted-foreground))]">{label}</dt>
      <dd className="font-medium text-[rgb(var(--color-foreground))]">{value}</dd>
    </div>
  );
}
