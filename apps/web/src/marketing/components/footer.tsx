import Link from "next/link";
import { Facebook, Linkedin, Instagram, Send } from "lucide-react";
import { site } from "../lib/site";
import { Logo } from "@doloyal/ui";

const COLUMNS = [
  {
    title: "PRODUCT",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Book a Demo", href: "/book-demo" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Help / FAQ", href: "/#faq" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-and-conditions" },
    ],
  },
];

const SOCIALS = [
  {
    icon: Facebook,
    label: "Facebook",
    href: "https://facebook.com",
    hoverClass: "hover:bg-[#1877F2]",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    href: site.social.linkedin,
    hoverClass: "hover:bg-[#0A66C2]",
  },
  {
    icon: Instagram,
    label: "Instagram",
    href: site.social.instagram,
    hoverClass: "hover:bg-gradient-to-tr hover:from-[#F09433] hover:via-[#DC2743] hover:to-[#BC1888]",
  },
  {
    icon: Send,
    label: "Telegram",
    href: "https://t.me",
    hoverClass: "hover:bg-[#229ED9]",
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 sm:py-16 font-[family-name:var(--font-sora)]">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8">
        {/* Top Grid Portion */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-5 lg:gap-12">
          {/* Left Brand Area */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block" aria-label="Doloyal home">
              <Logo size={36} />
            </Link>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-slate-500 font-normal">
              Doloyal helps local businesses build stronger customer relationships, increase repeat visits, and manage customer retention from one simple platform.
            </p>
          </div>

          {/* Right Link Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:col-span-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-[12px] font-semibold text-slate-400 tracking-wider uppercase">
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[14px] font-medium text-slate-700 hover:text-[#2563EB] transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Portion: Divider + Copyright & Brand Hover Social Buttons */}
        <div className="mt-14 pt-8 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[13px] font-medium text-slate-500">
            © 2026 Doloyal. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noreferrer"
                className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-sm transition-all duration-300 hover:scale-115 hover:shadow-md ${s.hoverClass}`}
              >
                <s.icon className="h-4 w-4 stroke-[2.2]" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}