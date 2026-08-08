"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  ExternalLink,
  Unlink,
  RefreshCw,
  FileText,
  Eye,
  Copy,
  Check,
  Globe,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  Button,
  Input,
  Field,
  Card,
  CardContent,
  PageHeader,
  Badge,
  Skeleton,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@doloyal/ui";
import {
  WEBSITE_FRAMEWORKS,
  WEBSITE_FRAMEWORK_LABELS,
  type ConnectedWebsite,
  type WebsiteConnectionCredentials,
  type WebsiteFramework,
  type CreateConnectedWebsiteInput,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

function statusVariant(status: string): "success" | "danger" | "warning" | "outline" {
  if (status === "CONNECTED") return "success";
  if (status === "DISCONNECTED") return "danger";
  return "warning";
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.4)] px-3 py-2 text-xs">
          {value}
        </code>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export default function ConnectedWebsitesPage() {
  const [sites, setSites] = React.useState<ConnectedWebsite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [connectOpen, setConnectOpen] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [credentials, setCredentials] = React.useState<WebsiteConnectionCredentials | null>(null);
  const [createdName, setCreatedName] = React.useState("");
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ConnectedWebsite | null>(null);
  const [viewSite, setViewSite] = React.useState<ConnectedWebsite | null>(null);

  const [form, setForm] = React.useState<CreateConnectedWebsiteInput>({
    name: "",
    websiteUrl: "",
    framework: "HTML",
    businessName: "",
  });

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listConnectedWebsites();
      setSites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connected websites");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setForm({ name: "", websiteUrl: "", framework: "HTML", businessName: "" });
  };

  const handleGenerate = async () => {
    if (!form.name.trim()) {
      toast.error("Website name is required");
      return;
    }
    if (!form.websiteUrl.trim()) {
      toast.error("Website URL is required");
      return;
    }
    if (!form.framework) {
      toast.error("Website type is required");
      return;
    }
    try {
      setGenerating(true);
      const result = await api.createConnectedWebsite({
        name: form.name.trim(),
        websiteUrl: form.websiteUrl.trim(),
        framework: form.framework,
        businessName: form.businessName?.trim() || undefined,
      });
      setCredentials(result.credentials);
      setCreatedName(result.name);
      setConnectOpen(false);
      resetForm();
      toast.success("Connection generated successfully");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate connection");
    } finally {
      setGenerating(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      setActionId(id);
      await api.disconnectConnectedWebsite(id);
      toast.success("Website disconnected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setActionId(null);
    }
  };

  const handleReconnect = async (id: string) => {
    try {
      setActionId(id);
      await api.reconnectConnectedWebsite(id);
      toast.success("Website reconnected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reconnect failed");
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deletingId) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.deleteConnectedWebsite(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Website connection deleted successfully");
      await load();
    } catch {
      toast.error("Failed to delete connection. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const connectedCount = sites.filter((s) => s.status === "CONNECTED").length;
  const disconnectedCount = sites.filter((s) => s.status === "DISCONNECTED").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-[rgb(var(--color-danger))]" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load connections</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connected Websites"
        description={
          sites.length > 0
            ? `${connectedCount} connected · ${disconnectedCount} disconnected · ${sites.length} total`
            : "Connect your business websites so customers, bookings, and loyalty sync automatically"
        }
        actions={
          <Button onClick={() => setConnectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Connect Website
          </Button>
        }
      />

      {sites.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-7 w-7" />}
          title="No websites connected"
          description="Connect your website to sync customers, appointments, memberships, and rewards automatically."
          action={
            <Button onClick={() => setConnectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Connect Website
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {sites.map((site) => {
            const isDisconnected = site.status === "DISCONNECTED";

            return (
            <Card key={site.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{site.name}</h3>
                      <Badge variant={statusVariant(site.status)}>
                        {site.status === "DISCONNECTED" ? "Disconnected" : site.status}
                      </Badge>
                      <Badge variant="outline">
                        {WEBSITE_FRAMEWORK_LABELS[site.framework] ?? site.framework}
                      </Badge>
                    </div>
                    {!isDisconnected && (
                      <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                        {site.businessName} · Business ID{" "}
                        <code className="text-xs">{site.businessId}</code>
                      </p>
                    )}
                    <a
                      href={site.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[rgb(var(--color-primary))] hover:underline"
                    >
                      {site.websiteUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-right text-xs text-[rgb(var(--color-muted-foreground))]">
                    {isDisconnected ? (
                      <>
                        Last connected
                        <div className="mt-0.5 font-medium text-[rgb(var(--color-foreground))]">
                          {formatDate(site.lastConnectedAt ?? site.lastSyncAt)}
                        </div>
                      </>
                    ) : (
                      <>Last sync: {formatDate(site.lastSyncAt)}</>
                    )}
                  </div>
                </div>

                {!isDisconnected && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    ["Customers", site.stats.customers],
                    ["Appointments", site.stats.appointments],
                    ["Memberships", site.stats.memberships],
                    ["Rewards", site.stats.rewards],
                    ["Forms", site.stats.forms],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-lg border border-[rgb(var(--color-border))] px-3 py-2"
                    >
                      <div className="text-[0.65rem] uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
                        {label}
                      </div>
                      <div className="mt-0.5 text-lg font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!isDisconnected && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setViewSite(site)}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionId === site.id}
                        onClick={() => void handleDisconnect(site.id)}
                      >
                        <Unlink className="mr-1.5 h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/app/website-connections/logs?websiteId=${site.id}`}>
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          Logs
                        </Link>
                      </Button>
                    </>
                  )}
                  {isDisconnected && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionId === site.id || deletingId === site.id}
                        onClick={() => void handleReconnect(site.id)}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Reconnect
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={deletingId === site.id}
                        disabled={deletingId === site.id || actionId === site.id}
                        className="border-[rgb(var(--color-danger))] text-[rgb(var(--color-danger))] hover:bg-[rgb(var(--color-danger)/0.08)]"
                        onClick={() => setDeleteTarget(site)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Website Connection?</DialogTitle>
            <DialogDescription className="space-y-2 pt-1">
              <span className="block">
                This action will permanently remove this website connection and all saved connection data.
              </span>
              <span className="block font-medium text-[rgb(var(--color-foreground))]">
                This action cannot be undone.
              </span>
              {deleteTarget && (
                <span className="block pt-1 text-xs">
                  {deleteTarget.name} · {deleteTarget.websiteUrl}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={!!deletingId}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={!!deletingId}
              disabled={!!deletingId}
              onClick={() => void handleDeleteConfirm()}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Website dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect Website</DialogTitle>
            <DialogDescription>
              Enter your website details. Doloyal will generate Business ID, API keys, webhook secret, and a connection token.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field label="Website Name" required>
              <Input
                placeholder="Main website"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Website URL" required>
              <Input
                placeholder="https://www.yourbusiness.com"
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              />
            </Field>
            <Field label="Website Type" required>
              <Select
                value={form.framework}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, framework: v as WebsiteFramework }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select framework" />
                </SelectTrigger>
                <SelectContent>
                  {WEBSITE_FRAMEWORKS.map((fw) => (
                    <SelectItem key={fw} value={fw}>
                      {WEBSITE_FRAMEWORK_LABELS[fw]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Business Name">
              <Input
                placeholder="Optional — defaults to your Doloyal business"
                value={form.businessName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConnectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleGenerate()} disabled={generating}>
              {generating ? "Generating…" : "Generate Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials shown once after generate */}
      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connection generated</DialogTitle>
            <DialogDescription>
              Save these credentials now. The secret key and webhook secret are shown only once.
              {createdName ? ` Website: ${createdName}` : ""}
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3 py-2">
              <CopyField label="Business ID" value={credentials.businessId} />
              <CopyField label="Public API Key" value={credentials.publicKey} />
              <CopyField label="Secret API Key" value={credentials.secretKey} />
              <CopyField label="Webhook Secret" value={credentials.webhookSecret} />
              <CopyField label="Connection Token" value={credentials.connectionToken} />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View details */}
      <Dialog open={!!viewSite} onOpenChange={(open) => !open && setViewSite(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewSite?.name}</DialogTitle>
            <DialogDescription>Connection details</DialogDescription>
          </DialogHeader>
          {viewSite && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">Status</div>
                  <Badge variant={statusVariant(viewSite.status)}>{viewSite.status}</Badge>
                </div>
                <div>
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">Framework</div>
                  <div>{WEBSITE_FRAMEWORK_LABELS[viewSite.framework]}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">Business ID</div>
                  <code className="text-xs">{viewSite.businessId}</code>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">Public Key</div>
                  <code className="break-all text-xs">{viewSite.publicKey ?? "—"}</code>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">Secret Key</div>
                  <code className="text-xs">{viewSite.secretKeyPrefix ?? "—"}</code>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">Connection Token</div>
                  <code className="break-all text-xs">{viewSite.connectionToken}</code>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewSite(null)}>
              Close
            </Button>
            <Button asChild>
              <Link href="/app/website-connections/sdk">View SDK setup</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
