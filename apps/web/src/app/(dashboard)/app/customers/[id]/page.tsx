"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  Star,
  TrendingUp,
  Clock,
  Award,
  Gift,
  AlertTriangle,
  Tag,
  Plus,
  MessageSquare,
  FileText,
} from "lucide-react";
import {
  PageHeader,
  Badge,
  Avatar,
  AvatarFallback,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@doloyal/ui";
import {
  initials,
  avatarColor,
  relativeTime,
} from "@doloyal/shared";
import type { CustomerProfile } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "sonner";

export default function CustomerProfilePage() {
  const { format: fmt } = useCurrency();
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = React.useState<CustomerProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [newNote, setNewNote] = React.useState("");
  const [addingNote, setAddingNote] = React.useState(false);

  React.useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getCustomer(params.id as string);
        if (!cancelled) setCustomer(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load customer");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !customer) return;
    try {
      setAddingNote(true);
      await api.updateCustomer(customer.id, {
        notes: customer.notes
          ? `${customer.notes}\n${newNote}`
          : newNote,
      });
      setCustomer({
        ...customer,
        notes: customer.notes
          ? `${customer.notes}\n${newNote}`
          : newNote,
      });
      setNewNote("");
      toast.success("Note added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-10 w-10 text-[rgb(var(--color-danger))]" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load customer</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2">
                <AvatarFallback
                  style={{ backgroundColor: avatarColor(customer.name) }}
                  className="text-lg text-white"
                >
                  {initials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{customer.name}</h2>
                  <Badge
                    variant={
                      customer.churnRisk === "LOW"
                        ? "success"
                        : customer.churnRisk === "MEDIUM"
                          ? "warning"
                          : customer.churnRisk === "HIGH"
                            ? "accent"
                            : "danger"
                    }
                    className="text-[0.65rem]"
                  >
                    {customer.churnRisk} risk
                  </Badge>
                  <Badge
                    variant={
                      customer.loyaltyBand === "VIP"
                        ? "primary"
                        : customer.loyaltyBand === "LOYAL"
                          ? "success"
                          : "outline"
                    }
                    className="text-[0.65rem]"
                  >
                    {customer.loyaltyBand}
                  </Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {customer.email}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {customer.address}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Customer since {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Total Spent</p>
            <p className="mt-1 text-xl font-semibold">{fmt(customer.lifetimeValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Visits</p>
            <p className="mt-1 text-xl font-semibold">{customer.visitCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Points</p>
            <p className="mt-1 text-xl font-semibold">{customer.pointsBalance.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Avg Spend</p>
            <p className="mt-1 text-xl font-semibold">{fmt(customer.averageSpend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">LTV</p>
            <p className="mt-1 text-xl font-semibold">{fmt(customer.lifetimeValue)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4" />
            Activity Timeline
          </TabsTrigger>
          <TabsTrigger value="ledger">
            <Gift className="h-4 w-4" />
            Points Ledger
          </TabsTrigger>
          <TabsTrigger value="membership">
            <Award className="h-4 w-4" />
            Membership
          </TabsTrigger>
          <TabsTrigger value="insights">
            <TrendingUp className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {customer.timeline.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 border-b border-[rgb(var(--color-border))] px-5 py-3.5 last:border-0"
                  >
                    <TimelineIcon kind={entry.kind} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{entry.title}</p>
                      {entry.description && (
                        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {entry.amount != null && (
                        <p className="text-sm font-medium">{fmt(entry.amount)}</p>
                      )}
                      {entry.points != null && (
                        <p className="text-xs text-[rgb(var(--color-primary))]">
                          {entry.points > 0 ? "+" : ""}
                          {entry.points} pts
                        </p>
                      )}
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        {relativeTime(entry.date)}
                      </p>
                    </div>
                  </div>
                ))}
                {customer.timeline.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
                    No activity yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.pointsLedger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.type === "EARN" || entry.type === "BONUS"
                              ? "success"
                              : entry.type === "REDEEM"
                                ? "warning"
                                : "outline"
                          }
                          className="text-[0.6rem]"
                        >
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={
                          entry.points > 0
                            ? "text-[rgb(var(--color-success))]"
                            : "text-[rgb(var(--color-danger))]"
                        }
                      >
                        {entry.points > 0 ? "+" : ""}
                        {entry.points.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{entry.balanceAfter.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">
                        {entry.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                  {customer.pointsLedger.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-[rgb(var(--color-muted-foreground))]">
                        No points activity yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membership">
          <Card>
            <CardContent className="p-6">
              {customer.membership ? (
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                    <Award className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{customer.membership.tierName}</h4>
                    <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                      {customer.membership.active ? "Active" : "Inactive"} ·{" "}
                      {new Date(customer.membership.startDate).toLocaleDateString()} –{" "}
                      {new Date(customer.membership.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                  No active membership
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>AI Churn Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      customer.churnRisk === "LOW"
                        ? "bg-[rgb(var(--color-success)/0.1)] text-[rgb(var(--color-success))]"
                        : customer.churnRisk === "MEDIUM"
                          ? "bg-[rgb(var(--color-warning)/0.1)] text-[rgb(var(--color-warning))]"
                          : customer.churnRisk === "HIGH"
                            ? "bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-accent))]"
                            : "bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]"
                    }`}
                  >
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {customer.churnRisk} Risk
                    </p>
                    <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                      Loyalty Score: {customer.loyaltyScore}/100
                    </p>
                  </div>
                </div>
                {customer.predictedNextVisitDays != null && (
                  <div className="mt-4 rounded-lg bg-[rgb(var(--color-muted))] p-3">
                    <p className="text-sm">
                      <span className="font-medium">Predicted next visit: </span>
                      In ~{customer.predictedNextVisitDays} days
                    </p>
                  </div>
                )}
                {customer.upgradeRecommendation && (
                  <div className="mt-3 rounded-lg bg-[rgb(var(--color-primary)/0.08)] p-3">
                    <p className="text-sm">
                      <span className="font-medium">Recommendation: </span>
                      Upgrade to {customer.upgradeRecommendation.tier} —{" "}
                      {customer.upgradeRecommendation.reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferred Services</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.preferredServices.length > 0 ? (
                  <div className="space-y-3">
                    {customer.preferredServices.map((s) => (
                      <div key={s.name} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-sm text-[rgb(var(--color-muted-foreground))]">
                          {s.count} visits · Last {relativeTime(s.lastAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                    No service data yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags & Notes
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {customer.tags.map((tag) => (
              <Badge key={tag} variant="primary" className="text-[0.65rem]">
                {tag}
              </Badge>
            ))}
            {customer.tags.length === 0 && (
              <span className="text-sm text-[rgb(var(--color-muted-foreground))]">No tags</span>
            )}
          </div>
          {customer.notes && (
            <div className="mb-4 rounded-lg bg-[rgb(var(--color-muted))] p-3">
              <p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
            />
            <Button onClick={handleAddNote} loading={addingNote} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineIcon({ kind }: { kind: string }) {
  const icons: Record<string, React.ReactNode> = {
    VISIT: <ShoppingBag className="h-4 w-4 text-[rgb(var(--color-primary))]" />,
    INVOICE: <DollarSign className="h-4 w-4 text-[rgb(var(--color-success))]" />,
    POINTS: <Star className="h-4 w-4 text-[rgb(var(--color-warning))]" />,
    REWARD: <Gift className="h-4 w-4 text-[rgb(var(--color-accent))]" />,
    MEMBERSHIP: <Award className="h-4 w-4 text-[rgb(var(--color-violet, #8B5CF6))]" />,
    NOTE: <MessageSquare className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />,
  };
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-muted))]">
      {icons[kind] ?? <FileText className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />}
    </div>
  );
}
