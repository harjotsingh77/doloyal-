"use client";

import { BranchCentralizedSection } from "../branch-section";

export default function Page() {
  return (
    <BranchCentralizedSection
      title="Memberships"
      description="Membership plans and member records live in the main workspace."
      href="/app/memberships"
      linkLabel="Open Memberships"
    />
  );
}
