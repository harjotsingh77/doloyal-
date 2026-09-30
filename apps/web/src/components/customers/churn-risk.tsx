import type { Customer } from "@doloyal/shared";
import { churnRiskColor } from "@doloyal/shared";

type Level = Customer["churnRisk"];

const LEVELS: Level[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const LABEL: Record<Level, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

/**
 * Churn risk as a four-step meter with a plain label. The number of filled
 * bars carries the level, so it reads without relying on colour.
 */
export function ChurnRisk({ level, suffix }: { level: Level; suffix?: string }) {
  const filled = LEVELS.indexOf(level) + 1;
  const label = suffix ? `${LABEL[level]} ${suffix}` : LABEL[level];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[0.8125rem] text-[rgb(var(--color-foreground))]">
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {LEVELS.map((step, i) => (
          <span
            key={step}
            className="w-[3px] rounded-[1px]"
            style={{
              height: 5 + i * 2.5,
              backgroundColor: i < filled ? churnRiskColor(level) : "rgb(var(--color-border))",
            }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}
