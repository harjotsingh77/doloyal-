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

export default function LoyaltyPage() {
  const { features, enabledKeys, loading, isEnabled, updateConfig, refresh } =
    useLoyaltyFeatures();
  const [configureKey, setConfigureKey] = React.useState<string | null>(null);
  const [overview, setOverview] = React.useState<any>(null);

  const ordered = React.useMemo(() => {
    const defs = getOrderedLoyaltyPageFeatures(enabledKeys);
    return defs
      .map((def) => features.find((f) => f.key === def.key))
      .filter((f): f is FeatureFlagState => !!f && (f.core || isEnabled(f.key)));
  }, [enabledKeys, features, isEnabled]);

  const configureFeature = configureKey
    ? features.find((f) => f.key === configureKey) || null
    : null;

  React.useEffect(() => {
    api
      .getLoyaltyOverview()
      .then(setOverview)
      .catch(() => setOverview(null));
  }, [enabledKeys]);

  const navItems = ordered.map((f) => ({
    id: f.sectionId || f.key,
    label: f.name,
  }));

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.08),_transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              Loyalty OS
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Loyalty
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
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
        <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
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
                className="rounded-[18px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
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
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-900">
                  Enable modules from Feature Management
                </p>
                <p className="mt-1 text-sm text-slate-500">
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
