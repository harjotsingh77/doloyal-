"use client";

import * as React from "react";
import {
  CalendarDays,
  Plus,
  ChevronRight,
  Clock,
  Check,
  XCircle,
  AlertCircle,
  Search,
  List,
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
  Calendar,
  User,
  Phone,
  Mail,
  Tag,
  DollarSign,
  RefreshCw,
  ChevronLeft,
  Bell,
  BellOff,
  CheckCircle,
  XOctagon,
  UserCheck,
  Play,
  Ban,
  CalendarClock,
  Link,
  Globe,
  MessageSquare,
  Instagram,
  Facebook,
  BookOpen,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Badge,
  Skeleton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Field,
  EmptyState,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Label,
} from "@doloyal/ui";
import { motion, AnimatePresence } from "framer-motion";
import { relativeTime } from "@doloyal/shared";
import type { Appointment, AppointmentDetail } from "@doloyal/shared";
import type { BookingSource, PaymentStatus, AppointmentStatusExtended } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ViewMode = "table" | "kanban" | "calendar" | "timeline";

const STATUSES = ["BOOKED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const STATUS_COLORS: Record<string, "outline" | "accent" | "warning" | "success" | "danger" | "primary"> = {
  BOOKED: "outline",
  CONFIRMED: "accent",
  CHECKED_IN: "accent",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  BOOKED: "Booked",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  BOOKED: <Calendar className="h-3 w-3" />,
  CONFIRMED: <CheckCircle className="h-3 w-3" />,
  CHECKED_IN: <UserCheck className="h-3 w-3" />,
  IN_PROGRESS: <Play className="h-3 w-3" />,
  COMPLETED: <Check className="h-3 w-3" />,
  CANCELLED: <Ban className="h-3 w-3" />,
  NO_SHOW: <XOctagon className="h-3 w-3" />,
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  DASHBOARD: <LayoutGrid className="h-3 w-3" />,
  BOOKING_LINK: <Link className="h-3 w-3" />,
  WEBSITE_WIDGET: <Globe className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  INSTAGRAM: <Instagram className="h-3 w-3" />,
  FACEBOOK: <Facebook className="h-3 w-3" />,
  MANUAL_ENTRY: <BookOpen className="h-3 w-3" />,
  PHONE_CALL: <Phone className="h-3 w-3" />,
};

const SOURCE_LABELS: Record<string, string> = {
  DASHBOARD: "Dashboard",
  BOOKING_LINK: "Booking Link",
  WEBSITE_WIDGET: "Website",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  MANUAL_ENTRY: "Manual",
  PHONE_CALL: "Phone Call",
};

const PAYMENT_STATUS_COLORS: Record<string, "success" | "warning" | "danger" | "outline" | "accent"> = {
  PAID: "success",
  PENDING: "warning",
  DEPOSIT: "accent",
  REFUNDED: "danger",
};

const KANBAN_COLUMNS = [
  { key: "BOOKED", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "CHECKED_IN", label: "Checked In" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "NO_SHOW", label: "No Show" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface TodaySummary {
  count: number;
  nextAppt: Appointment | null;
  checkedIn: number;
  inProgress: number;
  completed: number;
  remaining: number;
}

function computeTodaySummary(appts: Appointment[]): TodaySummary {
  const today = new Date();
  const todayStr = localDateStr(today);
  const todays = appts.filter((a) => a.startsAt.startsWith(todayStr)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return {
    count: todays.length,
    nextAppt: todays.length > 0 ? todays[0] : null,
    checkedIn: todays.filter((a) => (a.status as string) === "CHECKED_IN").length,
    inProgress: todays.filter((a) => a.status === "IN_PROGRESS").length,
    completed: todays.filter((a) => a.status === "COMPLETED").length,
      remaining: todays.filter((a) => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status as string)).length,
  };
}

// ─── Calendar helpers ────────────────────────────────────────────────────────

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ─── Timeline helpers ────────────────────────────────────────────────────────

const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
  if (h < 22) TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
}

function getTimeTop(iso: string): number {
  const d = new Date(iso);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const base = 6 * 60;
  return ((minutes - base) / (30)) * 44 + 8;
}

function getDurationMinutes(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [highlightedIds, setHighlightedIds] = React.useState<Set<string>>(new Set());

  // View state
  const [viewMode, setViewMode] = React.useState<ViewMode>("table");
  const [showRefreshMsg, setShowRefreshMsg] = React.useState(false);
  const [isSpinning, setIsSpinning] = React.useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [staffFilter, setStaffFilter] = React.useState("ALL");
  const [sourceFilter, setSourceFilter] = React.useState("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Detail dialog
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = React.useState(false);
  const [addCustomerId, setAddCustomerId] = React.useState("");
  const [addServiceName, setAddServiceName] = React.useState("");
  const [addStartsAt, setAddStartsAt] = React.useState("");
  const [addStaffName, setAddStaffName] = React.useState("");
  const [addNotes, setAddNotes] = React.useState("");
  const [customers, setCustomers] = React.useState<{ id: string; name: string }[]>([]);

  // Calendar state
  const [calYear, setCalYear] = React.useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = React.useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  const [updating, setUpdating] = React.useState(false);
  const [adding, setAdding] = React.useState(false);

  // Staff list for filter
  const [staffList, setStaffList] = React.useState<string[]>([]);

  const loadAppointments = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { status?: string; from?: string; to?: string } = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const result = await api.listAppointments(params);
      setAppointments((prev) => {
        const prevIds = new Set(prev.map((a) => a.id));
        const newIds = new Set(result.map((a) => a.id));
        const diff = new Set<string>();
        result.forEach((a) => { if (!prevIds.has(a.id)) diff.add(a.id); });
        if (diff.size > 0) setHighlightedIds(diff);
        return result;
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  const handleManualRefresh = React.useCallback(async () => {
    setIsSpinning(true);
    setShowRefreshMsg(false);

    const start = Date.now();
    await loadAppointments();
    const elapsed = Date.now() - start;
    if (elapsed < 650) {
      await new Promise((resolve) => setTimeout(resolve, 650 - elapsed));
    }

    setIsSpinning(false);
    setShowRefreshMsg(true);
  }, [loadAppointments]);

  // Hide refresh message after 5 seconds
  React.useEffect(() => {
    if (showRefreshMsg) {
      const timer = setTimeout(() => {
        setShowRefreshMsg(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showRefreshMsg]);

  const loadCustomers = React.useCallback(async () => {
    try {
      const result = await api.listCustomers({ limit: 200 });
      setCustomers(result.items.map((c) => ({ id: c.id, name: c.name })));
    } catch {
      // non-critical
    }
  }, []);

  React.useEffect(() => {
    loadAppointments();
    loadCustomers();
  }, [loadAppointments, loadCustomers]);

  // Poll every 30s
  React.useEffect(() => {
    const interval = setInterval(() => {
      loadAppointments();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAppointments]);

  // Clear highlights after 3s
  React.useEffect(() => {
    if (highlightedIds.size > 0) {
      const t = setTimeout(() => setHighlightedIds(new Set()), 3000);
      return () => clearTimeout(t);
    }
  }, [highlightedIds]);

  // Derive staff list from appointments
  React.useEffect(() => {
    const names = new Set(appointments.map((a) => a.staffName).filter(Boolean));
    setStaffList(Array.from(names) as string[]);
  }, [appointments]);

  const handleStatusUpdate = React.useCallback(
    async (id: string, status: string) => {
      try {
        setUpdating(true);
        await api.updateAppointmentStatus(id, status);
        toast.success(`Status updated to ${STATUS_LABELS[status] ?? status}`);
        setDetailOpen(false);
        setSelected(null);
        loadAppointments();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update appointment");
      } finally {
        setUpdating(false);
      }
    },
    [loadAppointments],
  );

  const handleCreate = async () => {
    if (!addCustomerId || !addServiceName || !addStartsAt) {
      toast.error("Customer, service, and appointment time are required");
      return;
    }
    try {
      setAdding(true);
      await api.createAppointment({
        customerId: addCustomerId,
        serviceName: addServiceName,
        startsAt: addStartsAt,
        staffName: addStaffName || undefined,
        notes: addNotes || undefined,
      });
      setAddOpen(false);
      setAddCustomerId("");
      setAddServiceName("");
      setAddStartsAt("");
      setAddStaffName("");
      setAddNotes("");
      loadAppointments();
      toast.success("Appointment booked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not book appointment");
    } finally {
      setAdding(false);
    }
  };

  // ─── Filtered & sorted appointments ──────────────────────────────────

  const filtered = React.useMemo(() => {
    let items = [...appointments];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (a) =>
          a.customerName.toLowerCase().includes(q) ||
          a.serviceName.toLowerCase().includes(q) ||
          (a.staffName && a.staffName.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "ALL") {
      items = items.filter((a) => a.status === statusFilter);
    }

    if (staffFilter !== "ALL") {
      items = items.filter((a) => a.staffName === staffFilter);
    }

    if (sourceFilter !== "ALL") {
      items = items.filter((a) => (a as any).source === sourceFilter);
    }

    if (dateFrom) {
      items = items.filter((a) => a.startsAt.slice(0, 10) >= dateFrom);
    }

    if (dateTo) {
      items = items.filter((a) => a.startsAt.slice(0, 10) <= dateTo);
    }

    items.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return items;
  }, [appointments, searchQuery, statusFilter, staffFilter, sourceFilter, dateFrom, dateTo]);

  const todaySummary = React.useMemo(() => computeTodaySummary(appointments), [appointments]);

  // ─── Calendar ────────────────────────────────────────────────────────

  const calGrid = React.useMemo(() => getMonthGrid(calYear, calMonth), [calYear, calMonth]);

  const apptsByCalDay = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((a) => {
      const key = a.startsAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [appointments]);

  const selectedDayAppts = React.useMemo(() => {
    if (!selectedDay) return [];
    const key = localDateStr(selectedDay);
    return (apptsByCalDay.get(key) ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [selectedDay, apptsByCalDay]);

  // ─── Timeline ────────────────────────────────────────────────────────

  const [timelineDate, setTimelineDate] = React.useState(() => {
    const d = new Date();
    return localDateStr(d);
  });

  const timelineAppts = React.useMemo(() => {
    return appointments
      .filter((a) => a.startsAt.startsWith(timelineDate))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [appointments, timelineDate]);

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Manage your daily appointments and bookings"
        actions={
          <div className="flex items-center gap-3">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  New Appointment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Appointment</DialogTitle>
                  <DialogDescription>Schedule a new appointment for a customer.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Field label="Customer" required>
                    <Select value={addCustomerId} onValueChange={setAddCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Service" required>
                    <Input
                      placeholder="Haircut, Facial, etc."
                      value={addServiceName}
                      onChange={(e) => setAddServiceName(e.target.value)}
                    />
                  </Field>
                  <Field label="Date & Time" required>
                    <Input
                      type="datetime-local"
                      value={addStartsAt}
                      onChange={(e) => setAddStartsAt(e.target.value)}
                    />
                  </Field>
                  <Field label="Staff">
                    <Input
                      placeholder="Staff name"
                      value={addStaffName}
                      onChange={(e) => setAddStaffName(e.target.value)}
                    />
                  </Field>
                  <Field label="Notes">
                    <Input
                      placeholder="Any special requests"
                      value={addNotes}
                      onChange={(e) => setAddNotes(e.target.value)}
                    />
                  </Field>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} loading={adding}>
                    Create Appointment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* ── Today's Summary Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--color-accent)/0.12)] text-[rgb(var(--color-accent))]">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Today's Appointments</p>
                  <p className="text-xl font-bold">{todaySummary.count}</p>
                </div>
              </div>
              {todaySummary.nextAppt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
                  <span>
                    Next: <strong>{formatTime(todaySummary.nextAppt.startsAt)}</strong> — {todaySummary.nextAppt.customerName}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 ml-auto text-xs">
                <Badge variant="accent">Checked In: {todaySummary.checkedIn}</Badge>
                <Badge variant="warning">In Progress: {todaySummary.inProgress}</Badge>
                <Badge variant="success">Completed: {todaySummary.completed}</Badge>
                <Badge variant="default">Remaining: {todaySummary.remaining}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── View Mode Toggle & Filters ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            {/* View toggle + last updated */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Tabs
                  value={viewMode}
                  onValueChange={(v) => {
                    setViewMode(v as ViewMode);
                    if (v === "calendar") {
                      const today = new Date();
                      setCalYear(today.getFullYear());
                      setCalMonth(today.getMonth());
                      setSelectedDay(today);
                    }
                    if (v === "timeline") {
                      setTimelineDate(new Date().toISOString().slice(0, 10));
                    }
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="table">
                      <List className="h-4 w-4" />
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="kanban">
                      <LayoutGrid className="h-4 w-4" />
                      Kanban
                    </TabsTrigger>
                    <TabsTrigger value="calendar">
                      <CalendarDays className="h-4 w-4" />
                      Calendar
                    </TabsTrigger>
                    <TabsTrigger value="timeline">
                      <CalendarClock className="h-4 w-4" />
                      Timeline
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {showRefreshMsg && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9, x: 6 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 6 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg bg-[rgb(var(--color-accent)/0.12)] px-2.5 py-1 text-xs font-medium text-[rgb(var(--color-accent))]"
                    >
                      Refreshed just now
                    </motion.span>
                  )}
                </AnimatePresence>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="h-9 w-9 rounded-lg border-[rgb(var(--color-border))] transition-transform active:scale-95"
                  title="Click to refresh appointments"
                >
                  <RefreshCw className={`h-4 w-4 text-[rgb(var(--color-muted-foreground))] transition-transform duration-300 ${isSpinning || loading ? "animate-spin text-[rgb(var(--color-primary))]" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
                <Input
                  placeholder="Search by customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36"
                />
                <span className="text-[rgb(var(--color-muted-foreground))]">—</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36"
                />
              </div>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Staff</SelectItem>
                  {staffList.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        {/* ── Content area ── */}
        <CardContent className="p-0">
          {loading && filtered.length === 0 && (viewMode === "table" || viewMode === "kanban") ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-[var(--radius)]" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12">
              <AlertCircle className="h-8 w-8 text-[rgb(var(--color-danger))] mb-2" />
              <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>
              <Button variant="ghost" className="mt-3" onClick={() => loadAppointments()}>
                Try again
              </Button>
            </div>
          ) : viewMode === "table" ? (
            <TableView
              filtered={filtered}
              highlightedIds={highlightedIds}
              onSelect={(a) => {
                setSelected(a);
                setDetailOpen(true);
              }}
              onStatusUpdate={handleStatusUpdate}
              updating={updating}
            />
          ) : viewMode === "kanban" ? (
            <KanbanView
              appointments={filtered}
              onSelect={(a) => {
                setSelected(a);
                setDetailOpen(true);
              }}
              onStatusUpdate={handleStatusUpdate}
              updating={updating}
            />
          ) : viewMode === "calendar" ? (
            <CalendarView
              calYear={calYear}
              calMonth={calMonth}
              calGrid={calGrid}
              apptsByCalDay={apptsByCalDay}
              selectedDay={selectedDay}
              onPrevMonth={() => {
                if (calMonth === 0) {
                  setCalYear((y) => y - 1);
                  setCalMonth(11);
                } else {
                  setCalMonth((m) => m - 1);
                }
                setSelectedDay(null);
              }}
              onNextMonth={() => {
                if (calMonth === 11) {
                  setCalYear((y) => y + 1);
                  setCalMonth(0);
                } else {
                  setCalMonth((m) => m + 1);
                }
                setSelectedDay(null);
              }}
              onToday={() => {
                const today = new Date();
                setCalYear(today.getFullYear());
                setCalMonth(today.getMonth());
                setSelectedDay(today);
              }}
              onDayClick={(date) => setSelectedDay(date)}
              selectedDayAppts={selectedDayAppts}
              onSelectAppt={(a) => {
                setSelected(a);
                setDetailOpen(true);
              }}
            />
          ) : (
            <TimelineView
              timelineDate={timelineDate}
              timelineAppts={timelineAppts}
              onPrevDay={() => {
                const d = new Date(timelineDate);
                d.setDate(d.getDate() - 1);
                setTimelineDate(d.toISOString().slice(0, 10));
              }}
              onNextDay={() => {
                const d = new Date(timelineDate);
                d.setDate(d.getDate() + 1);
                setTimelineDate(d.toISOString().slice(0, 10));
              }}
              onToday={() => setTimelineDate(new Date().toISOString().slice(0, 10))}
              onSelect={(a) => {
                setSelected(a);
                setDetailOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Detail Dialog ── */}
      <DetailDialog
        selected={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TABLE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function TableView({
  filtered,
  highlightedIds,
  onSelect,
  onStatusUpdate,
  updating,
}: {
  filtered: Appointment[];
  highlightedIds: Set<string>;
  onSelect: (a: Appointment) => void;
  onStatusUpdate: (id: string, status: string) => void;
  updating: boolean;
}) {
  if (filtered.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No appointments found"
          description="Try adjusting your filters"
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Staff</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <AnimatePresence mode="popLayout">
          {filtered.map((a) => (
            <motion.tr
              key={a.id}
              layout
              initial={
                highlightedIds.has(a.id) ? { opacity: 0, backgroundColor: "rgb(var(--color-accent)/0.15)" } : undefined
              }
              animate={
                highlightedIds.has(a.id)
                  ? { opacity: 1, backgroundColor: "rgba(0,0,0,0)" }
                  : { opacity: 1, backgroundColor: "rgba(0,0,0,0)" }
              }
              transition={{ duration: 0.4 }}
              className="group cursor-pointer border-b border-[rgb(var(--color-border))] transition-colors hover:bg-[rgb(var(--color-muted)/0.4)]"
              onClick={() => onSelect(a)}
            >
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{formatDate(a.startsAt)}</span>
                  <span className="text-xs text-[rgb(var(--color-muted-foreground))]">{formatTime(a.startsAt)}</span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{a.customerName}</TableCell>
              <TableCell className="text-[rgb(var(--color-muted-foreground))]">{a.serviceName}</TableCell>
              <TableCell className="text-[rgb(var(--color-muted-foreground))]">{a.staffName ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_COLORS[a.status] ?? "outline"} className="gap-1 text-[0.65rem]">
                  {STATUS_ICONS[a.status]}
                  {STATUS_LABELS[a.status] ?? a.status}
                </Badge>
              </TableCell>
              <TableCell>
                <SourceBadge source={(a as any).source} />
              </TableCell>
              <TableCell className="text-xs text-[rgb(var(--color-muted-foreground))] max-w-[140px] truncate">
                {a.notes ?? "—"}
              </TableCell>
              <TableCell>
                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <QuickActions appointment={a} onStatusUpdate={onStatusUpdate} updating={updating} />
                </div>
              </TableCell>
            </motion.tr>
          ))}
        </AnimatePresence>
      </TableBody>
    </Table>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  KANBAN VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function KanbanView({
  appointments,
  onSelect,
  onStatusUpdate,
  updating,
}: {
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
  onStatusUpdate: (id: string, status: string) => void;
  updating: boolean;
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    KANBAN_COLUMNS.forEach((c) => map.set(c.key, []));
    appointments.forEach((a) => {
      const col = map.get(a.status);
      if (col) col.push(a);
      else map.get("BOOKED")!.push(a);
    });
    return map;
  }, [appointments]);

  const moveTo = (appt: Appointment, targetStatus: string) => {
    if (appt.status !== targetStatus) {
      onStatusUpdate(appt.id, targetStatus);
    }
  };

  const availableTargets = (currentStatus: string) => {
    const order = KANBAN_COLUMNS.map((c) => c.key);
    const idx = order.indexOf(currentStatus);
    if (idx === -1) return KANBAN_COLUMNS;
    if (["CANCELLED", "NO_SHOW", "COMPLETED"].includes(currentStatus)) return [];
    if (currentStatus === "BOOKED")
      return KANBAN_COLUMNS.filter((c) => ["CONFIRMED", "CANCELLED", "NO_SHOW"].includes(c.key));
    if (currentStatus === "CONFIRMED")
      return KANBAN_COLUMNS.filter((c) => ["CHECKED_IN", "CANCELLED", "NO_SHOW"].includes(c.key));
    if (currentStatus === "CHECKED_IN")
      return KANBAN_COLUMNS.filter((c) => ["IN_PROGRESS", "CANCELLED", "NO_SHOW"].includes(c.key));
    if (currentStatus === "IN_PROGRESS")
      return KANBAN_COLUMNS.filter((c) => ["COMPLETED", "CANCELLED"].includes(c.key));
    return [];
  };

  return (
    <div className="flex gap-3 overflow-x-auto p-4 pb-2">
      {KANBAN_COLUMNS.map((col) => {
        const items = grouped.get(col.key) ?? [];
        return (
          <div key={col.key} className="flex min-w-[200px] flex-1 flex-col rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.3)]">
            <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_COLORS[col.key] ?? "outline"} className="text-[0.6rem] px-1.5 py-0">
                  {items.length}
                </Badge>
                <span className="text-xs font-semibold">{col.label}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {items.length === 0 && (
                <p className="text-[0.65rem] text-[rgb(var(--color-muted-foreground))] text-center py-4">No appointments</p>
              )}
              {items.map((appt) => {
                const targets = availableTargets(appt.status);
                return (
                  <motion.div
                    key={appt.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="cursor-pointer rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-2.5 shadow-sm transition-shadow hover:shadow-md"
                    onClick={() => onSelect(appt)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{formatTime(appt.startsAt)}</span>
                      <Badge variant={STATUS_COLORS[appt.status] ?? "outline"} className="text-[0.5rem] px-1 py-0">
                        {STATUS_LABELS[appt.status]}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{appt.customerName}</p>
                    <p className="text-[0.65rem] text-[rgb(var(--color-muted-foreground))] truncate">{appt.serviceName}</p>
                    <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">{appt.staffName ?? ""}</p>
                    {targets.length > 0 && (
                      <div
                        className="mt-1.5 flex flex-wrap gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {targets.map((t) => (
                          <button
                            key={t.key}
                            disabled={updating}
                            className="rounded-md bg-[rgb(var(--color-muted))] px-1.5 py-0.5 text-[0.55rem] font-medium text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-primary)/0.1)] hover:text-[rgb(var(--color-primary))]"
                            onClick={() => moveTo(appt, t.key)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CALENDAR VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function CalendarView({
  calYear,
  calMonth,
  calGrid,
  apptsByCalDay,
  selectedDay,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDayClick,
  selectedDayAppts,
  onSelectAppt,
}: {
  calYear: number;
  calMonth: number;
  calGrid: (number | null)[];
  apptsByCalDay: Map<string, Appointment[]>;
  selectedDay: Date | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDayClick: (date: Date) => void;
  selectedDayAppts: Appointment[];
  onSelectAppt: (a: Appointment) => void;
}) {
  const today = new Date();

  return (
    <div className="p-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold min-w-[160px] text-center">
            {MONTH_NAMES[calMonth]} {calYear}
          </h3>
          <Button variant="ghost" size="icon-sm" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={onToday}>
          <CalendarDays className="h-3.5 w-3.5" />
          Today
        </Button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[0.65rem] font-medium text-[rgb(var(--color-muted-foreground))] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-[rgb(var(--color-border))] rounded-lg overflow-hidden border border-[rgb(var(--color-border))]">
        {calGrid.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="bg-[rgb(var(--color-surface))] min-h-[90px]" />;
          }
          const date = new Date(calYear, calMonth, day);
          const key = localDateStr(date);
          const dayAppts = apptsByCalDay.get(key) ?? [];
          const isSelected = selectedDay && isSameDay(date, selectedDay);
          const isTodayDate = isToday(date);

          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.97 }}
              onClick={() => onDayClick(date)}
              className={`flex flex-col items-start gap-0.5 bg-[rgb(var(--color-surface))] p-1.5 text-left transition-colors hover:bg-[rgb(var(--color-muted)/0.5)] min-h-[90px] ${
                isSelected ? "ring-2 ring-[rgb(var(--color-primary))] ring-inset" : ""
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    isTodayDate
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--color-primary))] text-white"
                      : ""
                  }`}
                >
                  {day}
                </span>
                {dayAppts.length > 0 && (
                  <Badge variant="accent" className="text-[0.5rem] px-1 py-0">
                    {dayAppts.length}
                  </Badge>
                )}
              </div>
              {dayAppts.slice(0, 3).map((appt) => (
                <span
                  key={appt.id}
                  className={`w-full truncate rounded-sm px-1 text-[0.55rem] leading-tight ${
                    appt.status === "COMPLETED"
                      ? "text-[rgb(var(--color-success))]"
                      : appt.status === "CANCELLED" || appt.status === "NO_SHOW"
                        ? "text-[rgb(var(--color-danger))] line-through"
                        : appt.status === "IN_PROGRESS"
                          ? "text-[rgb(var(--color-warning))] font-medium"
                          : "text-[rgb(var(--color-muted-foreground))]"
                  }`}
                >
                  {formatTime(appt.startsAt)} {appt.customerName}
                </span>
              ))}
              {dayAppts.length > 3 && (
                <span className="text-[0.55rem] text-[rgb(var(--color-accent))]">+{dayAppts.length - 3} more</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected day appointments */}
      {selectedDay && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <h4 className="text-sm font-semibold mb-2">
            Appointments for {formatFullDate(selectedDay.toISOString())}
          </h4>
          {selectedDayAppts.length === 0 ? (
            <p className="text-xs text-[rgb(var(--color-muted-foreground))] py-4 text-center">No appointments this day</p>
          ) : (
            <div className="rounded-lg border border-[rgb(var(--color-border))] divide-y divide-[rgb(var(--color-border))]">
              {selectedDayAppts.map((a) => (
                <button
                  key={a.id}
                  className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-[rgb(var(--color-muted)/0.3)]"
                  onClick={() => onSelectAppt(a)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-semibold">{formatTime(a.startsAt)}</span>
                      <span className="text-[0.55rem] text-[rgb(var(--color-muted-foreground))]">{formatTime(a.endsAt)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.customerName}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{a.serviceName}{a.staffName ? ` · ${a.staffName}` : ""}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_COLORS[a.status] ?? "outline"} className="text-[0.6rem]">
                    {STATUS_LABELS[a.status]}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMELINE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function TimelineView({
  timelineDate,
  timelineAppts,
  onPrevDay,
  onNextDay,
  onToday,
  onSelect,
}: {
  timelineDate: string;
  timelineAppts: Appointment[];
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onSelect: (a: Appointment) => void;
}) {
  const isTodayDate = isToday(new Date(timelineDate));

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onPrevDay}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold min-w-[180px] text-center">
            {formatFullDate(timelineDate)}
          </h3>
          <Button variant="ghost" size="icon-sm" onClick={onNextDay}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={onToday}>
          <CalendarDays className="h-3.5 w-3.5" />
          Go to Today
        </Button>
      </div>

      {/* Timeline columns */}
      <div className="relative flex" style={{ minHeight: `${TIME_SLOTS.length * 44 + 16}px` }}>
        {/* Time labels */}
        <div className="flex flex-col gap-[2px] pr-3 pt-2">
          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="flex items-center justify-end text-[0.6rem] text-[rgb(var(--color-muted-foreground))]" style={{ height: "44px" }}>
              {slot.endsWith(":00") ? slot : ""}
            </div>
          ))}
        </div>

        {/* Appointments area */}
        <div className="relative flex-1 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
          {/* Grid lines */}
          {TIME_SLOTS.map((slot, idx) => (
            <div
              key={slot}
              className={`border-b ${
                slot.endsWith(":00")
                  ? "border-[rgb(var(--color-border))]"
                  : "border-[rgb(var(--color-border)/0.4)]"
              }`}
              style={{ height: "44px" }}
            />
          ))}

          {/* Appointments blocks */}
          {timelineAppts.map((a) => {
            const top = getTimeTop(a.startsAt);
            const duration = getDurationMinutes(a.startsAt, a.endsAt);
            const height = Math.max(duration / 30, 1) * 44 - 4;

            const statusColorMap: Record<string, string> = {
              BOOKED: "bg-[rgb(var(--color-muted))] border-l-[rgb(var(--color-muted-foreground))]",
              CONFIRMED: "bg-[rgb(var(--color-accent)/0.1)] border-l-[rgb(var(--color-accent))]",
              CHECKED_IN: "bg-[rgb(var(--color-accent)/0.1)] border-l-[rgb(var(--color-accent))]",
              IN_PROGRESS: "bg-[rgb(var(--color-warning)/0.1)] border-l-[rgb(var(--color-warning))]",
              COMPLETED: "bg-[rgb(var(--color-success)/0.1)] border-l-[rgb(var(--color-success))]",
              CANCELLED: "bg-[rgb(var(--color-danger)/0.08)] border-l-[rgb(var(--color-danger))] opacity-60",
              NO_SHOW: "bg-[rgb(var(--color-danger)/0.08)] border-l-[rgb(var(--color-danger))] opacity-60",
            };

            return (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSelect(a)}
                className={`absolute left-1 right-1 cursor-pointer rounded-md border border-[rgb(var(--color-border))] border-l-[3px] p-2 text-left transition-shadow hover:shadow-md ${statusColorMap[a.status] ?? ""}`}
                style={{ top: `${top}px`, height: `${height}px`, minHeight: "36px" }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold truncate">{formatTime(a.startsAt)}</span>
                  <Badge variant={STATUS_COLORS[a.status] ?? "outline"} className="text-[0.5rem] px-1 py-0 shrink-0">
                    {STATUS_LABELS[a.status]}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate">{a.customerName}</p>
                <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))] truncate">
                  {a.serviceName}{a.staffName ? ` · ${a.staffName}` : ""}
                </p>
              </motion.button>
            );
          })}

          {/* Current time indicator */}
          {isTodayDate && (
            <CurrentTimeIndicator />
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator() {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const minutes = now.getHours() * 60 + now.getMinutes();
  const base = 6 * 60;
  const top = ((minutes - base) / 30) * 44 + 8;

  if (top < 0 || top > 44 * 32 + 8) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-[rgb(var(--color-danger))]" />
        <div className="h-px flex-1 bg-[rgb(var(--color-danger))]" />
        <span className="text-[0.55rem] text-[rgb(var(--color-danger))] font-medium mr-1">
          {formatTime(now.toISOString())}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

function DetailDialog({
  selected,
  open,
  onOpenChange,
}: {
  selected: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {!selected ? null : <DetailContent selected={selected} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DETAIL CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

function DetailContent({
  selected,
  onClose,
}: {
  selected: Appointment;
  onClose?: () => void;
}) {
  const [detailData, setDetailData] = React.useState<AppointmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [sendingNotif, setSendingNotif] = React.useState(false);

  React.useEffect(() => {
    setDetailLoading(true);
    setDetailError(null);
    api
      .getAppointmentDetail(selected.id)
      .then((data) => setDetailData(data))
      .catch((err) => setDetailError(err instanceof Error ? err.message : "Could not load details"))
      .finally(() => setDetailLoading(false));
  }, [selected.id]);

  const handleNotif = async () => {
    setSendingNotif(true);
    try {
      await api.sendNotification({ appointmentId: selected.id, type: "BOOKING_CONFIRMATION" });
      toast.success("Notification sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send notification");
    }
    setSendingNotif(false);
  };

  const appt = detailData ?? selected;
  const isTerminal = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appt.status as string);

  const statusActions = [
    { from: "BOOKED", to: "CONFIRMED", label: "Confirm", icon: <CheckCircle className="h-4 w-4" />, variant: "primary" as const },
    { from: "CONFIRMED", to: "CHECKED_IN", label: "Check In", icon: <UserCheck className="h-4 w-4" />, variant: "primary" as const },
    { from: "CHECKED_IN", to: "IN_PROGRESS", label: "Start", icon: <Play className="h-4 w-4" />, variant: "accent" as const },
    { from: "IN_PROGRESS", to: "COMPLETED", label: "Complete", icon: <Check className="h-4 w-4" />, variant: "success" as const },
  ];

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.updateAppointmentStatus(id, status);
      toast.success(`Status updated to ${STATUS_LABELS[status] ?? status}`);
      const updated = await api.getAppointmentDetail(id).catch(() => null);
      if (updated) setDetailData(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update appointment");
    }
  };

  if (detailLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }

  if (detailError) {
    return (
      <div className="flex flex-col items-center py-8">
        <AlertCircle className="h-6 w-6 text-[rgb(var(--color-danger))] mb-2" />
        <p className="text-sm text-[rgb(var(--color-danger))]">{detailError}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span>{appt.customerName}</span>
          <Badge variant={STATUS_COLORS[appt.status] ?? "outline"} className="gap-1 text-[0.6rem]">
            {STATUS_ICONS[appt.status]}
            {STATUS_LABELS[appt.status] ?? appt.status}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          {appt.serviceName}
          {appt.startsAt ? ` · ${formatDate(appt.startsAt)} at ${formatTime(appt.startsAt)}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
              <User className="h-3 w-3" /> Customer
            </span>
            <p className="font-medium mt-0.5">{appt.customerName}</p>
            {(appt as any).customerPhone && (
              <p className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                <Phone className="h-3 w-3" />{(appt as any).customerPhone}
              </p>
            )}
            {(appt as any).customerEmail && (
              <p className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                <Mail className="h-3 w-3" />{(appt as any).customerEmail}
              </p>
            )}
          </div>
          <div>
            <span className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
              <Tag className="h-3 w-3" /> Service
            </span>
            <p className="font-medium mt-0.5">{appt.serviceName}</p>
            {(appt as any).serviceDuration && (
              <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                {(appt as any).serviceDuration} min
              </p>
            )}
            {(appt as any).servicePrice && (
              <p className="flex items-center gap-1 text-xs font-medium">
                <DollarSign className="h-3 w-3" />
                {formatCurrency((appt as any).servicePrice ?? 0)}
              </p>
            )}
          </div>
          <div>
            <span className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
              <User className="h-3 w-3" /> Staff
            </span>
            <p className="font-medium mt-0.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--color-muted))] text-[0.55rem] font-semibold text-[rgb(var(--color-muted-foreground))]">
                {appt.staffName ? getInitials(appt.staffName) : "?"}
              </div>
              {appt.staffName ?? "—"}
            </p>
          </div>
          <div>
            <span className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
              <CalendarClock className="h-3 w-3" /> Date & Time
            </span>
            <p className="font-medium mt-0.5">
              {formatDate(appt.startsAt)} · {formatTime(appt.startsAt)}
            </p>
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Ends at {formatTime(appt.endsAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[rgb(var(--color-muted-foreground))]">Source:</span>
            <SourceBadge source={(appt as AppointmentDetail).source} />
          </div>
          {(appt as AppointmentDetail).paymentStatus && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[rgb(var(--color-muted-foreground))]">Payment:</span>
              <Badge variant={PAYMENT_STATUS_COLORS[(appt as AppointmentDetail).paymentStatus!] ?? "outline"} className="text-[0.55rem]">
                {(appt as AppointmentDetail).paymentStatus}
              </Badge>
            </div>
          )}
        </div>

        {appt.notes && (
          <div>
            <span className="text-xs text-[rgb(var(--color-muted-foreground))]">Notes</span>
            <p className="text-sm mt-1 rounded-lg bg-[rgb(var(--color-muted)/0.3)] p-2.5 text-[rgb(var(--color-foreground))]">
              {appt.notes}
            </p>
          </div>
        )}

        {(detailData?.activityTimeline?.length ?? 0) > 0 && (
          <div>
            <span className="text-xs font-semibold text-[rgb(var(--color-muted-foreground))]">Activity</span>
            <div className="mt-1.5 space-y-2">
              {detailData!.activityTimeline!.map((entry, i) => (
                <div key={entry.id ?? i} className="flex items-start gap-2">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--color-accent))]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{entry.message}</p>
                    <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">{relativeTime(entry.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-[rgb(var(--color-muted)/0.3)] p-2.5">
          <div className="flex items-center gap-2 text-xs">
            {detailData?.source === "BOOKING_LINK" ? (
              <>
                <Bell className="h-3.5 w-3.5 text-[rgb(var(--color-success))]" />
                <span className="text-[rgb(var(--color-muted-foreground))]">Notification: <span className="text-[rgb(var(--color-success))] font-medium">Sent</span></span>
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5 text-[rgb(var(--color-muted-foreground))]" />
                <span className="text-[rgb(var(--color-muted-foreground))]">Notification: <span className="font-medium">Not sent</span></span>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" loading={sendingNotif} onClick={handleNotif}>
            <Bell className="h-3.5 w-3.5" />
            Resend
          </Button>
        </div>

        {!isTerminal && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[rgb(var(--color-border))]">
            {statusActions
              .filter((action) => action.from === appt.status)
              .map((action) => (
                <Button
                  key={action.to}
                  size="sm"
                  variant={action.variant}
                  onClick={() => handleStatusUpdate(appt.id, action.to)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            {(appt.status === "BOOKED" || appt.status === "CONFIRMED" || (appt.status as string) === "CHECKED_IN") && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleStatusUpdate(appt.id, "CANCELLED")}
              >
                <Ban className="h-4 w-4" />
                Cancel
              </Button>
            )}
            {(appt.status === "BOOKED" || appt.status === "CONFIRMED") && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleStatusUpdate(appt.id, "NO_SHOW")}
              >
                <XOctagon className="h-4 w-4" />
                No Show
              </Button>
            )}
            {appt.status === "CONFIRMED" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleStatusUpdate(appt.id, "IN_PROGRESS")}
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        )}
        {isTerminal && appt.status === "CANCELLED" && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[rgb(var(--color-border))]">
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleStatusUpdate(appt.id, "BOOKED")}
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </Button>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => {}}>
          Close
        </Button>
      </DialogFooter>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SMALLER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function SourceBadge({ source }: { source: string | undefined | null }) {
  if (!source) return <span className="text-xs text-[rgb(var(--color-muted-foreground))]">—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[rgb(var(--color-muted))] px-1.5 py-0.5 text-[0.6rem] font-medium text-[rgb(var(--color-muted-foreground))]">
      {SOURCE_ICONS[source] ?? <Zap className="h-3 w-3" />}
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

function QuickActions({
  appointment,
  onStatusUpdate,
  updating,
}: {
  appointment: Appointment;
  onStatusUpdate: (id: string, status: string) => void;
  updating: boolean;
}) {
  const actions: { status: string; icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "ghost" | "accent" | "success" }[] = [];

  if (appointment.status === "BOOKED") {
    actions.push({ status: "CONFIRMED", icon: <CheckCircle className="h-3.5 w-3.5" />, label: "Confirm", variant: "primary" });
    actions.push({ status: "CANCELLED", icon: <XCircle className="h-3.5 w-3.5" />, label: "", variant: "ghost" });
  } else if (appointment.status === "CONFIRMED") {
    actions.push({ status: "CHECKED_IN", icon: <UserCheck className="h-3.5 w-3.5" />, label: "Check In", variant: "primary" });
    actions.push({ status: "CANCELLED", icon: <XCircle className="h-3.5 w-3.5" />, label: "", variant: "ghost" });
  } else if ((appointment.status as string) === "CHECKED_IN") {
    actions.push({ status: "IN_PROGRESS", icon: <Play className="h-3.5 w-3.5" />, label: "Start", variant: "accent" });
    actions.push({ status: "CANCELLED", icon: <XCircle className="h-3.5 w-3.5" />, label: "", variant: "ghost" });
  } else if (appointment.status === "IN_PROGRESS") {
    actions.push({ status: "COMPLETED", icon: <Check className="h-3.5 w-3.5" />, label: "Complete", variant: "success" });
  }

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.status}
          variant={action.variant ?? "ghost"}
          size="icon-sm"
          disabled={updating}
          onClick={() => onStatusUpdate(appointment.id, action.status)}
          title={action.label || action.status}
        >
          {action.icon}
        </Button>
      ))}
    </>
  );
}
