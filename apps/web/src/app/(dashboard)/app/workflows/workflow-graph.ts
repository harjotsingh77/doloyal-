import type {
  WorkflowDefinition,
  WorkflowNodeDef,
  WorkflowTriggerDef,
} from "@doloyal/shared";

export type NodePositions = Record<string, { x: number; y: number }>;

export const NODE_W = 224;
export const NODE_H = 88;
export const LAYER_GAP_X = 260;
export const LAYER_GAP_Y = 56;

export function defSignature(def: WorkflowDefinition | null): string {
  if (!def) return "";
  return JSON.stringify({
    name: def.name,
    description: def.description,
    trigger: def.trigger,
    nodes: def.nodes.map((n) => ({ id: n.id, type: n.type, label: n.label, config: n.config, data: n.data })),
    edges: def.edges.map((e) => ({ source: e.source, target: e.target, outcome: e.outcome ?? null })),
  });
}

export function cloneDef(def: WorkflowDefinition): WorkflowDefinition {
  return JSON.parse(JSON.stringify(def)) as WorkflowDefinition;
}

/** Trigger label text, e.g. "Customer inactive — 45 days". */
export function triggerLabel(trigger: WorkflowTriggerDef): string {
  const t = trigger.type;
  const cfg = trigger.config || {};
  const params = trigger.params || {};
  const days = (cfg.days ?? params.days ?? 0) as number;
  if (t === "customer_inactive") return `Customer inactive — ${days || 30}+ days`;
  if (t === "customer_birthday") return "Customer birthday";
  if (t === "customer_created") return "Customer created";
  if (t === "customer_updated") return "Customer updated";
  if (t === "customer_returned") return "Customer returned";
  if (t === "customer_tag_added") return "Tag added to customer";
  if (t === "appointment_booked") return "Appointment booked";
  if (t === "appointment_confirmed") return "Appointment confirmed";
  if (t === "appointment_completed") return "Appointment completed";
  if (t === "appointment_canceled") return "Appointment canceled";
  if (t === "appointment_no_show") return "Appointment no-show";
  if (t === "points_earned") return "Points earned";
  if (t === "points_threshold_reached") return `Points threshold (${(cfg.points ?? params.points ?? 0) as number})`;
  if (t === "membership_expiring") return "Membership expiring";
  if (t === "membership_expired") return "Membership expired";
  if (t === "reward_created") return "Reward created";
  if (t === "reward_redeemed") return "Reward redeemed";
  if (t === "campaign_sent") return "Campaign sent";
  if (t === "booking_submitted") return "Booking submitted";
  if (t === "payment_failed") return "Payment failed";
  if (t === "retention_risk_high") return "High retention risk";
  if (t === "website_lead_created") return "Website lead created";
  return t
    .split("_")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join(" ");
}

/** Build a short summary line shown under the node title. */
export function nodeSummary(n: WorkflowNodeDef): string {
  const c = (n.config || {}) as Record<string, unknown>;
  const d = (n.data || {}) as Record<string, unknown>;
  const str = (v: unknown) => (v == null ? "" : String(v));
  switch (n.type) {
    case "action": {
      const type = str(c.type || d.type);
      const channel = str(c.channel || d.channel);
      if (type === "send_whatsapp" || type === "send_sms" || type === "send_email") {
        const preview = str(c.message || c.body || d.message || d.body);
        if (preview) {
          const clean = preview.replace(/\s+/g, " ").trim();
          const text = clean.length > 32 ? `${clean.slice(0, 30)}…` : clean;
          return channel ? `${text} (${channel.toUpperCase()})` : text;
        }
        return channel ? `via ${channel.toUpperCase()}` : n.label;
      }
      if (type === "create_reward") {
        const parts = [str(c.name) || "Reward"];
        if (c.value) parts.push(str(c.value));
        return parts.join(" · ");
      }
      if (type === "add_points" || type === "remove_points") {
        return `${str(c.points) || "—"} points`;
      }
      if (type === "add_tag" || type === "remove_tag") return `Tag: ${str(c.tag) || "—"}`;
      if (type === "send_booking_reminder" || type === "send_membership_reminder" || type === "send_rebooking_message") {
        return channel ? `via ${channel.toUpperCase()}` : n.label;
      }
      return n.label;
    }
    case "delay": {
      const duration = str(c.duration || d.duration);
      return `Wait ${duration || "…"}`;
    }
    case "condition": {
      const key = str(c.condition || c.key || d.condition || d.key);
      const op = str(c.operator || d.op || "is");
      const value = str(c.value ?? d.value);
      const human = key.replace(/_/g, " ");
      return value ? `${human} ${op} ${value}` : human;
    }
    case "trigger": {
      const type = str(c.type || d.triggerType);
      if (!type) return n.label;
      return triggerLabel({ type, config: c, params: d });
    }
    case "end":
      return "Workflow complete";
    default:
      return "";
  }
}

/**
 * Ensure the definition carries a trigger node. The backend definition keeps
 * the trigger in `definition.trigger`; we materialize it as the first node so
 * the canvas is a complete visual representation.
 */
export function ensureTriggerNode(def: WorkflowDefinition): WorkflowDefinition {
  if (def.nodes.some((n) => n.type === "trigger")) return def;
  const t = def.trigger;
  const cfg = { ...(t.config || {}), ...(t.params || {}) };
  const node: WorkflowNodeDef = {
    id: "trigger",
    type: "trigger",
    label: triggerLabel(t),
    config: { type: t.type, ...cfg },
    data: { triggerType: t.type },
  };
  const nodes = [node, ...def.nodes];
  const edges = def.edges.map((e) => ({ ...e }));
  // Wire the trigger into the first node (or existing isolated start nodes).
  if (!edges.some((e) => e.source === "trigger")) {
    const first = def.nodes[0];
    if (first) {
      const alreadyWired = def.edges.some((e) => e.target === first.id);
      if (!alreadyWired) edges.unshift({ source: "trigger", target: first.id });
    }
  }
  return { ...def, nodes, edges };
}

/**
 * Reconstruct the backend `trigger` field from the trigger node currently on
 * the canvas.
 */
export function triggerFromNode(node: WorkflowNodeDef | undefined, fallback: WorkflowTriggerDef): WorkflowTriggerDef {
  if (!node || node.type !== "trigger") return fallback;
  const cfg = (node.config || {}) as Record<string, unknown>;
  const d = (node.data || {}) as Record<string, unknown>;
  const type = String(cfg.type || d.triggerType || fallback.type);
  const { type: _omit, ...rest } = cfg;
  return { type, config: { ...rest } };
}

/** Deterministic topological order (BFS from the trigger / root nodes). */
export function topologicalOrder(nodes: WorkflowNodeDef[], edges: { source: string; target: string }[]): string[] {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const n of nodes) incoming.set(n.id, 0);
  for (const e of edges) {
    if (!incoming.has(e.target)) continue;
    incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
    const list = outgoing.get(e.source) || [];
    list.push(e.target);
    outgoing.set(e.source, list);
  }
  const queue = nodes.filter((n) => (incoming.get(n.id) || 0) === 0).map((n) => n.id);
  const order: string[] = [];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    for (const next of outgoing.get(id) || []) {
      incoming.set(next, (incoming.get(next) || 1) - 1);
      if ((incoming.get(next) || 0) <= 0) queue.push(next);
    }
  }
  for (const n of nodes) if (!seen.has(n.id)) order.push(n.id);
  return order;
}

/**
 * Simple layered left-to-right layout. Not a full DAG layouter, but produces
 * clean columns for typical workflows and keeps branches readable.
 */
export function computeAutoLayout(nodes: WorkflowNodeDef[], edges: { source: string; target: string }[]): NodePositions {
  const order = topologicalOrder(nodes, edges);
  const layer = new Map<string, number>();
  for (const id of order) layer.set(id, 0);
  for (const id of order) {
    const current = layer.get(id) || 0;
    for (const e of edges) {
      if (e.source === id) {
        const next = layer.get(e.target);
        if (next === undefined || next < current + 1) layer.set(e.target, current + 1);
      }
    }
  }
  const byLayer = new Map<number, string[]>();
  for (const id of order) {
    const l = layer.get(id) || 0;
    const list = byLayer.get(l) || [];
    list.push(id);
    byLayer.set(l, list);
  }
  const positions: NodePositions = {};
  for (const [l, ids] of byLayer) {
    ids.forEach((id, idx) => {
      const offset = ((ids.length - 1) / 2 - idx) * (NODE_H + LAYER_GAP_Y);
      positions[id] = { x: l * LAYER_GAP_X, y: offset };
    });
  }
  return positions;
}

/** Average of node positions (used to recenter after layout changes). */
export function boundsOf(nodes: WorkflowNodeDef[], positions: NodePositions) {
  if (!nodes.length) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const p = positions[n.id] || { x: 0, y: 0 };
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
