"use client";

import * as React from "react";
import {
  Bell, Mail, MessageSquare, Smartphone, Send, Edit, Trash2, Plus,
  Check, X, AlertCircle, Clock, Filter, Search
} from "lucide-react";
import {
  Button, Input, Card, CardContent, CardHeader, CardTitle,
  PageHeader, Badge, Skeleton, Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Field, EmptyState,
} from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { NotificationRecord, NotificationTemplate } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMATION: "Booking Confirmation",
  REMINDER_24H: "24h Reminder",
  REMINDER_2H: "2h Reminder",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancellation",
  THANK_YOU: "Thank You",
  ADMIN_NEW_BOOKING: "New Booking (Admin)",
  ADMIN_CANCELLED: "Cancelled (Admin)",
  ADMIN_RESCHEDULED: "Rescheduled (Admin)",
  ADMIN_NO_SHOW: "No Show Alert",
};

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  EMAIL: Mail,
  WHATSAPP: MessageSquare,
  SMS: Smartphone,
};

const STATUS_COLORS: Record<string, "success" | "warning" | "danger" | "outline"> = {
  SENT: "success",
  PENDING: "warning",
  FAILED: "danger",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([]);
  const [templates, setTemplates] = React.useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [formType, setFormType] = React.useState("BOOKING_CONFIRMATION");
  const [formChannel, setFormChannel] = React.useState("EMAIL");
  const [formSubject, setFormSubject] = React.useState("");
  const [formBody, setFormBody] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [notifs, tmpls] = await Promise.all([
        api.listNotifications(),
        api.listNotificationTemplates(),
      ]);
      setNotifications(notifs);
      setTemplates(tmpls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const filteredNotifications = React.useMemo(() => {
    let items = notifications;
    if (typeFilter !== "ALL") items = items.filter(n => n.type === typeFilter);
    if (statusFilter !== "ALL") items = items.filter(n => n.status === statusFilter);
    return items;
  }, [notifications, typeFilter, statusFilter]);

  const openTemplateDialog = (template?: NotificationTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormType(template.type);
      setFormChannel(template.channel);
      setFormSubject(template.subject ?? "");
      setFormBody(template.body);
    } else {
      setEditingTemplate(null);
      setFormType("BOOKING_CONFIRMATION");
      setFormChannel("EMAIL");
      setFormSubject("");
      setFormBody("");
    }
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!formBody.trim()) {
      toast.error("Body is required");
      return;
    }
    try {
      setSaving(true);
      await api.saveNotificationTemplate({
        type: formType,
        channel: formChannel,
        subject: formSubject || undefined,
        body: formBody,
      });
      setTemplateDialogOpen(false);
      loadData();
      toast.success(editingTemplate ? "Template updated" : "Template created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      setDeletingId(id);
      await api.deleteNotificationTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete template");
    } finally {
      setDeletingId(null);
    }
  };

  const handleResend = async (notif: NotificationRecord) => {
    if (!notif.appointmentId) {
      toast.error("No associated appointment");
      return;
    }
    try {
      await api.sendNotification({
        appointmentId: notif.appointmentId,
        type: notif.type,
        channel: notif.channel,
      });
      toast.success("Notification resent");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend");
    }
  };

  const variables = [
    "{{customerName}}", "{{businessName}}", "{{serviceName}}",
    "{{date}}", "{{time}}", "{{staffName}}", "{{location}}", "{{appointmentId}}"
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notifications" description="Manage appointment notifications and templates" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-[var(--radius)]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notifications" description="Manage appointment notifications and templates" />
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-8 w-8 text-[rgb(var(--color-danger))] mb-2" />
            <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>
            <Button variant="ghost" className="mt-3" onClick={loadData}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Manage appointment notifications and templates"
      />

      <Tabs defaultValue="sent">
        <TabsList>
          <TabsTrigger value="sent">
            <Send className="h-4 w-4" />
            Sent Notifications
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Edit className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredNotifications.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Bell className="h-6 w-6" />}
                    title="No notifications"
                    description="Notifications will appear here when appointments are booked"
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((n) => {
                      const ChannelIcon = CHANNEL_ICONS[n.channel] ?? Mail;
                      return (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium">{n.customerName ?? "—"}</TableCell>
                          <TableCell>
                            <span className="text-xs">{TYPE_LABELS[n.type] ?? n.type}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                              <ChannelIcon className="h-3.5 w-3.5" />
                              {n.channel}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{n.recipient}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_COLORS[n.status] ?? "outline"} className="text-[0.6rem]">
                              {n.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[rgb(var(--color-muted-foreground))]">
                            {n.sentAt ? relativeTime(n.sentAt) : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => handleResend(n)}
                              title="Resend"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openTemplateDialog()}>
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                  <DialogDescription>
                    Configure notification message template
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Field label="Type">
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Channel">
                    <Select value={formChannel} onValueChange={setFormChannel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {formChannel === "EMAIL" && (
                    <Field label="Subject">
                      <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="Email subject line" />
                    </Field>
                  )}
                  <Field label="Body" required>
                    <textarea
                      value={formBody}
                      onChange={e => setFormBody(e.target.value)}
                      placeholder="Your message template..."
                      className="w-full min-h-[120px] rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary)/0.3)] resize-y"
                      rows={5}
                    />
                  </Field>
                  <div>
                    <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))] mb-2">
                      Available variables:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {variables.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFormBody(prev => prev + v)}
                          className="text-[0.6rem] font-mono bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))] px-2 py-0.5 rounded hover:bg-[rgb(var(--color-primary)/0.1)] hover:text-[rgb(var(--color-primary))] transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveTemplate} loading={saving}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={<Edit className="h-6 w-6" />}
                  title="No templates yet"
                  description="Create your first notification template"
                  action={<Button onClick={() => openTemplateDialog()}><Plus className="h-4 w-4" />Create Template</Button>}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(t => {
                const ChannelIcon = CHANNEL_ICONS[t.channel] ?? Mail;
                return (
                  <Card key={t.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm">{TYPE_LABELS[t.type] ?? t.type}</CardTitle>
                          <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))] mt-1">
                            <ChannelIcon className="h-3 w-3" />
                            {t.channel}
                          </div>
                        </div>
                        <Badge variant={t.isActive ? "success" : "outline"} className="text-[0.55rem]">
                          {t.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {t.subject && (
                        <p className="text-xs font-medium text-[rgb(var(--color-foreground))] mb-1 truncate">
                          {t.subject}
                        </p>
                      )}
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))] line-clamp-2">
                        {t.body}
                      </p>
                      <div className="flex gap-2 mt-3 pt-2 border-t border-[rgb(var(--color-border))]">
                        <Button size="sm" variant="ghost" onClick={() => openTemplateDialog(t)}>
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-[rgb(var(--color-danger))]"
                          loading={deletingId === t.id}
                          onClick={() => handleDeleteTemplate(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
