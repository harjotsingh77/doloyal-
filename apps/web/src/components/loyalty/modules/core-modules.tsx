"use client";

import * as React from "react";
import { toast } from "sonner";
import { RefreshCw, Trophy, Medal } from "lucide-react";
import {
  Button,
  Input,
  Field,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
} from "@doloyal/ui";
import { LOYALTY_MODE_LABELS } from "@doloyal/shared";
import type { LoyaltyConfig, LoyaltyLeaderboardEntry } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import {
  ModuleShell,
  ModuleCard,
  ModuleLoading,
  ModuleEmpty,
  type LoyaltyModuleProps,
} from "@/components/loyalty/module-shell";

export function ProgramSettingsModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const { format } = useCurrency();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [config, setConfig] = React.useState<LoyaltyConfig | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const c = await api.getLoyaltyConfig();
      setConfig(c);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load program settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const updated = await api.updateLoyaltyConfig({
        mode: config.mode,
        pointsPerCurrency: config.pointsPerCurrency,
        pointsPerVisit: config.pointsPerVisit,
        currencyPerPoint: config.currencyPerPoint,
        expiryDays: config.expiryDays,
        welcomeBonus: config.welcomeBonus,
        referralBonus: config.referralBonus,
        settings: config.settings,
      } as any);
      setConfig(updated);
      await api.updateFeatureConfig("program_settings", {
        mode: updated.mode,
        pointsPerCurrency: updated.pointsPerCurrency,
        pointsPerVisit: updated.pointsPerVisit,
        currencyPerPoint: updated.currencyPerPoint,
        expiryDays: updated.expiryDays,
        welcomeBonus: updated.welcomeBonus,
        referralBonus: updated.referralBonus,
        ...(updated.settings || {}),
      });
      toast.success("Program settings saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewPoints = React.useMemo(() => {
    if (!config) return 0;
    const spend = 1000;
    const base = spend * (config.pointsPerCurrency || 0);
    const weekend = Number((config.settings as any)?.weekendMultiplier || 1);
    return Math.round(base * weekend);
  }, [config]);

  if (loading || !config) {
    return (
      <ModuleShell feature={feature} onConfigure={onConfigure}>
        <ModuleLoading />
      </ModuleShell>
    );
  }

  const settings = (config.settings || {}) as Record<string, any>;

  return (
    <ModuleShell
      feature={feature}
      onConfigure={onConfigure}
      actions={
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <ModuleCard className="lg:col-span-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Loyalty Mode">
              <Select
                value={config.mode}
                onValueChange={(v) => setConfig({ ...config, mode: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LOYALTY_MODE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Points per ₹">
              <Input
                type="number"
                value={config.pointsPerCurrency}
                onChange={(e) =>
                  setConfig({ ...config, pointsPerCurrency: parseFloat(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Points per Visit">
              <Input
                type="number"
                value={config.pointsPerVisit}
                onChange={(e) =>
                  setConfig({ ...config, pointsPerVisit: parseInt(e.target.value, 10) || 0 })
                }
              />
            </Field>
            <Field label="Currency per Point">
              <Input
                type="number"
                value={config.currencyPerPoint}
                onChange={(e) =>
                  setConfig({ ...config, currencyPerPoint: parseFloat(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Welcome Bonus">
              <Input
                type="number"
                value={config.welcomeBonus}
                onChange={(e) =>
                  setConfig({ ...config, welcomeBonus: parseInt(e.target.value, 10) || 0 })
                }
              />
            </Field>
            <Field label="Referral Bonus">
              <Input
                type="number"
                value={config.referralBonus}
                onChange={(e) =>
                  setConfig({ ...config, referralBonus: parseInt(e.target.value, 10) || 0 })
                }
              />
            </Field>
            <Field label="Point Expiry (days)">
              <Input
                type="number"
                value={config.expiryDays}
                onChange={(e) =>
                  setConfig({ ...config, expiryDays: parseInt(e.target.value, 10) || 0 })
                }
              />
            </Field>
            <Field label="Minimum Spend">
              <Input
                type="number"
                value={settings.minSpend ?? 0}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    settings: { ...settings, minSpend: parseFloat(e.target.value) || 0 } as any,
                  })
                }
              />
            </Field>
            <Field label="Maximum Redemption">
              <Input
                type="number"
                value={settings.maxRedemption ?? 10000}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    settings: { ...settings, maxRedemption: parseInt(e.target.value, 10) || 0 } as any,
                  })
                }
              />
            </Field>
            <Field label="Weekend Multiplier">
              <Input
                type="number"
                step="0.1"
                value={settings.weekendMultiplier ?? 1}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    settings: { ...settings, weekendMultiplier: parseFloat(e.target.value) || 1 } as any,
                  })
                }
              />
            </Field>
            <Field label="Holiday Multiplier">
              <Input
                type="number"
                step="0.1"
                value={settings.holidayMultiplier ?? 1}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    settings: { ...settings, holidayMultiplier: parseFloat(e.target.value) || 1 } as any,
                  })
                }
              />
            </Field>
            <Field label="Tier Multiplier">
              <Input
                type="number"
                step="0.1"
                value={settings.tierMultiplier ?? 1}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    settings: { ...settings, tierMultiplier: parseFloat(e.target.value) || 1 } as any,
                  })
                }
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-4">
            {[
              ["autoExpiry", "Auto Expiry"],
              ["weekendBonus", "Weekend Bonus"],
              ["holidayBonus", "Holiday Bonus"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <Switch
                  checked={!!settings[key!]}
                  onCheckedChange={(v) =>
                    setConfig({ ...config, settings: { ...settings, [key!]: v } as any })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </ModuleCard>
        <ModuleCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
            Preview Calculation
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {previewPoints} pts
          </p>
          <p className="mt-2 text-sm text-slate-500">
            On a {format(1000)} spend with weekend multiplier applied.
          </p>
        </ModuleCard>
      </div>
    </ModuleShell>
  );
}

export function LeaderboardModule({ feature, onConfigure }: LoyaltyModuleProps) {
  const cfg = feature.config || {};
  const [period, setPeriod] = React.useState(String(cfg.period || "monthly"));
  const [metric, setMetric] = React.useState(String(cfg.metric || "points"));
  const [limit, setLimit] = React.useState(Number(cfg.topCount || 10));
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<LoyaltyLeaderboardEntry[]>([]);
  const [rewarding, setRewarding] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getLoyaltyLeaderboard({ period, metric, limit });
      setRows(data || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [period, metric, limit]);

  React.useEffect(() => {
    load();
  }, [load]);

  const rewardTop = async () => {
    try {
      setRewarding(true);
      const res = await api.rewardLoyaltyTop({
        count: Number(cfg.rewardTopN || limit),
        points: Number(cfg.rewardPoints || 200),
      });
      toast.success(`Rewarded ${res.rewarded} customers with ${res.pointsEach} pts each`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Reward failed — enable Leaderboard Rewards");
    } finally {
      setRewarding(false);
    }
  };

  return (
    <ModuleShell
      feature={feature}
      onConfigure={onConfigure}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {cfg.automaticRewards ? (
            <Button size="sm" onClick={rewardTop} disabled={rewarding}>
              <Medal className="h-3.5 w-3.5" /> Reward top
            </Button>
          ) : null}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="all">Lifetime</SelectItem>
          </SelectContent>
        </Select>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="points">Points</SelectItem>
            <SelectItem value="spend">Spend</SelectItem>
            <SelectItem value="visits">Visits</SelectItem>
            <SelectItem value="referrals">Referrals</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 5, 10, 20].map((n) => (
              <SelectItem key={n} value={String(n)}>
                Top {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ModuleLoading />
      ) : rows.length === 0 ? (
        <ModuleEmpty
          title="No leaderboard data yet"
          description="Rankings appear once customers earn points, spend, or visit."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <ModuleCard key={row.customerId || idx} className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {cfg.showAvatars !== false && row.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  idx + 1
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {row.name || "Customer"}
                </p>
                <p className="text-xs text-slate-500">
                  {row.visits ?? 0} visits · Rank #{row.rank ?? idx + 1}
                  {cfg.showBadges !== false && row.badges?.length
                    ? ` · ${row.badges.slice(0, 2).join(", ")}`
                    : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {metric === "spend"
                    ? row.totalSpent
                    : metric === "visits"
                      ? row.visits
                      : metric === "referrals"
                        ? row.referrals
                        : row.points}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{metric}</p>
              </div>
              {idx < 3 ? <Trophy className="h-4 w-4 text-amber-500" /> : null}
            </ModuleCard>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}
