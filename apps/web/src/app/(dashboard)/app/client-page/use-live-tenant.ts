"use client";

import * as React from "react";
import type { Tenant } from "@doloyal/shared";
import { useTenant, useSetTenantCache, useUpdateTenant } from "@/lib/tenant-query";

const SAVE_MS = 450;

export type LiveBrand = {
  brandName: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  coverBannerUrl: string | null;
  brandColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
};

function brandFromTenant(tenant: Tenant | null): LiveBrand {
  return {
    brandName: tenant?.brandName?.trim() || tenant?.name?.trim() || "",
    tagline: tenant?.tagline ?? "",
    description: tenant?.description ?? "",
    logoUrl: tenant?.logoUrl ?? null,
    coverBannerUrl: tenant?.coverBannerUrl ?? null,
    brandColor: tenant?.brandColor ?? null,
    secondaryColor: tenant?.secondaryColor ?? null,
    backgroundColor: tenant?.backgroundColor ?? null,
    textColor: tenant?.textColor ?? null,
  };
}

function applyBrand(tenant: Tenant, brand: LiveBrand): Tenant;
function applyBrand(tenant: Tenant | null, brand: LiveBrand): Tenant | null;
function applyBrand(tenant: Tenant | null, brand: LiveBrand): Tenant | null {
  if (!tenant) return tenant;
  return {
    ...tenant,
    brandName: brand.brandName.trim() || tenant.name,
    tagline: brand.tagline,
    description: brand.description,
    logoUrl: brand.logoUrl,
    coverBannerUrl: brand.coverBannerUrl,
    brandColor: brand.brandColor || tenant.brandColor,
    secondaryColor: brand.secondaryColor,
    backgroundColor: brand.backgroundColor,
    textColor: brand.textColor,
  };
}

/**
 * Local brand draft is the source of truth for the client-page preview.
 * React Query / the server follow in the background so typing never waits
 * on a refetch that would wipe the iframe.
 */
export function useLiveTenant(fallback: Tenant | null) {
  const { data } = useTenant();
  const setTenantCache = useSetTenantCache();
  const updateTenant = useUpdateTenant();
  const queryTenant = data ?? fallback;
  const queryTenantRef = React.useRef(queryTenant);
  queryTenantRef.current = queryTenant;

  const [draft, setDraft] = React.useState<LiveBrand>(() => brandFromTenant(queryTenant));
  const seeded = React.useRef(Boolean(queryTenant));
  const dirty = React.useRef(false);
  const pending = React.useRef<Record<string, unknown>>({});
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutateAsyncRef = React.useRef(updateTenant.mutateAsync);
  mutateAsyncRef.current = updateTenant.mutateAsync;

  React.useEffect(() => {
    if (!queryTenant || seeded.current || dirty.current) return;
    seeded.current = true;
    setDraft(brandFromTenant(queryTenant));
  }, [queryTenant]);

  const flush = React.useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const payload = pending.current;
    pending.current = {};
    if (Object.keys(payload).length) await mutateAsyncRef.current(payload);
  }, []);

  const patchBrand = React.useCallback((patch: Record<string, unknown>) => {
    dirty.current = true;
    seeded.current = true;
    setDraft((current) => {
      const next = { ...current, ...patch } as LiveBrand;
      const base = queryTenantRef.current;
      if (base) setTenantCache(applyBrand(base, next));
      return next;
    });
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const payload = pending.current;
      pending.current = {};
      if (Object.keys(payload).length) void mutateAsyncRef.current(payload);
    }, SAVE_MS);
  }, [setTenantCache]);

  const tenant = React.useMemo(() => applyBrand(queryTenant, draft), [queryTenant, draft]);

  React.useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  return { tenant, draft, patchBrand, flush };
}
