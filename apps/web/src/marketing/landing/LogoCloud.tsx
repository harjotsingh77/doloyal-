"use client";

import { Container, Reveal } from "./ui";

const BRANDS = [
  {
    name: "BrightHive",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#9333EA" fillOpacity="0.25" stroke="#A855F7" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 6.5L7 9.5v5l5 3 5-3v-5l-5-3z" fill="#A855F7" />
      </svg>
    ),
  },
  {
    name: "VeloSoft",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h10l6 8-6 8H4l6-8-6-8z" fill="#F59E0B" />
      </svg>
    ),
  },
  {
    name: "Marketly",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 18L9 6l5 7 7-9v14H3z" fill="#F97316" />
      </svg>
    ),
  },
  {
    name: "AlphaStack",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 3L2 12h5v9h10v-9h5L12 3z" fill="#10B981" />
      </svg>
    ),
  },
  {
    name: "DataSpher",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z" fill="#3B82F6" />
        <circle cx="12" cy="12" r="3" fill="#60A5FA" />
      </svg>
    ),
  },
  {
    name: "NovaCloud",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M6 16.5A4.5 4.5 0 017.5 7.6 6 6 0 0118 10a4 4 0 01.5 8H6z" fill="#06B6D4" />
      </svg>
    ),
  },
  {
    name: "PulseFlow",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 12h4l3-8 4 16 3-8h4" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "ZenithAI",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#8B5CF6" />
      </svg>
    ),
  },
];

function BrandItem({ brand }: { brand: (typeof BRANDS)[0] }) {
  return (
    <div className="flex shrink-0 items-center gap-3 px-8 py-2 text-[17px] sm:text-[18px] font-bold text-white tracking-tight cursor-default opacity-95 hover:opacity-100 transition-opacity">
      {brand.icon}
      <span>{brand.name}</span>
    </div>
  );
}

export function LogoCloud() {
  const row = [...BRANDS, ...BRANDS, ...BRANDS];
  return (
    <section className="relative py-8 sm:py-12">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#222225] py-10 px-6 sm:py-12 sm:px-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            {/* Background grid lines texture inside dark card */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_100%]" />

            {/* Header Text inside card */}
            <h3 className="relative z-10 text-center text-[16px] sm:text-[18px] font-medium tracking-tight text-white/90 mb-8">
              Loved by over 1k+ founders and business owners!
            </h3>

            {/* Marquee Track */}
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#222225] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#222225] to-transparent" />
              <div className="marquee-track flex w-max items-center">
                {row.map((b, i) => (
                  <BrandItem key={`${b.name}-${i}`} brand={b} />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}