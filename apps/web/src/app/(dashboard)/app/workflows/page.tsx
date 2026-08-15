"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Send,
  Sparkles,
  Zap,
  Wand2,
  Plus,
  Loader2,
  AlertTriangle,
  Users,
  TrendingUp,
  Play,
  Pause,
  Copy,
  Archive,
  Trash2,
  PanelLeftOpen,
  GitBranch,
  MessageSquare,
  ChevronLeft,
  Check,
  X,
  RotateCw,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
  cn,
} from "@doloyal/ui";
import type {
  WorkflowDetail,
  WorkflowSummary,
  WorkflowTemplateInfo,
  WorkflowDefinition,
  WorkflowCapabilityCatalog,
} from "@doloyal/shared";

import { api } from "@/lib/api";
import { WorkflowCanvas } from "./workflow-canvas";
import {
  ensureTriggerNode,
  triggerLabel,
  defSignature,
  computeAutoLayout,
  topologicalOrder,
  type NodePositions,
} from "./workflow-graph";
import type {
  TestNodeStates,
  TestNodeState,
  TestProgress,
  TestSummary,
  ValidationAction,
} from "@/lib/workflows";
import { buildTestContext } from "@/lib/workflows";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

type DraftSession = {
  definition: WorkflowDefinition | null;
  positions: NodePositions;
  viewport: { x: number; y: number; zoom: number } | null;
  messages: ChatMsg[];
};

const GREETING: ChatMsg = {
  id: "greet-1",
  role: "assistant",
  content:
    "Describe the automation you want and I'll build it — for example: win back customers who haven't visited in 30 days.",
  createdAt: new Date(0),
};

const SUGGESTIONS = [
  "Win back customers who haven't visited in 30 days",
  "Send a birthday message with a reward",
  "Remind customers about their appointment tomorrow",
  "Thank customers after a visit and ask for a review",
];

const DRAFT_KEY_PREFIX = "doloyal.wf.draft";
const SPLIT_KEY = "doloyal.wf.chatWidth";

function draftKey(id: string | null) {
  return id ? `${DRAFT_KEY_PREFIX}.${id}` : `${DRAFT_KEY_PREFIX}.fresh`;
}

function readDraft(key: string): DraftSession | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DraftSession;
  } catch {
    return null;
  }
}

function writeDraft(key: string, session: DraftSession) {
  try {
    window.localStorage.setItem(key, JSON.stringify(session));
  } catch {
    /* storage may be unavailable */
  }
}

function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  PAUSED: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  ERROR: { label: "Error", className: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IconAction({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-1.5 text-[#9CA3AF] transition hover:bg-slate-100 hover:text-[#111827]"
    >
      {children}
    </button>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = React.useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<WorkflowDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = React.useState(false);

  const [sessionDef, setSessionDef] = React.useState<WorkflowDefinition | null>(null);
  const [positions, setPositions] = React.useState<NodePositions>({});
  const [viewport, setViewport] = React.useState<{ x: number; y: number; zoom: number } | null>(null);
  const [animateToken, setAnimateToken] = React.useState(0);
  const [dirty, setDirty] = React.useState(false);

  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const [templates, setTemplates] = React.useState<WorkflowTemplateInfo[]>([]);
  const [catalog, setCatalog] = React.useState<WorkflowCapabilityCatalog | null>(null);

  const [activateOpen, setActivateOpen] = React.useState(false);
  const [audience, setAudience] = React.useState<number | undefined>(undefined);
  const [acting, setActing] = React.useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = React.useState(false);
  const [showNewConfirm, setShowNewConfirm] = React.useState(false);
  const [explainOpen, setExplainOpen] = React.useState(false);
  const [explainText, setExplainText] = React.useState("");
  const [explaining, setExplaining] = React.useState(false);

  const [fullscreen, setFullscreen] = React.useState(false);
  const [chatCollapsed, setChatCollapsed] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<"chat" | "workflow">("chat");
  const [chatWidth, setChatWidth] = React.useState(400);

  const [nodeStatuses, setNodeStatuses] = React.useState<TestNodeStates>({});
  const [testing, setTesting] = React.useState(false);
  const [testProgress, setTestProgress] = React.useState<TestProgress | null>(null);
  const [testResult, setTestResult] = React.useState<TestSummary | null>(null);
  const [testDone, setTestDone] = React.useState(false);
  const [focusNodeId, setFocusNodeId] = React.useState<string | null>(null);

  const savedSigRef = React.useRef<string>("");
  const testedSigRef = React.useRef<string>("");
  const chatInputRef = React.useRef<HTMLInputElement>(null);
  const chatWidthRef = React.useRef(400);
  const restoreRanRef = React.useRef(false);
  const router = useRouter();

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    const stored = Number(window.localStorage.getItem(SPLIT_KEY));
    if (stored && stored >= 320 && stored <= 520) {
      setChatWidth(stored);
      chatWidthRef.current = stored;
    }
    setChatCollapsed(window.localStorage.getItem("doloyal.wf.chatCollapsed") === "1");
  }, []);

  React.useEffect(() => {
    void load();
    if (!restoreRanRef.current) {
      restoreRanRef.current = true;
      const fresh = readDraft(draftKey(null));
      if (fresh) {
        setMessages(fresh.messages && fresh.messages.length ? fresh.messages : [GREETING]);
        if (fresh.definition) {
          setSessionDef(fresh.definition);
          setPositions(fresh.positions || {});
          setViewport(fresh.viewport || null);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    setDirty(sessionDef ? defSignature(sessionDef) !== savedSigRef.current : false);
  }, [sessionDef]);

  React.useEffect(() => {
    const key = draftKey(selectedId);
    writeDraft(key, { definition: sessionDef, positions, viewport, messages });
  }, [sessionDef, positions, viewport, messages, selectedId]);

  const autoSaveTimerRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (!selectedId || !sessionDef) return;
    if (defSignature(sessionDef) === savedSigRef.current) return;
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void autoSave();
    }, 500);
    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDef, selectedId]);

  const load = async () => {
    setLoading(true);
    try {
      const [list, tpls, cat] = await Promise.all([
        api.listWorkflows(),
        api.listWorkflowTemplates(),
        api.getWorkflowCatalog(),
      ]);
      setWorkflows(list);
      setTemplates(tpls);
      setCatalog(cat);
    } catch {
      setErrorBanner("Unable to load workflows. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const autoSave = async () => {
    if (!selectedId || !sessionDef) return;
    if (defSignature(sessionDef) === savedSigRef.current) return;
    try {
      const updated = await api.saveWorkflow(selectedId, sessionDef);
      savedSigRef.current = defSignature(sessionDef);
      setDirty(false);
      setSelected(updated);
      setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch {
      /* keep dirty so we retry on the next change */
    }
  };

  const openWorkflow = async (id: string) => {
    setSelectedId(id);
    setSelectedLoading(true);
    clearTestState();
    try {
      const detail = await api.getWorkflow(id);
      const savedSig = defSignature(detail.definition);
      const draft = readDraft(draftKey(id));
      const restoredDef = draft?.definition ? ensureTriggerNode(draft.definition) : null;
      setSelected(detail);
      savedSigRef.current = savedSig;
      setSessionDef(restoredDef || ensureTriggerNode(detail.definition));
      setPositions(
        draft?.positions && Object.keys(draft.positions).length
          ? draft.positions
          : computeAutoLayout(ensureTriggerNode(detail.definition).nodes, ensureTriggerNode(detail.definition).edges),
      );
      setViewport(draft?.viewport || null);
      setMessages(draft?.messages && draft.messages.length ? draft.messages : [GREETING]);
      setAnimateToken(0);
      setAudience(detail.runs || undefined);
      setMobileTab("workflow");
    } catch {
      toast.error("Unable to open workflow.");
    } finally {
      setSelectedLoading(false);
    }
  };

  const refreshSelected = async (id?: string) => {
    const wid = id || selectedId;
    if (!wid) return;
    try {
      const [detail, list] = await Promise.all([api.getWorkflow(wid), api.listWorkflows()]);
      setSelected(detail);
      setWorkflows(list);
    } catch {
      /* keep previous state */
    }
  };

  const generateFromPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;
    setErrorBanner(null);
    setInput("");
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: trimmed, createdAt: new Date() };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "Drafting your workflow…", createdAt: new Date() },
    ]);
    setGenerating(true);
    try {
      const result = await api.generateWorkflow(trimmed);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: result.message || "Here's a draft for you." } : m,
        ),
      );
      if (!result.workflow) {
        setErrorBanner(result.message || "Tell me a bit more about the trigger and the action you want.");
        return;
      }
      setWorkflows((prev) => [result.workflow, ...prev.filter((w) => w.id !== result.workflow.id)]);
      setSelectedId(result.workflow.id);
      setSelected(result.workflow);
      savedSigRef.current = defSignature(result.workflow.definition);
      setSessionDef(ensureTriggerNode(result.workflow.definition));
      setPositions({});
      setViewport(null);
      setAnimateToken(Date.now());
      setAudience(result.workflow.runs || undefined);
      setCollapsed(true);
      setMobileTab("workflow");
      toast.success("Workflow draft ready");
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry, I couldn't generate that workflow. Try rephrasing or use a template." }
            : m,
        ),
      );
      setErrorBanner("Unable to generate workflow.");
    } finally {
      setGenerating(false);
    }
  };

  const sendEditInstruction = async (instruction: string) => {
    const trimmed = instruction.trim();
    if (!trimmed || generating || !selectedId) return;
    setInput("");
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: `Edit: ${trimmed}`, createdAt: new Date() };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "Applying changes…", createdAt: new Date() },
    ]);
    setGenerating(true);
    try {
      if (dirty && sessionDef) {
        const saved = await api.saveWorkflow(selectedId, sessionDef);
        savedSigRef.current = defSignature(saved.definition);
        setSelected(saved);
        setWorkflows((prev) => prev.map((w) => (w.id === saved.id ? saved : w)));
      }
      const result = await api.editWorkflow(selectedId, trimmed, {
        definition: sessionDef ?? undefined,
        context: sessionDef ? buildTestContext(sessionDef, nodeStatuses, testResult ?? undefined) : undefined,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: result.message || "Updated the workflow." } : m,
        ),
      );
      if (!result.workflow) {
        setErrorBanner(result.message || "Couldn't apply that change.");
        return;
      }
      setSelected(result.workflow);
      setWorkflows((prev) => prev.map((w) => (w.id === result.workflow.id ? result.workflow : w)));
      savedSigRef.current = defSignature(result.workflow.definition);
      setSessionDef(ensureTriggerNode(result.workflow.definition));
      setPositions({});
      setAnimateToken(Date.now());
      setMobileTab("workflow");
      toast.success("Workflow updated");
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: "Couldn't apply that change." } : m)),
      );
    } finally {
      setGenerating(false);
    }
  };

  const applyTemplate = async (templateId: string) => {
    setShowTemplatePicker(false);
    const tpl = templates.find((t) => t.id === templateId);
    try {
      const detail = await api.useWorkflowTemplate(templateId);
      setWorkflows((prev) => [detail, ...prev.filter((w) => w.id !== detail.id)]);
      setSelectedId(detail.id);
      setSelected(detail);
      savedSigRef.current = defSignature(detail.definition);
      setSessionDef(ensureTriggerNode(detail.definition));
      setPositions(computeAutoLayout(ensureTriggerNode(detail.definition).nodes, ensureTriggerNode(detail.definition).edges));
      setViewport(null);
      setAnimateToken(Date.now());
      setAudience(detail.runs || undefined);
      setCollapsed(true);
      setMobileTab("workflow");
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: `Loaded the ${tpl?.name || "template"}. Customize it from here.`, createdAt: new Date() },
      ]);
      toast.success("Template added as draft");
    } catch {
      toast.error("Unable to use template.");
    }
  };

  const handleCanvasChange = (def: WorkflowDefinition, pos: NodePositions) => {
    const prev = sessionDef;
    setSessionDef(def);
    setPositions(pos);
    if (!prev || !testDone || testing) return;
    const changed = changedNodes(prev, def);
    const edgesChanged = JSON.stringify(prev.edges) !== JSON.stringify(def.edges);
    if (!changed.length && !edgesChanged) return;
    const invalidated = new Set<string>(changed);
    if (edgesChanged) {
      for (const n of def.nodes) invalidated.add(n.id);
    } else {
      const adj = new Map<string, string[]>();
      for (const e of def.edges) {
        const list = adj.get(e.source) || [];
        list.push(e.target);
        adj.set(e.source, list);
      }
      const q = [...changed];
      while (q.length) {
        const id = q.shift()!;
        for (const t of adj.get(id) || []) {
          if (!invalidated.has(t)) {
            invalidated.add(t);
            q.push(t);
          }
        }
      }
    }
    setNodeStatuses((prevSt) => {
      const next = { ...prevSt };
      for (const id of invalidated) next[id] = { code: "IDLE" };
      return next;
    });
    setTestDone(false);
    setTestResult(null);
    testedSigRef.current = "";
  };

  const resetAll = () => {
    clearDraft(draftKey(null));
    setSelectedId(null);
    setSelected(null);
    setSessionDef(null);
    setPositions({});
    setViewport(null);
    setMessages([GREETING]);
    savedSigRef.current = "";
    setAnimateToken(0);
    setAudience(undefined);
    setActivateOpen(false);
    clearTestState();
    setCollapsed(true);
    setMobileTab("chat");
  };

  const newWorkflow = () => {
    if (dirty && sessionDef) {
      setShowNewConfirm(true);
    } else {
      resetAll();
    }
  };

  const handleActivateClick = () => {
    if (!selectedId) {
      toast.error("Describe a workflow to the AI or pick a template first.");
      return;
    }
    if (activationBlockers.length) {
      toast.error(activationBlockers[0]);
      return;
    }
    setAudience(selected?.runs ?? undefined);
    setActivateOpen(true);
  };

  const activate = async () => {
    if (!selectedId) return;
    setActing(true);
    try {
      if (dirty && sessionDef) {
        const saved = await api.saveWorkflow(selectedId, sessionDef);
        savedSigRef.current = defSignature(saved.definition);
        setSelected(saved);
        setWorkflows((prev) => prev.map((w) => (w.id === saved.id ? saved : w)));
      }
      const updated = await api.activateWorkflow(selectedId, audience);
      setSelected(updated);
      savedSigRef.current = defSignature(updated.definition);
      setSessionDef(ensureTriggerNode(updated.definition));
      setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setActivateOpen(false);
      toast.success(`"${updated.name}" is now live`);
    } catch (err: any) {
      const msg = err?.message || "Unable to activate workflow.";
      if (/plan|upgrade|growth|subscription/i.test(msg)) {
        toast.error("This workflow requires the Growth plan or above.");
      } else {
        toast.error(msg);
      }
    } finally {
      setActing(false);
    }
  };

  const setStatus = async (id: string, status: "PAUSED" | "ACTIVE") => {
    try {
      const updated = status === "PAUSED" ? await api.pauseWorkflow(id) : await api.resumeWorkflow(id);
      setWorkflows((prev) => prev.map((w) => (w.id === id ? updated : w)));
      if (selectedId === id) {
        setSelected(updated);
        savedSigRef.current = defSignature(updated.definition);
        setSessionDef(ensureTriggerNode(updated.definition));
      }
      toast.success(status === "PAUSED" ? "Workflow paused" : "Workflow resumed");
    } catch {
      toast.error("Unable to update workflow status.");
    }
  };

  const duplicate = async (id: string) => {
    try {
      const copy = await api.duplicateWorkflow(id);
      setWorkflows((prev) => [copy, ...prev]);
      toast.success("Duplicated");
    } catch {
      toast.error("Unable to duplicate.");
    }
  };

  const archive = async (id: string) => {
    try {
      await api.archiveWorkflow(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      if (selectedId === id) {
        clearDraft(draftKey(id));
        resetAll();
      }
      toast.success("Workflow archived");
    } catch {
      toast.error("Unable to archive.");
    }
  };

  const testWorkflow = async (id: string) => {
    if (!id) {
      toast.error("Describe a workflow to the AI or pick a template first.");
      return;
    }
    try {
      const res = await api.testWorkflow(id, "sample");
      toast.success(res.message || "Test passed");
    } catch {
      toast.error("Unable to run test.");
    }
  };

  // ── Test mode (step-by-step per-node validation) ──────────────────────────

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const statusFromResult = (s: "OK" | "ERROR" | "WARNING"): TestNodeState["code"] =>
    s === "OK" ? "SUCCESS" : s === "ERROR" ? "ERROR" : "WARNING";

  const summarize = (result: NonNullable<TestSummary["nodes"]>, states: TestNodeStates): TestSummary => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodes = result.map((n) => {
      const live = states[n.nodeKey];
      const code = live?.code || (n.status === "OK" ? "SUCCESS" : n.status === "ERROR" ? "ERROR" : "WARNING");
      if (code === "ERROR") errors.push(n.label);
      if (code === "WARNING") warnings.push(n.label);
      return {
        ...n,
        status: code === "SUCCESS" ? "OK" : code,
        summary: live?.summary || n.summary,
        checks: live?.checks || n.checks,
      } as NonNullable<TestSummary["nodes"]>[number];
    });
    const ok = errors.length === 0;
    const message = ok
      ? "All steps passed. The test is simulated — no real messages were sent."
      : `${errors.length} step${errors.length === 1 ? "" : "s"} need${errors.length === 1 ? "s" : ""} attention before this workflow can run.`;
    return {
      ok,
      errors: errors.length,
      warnings: warnings.length,
      message,
      simulated: true,
      testedAt: new Date().toISOString(),
      nodes,
    };
  };

  const pushTestChat = (summary: TestSummary) => {
    const lines = [
      `Test complete: ${summary.errors} error${summary.errors === 1 ? "" : "s"}, ${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}. ${summary.message}`,
    ];
    if (!summary.ok) {
      lines.push("Ask me to fix a failing step, or fix it directly and re-test.");
    }
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: "assistant", content: lines.join(" "), createdAt: new Date() },
    ]);
  };

  const runValidation = async (mode: "all" | "node" | "continue", nodeId?: string) => {
    if (!selectedId || !sessionDef || testing) return;
    setTesting(true);
    setErrorBanner(null);

    let result;
    try {
      result = await api.validateWorkflow(selectedId, sessionDef);
    } catch {
      setTesting(false);
      setTestProgress(null);
      toast.error("Unable to run the test. Please try again.");
      return;
    }

    const order = topologicalOrder(sessionDef.nodes, sessionDef.edges);
    const byKey = new Map(result.nodes.map((n) => [n.nodeKey, n]));

    let working: TestNodeStates;
    let startIndex = 0;
    if (mode === "all") {
      working = {};
    } else {
      const clearSet = new Set<string>();
      if (mode === "node" && nodeId) {
        const idx = order.indexOf(nodeId);
        if (idx >= 0) for (const id of order.slice(idx + 1)) clearSet.add(id);
        startIndex = idx >= 0 ? idx : 0;
      } else if (mode === "continue") {
        startIndex = order.findIndex((id) => {
          const st = nodeStatuses[id];
          return !st || st.code === "IDLE";
        });
        if (startIndex < 0) startIndex = order.length;
      }
      working = {};
      for (const k of Object.keys(nodeStatuses)) {
        if (!clearSet.has(k)) working[k] = nodeStatuses[k]!;
      }
    }

    const total = order.length;
    for (let i = startIndex; i < total; i++) {
      const id = order[i]!;
      setTestProgress({ step: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
      working[id] = { code: "TESTING" };
      setNodeStatuses({ ...working });
      await sleep(600);
      const res = byKey.get(id);
      if (!res) {
        working[id] = { code: "SUCCESS" };
        setNodeStatuses({ ...working });
        continue;
      }
      working[id] = {
        code: statusFromResult(res.status),
        summary: res.summary,
        checks: res.checks,
        action: res.action,
        testedAt: result.testedAt,
      };
      setNodeStatuses({ ...working });
      if (res.status === "ERROR" && !res.canContinue) {
        break;
      }
    }

    setTesting(false);
    setTestProgress(null);
    testedSigRef.current = defSignature(sessionDef);
    const summary = summarize(result.nodes, working);
    setTestResult(summary);
    setTestDone(true);
    pushTestChat(summary);
  };

  const changedNodes = (prev: WorkflowDefinition, next: WorkflowDefinition): string[] => {
    const key = (n: { id: string; type: string; label: string; config?: unknown; data?: unknown }) =>
      JSON.stringify([n.type, n.label, n.config, n.data]);
    const prevMap = new Map(prev.nodes.map((n) => [n.id, key(n)]));
    const nextMap = new Map(next.nodes.map((n) => [n.id, key(n)]));
    const changed: string[] = [];
    for (const [id, k] of nextMap) {
      if (!prevMap.has(id) || prevMap.get(id) !== k) changed.push(id);
    }
    for (const id of prevMap.keys()) if (!nextMap.has(id)) changed.push(id);
    return changed;
  };

  const clearTestState = () => {
    setNodeStatuses({});
    setTesting(false);
    setTestProgress(null);
    setTestResult(null);
    setTestDone(false);
    testedSigRef.current = "";
    setFocusNodeId(null);
  };

  const explain = async () => {
    if (!selectedId) {
      toast.error("Describe a workflow to the AI or pick a template first.");
      return;
    }
    setExplainOpen(true);
    setExplaining(true);
    setExplainText("");
    try {
      const res = await api.explainWorkflow(selectedId);
      setExplainText(res.summary);
    } catch {
      setExplainText("Unable to explain this workflow right now.");
    } finally {
      setExplaining(false);
    }
  };

  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidthRef.current;
    const onMove = (ev: MouseEvent) => {
      const w = Math.min(520, Math.max(320, startW + (ev.clientX - startX)));
      chatWidthRef.current = w;
      setChatWidth(w);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      try {
        window.localStorage.setItem(SPLIT_KEY, String(chatWidthRef.current));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const focusChat = () => {
    setCollapsed(true);
    setMobileTab("chat");
    window.setTimeout(() => chatInputRef.current?.focus(), 50);
  };

  const setCollapsed = (open: boolean) => {
    setChatCollapsed(!open);
    try {
      window.localStorage.setItem("doloyal.wf.chatCollapsed", open ? "0" : "1");
    } catch {
      /* ignore */
    }
  };

  const workflowName = selected?.name || "Untitled workflow";
  const status = selected?.status || "UNSAVED";
  const signatureStale = testDone && defSignature(sessionDef!) !== testedSigRef.current;
  const activationBlockers: string[] = [];
  if (status !== "DRAFT" && status !== "ERROR" && status !== "UNSAVED") {
    activationBlockers.push("Workflow is not a draft");
  }
  if (dirty) activationBlockers.push("Save your changes first");
  if (!testDone) activationBlockers.push("Run the test first");
  if (testDone && testResult && !testResult.ok) {
    activationBlockers.push("Fix the failing steps first");
  }
  if (signatureStale) activationBlockers.push("Workflow changed since the last test — re-test");
  const canActivate = Boolean(selectedId && sessionDef) && activationBlockers.length === 0;
  const activationHint = activationBlockers.join(" · ");

  const chatVisible = isMobile ? mobileTab === "chat" : !chatCollapsed;
  const canvasVisible = isMobile ? mobileTab === "workflow" : true;

  return (
    <div className="-m-4 flex min-h-[calc(100vh-3.5rem)] flex-col bg-white lg:-m-8">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[#111827]">AI Workflows</h1>
              <p className="text-xs text-[#6B7280]">Describe what you want to automate — we build it, you approve it.</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" className="h-9 gap-1.5" onClick={() => setShowTemplatePicker(true)}>
            <Wand2 className="h-3.5 w-3.5" />
            Templates
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={newWorkflow}>
            <Plus className="h-3.5 w-3.5" />
            New Workflow
          </Button>
        </div>
      </div>

      {errorBanner ? (
        <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 sm:mx-6">
          <div className="flex items-center gap-2 text-sm text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {errorBanner}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setErrorBanner(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {/* Builder */}
      <div
        className={cn(
          "flex flex-col",
          fullscreen
            ? "fixed inset-0 z-50 bg-white p-3 lg:p-4"
            : "h-[calc(100vh-13.5rem)] min-h-[560px] px-4 pb-4 sm:px-6 lg:h-[calc(100vh-11.5rem)]",
        )}
      >
        {isMobile ? (
          <div className="mb-3 flex shrink-0 gap-1 rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] p-1">
            {(
              [
                { key: "chat", label: "AI Chat", icon: MessageSquare },
                { key: "workflow", label: "Workflow", icon: GitBranch },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setMobileTab(t.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition",
                  mobileTab === t.key ? "bg-white text-[#6366F1] shadow-sm" : "text-[#6B7280]",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 gap-0">
          {/* Chat panel */}
          <div
            className={cn(
              "relative flex h-full shrink-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#FAFAFB]",
              fullscreen && !isMobile ? "absolute left-4 top-4 bottom-4 z-30" : "",
              isMobile && !chatVisible ? "hidden" : "",
            )}
            style={
              !isMobile
                ? {
                    width: chatCollapsed ? 0 : chatWidth,
                    minWidth: chatCollapsed ? 0 : chatWidth,
                    opacity: chatCollapsed ? 0 : 1,
                    transition: "width 260ms ease-in-out, opacity 200ms ease",
                  }
                : undefined
            }
          >
            <div
              className={cn("flex h-full flex-col overflow-hidden", isMobile ? "w-full" : "")}
              style={!isMobile ? { minWidth: chatWidth } : undefined}
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#111827]">Workflow Builder</span>
                </div>
                <div className="flex items-center gap-1">
                  {!isMobile ? (
                    <button
                      type="button"
                      onClick={() => setCollapsed(false)}
                      className="rounded-lg p-1.5 text-[#9CA3AF] transition hover:bg-slate-100 hover:text-[#111827]"
                      title="Hide AI panel"
                      aria-label="Hide AI panel"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                        m.role === "user"
                          ? "bg-[#6366F1] text-white"
                          : "border border-[#E5E7EB] bg-white text-[#111827]",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {generating ? (
                  <div className="flex items-center gap-2 pl-1 text-xs text-[#6B7280]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6366F1]" />
                    Working…
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[#E5E7EB] p-3">
                {!messages.some((m) => m.role === "user") ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void generateFromPrompt(s)}
                        disabled={generating}
                        className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11.5px] text-[#374151] transition hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-sm">
                  <input
                    ref={chatInputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (selectedId) void sendEditInstruction(input);
                        else void generateFromPrompt(input);
                      }
                    }}
                    placeholder={selectedId ? "Ask for a change… (e.g. use email instead)" : "Describe your workflow…"}
                    className="min-w-0 flex-1 bg-transparent text-[14px] text-[#111827] outline-none placeholder:text-[#9CA3AF]"
                  />
                  <button
                    type="button"
                    disabled={!input.trim() || generating}
                    onClick={() => {
                      if (selectedId) void sendEditInstruction(input);
                      else void generateFromPrompt(input);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#6366F1] text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 px-1 text-center text-[10px] text-[#9CA3AF]">
                  Nothing is sent to customers until you activate the workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Resizer */}
          {!isMobile && !chatCollapsed ? (
            <div
              onMouseDown={startResize}
              className="w-2 shrink-0 cursor-col-resize self-stretch"
              title="Drag to resize"
              aria-label="Drag to resize"
            />
          ) : null}

          {/* Canvas */}
          <div
            className={cn(
              "relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white",
              isMobile ? "w-full" : "h-full",
              chatVisible && !isMobile ? "" : "ml-0",
            )}
          >
            <WorkflowCanvas
              definition={sessionDef}
              positions={positions}
              viewport={viewport}
              viewportKey={selectedId || "fresh"}
              status={status}
              workflowName={workflowName}
              onNameChange={(name) => {
                if (selected) {
                  setSelected({ ...selected, name });
                }
                if (sessionDef) {
                  setSessionDef({ ...sessionDef, name });
                }
              }}
              dirty={dirty}
              canActivate={canActivate}
              activationHint={activationHint}
              nodeStatuses={nodeStatuses}
              testing={testing}
              testProgress={testProgress}
              testDone={testDone}
              testOk={testResult?.ok ?? false}
              testResult={testResult}
              focusNodeId={focusNodeId}
              animateToken={animateToken}
              catalog={catalog}
              fullscreen={fullscreen}
              onDefinitionChange={handleCanvasChange}
              onViewportChange={(vp) => setViewport(vp)}
              onToggleFullscreen={() => setFullscreen((v) => !v)}
              onExplain={() => void explain()}
              onTest={() => void runValidation("all")}
              onActivate={handleActivateClick}
              onPauseResume={() => void setStatus(selectedId || "", status === "PAUSED" ? "ACTIVE" : "PAUSED")}
              onFocusNodeHandled={() => setFocusNodeId(null)}
              onFixNode={(id) => setFocusNodeId(id)}
              onRetestNode={(id) => void runValidation("node", id)}
              onRetestAll={() => void runValidation("all")}
              onContinueTest={() => void runValidation("continue")}
              onActivateFromReady={handleActivateClick}
              onConnectIntegration={(action) => {
                if (action.kind !== "connect_integration") return;
                toast.info(`Connecting ${action.label}…`);
                router.push(action.url);
              }}
              onUpgradePlan={() => router.push("/app/billing")}
            />

            {selectedLoading ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60">
                <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
              </div>
            ) : null}

            {!sessionDef ? (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
                style={{
                  backgroundImage: "radial-gradient(#E5E7EB 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                <div className="pointer-events-auto flex flex-col items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/10 text-[#6366F1]">
                    <WorkflowIcon />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-[#111827]">Build your workflow</h2>
                  <p className="mt-1 max-w-sm text-sm text-[#6B7280]">
                    Ask the AI on the left, or start from a template. Your workflow appears here as a visual flow.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={focusChat}>
                      <Sparkles className="h-3.5 w-3.5" />
                      Describe a workflow
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowTemplatePicker(true)}>
                      <Wand2 className="h-3.5 w-3.5" />
                      Browse templates
                    </Button>
                  </div>
                  <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-left">
                    {[
                      { icon: Zap, title: "Trigger", desc: "Any event or schedule" },
                      { icon: GitBranch, title: "Conditions", desc: "Target the right customers" },
                      { icon: MessageSquare, title: "Actions", desc: "Message, reward, tag, wait" },
                    ].map((f) => (
                      <div key={f.title} className="pointer-events-auto rounded-2xl border border-[#E5E7EB] bg-white/80 p-3 backdrop-blur">
                        <f.icon className="h-4 w-4 text-[#6366F1]" />
                        <p className="mt-2 text-xs font-semibold text-[#111827]">{f.title}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280]">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {!isMobile && chatCollapsed ? (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="absolute left-3 top-3 z-20 flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white/95 px-3 text-[12.5px] font-medium text-[#111827] shadow-sm backdrop-blur transition hover:border-[#6366F1]/40"
              >
                <PanelLeftOpen className="h-4 w-4 text-[#6366F1]" />
                Open AI
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Your workflows */}
      <div className="px-4 pb-8 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111827]">Your workflows</h2>
          {workflows.length > 0 ? (
            <span className="text-xs text-[#6B7280]">{workflows.filter((w) => w.status === "ACTIVE").length} active</span>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-[#E5E7EB] bg-slate-50" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] px-6 py-12 text-center">
            <p className="text-sm text-[#6B7280]">No workflows yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workflows.map((w) => {
              const st = STATUS_STYLES[w.status] || STATUS_STYLES.DRAFT;
              return (
                <div
                  key={w.id}
                  className={cn(
                    "group cursor-pointer rounded-2xl border bg-white p-4 transition hover:border-[#6366F1]/40 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]",
                    selectedId === w.id ? "border-[#6366F1] ring-2 ring-[#6366F1]/15" : "border-[#E5E7EB]",
                  )}
                  onClick={() => void openWorkflow(w.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={cn("h-2 w-2 shrink-0 rounded-full", st.dot)} />
                      <p className="truncate text-[13.5px] font-semibold text-[#111827]">{w.name}</p>
                    </div>
                    <Badge className={cn("shrink-0 border", st.className)}>{st.label}</Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-[12px] text-[#6B7280]">
                    {w.description || "Automation workflow"}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                    <Zap className="h-3 w-3 text-indigo-500" />
                    <span className="truncate">{triggerLabel(w.trigger)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#F1F5F9] pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Runs</p>
                      <p className="text-[13px] font-semibold text-[#111827]">{w.runs ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Success</p>
                      <p className="text-[13px] font-semibold text-[#111827]">{w.successRate ?? 100}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Messages</p>
                      <p className="text-[13px] font-semibold text-[#111827]">{w.messagesSent ?? 0}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    {w.status === "ACTIVE" ? (
                      <IconAction label="Pause" onClick={() => void setStatus(w.id, "PAUSED")}>
                        <Pause className="h-3.5 w-3.5" />
                      </IconAction>
                    ) : w.status === "PAUSED" ? (
                      <IconAction label="Resume" onClick={() => void setStatus(w.id, "ACTIVE")}>
                        <Play className="h-3.5 w-3.5" />
                      </IconAction>
                    ) : (
                      <IconAction
                        label="Activate"
                        onClick={() => {
                          setSelectedId(w.id);
                          setSelected(null);
                          void openWorkflow(w.id).then(() => setActivateOpen(true));
                        }}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </IconAction>
                    )}
                    <IconAction label="Duplicate" onClick={() => void duplicate(w.id)}>
                      <Copy className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction label="Archive" onClick={() => void archive(w.id)}>
                      <Archive className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction label="Delete" onClick={() => {
                      if (window.confirm(`Delete "${w.name}" permanently?`)) {
                        void archive(w.id);
                        toast.success("Workflow deleted");
                      }
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </IconAction>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New workflow confirm */}
      <Dialog open={showNewConfirm} onOpenChange={setShowNewConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved edits on the current workflow. Starting a new one will discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowNewConfirm(false)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                setShowNewConfirm(false);
                resetAll();
              }}
            >
              Discard &amp; start new
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate dialog */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activate &ldquo;{selected?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              Once active, this workflow runs automatically for matching customers. You can pause it anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFB] p-3">
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              <Users className="h-3.5 w-3.5" />
              Estimated audience now:
              <span className="font-semibold text-[#111827]">{audience ?? "—"} customers</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-xs text-[#6B7280]">
              <TrendingUp className="h-3.5 w-3.5" />
              Trigger: <span className="font-medium text-[#111827]">{selected ? triggerLabel(selected.trigger) : "—"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setActivateOpen(false)} disabled={acting}>
              Not yet
            </Button>
            <Button onClick={() => void activate()} disabled={acting} className="gap-2">
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Activate workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Explain dialog */}
      <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How this workflow works</DialogTitle>
            <DialogDescription>Here is a plain-language summary of the automation.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFB] p-4">
            {explaining ? (
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin text-[#6366F1]" />
                Explaining…
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed text-[#111827]">{explainText}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setExplainOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates dialog */}
      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start from a template</DialogTitle>
            <DialogDescription>Pick a proven automation, then customize it with the AI.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#6B7280]">No templates available.</p>
            ) : (
              templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void applyTemplate(t.id)}
                  className="flex w-full items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3 text-left transition hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
                    <Wand2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#111827]">{t.name}</p>
                      <Badge className="shrink-0 border-slate-200 bg-slate-50 text-slate-600">{t.category}</Badge>
                    </div>
                    {t.description ? (
                      <p className="mt-0.5 text-[12px] text-[#6B7280]">{t.description}</p>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <path d="M21 11V9a2 2 0 0 0-2-2h-5" />
      <path d="M3 13v2a2 2 0 0 0 2 2h5" />
      <path d="M9 6h5a2 2 0 0 1 2 2v5" />
    </svg>
  );
}