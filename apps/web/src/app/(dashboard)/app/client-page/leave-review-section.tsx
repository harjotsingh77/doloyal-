"use client";

import * as React from "react";
import { Check, Star, Video } from "lucide-react";
import type { PublicReviewPage, Review } from "@doloyal/shared";
import { relativeTime, initials, avatarColor } from "@doloyal/shared";
import { api, ApiError } from "@/lib/api";
import { ReviewVideoPlayer, captureVideoThumbnail } from "@/components/reviews/review-video";

function Stars({
  value,
  color,
  size = 18,
}: {
  value: number;
  color: string;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size, color: n <= value ? color : "rgba(0,0,0,.22)" }}
          fill={n <= value ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export function LeaveReviewSection({
  slug,
  brandColor,
  title,
  body,
  writeLabel,
  videoLabel,
  showRating = true,
  mode = "published",
}: {
  slug: string;
  brandColor: string;
  title?: string;
  body?: string;
  writeLabel?: string;
  videoLabel?: string;
  showRating?: boolean;
  mode?: "published" | "preview";
}) {
  const preview = mode === "preview";
  const [page, setPage] = React.useState<PublicReviewPage | null>(null);
  const [modal, setModal] = React.useState<null | "text" | "video">(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!slug || slug === "preview") return;
    try {
      setPage(await api.getPublicReviewPage(slug));
    } catch {
      setPage(null);
    }
  }, [slug]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const approved = page?.reviews ?? [];
  const videos = approved.filter((item) => item.type === "VIDEO" && item.hasVideo);
  const texts = approved.filter((item) => item.type !== "VIDEO" || !item.hasVideo);
  const breakdown = page?.breakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = page?.totalReviews ?? 0;
  const maxStar = Math.max(1, breakdown[1], breakdown[2], breakdown[3], breakdown[4], breakdown[5]);

  return (
    <section id="portal-reviews" className="mx-auto max-w-[1280px] scroll-mt-8 space-y-4 px-5 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.06] sm:p-8">
        <p className="text-[13px] font-medium text-[color:var(--site-accent,#2563EB)]">From you</p>
        <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--site-ink,#171717)]">
          {title || "How did we do?"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-black/55">
          {body?.trim() || "A short note or a video helps the next guest — we publish after a quick look."}
        </p>

        {showRating ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Stars value={page?.averageRating ? Math.round(page.averageRating) : 5} color={brandColor} size={22} />
          <span className="text-sm font-semibold">
            {total ? `${page?.averageRating?.toFixed(1) ?? "—"} · ${total} review${total === 1 ? "" : "s"}` : "Be the first to leave a note"}
          </span>
        </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => { setSuccess(null); setModal("text"); }}
            className="rounded-full px-5 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {writeLabel?.trim() || "Write a note"}
          </button>
          <button
            type="button"
            onClick={() => { setSuccess(null); setModal("video"); }}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ring-1 ring-black/10"
          >
            <Video className="h-4 w-4 stroke-[1.5]" />
            {videoLabel?.trim() || "Send a video"}
          </button>
        </div>

        {total > 0 ? (
          <div className="mt-6 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => (
              <div key={star} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-3 text-xs text-black/55">
                <span>{star} star</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.round((breakdown[star] / maxStar) * 100)}%`, backgroundColor: brandColor }}
                  />
                </span>
                <span className="text-right tabular-nums">{breakdown[star]}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {videos.length ? (
        <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.06] sm:p-8">
          <h4 className="text-xl font-semibold tracking-[-0.03em]">On video</h4>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
            {videos.map((review) => (
              <PublicReviewCard key={review.id} review={review} brandColor={brandColor} video />
            ))}
          </div>
        </div>
      ) : null}

      {texts.length ? (
        <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.06] sm:p-8">
          <h4 className="text-xl font-semibold tracking-[-0.03em]">From other guests</h4>
          <div className="mt-4 grid gap-3">
            {texts.map((review) => (
              <PublicReviewCard key={review.id} review={review} brandColor={brandColor} />
            ))}
          </div>
        </div>
      ) : null}

      {modal ? (
        <ReviewModal
          kind={modal}
          slug={slug}
          brandColor={brandColor}
          preview={preview}
          onClose={() => setModal(null)}
          onSubmitted={(message) => {
            setModal(null);
            setSuccess(message);
          }}
        />
      ) : null}

      {success ? (
        <div className="rounded-[22px] border border-black/[0.08] bg-white p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full text-white" style={{ backgroundColor: brandColor }}>
              <Check className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold">Thank you</p>
              <p className="mt-1 text-sm leading-6 text-black/55">{success}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PublicReviewCard({
  review,
  brandColor,
  video = false,
}: {
  review: Review;
  brandColor: string;
  video?: boolean;
}) {
  const seed = review.customerId || review.authorName;
  return (
    <article className={`min-w-[16rem] rounded-[24px] bg-black/[0.04] p-4 ${video ? "sm:min-w-0" : ""}`}>
      {video && review.mediaUrl ? (
        <ReviewVideoPlayer src={review.mediaUrl} poster={review.thumbnailUrl} aspect="portrait" className="mb-3" />
      ) : null}
      <Stars value={review.rating} color={brandColor} size={14} />
      {review.body ? (
        <p className="mt-2 text-sm leading-6 text-black/80">“{review.body}”</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-semibold text-white"
          style={{ backgroundColor: avatarColor(seed) }}
        >
          {review.authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(review.authorName) || "?"
          )}
        </span>
        <div>
          <p className="text-sm font-semibold">{review.authorName}</p>
          <p className="text-[11px] text-black/45">Verified Customer · {relativeTime(review.publishedAt)}</p>
        </div>
      </div>
    </article>
  );
}

function ReviewModal({
  kind,
  slug,
  brandColor,
  preview,
  onClose,
  onSubmitted,
}: {
  kind: "text" | "video";
  slug: string;
  brandColor: string;
  preview: boolean;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [body, setBody] = React.useState("");
  const [video, setVideo] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!video) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(video);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (preview) return;
    setError(null);
    if (name.trim().length < 2 || rating < 1) {
      setError("Add your name and a star rating.");
      return;
    }
    if (kind === "text" && body.trim().length < 8) {
      setError("Write a short review of at least 8 characters.");
      return;
    }
    if (kind === "video" && !video) {
      setError("Upload or record a short video.");
      return;
    }
    setSubmitting(true);
    try {
      if (kind === "video" && video) {
        const form = new FormData();
        form.append("name", name.trim());
        form.append("rating", String(rating));
        form.append("body", body.trim());
        form.append("file", video);
        const thumb = await captureVideoThumbnail(video);
        if (thumb) form.append("thumbnailUrl", thumb);
        if (avatar) form.append("avatar", avatar);
        const result = await api.submitPublicVideoReview(slug, form);
        onSubmitted(result.message);
      } else {
        const result = await api.submitPublicReview(slug, {
          name: name.trim(),
          rating,
          body: body.trim(),
        });
        onSubmitted(result.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <form
        onSubmit={(e) => void submit(e)}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[22px] bg-white p-6 shadow-xl sm:rounded-[22px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-bold">{kind === "video" ? "Share a Video Review" : "Write a Review"}</h4>
            <p className="mt-1 text-sm text-black/50">It will be reviewed by the business before it appears publicly.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-black/50">
            Close
          </button>
        </div>

        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <label className="mt-5 block text-sm font-medium">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#f8fafb] px-3 text-sm"
            placeholder="Your name"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Rating</legend>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => {
              const active = (hover || rating) >= value;
              return (
                <button
                  key={value}
                  type="button"
                  onMouseEnter={() => setHover(value)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  className="rounded-md p-1"
                >
                  <Star className="h-7 w-7" fill={active ? brandColor : "none"} style={{ color: active ? brandColor : "rgba(0,0,0,.28)" }} />
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="mt-4 block text-sm font-medium">
          {kind === "video" ? "Caption (optional)" : "Your review"}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder={kind === "video" ? "A few words about your visit" : "What stood out about your visit?"}
            className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f8fafb] px-3 py-2.5 text-sm leading-6"
          />
        </label>

        {kind === "video" ? (
          <label className="mt-4 block text-sm font-medium">
            Upload or record video
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              capture="user"
              className="mt-1.5 w-full text-sm"
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
            />
            {previewUrl ? (
              <video src={previewUrl} className="mt-3 max-h-64 w-full rounded-xl bg-black object-contain" controls playsInline muted />
            ) : null}
          </label>
        ) : null}

        <label className="mt-4 block text-sm font-medium">
          Photo (optional)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1.5 w-full text-sm"
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting || preview}
          className="mt-5 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: brandColor }}
        >
          {preview ? "Preview only" : submitting ? "Submitting…" : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
