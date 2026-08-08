"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type { FeatureFlagState, FeatureFlagCatalogResponse } from "@doloyal/shared";
import { isCoreLoyaltyFeature } from "@doloyal/shared";

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

export function LoyaltyFeaturesProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = React.useState<FeatureFlagState[]>([]);
  const [enabledKeys, setEnabledKeys] = React.useState<Set<string>>(new Set(["program_settings", "leaderboard"]));
  const [loading, setLoading] = React.useState(true);

  const applyCatalog = React.useCallback((catalog: FeatureFlagCatalogResponse) => {
    setFeatures(catalog.features);
    setEnabledKeys(new Set(catalog.enabledKeys));
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      const catalog = await api.getFeatureFlags();
      applyCatalog(catalog);
    } finally {
      setLoading(false);
    }
  }, [applyCatalog]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const isEnabled = React.useCallback(
    (key: string) => isCoreLoyaltyFeature(key) || enabledKeys.has(key),
    [enabledKeys],
  );

  const toggle = React.useCallback(
    async (key: string, enabled: boolean) => {
      const catalog = await api.toggleFeatureFlag(key, enabled);
      applyCatalog(catalog);
      return catalog;
    },
    [applyCatalog],
  );

  const updateConfig = React.useCallback(
    async (key: string, config: Record<string, unknown>) => {
      const catalog = await api.updateFeatureConfig(key, config);
      applyCatalog(catalog);
      return catalog;
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
