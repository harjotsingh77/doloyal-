"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SlidersHorizontal, RefreshCw } from "lucide-react";
import { Button, Skeleton } from "@doloyal/ui";
import {
  getOrderedLoyaltyPageFeatures,
  type FeatureFlagState,
  type LoyaltyFeatureKey,
} from "@doloyal/shared";
import { useLoyaltyFeatures } from "@/lib/loyalty-features-context";
import { FeatureConfigureDrawer } from "@/components/loyalty/configure-drawer";
import { getLoyaltyModule } from "@/components/loyalty/modules/registry";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

export default function LoyaltyPage() {
  const { features, enabledKeys, loading, isEnabled, updateConfig, refresh } =
    useLoyaltyFeatures();
  const [configureKey, setConfigureKey] = React.useState<string | null>(null);
  // Stable key: keying on the enabled modules fetched the overview twice on
  // every visit (once with the default modules, again when the flags loaded)
  // and never matched the sidebar prefetch.
  const overviewQuery = useResource({
    queryKey: ["loyalty-overview"],
    queryFn: () => api.getLoyaltyOverview().catch(() => null),
    scopes: ["loyalty", "rewards", "customers", "orders"],
  });
  const overview = overviewQuery.data ?? null;

  // Enabling or disabling a module changes the overview; refresh it then.
  const enabledSignature = Array.from(enabledKeys).sort().join(",");
  const lastSignature = React.useRef<string | null>(null);
  const refetchOverview = overviewQuery.refetch;
  React.useEffect(() => {
    if (loading) return;
    if (lastSignature.current !== null && lastSignature.current !== enabledSignature) {
      void refetchOverview();
    }
    lastSignature.current = enabledSignature;
  }, [loading, enabledSignature, refetchOverview]);

  const ordered = React.useMemo(() => {
    const defs = getOrderedLoyaltyPageFeatures(enabledKeys);
    return defs
      .map((def) => features.find((f) => f.key === def.key))
      .filter((f): f is FeatureFlagState => !!f && (f.core || isEnabled(f.key)));
  }, [enabledKeys, features, isEnabled]);

  const configureFeature = configureKey
    ? features.find((f) => f.key === configureKey) || null
    : null;

  const navItems = ordered.map((f) => ({
    id: f.sectionId || f.key,
    label: f.name,
  }));

  return (
    <div>

      <div className="pb-16">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--color-foreground))] md:text-[1.7rem]">
              Loyalty
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--color-muted-foreground))]">
              Program Settings and Leaderboard are always on. Every other module appears
              here instantly when enabled in Feature Management — fully wired to live data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => refresh()}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button asChild size="sm">
              <Link href="/app/loyalty/features">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Feature Management
              </Link>
            </Button>
          </div>
        </div>

        {/* Sticky module nav — only enabled modules */}
        <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface)/0.8)] px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="shrink-0 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--color-muted-foreground))] transition hover:border-[rgb(var(--color-primary)/0.25)] hover:text-[rgb(var(--color-primary))]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Compact overview strip */}
        {overview?.kpis ? (
          <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overview.kpis.slice(0, 4).map((kpi: any) => (
              <div
                key={kpi.key}
                className="rounded-[18px] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-[18px]" />
            <Skeleton className="h-64 rounded-[18px]" />
          </div>
        ) : (
          <div className="space-y-14">
            <AnimatePresence mode="popLayout">
              {ordered.map((feature) => {
                const Module = getLoyaltyModule(feature.key as LoyaltyFeatureKey);
                return (
                  <Module
                    key={feature.key}
                    feature={feature}
                    onConfigure={() => setConfigureKey(feature.key)}
                  />
                );
              })}
            </AnimatePresence>

            {ordered.length <= 2 ? (
              <div className="rounded-[18px] border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.8)] px-6 py-12 text-center">
                <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
                  Enable modules from Feature Management
                </p>
                <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                  Tiers, challenges, badges, rewards, automations, and more will animate in
                  below the Leaderboard the moment you turn them on.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/app/loyalty/features">Open Feature Management</Link>
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <FeatureConfigureDrawer
        feature={configureFeature}
        open={!!configureFeature}
        onClose={() => setConfigureKey(null)}
        onSave={async (config) => {
          try {
            await updateConfig(configureFeature!.key, config);
            toast.success("Configuration saved");
            setConfigureKey(null);
          } catch (e: any) {
            toast.error(e?.message || "Failed to save");
          }
        }}
      />
    </div>
  );
}
