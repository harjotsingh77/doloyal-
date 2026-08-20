"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Play,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Search,
  Unlink,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@doloyal/ui";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { getBrandIcon } from "@/components/integrations/brand-icons";

/* ─── Display metadata ────────────────────────────────────────────────────
 * The provider list and connection state always come from the backend. These
 * small maps only polish how a provider is *presented* (description copy,
 * category grouping and official brand icon). Unknown providers fall back to
 * their backend description, category and a neutral icon.
 */

const CATEGORY_DISPLAY: Record<string, string> = {
  Calendar: "Productivity",
  Payments: "Payments",
  Email: "Email",
  Messaging: "Communication",
};

const DESCRIPTION_OVERRIDE: Record<string, string> = {
  GOOGLE_CALENDAR: "Sync appointments, events, and staff schedules.",
  STRIPE: "Accept payments and manage customer subscriptions.",
  RAZORPAY: "Accept UPI, cards, net banking, and online payments.",
  RESEND: "Send transactional and automated emails.",
  WHATSAPP: "Send automated WhatsApp messages to customers.",
};

const CATEGORY_OPTIONS = ["All", "Payments", "Communication", "Productivity", "Email"];

function displayCategory(backendCategory: string): string {
  return CATEGORY_DISPLAY[backendCategory] ?? backendCategory;
}

function displayDescription(type: string, backendDescription: string): string {
  return DESCRIPTION_OVERRIDE[type.toUpperCase()] ?? backendDescription;
}

export default function IntegrationsPage() {
  const [providers, setProviders] = React.useState<any[]>([]);
  const [integrations, setIntegrations] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [connectDialog, setConnectDialog] = React.useState<string | null>(null);
  const [detailDialog, setDetailDialog] = React.useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = React.useState<string | null>(null);
  const [logsDialog, setLogsDialog] = React.useState<{ type: string; tab: string } | null>(null);
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [connecting, setConnecting] = React.useState<string | null>(null);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [syncing, setSyncing] = React.useState<string | null>(null);
  const [testing, setTesting] = React.useState<string | null>(null);
  const [syncLogs, setSyncLogs] = React.useState<any[]>([]);
  const [webhookEvents, setWebhookEvents] = React.useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);
  const [calendarId, setCalendarId] = React.useState("");
  const [savingCalendar, setSavingCalendar] = React.useState(false);
  const [testEmailTo, setTestEmailTo] = React.useState("");
  const [sendingTest, setSendingTest] = React.useState(false);
  const [resendDomains, setResendDomains] = React.useState<any[]>([]);
  const [loadingDomains, setLoadingDomains] = React.useState(false);
  const [domainsError, setDomainsError] = React.useState<string | null>(null);
  const [newDomain, setNewDomain] = React.useState("");
  const [creatingDomain, setCreatingDomain] = React.useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [provs, list] = await Promise.all([
        api.listIntegrationProviders().catch(() => []),
        api.listIntegrations().catch(() => []),
      ]);
      const validProvs = Array.isArray(provs) ? provs : [];
      setProviders(validProvs.filter((p: any) => p && p.type !== "SMS" && p.type !== "sms" && p.name !== "SMS Provider"));
      const map: Record<string, any> = {};
      if (Array.isArray(list)) {
        for (const i of list) {
          if (i?.type) map[i.type.toLowerCase()] = i;
        }
      }
      setIntegrations(map);
    } catch (err) {
      console.error("Failed to load integrations:", err);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAll();
  }, []);

  const loadAllRef = React.useRef<() => Promise<void>>(async () => {});
  React.useEffect(() => {
    loadAllRef.current = loadAll;
  }, [loadAll]);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as Record<string, unknown> | null;
      if (!data || typeof data !== "object") return;
      if (data.type === "oauth-success") {
        const type = String(data.integrationType || "").toUpperCase();
        const def = providers.find((p) => p.type === type);
        toast.success(`${def?.name || type} connected successfully`);
        loadAllRef.current();
      } else if (data.type === "oauth-error") {
        toast.error(String(data.error || "Failed to connect integration"));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [providers]);

  const providerFor = (type: string) => providers.find((p) => p.type === type);

  const openConnect = (type: string) => {
    const integ = integrations[type.toLowerCase()];
    if (integ?.status === "CONNECTED") {
      openDetail(type);
      return;
    }
    if (integ?.status === "EXPIRED" || integ?.status === "REAUTH_REQUIRED") {
      handleOAuth(type);
      return;
    }
    const def = providerFor(type);
    // Resend is OAuth-only: there is no API-key connection path for customers.
    // Route to OAuth even if a stale provider definition reports otherwise.
    if (def?.hasOAuth || type.toUpperCase() === "RESEND") {
      handleOAuth(type);
      return;
    }
    setApiKey("");
    setApiSecret("");
    setLabel("");
    setConnectDialog(type);
  };

  const openDetail = (type: string) => {
    setDetailDialog(type);
    if (type.toUpperCase() === "RESEND") {
      loadResendDomains();
    }
  };

  const loadResendDomains = async () => {
    setLoadingDomains(true);
    setDomainsError(null);
    try {
      setResendDomains(await api.listResendDomains());
    } catch (err: any) {
      setDomainsError(err?.message || "Failed to load sending domains.");
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    try {
      const res = await api.sendResendTestEmail(testEmailTo || undefined);
      toast.success(res?.message || "Test email sent");
      setTestEmailTo("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  const handleCreateDomain = async () => {
    setCreatingDomain(true);
    try {
      await api.createResendDomain(newDomain.trim());
      toast.success(`Domain ${newDomain.trim()} created — add the DNS records in Resend to verify it.`);
      setNewDomain("");
      await loadResendDomains();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create domain");
    } finally {
      setCreatingDomain(false);
    }
  };

  const handleOAuth = async (type: string) => {
    try {
      setConnecting(type);
      const redirect = `${window.location.origin}/app/integrations/callback`;
      const { url, state } = await api.getOAuthUrl(type, redirect);
      const states = JSON.parse(sessionStorage.getItem("doloyal_oauth_states") || "{}");
      states[state] = type;
      sessionStorage.setItem("doloyal_oauth_states", JSON.stringify(states));
      window.open(url, "oauth-popup", "width=600,height=700");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start OAuth");
    } finally {
      setConnecting(null);
    }
  };

  const handleConnect = async (type: string) => {
    const def = providerFor(type);
    if (def?.hasOAuth || type.toUpperCase() === "RESEND" || (!def?.hasApiKey && !def?.hasApiSecret)) {
      handleOAuth(type);
      return;
    }
    setConnecting(type);
    try {
      const body: any = { type };
      if (apiKey) body.apiKey = apiKey;
      if (apiSecret) body.apiSecret = apiSecret;
      if (label) body.label = label;
      const result = await api.connectIntegration(body);
      if (result) {
        setIntegrations((prev) => ({ ...prev, [type.toLowerCase()]: result }));
        toast.success(`${def?.name || type} connected successfully`);
        setConnectDialog(null);
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to connect`);
    } finally {
      setConnecting(null);
    }
  };

  const requestDisconnect = (type: string) => {
    setDisconnectTarget(type);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    const def = providerFor(disconnectTarget);
    setDisconnecting(true);
    try {
      await api.disconnectIntegration(disconnectTarget);
      setIntegrations((prev) => ({
        ...prev,
        [disconnectTarget.toLowerCase()]: { ...prev[disconnectTarget.toLowerCase()], status: "DISCONNECTED", connected: false },
      }));
      toast.success(`${def?.name || disconnectTarget} disconnected`);
      setDisconnectTarget(null);
      setDetailDialog(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async (type: string) => {
    setSyncing(type);
    try {
      const result = await api.syncIntegration(type);
      setIntegrations((prev) => ({
        ...prev,
        [type.toLowerCase()]: { ...prev[type.toLowerCase()], lastSyncedAt: new Date().toISOString() },
      }));
      toast.success(`Synced: ${result.recordsProcessed || 0} records`);
    } catch (err: any) {
      toast.error(err?.message || "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const handleTest = async (type: string) => {
    setTesting(type);
    try {
      await api.testIntegration(type);
      toast.success("Connection test passed");
    } catch (err: any) {
      toast.error(err?.message || "Connection test failed");
    } finally {
      setTesting(null);
    }
  };

  const openLogs = async (type: string, tab: string) => {
    setLogsDialog({ type, tab });
    setLoadingLogs(true);
    try {
      if (tab === "sync") {
        setSyncLogs(await api.getIntegrationSyncLogs(type));
      } else {
        setWebhookEvents(await api.getIntegrationWebhookEvents(type));
      }
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSelectCalendar = async (type: string, id: string) => {
    setSavingCalendar(true);
    try {
      await api.updateIntegrationConfig(type, { google_calendar_id: id });
      setIntegrations((prev) => ({
        ...prev,
        [type.toLowerCase()]: {
          ...prev[type.toLowerCase()],
          metadata: { ...(prev[type.toLowerCase()]?.metadata || {}), google_calendar_id: id },
        },
      }));
      setCalendarId(id);
      toast.success("Calendar updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update calendar");
    } finally {
      setSavingCalendar(false);
    }
  };

  const filtered = providers.filter((def) => {
    const integ = integrations[def.type.toLowerCase()];
    const matchesSearch =
      def.name.toLowerCase().includes(search.toLowerCase()) ||
      displayDescription(def.type, def.description).toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || displayCategory(def.category).toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const connectedCount = Object.values(integrations).filter((i: any) => i?.status === "CONNECTED").length;

  const disconnectDef = disconnectTarget ? providerFor(disconnectTarget) : null;

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--color-foreground))] md:text-[1.7rem]">
            Integrations
          </h1>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Connect your favorite tools and services to Doloyal.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2.5 py-0.5 text-xs font-medium text-[rgb(var(--color-muted-foreground))]"
              aria-live="polite"
            >
              {connectedCount > 0 ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[rgb(var(--color-success))]" aria-hidden="true" />
              ) : (
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {connectedCount} of {providers.length} connected
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]"
              aria-hidden="true"
            />
            <Input
              placeholder="Search integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-9"
              aria-label="Search integrations"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 w-full sm:w-44" aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((cat) => (
                <SelectItem key={cat} value={cat === "All" ? "all" : cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={loadAll}
            loading={loading}
            disabled={loading}
            aria-label="Refresh integrations"
          >
            {!loading ? <RotateCcw className="h-4 w-4" /> : null}
          </Button>
        </div>
      </div>

      {/* ─── Grid ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="mt-4 h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1.5 h-4 w-2/3" />
                <Skeleton className="mt-5 h-8 w-full rounded-[0.625rem]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title="No integrations found"
          description="Try searching for another integration or changing the category."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((def) => {
            const type = def.type.toLowerCase();
            const integ = integrations[type];
            const connected = integ?.status === "CONNECTED";
            const needsReconnect = integ?.status === "EXPIRED" || integ?.status === "REAUTH_REQUIRED";
            const BrandIcon = getBrandIcon(def.type);
            const connectedDetail =
              connected && integ?.label ? integ.label : connected && integ?.metadata?.accountName ? integ.metadata.accountName : null;

            return (
              <IntegrationCard
                key={def.type}
                name={def.name}
                description={displayDescription(def.type, def.description)}
                category={displayCategory(def.category)}
                icon={
                  BrandIcon ? (
                    <BrandIcon className="h-6 w-6" />
                  ) : (
                    <Puzzle className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" aria-hidden="true" />
                  )
                }
                connected={connected}
                expired={needsReconnect}
                connecting={connecting === def.type}
                syncing={syncing === def.type}
                supportsSync={def.supportsSync}
                healthError={integ?.healthStatus === "ERROR"}
                connectedDetail={connectedDetail}
                onConnect={() => openConnect(def.type)}
                onManage={() => openDetail(def.type)}
                onSync={() => handleSync(def.type)}
                onDisconnect={() => requestDisconnect(def.type)}
              />
            );
          })}
        </div>
      )}

      {/* ─── Connect Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!connectDialog} onOpenChange={(o) => { if (!o) setConnectDialog(null); }}>
        <DialogContent>
          {connectDialog && (() => {
            const def = providerFor(connectDialog);
            if (!def) return null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Connect {def.name}</DialogTitle>
                  <DialogDescription>
                    {def.hasOAuth
                      ? "Authorize via OAuth to connect your account."
                      : def.hasApiKey
                        ? "Enter your API credentials to connect."
                        : "Configure connection settings."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {def.docsUrl && (
                    <a
                      href={def.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[rgb(var(--color-primary))] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> How to get your credentials
                    </a>
                  )}
                  {def.hasOAuth && (
                    <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                      Click Connect to authorize via {def.name}&apos;s OAuth flow.
                    </p>
                  )}
                  {def.hasApiKey && (
                    <div className="space-y-2">
                      <label htmlFor="integ-api-key" className="text-sm font-medium">API Key</label>
                      <Input
                        id="integ-api-key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter API key"
                      />
                    </div>
                  )}
                  {def.hasApiSecret && (
                    <div className="space-y-2">
                      <label htmlFor="integ-api-secret" className="text-sm font-medium">API Secret</label>
                      <Input
                        id="integ-api-secret"
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Enter secret"
                      />
                    </div>
                  )}
                  {!def.hasOAuth && (
                    <div className="space-y-2">
                      <label htmlFor="integ-label" className="text-sm font-medium">Label (optional)</label>
                      <Input
                        id="integ-label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="e.g. Production"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setConnectDialog(null)} disabled={connecting === connectDialog}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleConnect(def.type)}
                    loading={connecting === connectDialog}
                    disabled={connecting === connectDialog}
                  >
                    {connecting === connectDialog
                      ? "Connecting..."
                      : def.hasOAuth && !apiKey
                        ? "Authorize"
                        : "Connect"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Disconnect Confirmation ────────────────────────────────────── */}
      <Dialog open={!!disconnectTarget} onOpenChange={(o) => { if (!o) setDisconnectTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectDef?.name || "integration"}?</DialogTitle>
            <DialogDescription>
              Doloyal will stop using {disconnectDef?.name || "this integration"} for this workspace. Features depending
              on this integration may stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setDisconnectTarget(null)} disabled={disconnecting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDisconnect}
              loading={disconnecting}
              disabled={disconnecting}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!detailDialog} onOpenChange={(o) => { if (!o) setDetailDialog(null); }}>
        <DialogContent className="max-w-lg">
          {detailDialog && (() => {
            const def = providerFor(detailDialog);
            const integ = integrations[detailDialog.toLowerCase()];
            if (!def || !integ) return null;
            const BrandIcon = getBrandIcon(def.type);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]">
                      {BrandIcon ? (
                        <BrandIcon className="h-6 w-6" />
                      ) : (
                        <Puzzle className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <DialogTitle>{def.name}</DialogTitle>
                      <DialogDescription>{displayDescription(def.type, def.description)}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <span className="text-[rgb(var(--color-muted-foreground))]">Status</span>
                      <div className="flex items-center gap-1.5 font-medium">
                        {integ.status === "CONNECTED" ? (
                          <><CheckCircle2 className="h-4 w-4 text-[rgb(var(--color-success))]" /> Connected</>
                        ) : integ.status === "EXPIRED" || integ.status === "REAUTH_REQUIRED" ? (
                          <><AlertCircle className="h-4 w-4 text-[rgb(var(--color-warning))]" /> Needs reconnection</>
                        ) : (
                          <><XCircle className="h-4 w-4 text-[rgb(var(--color-danger))]" /> Disconnected</>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[rgb(var(--color-muted-foreground))]">Health</span>
                      <div className="flex items-center gap-1.5 font-medium">
                        {integ.healthStatus === "HEALTHY" ? (
                          <><CheckCircle2 className="h-4 w-4 text-[rgb(var(--color-success))]" /> Healthy</>
                        ) : integ.healthStatus === "ERROR" ? (
                          <><XCircle className="h-4 w-4 text-[rgb(var(--color-danger))]" /> Error</>
                        ) : (
                          <><AlertCircle className="h-4 w-4 text-[rgb(var(--color-warning))]" /> Warning</>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[rgb(var(--color-muted-foreground))]">Last Sync</span>
                      <div className="font-medium">{integ.lastSyncedAt ? new Date(integ.lastSyncedAt).toLocaleString() : "Never"}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[rgb(var(--color-muted-foreground))]">Category</span>
                      <div className="font-medium">{displayCategory(def.category)}</div>
                    </div>
                  </div>
                  {integ.status === "REAUTH_REQUIRED" && (
                      <div className="rounded-lg border border-[rgb(var(--color-warning)/0.4)] bg-[rgb(var(--color-warning)/0.08)] p-3">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--color-warning))]">
                          <AlertCircle className="h-4 w-4" /> Reauthorization required
                        </div>
                        <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                          Your Resend authorization expired or was revoked. Reconnect to keep sending emails from
                          Doloyal.
                        </p>
                      </div>
                    )}
                    {integ.metadata?.email && (
                    <div className="space-y-1 text-sm">
                      <span className="text-[rgb(var(--color-muted-foreground))]">Connected account</span>
                      <div className="font-medium">{integ.metadata.email}</div>
                    </div>
                  )}
                  {integ.errorLog && (
                    <div className="rounded-lg border border-[rgb(var(--color-danger)/0.3)] bg-[rgb(var(--color-danger)/0.05)] p-3">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--color-danger))]">
                        <AlertCircle className="h-4 w-4" /> Error
                      </div>
                      <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">{integ.errorLog}</p>
                    </div>
                  )}
                  {detailDialog.toUpperCase() === "GOOGLE_CALENDAR" && Array.isArray(integ.metadata?.calendars) && integ.metadata.calendars.length > 0 && (
                    <div className="space-y-2">
                      <label htmlFor="integ-calendar" className="text-sm font-medium">Calendar</label>
                      <Select
                        value={calendarId || integ.metadata?.google_calendar_id || "primary"}
                        onValueChange={(v) => handleSelectCalendar(detailDialog, v)}
                      >
                        <SelectTrigger id="integ-calendar" className="w-full" disabled={savingCalendar}>
                          <SelectValue placeholder="Select calendar" />
                        </SelectTrigger>
                        <SelectContent>
                          {integ.metadata.calendars.map((cal: any) => (
                            <SelectItem key={cal.id} value={cal.id}>
                              {cal.summary || cal.id}{cal.primary ? " (Primary)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        Appointments and free/busy availability use this calendar.
                      </p>
                    </div>
                  )}
                  {detailDialog.toUpperCase() === "RESEND" && (
                    <div className="space-y-4 border-t border-[rgb(var(--color-border))] pt-4">
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Send test email</span>
                        <div className="flex items-center gap-2">
                          <Input
                            value={testEmailTo}
                            onChange={(e) => setTestEmailTo(e.target.value)}
                            placeholder={integ.metadata?.email || "you@example.com"}
                            className="flex-1"
                            aria-label="Test email recipient"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleSendTestEmail}
                            loading={sendingTest}
                            disabled={sendingTest}
                          >
                            Send
                          </Button>
                        </div>
                        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                          Sends a test email through your connected Resend account.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Sending domains</span>
                          <Button variant="ghost" size="sm" onClick={loadResendDomains} loading={loadingDomains} disabled={loadingDomains}>
                            {!loadingDomains ? <RefreshCw className="h-3.5 w-3.5" /> : null}
                            Refresh
                          </Button>
                        </div>
                        {domainsError ? (
                          <div className="rounded-lg border border-[rgb(var(--color-warning)/0.4)] bg-[rgb(var(--color-warning)/0.08)] p-3 text-xs text-[rgb(var(--color-foreground))]">
                            {domainsError}
                          </div>
                        ) : loadingDomains ? (
                          <div className="space-y-1.5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
                        ) : resendDomains.length === 0 ? (
                          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                            No sending domains found. Add one below to send from your own verified domain.
                          </p>
                        ) : (
                          <div className="max-h-40 space-y-1.5 overflow-y-auto">
                            {resendDomains.map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                <span className="font-medium">{d.name}</span>
                                <Badge variant={d.status === "verified" ? "success" : "outline"} className="capitalize">
                                  {d.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Input
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="mail.yourdomain.com"
                            className="flex-1"
                            aria-label="New sending domain"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCreateDomain}
                            loading={creatingDomain}
                            disabled={creatingDomain || !newDomain.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {integ.status === "EXPIRED" || integ.status === "REAUTH_REQUIRED" ? (
                      <Button variant="primary" size="sm" onClick={() => handleOAuth(detailDialog)} loading={connecting === detailDialog}>
                        <RefreshCw className="h-4 w-4" /> Reconnect
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => handleSync(detailDialog)} loading={syncing === detailDialog} disabled={!def.supportsSync}>
                        <RefreshCw className="h-4 w-4" /> Sync Now
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => handleTest(detailDialog)} loading={testing === detailDialog}>
                      <Play className="h-4 w-4" /> Test
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openLogs(detailDialog, "sync")}>
                      <FileText className="h-4 w-4" /> Logs
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestDisconnect(detailDialog)}
                      className="ml-auto text-[rgb(var(--color-danger))] transition-colors hover:bg-[rgb(var(--color-danger)/0.1)]"
                    >
                      <Unlink className="h-4 w-4" /> Disconnect
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Logs Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!logsDialog} onOpenChange={(o) => { if (!o) setLogsDialog(null); }}>
        <DialogContent className="max-w-2xl">
          {logsDialog && (() => {
            const def = providerFor(logsDialog.type);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{def?.name || logsDialog.type} Logs</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue={logsDialog.tab} className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="sync" className="flex-1" onClick={() => openLogs(logsDialog.type, "sync")}>Sync Logs</TabsTrigger>
                    <TabsTrigger value="webhook" className="flex-1" onClick={() => openLogs(logsDialog.type, "webhook")}>Webhook Events</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sync" className="mt-4">
                    {loadingLogs ? (
                      <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : syncLogs.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[rgb(var(--color-muted-foreground))]">No sync logs yet.</p>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto">
                        {syncLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                            <div className="flex items-center gap-2">
                              {log.status === "SUCCESS" ? <CheckCircle2 className="h-4 w-4 text-[rgb(var(--color-success))]" /> :
                                log.status === "FAILED" ? <XCircle className="h-4 w-4 text-[rgb(var(--color-danger))]" /> :
                                log.status === "RUNNING" ? <RefreshCw className="h-4 w-4 animate-spin text-[rgb(var(--color-primary))]" /> :
                                <Clock className="h-4 w-4" />}
                              <span className="font-medium capitalize">{log.status.toLowerCase()}</span>
                              {log.recordsProcessed != null && <span className="text-[rgb(var(--color-muted-foreground))]">({log.recordsProcessed} records)</span>}
                            </div>
                            <span className="text-xs text-[rgb(var(--color-muted-foreground))]">{new Date(log.startedAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="webhook" className="mt-4">
                    {loadingLogs ? (
                      <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : webhookEvents.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[rgb(var(--color-muted-foreground))]">No webhook events yet.</p>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto">
                        {webhookEvents.map((evt) => (
                          <div key={evt.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                            <div>
                              <span className="font-medium">{evt.eventType}</span>
                              <span className={`ml-2 text-xs capitalize ${evt.status === "PROCESSED" ? "text-[rgb(var(--color-success))]" : "text-[rgb(var(--color-danger))]"}`}>{evt.status.toLowerCase()}</span>
                            </div>
                            <span className="text-xs text-[rgb(var(--color-muted-foreground))]">{new Date(evt.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
