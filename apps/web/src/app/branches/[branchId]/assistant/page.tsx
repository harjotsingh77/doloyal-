"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, Sparkles } from "lucide-react";
import { PageHeader, Button, Input, Badge } from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import {
  getBranchKpis,
  getBranches,
  getBranch,
} from "@/lib/branches";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How much revenue today?",
  "How many appointments this week?",
  "Who are my at-risk customers?",
  "Compare with Whitefield",
  "What is my best selling service?",
];

function fmtINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function answer(query: string, branchId: string): string {
  const k = getBranchKpis(branchId);
  const branchName = k.branch.name;
  const q = query.toLowerCase();

  // Other-branch comparison
  const otherBranches = getBranches().filter((b) => b.id !== branchId);
  const mentionsOther = otherBranches.find((b) =>
    q.includes(b.name.toLowerCase().split(" ")[0]),
  );
  if ((q.includes("compare") || q.includes("vs") || q.includes("versus")) && mentionsOther) {
    const other = getBranchKpis(mentionsOther.id);
    const revDelta = ((k.revenueToday - other.revenueToday) / Math.max(1, other.revenueToday)) * 100;
    const sign = revDelta >= 0 ? "ahead" : "behind";
    return (
      `### Branch comparison\n\n` +
      `| Metric | **${branchName}** | **${other.branch.name}** |\n` +
      `|---|---|---|\n` +
      `| Revenue today | ${fmtINR(k.revenueToday)} | ${fmtINR(other.revenueToday)} |\n` +
      `| Appointments today | ${k.appointmentsToday} | ${other.appointmentsToday} |\n` +
      `| Customers | ${k.customers} | ${other.customers} |\n` +
      `| Avg ticket | ${fmtINR(k.avgTicket)} | ${fmtINR(other.avgTicket)} |\n` +
      `| Google rating | ${k.googleRating} ★ | ${other.googleRating} ★ |\n\n` +
      `**${branchName}** is ${Math.abs(revDelta).toFixed(0)}% ${sign} on revenue today.`
    );
  }

  if (q.includes("revenue")) {
    return `**${branchName}** generated **${fmtINR(k.revenueToday)}** today across ${k.appointmentsToday} appointments. In the last 30 days the branch brought in **${fmtINR(k.revenue30d)}** at an average ticket of **${fmtINR(k.avgTicket)}**, growing **${k.monthlyGrowth}%** month over month.`;
  }

  if (q.includes("appointment") || q.includes("booking")) {
    return `**${branchName}** has **${k.appointmentsToday}** appointments today. Of recent bookings, **${k.cancelled}** were cancelled or no-shows. **${k.topStaff}** is the top-performing staff member by bookings.`;
  }

  if (q.includes("customer") || q.includes("at-risk") || q.includes("at risk")) {
    return `**${branchName}** has **${k.customers}** customers — **${k.newCustomers}** new and **${k.repeatCustomers}** repeat. **${k.loyaltyMembers}** are active loyalty members. Conversion rate is **${k.conversionRate}%** and retention is strong at this location.`;
  }

  if (q.includes("service") || q.includes("sell") || q.includes("best")) {
    return `**${branchName}**'s top selling service is **${k.topService}**, led by **${k.topStaff}** who drives the most revenue. Average ticket size is **${fmtINR(k.avgTicket)}**.`;
  }

  if (q.includes("staff") || q.includes("team") || q.includes("employee")) {
    return `**${branchName}** runs with **${k.activeStaff}** staff members, **${k.presentStaff}** of them present today. **${k.topStaff}** is the highest performer.`;
  }

  if (q.includes("rating") || q.includes("review") || q.includes("google")) {
    return `**${branchName}** holds a **${k.googleRating}★** Google rating across **${k.reviews}** reviews — a strong signal for local discovery on this branch.`;
  }

  if (q.includes("loyalty") || q.includes("points") || q.includes("member")) {
    return `**${branchName}** counts **${k.loyaltyMembers}** loyalty members among its ${k.customers} customers. Monthly retention performance is healthy for this location.`;
  }

  return (
    `I'm working in the context of **${branchName}**. ` +
    `Here's a snapshot:\n\n` +
    `- Revenue today: **${fmtINR(k.revenueToday)}**\n` +
    `- Appointments today: **${k.appointmentsToday}**\n` +
    `- Customers: **${k.customers}** (${k.newCustomers} new)\n` +
    `- Avg ticket: **${fmtINR(k.avgTicket)}**\n` +
    `- Conversion: **${k.conversionRate}%**\n` +
    `- Google rating: **${k.googleRating}★**\n\n` +
    `Ask me about revenue, customers, appointments, staff, services, or ratings — all scoped to this branch.`
  );
}

export default function BranchAssistantPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt } = useCurrency();
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [thinking, setThinking] = React.useState(false);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !branchId) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: "assistant", content: answer(trimmed, branchId) },
      ]);
      setThinking(false);
    }, 650);
  };

  if (!selectedBranch) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doloyal AI"
        description={`Ask about ${selectedBranch.name} — the AI already knows this branch.`}
        actions={
          <Badge variant="primary">
            <Sparkles className="h-3.5 w-3.5" />
            Context: {selectedBranch.name}
          </Badge>
        }
      />

      <div className="flex h-[560px] flex-col overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <div className="border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2)/0.6)] px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--color-primary)/0.1)] px-2.5 py-1 text-xs font-medium text-[rgb(var(--color-primary))]">
            <Bot className="h-3.5 w-3.5" />
            Branch context loaded · {selectedBranch.name} · {fmt(kpis(selectedBranch.id).revenueToday)} today
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                <Bot className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium">Ask about {selectedBranch.name}</p>
              <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                Example: &quot;How much revenue today?&quot; — or &quot;Compare with Whitefield&quot;
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[rgb(var(--color-muted))]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} />
          ))}

          {thinking && (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-muted-foreground))]">
              <span className="flex gap-1">
                <Dot delay={0} /><Dot delay={0.15} /><Dot delay={0.3} />
              </span>
              Analysing {selectedBranch.name} data…
            </div>
          )}
        </div>

        <div className="border-t border-[rgb(var(--color-border))] p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Ask about ${selectedBranch.name}…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              className="flex-1"
            />
            <Button onClick={() => send(input)} loading={thinking}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--color-primary))]"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl bg-[rgb(var(--color-primary))] px-4 py-2.5 text-sm text-white">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-4 py-3">
        <div className="prose prose-sm max-w-none prose-headings:text-[rgb(var(--color-foreground))] prose-p:text-[rgb(var(--color-foreground))] prose-strong:text-[rgb(var(--color-foreground))] prose-checks">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

// placeholder to keep default export simple and typed
function kpis(id: string) {
  return getBranchKpis(id);
}