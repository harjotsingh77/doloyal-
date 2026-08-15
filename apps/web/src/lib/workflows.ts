import type { WorkflowDefinition } from "@doloyal/shared";

/** Status returned by the backend per-node validation. */
export type ValidationStatus = "OK" | "ERROR" | "WARNING";

export interface ValidationCheck {
  label: string;
  status: ValidationStatus;
  message?: string;
}

export type ValidationAction =
  | { kind: "fix_node" }
  | { kind: "connect_integration"; integration: string; label: string; url: string }
  | { kind: "upgrade_plan" };

export interface WorkflowNodeValidation {
  nodeKey: string;
  type: string;
  label: string;
  status: ValidationStatus;
  summary: string;
  checks: ValidationCheck[];
  canContinue: boolean;
  action?: ValidationAction;
}

export interface WorkflowValidationResult {
  ok: boolean;
  simulated: true;
  testedAt: string;
  plan: string;
  nodes: WorkflowNodeValidation[];
  errors: number;
  warnings: number;
  message: string;
}

/** Live node status shown on the canvas during a test. */
export type TestNodeStatus = "IDLE" | "TESTING" | "SUCCESS" | "ERROR" | "WARNING";

export interface TestNodeState {
  code: TestNodeStatus;
  summary?: string;
  checks?: ValidationCheck[];
  action?: ValidationAction;
  testedAt?: string;
}

export type TestNodeStates = Record<string, TestNodeState>;

export interface TestProgress {
  step: number;
  total: number;
  percent: number;
}

export interface TestSummary {
  ok: boolean;
  errors: number;
  warnings: number;
  message: string;
  plan?: string;
  simulated?: boolean;
  testedAt?: string;
  nodes: WorkflowNodeValidation[];
}

export function buildTestContext(
  definition: WorkflowDefinition,
  states: TestNodeStates,
  summary?: TestSummary,
): string {
  const lines: string[] = [];
  lines.push(`Workflow: ${definition.name || "(untitled)"}`);
  lines.push(`Trigger: ${definition.trigger.type}`);
  for (const node of definition.nodes) {
    const st = states[node.id];
    const status = st?.code === "SUCCESS" ? "OK" : st?.code === "ERROR" ? "ERROR" : st?.code === "WARNING" ? "WARNING" : st?.code === "TESTING" ? "TESTING" : "NOT TESTED";
    lines.push(`- ${node.id} (${node.type}): ${status}${st?.summary ? ` — ${st.summary}` : ""}`);
  }
  if (summary) {
    lines.push(`Test result: ${summary.message}`);
  }
  return lines.join("\n");
}

export const STATUS_META: Record<TestNodeStatus, { label: string; className: string; ring: string }> = {
  IDLE: {
    label: "Not tested",
    className: "border-slate-200",
    ring: "",
  },
  TESTING: {
    label: "Testing…",
    className: "border-sky-500/80",
    ring: "shadow-[0_0_0_1px_rgba(14,165,233,0.55)]",
  },
  SUCCESS: {
    label: "Passed",
    className: "border-emerald-500/90",
    ring: "shadow-[0_0_0_1px_rgba(16,185,129,0.55)]",
  },
  ERROR: {
    label: "Needs attention",
    className: "border-rose-500/90",
    ring: "shadow-[0_0_0_1px_rgba(244,63,94,0.6)]",
  },
  WARNING: {
    label: "Passed with note",
    className: "border-amber-500/90",
    ring: "shadow-[0_0_0_1px_rgba(245,158,11,0.6)]",
  },
};

export const CHECK_ICONS: Record<ValidationStatus, string> = {
  OK: "check",
  ERROR: "x",
  WARNING: "alert",
};