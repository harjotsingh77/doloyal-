"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { DOLOYAL_ICONS, type MultiplierIconItem } from "./multiplier-icons";

const LOOP_MS = 28000;

// 24 icons along the track for uniform, continuous ribbon density
const TRACK_ICONS: MultiplierIconItem[] = [
  ...DOLOYAL_ICONS,
  ...DOLOYAL_ICONS,
  ...DOLOYAL_ICONS,
];

interface Point {
  x: number;
  y: number;
}

const WAYPOINTS: Point[] = [
  { x: -0.08, y: 0.58 },
  { x: 0.18, y: 0.70 },
  { x: 0.38, y: 0.62 },
  { x: 0.54, y: 0.43 },
  { x: 0.70, y: 0.30 },
  { x: 0.85, y: 0.32 },
  { x: 1.06, y: 0.39 },
];

function catmullRom(p0: number, p1: number, p2: number, p3: number, s: number) {
  const s2 = s * s;
  const s3 = s2 * s;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * s +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * s3
  );
}

function getRawSplinePoint(t: number): Point {
  const clampedT = Math.max(0, Math.min(1, t));
  const n = WAYPOINTS.length;
  const u = clampedT * (n - 1);
  const i = Math.min(Math.floor(u), n - 2);
  const s = u - i;

  const i0 = Math.max(0, i - 1);
  const i1 = i;
  const i2 = Math.min(n - 1, i + 1);
  const i3 = Math.min(n - 1, i + 2);

  const p0 = WAYPOINTS[i0];
  const p1 = WAYPOINTS[i1];
  const p2 = WAYPOINTS[i2];
  const p3 = WAYPOINTS[i3];

  return {
    x: catmullRom(p0.x, p1.x, p2.x, p3.x, s),
    y: catmullRom(p0.y, p1.y, p2.y, p3.y, s),
  };
}

/**
 * Arc-Length Parameterization
 * Precomputes curve distance so icon spacing is 100% uniform from start to end
 */
const SAMPLES = 600;
interface ArcSample {
  dist: number;
  x: number;
  y: number;
}

const ARC_TABLE: ArcSample[] = [];
let TOTAL_ARC_LENGTH = 1;

function buildArcTable() {
  ARC_TABLE.length = 0;
  let prevX = 0;
  let prevY = 0;
  let cumulative = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const pt = getRawSplinePoint(t);
    if (i > 0) {
      const dx = (pt.x - prevX) * 1.5;
      const dy = pt.y - prevY;
      cumulative += Math.hypot(dx, dy);
    }
    ARC_TABLE.push({ dist: cumulative, x: pt.x, y: pt.y });
    prevX = pt.x;
    prevY = pt.y;
  }
  TOTAL_ARC_LENGTH = cumulative;
}

buildArcTable();

function getPointAtDistance(fraction: number): Point {
  const norm = ((fraction % 1) + 1) % 1;
  const targetDist = norm * TOTAL_ARC_LENGTH;

  let low = 0;
  let high = ARC_TABLE.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (ARC_TABLE[mid].dist < targetDist) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const i1 = Math.max(0, low - 1);
  const i2 = Math.min(ARC_TABLE.length - 1, low);
  if (i1 === i2) return { x: ARC_TABLE[i1].x, y: ARC_TABLE[i1].y };

  const d1 = ARC_TABLE[i1].dist;
  const d2 = ARC_TABLE[i2].dist;
  const span = d2 - d1;
  const alpha = span > 0 ? (targetDist - d1) / span : 0;

  return {
    x: ARC_TABLE[i1].x + (ARC_TABLE[i2].x - ARC_TABLE[i1].x) * alpha,
    y: ARC_TABLE[i1].y + (ARC_TABLE[i2].y - ARC_TABLE[i1].y) * alpha,
  };
}

function getAngleAtDistance(fraction: number): number {
  const delta = 0.005;
  const p1 = getPointAtDistance(fraction - delta);
  const p2 = getPointAtDistance(fraction + delta);
  const dx = (p2.x - p1.x) * 1.5;
  const dy = p2.y - p1.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function fadeEdge(t: number) {
  if (t < 0.02) return 0;
  if (t < 0.06) return (t - 0.02) / 0.04;
  if (t > 0.98) return 0;
  if (t > 0.94) return (0.98 - t) / 0.04;
  return 1;
}

function TravelingDoloyalIcon({
  item,
  index,
  total,
  progress,
}: {
  item: MultiplierIconItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const offset = index / total;
  const left = useTransform(progress, (p) => `${getPointAtDistance(p + offset).x * 100}%`);
  const top = useTransform(progress, (p) => `${getPointAtDistance(p + offset).y * 100}%`);
  const opacity = useTransform(progress, (p) => fadeEdge(((p + offset) % 1 + 1) % 1));
  const rotate = useTransform(progress, (p) => `${getAngleAtDistance(p + offset)}deg`);

  return (
    <motion.div
      style={{ left, top, opacity, rotate }}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none"
      aria-hidden="true"
    >
      {/* Pure icon squircle without text label */}
      <div className="h-[52px] w-[52px] sm:h-[62px] sm:w-[62px] lg:h-[68px] lg:w-[68px]">
        {item.node}
      </div>
    </motion.div>
  );
}

const STAGE_POS =
  "absolute bottom-[6%] right-[3%] flex items-end gap-3.5 sm:bottom-[7%] sm:right-[5%] sm:gap-5 lg:bottom-[8%] lg:right-[6%] lg:gap-6";

const BAR_WIDTH = 136;

function Bar1x() {
  return (
    <div
      style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH, maxWidth: BAR_WIDTH }}
      className="flex shrink-0 flex-col items-center"
    >
      <span className="mb-2 text-[20px] font-semibold tracking-tight text-[#94A3B8] sm:mb-2.5 sm:text-[26px]">
        1×
      </span>
      <div className="h-[44px] w-full rounded-2xl bg-gradient-to-b from-[#E7EEF8]/95 to-[#D9E6F6]/95 border border-white/80 shadow-[0_4px_16px_rgba(148,163,184,0.12)] sm:h-[52px]" />
      <span className="mt-3 h-5 whitespace-nowrap text-[12px] font-medium text-[#94A3B8] sm:text-[13.5px]">
        Manual Tools
      </span>
    </div>
  );
}

function Bar4x() {
  return (
    <div
      style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH, maxWidth: BAR_WIDTH }}
      className="flex shrink-0 flex-col items-center"
    >
      <span className="mb-2 text-[20px] font-semibold tracking-tight text-[#94A3B8] sm:mb-2.5 sm:text-[26px]">
        4×
      </span>
      <div className="h-[175px] w-full rounded-2xl bg-gradient-to-b from-[#D4E3F6] to-[#BED6F0] border border-white/70 shadow-[0_8px_24px_rgba(37,99,235,0.08)] sm:h-[235px] lg:h-[255px]" />
      <span className="mt-3 h-5 whitespace-nowrap text-[12px] font-medium text-[#94A3B8] sm:text-[13.5px]">
        Basic CRM
      </span>
    </div>
  );
}

function Bar10x() {
  return (
    <div
      style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH, maxWidth: BAR_WIDTH }}
      className="flex shrink-0 flex-col items-center"
    >
      <div className="mb-2 text-center sm:mb-3">
        <div className="text-[36px] font-extrabold leading-none tracking-tight text-[#0F172A] sm:text-[48px] lg:text-[54px]">
          10×
        </div>
        <div className="mt-1 text-[7.5px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8] sm:mt-1.5 sm:text-[8.5px] sm:tracking-[0.18em]">
          YOUR RETENTION
        </div>
      </div>
      <div className="relative h-[410px] w-full overflow-hidden rounded-[24px] shadow-[0_24px_54px_rgba(37,99,235,0.24)] ring-1 ring-black/[0.05] sm:h-[490px] sm:rounded-[28px] lg:h-[530px] lg:rounded-[30px]">
        <img
          src="/multiplier/sky-bar.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
        />
        {/* Floating white Doloyal mark */}
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <img
            src="/multiplier/doloyal-white.png"
            alt="Doloyal"
            className="h-11 w-auto sm:h-13 drop-shadow-[0_8px_24px_rgba(0,0,0,0.28)] select-none pointer-events-none"
          />
        </div>
      </div>
      <span className="mt-3 h-5 whitespace-nowrap text-[12px] font-semibold text-[#475569] sm:text-[13.5px]">
        With Doloyal
      </span>
    </div>
  );
}

export function MultiplierSection() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const progress = useMotionValue(0);

  React.useEffect(() => {
    if (reduce) {
      progress.set(0);
      return;
    }

    const node = ref.current;
    if (!node) return;

    let raf = 0;
    let elapsed = 0;
    let last = performance.now();
    let active = true;

    const io = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        if (active) last = performance.now();
      },
      { rootMargin: "120px", threshold: 0.05 }
    );
    io.observe(node);

    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      if (active) {
        elapsed = (elapsed + delta) % LOOP_MS;
        progress.set(elapsed / LOOP_MS);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduce, progress]);

  return (
    <section
      ref={ref}
      id="retention"
      className="relative w-full overflow-hidden rounded-t-[32px] sm:rounded-t-[44px] lg:rounded-t-[56px] rounded-b-[32px] sm:rounded-b-[44px] lg:rounded-b-[56px] border border-[#E2E8F0]/80 shadow-[0_12px_44px_rgba(200,215,235,0.22)]"
      aria-labelledby="multiplier-heading"
    >
      {/* Soft ice-blue gradient background matching VoiceOS spanning 100% full width */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 15%, #F6FAFF 0%, #E9F2FC 60%, #DEECF9 100%)",
        }}
      />

      {/* Section Container with responsive height */}
      <div className="relative z-40 mx-auto w-full max-w-[1400px] px-6 pt-12 sm:px-10 sm:pt-16 lg:h-[840px] lg:px-12 lg:pt-0">
          {/* Left Hero Content */}
          <div className="max-w-[560px] lg:absolute lg:left-[64px] lg:top-[20%] xl:left-[88px] xl:top-[22%]">
            <h2
              id="multiplier-heading"
              className="text-[40px] font-extrabold tracking-[-0.04em] leading-[1.06] text-[#0F172A] sm:text-[56px] lg:text-[66px]"
            >
              Not just another
              <br />
              CRM
            </h2>
            <p className="mt-5 max-w-[420px] text-[16px] leading-[1.6] text-[#64748B] sm:text-[18px] lg:text-[19px]">
              CRMs only collect data. Doloyal multiplies your revenue.
            </p>
          </div>
        </div>

        {/* Dynamic Graphic Stage: 1x, 4x, Traveling Doloyal Icons, 10x */}
        <div className="relative z-20 h-[560px] sm:h-[720px] lg:absolute lg:inset-0 lg:h-auto">
          {/* Layer 1: 1x and 4x Bars (behind icons) */}
          <div className={`${STAGE_POS} z-10 pointer-events-none`}>
            <Bar1x />
            <Bar4x />
            {/* Transparent placeholder matching Bar10x width to align perfectly */}
            <div
              style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH, maxWidth: BAR_WIDTH }}
              className="shrink-0 pointer-events-none"
            />
          </div>

          {/* Layer 2: Traveling Doloyal Icons (clean, no labels, no overlay line) */}
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            {TRACK_ICONS.map((item, i) => (
              <TravelingDoloyalIcon
                key={`doloyal-icon-${item.id}-${i}`}
                item={item}
                index={i}
                total={TRACK_ICONS.length}
                progress={progress}
              />
            ))}
          </div>

          {/* Layer 3: 10x Bar (in front of icons so icons pass cleanly behind it) */}
          <div className={`${STAGE_POS} z-30 pointer-events-none`}>
            {/* Transparent placeholders matching Bar1x and Bar4x widths */}
            <div
              style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH, maxWidth: BAR_WIDTH }}
              className="shrink-0 pointer-events-none"
            />
            <div
              style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH, maxWidth: BAR_WIDTH }}
              className="shrink-0 pointer-events-none"
            />
            <Bar10x />
          </div>
        </div>
    </section>
  );
}
