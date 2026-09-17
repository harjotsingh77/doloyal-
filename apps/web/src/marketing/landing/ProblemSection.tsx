"use client";

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PROBLEMS_DATA = [
  {
    id: 0,
    tag: "Problem 01",
    title: "Silent Customer Drop-off",
    desc: "You know when someone visits, but not who’s slipping away or when they should come back.",
  },
  {
    id: 1,
    tag: "Problem 02",
    title: "Disconnected Systems",
    desc: "Customer data sits across bookings, loyalty, and marketing tools—never turning into an actionable decision.",
  },
  {
    id: 2,
    tag: "Problem 03",
    title: "Forgotten Follow-ups",
    desc: "Staff remember some customers, forget others, and act only after they’ve already gone inactive.",
  },
  {
    id: 3,
    tag: "Problem 04",
    title: "Untapped Customer Value",
    desc: "No system to grow each customer’s value through rebooking, upgrades, memberships, or relevant offers.",
  },
] as const;

const AVATARS = [
  {
    id: 0,
    src: "/problem/avatar-lower-left.png",
    alt: "Customer slipping away unnoticed",
    baseAngle: 132,
  },
  {
    id: 1,
    src: "/problem/avatar-left.png",
    alt: "Customer whose systems stay disconnected",
    baseAngle: 222,
  },
  {
    id: 2,
    src: "/problem/avatar-upper-right.png",
    alt: "Customer who was forgotten until too late",
    baseAngle: 312,
  },
  {
    id: 3,
    src: "/problem/avatar-center-right.png",
    alt: "Customer with untapped lifetime value",
    baseAngle: 42,
  },
] as const;

// Must match the orbit-track ellipse in StationaryRings (rx / ry of the SVG viewport)
const ORBIT_RX = 32;
const ORBIT_RY = 42;

const STICKERS = [
  {
    src: "/problem/calendar.png",
    className: "-left-3 -top-3 sm:-left-7 sm:-top-7 w-10 xs:w-12 sm:w-16 lg:w-20",
    rotate: "-rotate-12",
    float: "problem-float",
  },
  {
    src: "/problem/cake.png",
    className: "right-8 -top-6 sm:right-24 sm:-top-10 w-10 xs:w-12 sm:w-16 lg:w-20",
    rotate: "rotate-6",
    float: "problem-float-slow",
  },
  {
    src: "/problem/popper.png",
    className: "-right-3 -bottom-4 sm:-right-8 sm:-bottom-8 w-11 xs:w-13 sm:w-20 lg:w-24",
    rotate: "rotate-12",
    float: "problem-float-tilt",
  },
];

function StationaryRings({
  scale = 1,
  opacity = 1,
}: {
  scale?: MotionValue<number> | number;
  opacity?: MotionValue<number> | number;
}) {
  return (
    <motion.div
      style={{ scale, opacity }}
      className="pointer-events-none absolute inset-0 select-none"
      aria-hidden="true"
    >
      <svg viewBox="0 0 1000 560" className="h-full w-full overflow-visible" fill="none" preserveAspectRatio="none">
        <ellipse cx="50%" cy="50%" rx="21%" ry="28%" stroke="#7EA8E5" strokeOpacity="0.42" strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
        <ellipse cx="50%" cy="50%" rx={`${ORBIT_RX}%`} ry={`${ORBIT_RY}%`} stroke="#7EA8E5" strokeOpacity="0.34" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <ellipse cx="50%" cy="50%" rx="42%" ry="55%" stroke="#7EA8E5" strokeOpacity="0.24" strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
        <ellipse cx="50%" cy="50%" rx="52.5%" ry="69%" stroke="#7EA8E5" strokeOpacity="0.16" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563EB]/[0.05] blur-3xl" />
    </motion.div>
  );
}

function Heading() {
  return (
    <div className="text-center">
      <h2 className="text-[34px] xs:text-[42px] sm:text-[64px] lg:text-[80px] font-bold tracking-[-0.04em] leading-[0.95] text-[#0F172A]">
        <span className="font-serif italic font-normal text-[#1E293B] mr-2 sm:mr-3.5">The</span>
        Problem
      </h2>
    </div>
  );
}

/**
 * The blue speech bubble card with the bottom-left pointy tail.
 */
function BubbleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 442 290"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute -left-[2.5%] -top-[3.5%] h-[118%] w-[105%] drop-shadow-[0_24px_48px_rgba(37,99,235,0.28)]"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="problemBubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="60%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="problemBubbleSheen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Main bubble shape with the bottom-left tail */}
        <path
          fill="url(#problemBubbleGrad)"
          d="M38 12H404C426 12 436 24 436 46V196C436 218 426 230 404 230H124L70 284C88 248 84 230 52 230H38C16 230 6 218 6 196V46C6 24 16 12 38 12Z"
        />
        {/* Subtle glossy sheen on upper card */}
        <path
          fill="url(#problemBubbleSheen)"
          d="M38 12H404C426 12 436 24 436 46V196C436 218 426 230 404 230H124L70 284C88 248 84 230 52 230H38C16 230 6 218 6 196V46C6 24 16 12 38 12Z"
        />
      </svg>
      <div className="relative z-10 flex min-h-[148px] sm:min-h-[156px] lg:min-h-[164px] flex-col justify-center px-6 py-6 sm:px-8 sm:py-7 lg:px-9 lg:py-8">
        {children}
      </div>
    </div>
  );
}

/**
 * An individual avatar orbiting the ellipse.
 * Fixed directly on the circle path (ORBIT_RX, ORBIT_RY) and revolves smoothly to the tail when active.
 */
function OrbitingAvatar({
  avatar,
  smoothAngle,
  currentSpeakerIndex,
  onClick,
}: {
  avatar: (typeof AVATARS)[number];
  smoothAngle: MotionValue<number>;
  currentSpeakerIndex: number;
  onClick?: () => void;
}) {
  const isSpotlight = currentSpeakerIndex === avatar.id;

  // Exact parametric position on the orbit ellipse
  const left = useTransform(smoothAngle, (deg) => {
    const rad = ((avatar.baseAngle + deg) * Math.PI) / 180;
    return `${50 + ORBIT_RX * Math.cos(rad)}%`;
  });

  const top = useTransform(smoothAngle, (deg) => {
    const rad = ((avatar.baseAngle + deg) * Math.PI) / 180;
    return `${50 + ORBIT_RY * Math.sin(rad)}%`;
  });

  return (
    <motion.div
      style={{
        left,
        top,
        zIndex: isSpotlight ? 35 : 25,
      }}
      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
      onClick={onClick}
    >
      <div
        className={cn(
          "relative cursor-pointer rounded-full border-[3px] border-white bg-white transition-all duration-500 ease-out",
          isSpotlight
            ? "h-[58px] w-[58px] sm:h-[68px] sm:w-[68px] lg:h-[76px] lg:w-[76px] shadow-[0_12px_28px_-4px_rgba(37,99,235,0.45)]"
            : "h-[44px] w-[44px] sm:h-[52px] sm:w-[52px] lg:h-[60px] lg:w-[60px] shadow-[0_8px_20px_-4px_rgba(16,28,22,0.22)] opacity-90 hover:scale-105 hover:opacity-100"
        )}
      >
        <img
          src={avatar.src}
          alt={avatar.alt}
          className="h-full w-full select-none rounded-full object-cover"
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

export function ProblemSection() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Entrance animations: fully crisp and visible almost immediately upon pinning
  const ringsOpacity = useTransform(scrollYProgress, [0, 0.04], [0.6, 1]);
  const ringsScale = useTransform(scrollYProgress, [0, 0.04], [0.97, 1]);

  const cardOpacity = useTransform(scrollYProgress, [0, 0.03], [0.85, 1]);
  const cardY = useTransform(scrollYProgress, [0, 0.03], [10, 0]);
  const cardScale = useTransform(scrollYProgress, [0, 0.03], [0.98, 1]);

  // Orbit rotation mapped across the section scroll:
  // Problem 01: generous initial rest from 0.00 to 0.26 so it doesn't scroll past right after hero!
  // Transition 1 -> 2: 0.26 to 0.38 (rotates 0deg to -90deg)
  // Problem 02: rests from 0.38 to 0.52 (-90deg)
  // Transition 2 -> 3: 0.52 to 0.64 (rotates -90deg to -180deg)
  // Problem 03: rests from 0.64 to 0.78 (-180deg)
  // Transition 3 -> 4: 0.78 to 0.90 (rotates -180deg to -270deg)
  // Problem 04: rests from 0.90 to 1.00 (-270deg)
  const orbitAngle = useTransform(
    scrollYProgress,
    [0, 0.26, 0.38, 0.52, 0.64, 0.78, 0.90, 1.0],
    [0, 0, -90, -90, -180, -180, -270, -270]
  );

  // Physical spring to make rotation feel effortless, smooth, and deliberate
  const smoothAngle = useSpring(orbitAngle, {
    stiffness: 90,
    damping: 24,
    mass: 0.6,
  });

  const [activeProblem, setActiveProblem] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);
  const mobileAngle = useMotionValue(0);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (isMobile) return;
    if (v < 0.32) setActiveProblem(0);
    else if (v < 0.58) setActiveProblem(1);
    else if (v < 0.84) setActiveProblem(2);
    else setActiveProblem(3);
  });

  // Smooth click navigation to any problem (targets center of each rest window on desktop)
  const scrollToProblem = (index: number) => {
    if (!ref.current) return;
    const targets = [0.13, 0.45, 0.71, 0.95];
    const sectionTop = ref.current.offsetTop;
    const sectionHeight = ref.current.offsetHeight;
    const vh = window.innerHeight;
    const scrollTarget = sectionTop + (sectionHeight - vh) * targets[index];
    window.scrollTo({ top: scrollTarget, behavior: "smooth" });
  };

  const goToProblem = (index: number) => {
    setActiveProblem(index);
    if (isMobile) {
      animate(mobileAngle, index * -90, {
        type: "spring",
        stiffness: 95,
        damping: 22,
      });
    } else {
      scrollToProblem(index);
    }
  };

  const handleNext = () => {
    const next = (activeProblem + 1) % PROBLEMS_DATA.length;
    goToProblem(next);
  };

  const handlePrev = () => {
    const prev = (activeProblem - 1 + PROBLEMS_DATA.length) % PROBLEMS_DATA.length;
    goToProblem(prev);
  };

  const effectiveAngle = isMobile ? mobileAngle : smoothAngle;
  const effectiveCardOpacity = isMobile ? 1 : cardOpacity;
  const effectiveCardY = isMobile ? 0 : cardY;
  const effectiveCardScale = isMobile ? 1 : cardScale;
  const effectiveRingsScale = isMobile ? 1 : ringsScale;
  const effectiveRingsOpacity = isMobile ? 1 : ringsOpacity;

  const touchStartX = React.useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  if (reduce) {
    return (
      <section id="the-problem" className="relative w-full overflow-hidden bg-white py-14 sm:py-18 lg:py-[84px]">
        <ProblemBackdrop />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <Heading />
          <div className="relative mx-auto mt-6 flex h-[390px] w-full max-w-[1080px] items-center justify-center sm:mt-8 sm:h-[460px] lg:mt-10 lg:h-[520px]">
            <StationaryRings />
            <div className="relative w-[88%] max-w-[320px] sm:w-[72%] sm:max-w-[420px] lg:max-w-[480px]">
              <BubbleShell>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[18px] sm:text-[20.5px] font-bold text-white tracking-tight leading-snug">
                    {PROBLEMS_DATA[0].title}
                  </h3>
                  <span className="shrink-0 font-mono text-[12px] sm:text-[13px] font-semibold tracking-wider text-white/80">
                    01 / 0{PROBLEMS_DATA.length}
                  </span>
                </div>
                <p className="mt-2.5 sm:mt-3 text-[13.5px] sm:text-[14.5px] lg:text-[15px] font-normal leading-[1.58] text-white/95">
                  {PROBLEMS_DATA[0].desc}
                </p>
              </BubbleShell>
            </div>
          </div>
          <ol className="mx-auto mt-10 max-w-2xl space-y-4 px-2">
            {PROBLEMS_DATA.map((item, i) => (
              <li key={i} className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-[15px] leading-relaxed text-[#475569]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="block text-[12px] font-bold tracking-wide text-[#2563EB]">
                    {item.tag}
                  </span>
                  <span className="text-[12px] font-semibold text-[#111]">
                    {item.title}
                  </span>
                </div>
                {item.desc}
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} id="the-problem" className="relative h-auto md:h-[600vh] bg-white">
      {/* Native GPU-accelerated sticky pinning on desktop, clean compact flow on mobile */}
      <div className="relative md:sticky md:top-0 flex w-full flex-col items-center justify-center overflow-hidden bg-white pt-8 pb-6 sm:pt-14 sm:pb-8 md:h-[100svh] md:pt-[4.5rem] md:pb-0">
        <ProblemBackdrop />

        <div
          className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Heading />

          {/* Orbit Stage Container */}
          <div className="relative mx-auto mt-2 xs:mt-4 flex h-[310px] xs:h-[340px] sm:h-[460px] lg:h-[520px] w-full max-w-[1080px] items-center justify-center">
            {/* Stationary background rings */}
            <StationaryRings scale={effectiveRingsScale} opacity={effectiveRingsOpacity} />

            {/* Orbiting Avatars on the 2nd ellipse track */}
            <div className="pointer-events-none absolute inset-0 z-20">
              {AVATARS.map((avatar) => (
                <OrbitingAvatar
                  key={avatar.id}
                  avatar={avatar}
                  smoothAngle={effectiveAngle}
                  currentSpeakerIndex={activeProblem}
                  onClick={() => goToProblem(avatar.id)}
                />
              ))}
            </div>

            {/* Central Speech Bubble Card */}
            <motion.div
              className="relative z-20 w-[90%] max-w-[310px] xs:max-w-[330px] sm:w-[74%] sm:max-w-[430px] lg:max-w-[480px]"
              style={{ opacity: effectiveCardOpacity, y: effectiveCardY, scale: effectiveCardScale }}
            >
              <div className="origin-center" style={{ transform: "rotate(4.2deg)" }}>
                <BubbleShell>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeProblem}
                      initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col justify-center"
                    >
                      {/* Top row: Title and 0X / 04 counter */}
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-[16px] xs:text-[17.5px] sm:text-[20px] lg:text-[21.5px] font-bold text-white tracking-tight leading-snug">
                          {PROBLEMS_DATA[activeProblem].title}
                        </h3>
                        <span className="shrink-0 font-mono text-[11px] sm:text-[13px] font-semibold tracking-wider text-white/80">
                          0{activeProblem + 1} / 0{PROBLEMS_DATA.length}
                        </span>
                      </div>

                      {/* Problem Description with clean, uniform line spacing */}
                      <p className="mt-2 sm:mt-3 text-[12.5px] xs:text-[13.5px] sm:text-[14.5px] lg:text-[15px] font-normal leading-[1.54] sm:leading-[1.58] text-white/95">
                        {PROBLEMS_DATA[activeProblem].desc}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </BubbleShell>
              </div>

              {/* Stickers anchored to the card */}
              {STICKERS.map((item) => (
                <div
                  key={item.src}
                  className={`pointer-events-none absolute z-30 select-none ${item.className}`}
                  aria-hidden="true"
                >
                  <div className={`${item.rotate} ${item.float}`}>
                    <img
                      src={item.src}
                      alt=""
                      className="h-auto w-full object-contain drop-shadow-[0_12px_18px_rgba(20,30,24,0.16)]"
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Interactive Navigation Controls: Prev, Dots, Next */}
          <div className="pointer-events-auto mt-2 sm:mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous problem"
              className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#475569] shadow-sm transition hover:bg-[#F1F5F9] hover:text-[#2563EB] cursor-pointer active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              {PROBLEMS_DATA.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToProblem(i)}
                  aria-label={`Jump to ${PROBLEMS_DATA[i].tag}`}
                  className={cn(
                    "h-2.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]",
                    i === activeProblem
                      ? "w-7 bg-[#2563EB]"
                      : "w-2.5 sm:w-2 bg-[#2563EB]/25 hover:bg-[#2563EB]/45"
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next problem"
              className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#475569] shadow-sm transition hover:bg-[#F1F5F9] hover:text-[#2563EB] cursor-pointer active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-50"
      style={{
        backgroundImage: "radial-gradient(rgba(37, 99, 235, 0.07) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        maskImage: "radial-gradient(ellipse 78% 72% at 50% 46%, black 58%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 78% 72% at 50% 46%, black 58%, transparent 100%)",
      }}
    />
  );
}
