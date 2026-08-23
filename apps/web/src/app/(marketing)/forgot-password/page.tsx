import type { Metadata } from "next";
import * as React from "react";
import { buildMetadata } from "@/marketing/lib/seo";
import { ForgotPasswordScreen } from "./forgot-password-client";

export const metadata: Metadata = buildMetadata({
  title: "Forgot password",
  description: "Reset your Doloyal password.",
  path: "/forgot-password",
  robots: { index: false, follow: false },
});

export default function ForgotPasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[80vh]" />}>
      <ForgotPasswordScreen />
    </React.Suspense>
  );
}
