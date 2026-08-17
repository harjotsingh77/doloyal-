/**
 * Workflow AI — natural-language → structured workflow generation.
 *
 * Uses the exact same provider/environment configuration as Doloyal AI
 * (see modules/ai/ai.service.ts getProviderConfig). All AI calls stay on the
 * server; no API keys ever reach the browser.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import {
  TRIGGER_REGISTRY,
  CONDITION_REGISTRY,
  ACTION_REGISTRY,
  TRIGGER_LABELS,
  CONDITION_LABELS,
  ACTION_LABELS,
} from './workflow-capability.registry';
import {
  validateDefinition,
  toCanonicalDefinition,
  type WorkflowDefinition,
  type ValidationResult,
} from './workflow-schema';

type ProviderConfig = {
  provider: string;
  apiKey?: string;
  baseURL?: string;
  model?: string;
};

export interface AiWorkflowReply {
  /** Human-readable assistant message (markdown) rendered in chat. */
  message: string;
  /** Set when the AI needs clarification before generating. */
  needsClarification?: boolean;
  clarification?: string;
  options?: string[];
  /** Validated workflow definition when generation succeeded. */
  definition?: WorkflowDefinition;
  warnings?: string[];
}

const SYSTEM_PROMPT = `You are the Doloyal Workflow Builder AI. You convert plain-English automation
requests into a STRICT JSON workflow definition using ONLY the approved capability registry below.

RULES:
- You may ONLY use triggers, conditions, and actions listed in the registry.
- Never invent capability names. If the user asks for something not supported, respond with
  needsClarification=true and explain the nearest supported alternative.
- If required information is missing (audience size, reward amount, channel, delay), ask at most
  1-2 concise clarification questions (needsClarification=true, clarification text, options list).
- Conditions and branches: a "condition" node has config { condition, operator, value }.
- Delays: config { duration } with a unit string like "7d", "2h", "30m", "15s".
- Actions: config { type, ...fields }.
- Output ONLY valid JSON. Do not wrap in markdown fences.
- Return shape:
{
  "name": "short workflow name",
  "description": "one sentence summary",
  "trigger": { "type": "supported_trigger", "params": { ... } },
  "steps": [
    { "type": "action", "config": { "type": "send_whatsapp", "message": "..." } },
    { "type": "delay", "config": { "duration": "7d" } },
    { "type": "condition", "config": { "condition": "customer_booked_again", "operator": "equals", "value": false } },
    { "type": "branch", "config": { "if_true": "end", "if_false": { "type": "action", "config": { "type": "create_reward", "reward": "₹200 OFF" } } } }
  ]
}
- Keep the flow simple. Prefer the fewest nodes needed.
- Use {first_name}, {business_name} placeholders in message content.`;

const EDIT_SYSTEM_PROMPT = `You are the Doloyal Workflow Builder AI. The user is editing an existing workflow.
Given the CURRENT workflow definition (JSON below) and the user's instruction, produce the UPDATED
full workflow definition as JSON. Preserve every node the user did not ask to change.

RULES:
- Only use triggers/conditions/actions from the approved registry.
- Keep the same node ids unless you must split a node.
- Output ONLY JSON (no markdown fences) in the same shape as the input (nodes + edges + trigger).
- If the instruction cannot be mapped to a supported capability, set needsClarification=true and
  explain in "clarification".`;

@Injectable()
export class WorkflowAiService {
  private readonly logger = new Logger(WorkflowAiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getProviderConfig(): ProviderConfig {
    const provider = (
      this.config.get<string>('AI_PROVIDER') ||
      (this.config.get<string>('OPENAI_API_KEY') ? 'openai' : 'fallback')
    ).toLowerCase();

    const map: Record<string, { keyEnv: string; baseUrl?: string; defaultModel: string }> = {
      openai: { keyEnv: 'OPENAI_API_KEY', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
      openrouter: {
        keyEnv: 'OPENROUTER_API_KEY',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'openai/gpt-4o-mini',
      },
      groq: {
        keyEnv: 'GROQ_API_KEY',
        baseUrl: 'https://api.groq.com/openai/v1',
        defaultModel: 'llama-3.3-70b-versatile',
      },
      deepseek: {
        keyEnv: 'DEEPSEEK_API_KEY',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
      },
      gemini: {
        keyEnv: 'GEMINI_API_KEY',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        defaultModel: 'gemini-2.0-flash',
      },
      anthropic: {
        keyEnv: 'ANTHROPIC_API_KEY',
        baseUrl: this.config.get<string>('AI_BASE_URL') || 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-5-sonnet-latest',
      },
    };

    const cfg = map[provider] || map.openai;
    const apiKey =
      this.config.get<string>('AI_API_KEY') ||
      this.config.get<string>(cfg.keyEnv) ||
      this.config.get<string>('OPENAI_API_KEY');
    const baseURL = this.config.get<string>('AI_BASE_URL') || cfg.baseUrl;
    const model =
      this.config.get<string>('AI_MODEL') ||
      this.config.get<string>('OPENAI_MODEL') ||
      cfg.defaultModel;

    return { provider: apiKey ? provider : 'fallback', apiKey, baseURL, model };
  }

  private registrySummary(): string {
    const triggers = TRIGGER_REGISTRY.map((t) => `- ${t.type} (${t.category}) — ${t.description}`).join('\n');
    const conditions = CONDITION_REGISTRY.map((c) => `- ${c.key} (${c.category}) operators: ${c.operators.join(', ')}`).join('\n');
    const actions = ACTION_REGISTRY.map((a) => `- ${a.type} (${a.category}) — ${a.description}`).join('\n');
    return `APPROVED TRIGGERS:\n${triggers}\n\nAPPROVED CONDITIONS:\n${conditions}\n\nAPPROVED ACTIONS:\n${actions}`;
  }

  /** Generate a workflow from a natural-language prompt. */
  async generate(tenantId: string, prompt: string): Promise<AiWorkflowReply> {
    const { provider, apiKey, baseURL, model } = this.getProviderConfig();
    const userPrompt = `${prompt}\n\nAvailable business data in Doloyal:\n${await this.businessContext(tenantId)}`;

    if (apiKey && provider !== 'fallback' && provider !== 'anthropic') {
      try {
        const raw = await this.completeJson(
          baseURL!,
          apiKey,
          model!,
          `${SYSTEM_PROMPT}\n\n${this.registrySummary()}`,
          userPrompt,
        );
        const reply = this.resolveReply(tenantId, raw);
        // Only trust the model when it produced a validated definition.
        // Otherwise fall back to the deterministic builder so the user
        // always gets a usable draft (or a helpful clarification).
        if (reply.definition) return reply;
      } catch (err: any) {
        this.logger.warn(`Workflow AI provider failed, using rule-based fallback: ${err?.message || err}`);
      }
    }

    return this.ruleBasedGenerate(tenantId, prompt);
  }

  /** Apply a natural-language edit to an existing definition. */
  async edit(tenantId: string, definition: WorkflowDefinition, instruction: string, context?: string): Promise<AiWorkflowReply> {
    const { provider, apiKey, baseURL, model } = this.getProviderConfig();
    const contextBlock = context
      ? `\n\nVALIDATION / TEST CONTEXT (node statuses, errors and warnings from the latest test):\n${context}`
      : '';
    const userPrompt = `CURRENT WORKFLOW DEFINITION:\n${JSON.stringify(definition, null, 2)}\n\nUSER INSTRUCTION:\n${instruction}${contextBlock}`;

    if (apiKey && provider !== 'fallback' && provider !== 'anthropic') {
      try {
        const raw = await this.completeJson(
          baseURL!,
          apiKey,
          model!,
          `${EDIT_SYSTEM_PROMPT}\n\n${this.registrySummary()}`,
          userPrompt,
        );
        if (raw && typeof raw === 'object' && (raw as any).needsClarification) {
          return {
            message: String((raw as any).clarification || 'I need a bit more detail.'),
            needsClarification: true,
            clarification: String((raw as any).clarification || ''),
          };
        }
        const validated = this.validateAndCensor(raw);
        if (validated.valid && validated.definition) {
          return {
            message: this.describeChange(definition, validated.definition),
            definition: validated.definition,
            warnings: validated.warnings,
          };
        }
        return {
          message: `I couldn't apply that change: ${validated.errors.join(' ')}`,
          needsClarification: true,
          clarification: validated.errors.join(' '),
        };
      } catch (err: any) {
        this.logger.warn(`Workflow edit provider failed: ${err?.message || err}`);
      }
    }

    return this.ruleBasedEdit(definition, instruction);
  }

  /** Natural-language summary of a workflow for the Explain button. */
  async explain(definition: WorkflowDefinition): Promise<string> {
    const { provider, apiKey, baseURL, model } = this.getProviderConfig();
    if (apiKey && provider !== 'fallback' && provider !== 'anthropic') {
      try {
        const raw = await this.completeJson(
          baseURL!,
          apiKey,
          model!,
          `You summarize Doloyal workflows for a non-technical business owner. Return {"summary": "..."} only.`,
          `Workflow: ${JSON.stringify(definition)}`,
          'summary',
        );
        if (raw?.summary) return String(raw.summary);
      } catch {
        /* fall through */
      }
    }
    return this.ruleBasedExplain(definition);
  }

  // ─── Reply resolution ──────────────────────────────────────────────────────

  private resolveReply(tenantId: string, raw: any): AiWorkflowReply {
    if (raw && typeof raw === 'object' && raw.needsClarification) {
      return {
        message: String(raw.clarification || 'I need a little more information before I can build that.'),
        needsClarification: true,
        clarification: String(raw.clarification || ''),
        options: Array.isArray(raw.options) ? raw.options.map(String) : undefined,
      };
    }

    const validated = this.validateAndCensor(raw);
    if (validated.valid && validated.definition) {
      return {
        message: this.summaryMessage(validated.definition),
        definition: validated.definition,
        warnings: validated.warnings,
      };
    }

    if (validated.errors.some((e) => e.includes('not supported'))) {
      const unsupported = validated.errors.find((e) => e.includes('not supported'));
      return {
        message: `I can't automate that yet because Doloyal doesn't have a trigger/action for it.\n\n${unsupported}\n\nI can build a close alternative instead — describe the outcome you want and I'll map it to what Doloyal supports.`,
        needsClarification: true,
        clarification: unsupported,
      };
    }

    return {
      message: "I couldn't build a valid workflow from that request. Try again or describe it a little differently.",
      needsClarification: true,
      clarification: validated.errors.join(' '),
    };
  }

  private validateAndCensor(raw: any): ValidationResult {
    if (!raw || typeof raw !== 'object') {
      return { valid: false, errors: ['AI returned an invalid response.'], warnings: [] };
    }
    return validateDefinition(raw);
  }

  private summaryMessage(def: WorkflowDefinition): string {
    const lines: string[] = [`I can build that.\n\nI'll create a workflow that:`, ''];
    const steps = def.nodes.filter((n) => n.type !== 'trigger' && n.type !== 'end');
    steps.forEach((node, i) => {
      lines.push(`${i + 1}. ${this.describeNode(node)}`);
    });
    return lines.join('\n');
  }

  private describeNode(node: any): string {
    if (node.type === 'delay') return `Waits ${node.config?.duration || 'for a while'}.`;
    if (node.type === 'condition') {
      const cond = node.config?.condition || node.config?.key || 'a condition';
      return `Checks "${CONDITION_LABELS[cond] || cond}".`;
    }
    if (node.type === 'branch') return 'Branches based on the result.';
    if (node.type === 'action') {
      const action = node.config?.type;
      return `${ACTION_LABELS[action] || 'Takes an action'}.`;
    }
    return node.label || 'Step';
  }

  private describeChange(before: WorkflowDefinition, after: WorkflowDefinition): string {
    const beforeCount = before.nodes.length;
    const afterCount = after.nodes.length;
    if (afterCount > beforeCount) return `Done. I added ${afterCount - beforeCount} step(s) to the workflow.`;
    if (afterCount < beforeCount) return `Done. I removed ${beforeCount - afterCount} step(s) from the workflow.`;
    const beforeNames = before.nodes.map((n) => `${n.type}:${n.label}`).join('|');
    const afterNames = after.nodes.map((n) => `${n.type}:${n.label}`).join('|');
    if (beforeNames !== afterNames) {
      const changed = after.nodes.find((n, i) => JSON.stringify(n) !== JSON.stringify(before.nodes[i]));
      if (changed) return `Done. I updated the "${changed.label}" step.`;
    }
    return `Done. I've updated the workflow.`;
  }

  // ─── LLM call ──────────────────────────────────────────────────────────────

  private async completeJson(
    baseURL: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    key?: string,
  ): Promise<any> {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    const text = completion.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return key && typeof parsed === 'object' && parsed ? parsed[key] : parsed;
    } catch {
      // Some providers ignore response_format; try to extract the object.
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          /* fall through */
        }
      }
      throw new Error('AI returned non-JSON content');
    }
  }

  // ─── Rule-based fallbacks (no provider key / provider failure) ────────────

  private async businessContext(tenantId: string): Promise<string> {
    try {
      const [tenant, customers, points] = await Promise.all([
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
        this.prisma.customer.count({ where: { tenantId } }),
        this.prisma.customer.count({ where: { tenantId, pointsBalance: { gte: 1000 } } }),
      ]);
      const cust = await this.prisma.customer.count({
        where: { tenantId, OR: [{ lastVisitAt: { lt: new Date(Date.now() - 30 * 86400000) } }, { lastVisitAt: null }] },
      });
      return [
        `Business: ${tenant?.name || 'Your business'} (currency ${tenant?.currency || 'INR'})`,
        `Total customers: ${customers}`,
        `Customers inactive 30+ days: ${cust}`,
        `Customers with 1000+ points: ${points}`,
      ].join('\n');
    } catch {
      return `Business: Your business\nTotal customers: 0`;
    }
  }

  private ruleBasedGenerate(tenantId: string, prompt: string): AiWorkflowReply {
    const p = prompt.toLowerCase();
    const base = {
      name: this.titleCase(prompt),
      description: prompt.trim(),
      trigger: { type: 'customer_inactive', params: { days: 30 } } as any,
    };

    if (p.includes('birthday')) {
      return {
        message: 'I can build that.\n\nI\u2019ll create a workflow that:\n\n1. Fires on a customer\u2019s birthday.\n2. Sends a birthday reward with a personal message.',
        definition: toCanonicalDefinition({
          ...base,
          name: 'Birthday Reward',
          description: 'Send a birthday reward to every customer.',
          trigger: { type: 'customer_birthday', params: {} },
          steps: [
            { id: 'step_1', type: 'action', config: { type: 'create_reward', name: 'Birthday Reward', message: `Happy birthday {first_name}! Here's a special gift from {business_name}. 🎉` } },
          ],
        }),
      };
    }

    if (p.includes('review')) {
      return {
        message: 'I can build that.\n\nI\u2019ll create a workflow that:\n\n1. Fires when an appointment is completed.\n2. Waits 2 hours.\n3. Sends a review request and rebooking nudge.',
        definition: toCanonicalDefinition({
          ...base,
          name: 'Post-Visit Review Request',
          description: 'After a completed appointment, ask for a review and remind to rebook.',
          trigger: { type: 'appointment_completed', params: {} },
          steps: [
            { id: 'step_1', type: 'delay', config: { duration: '2h' } },
            { id: 'step_2', type: 'action', config: { type: 'send_whatsapp', message: `Hi {first_name}! Thanks for visiting {business_name}. We'd love your feedback — and it's a great time to book your next visit.` } },
          ],
        }),
      };
    }

    if (p.includes('point') || p.includes('vip reward') || p.includes('milestone')) {
      const threshold = /\b(\d+)\s*points\b/i.exec(p)?.[1] || '1000';
      return {
        message: `I can build that.\n\nI\u2019ll create a workflow that:\n\n1. Fires when a customer reaches ${threshold} loyalty points.\n2. Sends a VIP reward message.`,
        definition: toCanonicalDefinition({
          ...base,
          name: 'Points Milestone Reward',
          description: `Send a VIP reward when a customer reaches ${threshold} points.`,
          trigger: { type: 'points_threshold_reached', params: { points: Number(threshold) } },
          steps: [
            { id: 'step_1', type: 'action', config: { type: 'create_reward', name: 'VIP Reward', value: 'VIP offer', message: `You've hit ${threshold} points, {first_name}! Here's a VIP reward from {business_name}.` } },
          ],
        }),
      };
    }

    if (p.includes('remind') && p.includes('appointment')) {
      return {
        message: 'I can build that.\n\nI\u2019ll create a workflow that:\n\n1. Fires when an appointment is booked.\n2. Waits until 24 hours before the appointment.\n3. Sends a reminder.',
        definition: toCanonicalDefinition({
          ...base,
          name: 'Appointment Reminder',
          description: 'Remind customers 24 hours before their appointment.',
          trigger: { type: 'appointment_booked', params: {} },
          steps: [
            { id: 'step_1', type: 'action', config: { type: 'send_booking_reminder', channel: 'WHATSAPP' } },
          ],
        }),
      };
    }

    if (p.includes('membership') && (p.includes('expire') || p.includes('renew'))) {
      return {
        message: 'I can build that.\n\nI\u2019ll create a workflow that:\n\n1. Fires when a membership is about to expire (7 days).\n2. Sends a reminder to renew.',
        definition: toCanonicalDefinition({
          ...base,
          name: 'Membership Expiry Reminder',
          description: 'Remind customers about memberships that expire in 7 days.',
          trigger: { type: 'membership_expiring', params: { days: 7 } },
          steps: [
            { id: 'step_1', type: 'action', config: { type: 'send_membership_reminder', message: `Hi {first_name}, your {business_name} membership expires soon. Renew to keep your perks!` } },
          ],
        }),
      };
    }

    if (p.includes('welcome')) {
      return {
        message: 'I can build that.\n\nI\u2019ll create a workflow that:\n\n1. Fires when a new customer joins.\n2. Sends a welcome message.',
        definition: toCanonicalDefinition({
          ...base,
          name: 'New Customer Welcome',
          description: 'After a new customer joins, send a welcome message.',
          trigger: { type: 'customer_created', params: {} },
          steps: [
            { id: 'step_1', type: 'action', config: { type: 'send_whatsapp', message: `Welcome to {business_name}, {first_name}! We're thrilled to have you.` } },
          ],
        }),
      };
    }

    if (p.includes('no-show') || p.includes('missed')) {
      return {
        message: 'I can build that.\n\nI\u2019ll create a workflow that:\n\n1. Fires when an appointment is marked no-show.\n2. Sends a friendly follow-up to rebook.',
        definition: toCanonicalDefinition({
          ...base,
          name: 'No-Show Follow-Up',
          description: 'If a customer misses an appointment, send a follow-up message.',
          trigger: { type: 'appointment_no_show', params: {} },
          steps: [
            { id: 'step_1', type: 'action', config: { type: 'send_rebooking_message', message: `Hi {first_name}, we missed you at {business_name}. Want to reschedule?` } },
          ],
        }),
      };
    }

    if (
      p.includes('win-back') ||
      p.includes('win back') ||
      p.includes('inactive') ||
      p.includes("haven't visited") ||
      p.includes('have not visited') ||
      p.includes('not visited') ||
      p.includes('hasn\u2019t visited') ||
      p.includes('re-engage') ||
      p.includes('re engage')
    ) {
      const days = /\b(\d+)\s*days?\b/i.exec(p)?.[1] || '30';
      return {
        message: `I can build that.\n\nI\u2019ll create a workflow that:\n\n1. Finds customers inactive for ${days} days.\n2. Sends a win-back WhatsApp message.\n3. Waits 7 days.\n4. Checks whether the customer returned.\n5. Sends a reward to customers who still haven't returned.`,
        definition: toCanonicalDefinition({
          ...base,
          name: `${days}-Day Win-Back`,
          description: `Bring back customers who haven't visited in ${days} days.`,
          trigger: { type: 'customer_inactive', params: { days: Number(days) } },
          steps: [
            { id: 'step_1', type: 'action', config: { type: 'send_whatsapp', message: `We miss you at {business_name}, {first_name}! Here's a treat to welcome you back.` } },
            { id: 'step_2', type: 'delay', config: { duration: '7d' } },
            { id: 'step_3', type: 'condition', config: { condition: 'last_visit_days', operator: 'gte', value: 7 } },
            { id: 'step_4', type: 'action', config: { type: 'create_reward', name: 'Win-Back Reward', value: '₹200 OFF', message: `Still thinking about us? Enjoy ₹200 OFF your next visit, {first_name}.` } },
          ],
        }),
      };
    }

    return {
      message:
        "I can help you automate that. To build a precise workflow, tell me:\n\n1. When should it run? (e.g. a customer hasn't visited for 30 days, a birthday, an appointment is completed)\n2. What should happen? (e.g. send a WhatsApp message, create a reward, add a tag)\n3. Any waits or conditions in between?",
      needsClarification: true,
      clarification: "Please add the trigger event and the action(s) you'd like to run.",
    };
  }

  private ruleBasedEdit(def: WorkflowDefinition, instruction: string): AiWorkflowReply {
    const nodes = def.nodes.map((n) => ({ ...n, config: { ...(n.config || {}) } }));
    const i = instruction.toLowerCase();

    const delayMatch = /wait|delay|after\s+(\d+)\s*(day|hour|minute|week)s?/.exec(i);
    if (delayMatch) {
      const num = parseInt(delayMatch[1], 10);
      const unit = delayMatch[2] === 'week' ? 'd' : delayMatch[2][0];
      const dur = `${num}${unit}`;
      const delayNode = nodes.find((n) => n.type === 'delay');
      if (delayNode) {
        delayNode.config!.duration = dur;
        delayNode.label = `Wait ${dur}`;
        return {
          message: `Done. I've updated the wait to ${dur}.`,
          definition: { ...def, nodes },
        };
      }
      return {
        message: 'I can add that wait. I\u2019ve inserted a delay step into the workflow.',
        definition: { ...def, nodes: [...nodes, { id: `step_${nodes.length + 1}`, type: 'delay', label: `Wait ${dur}`, config: { duration: dur } }] },
      };
    }

    if (i.includes('remove') || i.includes('delete') || i.includes('drop')) {
      const target = i.match(/remove\s+(?:the\s+)?([a-z\s]+)/)?.[1];
      const idx = target
        ? nodes.findIndex((n) => n.label.toLowerCase().includes(target.trim()) || String(n.config?.type || '').toLowerCase().includes(target.trim()))
        : -1;
      if (idx >= 0) {
        const [removed] = nodes.splice(idx, 1);
        return {
          message: `Done. I removed the "${removed.label}" step.`,
          definition: { ...def, nodes },
        };
      }
    }

    if (i.includes('whatsapp')) {
      const msgNode = nodes.find((n) => n.type === 'action');
      if (msgNode) {
        msgNode.config!.type = 'send_whatsapp';
        msgNode.config!.channel = 'WHATSAPP';
        msgNode.label = 'Send WhatsApp';
        return {
          message: 'Done. I updated the message to go over WhatsApp.',
          definition: { ...def, nodes },
        };
      }
    }

    if (i.includes('email')) {
      const msgNode = nodes.find((n) => n.type === 'action');
      if (msgNode) {
        msgNode.config!.type = 'send_email';
        msgNode.config!.channel = 'EMAIL';
        msgNode.label = 'Send email';
        return {
          message: 'Done. I updated the message to go over email.',
          definition: { ...def, nodes },
        };
      }
    }

    if (i.includes('₹') || i.includes('reward')) {
      const val = i.match(/₹?\s*(\d+)/);
      const rewardNode = nodes.find((n) => n.type === 'action' && n.config?.type === 'create_reward');
      if (rewardNode && val) {
        rewardNode.config!.reward = `₹${val[1]} OFF`;
        rewardNode.label = 'Create reward';
        return {
          message: `Done. I updated the reward value to ₹${val[1]} OFF.`,
          definition: { ...def, nodes },
        };
      }
    }

    if (i.includes('pause')) {
      return {
        message: 'Pause toggles the workflow status — you can pause it from the workflow actions.',
        needsClarification: true,
      };
    }

    if (i.includes('explain') || i.includes('what will this do')) {
      return {
        message: this.ruleBasedExplain(def),
      };
    }

    return {
      message: 'I can update that. Could you rephrase the change — e.g. "make the wait 14 days", "send email first", "remove the SMS step"?',
      needsClarification: true,
      clarification: 'Please rephrase the edit as a simple instruction.',
    };
  }

  private ruleBasedExplain(def: WorkflowDefinition): string {
    const trigger = def.trigger;
    const parts: string[] = [];
    if (trigger.type) {
      parts.push(`This workflow triggers on **${TRIGGER_LABELS[trigger.type] || trigger.type}**`);
      const params = trigger.params as Record<string, number>;
      if (trigger.type === 'customer_inactive' && params?.days) parts.push(` (inactive for ${params.days} days)`);
    }
    parts.push('.');
    const steps = def.nodes.filter((n) => n.type !== 'trigger' && n.type !== 'end');
    if (steps.length) parts.push(` It then ${steps.map((s) => this.describeNode(s).toLowerCase()).join(', ')}.`);
    return parts.join('').replace(/\s+/g, ' ').trim();
  }

  private titleCase(s: string): string {
    const clean = s.replace(/\s+/g, ' ').trim();
    if (clean.length <= 40) return clean;
    return `${clean.slice(0, 37)}…`;
  }
}
