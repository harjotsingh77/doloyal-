"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Wand2 } from "lucide-react";
import { Button, Input, Field, Badge, Textarea } from "@doloyal/ui";
import { api } from "@/lib/api";
import {
  ModuleShell,
  ModuleCard,
  ModuleLoading,
  ModuleEmpty,
  type LoyaltyModuleProps,
} from "@/components/loyalty/module-shell";
import { createEntityModule } from "./entity-module";

export function TiersModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [tiers, setTiers] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getLoyaltyTiers();
      setTiers(data || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load tiers");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <ModuleShell
      feature={feature}
      onConfigure={onConfigure}
      actions={
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      }
    >
      {loading ? (
        <ModuleLoading />
      ) : tiers.length === 0 ? (
        <ModuleEmpty title="No tiers yet" description="Create tier levels with multipliers and benefits." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tiers.map((t) => (
            <ModuleCard key={t.id}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900">{t.name}</p>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: t.color || "#2563eb" }}
                />
              </div>
              <p className="text-sm text-slate-500">
                Min {t.minPoints ?? 0} pts · {t.pointsMultiplier ?? 1}× multiplier
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {(t.benefits || []).slice(0, 4).map((b: string) => (
                  <Badge key={b} variant="outline">
                    {b}
                  </Badge>
                ))}
              </div>
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}

export function ChallengesModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState({
    title: "",
    type: "VISITS",
    targetValue: "3",
    rewardPoints: "100",
    description: "",
  });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setItems((await api.getLoyaltyChallenges()) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      setSaving(true);
      await api.createLoyaltyChallenge({
        title: draft.title,
        type: draft.type,
        targetValue: Number(draft.targetValue),
        rewardPoints: Number(draft.rewardPoints),
        description: draft.description,
      });
      toast.success("Challenge created");
      setDraft({ title: "", type: "VISITS", targetValue: "3", rewardPoints: "100", description: "" });
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModuleShell
      feature={feature}
      onConfigure={onConfigure}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                await api.generateLoyaltyChallenge();
                toast.success("Challenge generated");
                await load();
              } catch (e: any) {
                toast.error(e?.message || "Generate failed");
              }
            }}
          >
            <Wand2 className="h-3.5 w-3.5" /> AI generate
          </Button>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </>
      }
    >
      <ModuleCard className="mb-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="Type (VISITS / SPEND / REFERRALS)">
            <Input value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
          </Field>
          <Field label="Target">
            <Input
              type="number"
              value={draft.targetValue}
              onChange={(e) => setDraft({ ...draft, targetValue: e.target.value })}
            />
          </Field>
          <Field label="Reward Points">
            <Input
              type="number"
              value={draft.rewardPoints}
              onChange={(e) => setDraft({ ...draft, rewardPoints: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Rules / Description">
          <Textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <Button size="sm" onClick={create} disabled={saving || !draft.title}>
          <Plus className="h-3.5 w-3.5" /> Create challenge
        </Button>
      </ModuleCard>

      {loading ? (
        <ModuleLoading />
      ) : items.length === 0 ? (
        <ModuleEmpty title="No active challenges" description="Create visit, spend, or referral challenges." />
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <ModuleCard key={c.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {c.type} · Target {c.targetValue} · Reward {c.rewardPoints} pts · {c.participantsCount ?? c._count?.participants ?? 0} participants
                </p>
              </div>
              <Badge variant="outline">{c.status}</Badge>
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}

export function BadgesModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [badges, setBadges] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState({ name: "", icon: "award", color: "#2563EB", description: "" });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setBadges((await api.getLoyaltyBadges()) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load badges");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      setSaving(true);
      await api.createLoyaltyBadge({
        name: draft.name,
        icon: draft.icon,
        color: draft.color,
        description: draft.description,
        criteria: { autoAssign: true },
      });
      toast.success("Badge created");
      setDraft({ name: "", icon: "award", color: "#2563EB", description: "" });
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      <ModuleCard className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Badge Name">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Icon">
          <Input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
        </Field>
        <Field label="Color">
          <Input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
        </Field>
        <Field label="Description">
          <Input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Button size="sm" onClick={create} disabled={saving || !draft.name}>
            <Plus className="h-3.5 w-3.5" /> Create badge
          </Button>
        </div>
      </ModuleCard>
      {loading ? (
        <ModuleLoading />
      ) : badges.length === 0 ? (
        <ModuleEmpty title="No badges" description="Create unlockable badges with auto-assign rules." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b) => (
            <ModuleCard key={b.id}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: b.color || "#2563eb" }}
                >
                  {(b.icon || "★").slice(0, 2)}
                </span>
                <p className="text-sm font-semibold text-slate-900">{b.name}</p>
              </div>
              <p className="text-xs text-slate-500">{b.description || "No description"}</p>
              <p className="mt-2 text-xs text-slate-400">{b.unlockCount ?? 0} unlocked</p>
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}

export function StreaksModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setData(await api.getLoyaltyStreaks());
      } catch (e: any) {
        toast.error(e?.message || "Failed to load streaks");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      {loading ? (
        <ModuleLoading />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <ModuleCard>
            <p className="text-xs uppercase tracking-wide text-slate-400">Active streaks</p>
            <p className="mt-2 text-3xl font-semibold">{data?.activeStreaks ?? 0}</p>
          </ModuleCard>
          <ModuleCard>
            <p className="text-xs uppercase tracking-wide text-slate-400">Top streak</p>
            <p className="mt-2 text-3xl font-semibold">{data?.topStreak ?? 0}</p>
          </ModuleCard>
          <ModuleCard>
            <p className="text-xs uppercase tracking-wide text-slate-400">Milestones</p>
            <p className="mt-2 text-3xl font-semibold">{data?.milestones?.length ?? 0}</p>
          </ModuleCard>
        </div>
      )}
    </ModuleShell>
  );
}

export function AnalyticsModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [analytics, setAnalytics] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setAnalytics(await api.getLoyaltyAnalytics());
      } catch (e: any) {
        toast.error(e?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      {loading ? (
        <ModuleLoading />
      ) : !analytics ? (
        <ModuleEmpty title="No analytics yet" description="Metrics appear after loyalty activity." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(analytics)
            .filter(([, v]) => typeof v === "number")
            .slice(0, 8)
            .map(([k, v]) => (
              <ModuleCard key={k}>
                <p className="text-xs uppercase tracking-wide text-slate-400">{k}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{String(v)}</p>
              </ModuleCard>
            ))}
        </div>
      )}
    </ModuleShell>
  );
}

export function ActivityFeedModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setItems((await api.getLoyaltyActivity(40)) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const cfg = feature.config || {};
    if (cfg.realtime) {
      const t = setInterval(load, 15000);
      return () => clearInterval(t);
    }
  }, [load, feature.config]);

  return (
    <ModuleShell
      feature={feature}
      onConfigure={onConfigure}
      actions={
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      }
    >
      {loading ? (
        <ModuleLoading />
      ) : items.length === 0 ? (
        <ModuleEmpty title="No activity yet" description="Live loyalty events will appear here." />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <ModuleCard key={a.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-900">{a.message || a.type}</p>
                <p className="mt-1 text-xs text-slate-400">{a.createdAt}</p>
              </div>
              <Badge variant="outline">{a.type}</Badge>
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}

export function AutomationsModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [rules, setRules] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState({
    name: "",
    trigger: "SPEND_THRESHOLD",
    action: "GIVE_POINTS",
    threshold: "5000",
    points: "500",
  });

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setRules((await api.getLoyaltyAutomations()) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load automations");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      await api.createLoyaltyAutomation({
        name: draft.name,
        trigger: draft.trigger,
        conditions: { spendGt: Number(draft.threshold) },
        actions: [{ type: draft.action, points: Number(draft.points) }],
        status: "ACTIVE",
      });
      toast.success("Automation created");
      setDraft({ name: "", trigger: "SPEND_THRESHOLD", action: "GIVE_POINTS", threshold: "5000", points: "500" });
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    }
  };

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      <ModuleCard className="mb-4 space-y-3">
        <p className="text-sm font-medium text-slate-900">IF / THEN builder</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Trigger">
            <Input value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value })} />
          </Field>
          <Field label="IF spend >">
            <Input
              type="number"
              value={draft.threshold}
              onChange={(e) => setDraft({ ...draft, threshold: e.target.value })}
            />
          </Field>
          <Field label="THEN give points">
            <Input
              type="number"
              value={draft.points}
              onChange={(e) => setDraft({ ...draft, points: e.target.value })}
            />
          </Field>
        </div>
        <Button size="sm" onClick={create} disabled={!draft.name}>
          <Plus className="h-3.5 w-3.5" /> Create automation
        </Button>
      </ModuleCard>
      {loading ? (
        <ModuleLoading />
      ) : rules.length === 0 ? (
        <ModuleEmpty title="No automations" description="Build IF/THEN loyalty rules that run on real events." />
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <ModuleCard key={r.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">{r.trigger}</p>
              </div>
              <Badge variant="outline">{r.status}</Badge>
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}

export function LedgerModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<any>(null);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.getLoyaltyLedger({ page, pageSize: 20, search: search || undefined }));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search ledger…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="secondary" size="sm" onClick={load}>
          Search
        </Button>
      </div>
      {loading ? (
        <ModuleLoading />
      ) : !data?.items?.length ? (
        <ModuleEmpty title="Ledger is empty" description="Point movements will appear here." />
      ) : (
        <div className="space-y-2">
          {data.items.map((row: any) => (
            <ModuleCard key={row.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{row.reason}</p>
                <p className="text-xs text-slate-400">{row.createdAt}</p>
              </div>
              <p className={`text-sm font-semibold ${row.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {row.amount >= 0 ? "+" : ""}
                {row.amount}
              </p>
            </ModuleCard>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= (data.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}

export function AdjustModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [q, setQ] = React.useState("");
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [points, setPoints] = React.useState("100");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const cfg = feature.config || {};

  const search = async () => {
    try {
      setCustomers((await api.searchLoyaltyCustomers(q)) || []);
    } catch (e: any) {
      toast.error(e?.message || "Search failed");
    }
  };

  const submit = async () => {
    if (cfg.reasonRequired !== false && !reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const pts = Number(points);
    const max = Number(cfg.maxAdjustment || 10000);
    if (Math.abs(pts) > max) {
      toast.error(`Adjustment exceeds maximum of ${max}`);
      return;
    }
    try {
      setSaving(true);
      await api.adjustPoints({ customerId, points: pts, reason });
      toast.success("Points adjusted");
      setReason("");
    } catch (e: any) {
      toast.error(e?.message || "Adjustment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      <ModuleCard className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Search customer…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="secondary" size="sm" onClick={search}>
            Search
          </Button>
        </div>
        {customers.length > 0 && (
          <div className="max-h-40 space-y-1 overflow-auto">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  customerId === c.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                }`}
                onClick={() => setCustomerId(c.id)}
              >
                {c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim()} · {c.pointsBalance ?? 0} pts
              </button>
            ))}
          </div>
        )}
        <Field label="Points (+/-)">
          <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
        </Field>
        <Field label="Reason">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button size="sm" disabled={!customerId || saving} onClick={submit}>
          Apply adjustment
        </Button>
      </ModuleCard>
    </ModuleShell>
  );
}

export function RewardsCategoryModule({
  feature,
  onConfigure,
  category,
}: LoyaltyModuleProps & { category: string }) {
  const [loading, setLoading] = React.useState(true);
  const [rewards, setRewards] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState({
    name: "",
    pointsCost: "500",
    discountVal: "10",
    description: "",
  });

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const all = (await api.listRewards()) || [];
      const cats: Record<string, string[]> = {
        coupon_rewards: ["DISCOUNT", "COUPON"],
        gift_card_rewards: ["GIFT_CARD"],
        vip_rewards: ["VIP"],
        custom_rewards: ["OTHER", "PRODUCT", "SERVICE", "EXPERIENCE", "CUSTOM"],
      };
      const allowed = cats[feature.key] || [category];
      setRewards(
        all.filter((r: any) => allowed.includes((r.category || "CUSTOM").toUpperCase()) || (!r.category && feature.key === "custom_rewards")),
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }, [feature.key, category]);

  React.useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      await api.createReward({
        name: draft.name,
        pointsCost: Number(draft.pointsCost),
        discountVal: Number(draft.discountVal),
        description: draft.description,
        category,
      } as any);
      toast.success("Reward created");
      setDraft({ name: "", pointsCost: "500", discountVal: "10", description: "" });
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    }
  };

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      <ModuleCard className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Reward Name">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Points Cost">
          <Input
            type="number"
            value={draft.pointsCost}
            onChange={(e) => setDraft({ ...draft, pointsCost: e.target.value })}
          />
        </Field>
        <Field label="Value / Discount">
          <Input
            type="number"
            value={draft.discountVal}
            onChange={(e) => setDraft({ ...draft, discountVal: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <Input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Button size="sm" disabled={!draft.name} onClick={create}>
            <Plus className="h-3.5 w-3.5" /> Create reward
          </Button>
        </div>
      </ModuleCard>
      {loading ? (
        <ModuleLoading />
      ) : rewards.length === 0 ? (
        <ModuleEmpty title="No rewards" description="Create redeemable rewards backed by real inventory." />
      ) : (
        <div className="space-y-2">
          {rewards.map((r) => (
            <ModuleCard key={r.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">
                  {r.pointsCost} pts · redeemed {r.redeemedCount ?? 0}
                </p>
              </div>
              <Badge variant="outline">{r.status}</Badge>
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}

export function ReferralsModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setData(await api.getLoyaltyReferrals());
      } catch (e: any) {
        toast.error(e?.message || "Failed to load referrals");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      {loading ? (
        <ModuleLoading />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <ModuleCard>
            <p className="text-xs uppercase text-slate-400">Referrals</p>
            <p className="mt-2 text-3xl font-semibold">{data?.stats?.total ?? data?.tree?.length ?? 0}</p>
          </ModuleCard>
          <ModuleCard>
            <p className="text-xs uppercase text-slate-400">Completed</p>
            <p className="mt-2 text-3xl font-semibold">{data?.stats?.completed ?? 0}</p>
          </ModuleCard>
          <ModuleCard>
            <p className="text-xs uppercase text-slate-400">Reward pts issued</p>
            <p className="mt-2 text-3xl font-semibold">{data?.stats?.pointsIssued ?? 0}</p>
          </ModuleCard>
        </div>
      )}
    </ModuleShell>
  );
}

export function AuditLogsModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setData(await api.getLoyaltyAuditLogs({ pageSize: 50 }));
      } catch (e: any) {
        toast.error(e?.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      {loading ? (
        <ModuleLoading />
      ) : !data?.items?.length ? (
        <ModuleEmpty title="No audit events" description="Config changes and staff actions will be logged here." />
      ) : (
        <div className="space-y-2">
          {data.items.map((row: any) => (
            <ModuleCard key={row.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{row.action}</p>
                <p className="text-xs text-slate-400">
                  {row.featureKey || "system"} · {row.createdAt}
                </p>
              </div>
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}

export function SurpriseModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [rules, setRules] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setRules((await api.getSurpriseRewards()) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load surprise rewards");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      {loading ? (
        <ModuleLoading />
      ) : rules.length === 0 ? (
        <ModuleEmpty title="No surprise rules" description="Configure surprise drops from the Configure panel." />
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <ModuleCard key={r.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-slate-500">{r.type}</p>
              </div>
              <Badge variant="outline">{r.enabled ? "ON" : "OFF"}</Badge>
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}

export const SpinWheelModule = createEntityModule({
  entityLabel: "Prize",
  emptyTitle: "No spin prizes",
  emptyDescription: "Add prizes with probability weights for the spin wheel.",
  fields: [
    { key: "label", label: "Prize Label" },
    { key: "probability", label: "Probability %", type: "number" },
    { key: "rewardPoints", label: "Reward Points", type: "number" },
    { key: "imageUrl", label: "Image URL" },
  ],
  nameFrom: (d) => String(d.label || "Prize"),
});

export const SeasonalCampaignsModule = createEntityModule({
  entityLabel: "Campaign",
  emptyTitle: "No seasonal campaigns",
  emptyDescription: "Create festival, weekend, or holiday campaigns.",
  fields: [
    { key: "name", label: "Campaign Name" },
    { key: "type", label: "Type (festival/weekend/holiday)" },
    { key: "bonusMultiplier", label: "Bonus Multiplier", type: "number" },
    { key: "startsAt", label: "Starts At (ISO date)" },
    { key: "endsAt", label: "Ends At (ISO date)" },
  ],
  nameFrom: (d) => String(d.name || "Campaign"),
});

export const HolidayBonusModule = createEntityModule({
  entityLabel: "Holiday",
  emptyTitle: "No holidays configured",
  emptyDescription: "Add holiday dates with automatic bonus activation.",
  fields: [
    { key: "name", label: "Holiday Name" },
    { key: "date", label: "Date (YYYY-MM-DD)" },
    { key: "bonusPercent", label: "Bonus %", type: "number" },
    { key: "bonusPoints", label: "Bonus Points", type: "number" },
  ],
  nameFrom: (d) => String(d.name || "Holiday"),
});

export const DoublePointsModule = createEntityModule({
  entityLabel: "Schedule",
  emptyTitle: "Using feature config defaults",
  emptyDescription: "Optional day-specific overrides. Base settings live in Configure.",
  fields: [
    { key: "day", label: "Day" },
    { key: "multiplier", label: "Multiplier", type: "number" },
    { key: "maxBonus", label: "Max Bonus Points", type: "number" },
  ],
  nameFrom: (d) => String(d.day || "Day"),
});

export const QrCodeModule = createEntityModule({
  entityLabel: "QR Code",
  emptyTitle: "No QR codes",
  emptyDescription: "Generate scan-to-earn or scan-to-redeem QR codes.",
  fields: [
    { key: "label", label: "Label" },
    { key: "qrType", label: "Type (earn/redeem)" },
    { key: "points", label: "Points", type: "number" },
    { key: "expiryMinutes", label: "Expiry Minutes", type: "number" },
  ],
  nameFrom: (d) => String(d.label || "QR"),
});

export const ApiAccessModule = createEntityModule({
  entityLabel: "API Key",
  emptyTitle: "No API keys",
  emptyDescription: "Create scoped API keys with rate limits and webhook URLs.",
  fields: [
    { key: "name", label: "Key Name" },
    { key: "permissions", label: "Permissions (comma-separated)" },
    { key: "rateLimit", label: "Rate Limit / min", type: "number" },
    { key: "webhookUrl", label: "Webhook URL" },
  ],
  nameFrom: (d) => String(d.name || "API Key"),
});

export const NotificationsModule = createEntityModule({
  entityLabel: "Template",
  emptyTitle: "No notification templates",
  emptyDescription: "Create email/SMS/WhatsApp/push templates with variables.",
  fields: [
    { key: "channel", label: "Channel" },
    { key: "subject", label: "Subject" },
    { key: "body", label: "Body", type: "textarea" },
    { key: "variables", label: "Variables (comma-separated)" },
  ],
  nameFrom: (d) => `${d.channel || "channel"} template`,
});

export const ReportsModule = createEntityModule({
  entityLabel: "Report",
  emptyTitle: "No saved reports",
  emptyDescription: "Build custom loyalty reports with columns and filters.",
  fields: [
    { key: "name", label: "Report Name" },
    { key: "columns", label: "Columns (comma-separated)" },
    { key: "filters", label: "Filters JSON", type: "textarea" },
    { key: "exportFormat", label: "Export (pdf/excel/csv)" },
  ],
  nameFrom: (d) => String(d.name || "Report"),
});

export const MilestonesModule = createEntityModule({
  entityLabel: "Milestone",
  emptyTitle: "No milestones",
  emptyDescription: "Celebrate visit and spend milestones with auto rewards.",
  fields: [
    { key: "name", label: "Name" },
    { key: "type", label: "Type (visit/spend)" },
    { key: "threshold", label: "Threshold", type: "number" },
    { key: "rewardPoints", label: "Reward Points", type: "number" },
  ],
  nameFrom: (d) => String(d.name || "Milestone"),
});

export const WalletPassModule = createEntityModule({
  entityLabel: "Pass Design",
  emptyTitle: "No wallet pass designs",
  emptyDescription: "Configure Apple/Google wallet card branding.",
  fields: [
    { key: "name", label: "Design Name" },
    { key: "logoUrl", label: "Logo URL" },
    { key: "brandColor", label: "Brand Color" },
    { key: "platform", label: "Platform (apple/google/both)" },
  ],
  nameFrom: (d) => String(d.name || "Pass"),
});

export const MultiBranchModule = createEntityModule({
  entityLabel: "Branch Rule",
  emptyTitle: "No branch rules",
  emptyDescription: "Configure shared/separate balances and transfer rules.",
  fields: [
    { key: "branchName", label: "Branch" },
    { key: "balanceMode", label: "Balance Mode (shared/separate)" },
    { key: "allowTransfer", label: "Allow Transfer (true/false)" },
  ],
  nameFrom: (d) => String(d.branchName || "Branch rule"),
});

export function ConfigOnlyModule({ feature, onConfigure }: LoyaltyModuleProps) {
  return (
    <ModuleShell feature={feature} onConfigure={onConfigure}>
      <ModuleCard>
        <p className="text-sm text-slate-600">
          This module is active and connected. Open <strong>Configure</strong> to manage all settings.
          Runtime behavior uses your saved configuration with live customer data.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(feature.config || {})
            .slice(0, 8)
            .map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{k}</p>
                <p className="truncate text-sm font-medium text-slate-800">{String(v)}</p>
              </div>
            ))}
        </div>
      </ModuleCard>
    </ModuleShell>
  );
}
