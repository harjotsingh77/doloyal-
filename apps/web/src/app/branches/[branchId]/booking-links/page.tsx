"use client";

import { BranchCentralizedSection } from "../branch-section";

export default function Page() {
  return (
    <BranchCentralizedSection
      title="Booking Links"
      description="Booking links are published business-wide; assign branch staff to each link for routing."
      href="/app/appointments/booking-links"
      linkLabel="Manage Booking Links"
    />
  );
}
