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

type Channel = "SMS" | "EMAIL" | "WHATSAPP";
type Status = "DRAFT" | "SCHEDULED" | "SENT" | "PAUSED";
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

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    name: "Summer Sale Blast",
    channel: "SMS",
    audience: "All",
    audienceSize: 12480,
    sentCount: 12480,
    openRate: 68.2,
    redeemRate: 12.4,
    status: "SENT",
    scheduleDate: "2026-06-15",
  },
  {
    id: "2",
    name: "VIP Exclusive Offer",
    channel: "EMAIL",
    audience: "VIP",
    audienceSize: 342,
    sentCount: 340,
    openRate: 92.1,
    redeemRate: 34.7,
    status: "SENT",
    scheduleDate: "2026-07-01",
  },
  {
    id: "3",
    name: "Re-engagement Series",
    channel: "WHATSAPP",
    audience: "Inactive",
    audienceSize: 2100,
    sentCount: 0,
    openRate: 0,
    redeemRate: 0,
    status: "SCHEDULED",
    scheduleDate: "2026-08-01",
  },
  {
    id: "4",
    name: "Autumn Promo Draft",
    channel: "EMAIL",
    audience: "At Risk",
    audienceSize: 890,
    sentCount: 0,
    openRate: 0,
    redeemRate: 0,
    status: "DRAFT",
    scheduleDate: "2026-09-10",
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newChannel, setNewChannel] = React.useState<Channel>("EMAIL");
  const [newAudience, setNewAudience] = React.useState<Audience>("All");
  const [newMessage, setNewMessage] = React.useState("");
  const [newDate, setNewDate] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCampaigns(INITIAL_CAMPAIGNS);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

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

  const togglePause = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.status === "PAUSED") return { ...c, status: "SCHEDULED" as Status };
        if (c.status === "SCHEDULED") return { ...c, status: "PAUSED" as Status };
        return c;
      }),
    );
  };

  const handleCreate = () => {
    if (!newName || !newDate) return;
    const campaign: Campaign = {
      id: String(Date.now()),
      name: newName,
      channel: newChannel,
      audience: newAudience,
      audienceSize: 0,
      sentCount: 0,
      openRate: 0,
      redeemRate: 0,
      status: "DRAFT",
      scheduleDate: newDate,
    };
    setCampaigns((prev) => [campaign, ...prev]);
    setDialogOpen(false);
    setNewName("");
    setNewChannel("EMAIL");
    setNewAudience("All");
    setNewMessage("");
    setNewDate("");
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
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
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
                <Field label="Message">
                  <Textarea
                    placeholder="Write your campaign message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </Field>
                <Field label="Schedule date" required>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </Field>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Campaign</Button>
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
                <div className="mt-auto flex items-center justify-between border-t border-[rgb(var(--color-border))] pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(c.scheduleDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
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
