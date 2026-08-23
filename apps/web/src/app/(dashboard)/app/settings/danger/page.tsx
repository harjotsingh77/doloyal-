"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@doloyal/ui";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useSettingsChrome } from "../settings-chrome";
import { SettingsSkeleton, SettingsError } from "../settings-ui";

export default function DangerZonePage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (isLoading || !tenant) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  const active = tenant.businessStatus?.activeBusiness !== false;

  const setActive = async (value: boolean) => {
    if (!tenant.businessStatus) return;
    setStatus("saving");
    try {
      await updateTenant.mutateAsync({
        businessStatus: { ...tenant.businessStatus, activeBusiness: value },
      });
      setStatus("saved");
      toast.success(value ? "Business reactivated" : "Business deactivated");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Danger Zone</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Irregular or destructive operations. Proceed with care.
        </p>
      </div>

      <div className="rounded-xl border border-[rgb(var(--color-danger)/0.35)]">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[rgb(var(--color-danger))]" />
              <p className="text-sm font-medium">
                {active ? "Deactivate this business" : "Reactivate this business"}
              </p>
            </div>
            <p className="mt-1 pl-6 text-xs leading-relaxed text-[rgb(var(--color-muted-foreground))]">
              {active
                ? "Takes your booking page offline and pauses customer-facing operations. Your data is kept and you can reactivate at any time."
                : "Your business is currently deactivated. Reactivating restores booking and public visibility."}
            </p>
          </div>
          {active ? (
            <Button variant="danger" size="sm" className="shrink-0" onClick={() => setConfirmOpen(true)}>
              Deactivate business…
            </Button>
          ) : (
            <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setActive(true)}>
              Reactivate business
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate {tenant.name}?</DialogTitle>
            <DialogDescription>
              Your booking page will go offline and customers won’t be able to book.
              Existing appointments and data are preserved. You can reactivate whenever
              you’re ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={updateTenant.isPending}
              onClick={async () => {
                setConfirmOpen(false);
                await setActive(false);
              }}
            >
              Deactivate business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
