"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Download,
  Upload,
  Pencil,
  Copy,
  Archive,
  Trash2,
  RefreshCw,
  Play,
  X,
  Search,
} from "lucide-react";
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Field,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  cn,
} from "@doloyal/ui";
import {
  REWARD_CATEGORIES,
  REWARD_CATEGORY_LABELS,
  REWARD_TYPES,
  REWARD_STATUS,
  type Reward,
  type RewardCategory,
  type RewardProgramConfig,
  type RewardsOverview,
  type RewardRedemption,
  type CreateRewardInput,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";

const TABS: Array<{ key: RewardCategory | "HISTORY"; label: string }> = [
  ...REWARD_CATEGORIES.map((key) => ({ key, label: REWARD_CATEGORY_LABELS[key] })),
  { key: "HISTORY" as const, label: "Redemption History" },
];

const PROGRAM_TABS = new Set([
  "BIRTHDAY",
  "ANNIVERSARY",
  "REVIEW",
  "SOCIAL",
  "WHATSAPP",
  "CASHBACK",
]);

function statusColor(status: string) {
  if (status === "ACTIVE") return "success";
  if (status === "DRAFT") return "warning";
  if (status === "ARCHIVED") return "outline";
  return "default";
}

export default function RewardsPage() {
  const { format } = useCurrency();
  const [tab, setTab] = React.useState<string>("STANDARD");
  const [loading, setLoading] = React.useState(true);
  const [overview, setOverview] = React.useState<RewardsOverview | null>(null);
  const [rewards, setRewards] = React.useState<Reward[]>([]);
  const [programs, setPrograms] = React.useState<RewardProgramConfig[]>([]);
  const [redemptions, setRedemptions] = React.useState<RewardRedemption[]>([]);
  const [search, setSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Reward | null>(null);
  const [programDraft, setProgramDraft] = React.useState<Record<string, unknown>>({});
  const [savingProgram, setSavingProgram] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const category = tab !== "HISTORY" && tab !== "ALL" ? tab : undefined;
      const [ov, list, progs, reds] = await Promise.all([
        api.getRewardsOverview(),
        tab === "HISTORY"
          ? Promise.resolve([])
          : api.listRewards({ category, search: search || undefined }),
        api.listRewardPrograms(),
        api.getRedemptions({ page: 1, pageSize: 50, search: search || undefined }),
      ]);
      setOverview(ov);
      setRewards(list as Reward[]);
      setPrograms(progs);
      setRedemptions(reds.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!PROGRAM_TABS.has(tab)) return;
    const prog = programs.find((p) => p.programType === tab);
    setProgramDraft({ ...(prog?.config || {}), enabled: prog?.enabled ?? false });
  }, [tab, programs]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (r: Reward) => {
    setEditing(r);
    setDrawerOpen(true);
  };

  const saveProgram = async () => {
    try {
      setSavingProgram(true);
      const { enabled, ...config } = programDraft;
      await api.updateRewardProgram(tab, {
        enabled: !!enabled,
        config: config as Record<string, unknown>,
      });
      toast.success("Program settings saved");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingProgram(false);
    }
  };

  const runAutomation = async () => {
    try {
      const res =
        tab === "BIRTHDAY"
          ? await api.runBirthdayRewards()
          : await api.runAnniversaryRewards();
      toast.success(`Issued ${res.issued} rewards (${res.processed} checked)`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Automation failed");
    }
  };

  const exportCsv = async () => {
    try {
      const { blob, filename } = await api.exportRedemptions();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows = lines.slice(1);
      let created = 0;
      for (const line of rows) {
        const [name, category, rewardType, pointsCost, rewardValue] = line
          .split(",")
          .map((s) => s.replace(/^"|"$/g, "").trim());
        if (!name) continue;
        await api.createReward({
          name,
          category: (category || "STANDARD") as any,
          rewardType: (rewardType || "CUSTOM") as any,
          pointsCost: Number(pointsCost || 0),
          rewardValue: Number(rewardValue || 0),
          status: "DRAFT",
          validityDays: 90,
        });
        created++;
      }
      toast.success(`Imported ${created} rewards`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    }
  };

  const stats = [
    { label: "Total Rewards", value: overview?.totalRewards ?? 0 },
    { label: "Active Rewards", value: overview?.activeRewards ?? 0 },
    { label: "Redeemed Rewards", value: overview?.redeemedRewards ?? 0 },
    { label: "Pending Rewards", value: overview?.pendingRewards ?? 0 },
    { label: "Cashback Issued", value: format(overview?.cashbackIssued ?? 0) },
    { label: "Birthday Rewards Sent", value: overview?.birthdayRewardsSent ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Rewards</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, manage and automate all customer rewards.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="secondary" size="sm" type="button" onClick={(e) => {
              const input = (e.currentTarget.previousElementSibling || e.currentTarget.parentElement?.querySelector("input")) as HTMLInputElement | null;
              input?.click();
            }}>
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
          </label>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Create Reward
          </Button>
        </div>
      </header>

      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loading && !overview
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          : stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {s.value}
                </p>
              </div>
            ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition",
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="max-w-md pl-9"
          placeholder="Search rewards or redemptions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Program config for automated categories */}
      {PROGRAM_TABS.has(tab) ? (
        <ProgramPanel
          programType={tab}
          draft={programDraft}
          setDraft={setProgramDraft}
          saving={savingProgram}
          onSave={saveProgram}
          onRun={
            tab === "BIRTHDAY" || tab === "ANNIVERSARY" ? runAutomation : undefined
          }
        />
      ) : null}

      {(tab === "REVIEW" || tab === "SOCIAL" || tab === "WHATSAPP") && (
        <ClaimsPanel programType={tab} />
      )}

      {tab === "CASHBACK" && <CashbackQuickPanel onDone={load} />}

      {tab === "HISTORY" ? (
        <RedemptionTable rows={redemptions} loading={loading} onExport={exportCsv} />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-900">No rewards in this category</p>
          <p className="mt-1 text-sm text-slate-500">Create a reward to get started.</p>
          <Button className="mt-4" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Create Reward
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {rewards.map((r) => (
              <RewardCard
                key={r.id}
                reward={r}
                onEdit={() => openEdit(r)}
                onDuplicate={async () => {
                  try {
                    await api.duplicateReward(r.id);
                    toast.success("Duplicated");
                    load();
                  } catch (e: any) {
                    toast.error(e?.message || "Duplicate failed");
                  }
                }}
                onArchive={async () => {
                  try {
                    await api.archiveReward(r.id);
                    toast.success("Archived");
                    load();
                  } catch (e: any) {
                    toast.error(e?.message || "Archive failed");
                  }
                }}
                onDelete={async () => {
                  if (!confirm("Delete this reward permanently?")) return;
                  try {
                    await api.deleteReward(r.id, true);
                    toast.success("Deleted");
                    load();
                  } catch (e: any) {
                    toast.error(e?.message || "Delete failed — try archive");
                  }
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <RewardDrawer
        open={drawerOpen}
        reward={editing}
        defaultCategory={(tab !== "HISTORY" ? tab : "STANDARD") as RewardCategory}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          load();
        }}
      />
    </div>
  );
}

function ClaimsPanel({ programType }: { programType: string }) {
  const [claims, setClaims] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setClaims(await api.listRewardClaims(programType));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, [programType]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Pending & recent claims</h3>
        <Button variant="secondary" size="sm" onClick={load}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : claims.length === 0 ? (
        <p className="text-sm text-slate-500">No claims yet.</p>
      ) : (
        <div className="space-y-2">
          {claims.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{c.customerName}</p>
                <p className="text-xs text-slate-500">
                  {c.rewardPoints} pts · {c.status} · {c.createdAt?.slice?.(0, 10)}
                </p>
              </div>
              {c.status === "PENDING" ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await api.reviewRewardClaim(c.id, true);
                      toast.success("Approved");
                      load();
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await api.reviewRewardClaim(c.id, false);
                      toast.success("Rejected");
                      load();
                    }}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <Badge variant="outline">{c.status}</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CashbackQuickPanel({ onDone }: { onDone: () => void }) {
  const [customerId, setCustomerId] = React.useState("");
  const [points, setPoints] = React.useState("100");
  const [q, setQ] = React.useState("");
  const [customers, setCustomers] = React.useState<any[]>([]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Convert points to cashback</h3>
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search customer…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              setCustomers(await api.searchLoyaltyCustomers(q));
            } catch (e: any) {
              toast.error(e?.message || "Search failed");
            }
          }}
        >
          Search
        </Button>
        <Input
          className="w-28"
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!customerId}
          onClick={async () => {
            try {
              const res = await api.redeemCashback({
                customerId,
                points: Number(points),
              });
              toast.success(`Cashback ₹${res.cashbackAmount} issued`);
              onDone();
            } catch (e: any) {
              toast.error(e?.message || "Cashback failed");
            }
          }}
        >
          Redeem
        </Button>
      </div>
      {customers.length > 0 && (
        <div className="mt-3 max-h-32 space-y-1 overflow-auto">
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                "block w-full rounded-lg px-3 py-2 text-left text-sm",
                customerId === c.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50",
              )}
              onClick={() => setCustomerId(c.id)}
            >
              {c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim()} · {c.pointsBalance ?? 0}{" "}
              pts · wallet ₹{c.cashbackBalance ?? 0}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RewardCard({
  reward,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  reward: Reward;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">{reward.name}</h3>
          <Badge variant={statusColor(reward.status) as any}>{reward.status}</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {reward.category} · {reward.rewardType}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Points</p>
            <p className="font-medium text-slate-800">{reward.pointsCost}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Remaining</p>
            <p className="font-medium text-slate-800">
              {reward.remainingQuantity == null ? "Unlimited" : reward.remainingQuantity}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Redeemed</p>
            <p className="font-medium text-slate-800">{reward.redeemedCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Expiry</p>
            <p className="font-medium text-slate-800">
              {reward.expiresAt ? reward.expiresAt.slice(0, 10) : "—"}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </Button>
        <Button variant="ghost" size="sm" onClick={onArchive}>
          <Archive className="h-3.5 w-3.5" /> Archive
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </motion.div>
  );
}

function ProgramPanel({
  programType,
  draft,
  setDraft,
  saving,
  onSave,
  onRun,
}: {
  programType: string;
  draft: Record<string, unknown>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  saving: boolean;
  onSave: () => void;
  onRun?: () => void;
}) {
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
            Automation
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            {REWARD_CATEGORY_LABELS[programType as RewardCategory] || programType} settings
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Switch checked={!!draft.enabled} onCheckedChange={(v) => set("enabled", v)} />
            Enabled
          </label>
          {onRun ? (
            <Button variant="secondary" size="sm" onClick={onRun}>
              <Play className="h-3.5 w-3.5" /> Run now
            </Button>
          ) : null}
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {programType === "BIRTHDAY" && (
          <>
            <Field label="Reward Type">
              <Select
                value={String(draft.rewardType || "POINTS")}
                onValueChange={(v) => set("rewardType", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["POINTS", "COUPON", "FREE_SERVICE", "GIFT"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Num label="Bonus Points" value={Number(draft.bonusPoints ?? 100)} onChange={(n) => set("bonusPoints", n)} />
            <Num label="Validity (days)" value={Number(draft.validityDays ?? 14)} onChange={(n) => set("validityDays", n)} />
            <Num label="Days Before Birthday" value={Number(draft.daysBefore ?? 0)} onChange={(n) => set("daysBefore", n)} />
            <Num label="Days After Birthday" value={Number(draft.daysAfter ?? 0)} onChange={(n) => set("daysAfter", n)} />
            <Toggle label="Send Automatically" checked={draft.sendAutomatically !== false} onChange={(v) => set("sendAutomatically", v)} />
            <Toggle label="Email Notification" checked={!!draft.emailNotification} onChange={(v) => set("emailNotification", v)} />
            <Toggle label="SMS Notification" checked={!!draft.smsNotification} onChange={(v) => set("smsNotification", v)} />
            <Toggle label="WhatsApp Notification" checked={!!draft.whatsappNotification} onChange={(v) => set("whatsappNotification", v)} />
          </>
        )}
        {programType === "ANNIVERSARY" && (
          <>
            <Num label="Bonus Points" value={Number(draft.bonusPoints ?? 250)} onChange={(n) => set("bonusPoints", n)} />
            <Num label="Years Required" value={Number(draft.yearsRequired ?? 1)} onChange={(n) => set("yearsRequired", n)} />
            <Num label="Validity (days)" value={Number(draft.validityDays ?? 30)} onChange={(n) => set("validityDays", n)} />
            <Toggle label="Automatic Delivery" checked={draft.automaticDelivery !== false} onChange={(v) => set("automaticDelivery", v)} />
          </>
        )}
        {programType === "REVIEW" && (
          <>
            <Num label="Points Reward" value={Number(draft.pointsReward ?? 50)} onChange={(n) => set("pointsReward", n)} />
            <Num label="Minimum Rating" value={Number(draft.minimumRating ?? 4)} onChange={(n) => set("minimumRating", n)} />
            <Field label="Verification Method">
              <Select
                value={String(draft.verificationMethod || "manual")}
                onValueChange={(v) => set("verificationMethod", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Toggle label="One Reward Per Customer" checked={draft.oneRewardPerCustomer !== false} onChange={(v) => set("oneRewardPerCustomer", v)} />
            <Toggle label="Approval Required" checked={draft.approvalRequired !== false} onChange={(v) => set("approvalRequired", v)} />
          </>
        )}
        {programType === "SOCIAL" && (
          <>
            <Num label="Points" value={Number(draft.points ?? 30)} onChange={(n) => set("points", n)} />
            <Num label="Max Rewards / Customer" value={Number(draft.maxRewardsPerCustomer ?? 5)} onChange={(n) => set("maxRewardsPerCustomer", n)} />
            <Num label="Validity (days)" value={Number(draft.validityDays ?? 30)} onChange={(n) => set("validityDays", n)} />
            <Field label="Verification">
              <Input
                value={String(draft.verification || "manual")}
                onChange={(e) => set("verification", e.target.value)}
              />
            </Field>
          </>
        )}
        {programType === "WHATSAPP" && (
          <>
            <Num label="Bonus Points" value={Number(draft.bonusPoints ?? 50)} onChange={(n) => set("bonusPoints", n)} />
            <Num label="Expiry (days)" value={Number(draft.expiryDays ?? 30)} onChange={(n) => set("expiryDays", n)} />
            <div className="sm:col-span-2">
              <Field label="Message Template">
                <Textarea
                  value={String(draft.messageTemplate || "")}
                  onChange={(e) => set("messageTemplate", e.target.value)}
                />
              </Field>
            </div>
            <Toggle label="Automation" checked={draft.automation !== false} onChange={(v) => set("automation", v)} />
          </>
        )}
        {programType === "CASHBACK" && (
          <>
            <Num label="Conversion Rate (₹ / point)" value={Number(draft.conversionRate ?? 0.1)} onChange={(n) => set("conversionRate", n)} step="0.01" />
            <Num label="Minimum Points" value={Number(draft.minimumPoints ?? 100)} onChange={(n) => set("minimumPoints", n)} />
            <Num label="Maximum Cashback" value={Number(draft.maximumCashback ?? 2000)} onChange={(n) => set("maximumCashback", n)} />
            <Num label="Expiry (days)" value={Number(draft.expiryDays ?? 90)} onChange={(n) => set("expiryDays", n)} />
            <Field label="Eligible Customers">
              <Input
                value={String(draft.eligibleCustomers || "all")}
                onChange={(e) => set("eligibleCustomers", e.target.value)}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </Field>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function RedemptionTable({
  rows,
  loading,
  onExport,
}: {
  rows: RewardRedemption[];
  loading: boolean;
  onExport: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-medium text-slate-900">Redemption History</p>
        <Button variant="secondary" size="sm" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </div>
      {loading ? (
        <div className="p-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">No redemptions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Cashback</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.customerName}</TableCell>
                  <TableCell>{r.rewardName}</TableCell>
                  <TableCell>{r.category || "—"}</TableCell>
                  <TableCell>{r.pointsUsed}</TableCell>
                  <TableCell>{r.cashbackAmount || "—"}</TableCell>
                  <TableCell>{r.branchName || "—"}</TableCell>
                  <TableCell>{r.createdAt.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.transactionId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function RewardDrawer({
  open,
  reward,
  defaultCategory,
  onClose,
  onSaved,
}: {
  open: boolean;
  reward: Reward | null;
  defaultCategory: RewardCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    category: defaultCategory as string,
    rewardType: "CUSTOM",
    imageUrl: "",
    pointsCost: "0",
    rewardValue: "0",
    totalQuantity: "",
    unlimitedStock: true,
    validityDays: "90",
    tierRequired: "",
    membershipRequired: "",
    startsAt: "",
    expiresAt: "",
    status: "DRAFT",
    terms: "",
  });

  React.useEffect(() => {
    if (!open) return;
    if (reward) {
      setForm({
        name: reward.name,
        description: reward.description || "",
        category: reward.category || "STANDARD",
        rewardType: reward.rewardType || "CUSTOM",
        imageUrl: reward.imageUrl || "",
        pointsCost: String(reward.pointsCost ?? 0),
        rewardValue: String(reward.rewardValue ?? 0),
        totalQuantity: reward.totalQuantity != null ? String(reward.totalQuantity) : "",
        unlimitedStock: reward.totalQuantity == null,
        validityDays: String(reward.validityDays ?? 90),
        tierRequired: reward.tierRequired || "",
        membershipRequired: reward.membershipRequired || "",
        startsAt: reward.startsAt?.slice(0, 10) || "",
        expiresAt: reward.expiresAt?.slice(0, 10) || "",
        status: reward.status,
        terms: reward.terms || "",
      });
    } else {
      setForm({
        name: "",
        description: "",
        category: defaultCategory,
        rewardType: "CUSTOM",
        imageUrl: "",
        pointsCost: "0",
        rewardValue: "0",
        totalQuantity: "",
        unlimitedStock: true,
        validityDays: "90",
        tierRequired: "",
        membershipRequired: "",
        startsAt: "",
        expiresAt: "",
        status: "DRAFT",
        terms: "",
      });
    }
  }, [open, reward, defaultCategory]);

  const save = async (publish?: boolean) => {
    if (!form.name.trim()) {
      toast.error("Reward name is required");
      return;
    }
    const payload: CreateRewardInput = {
      name: form.name.trim(),
      description: form.description || undefined,
      category: form.category as any,
      rewardType: form.rewardType as any,
      imageUrl: form.imageUrl || undefined,
      pointsCost: Number(form.pointsCost || 0),
      rewardValue: Number(form.rewardValue || 0),
      unlimitedStock: form.unlimitedStock,
      totalQuantity: form.unlimitedStock ? null : Number(form.totalQuantity || 0),
      validityDays: Number(form.validityDays || 90),
      tierRequired: form.tierRequired || null,
      membershipRequired: form.membershipRequired || null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      status: (publish ? "ACTIVE" : form.status) as any,
      terms: form.terms || undefined,
    };
    try {
      setSaving(true);
      if (reward) await api.updateReward(reward.id, payload);
      else await api.createReward(payload);
      toast.success(publish ? "Reward published" : "Reward saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 bg-slate-900/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                  {reward ? "Edit" : "Create"} Reward
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  {reward?.name || "New reward"}
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <Field label="Reward Name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REWARD_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {REWARD_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Reward Type">
                  <Select
                    value={form.rewardType}
                    onValueChange={(v) => setForm({ ...form, rewardType: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Image URL">
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </Field>
              <Field label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Points Required">
                  <Input
                    type="number"
                    value={form.pointsCost}
                    onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                  />
                </Field>
                <Field label="Reward Value">
                  <Input
                    type="number"
                    value={form.rewardValue}
                    onChange={(e) => setForm({ ...form, rewardValue: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-sm">Unlimited Stock</span>
                <Switch
                  checked={form.unlimitedStock}
                  onCheckedChange={(v) => setForm({ ...form, unlimitedStock: v })}
                />
              </div>
              {!form.unlimitedStock ? (
                <Field label="Stock">
                  <Input
                    type="number"
                    value={form.totalQuantity}
                    onChange={(e) => setForm({ ...form, totalQuantity: e.target.value })}
                  />
                </Field>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Customer Tier">
                  <Input
                    value={form.tierRequired}
                    onChange={(e) => setForm({ ...form, tierRequired: e.target.value })}
                    placeholder="e.g. Gold"
                  />
                </Field>
                <Field label="Membership">
                  <Input
                    value={form.membershipRequired}
                    onChange={(e) => setForm({ ...form, membershipRequired: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />
                </Field>
                <Field label="Expiry Date">
                  <Input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REWARD_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Terms">
                <Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
              </Field>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Preview</p>
                <p className="mt-1">{form.name || "Untitled reward"}</p>
                <p className="text-xs text-slate-500">
                  {form.category} · {form.pointsCost} pts · {form.unlimitedStock ? "Unlimited" : `${form.totalQuantity} stock`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <Button variant="secondary" className="flex-1" onClick={() => save(false)} disabled={saving}>
                Save Draft
              </Button>
              <Button className="flex-1" onClick={() => save(true)} disabled={saving}>
                Publish
              </Button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
