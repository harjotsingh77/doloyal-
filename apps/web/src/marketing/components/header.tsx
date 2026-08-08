"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextRoll } from "../landing/ui";
import { useWaitlistModal } from "./waitlist-modal";

interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
}

const NAV: NavItem[] = [
  { label: "All Pages", href: "#", hasDropdown: true },
  { label: "Features", href: "/features" },
  { label: "Company", href: "/about" },
  { label: "Pricing", href: "/pricing" },
];

const ALL_PAGES_MENU = [
  // Column 1
  [
    { label: "Homepage", href: "/" },
    { label: "About", href: "/about" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Blog", href: "/blog" },
  ],
  // Column 2
  [
    { label: "Contact", href: "/contact" },
    { label: "Book a Demo", href: "/book-demo" },
    { label: "Integrations", href: "/integrations" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
  ],
];

export function SiteHeader() {
  const { openWaitlistModal } = useWaitlistModal();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-black/[0.06] bg-white/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-[1240px] items-center justify-between px-6 transition-all duration-300 sm:px-10",
            scrolled ? "h-16" : "h-20",
          )}
        >
          {/* Doloyal Full Logo */}
          <Link href="/" className="flex items-center group" aria-label="Doloyal home">
            <img src="/logo.png" alt="Doloyal" className="h-9 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-8 md:flex relative" ref={dropdownRef}>
            {NAV.map((item) => {
              if (item.hasDropdown) {
                return (
                  <div key={item.label} className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={cn(
                        "flex items-center gap-1.5 text-[15px] font-semibold transition-colors outline-none py-2",
                        dropdownOpen
                          ? "text-[#2563EB] border-b-2 border-[#2563EB]"
                          : "text-[#1F2937] hover:text-[#2563EB]",
                      )}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-300",
                          dropdownOpen ? "rotate-180 text-[#2563EB]" : "opacity-70",
                        )}
                      />
                    </button>

                    {/* All Pages Mega Menu Dropdown */}
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 12, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute left-0 top-full mt-3 w-[440px] rounded-3xl border border-black/10 bg-white p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50"
                        >
                          <div className="grid grid-cols-2 gap-8">
                            {ALL_PAGES_MENU.map((col, cIdx) => (
                              <div key={cIdx} className="flex flex-col gap-3">
                                {col.map((page, pIdx) => (
                                  <Link
                                    key={pIdx}
                                    href={page.href}
                                    onClick={() => setDropdownOpen(false)}
                                    className="text-[14.5px] font-semibold text-[#1F2937] transition-all duration-200 hover:text-[#2563EB] hover:translate-x-1"
                                  >
                                    {page.label}
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-1 text-[15px] font-semibold text-[#1F2937] transition-colors hover:text-[#2563EB]"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={openWaitlistModal}
              className="rounded-full px-4 py-2 text-[15px] font-semibold text-[#1F2937] transition-colors hover:text-[#2563EB]"
            >
              Log in
            </button>
            <button
              onClick={openWaitlistModal}
              className="group flex items-center gap-3.5 rounded-full bg-[#1F242B] pl-6 pr-2 py-2 text-[14px] font-semibold text-white shadow-md transition-all duration-300 hover:bg-[#2563EB] hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
            >
              <TextRoll>Get Started</TextRoll>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1F242B] group-hover:text-[#2563EB] shadow-sm transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#111827] md:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="border-b border-black/10 bg-white/95 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col gap-2 px-6 py-5">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                Homepage
              </Link>
              <Link
                href="/about"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                About
              </Link>
              <Link
                href="/features"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                Pricing
              </Link>
              <Link
                href="/blog"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                Blog
              </Link>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                Contact
              </Link>
              <Link
                href="/book-demo"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                Book a Demo
              </Link>
              <Link
                href="/integrations"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                Integrations
              </Link>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center justify-center rounded-xl py-2.5 text-base font-semibold text-[#1F2937] hover:bg-gray-100"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setOpen(false)}
                className="group mt-2 flex items-center justify-between rounded-full bg-[#1F242B] px-6 py-3 text-base font-semibold text-white"
              >
                <TextRoll>Get Started</TextRoll>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1F242B]">
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </div>
              </Link>
            </nav>
          </motion.div>
        )}
      </motion.header>
    </>
  );
}