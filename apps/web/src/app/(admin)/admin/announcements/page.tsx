"use client";

import * as React from "react";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminAnnouncementItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

const TYPES = ["FEATURE", "MAINTENANCE", "IMPORTANT", "UPDATE"];
const AUDIENCES = ["ALL", "SELECTED_BUSINESSES", "ENTERPRISE"];

const TYPE_VARIANT: Record<string, string> = {
  FEATURE: "accent",
  MAINTENANCE: "warning",
  IMPORTANT: "danger",
  UPDATE: "outline",
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = React.useState<AdminAnnouncementItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [published, setPublished] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [edit, setEdit] = React.useState<AdminAnnouncementItem | "new" | null>(null);
  const pageSize = 20;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListAnnouncements({ published: published || undefined, page, pageSize });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [published, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [published]);

  const togglePublish = async (a: AdminAnnouncementItem) => {
    try {
      await api.adminPublishAnnouncement(a.id, !a.published);
      toast.success(a.published ? "Unpublished" : "Published");
      void load();
    } catch {
      toast.error("Action failed");
    }
  };

  const remove = async (a: AdminAnnouncementItem) => {
    if (!window.confirm(`Delete announcement "${a.title}"?`)) return;
    try {
      await api.adminDeleteAnnouncement(a.id);
      toast.success("Announcement deleted");
      void load();
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Product updates and notices delivered to businesses in-app."
        breadcrumbs={[{ label: "Admin" }, { label: "Announcements" }]}
        actions={
          <Button onClick={() => setEdit("new")}>
            <Plus className="h-4 w-4" />
            New announcement
          </Button>
        }
      />

      <div className="w-44">
        <Select value={published} onValueChange={(v) => setPublished(v === "ALL" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All states</SelectItem>
            <SelectItem value="true">Published</SelectItem>
            <SelectItem value="false">Drafts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState icon={<Megaphone className="h-10 w-10" />} title="No announcements yet" description="Create your first announcement to reach all businesses." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Announcement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Audience</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-right">Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-sm">
                      <p className="truncate font-medium text-[rgb(var(--color-foreground))]">{a.title}</p>
                      <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{a.message}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(TYPE_VARIANT[a.type] as any) ?? "outline"}>{a.type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs sm:table-cell">{a.audience.replace(/_/g, " ")}</TableCell>
                    <TableCell className="hidden text-xs text-[rgb(var(--color-muted-foreground))] md:table-cell">{relativeTime(a.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={a.published ? "success" : "outline"}>{a.published ? "Live" : "Draft"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant={a.published ? "outline" : "success"} onClick={() => togglePublish(a)}>
                          {a.published ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(a)}>
                          <Trash2 className="h-3.5 w-3.5 text-[rgb(var(--color-danger))]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Announcements" />

      <AnnouncementDialog
        item={edit}
        onClose={() => setEdit(null)}
        onSaved={() => {
          setEdit(null);
          void load();
        }}
      />
    </div>
  );
}

function AnnouncementDialog({
  item,
  onClose,
  onSaved,
}: {
  item: AdminAnnouncementItem | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = item !== "new" && item !== null;
  const [title, setTitle] = React.useState(editing && item ? item.title : "");
  const [message, setMessage] = React.useState(editing && item ? item.message : "");
  const [type, setType] = React.useState(editing && item ? item.type : "FEATURE");
  const [audience, setAudience] = React.useState(editing && item ? item.audience : "ALL");
  const [publishDate, setPublishDate] = React.useState(editing && item?.publishDate ? item.publishDate.slice(0, 16) : "");
  const [expiryDate, setExpiryDate] = React.useState(editing && item?.expiryDate ? item.expiryDate.slice(0, 16) : "");
  const [published, setPublished] = React.useState(editing && item ? item.published : false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (item === "new") {
      setTitle("");
      setMessage("");
      setType("FEATURE");
      setAudience("ALL");
      setPublishDate("");
      setExpiryDate("");
      setPublished(false);
    } else if (item) {
      setTitle(item.title);
      setMessage(item.message);
      setType(item.type);
      setAudience(item.audience);
      setPublishDate(item.publishDate?.slice(0, 16) ?? "");
      setExpiryDate(item.expiryDate?.slice(0, 16) ?? "");
      setPublished(item.published);
    }
  }, [item]);

  const save = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title,
        message,
        type,
        audience,
        publishDate: publishDate ? new Date(publishDate).toISOString() : null,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        published,
      };
      if (editing) {
        await api.adminUpdateAnnouncement(item.id, payload);
        toast.success("Announcement updated");
      } else {
        await api.adminCreateAnnouncement(payload);
        toast.success("Announcement created");
      }
      onSaved();
    } catch {
      toast.error("Could not save announcement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={item !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's new in Doloyal" />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Describe the announcement…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a.replace(/_/g, " ").toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Publish at (optional)</Label>
              <Input type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Expires at (optional)</Label>
              <Input type="datetime-local" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? "Save changes" : "Create announcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}