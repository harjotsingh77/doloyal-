"use client";

import * as React from "react";
import {
  Save, Clock, CalendarX, Plus, Trash2, AlertCircle,
  X, Sun, Moon, Sunrise, Sunset,
} from "lucide-react";
import {
  Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  PageHeader, Skeleton, Field, Input, Label, Switch, Badge,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
  EmptyState,
} from "@doloyal/ui";
import type { AvailabilitySettings, BlockedDateRecord } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

const DAYS = [
  { key: "1", label: "Monday", short: "Mon", icon: Sun },
  { key: "2", label: "Tuesday", short: "Tue", icon: Sunrise },
  { key: "3", label: "Wednesday", short: "Wed", icon: Sunrise },
  { key: "4", label: "Thursday", short: "Thu", icon: Sunrise },
  { key: "5", label: "Friday", short: "Fri", icon: Sunrise },
  { key: "6", label: "Saturday", short: "Sat", icon: Sunset },
  { key: "0", label: "Sunday", short: "Sun", icon: Moon },
];

const BUFFER_OPTIONS = [
  { value: "0", label: "No buffer" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
];

const NOTICE_OPTIONS = [
  { value: "0", label: "No minimum notice" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "240", label: "4 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
  { value: "2880", label: "48 hours" },
];

const ADVANCE_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AvailabilityPage() {
  const [availability, setAvailability] = React.useState<AvailabilitySettings | null>(null);
  const [blockedDates, setBlockedDates] = React.useState<BlockedDateRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [addDateOpen, setAddDateOpen] = React.useState(false);
  const [newBlockDate, setNewBlockDate] = React.useState("");
  const [newBlockReason, setNewBlockReason] = React.useState("");
  const [newBlockFullDay, setNewBlockFullDay] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [avail, blocked] = await Promise.all([
        api.getAvailability(),
        api.listBlockedDates(),
      ]);
      setAvailability(avail);
      setBlockedDates(blocked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load availability settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleDayToggle = (dayKey: string, closed: boolean) => {
    if (!availability) return;
    const updated = { ...availability.businessHours };
    if (closed) {
      updated[dayKey] = null;
    } else {
      updated[dayKey] = updated[dayKey] ?? { open: "09:00", close: "18:00" };
    }
    setAvailability({ ...availability, businessHours: updated });
  };

  const handleTimeChange = (dayKey: string, field: "open" | "close", value: string) => {
    if (!availability) return;
    const current = availability.businessHours[dayKey];
    if (!current) return;
    setAvailability({
      ...availability,
      businessHours: {
        ...availability.businessHours,
        [dayKey]: { ...current, [field]: value },
      },
    });
  };

  const handleSave = async () => {
    if (!availability) return;
    try {
      setSaving(true);
      const updated = await api.updateAvailability({
        businessHours: availability.businessHours,
        maxDailyBookings: availability.maxDailyBookings,
        minBookingNotice: availability.minBookingNotice,
        maxAdvanceBookingDays: availability.maxAdvanceBookingDays,
        bufferTime: availability.bufferTime,
      });
      setAvailability(updated);
      toast.success("Availability settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlockedDate = async () => {
    if (!newBlockDate) {
      toast.error("Please select a date");
      return;
    }
    try {
      const result = await api.addBlockedDate({
        date: newBlockDate,
        reason: newBlockReason || undefined,
        isFullDay: newBlockFullDay,
      });
      setBlockedDates((prev) => [...prev, result]);
      setAddDateOpen(false);
      setNewBlockDate("");
      setNewBlockReason("");
      setNewBlockFullDay(true);
      toast.success("Blocked date added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add blocked date");
    }
  };

  const handleRemoveBlockedDate = async (id: string) => {
    try {
      setDeletingId(id);
      await api.removeBlockedDate(id);
      setBlockedDates((prev) => prev.filter((b) => b.id !== id));
      toast.success("Blocked date removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove blocked date");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <AvailabilitySkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-10 w-10 text-[rgb(var(--color-danger))]" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load availability settings</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <Button variant="ghost" className="mt-4" onClick={load}>Retry</Button>
      </div>
    );
  }

  if (!availability) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability Settings"
        description="Configure your business hours and booking rules"
        actions={
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              Business Hours
            </div>
          </CardTitle>
          <CardDescription>Set your operating hours for each day of the week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {DAYS.map((day) => {
              const hours = availability.businessHours[day.key];
              const Icon = day.icon;
              return (
                <Card key={day.key} className={!hours ? "opacity-60" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
                        <span className="text-sm font-medium">{day.short}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[rgb(var(--color-muted-foreground))]">Closed</span>
                        <Switch
                          checked={!hours}
                          onCheckedChange={(checked) => handleDayToggle(day.key, checked)}
                        />
                      </div>
                    </div>
                    {hours ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleTimeChange(day.key, "open", e.target.value)}
                          className="h-8 text-xs"
                        />
                        <span className="text-xs text-[rgb(var(--color-muted-foreground))]">to</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleTimeChange(day.key, "close", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Closed</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-[rgb(var(--color-warning))]" />
              Booking Rules
            </div>
          </CardTitle>
          <CardDescription>Configure limits and notice periods for bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Buffer between appointments" hint="Time gap between bookings">
              <Select
                value={String(availability.bufferTime)}
                onValueChange={(v) => setAvailability({ ...availability, bufferTime: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUFFER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Minimum booking notice" hint="How far in advance must clients book">
              <Select
                value={String(availability.minBookingNotice)}
                onValueChange={(v) => setAvailability({ ...availability, minBookingNotice: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTICE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Maximum advance booking" hint="How far ahead clients can book">
              <Select
                value={String(availability.maxAdvanceBookingDays)}
                onValueChange={(v) => setAvailability({ ...availability, maxAdvanceBookingDays: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADVANCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Maximum daily bookings" hint="Limit bookings per day">
              <Input
                type="number"
                min={1}
                max={500}
                value={availability.maxDailyBookings}
                onChange={(e) =>
                  setAvailability({ ...availability, maxDailyBookings: parseInt(e.target.value) || 1 })
                }
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <CalendarX className="h-4 w-4 text-[rgb(var(--color-danger))]" />
                  Blocked Dates
                </div>
              </CardTitle>
              <CardDescription>Dates when your business is closed or unavailable</CardDescription>
            </div>
            <Dialog open={addDateOpen} onOpenChange={setAddDateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Add Blocked Date
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Blocked Date</DialogTitle>
                  <DialogDescription>Mark a date as unavailable for bookings.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Field label="Date" required>
                    <Input
                      type="date"
                      value={newBlockDate}
                      onChange={(e) => setNewBlockDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Reason (optional)">
                    <Input
                      placeholder="e.g. Public holiday, Staff training"
                      value={newBlockReason}
                      onChange={(e) => setNewBlockReason(e.target.value)}
                    />
                  </Field>
                  <div className="flex items-center gap-3">
                    <Label>Full day</Label>
                    <Switch checked={newBlockFullDay} onCheckedChange={setNewBlockFullDay} />
                  </div>
                  {!newBlockFullDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="From">
                        <Input
                          type="time"
                          value="09:00"
                          onChange={() => {}}
                        />
                      </Field>
                      <Field label="To">
                        <Input
                          type="time"
                          value="13:00"
                          onChange={() => {}}
                        />
                      </Field>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setAddDateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBlockedDate}>
                    <CalendarX className="h-4 w-4" />
                    Block Date
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {blockedDates.length === 0 ? (
            <EmptyState
              icon={<CalendarX className="h-6 w-6" />}
              title="No blocked dates"
              description="Add dates when your business is closed to prevent unwanted bookings"
              action={
                <Button size="sm" onClick={() => setAddDateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Blocked Date
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {blockedDates.map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-center justify-between rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
                      <CalendarX className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{formatDate(bd.date)}</p>
                      <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-muted-foreground))]">
                        {bd.reason && <span>{bd.reason}</span>}
                        <Badge variant="outline" className="text-[0.6rem]">
                          {bd.isFullDay ? "Full Day" : "Partial"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-[rgb(var(--color-danger))] shrink-0"
                    onClick={() => handleRemoveBlockedDate(bd.id)}
                    loading={deletingId === bd.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AvailabilitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="mt-3 h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-10 w-full rounded-lg" />
                <Skeleton className="mt-1 h-3 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-1 h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
