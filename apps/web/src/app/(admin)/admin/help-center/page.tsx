"use client";

import * as React from "react";
import { LifeBuoy, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminHelpArticleItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

const CATEGORIES = ["Getting Started", "Loyalty", "Rewards", "Memberships", "Bookings", "Website", "AI", "Billing", "Integrations"];

export default function AdminHelpCenterPage() {
  const [items, setItems] = React.useState<AdminHelpArticleItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState("");
  const [published, setPublished] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [edit, setEdit] = React.useState<AdminHelpArticleItem | "new" | null>(null);
  const pageSize = 20;

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListHelpArticles({
        category: category || undefined,
        published: published || undefined,
        search: debounced || undefined,
        page,
        pageSize,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [category, published, debounced, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [category, published, debounced]);

  const remove = async (a: AdminHelpArticleItem) => {
    if (!window.confirm(`Delete article "${a.title}"?`)) return;
    try {
      await api.adminDeleteHelpArticle(a.id);
      toast.success("Article deleted");
      void load();
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help Center"
        description="Knowledge base articles shown to businesses and their customers."
        breadcrumbs={[{ label: "Admin" }, { label: "Help Center" }]}
        actions={
          <Button onClick={() => setEdit("new")}>
            <Plus className="h-4 w-4" />
            New article
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input placeholder="Search articles…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={published} onValueChange={(v) => setPublished(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-40">
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
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState icon={<LifeBuoy className="h-10 w-10" />} title="No articles found" description="Knowledge base articles appear here." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Views</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-sm">
                      <p className="truncate font-medium text-[rgb(var(--color-foreground))]">{a.title}</p>
                      <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{a.slug}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">{a.views}</TableCell>
                    <TableCell className="hidden text-right text-xs text-[rgb(var(--color-muted-foreground))] lg:table-cell">{relativeTime(a.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={a.published ? "success" : "outline"}>{a.published ? "Live" : "Draft"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Articles" />

      <ArticleDialog
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

function ArticleDialog({
  item,
  onClose,
  onSaved,
}: {
  item: AdminHelpArticleItem | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = item !== "new" && item !== null;
  const [title, setTitle] = React.useState(editing && item ? item.title : "");
  const [description, setDescription] = React.useState(editing && item ? (item.description ?? "") : "");
  const [content, setContent] = React.useState("");
  const [slug, setSlug] = React.useState(editing && item ? item.slug : "");
  const [category, setCategory] = React.useState(editing && item ? item.category : "Getting Started");
  const [keywords, setKeywords] = React.useState(editing && item ? item.keywords.join(", ") : "");
  const [published, setPublished] = React.useState(editing && item ? item.published : false);
  const [faq, setFaq] = React.useState(editing && item ? item.faq : false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (item === "new") {
      setTitle("");
      setDescription("");
      setContent("");
      setSlug("");
      setCategory("Getting Started");
      setKeywords("");
      setPublished(false);
      setFaq(false);
    } else if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setContent("");
      setSlug(item.slug);
      setCategory(item.category);
      setKeywords(item.keywords.join(", "));
      setPublished(item.published);
      setFaq(item.faq);
    }
  }, [item]);

  React.useEffect(() => {
    if (!editing && title.trim()) {
      setSlug(title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  }, [title, editing]);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!editing && !content.trim()) {
      toast.error("Content is required for a new article");
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        description: description || undefined,
        slug: slug || undefined,
        category,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        faq,
        published,
      };
      if (editing) {
        await api.adminUpdateHelpArticle(item.id, payload);
        toast.success("Article updated");
      } else {
        await api.adminCreateHelpArticle({ ...payload, content });
        toast.success("Article created");
      }
      onSaved();
    } catch {
      toast.error("Could not save article");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={item !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit article" : "New article"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          <div>
            <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How points work" />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="how-points-work" />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary" />
          </div>
          {!editing ? (
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Article body…" />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Keywords (comma-separated)</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="points, earning, spend" />
            </div>
          </div>
          <div className="flex items-center gap-6 pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={published} onCheckedChange={setPublished} />
              <Label className="text-xs">Published</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={faq} onCheckedChange={setFaq} />
              <Label className="text-xs">Featured FAQ</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? "Save changes" : "Create article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}