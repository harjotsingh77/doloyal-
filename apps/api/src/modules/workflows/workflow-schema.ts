/**
 * Workflow definition validation.
 *
 * Takes the raw definition emitted by the AI and verifies that every node is
 * (a) structurally sound and (b) present in the approved capability registry.
 */
import {
  getAction,
  isSupportedAction,
  isSupportedCondition,
  isSupportedTrigger,
  SUPPORTED_OPERATORS,
} from './workflow-capability.registry';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'branch' | 'end';
  label: string;
  description?: string;
  config?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  outcome?: string | null;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  trigger: { type: string; config?: Record<string, unknown>; params?: Record<string, unknown> };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ValidationResult {
  valid: boolean;
  definition?: WorkflowDefinition;
  errors: string[];
  warnings: string[];
}

export const DELAY_PATTERN = /^(\d+)\s*(s|m|h|d)$/i;

export function normalizeDefinition(raw: any): WorkflowDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const nodes: WorkflowNode[] = Array.isArray(raw.nodes) ? raw.nodes : [];
  const edges: WorkflowEdge[] = Array.isArray(raw.edges) ? raw.edges : [];
  return {
    name: typeof raw.name === 'string' ? raw.name : 'Untitled workflow',
    description: typeof raw.description === 'string' ? raw.description : undefined,
    trigger: {
      type: raw.trigger?.type || '',
      config: raw.trigger?.config || {},
      params: raw.trigger?.params || raw.trigger?.config || {},
    },
    nodes,
    edges,
  };
}

export function validateDefinition(raw: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const def = normalizeDefinition(raw);
  if (!def) {
    return { valid: false, errors: ['Workflow definition is empty or malformed.'], warnings };
  }

  if (!def.trigger.type) {
    errors.push('Workflow is missing a trigger.');
  } else if (!isSupportedTrigger(def.trigger.type)) {
    errors.push(`Trigger "${def.trigger.type}" is not supported by Doloyal.`);
  }

  if (!def.nodes.length) {
    errors.push('Workflow has no steps.');
  }

  const nodeIds = new Set<string>();
  for (const node of def.nodes) {
    if (!node.id) {
      errors.push('A workflow step is missing an id.');
      continue;
    }
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate step id "${node.id}".`);
    }
    nodeIds.add(node.id);

    if (node.type === 'action') {
      const actionType = node.config?.type || node.data?.type;
      if (!actionType) {
        errors.push(`Action step "${node.id}" is missing an action type.`);
      } else if (!isSupportedAction(String(actionType))) {
        errors.push(`Action "${actionType}" is not supported by Doloyal.`);
      } else {
        const cap = getAction(String(actionType));
        if (cap?.channels && !cap.channels.length) {
          warnings.push(`Action "${actionType}" has no connected provider yet and will be simulated.`);
        }
      }
    } else if (node.type === 'condition') {
      const condKey = node.config?.condition || node.config?.key || node.data?.condition;
      if (!condKey) {
        errors.push(`Condition step "${node.id}" is missing a condition key.`);
      } else if (!isSupportedCondition(String(condKey))) {
        errors.push(`Condition "${condKey}" is not supported by Doloyal.`);
      } else {
        const operator = node.config?.operator || 'equals';
        if (!SUPPORTED_OPERATORS.includes(String(operator))) {
          errors.push(`Operator "${operator}" is not supported.`);
        }
      }
    } else if (node.type === 'delay') {
      const duration = node.config?.duration || node.data?.duration;
      if (typeof duration !== 'string' || !DELAY_PATTERN.test(duration)) {
        errors.push(`Delay step "${node.id}" needs a duration like "7d" or "2h".`);
      }
    }
  }

  for (const edge of def.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references missing step "${edge.source}".`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references missing step "${edge.target}".`);
    }
  }

  return { valid: errors.length === 0, definition: def, errors, warnings };
}

export function parseDurationMs(duration: string): number {
  const m = DELAY_PATTERN.exec(duration);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * (mult[unit] || 0);
}

/**
 * Build a canonical definition from a prompt-style AI draft. Ensures a
 * consistent shape (nodes + edges) regardless of how the AI returns it.
 */
export function toCanonicalDefinition(input: {
  name: string;
  description?: string;
  trigger: { type: string; config?: Record<string, unknown>; params?: Record<string, unknown> };
  steps?: any[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}): WorkflowDefinition {
  if (Array.isArray(input.nodes) && input.nodes.length) {
    const validated = validateDefinition({
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      nodes: input.nodes,
      edges: input.edges || [],
    });
    if (validated.valid && validated.definition) return validated.definition;
  }

  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const steps = Array.isArray(input.steps) ? input.steps : [];

  steps.forEach((step: any, index: number) => {
    const id = step.id || `step_${index + 1}`;
    const type: WorkflowNode['type'] = step.type || 'action';
    const config = step.config || step.params || {};

    if (type === 'trigger') {
      nodes.push({ id, type, label: step.label || 'Trigger', config });
      return;
    }
    if (type === 'delay') {
      const duration = config.duration || step.duration || config.wait;
      nodes.push({ id, type, label: step.label || 'Wait', config: { duration } });
      return;
    }
    if (type === 'condition') {
      const condition = config.condition || config.key || step.condition;
      nodes.push({
        id,
        type,
        label: step.label || 'Condition',
        config: { condition, operator: config.operator || 'equals', value: config.value },
      });
      return;
    }
    if (type === 'branch') {
      nodes.push({ id, type, label: step.label || 'Branch', config });
      return;
    }
    if (type === 'end') {
      nodes.push({ id, type, label: step.label || 'End', config: {} });
      return;
    }
    // action
    const action = config.type || step.action || 'notify_business_owner';
    const actionCap = getAction(String(action));
    nodes.push({
      id,
      type: 'action',
      label: step.label || actionCap?.label || 'Action',
      config: { type: action, ...config },
    });
  });

  // Wire edges in sequence; condition/branch nodes fan out to synthetic ends.
  for (let i = 0; i < nodes.length - 1; i++) {
    const node = nodes[i]!;
    const next = nodes[i + 1]!;
    if (node.type === 'condition' || node.type === 'branch') {
      edges.push({ source: node.id, target: next.id, outcome: 'true' });
      edges.push({ source: node.id, target: next.id, outcome: 'false' });
    } else {
      edges.push({ source: node.id, target: next.id });
    }
  }

  return { name: input.name, description: input.description, trigger: input.trigger, nodes, edges };
}
