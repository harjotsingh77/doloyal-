"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const BLUE = "#2563EB";
const VIOLET = "#7C3AED";

interface Point {
  x: number;
  y: number;
}

function buildPath(data: number[], w: number, h: number, pad = 4): Point[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
}

function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Lightweight hand-rolled smooth area chart. Crisper and lighter than
 * recharts for marketing mockups.
 */
export function AreaChart({
  data,
  className,
  id = "mk-area",
  height = 180,
  fillGradient = true,
  stroke = "url(#mk-stroke)",
}: {
  data: number[];
  className?: string;
  id?: string;
  height?: number;
  fillGradient?: boolean;
  stroke?: string;
}) {
  const w = 600;
  const pts = buildPath(data, w, height);
  const line = smoothPath(pts);
  const area = `${line} L ${w - 4} ${height} L 4 ${height} Z`;
  const gid = `${id}-${stroke.length}-${data.length}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BLUE} />
          <stop offset="100%" stopColor={VIOLET} />
        </linearGradient>
        <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.22" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fillGradient ? <path d={area} fill={`url(#${gid}-fill)`} /> : null}
      <path
        d={line}
        fill="none"
        stroke={stroke.includes("url") ? `url(#${gid})` : stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Tiny sparkline for cards (no fill by default). */
export function Sparkline({
  data,
  width = 72,
  height = 24,
  stroke = BLUE,
  strokeWidth = 2,
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
}) {
  const pts = buildPath(data, width, height);
  const d = smoothPath(pts);
  const gid = `spark-${stroke}-${data.join("-")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BLUE} />
          <stop offset="100%" stopColor={VIOLET} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

/** Horizontal pill progress bar. */
export function MiniBars({
  segments,
  className,
}: {
  segments: { pct: number; from: string; to: string }[];
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      {/* segments laid out horizontally as a single rounded track */}
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-[rgb(var(--color-border))]/60 p-0.5">
        {segments.map((s, i) => (
          <div
            key={i}
            style={{
              width: `${s.pct}%`,
              background: s.from === s.to ? s.from : `linear-gradient(to right, ${s.from}, ${s.to})`,
            }}
            className="h-full rounded-full"
          />
        ))}
      </div>
    </div>
  );
}