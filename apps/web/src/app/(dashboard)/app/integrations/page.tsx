"use client";

import * as React from "react";
import {
  Puzzle, Search, ExternalLink, Unlink, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Clock, Settings, FileText, Link2, Eye, EyeOff, Mail, CreditCard,
  Calendar, ChevronRight, Play, RotateCcw,
} from "lucide-react";
import {
  Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription,
  PageHeader, Badge, Skeleton, Select, SelectTrigger, SelectValue, SelectContent,
  SelectItem, EmptyState, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogTrigger, Tabs, TabsList, TabsTrigger, TabsContent,
} from "@doloyal/ui";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = ['Calendar', 'Payments', 'Email'] as const;

const ICON_MAP: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="h-5 w-5" />,
  CreditCard: <CreditCard className="h-5 w-5" />,
  Mail: <Mail className="h-5 w-5" />,
};

export default function IntegrationsPage() {
  const [providers, setProviders] = React.useState<any[]>([]);
  const [integrations, setIntegrations] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [connectDialog, setConnectDialog] = React.useState<string | null>(null);
  const [detailDialog, setDetailDialog] = React.useState<string | null>(null);
  const [configDialog, setConfigDialog] = React.useState<string | null>(null);
  const [logsDialog, setLogsDialog] = React.useState<{ type: string; tab: string } | null>(null);
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [connecting, setConnecting] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState<string | null>(null);
  const [testing, setTesting] = React.useState<string | null>(null);
  const [syncLogs, setSyncLogs] = React.useState<any[]>([]);
  const [webhookEvents, setWebhookEvents] = React.useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);

  React.useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [provs, list] = await Promise.all([
        api.listIntegrationProviders(),
        api.listIntegrations(),
      ]);
      setProviders(provs.filter((p: any) => p.type !== "SMS" && p.type !== "sms" && p.name !== "SMS Provider"));
      const map: Record<string, any> = {};
      for (const i of list) map[i.type.toLowerCase()] = i;
      setIntegrations(map);
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const openConnect = (type: string) => {
    const integ = integrations[type.toLowerCase()];
    if (integ?.status === "CONNECTED") {
      setDetailDialog(type);
      return;
    }
    setApiKey(""); setApiSecret(""); setLabel("");
    setConnectDialog(type);
  };

  const handleOAuth = async (type: string) => {
    try {
      setConnecting(type);
      const redirect = `${window.location.origin}/app/integrations/callback`;
      const { url } = await api.getOAuthUrl(type, redirect);
      window.open(url, "oauth-popup", "width=600,height=700");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start OAuth");
    } finally {
      setConnecting(null);
    }
  };

  const handleConnect = async (type: string) => {
    const def = providers.find(p => p.type === type);
    if (def?.hasOAuth && !apiKey) {
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
        setIntegrations(prev => ({ ...prev, [type.toLowerCase()]: result }));
        toast.success(`${def?.name || type} connected`);
        setConnectDialog(null);
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to connect`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (type: string) => {
    const def = providers.find(p => p.type === type);
    try {
      await api.disconnectIntegration(type);
      setIntegrations(prev => ({ ...prev, [type.toLowerCase()]: { ...prev[type.toLowerCase()], status: "DISCONNECTED", connected: false } }));
      toast.success(`${def?.name || type} disconnected`);
      setDetailDialog(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect");
    }
  };

  const handleSync = async (type: string) => {
    setSyncing(type);
    try {
      const result = await api.syncIntegration(type);
      setIntegrations(prev => ({
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

  const filtered = providers.filter(def => {
    const integ = integrations[def.type.toLowerCase()];
    const matchesSearch = def.name.toLowerCase().includes(search.toLowerCase()) || def.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || def.category === categoryFilter;
    const isConnected = integ?.status === "CONNECTED";
    if (categoryFilter === "_connected") return matchesSearch && isConnected;
    if (categoryFilter === "_disconnected") return matchesSearch && !isConnected;
    return matchesSearch && matchesCategory;
  });

  const connectedCount = Object.values(integrations).filter((i: any) => i?.status === "CONNECTED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description={`${connectedCount} of ${providers.length} integrations connected`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 w-48 pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 w-40"><Search className="h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="_connected">Connected</SelectItem>
                <SelectItem value="_disconnected">Disconnected</SelectItem>
                {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="secondary" size="sm" onClick={loadAll} loading={loading}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6 space-y-3"><Skeleton className="h-10 w-10 rounded-xl" /><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Puzzle className="h-7 w-7" />} title="No integrations found"
          description={search || categoryFilter !== "all" ? "Try adjusting your search or filter." : "No integrations available yet."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(def => {
            const type = def.type.toLowerCase();
            const integ = integrations[type];
            const connected = integ?.status === "CONNECTED";
            const icon = ICON_MAP[def.icon] || <Puzzle className="h-5 w-5" />;

            return (
              <Card key={def.type} className="flex flex-col transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] text-[rgb(var(--color-primary))]">
                      {icon}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {connected ? (
                        <Badge variant="success" className="gap-1 text-[0.6rem]">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[0.6rem]">Disconnected</Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="mt-3 text-sm">{def.name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{def.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-3 pt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[0.55rem] uppercase tracking-wider">{def.category}</Badge>
                    {integ?.healthStatus === "ERROR" && (
                      <Badge variant="danger" className="text-[0.55rem] gap-1">
                        <AlertCircle className="h-3 w-3" /> Error
                      </Badge>
                    )}
                  </div>
                  {connected && (
                    <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-muted-foreground))]">
                      <Clock className="h-3.5 w-3.5" />
                      {integ.lastSyncedAt
                        ? `Synced ${new Date(integ.lastSyncedAt).toLocaleDateString()}`
                        : "Never synced"}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 pt-1">
                    {connected ? (
                      <>
                        <Button variant="primary" size="sm" className="flex-1" onClick={() => setDetailDialog(def.type)}>
                          <Settings className="h-3.5 w-3.5" /> Manage
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleSync(def.type)} loading={syncing === def.type} disabled={!def.supportsSync}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDisconnect(def.type)} className="text-[rgb(var(--color-danger))]">
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="primary" size="sm" className="w-full" onClick={() => openConnect(def.type)} loading={connecting === def.type}>
                        <Link2 className="h-3.5 w-3.5" /> Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={o => { if (!o) setConnectDialog(null); }}>
        <DialogContent>
          {connectDialog && (() => {
            const def = providers.find(p => p.type === connectDialog);
            if (!def) return null;
            return <>
              <DialogHeader>
                <DialogTitle>Connect {def.name}</DialogTitle>
                <DialogDescription>
                  {def.hasOAuth
                    ? "Authorize via OAuth to connect your account."
                    : def.hasApiKey ? "Enter your API credentials to connect." : "Configure connection settings."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {def.docsUrl && (
                  <a href={def.docsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[rgb(var(--color-primary))] hover:underline">
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
                    <label className="text-sm font-medium">API Key</label>
                    <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter API key" />
                  </div>
                )}
                {def.hasApiSecret && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Secret</label>
                    <Input type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Enter secret" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Label (optional)</label>
                  <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Production" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConnectDialog(null)}>Cancel</Button>
                <Button onClick={() => handleConnect(def.type)} loading={connecting === def.type}>
                  {def.hasOAuth && !apiKey ? "Authorize" : "Connect"}
                </Button>
              </div>
            </>;
          })()}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={o => { if (!o) setDetailDialog(null); }}>
        <DialogContent className="max-w-lg">
          {detailDialog && (() => {
            const def = providers.find(p => p.type === detailDialog);
            const integ = integrations[detailDialog.toLowerCase()];
            if (!def || !integ) return null;
            return <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-[rgb(var(--color-muted))] text-[rgb(var(--color-primary))]">
                    {ICON_MAP[def.icon] || <Puzzle className="h-5 w-5" />}
                  </div>
                  <div>
                    <DialogTitle>{def.name}</DialogTitle>
                    <DialogDescription>{def.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <span className="text-[rgb(var(--color-muted-foreground))]">Status</span>
                    <div className="font-medium flex items-center gap-1.5">
                      {integ.status === "CONNECTED" ? (
                        <><CheckCircle2 className="h-4 w-4 text-[rgb(var(--color-success))]" /> Connected</>
                      ) : (
                        <><XCircle className="h-4 w-4 text-[rgb(var(--color-danger))]" /> Disconnected</>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[rgb(var(--color-muted-foreground))]">Health</span>
                    <div className="font-medium flex items-center gap-1.5">
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
                    <div className="font-medium">{def.category}</div>
                  </div>
                </div>
                {integ.errorLog && (
                  <div className="rounded-lg border border-[rgb(var(--color-danger)/0.3)] bg-[rgb(var(--color-danger)/0.05)] p-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--color-danger))]">
                      <AlertCircle className="h-4 w-4" /> Error
                    </div>
                    <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">{integ.errorLog}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleSync(detailDialog)} loading={syncing === detailDialog} disabled={!def.supportsSync}>
                    <RefreshCw className="h-4 w-4" /> Sync Now
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleTest(detailDialog)} loading={testing === detailDialog}>
                    <Play className="h-4 w-4" /> Test
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openLogs(detailDialog, "sync")}>
                    <FileText className="h-4 w-4" /> Logs
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDisconnect(detailDialog)} className="text-[rgb(var(--color-danger))] ml-auto">
                    <Unlink className="h-4 w-4" /> Disconnect
                  </Button>
                </div>
              </div>
            </>;
          })()}
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={!!configDialog} onOpenChange={o => { if (!o) setConfigDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuration</DialogTitle>
            <DialogDescription>Integration settings and preferences.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={!!logsDialog} onOpenChange={o => { if (!o) setLogsDialog(null); }}>
        <DialogContent className="max-w-2xl">
          {logsDialog && (() => {
            const def = providers.find(p => p.type === logsDialog.type);
            return <>
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
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {syncLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                          <div className="flex items-center gap-2">
                            {log.status === "SUCCESS" ? <CheckCircle2 className="h-4 w-4 text-[rgb(var(--color-success))]" /> :
                             log.status === "FAILED" ? <XCircle className="h-4 w-4 text-[rgb(var(--color-danger))]" /> :
                             log.status === "RUNNING" ? <RefreshCw className="h-4 w-4 text-[rgb(var(--color-primary))] animate-spin" /> :
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
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {webhookEvents.map(evt => (
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
            </>;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
