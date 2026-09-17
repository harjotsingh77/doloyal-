"use client";

import { useEffect } from "react";

/** The dedicated pricing page is retired — send people to the homepage section. */
export default function PricingRedirect() {
  useEffect(() => {
    window.location.replace("/#pricing");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
      Taking you to pricing…
    </div>
  );
}
