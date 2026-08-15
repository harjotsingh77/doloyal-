"use client";

import * as React from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Handle,
  Position,
  Panel,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useViewport,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type NodeProps,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  type IsValidConnection,
  type OnNodeDrag,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Zap,
  MessageSquare,
  GitBranch,
  Timer,
  Flag,
  Gift,
  Sparkles,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Scan,
  RotateCcw,
  LayoutGrid,
  Trash2,
  Undo2,
  Redo2,
  X,
  AlignHorizontalDistributeCenter,
  HelpCircle,
  Play,
  Pause,
  Check,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import type {
  WorkflowDefinition,
  WorkflowNodeDef,
  WorkflowEdgeDef,
  WorkflowTriggerDef,
  WorkflowStatus,
  WorkflowCapabilityCatalog,
} from "@doloyal/shared";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Badge, cn } from "@doloyal/ui";
import {
  NODE_W,
  nodeSummary,
  triggerLabel,
  defSignature,
  computeAutoLayout,
  triggerFromNode,
  type NodePositions,
} from "./workflow-graph";
import type { TestNodeState, TestNodeStates, TestProgress, TestSummary } from "@/lib/workflows";
import { STATUS_META } from "@/lib/workflows";

// ─── Node accents ────────────────────────────────────────────────────────────

type Accent = {
  kind: string;
  icon: React.ComponentType<{ className?: string }>;
  chip: string;
  iconColor: string;
  border: string;
  handle: string;
  dot: string;
};

const ACCENTS: Record<string, Accent> = {
  trigger: {
    kind: "Trigger",
    icon: Zap,
    chip: "bg-indigo-50",
    iconColor: "text-indigo-600",
    border: "border-indigo-100",
    handle: "!border-white !bg-indigo-400",
    dot: "#6366F1",
  },
  action: {
    kind: "Action",
    icon: MessageSquare,
    chip: "bg-violet-50",
    iconColor: "text-violet-600",
    border: "border-violet-100",
    handle: "!border-white !bg-violet-400",
    dot: "#8B5CF6",
  },
  reward: {
    kind: "Reward",
    icon: Gift,
    chip: "bg-emerald-50",
    iconColor: "text-emerald-600",
    border: "border-emerald-100",
    handle: "!border-white !bg-emerald-400",
    dot: "#10B981",
  },
  condition: {
    kind: "Condition",
    icon: GitBranch,
    chip: "bg-amber-50",
    iconColor: "text-amber-600",
    border: "border-amber-100",
    handle: "!border-white !bg-amber-400",
    dot: "#F59E0B",
  },
  delay: {
    kind: "Wait",
    icon: Timer,
    chip: "bg-slate-100",
    iconColor: "text-slate-500",
    border: "border-slate-200",
    handle: "!border-white !bg-slate-400",
    dot: "#94A3B8",
  },
  end: {
    kind: "End",
    icon: Flag,
    chip: "bg-slate-50",
    iconColor: "text-slate-400",
    border: "border-slate-200",
    handle: "!border-white !bg-slate-300",
    dot: "#CBD5E1",
  },
};

function accentFor(node: WorkflowNodeDef): Accent {
  if (node.type === "action") {
    const t = String((node.config || {}).type || (node.data || {}).type || "");
    if (t === "create_reward") return ACCENTS.reward;
    return ACCENTS.action;
  }
  return ACCENTS[node.type] || ACCENTS.action;
}

// ─── Custom node ─────────────────────────────────────────────────────────────

function WorkflowNodeView({ id, data, selected, dragging }: NodeProps) {
  const def = data.def as WorkflowNodeDef;
  const summary = data.summary as string;
  const hidden = data.hidden as boolean;
  const status = data.status as TestNodeState | undefined;
  const accent = accentFor(def);
  const Icon = accent.icon;
  const isFork = def.type === "condition" || def.type === "branch";
  const st = status?.code;
  const statusMeta = st && st !== "IDLE" ? STATUS_META[st] : null;

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all duration-200",
        st && st !== "IDLE" ? statusMeta!.className : accent.border,
        statusMeta?.ring,
        st === "TESTING" && "animate-pulse",
        hidden && "scale-95 opacity-0",
        selected && "border-[#6366F1] shadow-[0_4px_16px_rgba(99,102,241,0.2)] ring-2 ring-[#6366F1]/20",
        dragging && "shadow-[0_8px_24px_rgba(15,23,42,0.14)]",
      )}
      style={{ width: NODE_W }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn("!h-2.5 !w-2.5", accent.handle)}
      />
      <div className="flex items-center gap-2.5">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", accent.chip)}>
          <Icon className={cn("h-4 w-4", accent.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
            {accent.kind}
          </p>
          <p className="truncate text-[13px] font-semibold leading-tight text-[#111827]">
            {def.label}
          </p>
        </div>
        {st && st !== "IDLE" ? (
          <span
            title={statusMeta?.label}
            aria-label={statusMeta?.label}
            className={cn(
              "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
              st === "SUCCESS" && "bg-emerald-100 text-emerald-600",
              st === "ERROR" && "bg-rose-100 text-rose-600",
              st === "WARNING" && "bg-amber-100 text-amber-600",
              st === "TESTING" && "bg-sky-100 text-sky-600",
            )}
          >
            {st === "TESTING" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : st === "SUCCESS" ? (
              <Check className="h-3 w-3" />
            ) : st === "ERROR" ? (
              <X className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
          </span>
        ) : null}
      </div>
      {summary ? (
        <p
          className={cn(
            "mt-1.5 line-clamp-2 text-[11px] leading-snug",
            st === "ERROR" ? "text-rose-600" : st === "WARNING" ? "text-amber-600" : "text-[#6B7280]",
          )}
        >
          {st === "ERROR" && status?.summary ? status.summary : summary}
        </p>
      ) : null}
      {isFork ? (
        <>
          <Handle
            id="out-true"
            type="source"
            position={Position.Right}
            className={cn("!h-2.5 !w-2.5", accent.handle)}
            style={{ top: "38%" }}
          />
          <Handle
            id="out-false"
            type="source"
            position={Position.Right}
            className={cn("!h-2.5 !w-2.5", accent.handle)}
            style={{ top: "78%" }}
          />
          <div className="pointer-events-none absolute -right-[38px] top-[30%] text-[9px] font-semibold text-emerald-500">
            Yes
          </div>
          <div className="pointer-events-none absolute -right-[38px] top-[72%] text-[9px] font-semibold text-rose-400">
            No
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className={cn("!h-2.5 !w-2.5", accent.handle)}
        />
      )}
      {selected ? (
        <div className="pointer-events-none absolute -top-7 right-0 flex items-center gap-1 rounded-md bg-[#111827] px-1.5 py-1 text-[9px] font-medium text-white shadow-sm">
          <span className="text-[#9CA3AF]">Click to edit</span>
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  trigger: WorkflowNodeView,
  action: WorkflowNodeView,
  condition: WorkflowNodeView,
  delay: WorkflowNodeView,
  branch: WorkflowNodeView,
  end: WorkflowNodeView,
};

// ─── Mapping helpers ─────────────────────────────────────────────────────────

type FlowData = { def: WorkflowNodeDef; summary: string; hidden?: boolean; status?: TestNodeState };

function definitionToFlow(def: WorkflowDefinition, positions: NodePositions, hiddenIds: Set<string>, statuses: TestNodeStates = {}) {
  const nodes: FlowNode[] = def.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: positions[n.id] || { x: 0, y: 0 },
    data: { def: n, summary: nodeSummary(n), hidden: hiddenIds.has(n.id), status: statuses[n.id] } as FlowData,
  }));
  const edges: FlowEdge[] = def.edges.map((e, i) => {
    const outcome = e.outcome ?? null;
    const bothVisible = !hiddenIds.has(e.source) && !hiddenIds.has(e.target);
    return {
      id: `e-${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      sourceHandle: outcome === "true" ? "out-true" : outcome === "false" ? "out-false" : undefined,
      type: "smoothstep",
      hidden: !bothVisible,
      animated: false,
      data: { outcome },
      ...(outcome
        ? {
            label: outcome === "true" ? "Yes" : "No",
            labelStyle: { fill: "#6B7280", fontWeight: 600, fontSize: 10 },
            labelBgStyle: { fill: "#FFFFFF", fillOpacity: 0.9 },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 6,
          }
        : {}),
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#B7BCC7" },
      style: { stroke: "#C6CBD6", strokeWidth: 1.6 },
    };
  });
  return { nodes, edges };
}

function flowToDefinition(
  nodes: FlowNode[],
  edges: FlowEdge[],
  meta: { name: string; description?: string; fallbackTrigger: WorkflowTriggerDef },
): WorkflowDefinition {
  const triggerNode = nodes.find((n) => n.type === "trigger")?.data as FlowData | undefined;
  const trigger = triggerFromNode(triggerNode?.def, meta.fallbackTrigger);
  const defNodes: WorkflowNodeDef[] = nodes.map((n) => {
    const d = (n.data as FlowData).def;
    return { id: n.id, type: n.type as WorkflowNodeDef["type"], label: d.label, config: d.config, data: d.data };
  });
  const defEdges: WorkflowEdgeDef[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    outcome: (e.data?.outcome as string | null) ?? null,
  }));
  return {
    name: meta.name,
    description: meta.description,
    trigger,
    nodes: defNodes,
    edges: defEdges,
  };
}

// ─── Connection validation ───────────────────────────────────────────────────

function buildIsValidConnection(getNodes: () => FlowNode[], getEdges: () => FlowEdge[]): IsValidConnection {
  return (conn) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return false;
    const nodes = getNodes();
    const edges = getEdges();
    const src = nodes.find((n) => n.id === conn.source);
    const tgt = nodes.find((n) => n.id === conn.target);
    if (!src || !tgt) return false;
    if (tgt.type === "trigger") return false;
    if (src.type === "end") return false;
    const isFork = src.type === "condition" || src.type === "branch";
    if (isFork && !conn.sourceHandle) return false;
    if (!isFork && conn.sourceHandle) return false;
    if (edges.some((e) => e.source === conn.source && e.target === conn.target)) return false;
    return true;
  };
}

// ─── Canvas inner (has access to useReactFlow) ───────────────────────────────

export type WorkflowCanvasProps = {
  definition: WorkflowDefinition | null;
  positions: NodePositions;
  viewport: Viewport | null;
  viewportKey: string;
  status: WorkflowStatus | "UNSAVED";
  workflowName: string;
  onNameChange?: (name: string) => void;
  dirty: boolean;
  canActivate: boolean;
  activationHint?: string;
  animateToken: number;
  catalog: WorkflowCapabilityCatalog | null;
  fullscreen: boolean;
  nodeStatuses?: TestNodeStates;
  testing?: boolean;
  testProgress?: TestProgress | null;
  testDone?: boolean;
  testOk?: boolean;
  testResult?: TestSummary | null;
  focusNodeId?: string | null;
  onDefinitionChange: (def: WorkflowDefinition, positions: NodePositions) => void;
  onViewportChange: (vp: Viewport) => void;
  onToggleFullscreen: () => void;
  onExplain: () => void;
  onTest: () => void;
  onActivate: () => void;
  onPauseResume: () => void;
  onFocusNodeHandled?: () => void;
  onFixNode?: (id: string) => void;
  onRetestNode?: (id: string) => void;
  onRetestAll?: () => void;
  onContinueTest?: () => void;
  onActivateFromReady?: () => void;
  onConnectIntegration?: (action: NonNullable<TestNodeState["action"]>) => void;
  onUpgradePlan?: () => void;
};

const EDGE_ANIM_DURATION = 380;

function CanvasInner(props: WorkflowCanvasProps) {
  const {
    definition,
    positions,
    viewport,
    viewportKey,
    status,
    workflowName,
    onNameChange,
    dirty,
    canActivate,
    activationHint,
    animateToken,
    catalog,
    fullscreen,
    nodeStatuses,
    testing,
    testProgress,
    testDone,
    testOk,
    testResult,
    focusNodeId,
    onDefinitionChange,
    onViewportChange,
    onToggleFullscreen,
    onExplain,
    onTest,
    onActivate,
    onPauseResume,
    onFocusNodeHandled,
    onFixNode,
    onRetestNode,
    onRetestAll,
    onContinueTest,
    onActivateFromReady,
    onConnectIntegration,
    onUpgradePlan,
  } = props;

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChangeRaw] = useEdgesState<FlowEdge>([]);
  const { fitView, zoomIn, zoomOut, setViewport, screenToFlowPosition } = useReactFlow();

  const [showGrid, setShowGrid] = React.useState(true);
  const [selectedNode, setSelectedNode] = React.useState<FlowNode | null>(null);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [keyboardEnabled, setKeyboardEnabled] = React.useState(true);
  const [building, setBuilding] = React.useState(false);
  const [badgeCollapsed, setBadgeCollapsed] = React.useState(false);
  const [miniMapCollapsed, setMiniMapCollapsed] = React.useState(false);

  const appliedSigRef = React.useRef("");
  const lastTokenRef = React.useRef(0);
  const posMapRef = React.useRef<NodePositions>({ ...positions });
  const defRef = React.useRef<WorkflowDefinition | null>(definition);
  defRef.current = definition;
  const statusRef = React.useRef<TestNodeStates>(nodeStatuses || {});
  statusRef.current = nodeStatuses || {};
  const nodesRef = React.useRef<FlowNode[]>(nodes);
  nodesRef.current = nodes;
  const edgesRef = React.useRef<FlowEdge[]>(edges);
  edgesRef.current = edges;
  const revealTimersRef = React.useRef<ReturnType<typeof setInterval>[]>([]);

  const historyRef = React.useRef<{ past: { n: FlowNode[]; e: FlowEdge[] }[]; future: { n: FlowNode[]; e: FlowEdge[] }[] }>({
    past: [],
    future: [],
  });

  // ── Emit definition back to the parent ────────────────────────────────────
  const emitDefinition = React.useCallback(
    (ns: FlowNode[], es: FlowEdge[]) => {
      const meta = {
        name: defRef.current?.name || workflowName || "Untitled workflow",
        description: defRef.current?.description,
        fallbackTrigger: defRef.current?.trigger || { type: "customer_created", config: {} },
      };
      const def = flowToDefinition(ns, es, meta);
      const posMap: NodePositions = {};
      for (const n of ns) posMap[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
      posMapRef.current = posMap;
      appliedSigRef.current = defSignature(def);
      onDefinitionChange(def, posMap);
    },
    [workflowName, onDefinitionChange],
  );

  // ── Apply a definition from the parent (AI / open / template) ─────────────
  const applyDefinition = React.useCallback(
    (def: WorkflowDefinition, animate: boolean) => {
      const orderIds = def.nodes.map((n) => n.id);
      const newIds = new Set(orderIds);
      const prevIds = new Set(nodesRef.current.map((n) => n.id));
      const brandNew = orderIds.filter((id) => !prevIds.has(id));

      const mergedPositions: NodePositions = { ...posMapRef.current };
      const layout = computeAutoLayout(def.nodes, def.edges);
      let needsLayout = false;
      for (const id of orderIds) {
        if (!mergedPositions[id]) {
          mergedPositions[id] = layout[id] || { x: 0, y: 0 };
          needsLayout = true;
        }
      }
      if (needsLayout) posMapRef.current = mergedPositions;

      if (animate) {
        const allNew = orderIds.filter((id) => brandNew.includes(id));
        const revealSet = new Set<string>(allNew);
        const { nodes: fn, edges: fe } = definitionToFlow(def, mergedPositions, revealSet, statusRef.current);
        setNodes(fn);
        setEdges(fe);
        setBuilding(true);
        const interval = setInterval(() => {
          if (!revealSet.size) {
            clearInterval(interval);
            setBuilding(false);
            setNodes((cur) => cur.map((n) => ({ ...n, data: { ...n.data, hidden: false } })));
            setEdges((cur) => cur.map((e) => ({ ...e, hidden: false })));
            fitView({ padding: 0.14, duration: 450 });
            return;
          }
          const toReveal = [...revealSet].slice(0, 2);
          toReveal.forEach((id) => revealSet.delete(id));
          setNodes((cur) =>
            cur.map((n) =>
              toReveal.includes(n.id) ? { ...n, data: { ...n.data, hidden: false } } : n,
            ),
          );
          setEdges((cur) =>
            cur.map((e) =>
              !e.hidden && (!revealSet.has(e.source) && !revealSet.has(e.target)) ? e : { ...e, hidden: false },
            ),
          );
        }, EDGE_ANIM_DURATION);
        revealTimersRef.current.push(interval);
      } else {
        const { nodes: fn, edges: fe } = definitionToFlow(def, mergedPositions, new Set(), statusRef.current);
        setNodes(fn);
        setEdges(fe);
      }

      if (needsLayout) emitDefinition(def.nodes.map((n) => ({
        id: n.id, type: n.type, position: mergedPositions[n.id] || { x: 0, y: 0 },
        data: { def: n, summary: nodeSummary(n) },
      })) as FlowNode[], def.edges.map((e, i) => ({
        id: `e-${e.source}-${e.target}-${i}`, source: e.source, target: e.target,
        sourceHandle: e.outcome === "true" ? "out-true" : e.outcome === "false" ? "out-false" : undefined,
        type: "smoothstep", hidden: false, animated: false, data: { outcome: e.outcome ?? null },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#B7BCC7" },
        style: { stroke: "#C6CBD6", strokeWidth: 1.6 },
      })) as FlowEdge[]);
    },
    [fitView, setNodes, setEdges, emitDefinition],
  );

  // React to a new definition coming from the parent.
  React.useEffect(() => {
    if (!definition) {
      appliedSigRef.current = "";
      setNodes([]);
      setEdges([]);
      return;
    }
    const sig = defSignature(definition);
    if (sig === appliedSigRef.current) return;
    const animate = lastTokenRef.current !== animateToken;
    lastTokenRef.current = animateToken;
    if (animate) historyRef.current.past.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
    appliedSigRef.current = sig;
    applyDefinition(definition, animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, animateToken]);

  // Restore saved viewport (or fit) whenever the workflow session changes.
  React.useEffect(() => {
    if (viewport) {
      setViewport(viewport);
    } else {
      requestAnimationFrame(() => fitView({ padding: 0.14, duration: 350 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportKey]);

  // Surface node test statuses onto the rendered nodes.
  React.useEffect(() => {
    const statuses = nodeStatuses || {};
    setNodes((cur) =>
      cur.map((n) => {
        const d = n.data as FlowData;
        const st = statuses[n.id];
        if (!st && !d.status) return n;
        return { ...n, data: { ...d, status: st || undefined } };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeStatuses]);

  // Open the config panel for a requested node (Fix Node / focus).
  React.useEffect(() => {
    if (!focusNodeId) return;
    const target = nodesRef.current.find((n) => n.id === focusNodeId);
    if (target) {
      setSelectedNode(target);
      setConfigOpen(true);
    }
    onFocusNodeHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId]);

  // Cleanup timers on unmount.
  React.useEffect(() => {
    const timers = revealTimersRef.current;
    return () => timers.forEach(clearInterval);
  }, []);

  // ── Change handlers ───────────────────────────────────────────────────────
  const onNodesChange: OnNodesChange = React.useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);

  const onEdgesChange: OnEdgesChange = React.useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const handleConnect: OnConnect = React.useCallback(
    (connection: Connection) => {
      const outcome = connection.sourceHandle === "out-true" ? "true" : connection.sourceHandle === "out-false" ? "false" : null;
      const edge: FlowEdge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle ?? undefined,
        type: "smoothstep",
        data: { outcome },
        ...(outcome
          ? {
              label: outcome === "true" ? "Yes" : "No",
              labelStyle: { fill: "#6B7280", fontWeight: 600, fontSize: 10 },
              labelBgStyle: { fill: "#FFFFFF", fillOpacity: 0.9 },
              labelBgPadding: [4, 2] as [number, number],
              labelBgBorderRadius: 6,
            }
          : {}),
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#B7BCC7" },
        style: { stroke: "#C6CBD6", strokeWidth: 1.6 },
      };
      setEdges((eds) => addEdge(edge, eds));
      historyRef.current.past.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
      historyRef.current.future = [];
      emitDefinition(nodesRef.current, [...edgesRef.current, edge]);
    },
    [setEdges, emitDefinition],
  );

  const onNodeDragStop = React.useCallback<OnNodeDrag<FlowNode>>(
    (event, node) => {
      historyRef.current.past.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
      historyRef.current.future = [];
      emitDefinition(nodesRef.current, edgesRef.current);
      void event;
      void node;
    },
    [emitDefinition],
  );

  const onNodesDelete = React.useCallback(
    (deleted: FlowNode[]) => {
      if (!deleted.length) return;
      historyRef.current.past.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
      historyRef.current.future = [];
      if (selectedNode && deleted.some((d) => d.id === selectedNode.id)) {
        setSelectedNode(null);
        setConfigOpen(false);
      }
      emitDefinition(nodesRef.current.filter((n) => !deleted.some((d) => d.id === n.id)), edgesRef.current.filter((e) => !deleted.some((d) => d.id === e.source) && !deleted.some((d) => d.id === e.target)));
    },
    [emitDefinition, selectedNode],
  );

  const onEdgesDelete = React.useCallback(
    (deleted: FlowEdge[]) => {
      if (!deleted.length) return;
      historyRef.current.past.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
      historyRef.current.future = [];
      emitDefinition(nodesRef.current, edgesRef.current.filter((e) => !deleted.some((d) => d.id === e.id)));
    },
    [emitDefinition],
  );

  const onSelectionChange = React.useCallback(({ nodes: sel }: { nodes: FlowNode[] }) => {
    const n = sel[0] || null;
    setSelectedNode(n);
    if (n) setConfigOpen(true);
  }, []);

  const isValidConnection = React.useMemo(
    () => buildIsValidConnection(() => nodesRef.current, () => edgesRef.current),
    [],
  );

  // ── Undo / redo / delete keyboard ─────────────────────────────────────────
  const undo = React.useCallback(() => {
    const h = historyRef.current;
    if (!h.past.length) return;
    const prev = h.past.pop()!;
    h.future.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
    setNodes(prev.n);
    setEdges(prev.e);
    emitDefinition(prev.n, prev.e);
  }, [setNodes, setEdges, emitDefinition]);

  const redo = React.useCallback(() => {
    const h = historyRef.current;
    if (!h.future.length) return;
    const next = h.future.pop()!;
    h.past.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
    setNodes(next.n);
    setEdges(next.e);
    emitDefinition(next.n, next.e);
  }, [setNodes, setEdges, emitDefinition]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const onFocusCapture = () => setKeyboardEnabled(false);
  const onBlurCapture = () => setKeyboardEnabled(true);

  // ── Toolbar actions ───────────────────────────────────────────────────────
  const handleAutoArrange = React.useCallback(() => {
    const def = defRef.current;
    if (!def) return;
    historyRef.current.past.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
    historyRef.current.future = [];
    const layout = computeAutoLayout(def.nodes, def.edges);
    setNodes((cur) => cur.map((n) => ({ ...n, position: layout[n.id] || n.position })));
    emitDefinition(nodesRef.current.map((n) => ({ ...n, position: layout[n.id] || n.position })), edgesRef.current);
    requestAnimationFrame(() => fitView({ padding: 0.14, duration: 500 }));
  }, [setNodes, emitDefinition, fitView]);

  const handleAddNode = React.useCallback(
    (def: WorkflowNodeDef) => {
      const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      const id = `${def.type}_${Date.now().toString(36)}`;
      const node: WorkflowNodeDef = { ...def, id, label: def.label || def.type };
      const flowNode: FlowNode = {
        id,
        type: node.type,
        position: { x: center.x - NODE_W / 2, y: center.y - 30 },
        data: { def: node, summary: nodeSummary(node) } as FlowData,
      };
      historyRef.current.past.push({ n: nodesRef.current.map((n) => JSON.parse(JSON.stringify(n))), e: edgesRef.current.map((e) => JSON.parse(JSON.stringify(e))) });
      historyRef.current.future = [];
      setNodes((cur) => [...cur, flowNode]);
      emitDefinition([...nodesRef.current, flowNode], edgesRef.current);
      setAddOpen(false);
    },
    [screenToFlowPosition, setNodes, emitDefinition],
  );

  // ── Node config editing ───────────────────────────────────────────────────
  const updateNodeConfig = React.useCallback(
    (id: string, patch: Partial<WorkflowNodeDef>) => {
      setNodes((cur) =>
        cur.map((n) => {
          if (n.id !== id) return n;
          const d = (n.data as FlowData).def;
          const updated: WorkflowNodeDef = { ...d, ...patch };
          const data: FlowData = { ...(n.data as FlowData), def: updated, summary: nodeSummary(updated) };
          return { ...n, data };
        }),
      );
      setSelectedNode((prev) => {
        if (!prev || prev.id !== id) return prev;
        const d = (prev.data as FlowData).def;
        const updated: WorkflowNodeDef = { ...d, ...patch };
        const data: FlowData = { ...(prev.data as FlowData), def: updated, summary: nodeSummary(updated) };
        return { ...prev, data };
      });
      historyRef.current.future = [];
      const def = defRef.current;
      if (!def) return;
      const updatedNodes = nodesRef.current.map((n) => {
        if (n.id !== id) return n;
        const d = (n.data as FlowData).def;
        const upd: WorkflowNodeDef = { ...d, ...patch };
        return { ...n, data: { ...(n.data as FlowData), def: upd, summary: nodeSummary(upd) } };
      });
      const updatedDef = flowToDefinition(updatedNodes, edgesRef.current, {
        name: def.name,
        description: def.description,
        fallbackTrigger: def.trigger,
      });
      const posMap: NodePositions = {};
      for (const n of updatedNodes) posMap[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
      posMapRef.current = posMap;
      appliedSigRef.current = defSignature(updatedDef);
      onDefinitionChange(updatedDef, posMap);
    },
    [setNodes, onDefinitionChange],
  );

  const handleConfigOpen = (open: boolean) => {
    setConfigOpen(open);
    if (!open) setSelectedNode(null);
  };

  const zoomPct = Math.round((useViewport().zoom || 1) * 100);
  const showMiniMap = nodes.length >= 2;

  return (
    <div
      className="relative h-full w-full"
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        isValidConnection={isValidConnection}
        deleteKeyCode={keyboardEnabled ? ["Backspace", "Delete"] : null}
        onMoveEnd={(_e, vp) => onViewportChange(vp)}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "#6366F1", strokeWidth: 2 }}
        fitView={false}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep" }}
        snapToGrid={false}
      >
        {showGrid ? (
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#D9DFEA" />
        ) : null}

        {/* Status + name badge */}
        <Panel position="top-left" className="!m-3">
          <div
            className={cn(
              "flex items-center rounded-xl border border-[#E5E7EB] bg-white/95 shadow-sm backdrop-blur transition-all duration-300",
              badgeCollapsed ? "gap-1 px-2 py-1.5" : "gap-2 px-3 py-2"
            )}
          >
            {!badgeCollapsed ? (
              <>
                <div className="min-w-0 max-w-[220px]">
                  <input
                    defaultValue={workflowName}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== workflowName) onNameChange?.(v);
                      else e.target.value = workflowName;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") {
                        (e.target as HTMLInputElement).value = workflowName;
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full truncate bg-transparent text-[13px] font-semibold text-[#111827] outline-none rounded px-1 -mx-1 hover:bg-[#F3F4F6] focus:bg-[#F3F4F6] focus:ring-1 focus:ring-[#6366F1]/40 transition-colors cursor-text"
                    title="Click to rename"
                  />
                </div>
                {dirty ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                    title="Unsaved changes"
                    aria-label="Unsaved changes"
                  />
                ) : null}
                <Badge className={cn("shrink-0 border", STATUS_BADGES[status] || STATUS_BADGES.DRAFT)}>
                  {STATUS_BADGES[status]?.label || status}
                </Badge>
                {building ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#6366F1]">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    Building…
                  </span>
                ) : null}
                {testing && testProgress ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-sky-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Step {testProgress.step} of {testProgress.total} ({testProgress.percent}%)
                  </span>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setBadgeCollapsed((v) => !v)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-slate-100 hover:text-[#111827]"
              title={badgeCollapsed ? "Expand details" : "Collapse to left"}
              aria-label={badgeCollapsed ? "Expand details" : "Collapse to left"}
            >
              {badgeCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-[#6366F1]" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </Panel>

        {/* Ready / needs-attention banner */}
        {testDone && testResult ? (
          <Panel position="top-center" className="!m-3">
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm",
                testOk ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
              )}
            >
              {testOk ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span
                className={cn(
                  "text-[12.5px] font-medium",
                  testOk ? "text-emerald-800" : "text-amber-800",
                )}
              >
                {testOk
                  ? "All steps passed — ready to activate"
                  : `${testResult.errors} step${testResult.errors === 1 ? "" : "s"} need attention before activation`}
              </span>
              {testOk ? (
                <button
                  type="button"
                  onClick={onActivateFromReady}
                  className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[12px] font-medium text-white transition hover:bg-emerald-700"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Activate
                </button>
              ) : null}
            </div>
          </Panel>
        ) : null}

        {/* Test results panel */}
        {testDone && testResult && !testOk ? (
          <Panel position="bottom-center" className="!m-3 !max-w-[min(760px,calc(100vw-1.5rem))]">
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white/95 shadow-[0_8px_28px_rgba(15,23,42,0.12)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] px-3 py-2">
                <p className="text-[12px] font-semibold text-[#111827]">
                  Test results — {testResult.errors} error{testResult.errors === 1 ? "" : "s"} ·{" "}
                  {testResult.warnings} warning{testResult.warnings === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onContinueTest}
                    className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#4F46E5] transition hover:bg-[#6366F1]/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue testing
                  </button>
                  <button
                    type="button"
                    onClick={onRetestAll}
                    disabled={testing}
                    className="flex items-center gap-1 rounded-lg bg-[#111827] px-2 py-1 text-[11px] font-medium text-white transition hover:bg-[#374151] disabled:opacity-40"
                  >
                    <RotateCw className="h-3 w-3" />
                    Re-test all
                  </button>
                </div>
              </div>
              <div className="max-h-[36vh] space-y-1.5 overflow-y-auto px-3 py-2.5">
                {testResult.nodes
                  .map((n) => ({ n, live: nodeStatuses?.[n.nodeKey] }))
                  .filter(({ n, live }) => {
                    const code = live?.code || (n.status === "OK" ? "SUCCESS" : n.status === "ERROR" ? "ERROR" : "WARNING");
                    return code === "ERROR" || code === "WARNING";
                  })
                  .map(({ n, live }) => {
                    const code = live?.code || (n.status === "OK" ? "SUCCESS" : n.status === "ERROR" ? "ERROR" : "WARNING");
                    const isError = code === "ERROR";
                    return (
                      <div key={n.nodeKey} className="flex items-start gap-2 rounded-lg border border-[#F1F5F9] bg-[#FAFAFB] px-2.5 py-2">
                        <span
                          className={cn(
                            "mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full",
                            isError ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600",
                          )}
                        >
                          {isError ? (
                            <X className="h-2.5 w-2.5" />
                          ) : (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-[#111827]">{n.label}</p>
                          <p className="line-clamp-2 text-[11px] leading-snug text-[#6B7280]">
                            {live?.summary || n.summary}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {isError ? (
                            n.action?.kind === "connect_integration" ? (
                              <button
                                type="button"
                                onClick={() => onConnectIntegration?.(n.action!)}
                                className="rounded-lg bg-[#6366F1] px-2 py-1 text-[11px] font-medium text-white transition hover:bg-[#4F46E5]"
                              >
                                {n.action.label}
                              </button>
                            ) : n.action?.kind === "upgrade_plan" ? (
                              <button
                                type="button"
                                onClick={onUpgradePlan}
                                className="rounded-lg bg-[#6366F1] px-2 py-1 text-[11px] font-medium text-white transition hover:bg-[#4F46E5]"
                              >
                                Upgrade plan
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onFixNode?.(n.nodeKey)}
                                className="rounded-lg bg-[#111827] px-2 py-1 text-[11px] font-medium text-white transition hover:bg-[#374151]"
                              >
                                Fix node
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => onRetestNode?.(n.nodeKey)}
                              className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#4F46E5] transition hover:bg-[#6366F1]/10"
                            >
                              Re-test
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </Panel>
        ) : null}

        {/* Top-right toolbar: Test/Activate + canvas controls */}
        <Panel position="top-right" className="!m-3">
          <div className="flex max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white/95 p-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] backdrop-blur">
            <button
              type="button"
              onClick={onTest}
              disabled={!definition || testing}
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-[#374151] transition hover:bg-[#6366F1]/10 hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {testing ? "Testing" : "Test"}
            </button>
            {status === "ACTIVE" || status === "PAUSED" ? (
              <button
                type="button"
                onClick={onPauseResume}
                disabled={!definition}
                className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-[#374151] transition hover:bg-amber-500/10 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {status === "ACTIVE" ? "Pause" : "Resume"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onActivate}
                disabled={!definition || !canActivate}
                title={activationHint}
                className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-[#6366F1] px-2.5 text-[12px] font-medium text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Zap className="h-3.5 w-3.5" />
                Activate
              </button>
            )}
            <div className="mx-1 h-4 w-px shrink-0 bg-[#EEF1F6]" />
            <ToolButton label="Zoom out" onClick={() => void zoomOut({ duration: 150 })}>
              <Minus className="h-3.5 w-3.5" />
            </ToolButton>
            <span className="hidden w-10 shrink-0 text-center text-[10.5px] font-medium tabular-nums text-[#6B7280] sm:block">
              {zoomPct}%
            </span>
            <ToolButton label="Zoom in" onClick={() => void zoomIn({ duration: 150 })}>
              <Plus className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Fit to screen" onClick={() => void fitView({ padding: 0.14, duration: 350 })}>
              <Scan className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Reset view" onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}>
              <RotateCcw className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label={showGrid ? "Hide grid" : "Show grid"} onClick={() => setShowGrid((v) => !v)}>
              <LayoutGrid className={cn("h-3.5 w-3.5", !showGrid && "text-[#C7CBD4]")} />
            </ToolButton>
            <ToolButton label="Auto arrange" onClick={handleAutoArrange}>
              <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Add step" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Explain workflow" onClick={onExplain}>
              <HelpCircle className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={onToggleFullscreen}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </ToolButton>
            <div className="mx-1 h-4 w-px shrink-0 bg-[#EEF1F6]" />
            <ToolButton label="Undo (⌘Z)" onClick={undo} disabled={!historyRef.current.past.length}>
              <Undo2 className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Redo (⌘⇧Z)" onClick={redo} disabled={!historyRef.current.future.length}>
              <Redo2 className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              label="Delete selected"
              onClick={() => {
                if (selectedNode) {
                  onNodesDelete([selectedNode]);
                  setNodes((cur) => cur.filter((n) => n.id !== selectedNode.id));
                  setEdges((cur) => cur.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
                  setSelectedNode(null);
                  setConfigOpen(false);
                }
              }}
              disabled={!selectedNode}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ToolButton>
          </div>
        </Panel>

        {/* Node configuration floating panel */}
        {selectedNode && configOpen ? (
          <NodeConfigPanel
            node={
              ((nodes.find((n) => n.id === selectedNode.id)?.data as FlowData)?.def) ||
              (selectedNode.data as FlowData).def
            }
            catalog={catalog}
            attention={nodeStatuses?.[(selectedNode.data as FlowData).def.id]}
            onClose={() => handleConfigOpen(false)}
            onChange={(patch) => updateNodeConfig(selectedNode.id, patch)}
          />
        ) : null}

        {showMiniMap ? (
          <Panel position="bottom-left" className="!m-3 !p-0">
            <div className="flex items-center">
              <div
                className={cn(
                  "overflow-hidden rounded-xl border border-[#E5E7EB] bg-white/95 shadow-sm backdrop-blur transition-all duration-300",
                  miniMapCollapsed ? "w-0 h-[120px] opacity-0 border-0 pointer-events-none" : "w-[180px] h-[120px] opacity-100"
                )}
              >
                <MiniMap
                  className="!m-0 !w-full !h-full !border-0 !static"
                  pannable
                  zoomable
                  maskColor="rgba(255,255,255,0.6)"
                  nodeColor={(n) => nodeColor(n.type as string, (n.data as FlowData)?.def)}
                  nodeStrokeColor="#E5E7EB"
                />
              </div>
              <button
                type="button"
                onClick={() => setMiniMapCollapsed((v) => !v)}
                className={cn(
                  "flex h-8 w-7 shrink-0 items-center justify-center border border-[#E5E7EB] bg-white/95 text-[#6B7280] shadow-sm backdrop-blur transition hover:bg-slate-100 hover:text-[#111827]",
                  miniMapCollapsed ? "rounded-xl" : "rounded-r-xl border-l-0"
                )}
                title={miniMapCollapsed ? "Show minimap" : "Collapse minimap to left"}
                aria-label={miniMapCollapsed ? "Show minimap" : "Collapse minimap to left"}
              >
                {miniMapCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-[#6366F1]" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>
          </Panel>
        ) : null}
      </ReactFlow>

      {/* Add node dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add step</DialogTitle>
            <DialogDescription>Insert a node into the workflow. Drag from its handle to connect it.</DialogDescription>
          </DialogHeader>
          <AddNodeList catalog={catalog} onPick={handleAddNode} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function nodeColor(type: string, def?: WorkflowNodeDef): string {
  if (!def) return "#CBD5E1";
  return accentFor(def).dot;
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

// ─── Toolbar button ──────────────────────────────────────────────────────────

function ToolButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#6366F1]/10 hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

// ─── Node configuration panel ────────────────────────────────────────────────

type Field = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "number" | "select" | "duration";
  options?: string[];
  placeholder?: string;
};

const DURATION_OPTIONS = ["30m", "1h", "2h", "6h", "12h", "1d", "2d", "3d", "7d", "14d", "30d"];

function fieldsFor(node: WorkflowNodeDef, conditionOptions: string[] = []): Field[] {
  const c = (node.config || {}) as Record<string, unknown>;
  const t = String(c.type || (node.data || {}).type || "");
  switch (node.type) {
    case "trigger": {
      if (t === "customer_inactive" || t === "membership_expiring") {
        return [{ key: "days", label: "Days", kind: "number", placeholder: "30" }];
      }
      if (t === "points_threshold_reached") {
        return [{ key: "points", label: "Points", kind: "number", placeholder: "500" }];
      }
      return [];
    }
    case "delay":
      return [{ key: "duration", label: "Duration", kind: "duration", options: DURATION_OPTIONS }];
    case "condition": {
      const conds = conditionOptions.length ? conditionOptions : (node.data as Record<string, unknown>).conditionOptions;
      return [
        { key: "condition", label: "Condition", kind: "select", options: (conds as string[]) || [] },
        { key: "operator", label: "Operator", kind: "select", options: ["equals", "gt", "gte", "lt", "lte"] },
        { key: "value", label: "Value", kind: "text", placeholder: "e.g. Gold" },
      ];
    }
    case "action": {
      if (t === "send_whatsapp" || t === "send_sms" || t === "send_email" || t.startsWith("send_")) {
        const isEmail = (c.channel as string)?.toUpperCase() === "EMAIL" || t === "send_email";
        const fields: Field[] = [];
        if (isEmail) {
          fields.push({ key: "subject", label: "Subject", kind: "text", placeholder: "Subject line…" });
        }
        fields.push({ key: "message", label: isEmail ? "Email Body" : "Message", kind: "textarea", placeholder: "We miss you!" });
        fields.push({ key: "channel", label: "Channel", kind: "select", options: ["WHATSAPP", "SMS", "EMAIL"] });
        return fields;
      }
      if (t === "create_reward") {
        return [
          { key: "name", label: "Reward name", kind: "text", placeholder: "Win-back reward" },
          { key: "value", label: "Value", kind: "text", placeholder: "₹200 OFF" },
          { key: "message", label: "Message", kind: "textarea", placeholder: "Enjoy your reward!" },
        ];
      }
      if (t === "add_points" || t === "remove_points") {
        return [{ key: "points", label: "Points", kind: "number", placeholder: "50" }];
      }
      if (t === "add_tag" || t === "remove_tag") {
        return [{ key: "tag", label: "Tag", kind: "text", placeholder: "VIP" }];
      }
      return [];
    }
    default:
      return [];
  }
}

function NodeConfigPanel({
  node,
  catalog,
  attention,
  onClose,
  onChange,
}: {
  node: WorkflowNodeDef;
  catalog: WorkflowCapabilityCatalog | null;
  attention?: TestNodeState;
  onClose: () => void;
  onChange: (patch: Partial<WorkflowNodeDef>) => void;
}) {
  const c = (node.config || {}) as Record<string, unknown>;
  const conditionOptions = catalog?.conditions.map((cd) => cd.key) ?? [];
  const fields = fieldsFor(node, conditionOptions);
  const accent = accentFor(node);
  const Icon = accent.icon;

  const setValue = (key: string, value: unknown) => {
    let config = { ...c, [key]: value };
    if (key === "message") {
      config = { ...config, message: value, body: value };
    } else if (key === "body") {
      config = { ...config, body: value, message: value };
    }

    let patch: Partial<WorkflowNodeDef> = { config };

    // When changing channel on messaging actions, keep label, type & channel in full sync
    if (key === "channel") {
      const ch = String(value).toUpperCase();
      const newLabel = ch === "EMAIL" ? "Send Email" : ch === "SMS" ? "Send SMS" : "Send WhatsApp";
      const newType = ch === "EMAIL" ? "send_email" : ch === "SMS" ? "send_sms" : "send_whatsapp";
      patch = {
        label: newLabel,
        config: { ...config, type: newType, channel: ch },
        data: { ...(node.data || {}), type: newType, channel: ch },
      };
    }

    onChange(patch);
  };

  const getFieldValue = (f: Field) => {
    if (f.key === "message") {
      return String(c.message ?? c.body ?? "");
    }
    if (f.key === "body") {
      return String(c.body ?? c.message ?? "");
    }
    if (f.key === "channel") {
      return String(c.channel ?? (node.config?.type === "send_email" ? "EMAIL" : node.config?.type === "send_sms" ? "SMS" : "WHATSAPP"));
    }
    return c[f.key];
  };

  return (
    <Panel position="bottom-right" className="!bottom-3 !m-3 !w-[280px] max-[640px]:!left-2 max-[640px]:!right-2 max-[640px]:!w-auto">
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", accent.chip)}>
              <Icon className={cn("h-3.5 w-3.5", accent.iconColor)} />
            </div>
            <p className="text-[12.5px] font-semibold text-[#111827]">{node.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#9CA3AF] transition hover:bg-slate-100 hover:text-[#111827]"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {attention && attention.code === "ERROR" ? (
          <div className="flex items-start gap-1.5 border-b border-rose-100 bg-rose-50 px-3 py-2">
            <X className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
            <p className="text-[11px] leading-snug text-rose-700">{attention.summary || "This step needs your attention."}</p>
          </div>
        ) : null}
        <div className="max-h-[40vh] space-y-2.5 overflow-y-auto px-3 py-3">
          {node.type === "trigger" ? (
            <p className="text-[11px] text-[#6B7280]">Trigger: {triggerLabel(node.config as unknown as WorkflowTriggerDef)}</p>
          ) : null}
          {fields.length === 0 ? (
            <p className="text-[11px] text-[#9CA3AF]">No configurable fields for this step.</p>
          ) : (
            fields.map((f) => {
              const val = getFieldValue(f);
              if (f.kind === "select" || f.kind === "duration") {
                const options = f.options || [];
                return (
                  <label key={f.key} className="block">
                    <span className="mb-1 block text-[10.5px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                      {f.label}
                    </span>
                    <select
                      value={String(val ?? (f.kind === "duration" ? "1d" : options[0] ?? ""))}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[12.5px] text-[#111827] outline-none focus:border-[#6366F1]"
                    >
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              if (f.kind === "textarea") {
                return (
                  <label key={f.key} className="block">
                    <span className="mb-1 block text-[10.5px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                      {f.label}
                    </span>
                    <textarea
                      value={String(val ?? "")}
                      placeholder={f.placeholder}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[12.5px] text-[#111827] outline-none focus:border-[#6366F1]"
                    />
                  </label>
                );
              }
              return (
                <label key={f.key} className="block">
                  <span className="mb-1 block text-[10.5px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                    {f.label}
                  </span>
                  <input
                    type={f.kind === "number" ? "number" : "text"}
                    value={String(val ?? "")}
                    placeholder={f.placeholder}
                    onChange={(e) => setValue(f.key, f.kind === "number" ? Number(e.target.value) : e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[12.5px] text-[#111827] outline-none focus:border-[#6366F1]"
                  />
                </label>
              );
            })
          )}
        </div>
      </div>
    </Panel>
  );
}

// ─── Add node list ───────────────────────────────────────────────────────────

function AddNodeList({
  catalog,
  onPick,
}: {
  catalog: WorkflowCapabilityCatalog | null;
  onPick: (def: WorkflowNodeDef) => void;
}) {
  const triggers = (catalog?.triggers || []).slice(0, 8);
  const actions = (catalog?.actions || []).slice(0, 14);
  const conditions = (catalog?.conditions || []).slice(0, 8);

  const section = (title: string, items: Array<{ id: string; label: string; type: WorkflowNodeDef["type"]; config: Record<string, unknown>; data?: Record<string, unknown> }>, chip: string) => (
    <div>
      <p className={cn("mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide", chip)}>{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onPick({ id: it.id, type: it.type, label: it.label, config: it.config, data: it.data })}
            className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[11.5px] text-[#374151] transition hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5"
          >
            {it.label}
          </button>
        ))}
        {items.length === 0 ? <span className="text-[11px] text-[#9CA3AF]">None available</span> : null}
      </div>
    </div>
  );

  return (
    <div className="max-h-[50vh] space-y-3 overflow-y-auto">
      {section(
        "Triggers",
        triggers.map((t) => ({ id: `trigger-${t.type}`, type: "trigger" as const, label: t.label, config: { type: t.type } })),
        "text-indigo-500",
      )}
      {section(
        "Actions",
        actions.map((a) => ({ id: `action-${a.type}`, type: "action" as const, label: a.label, config: { type: a.type } })),
        "text-violet-500",
      )}
      {section(
        "Conditions",
        conditions.map((cd) => ({
          id: `condition-${cd.key}`,
          type: "condition" as const,
          label: cd.label,
          config: { condition: cd.key, operator: "equals", value: "" },
          data: { conditionOptions: conditions.map((x) => x.key) },
        })),
        "text-amber-500",
      )}
      {section(
        "Flow",
        [
          { id: "flow-delay", type: "delay" as const, label: "Wait", config: { duration: "1d" } },
          { id: "flow-end", type: "end" as const, label: "End", config: {} },
        ],
        "text-slate-500",
      )}
    </div>
  );
}

// ─── Status badge styles ─────────────────────────────────────────────────────

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200" },
  PAUSED: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ERROR: { label: "Error", className: "bg-rose-50 text-rose-700 border-rose-200" },
  UNSAVED: { label: "Unsaved", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};
