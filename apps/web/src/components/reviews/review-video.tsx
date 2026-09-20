"use client";

import * as React from "react";
import { Pause, Play, Volume2, VolumeX, Maximize } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-base";
import { getStaffAuthToken } from "@/lib/access-token";

export function reviewPublicMediaUrl(mediaUrl: string | null | undefined): string | null {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith("http") || mediaUrl.startsWith("blob:") || mediaUrl.startsWith("data:")) {
    return mediaUrl;
  }
  return `${getApiBaseUrl()}${mediaUrl.startsWith("/") ? mediaUrl : `/${mediaUrl}`}`;
}

async function authBlobUrl(path: string): Promise<string | null> {
  const token = getStaffAuthToken();
  const res = await fetch(reviewPublicMediaUrl(path)!, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}

export function ReviewVideoPlayer({
  src,
  poster,
  authPath,
  className = "",
  aspect = "video",
}: {
  src?: string | null;
  poster?: string | null;
  /** Authenticated owner media path, e.g. /reviews/:id/media */
  authPath?: string | null;
  className?: string;
  aspect?: "video" | "portrait";
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [blobSrc, setBlobSrc] = React.useState<string | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(true);

  React.useEffect(() => {
    if (!authPath) return;
    let url: string | null = null;
    let cancelled = false;
    void authBlobUrl(authPath).then((next) => {
      if (cancelled) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      url = next;
      setBlobSrc(next);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [authPath]);

  const resolved = blobSrc || reviewPublicMediaUrl(src);
  const posterSrc = poster?.startsWith("data:") ? poster : reviewPublicMediaUrl(poster);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  };

  const toggleMute = (event: React.MouseEvent) => {
    event.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const fullscreen = (event: React.MouseEvent) => {
    event.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    if (el.requestFullscreen) void el.requestFullscreen();
    else if ((el as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
      (el as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-black ${
        aspect === "portrait" ? "aspect-[9/16] max-h-[28rem]" : "aspect-video"
      } ${className}`}
    >
      {resolved ? (
        <video
          ref={videoRef}
          src={resolved}
          poster={posterSrc || undefined}
          className="h-full w-full object-cover"
          playsInline
          preload="metadata"
          muted={muted}
          controls={false}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
        />
      ) : (
        <div className="grid h-full place-items-center text-sm text-white/70">Video unavailable</div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2.5">
        <button
          type="button"
          onClick={togglePlay}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-black shadow-sm"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className="grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={fullscreen}
            className="grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white"
            aria-label="Fullscreen"
          >
            <Maximize className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function captureVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.5, Number.isFinite(video.duration) ? video.duration * 0.1 : 0.5);
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(video.videoWidth || 720, 720);
        canvas.height = Math.min(video.videoHeight || 1280, 1280);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        cleanup();
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}
