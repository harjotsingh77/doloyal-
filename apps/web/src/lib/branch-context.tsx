"use client";

import * as React from "react";
import { getBranches, getBranch, type BranchProfile } from "./branches";

export type WorkspaceMode = "global" | "branch";

interface BranchContextValue {
  mode: WorkspaceMode;
  branches: BranchProfile[];
  selectedBranch: BranchProfile | null;
  branchId: string | null;
  branchName: string | null;
  /** Enter branch mode and persist selection. */
  enterBranch: (branch: BranchProfile) => void;
  enterBranchById: (id: string) => void;
  /** Return to the global workspace. */
  exitBranch: () => void;
  /** Base path for the active workspace ("" in global mode). */
  workspaceBase: string;
}

const SELECTED_ID_KEY = "doloyal_selected_branch_id";
const SELECTED_NAME_KEY = "doloyal_selected_branch_name";

function readSelected(): { id: string | null; name: string | null } {
  if (typeof window === "undefined") return { id: null, name: null };
  return {
    id: localStorage.getItem(SELECTED_ID_KEY),
    name: localStorage.getItem(SELECTED_NAME_KEY),
  };
}

const BranchContext = React.createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = React.useState<BranchProfile[]>(() => getBranches());
  const [{ id, name }, setSelected] = React.useState<{ id: string | null; name: string | null }>(
    () => readSelected(),
  );

  // Keep the registry in sync when the Branches page adds/edits locations.
  React.useEffect(() => {
    const sync = () => setBranches(getBranches());
    window.addEventListener("storage", sync);
    window.addEventListener("doloyal:branches-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("doloyal:branches-updated", sync);
    };
  }, []);

  const selectedBranch = React.useMemo(
    () => (id ? getBranch(id) : null) ?? branches.find((b) => b.id === id) ?? null,
    [id, branches],
  );

  const mode: WorkspaceMode = selectedBranch ? "branch" : "global";
  const workspaceBase = selectedBranch ? `/branches/${selectedBranch.id}` : "";

  const enterBranchById = React.useCallback(
    (branchId: string) => {
      const branch = getBranch(branchId);
      if (!branch) return;
      setBranches(getBranches());
      localStorage.setItem(SELECTED_ID_KEY, branch.id);
      localStorage.setItem(SELECTED_NAME_KEY, branch.name);
      setSelected({ id: branch.id, name: branch.name });
    },
    [],
  );

  const enterBranch = React.useCallback(
    (branch: BranchProfile) => enterBranchById(branch.id),
    [enterBranchById],
  );

  const exitBranch = React.useCallback(() => {
    localStorage.removeItem(SELECTED_ID_KEY);
    localStorage.removeItem(SELECTED_NAME_KEY);
    setSelected({ id: null, name: null });
  }, []);

  const value = React.useMemo<BranchContextValue>(
    () => ({
      mode,
      branches,
      selectedBranch,
      branchId: selectedBranch?.id ?? null,
      branchName: selectedBranch?.name ?? null,
      enterBranch,
      enterBranchById,
      exitBranch,
      workspaceBase,
    }),
    [mode, branches, selectedBranch, enterBranch, enterBranchById, exitBranch, workspaceBase],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch(): BranchContextValue {
  const ctx = React.useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
