"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Search, Check, X } from "lucide-react";
import {
  PageHeader,
  Button,
  Input,
  Textarea,
  Badge,
  Card,
  CardContent,
  Skeleton,
  EmptyState,
  KpiCard,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
} from "@doloyal/ui";
import { initials, avatarColor, relativeTime } from "@doloyal/shared";
import type { Review, ReviewFilter, ReviewSummary } from "@doloyal/shared";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { ReviewVideoPlayer, captureVideoThumbnail } from "@/components/reviews/review-video";
import { useAppSync } from "@/lib/data-sync";
import { useResource } from "@/lib/use-resource";

function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cls}
          fill={n <= value ? "currentColor" : "none"}
          style={{ color: n <= value ? "#D97706" : "rgb(var(--color-muted-foreground) / 0.35)" }}
        />
      ))}
    </span>
  );
}

function statusBadge(status: Review["status"]) {
  if (status === "PENDING") return <Badge variant="warning" dot>Pending approval</Badge>;
  if (status === "APPROVED") return <Badge variant="success">Approved</Badge>;
  return <Badge variant="danger">Rejected</Badge>;
}

function emptyCopy(filter: ReviewFilter): { title: string; description: string } {
  if (filter === "PENDING") {
    return { title: "No reviews waiting for approval.", description: "New customer submissions will show up here first." };
  }
  if (filter === "APPROVED") {
    return { title: "No approved reviews yet.", description: "Approve a pending review to publish it on your Client Page." };
  }
  if (filter === "REJECTED") {
    return { title: "No rejected reviews.", description: "Rejected reviews stay here for your records." };
  }
  if (filter === "VIDEO") {
    return { title: "No video reviews yet.", description: "Video testimonials submitted by customers will appear here." };
  }
  if (filter === "TEXT") {
    return { title: "No text reviews yet.", description: "Written reviews from your Client Page will appear here." };
  }
  return {
    title: "No reviews yet",
    description: "Customer reviews will appear here once they start sharing their experience.",
  };
}

export default function ReviewsPage() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [filter, setFilter] = React.useState<ReviewFilter>("ALL");
  const [rating, setRating] = React.useState<number | "ALL">("ALL");
  const [extra, setExtra] = React.useState<Review[]>([]);
  const [extraCursor, setExtraCursor] = React.useState<string | null>(null);
  const [extraHasMore, setExtraHasMore] = React.useState(false);
  const [listLoading, setListLoading] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [viewReview, setViewReview] = React.useState<Review | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<Review | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  const bootQuery = useResource<{
    summary: ReviewSummary;
    reviews: Review[];
    hasMore: boolean;
    cursor: string | null;
  }>({
    queryKey: ["reviews-page", debounced, filter, rating],
    queryFn: async () => {
      const [summary, page] = await Promise.all([
        api.getReviewSummary(),
        api.listReviews({
          search: debounced || undefined,
          filter,
          rating: rating === "ALL" ? undefined : rating,
          limit: 30,
        }),
      ]);
      return {
        summary,
        reviews: page.items,
        hasMore: page.hasMore,
        cursor: page.nextCursor,
      };
    },
    scopes: ["reviews", "customers", "dashboard"],
    keepPrevious: true,
  });

  React.useEffect(() => {
    setExtra([]);
    setExtraCursor(null);
    setExtraHasMore(false);
  }, [debounced, filter, rating]);

  const summary = bootQuery.data?.summary ?? null;
  const reviews = React.useMemo(
    () => [...(bootQuery.data?.reviews ?? []), ...extra],
    [bootQuery.data, extra],
  );
  const cursor = extra.length ? extraCursor : bootQuery.data?.cursor ?? null;
  const hasMore = extra.length ? extraHasMore : Boolean(bootQuery.data?.hasMore);
  const loading = bootQuery.isLoading && !bootQuery.data;
  const error =
    bootQuery.error && !bootQuery.data
      ? bootQuery.error instanceof Error
        ? bootQuery.error.message
        : "Could not load reviews."
      : null;

  const loadList = React.useCallback(
    async (nextCursor?: string | null, append = false) => {
      if (!append || !nextCursor) {
        setExtra([]);
        setExtraCursor(null);
        setExtraHasMore(false);
        await bootQuery.refetch();
        return;
      }
      setListLoading(true);
      try {
        const page = await api.listReviews({
          search: debounced || undefined,
          filter,
          rating: rating === "ALL" ? undefined : rating,
          cursor: nextCursor || undefined,
          limit: 30,
        });
        setExtra((prev) => [...prev, ...page.items]);
        setExtraHasMore(page.hasMore);
        setExtraCursor(page.nextCursor);
      } finally {
        setListLoading(false);
      }
    },
    [bootQuery, debounced, filter, rating],
  );

  const refreshAll = async () => {
    setExtra([]);
    setExtraCursor(null);
    setExtraHasMore(false);
    await bootQuery.refetch();
  };

  useAppSync(["reviews", "customers"], () => {
    void refreshAll();
  });

  const runAction = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(ok);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const maxBreakdown = Math.max(1, ...(summary ? Object.values(summary.breakdown) : [1]));
  const filters: { id: ReviewFilter; label: string; count?: number }[] = [
    { id: "ALL", label: "All", count: summary?.totalReviews },
    { id: "PENDING", label: "Pending", count: summary?.pendingCount },
    { id: "APPROVED", label: "Approved", count: summary?.approvedCount },
    { id: "REJECTED", label: "Rejected", count: summary?.rejectedCount },
    { id: "TEXT", label: "Text", count: summary?.textCount },
    { id: "VIDEO", label: "Video", count: summary?.videoCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Approve customer reviews before they appear on your Client Page."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            Add Review
          </Button>
        }
      />

      {error ? (
        <EmptyState
          title="Reviews could not be loaded"
          description={error}
          action={
            <Button
              onClick={() => {
                void refreshAll();
              }}
            >
              Try again
            </Button>
          }
        />
      ) : loading || !summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.75rem] rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Average rating"
              value={summary.approvedCount ? summary.averageRating.toFixed(1) : "—"}
              hint={
                summary.approvedCount ? (
                  <span className="flex items-center gap-1.5">
                    <Stars value={Math.round(summary.averageRating)} size="sm" />
                    <span>
                      {summary.approvedCount} approved review{summary.approvedCount === 1 ? "" : "s"}
                    </span>
                  </span>
                ) : (
                  <span>No approved reviews yet</span>
                )
              }
              accent="warning"
            />
            <KpiCard
              label="Total reviews"
              value={summary.totalReviews}
              hint={<span>All submissions in this workspace</span>}
              accent="primary"
              onClick={() => setFilter("ALL")}
            />
            <KpiCard
              label="Pending approval"
              value={summary.pendingCount}
              hint={<span>Waiting to be published</span>}
              accent="warning"
              onClick={() => setFilter("PENDING")}
            />
            <KpiCard
              label="Video reviews"
              value={summary.videoCount}
              hint={<span>{summary.approvedVideoCount} approved</span>}
              accent="violet"
              onClick={() => setFilter("VIDEO")}
            />
          </div>

          <Card>
            <CardContent className="pt-5">
              <p className="mb-3 text-sm font-medium">Star breakdown</p>
              <div className="space-y-2">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = summary.breakdown[star];
                  const pct = Math.round((count / maxBreakdown) * 100);
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating((current) => (current === star ? "ALL" : star))}
                      className="grid w-full grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-left text-sm"
                    >
                      <span className="text-[rgb(var(--color-muted-foreground))]">{star} star</span>
                      <span className="h-2 overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                        <span className="block h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-right tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input
            className="pl-9"
            placeholder="Search by customer or review text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? "primary" : "secondary"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              {typeof item.count === "number" ? ` (${item.count})` : ""}
            </Button>
          ))}
        </div>
      </div>

      {listLoading && !reviews.length ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[var(--radius)]" />
          ))}
        </div>
      ) : reviews.length === 0 && !loading ? (
        <EmptyState title={emptyCopy(filter).title} description={emptyCopy(filter).description} />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const seed = review.customerId || review.authorName;
            const pending = review.status === "PENDING";
            return (
              <li key={review.id}>
                <Card className={pending ? "border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20" : undefined}>
                  <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-start">
                    <Avatar className="h-11 w-11 shrink-0">
                      {review.authorAvatarUrl ? (
                        <AvatarImage src={review.authorAvatarUrl} alt={review.authorName} />
                      ) : null}
                      <AvatarFallback style={{ backgroundColor: avatarColor(seed) }}>
                        {initials(review.authorName) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{review.authorName}</p>
                        {statusBadge(review.status)}
                        <Badge variant="outline">{review.type === "VIDEO" ? "Video" : "Text"}</Badge>
                        <Stars value={review.rating} size="sm" />
                        <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                          {relativeTime(review.createdAt)}
                        </span>
                      </div>
                      {review.body ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{review.body}</p>
                      ) : (
                        <p className="mt-2 text-sm text-[rgb(var(--color-muted-foreground))]">No written comments.</p>
                      )}
                      {review.hasVideo ? (
                        <div className="mt-3 max-w-sm">
                          <ReviewVideoPlayer
                            authPath={`/reviews/${review.id}/media`}
                            poster={review.thumbnailUrl}
                            aspect="portrait"
                          />
                        </div>
                      ) : null}
                      {review.status === "REJECTED" && review.rejectionReason ? (
                        <p className="mt-2 text-xs text-[rgb(var(--color-muted-foreground))]">
                          Internal note: {review.rejectionReason}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {review.customerId ? (
                          <Link
                            href={`/app/customers/${review.customerId}`}
                            className="mr-2 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
                          >
                            Customer profile
                          </Link>
                        ) : (
                          <span className="mr-2 text-sm text-[rgb(var(--color-muted-foreground))]">
                            No linked customer profile
                          </span>
                        )}
                        {review.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              disabled={busyId === review.id}
                              onClick={() => void runAction(review.id, () => api.approveReview(review.id), "Review approved and published.")}
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => { setRejectReason(""); setRejectTarget(review); }}>
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {review.status === "APPROVED" ? (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setViewReview(review)}>View</Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === review.id}
                              onClick={() => {
                                if (!window.confirm("Unpublish this review from the Client Page?")) return;
                                void runAction(review.id, () => api.unpublishReview(review.id), "Review unpublished.");
                              }}
                            >
                              Unpublish
                            </Button>
                          </>
                        ) : null}
                        {review.status === "REJECTED" ? (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setViewReview(review)}>View</Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busyId === review.id}
                              onClick={() => {
                                if (!window.confirm("Delete this rejected review permanently?")) return;
                                void runAction(review.id, () => api.deleteReview(review.id), "Review deleted.");
                              }}
                            >
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" loading={listLoading} onClick={() => void loadList(cursor, true)}>
            Load more
          </Button>
        </div>
      ) : null}

      <AddReviewDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={async () => {
          await refreshAll();
        }}
      />

      <Dialog open={Boolean(viewReview)} onOpenChange={(open) => { if (!open) setViewReview(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewReview?.authorName}</DialogTitle>
            <DialogDescription>
              {viewReview ? `${viewReview.type === "VIDEO" ? "Video" : "Text"} review · ${relativeTime(viewReview.createdAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {viewReview ? (
            <div className="space-y-3">
              <Stars value={viewReview.rating} />
              {viewReview.body ? <p className="whitespace-pre-wrap text-sm leading-6">{viewReview.body}</p> : null}
              {viewReview.hasVideo ? (
                <ReviewVideoPlayer authPath={`/reviews/${viewReview.id}/media`} poster={viewReview.thumbnailUrl} />
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject review</DialogTitle>
            <DialogDescription>
              This review will stay off your Client Page. The reason is internal unless you notify the customer yourself.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="reject-reason">Internal reason (optional)</Label>
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Not a real visit, spam, etc."
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!rejectTarget || busyId === rejectTarget.id}
              onClick={() => {
                if (!rejectTarget) return;
                const id = rejectTarget.id;
                setRejectTarget(null);
                void runAction(id, () => api.rejectReview(id, rejectReason.trim() || undefined), "Review rejected.");
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddReviewDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [rating, setRating] = React.useState(5);
  const [body, setBody] = React.useState("");
  const [type, setType] = React.useState<"TEXT" | "VIDEO">("TEXT");
  const [publish, setPublish] = React.useState(true);
  const [video, setVideo] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setRating(5);
    setBody("");
    setType("TEXT");
    setPublish(true);
    setVideo(null);
    setPreview(null);
    setAvatar(null);
  }, [open]);

  React.useEffect(() => {
    if (!video) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(video);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  const submit = async () => {
    if (name.trim().length < 2) {
      toast.error("Enter a customer name.");
      return;
    }
    if (type === "TEXT" && body.trim().length < 8) {
      toast.error("Write a short review.");
      return;
    }
    if (type === "VIDEO" && !video) {
      toast.error("Upload a video.");
      return;
    }
    setSaving(true);
    try {
      if (type === "VIDEO" && video) {
        const form = new FormData();
        form.append("name", name.trim());
        form.append("rating", String(rating));
        form.append("body", body.trim());
        form.append("status", publish ? "APPROVED" : "PENDING");
        form.append("file", video);
        const thumb = await captureVideoThumbnail(video);
        if (thumb) form.append("thumbnailUrl", thumb);
        if (avatar) form.append("authorAvatarUrl", avatar);
        await api.createVideoReview(form);
      } else {
        await api.createReview({
          name: name.trim(),
          rating,
          body: body.trim(),
          type: "TEXT",
          status: publish ? "APPROVED" : "PENDING",
          authorAvatarUrl: avatar || undefined,
        });
      }
      toast.success(publish ? "Review added and published." : "Review added as pending.");
      onOpenChange(false);
      await onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not add review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add review</DialogTitle>
          <DialogDescription>Manually add a text or video review for this business.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="add-name">Customer name</Label>
            <Input id="add-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Rating</Label>
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`}>
                  <Star
                    className="h-6 w-6"
                    fill={value <= rating ? "currentColor" : "none"}
                    style={{ color: value <= rating ? "#D97706" : "rgb(var(--color-muted-foreground) / 0.35)" }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={type === "TEXT" ? "primary" : "secondary"} onClick={() => setType("TEXT")}>
              Text review
            </Button>
            <Button size="sm" variant={type === "VIDEO" ? "primary" : "secondary"} onClick={() => setType("VIDEO")}>
              Video review
            </Button>
          </div>
          <div>
            <Label htmlFor="add-body">{type === "VIDEO" ? "Caption (optional)" : "Review text"}</Label>
            <Textarea id="add-body" className="mt-1.5" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {type === "VIDEO" ? (
            <div>
              <Label htmlFor="add-video">Video</Label>
              <Input
                id="add-video"
                className="mt-1.5"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => setVideo(e.target.files?.[0] || null)}
              />
              {preview ? (
                <video src={preview} className="mt-3 max-h-56 w-full rounded-xl bg-black object-contain" controls muted playsInline />
              ) : null}
            </div>
          ) : null}
          <div>
            <Label htmlFor="add-avatar">Customer photo (optional)</Label>
            <Input
              id="add-avatar"
              className="mt-1.5"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setAvatar(typeof reader.result === "string" ? reader.result : null);
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            Publish immediately
          </label>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={saving} onClick={() => void submit()}>
            {publish ? "Publish review" : "Save as pending"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
