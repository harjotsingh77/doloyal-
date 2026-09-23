"use client";

import * as React from "react";
import { listBranches, type BranchRecord } from "./branches";
import { useResource } from "./use-resource";

export type WorkspaceMode = "global" | "branch";

interface BranchContextValue {
  mode: WorkspaceMode;
  branches: BranchRecord[];
  loading: boolean;
  selectedBranch: BranchRecord | null;
  branchId: string | null;
  branchName: string | null;
  /** Reload branches from the API. */
  refresh: () => Promise<void>;
  /** Enter branch mode and persist selection. */
  enterBranch: (branch: BranchRecord) => void;
  enterBranchById: (id: string) => void;
  /** Return to the global workspace. */
  exitBranch: () => void;
  /** Base path for the active workspace ("" in global mode). */
  workspaceBase: string;
}

const SELECTED_ID_KEY = "doloyal_selected_branch_id";
const BRANCHES_KEY = ["branches"] as const;

const BranchContext = React.createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(SELECTED_ID_KEY);
  });

  const branchesQuery = useResource<BranchRecord[]>({
    queryKey: BRANCHES_KEY,
    queryFn: () => listBranches(),
    scopes: ["dashboard"],
  });

  const branches = branchesQuery.data ?? [];
  const loading = branchesQuery.isLoading && branches.length === 0;

  const refresh = React.useCallback(async () => {
    await branchesQuery.refetch();
  }, [branchesQuery]);

  // Keep in sync across tabs.
  React.useEffect(() => {
    const sync = () => {
      setSelectedId(localStorage.getItem(SELECTED_ID_KEY));
      void refresh();
    };
    window.addEventListener("storage", sync);
    window.addEventListener("doloyal:branches-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("doloyal:branches-updated", sync);
    };
  }, [refresh]);

  const selectedBranch = React.useMemo(
    () => branches.find((b) => b.id === selectedId) ?? null,
    [branches, selectedId],
  );

  const mode: WorkspaceMode = selectedBranch ? "branch" : "global";
  const workspaceBase = selectedBranch ? `/branches/${selectedBranch.id}` : "";

  const enterBranchById = React.useCallback((branchId: string) => {
    localStorage.setItem(SELECTED_ID_KEY, branchId);
    setSelectedId(branchId);
  }, []);

  const enterBranch = React.useCallback(
    (branch: BranchRecord) => enterBranchById(branch.id),
    [enterBranchById],
  );

  const exitBranch = React.useCallback(() => {
    localStorage.removeItem(SELECTED_ID_KEY);
    setSelectedId(null);
  }, []);

  const value = React.useMemo<BranchContextValue>(
    () => ({
      mode,
      branches,
      loading,
      selectedBranch,
      branchId: selectedBranch?.id ?? null,
      branchName: selectedBranch?.name ?? null,
      refresh,
      enterBranch,
      enterBranchById,
      exitBranch,
      workspaceBase,
    }),
    [
      mode,
      branches,
      loading,
      selectedBranch,
      refresh,
      enterBranch,
      enterBranchById,
      exitBranch,
      workspaceBase,
    ],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = React.useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
