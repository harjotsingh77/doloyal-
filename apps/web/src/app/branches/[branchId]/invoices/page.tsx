"use client";

import { BranchCentralizedSection } from "../branch-section";

export default function Page() {
  return (
    <BranchCentralizedSection
      title="Invoices"
      description="Billing is centralized so revenue stays consistent everywhere."
      href="/app/invoices"
      linkLabel="Open Invoices"
    />
  );
}
