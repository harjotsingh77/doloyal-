/**
 * Branch registry — REAL data from the Doloyal API (/branches).
 *
 * A branch is a physical location of the business. The backend scopes a
 * branch's TEAM (staff assignments); customers/appointments remain
 * business-wide records attributed to staff members. Nothing in this module
 * fabricates data: every number comes from the API.
 */

import { api } from "./api";

export interface BranchRecord {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  createdAt?: string;
  staffCount?: number;
}

export interface BranchStaffRow {
  id: string;
  name: string;
  roleTitle: string;
  isAvailable: boolean;
}

export interface BranchStats {
  branch: BranchRecord;
  teamSize: number;
  staff: BranchStaffRow[];
  appointmentsToday: number;
  appointments30d: number;
  completed30d: number;
  revenue30d: number;
}

export async function listBranches(): Promise<BranchRecord[]> {
  return api.listBranches();
}

export async function getBranch(id: string): Promise<BranchRecord> {
  const stats = await api.getBranch(id);
  return stats.branch;
}

export async function getBranchStats(id: string): Promise<BranchStats> {
  return api.getBranch(id);
}

export async function createBranch(input: {
  name: string;
  phone?: string;
  address?: string;
  city?: string;
}): Promise<BranchRecord> {
  return api.createBranch(input);
}

export async function updateBranch(
  id: string,
  input: { name?: string; phone?: string; address?: string; city?: string },
): Promise<BranchRecord> {
  return api.updateBranch(id, input);
}

export async function deleteBranch(id: string): Promise<void> {
  await api.deleteBranch(id);
}

/* ── Presentation helpers ─────────────────────────────────────────────── */

/** Stable avatar color per branch name — purely visual, never data. */
const AVATAR_COLORS = ["#2563EB", "#8B5CF6", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];
export function branchAccent(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

export function getBranchInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
