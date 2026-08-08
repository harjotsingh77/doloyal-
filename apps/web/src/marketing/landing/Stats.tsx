"use client";

import * as React from "react";
import { useInView, motion } from "framer-motion";
import { Container, Reveal } from "./ui";

function Counter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  const formatted = display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      <span className="text-[#111111]">{suffix}</span>
    </span>
  );
}

const STATS = [
  { value: 99.9, decimals: 1, suffix: "%", label: "Uptime that never sleeps" },
  { value: 120, suffix: "+", label: "Automations run daily" },
  { value: 40, suffix: "%", label: "Average retention lift" },
  { value: 5, suffix: "x", label: "Faster than manual ops" },
];

export function Stats() {
  return (
    <section className="relative py-10 sm:py-16">
      <Container>
        <Reveal>
          <div className="grid grid-cols-2 gap-4 rounded-[2rem] border border-black/[0.06] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(23,97,253,0.4)] sm:grid-cols-4 sm:p-10 lg:gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2 text-center">
                <span className="text-[2.2rem] font-bold tracking-[-0.03em] sm:text-[2.8rem] md:text-5xl">
                  <span className="gradient-text">
                    <Counter value={s.value} suffix={s.suffix} decimals={s.decimals} />
                  </span>
                </span>
                <span className="text-[13px] font-medium text-[#666] sm:text-[14px]">{s.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}