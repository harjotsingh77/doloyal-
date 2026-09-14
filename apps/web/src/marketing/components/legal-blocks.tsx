import type { ReactNode } from "react";

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-black/[0.06] py-10 first:border-t-0 first:pt-0">
      <h2 id={id} className="scroll-mt-28 text-[1.35rem] font-bold tracking-tight text-[#282628] sm:text-[1.5rem]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 mb-3 text-base font-semibold tracking-tight text-[#282628]">{children}</h3>;
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p className="mb-4 last:mb-0">{children}</p>;
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mb-4 list-disc space-y-1.5 pl-5 last:mb-0">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
      {...(isExternal ? { rel: "noreferrer", target: "_blank" } : {})}
    >
      {children}
    </a>
  );
}

export function LegalDocNav() {
  return (
    <div className="mt-12 border-t border-black/[0.06] pt-8 text-sm text-slate-500">
      <p className="font-medium">Doloyal © 2026</p>
      <nav aria-label="Legal" className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        <LegalLink href="/privacy-policy">Privacy Policy</LegalLink>
        <span aria-hidden="true">·</span>
        <LegalLink href="/terms-of-service">Terms of Service</LegalLink>
        <span aria-hidden="true">·</span>
        <LegalLink href="/data-deletion">Data Deletion</LegalLink>
        <span aria-hidden="true">·</span>
        <LegalLink href="/contact">Contact</LegalLink>
      </nav>
    </div>
  );
}
