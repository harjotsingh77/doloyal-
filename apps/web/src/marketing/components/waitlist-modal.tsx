"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2, ArrowRight, Loader2, Mail } from "lucide-react";
import { TextRoll } from "../landing/ui";

interface WaitlistContextType {
  isOpen: boolean;
  openWaitlistModal: () => void;
  closeWaitlistModal: () => void;
}

const WaitlistContext = React.createContext<WaitlistContextType>({
  isOpen: false,
  openWaitlistModal: () => {},
  closeWaitlistModal: () => {},
});

export function WaitlistProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const openWaitlistModal = React.useCallback(() => setIsOpen(true), []);
  const closeWaitlistModal = React.useCallback(() => setIsOpen(false), []);

  return (
    <WaitlistContext.Provider value={{ isOpen, openWaitlistModal, closeWaitlistModal }}>
      {children}
      <WaitlistModal isOpen={isOpen} onClose={closeWaitlistModal} />
    </WaitlistContext.Provider>
  );
}

export function useWaitlistModal() {
  return React.useContext(WaitlistContext);
}

export function WaitlistModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "e1da9865-e94c-4392-a2a1-a1dfc16e0cd1",
          subject: "New Waitlist Signup — Doloyal Modal",
          from_name: "Doloyal Waitlist",
          email: email,
          name: businessName || email,
          businessName: businessName || "N/A",
          message: `Waitlist Modal Submission:\nEmail: ${email}\nBusiness Name: ${businessName || "N/A"}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setEmail("");
    setBusinessName("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-[family-name:var(--font-sora)]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-black/10 bg-white p-8 sm:p-10 shadow-2xl z-10 text-[#282628]"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#2563EB]/15 blur-3xl" />

            {status === "success" ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-2xl font-extrabold text-[#282628]">🎉 You're On The Waitlist!</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Thank you for joining. We’re preparing Doloyal for launch and you’ll get early access & 1 Month Free!
                </p>
                <button
                  onClick={handleReset}
                  className="mt-8 rounded-full bg-[#2563EB] px-7 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
                >
                  Got It, Thanks!
                </button>
              </div>
            ) : (
              <div>
                {/* Header Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-3.5 py-1 text-xs font-semibold text-[#2563EB]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Launching Soon</span>
                </div>

                {/* Modal Title */}
                <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#282628]">
                  Join the Exclusive Waitlist
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Doloyal is launching soon! Sign up today to lock in your <strong className="text-[#2563EB]">1 Month Free Trial</strong> & priority onboarding access.
                </p>

                {/* Waitlist Form */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Work Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@yourbusiness.com"
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 pl-11 pr-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Business Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Salon, Café, Spa, Gym name"
                      className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                  </div>

                  {status === "error" && (
                    <div className="rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-600">
                      Please enter a valid email address.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="group mt-2 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#232529] py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#2563EB] hover:shadow-blue-500/25 disabled:opacity-50"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Joining Waitlist...</span>
                      </>
                    ) : (
                      <>
                        <TextRoll>Join Waitlist & Get 1 Month Free</TextRoll>
                        <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[12px] text-gray-400">
                    No spam. We'll only email you when early access opens.
                  </p>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
