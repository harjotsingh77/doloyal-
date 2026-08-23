"use client";

import { BranchCentralizedSection } from "../branch-section";

export default function Page() {
  return (
    <BranchCentralizedSection
      title="Appointments"
      description="Bookings are managed from the central calendar and every booking link you publish."
      href="/app/appointments"
      linkLabel="Open Appointments"
    />
  );
}
