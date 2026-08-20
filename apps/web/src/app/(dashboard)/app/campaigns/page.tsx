"use client";

import * as React from "react";
import {
  Megaphone,
  Plus,
  Send,
  BarChart3,
  Pause,
  Play,
  Clock,
  MessageSquare,
  Smartphone,
  Mail,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  PageHeader,
  Badge,
  Skeleton,
  Textarea,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Field,
  KpiCard,
  EmptyState,
} from "@doloyal/ui";
import { api } from "@/lib/api";

type Channel = "SMS" | "EMAIL" | "WHATSAPP";
type Status = "DRAFT" | "SCHEDULED" | "PAUSED" | "SENT";
type Audience = "All" | "VIP" | "At Risk" | "Inactive";

interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  audience: Audience;
  audienceSize: number;
  sentCount: number;
  openRate: number;
  redeemRate: number;
  status: Status;
  scheduleDate: string;
  failedCount?: number;
}

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  SMS: <MessageSquare className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  WHATSAPP: <Smartphone className="h-4 w-4" />,
};

const STATUS_VARIANT: Record<Status, "primary" | "outline" | "success" | "warning"> = {
  DRAFT: "outline",
  SCHEDULED: "primary",
  SENT: "success",
  PAUSED: "warning",
};

const API_STATUS_TO_UI: Record<string, Status> = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PAUSED: "PAUSED",
  SENDING: "SCHEDULED",
  COMPLETED: "SENT",
  FAILED: "DRAFT",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newSubject, setNewSubject] = React.useState("");
  const [newChannel, setNewChannel] = React.useState<Channel>("EMAIL");
  const [newAudience, setNewAudience] = React.useState<Audience>("All");
  const [newMessage, setNewMessage] = React.useState("");
  const [newDate, setNewDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sendingId, setSendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = React.useCallback(async () => {
    try {
      const rows = await api.listCampaigns();
      setCampaigns(
        rows.map((c: any) => ({
          id: c.id,
          name: c.name,
          channel: c.channel as Channel,
          audience: (c.audience || "All") as Audience,
          audienceSize: c.recipients || 0,
          sentCount: c.sentCount || 0,
          failedCount: c.failedCount || 0,
          openRate: c.openRate || 0,
          redeemRate: c.redeemRate || 0,
          status: API_STATUS_TO_UI[c.status] || "DRAFT",
          scheduleDate: c.scheduleDate ? String(c.scheduleDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        })),
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const kpis = React.useMemo(() => {
    const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
    const sentCampaigns = campaigns.filter((c) => c.status === "SENT");
    const avgOpen = sentCampaigns.length
      ? sentCampaigns.reduce((s, c) => s + c.openRate, 0) / sentCampaigns.length
      : 0;
    const totalRedeem = campaigns.reduce((s, c) => s + Math.round(c.sentCount * (c.redeemRate / 100)), 0);
    const active = campaigns.filter((c) => c.status === "SCHEDULED" || c.status === "SENT").length;
    return { totalSent, avgOpen, totalRedeem, active };
  }, [campaigns]);

  const togglePause = async (id: string) => {
    const target = campaigns.find((c) => c.id === id);
    if (!target) return;
    try {
      const nextStatus = target.status === "PAUSED" ? "SCHEDULED" : "PAUSED";
      await api.setCampaignStatus(id, nextStatus);
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)),
      );
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update campaign");
    }
  };

  const sendNow = async (id: string, name: string) => {
    setSendingId(id);
    try {
      const result = await api.sendCampaign(id);
      showToast("success", result?.message || `${name} sent successfully.`);
      await load();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to send campaign");
    } finally {
      setSendingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newName || !newMessage) return;
    setSubmitting(true);
    try {
      await api.createCampaign({
        name: newName,
        subject: newChannel === "EMAIL" ? newSubject || newName : undefined,
        body: newMessage,
        channel: newChannel,
        audience: newAudience,
        scheduleDate: newDate || undefined,
      });
      showToast("success", "Campaign created.");
      setDialogOpen(false);
      setNewName("");
      setNewSubject("");
      setNewChannel("EMAIL");
      setNewAudience("All");
      setNewMessage("");
      setNewDate("");
      await load();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Failed to load campaigns</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading) return <CampaignsSkeleton />;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-[rgb(var(--color-success)/0.4)] bg-[rgb(var(--color-success)/0.1)] text-[rgb(var(--color-success))]"
              : "border-[rgb(var(--color-danger)/0.4)] bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]"
          }`}
        >
          {toast.type === "success" ? "Success" : "Error"}: {toast.text}
        </div>
      )}

      <PageHeader
        title="Campaigns"
        description="Create and manage marketing campaigns"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Campaign</DialogTitle>
                <DialogDescription>Set up a new marketing campaign.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Field label="Campaign name" required>
                  <Input
                    placeholder="e.g. Summer Sale"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </Field>
                <Field label="Channel" required>
                  <Select value={newChannel} onValueChange={(v) => setNewChannel(v as Channel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {newChannel === "EMAIL" && (
                  <Field label="Subject" required>
                    <Input
                      placeholder="Email subject"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Audience" required>
                  <Select value={newAudience} onValueChange={(v) => setNewAudience(v as Audience)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Customers</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="At Risk">At Risk</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Message" required>
                  <Textarea
                    placeholder="Write your campaign message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </Field>
                <Field label="Schedule date">
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </Field>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Creating..." : "Create Campaign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Sent"
          value={kpis.totalSent}
          format={(v) => v.toLocaleString("en-IN")}
          icon={<Send className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label="Avg Open Rate"
          value={kpis.avgOpen}
          format={(v) => `${v.toFixed(1)}%`}
          icon={<BarChart3 className="h-5 w-5" />}
          accent="accent"
        />
        <KpiCard
          label="Redemptions"
          value={kpis.totalRedeem}
          format={(v) => v.toLocaleString("en-IN")}
          icon={<Megaphone className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label="Active Campaigns"
          value={kpis.active}
          icon={<Clock className="h-5 w-5" />}
          accent="violet"
        />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No campaigns yet"
          description="Create your first campaign to start engaging with customers."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} interactive className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge variant={STATUS_VARIANT[c.status]} className="shrink-0 text-[0.65rem] uppercase tracking-wider">
                    {c.status}
                  </Badge>
                </div>
                <CardDescription>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {CHANNEL_ICON[c.channel]}
                    <span>{c.channel}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
                      Audience
                    </p>
                    <p className="mt-0.5 font-medium">{c.audience}</p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
                      Size
                    </p>
                    <p className="mt-0.5 font-medium">{c.audienceSize.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
                      Sent
                    </p>
                    <p className="mt-0.5 font-medium">{c.sentCount.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
                      Open / Redeem
                    </p>
                    <p className="mt-0.5 font-medium">
                      {c.openRate}% / {c.redeemRate}%
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[rgb(var(--color-border))] pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(c.scheduleDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    {c.channel === "EMAIL" && (c.status === "DRAFT" || c.status === "SCHEDULED") && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sendingId === c.id}
                        onClick={() => sendNow(c.id, c.name)}
                      >
                        {sendingId === c.id ? "Sending..." : "Send now"}
                      </Button>
                    )}
                    {(c.status === "SCHEDULED" || c.status === "PAUSED") && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => togglePause(c.id)}
                        title={c.status === "PAUSED" ? "Activate" : "Pause"}
                      >
                        {c.status === "PAUSED" ? (
                          <Play className="h-4 w-4 text-[rgb(var(--color-success))]" />
                        ) : (
                          <Pause className="h-4 w-4 text-[rgb(var(--color-warning))]" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-4 w-24" />
            <Skeleton className="mt-5 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-5 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}