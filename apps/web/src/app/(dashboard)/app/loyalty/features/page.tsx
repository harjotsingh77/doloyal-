"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { Search, SlidersHorizontal, X, ArrowLeft } from "lucide-react";
import { Button, Input, Skeleton, Switch, cn } from "@doloyal/ui";
import {
  LOYALTY_FEATURE_CATEGORIES,
  type FeatureFlagState,
  type LoyaltyFeatureCategory,
} from "@doloyal/shared";
import { useLoyaltyFeatures } from "@/lib/loyalty-features-context";
import { useAuth } from "@/lib/auth";
import { FeatureConfigureDrawer } from "@/components/loyalty/configure-drawer";

function MinimalIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Lucide as any)[name] as React.ComponentType<{ className?: string }> | undefined;
  if (!IconComponent) {
    return <SlidersHorizontal className={cn("h-4 w-4 shrink-0 text-slate-400", className)} />;
  }
  return <IconComponent className={cn("h-4 w-4 shrink-0 text-slate-400", className)} />;
}

export default function FeatureManagementPage() {
  const { features, loading, toggle, updateConfig } = useLoyaltyFeatures();
  const { user } = useAuth();
  const isOwner = user?.activeRole === "OWNER" || (user as any)?.role === "OWNER";

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<LoyaltyFeatureCategory | "All">("All");
  const [configureFeature, setConfigureFeature] = React.useState<FeatureFlagState | null>(null);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);

  const coreCount = features.filter((f) => f.core).length;
  const enabledOptionalCount = features.filter((f) => f.enabled && !f.core).length;
  const disabledOptionalCount = features.filter((f) => !f.enabled && !f.core).length;

  const filtered = React.useMemo(() => {
    return features.filter((f) => {
      if (category !== "All" && f.category !== category) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.key.includes(q)
        );
      }
      return true;
    });
  }, [features, category, query]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/app/loyalty">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Loyalty
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Feature Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enable a module and it appears instantly on the Loyalty page below Leaderboard —
            fully connected to APIs, data, and automations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
            Core <span className="ml-1 font-bold">{coreCount}</span>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2 text-xs text-blue-700 shadow-sm">
            Enabled <span className="ml-1 font-bold">{enabledOptionalCount}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
            Disabled <span className="ml-1 font-bold">{disabledOptionalCount}</span>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-10 border-slate-200 bg-slate-50/50 pl-10 text-sm focus:bg-white"
            placeholder="Search modules…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setCategory("All")}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition",
              category === "All" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
            )}
          >
            All
          </button>
          {LOYALTY_FEATURE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                category === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((feature) => {
          const isEnabled = feature.core || feature.enabled;
          return (
            <motion.div
              key={feature.key}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex min-h-[190px] flex-col justify-between rounded-2xl border p-5 shadow-sm transition",
                isEnabled
                  ? "border-blue-200 bg-gradient-to-b from-blue-50/30 via-white to-white"
                  : "border-slate-200/80 bg-slate-50/50 opacity-80",
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <MinimalIcon name={feature.icon} />
                    <h3 className="truncate text-base font-semibold text-slate-900">{feature.name}</h3>
                  </div>
                  {feature.core ? (
                    <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      Core
                    </span>
                  ) : (
                    <Switch
                      checked={feature.enabled}
                      disabled={!isOwner || pendingKey === feature.key}
                      onCheckedChange={async (checked) => {
                        if (!isOwner) {
                          toast.error("Only business owners can modify loyalty modules");
                          return;
                        }
                        try {
                          setPendingKey(feature.key);
                          await toggle(feature.key, checked);
                          toast.success(
                            checked
                              ? `${feature.name} enabled — now on Loyalty page`
                              : `${feature.name} disabled — removed from Loyalty page`,
                          );
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Toggle failed");
                        } finally {
                          setPendingKey(null);
                        }
                      }}
                    />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="rounded-md bg-slate-100/90 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {feature.category}
                </span>
                <Button
                  size="sm"
                  variant={isEnabled ? "secondary" : "ghost"}
                  disabled={!isEnabled}
                  onClick={() => setConfigureFeature(feature)}
                  className="h-8 px-3 text-xs"
                >
                  Configure
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center text-sm text-slate-500">
          No loyalty modules found matching your filters.
        </div>
      ) : null}

      <FeatureConfigureDrawer
        feature={configureFeature}
        open={!!configureFeature}
        onClose={() => setConfigureFeature(null)}
        onSave={async (config) => {
          if (!configureFeature) return;
          await updateConfig(configureFeature.key, config);
          toast.success(`${configureFeature.name} settings saved`);
          setConfigureFeature(null);
        }}
      />
    </div>
  );
}
