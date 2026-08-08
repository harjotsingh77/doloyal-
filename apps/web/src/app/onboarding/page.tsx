"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  Phone,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  Logo,
  Field,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@doloyal/ui";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  LOYALTY_MODE_LABELS,
} from "@doloyal/shared";
import { onboardTenantSchema } from "@doloyal/shared";
import type { OnboardTenantInput } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const TOTAL_STEPS = 3;

type StepData = "business" | "contact" | "loyalty";

/**
 * Use the *input* shape of the schema (fields with `.default()` are optional)
 * so that react-hook-form + zodResolver agree on the type without casting.
 */
type OnboardFormValues = z.input<typeof onboardTenantSchema>;

/**
 * Client-side validation schemas for each step. These are subsets of the
 * full `onboardTenantSchema` so the user only sees errors for the current
 * step's fields.
 */
const step1Schema = onboardTenantSchema.pick({ name: true, category: true });
const step2Schema = onboardTenantSchema.pick({
  phone: true,
  email: true,
  address: true,
});
const step3Schema = onboardTenantSchema.pick({ loyalty: true });

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const submitted = React.useRef(false); // duplicate-submission guard

  const form = useForm<OnboardFormValues>({
    resolver: zodResolver(onboardTenantSchema),
    defaultValues: {
      name: "",
      category: undefined,
      phone: "",
      email: "",
      address: "",
      currency: "INR",
      timezone: "Asia/Kolkata",
      brandColor: "#2563EB",
      loyalty: {
        mode: "CURRENCY",
        pointsPerCurrency: 0.1,
        pointsPerVisit: 10,
        currencyPerPoint: 1,
        expiryDays: 365,
      },
    },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const businessName = watch("name");
  const category = watch("category");
  const phone = watch("phone");
  const email = watch("email");
  const loyaltyMode = watch("loyalty.mode");

  // ── Skip onboarding if already completed ──────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const tenant = await api.getTenant();
        if (tenant?.onboardingComplete && !cancelled) {
          await refreshUser();
          router.replace("/app/dashboard");
        }
      } catch {
        // No tenant yet — show onboarding
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [router, refreshUser]);

  // ── Step navigation with per-step validation ──────────────────────
  const validateStep = async (
    s: StepData,
  ): Promise<boolean> => {
    let valid = false;
    switch (s) {
      case "business":
        valid = await trigger(["name", "category"]);
        break;
      case "contact":
        valid = await trigger(["phone", "email"]);
        break;
      case "loyalty":
        valid = await trigger(["loyalty"]);
        break;
    }
    return valid;
  };

  const handleNext = async () => {
    const stepFields: StepData[] = ["business", "contact", "loyalty"];
    const valid = await validateStep(stepFields[step - 1]);
    if (valid && step < TOTAL_STEPS) {
      setStep((step + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3);
  };

  // ── Submit onboarding to the backend ──────────────────────────────
  const onSubmit = React.useCallback(
    async (raw: OnboardFormValues) => {
      // Duplicate-submission guard
      if (submitted.current) return;
      submitted.current = true;
      setSubmitting(true);

      try {
        toast.loading("Setting up your business…", { id: "onboarding" });

        // Parse through the schema so defaults (currency, timezone, brandColor)
        // are applied and the output matches OnboardTenantInput exactly.
        const data = onboardTenantSchema.parse(raw);

        await api.onBoardTenant(data);

        toast.success("Business created!", {
          id: "onboarding",
          description: `${data.name} is ready. Let's go!`,
          duration: 3000,
        });

        await refreshUser();
        router.push("/app/dashboard");
      } catch (err) {
        submitted.current = false; // allow retry
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";

        toast.error("Setup failed", {
          id: "onboarding",
          description: message,
          duration: 6000,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [refreshUser, router],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[rgb(var(--color-background))] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 flex flex-col items-center">
          <Logo size={36} />
          <h1 className="mt-6 text-xl font-semibold tracking-tight">
            Set up your business
          </h1>
          <p className="mt-1.5 text-sm text-[rgb(var(--color-muted-foreground))]">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 flex gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                i + 1 <= step
                  ? "bg-[rgb(var(--color-primary))]"
                  : "bg-[rgb(var(--color-muted))]"
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {/* ── Step 1: Business Details ─────────────────────── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold">
                        Business Details
                      </h2>
                      <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                        Tell us about your business.
                      </p>
                    </div>
                    <Field
                      label="Business name"
                      required
                      error={errors.name?.message}
                    >
                      <Input
                        placeholder="e.g. Elegance Salon"
                        {...register("name")}
                      />
                    </Field>
                    <Field
                      label="Category"
                      required
                      error={errors.category?.message}
                    >
                      <Select
                        value={category ?? ""}
                        onValueChange={(v) =>
                          setValue("category", v as any, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {BUSINESS_CATEGORY_LABELS[cat]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={
                          !businessName ||
                          businessName.length < 2 ||
                          !category
                        }
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: Contact Info ─────────────────────────── */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold">Contact Info</h2>
                      <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                        How can customers reach you?
                      </p>
                    </div>
                    <Field
                      label="Phone number"
                      required
                      error={errors.phone?.message}
                    >
                      <Input
                        placeholder="+91 98765 43210"
                        {...register("phone")}
                      />
                    </Field>
                    <Field
                      label="Email"
                      required
                      error={errors.email?.message}
                    >
                      <Input
                        type="email"
                        placeholder="hello@mysalon.com"
                        {...register("email")}
                      />
                    </Field>
                    <Field
                      label="Address"
                      error={errors.address?.message}
                    >
                      <Input
                        placeholder="Shop no. 5, Main Road, Mumbai"
                        {...register("address")}
                      />
                    </Field>
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBack}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={
                          !phone ||
                          phone.length < 7 ||
                          !email ||
                          !email.includes("@")
                        }
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: Loyalty Preferences ──────────────────── */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold">
                        Loyalty Preferences
                      </h2>
                      <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                        Configure how customers earn points.
                      </p>
                    </div>
                    <Field label="Loyalty mode" required>
                      <Select
                        value={loyaltyMode ?? "CURRENCY"}
                        onValueChange={(v) =>
                          setValue("loyalty.mode", v as any, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LOYALTY_MODE_LABELS).map(
                            ([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Points per ₹">
                        <Input
                          type="number"
                          step="0.1"
                          {...register("loyalty.pointsPerCurrency", {
                            valueAsNumber: true,
                          })}
                        />
                      </Field>
                      <Field label="Points per visit">
                        <Input
                          type="number"
                          {...register("loyalty.pointsPerVisit", {
                            valueAsNumber: true,
                          })}
                        />
                      </Field>
                    </div>
                    <Field label="Points expiry (days)">
                      <Input
                        type="number"
                        {...register("loyalty.expiryDays", {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBack}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        loading={submitting}
                        disabled={submitting}
                      >
                        <Sparkles className="h-4 w-4" />
                        Get Started
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </div>
  );
}
