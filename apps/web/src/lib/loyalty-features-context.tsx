"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type { FeatureFlagState, FeatureFlagCatalogResponse } from "@doloyal/shared";
import { isCoreLoyaltyFeature } from "@doloyal/shared";
import { useResource } from "@/lib/use-resource";
import { getStaffAuthToken } from "@/lib/access-token";
import { writeQuerySnapshot } from "@/lib/api-cache";

type FeaturesContextValue = {
  features: FeatureFlagState[];
  enabledKeys: Set<string>;
  loading: boolean;
  isEnabled: (key: string) => boolean;
  refresh: () => Promise<void>;
  setCatalog: (catalog: FeatureFlagCatalogResponse) => void;
  toggle: (key: string, enabled: boolean) => Promise<FeatureFlagCatalogResponse>;
  updateConfig: (key: string, config: Record<string, unknown>) => Promise<FeatureFlagCatalogResponse>;
};

const FeaturesContext = React.createContext<FeaturesContextValue | null>(null);
const FLAGS_KEY = ["loyalty-feature-flags"] as const;

export function LoyaltyFeaturesProvider({ children }: { children: React.ReactNode }) {
  const catalogQuery = useResource<FeatureFlagCatalogResponse>({
    queryKey: FLAGS_KEY,
    queryFn: () => api.getFeatureFlags(),
    scopes: ["loyalty"],
  });

  const [local, setLocal] = React.useState<FeatureFlagCatalogResponse | null>(null);

  React.useEffect(() => {
    if (catalogQuery.data) setLocal(catalogQuery.data);
  }, [catalogQuery.data]);

  const catalog = local ?? catalogQuery.data ?? null;
  const features = catalog?.features ?? [];
  const enabledKeys = React.useMemo(
    () => new Set(catalog?.enabledKeys ?? ["program_settings", "leaderboard"]),
    [catalog],
  );
  const loading = catalogQuery.isLoading && !catalog;

  const applyCatalog = React.useCallback((next: FeatureFlagCatalogResponse) => {
    setLocal(next);
    writeQuerySnapshot(FLAGS_KEY, getStaffAuthToken(), next);
  }, []);

  const refresh = React.useCallback(async () => {
    const result = await catalogQuery.refetch();
    if (result.data) applyCatalog(result.data);
  }, [catalogQuery, applyCatalog]);

  const isEnabled = React.useCallback(
    (key: string) => isCoreLoyaltyFeature(key) || enabledKeys.has(key),
    [enabledKeys],
  );

  const toggle = React.useCallback(
    async (key: string, enabled: boolean) => {
      const next = await api.toggleFeatureFlag(key, enabled);
      applyCatalog(next);
      return next;
    },
    [applyCatalog],
  );

  const updateConfig = React.useCallback(
    async (key: string, config: Record<string, unknown>) => {
      const next = await api.updateFeatureConfig(key, config);
      applyCatalog(next);
      return next;
    },
    [applyCatalog],
  );

  const value = React.useMemo(
    () => ({
      features,
      enabledKeys,
      loading,
      isEnabled,
      refresh,
      setCatalog: applyCatalog,
      toggle,
      updateConfig,
    }),
    [features, enabledKeys, loading, isEnabled, refresh, applyCatalog, toggle, updateConfig],
  );

  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useLoyaltyFeatures() {
  const ctx = React.useContext(FeaturesContext);
  if (!ctx) throw new Error("useLoyaltyFeatures must be used within LoyaltyFeaturesProvider");
  return ctx;
}
