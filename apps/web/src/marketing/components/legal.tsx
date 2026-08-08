import Link from "next/link";
import { Reveal } from "./ui";
import { cn } from "@/lib/utils";

export interface LegalSection {
  h?: string;
  p?: string;
  ul?: string[];
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="pt-32 pb-24 sm:pt-40">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--color-border))] bg-white px-3.5 py-1.5 text-xs font-semibold text-[rgb(var(--color-muted-foreground))]">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]" />
            {eyebrow}
          </span>
          <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-[rgb(var(--color-subtle))]">Last updated: {updated}</p>
          <p className="mt-8 text-[15px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
            This is a summary of our {eyebrow.toLowerCase()} policy. For the full legal agreement, please email{" "}
            <a href="mailto:legal@doloyal.ai" className="text-[#2563EB] font-semibold hover:underline">
              legal@doloyal.ai
            </a>
            .
          </p>
        </Reveal>

        <div className="mt-12 space-y-10">
          {sections.map((s, i) => (
            <Reveal key={i} delay={Math.min(i * 0.04, 0.2)}>
              <section className={cn("rounded-3xl border border-[rgb(var(--color-border))] bg-white p-7 sm:p-9")}>
                {s.h ? <h2 className="mb-4 text-xl font-bold tracking-[-0.01em]">{s.h}</h2> : null}
                {s.p ? (
                  <p className="text-[15px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">{s.p}</p>
                ) : null}
                {s.ul ? (
                  <ul className="mt-3 space-y-2.5">
                    {s.ul.map((li) => (
                      <li key={li} className="flex items-start gap-3 text-[15px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                        <span className="mt-2.5 h-1 w-3 shrink-0 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]" />
                        {li}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[rgb(var(--color-subtle))]">
            <Link href="/privacy" className="hover:text-[rgb(var(--color-muted-foreground))]">Privacy</Link>
            <Link href="/terms" className="hover:text-[rgb(var(--color-muted-foreground))]">Terms</Link>
            <Link href="/security" className="hover:text-[rgb(var(--color-muted-foreground))]">Security</Link>
            <Link href="/refund" className="hover:text-[rgb(var(--color-muted-foreground))]">Refund policy</Link>
            <Link href="/cookies" className="hover:text-[rgb(var(--color-muted-foreground))]">Cookie policy</Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}