"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Input,
  Field,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  cn,
} from "@doloyal/ui";
import type { FeatureFlagState } from "@doloyal/shared";

type Props = {
  feature: FeatureFlagState | null;
  open: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => Promise<void>;
};

function NumField({
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
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </Field>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function FeatureConfigureDrawer({ feature, open, onClose, onSave }: Props) {
  const [draft, setDraft] = React.useState<Record<string, unknown>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (feature) setDraft({ ...(feature.config || {}) });
  }, [feature]);

  if (!feature) return null;

  const set = (key: string, val: unknown) => setDraft((p) => ({ ...p, [key]: val }));

  const renderForm = () => {
    switch (feature.key) {
      case "program_settings":
        return (
          <div className="space-y-4">
            <Field label="Loyalty Mode">
              <Select value={String(draft.mode || "CURRENCY")} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURRENCY">Spend-based</SelectItem>
                  <SelectItem value="VISIT">Visit-based</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                  <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumField label="Points per ₹" value={Number(draft.pointsPerCurrency ?? 0.1)} onChange={(n) => set("pointsPerCurrency", n)} step="0.01" />
              <NumField label="Points per Visit" value={Number(draft.pointsPerVisit ?? 10)} onChange={(n) => set("pointsPerVisit", n)} />
              <NumField label="Welcome Bonus" value={Number(draft.welcomeBonus ?? draft.signupBonus ?? 100)} onChange={(n) => set("welcomeBonus", n)} />
              <NumField label="Referral Bonus" value={Number(draft.referralBonus ?? 100)} onChange={(n) => set("referralBonus", n)} />
              <NumField label="Point Expiry (days)" value={Number(draft.expiryDays ?? 365)} onChange={(n) => set("expiryDays", n)} />
              <NumField label="Min Spend" value={Number(draft.minSpend ?? 0)} onChange={(n) => set("minSpend", n)} />
              <NumField label="Max Redemption" value={Number(draft.maxRedemption ?? 10000)} onChange={(n) => set("maxRedemption", n)} />
              <NumField label="Min Redemption" value={Number(draft.minRedemption ?? 100)} onChange={(n) => set("minRedemption", n)} />
              <NumField label="Tier Multiplier" value={Number(draft.tierMultiplier ?? 1)} onChange={(n) => set("tierMultiplier", n)} step="0.1" />
              <NumField label="Weekend Multiplier" value={Number(draft.weekendMultiplier ?? 1)} onChange={(n) => set("weekendMultiplier", n)} step="0.1" />
              <NumField label="Holiday Multiplier" value={Number(draft.holidayMultiplier ?? 1)} onChange={(n) => set("holidayMultiplier", n)} step="0.1" />
            </div>
            <ToggleRow label="Auto Expiry" checked={!!draft.autoExpiry} onChange={(v) => set("autoExpiry", v)} />
            <ToggleRow label="Weekend Bonus" checked={!!draft.weekendBonus} onChange={(v) => set("weekendBonus", v)} />
            <ToggleRow label="Holiday Bonus" checked={!!draft.holidayBonus} onChange={(v) => set("holidayBonus", v)} />
          </div>
        );

      case "leaderboard":
        return (
          <div className="space-y-4">
            <Field label="Period">
              <Select value={String(draft.period || "monthly")} onValueChange={(v) => set("period", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="all">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Top Count">
              <Select value={String(draft.topCount || 10)} onValueChange={(v) => set("topCount", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ranking Metric">
              <Select value={String(draft.metric || "points")} onValueChange={(v) => set("metric", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Points</SelectItem>
                  <SelectItem value="spend">Spend</SelectItem>
                  <SelectItem value="visits">Visits</SelectItem>
                  <SelectItem value="referrals">Referrals</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <ToggleRow label="Show Avatars" checked={draft.showAvatars !== false} onChange={(v) => set("showAvatars", v)} />
            <ToggleRow label="Show Badges" checked={draft.showBadges !== false} onChange={(v) => set("showBadges", v)} />
            <ToggleRow label="Automatic Rewards" checked={!!draft.automaticRewards} onChange={(v) => set("automaticRewards", v)} />
            <NumField label="Reward Top N" value={Number(draft.rewardTopN ?? 10)} onChange={(n) => set("rewardTopN", n)} />
            <NumField label="Reward Points" value={Number(draft.rewardPoints ?? 200)} onChange={(n) => set("rewardPoints", n)} />
          </div>
        );

      case "loyalty_tiers": {
        const tiers = (draft.tiers as Array<Record<string, unknown>>) || [];
        return (
          <div className="space-y-4">
            {tiers.map((t, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Tier {i + 1}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => set("tiers", tiers.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  placeholder="Name"
                  value={String(t.name || "")}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[i] = { ...t, name: e.target.value };
                    set("tiers", next);
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min points"
                    value={Number(t.pointsRequired ?? 0)}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[i] = { ...t, pointsRequired: parseInt(e.target.value, 10) || 0 };
                      set("tiers", next);
                    }}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Multiplier"
                    value={Number(t.multiplier ?? 1)}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[i] = { ...t, multiplier: parseFloat(e.target.value) || 1 };
                      set("tiers", next);
                    }}
                  />
                </div>
                <Input
                  placeholder="Color"
                  value={String(t.color || "#2563eb")}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[i] = { ...t, color: e.target.value };
                    set("tiers", next);
                  }}
                />
                <Textarea
                  placeholder="Exclusive benefits"
                  value={String(t.perks || "")}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[i] = { ...t, perks: e.target.value };
                    set("tiers", next);
                  }}
                />
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                set("tiers", [
                  ...tiers,
                  { name: "New Tier", pointsRequired: 0, multiplier: 1, perks: "", color: "#2563eb" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Create Tier
            </Button>
            <ToggleRow label="Upgrade Notification" checked={draft.upgradeNotification !== false} onChange={(v) => set("upgradeNotification", v)} />
            <ToggleRow label="Downgrade Rules" checked={!!draft.downgradeRules} onChange={(v) => set("downgradeRules", v)} />
          </div>
        );
      }

      case "streak_system":
        return (
          <div className="space-y-4">
            <Field label="Cadence">
              <Select value={String(draft.cadence || "weekly")} onValueChange={(v) => set("cadence", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <NumField label="Required Visits" value={Number(draft.minVisitsPerMonth ?? draft.requiredVisits ?? 2)} onChange={(n) => set("requiredVisits", n)} />
            <NumField label="Bonus Points" value={Number(draft.streakBonusPoints ?? 100)} onChange={(n) => set("streakBonusPoints", n)} />
            <NumField label="Maximum Streak" value={Number(draft.maxStreakMonths ?? 12)} onChange={(n) => set("maxStreakMonths", n)} />
            <Field label="Reset Rules">
              <Textarea value={String(draft.resetRules || "Miss one period resets streak")} onChange={(e) => set("resetRules", e.target.value)} />
            </Field>
            <ToggleRow label="Animations" checked={draft.animations !== false} onChange={(v) => set("animations", v)} />
          </div>
        );

      case "spin_wheel":
        return (
          <div className="space-y-4">
            <NumField label="Cost Per Spin (points)" value={Number(draft.costPerSpinPoints ?? 50)} onChange={(n) => set("costPerSpinPoints", n)} />
            <NumField label="Maximum Spins / Day" value={Number(draft.maxSpinsPerDay ?? 3)} onChange={(n) => set("maxSpinsPerDay", n)} />
            <Field label="Eligibility">
              <Input value={String(draft.eligibility || "All members")} onChange={(e) => set("eligibility", e.target.value)} />
            </Field>
            <ToggleRow label="Animations" checked={draft.animations !== false} onChange={(v) => set("animations", v)} />
            <Field label="Default Prizes (one per line)">
              <Textarea
                value={Array.isArray(draft.prizes) ? (draft.prizes as string[]).join("\n") : String(draft.prizes || "")}
                onChange={(e) => set("prizes", e.target.value.split("\n").filter(Boolean))}
              />
            </Field>
          </div>
        );

      case "double_points_weekend":
        return (
          <div className="space-y-4">
            <NumField label="Multiplier" value={Number(draft.multiplier ?? 2)} onChange={(n) => set("multiplier", n)} step="0.1" />
            <NumField label="Maximum Bonus" value={Number(draft.maxBonus ?? 5000)} onChange={(n) => set("maxBonus", n)} />
            <Field label="Days (comma-separated)">
              <Input
                value={Array.isArray(draft.days) ? (draft.days as string[]).join(", ") : "Saturday, Sunday"}
                onChange={(e) => set("days", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
            <Field label="Eligible Customers">
              <Input value={String(draft.eligibleCustomers || "all")} onChange={(e) => set("eligibleCustomers", e.target.value)} />
            </Field>
          </div>
        );

      case "holiday_bonus_engine":
        return (
          <div className="space-y-4">
            <NumField label="Default Bonus %" value={Number(draft.bonusPercent ?? 50)} onChange={(n) => set("bonusPercent", n)} />
            <NumField label="Default Bonus Points" value={Number(draft.bonusPoints ?? 300)} onChange={(n) => set("bonusPoints", n)} />
            <ToggleRow label="Automatic Activation" checked={draft.automaticActivation !== false} onChange={(v) => set("automaticActivation", v)} />
            <Field label="Holiday Calendar (one per line)">
              <Textarea
                value={Array.isArray(draft.holidays) ? (draft.holidays as string[]).join("\n") : ""}
                onChange={(e) => set("holidays", e.target.value.split("\n").filter(Boolean))}
              />
            </Field>
          </div>
        );

      case "referral_campaigns":
        return (
          <div className="space-y-4">
            <NumField label="Referral Reward (points)" value={Number(draft.referrerRewardPoints ?? 200)} onChange={(n) => set("referrerRewardPoints", n)} />
            <NumField label="Friend Reward / Discount %" value={Number(draft.refereeDiscountPercent ?? 15)} onChange={(n) => set("refereeDiscountPercent", n)} />
            <NumField label="Maximum Referrals" value={Number(draft.maxReferrals ?? 50)} onChange={(n) => set("maxReferrals", n)} />
            <ToggleRow label="Fraud Prevention" checked={draft.fraudPrevention !== false} onChange={(v) => set("fraudPrevention", v)} />
            <Field label="Referral Rules">
              <Textarea value={String(draft.referralRules || "")} onChange={(e) => set("referralRules", e.target.value)} />
            </Field>
          </div>
        );

      case "manual_point_adjustment":
        return (
          <div className="space-y-4">
            <ToggleRow label="Reason Required" checked={draft.reasonRequired !== false} onChange={(v) => set("reasonRequired", v)} />
            <ToggleRow label="Approval Required" checked={!!draft.approvalRequired} onChange={(v) => set("approvalRequired", v)} />
            <NumField label="Maximum Adjustment" value={Number(draft.maxAdjustment ?? 10000)} onChange={(n) => set("maxAdjustment", n)} />
            <ToggleRow label="Keep History" checked={draft.keepHistory !== false} onChange={(v) => set("keepHistory", v)} />
          </div>
        );

      case "activity_feed":
        return (
          <div className="space-y-4">
            <NumField label="Retention Days" value={Number(draft.retentionDays ?? 90)} onChange={(n) => set("retentionDays", n)} />
            <ToggleRow label="Real-time Updates" checked={!!draft.realtime} onChange={(v) => set("realtime", v)} />
            <Field label="Visible Events (comma-separated)">
              <Input
                value={Array.isArray(draft.visibleEvents) ? (draft.visibleEvents as string[]).join(", ") : "POINTS_EARNED, POINTS_REDEEMED, TIER_UPGRADED"}
                onChange={(e) => set("visibleEvents", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
          </div>
        );

      case "audit_logs":
        return (
          <div className="space-y-4">
            <NumField label="Retention Days" value={Number(draft.retainDays ?? 90)} onChange={(n) => set("retainDays", n)} />
            <ToggleRow label="Log Staff Actions" checked={draft.logStaffActions !== false} onChange={(v) => set("logStaffActions", v)} />
            <ToggleRow label="Admin Access Only" checked={draft.adminOnly !== false} onChange={(v) => set("adminOnly", v)} />
          </div>
        );

      case "api_access":
        return (
          <div className="space-y-4">
            <NumField label="Rate Limit / Minute" value={Number(draft.rateLimitPerMinute ?? 60)} onChange={(n) => set("rateLimitPerMinute", n)} />
            <Field label="Default Permissions">
              <Input value={String(draft.defaultPermissions || "read:loyalty,write:points")} onChange={(e) => set("defaultPermissions", e.target.value)} />
            </Field>
            <Field label="Webhook Events">
              <Textarea value={String(draft.webhookEvents || "points.earned,points.redeemed,tier.upgraded")} onChange={(e) => set("webhookEvents", e.target.value)} />
            </Field>
          </div>
        );

      case "wallet_pass":
        return (
          <div className="space-y-4">
            <Field label="Pass Color">
              <Input value={String(draft.passColor || "#2563eb")} onChange={(e) => set("passColor", e.target.value)} />
            </Field>
            <Field label="Logo URL">
              <Input value={String(draft.logoUrl || "")} onChange={(e) => set("logoUrl", e.target.value)} />
            </Field>
            <ToggleRow label="Show Barcode" checked={draft.showBarcode !== false} onChange={(v) => set("showBarcode", v)} />
            <ToggleRow label="Apple Wallet" checked={draft.appleWallet !== false} onChange={(v) => set("appleWallet", v)} />
            <ToggleRow label="Google Wallet" checked={draft.googleWallet !== false} onChange={(v) => set("googleWallet", v)} />
          </div>
        );

      case "qr_code_loyalty":
        return (
          <div className="space-y-4">
            <Field label="Default QR Type">
              <Select value={String(draft.defaultType || "earn")} onValueChange={(v) => set("defaultType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="earn">Scan to Earn</SelectItem>
                  <SelectItem value="redeem">Scan to Redeem</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <NumField label="Expiry Minutes" value={Number(draft.qrExpiryMinutes ?? 15)} onChange={(n) => set("qrExpiryMinutes", n)} />
            <Field label="Branding Color">
              <Input value={String(draft.brandColor || "#2563eb")} onChange={(e) => set("brandColor", e.target.value)} />
            </Field>
          </div>
        );

      default: {
        // Generic editor for remaining keys — expose every config field
        const entries = Object.entries(draft);
        if (entries.length === 0) {
          return (
            <p className="text-sm text-slate-500">
              No configuration schema yet. Save defaults from Feature Management after enabling.
            </p>
          );
        }
        return (
          <div className="space-y-3">
            {entries.map(([key, val]) => {
              if (typeof val === "boolean") {
                return <ToggleRow key={key} label={key} checked={val} onChange={(v) => set(key, v)} />;
              }
              if (typeof val === "number") {
                return <NumField key={key} label={key} value={val} onChange={(n) => set(key, n)} />;
              }
              if (Array.isArray(val) || (val && typeof val === "object")) {
                return (
                  <Field key={key} label={key}>
                    <Textarea
                      value={JSON.stringify(val, null, 2)}
                      onChange={(e) => {
                        try {
                          set(key, JSON.parse(e.target.value));
                        } catch {
                          /* keep typing */
                        }
                      }}
                    />
                  </Field>
                );
              }
              return (
                <Field key={key} label={key}>
                  <Input value={String(val ?? "")} onChange={(e) => set(key, e.target.value)} />
                </Field>
              );
            })}
          </div>
        );
      }
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl",
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                  Configure
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                  {feature.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{feature.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{renderForm()}</div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    await onSave(draft);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving…" : "Save configuration"}
              </Button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
