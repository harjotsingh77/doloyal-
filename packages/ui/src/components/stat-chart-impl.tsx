"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { CHART_PALETTE } from "../brand";
import { cn } from "../lib/utils";

export interface SeriesConfig {
  key: string;
  label: string;
  color?: string;
}

export interface StatChartProps {
  title?: string;
  description?: string;
  data: Record<string, any>[];
  series: SeriesConfig[];
  xKey: string;
  type?: "area" | "bar" | "line";
  height?: number;
  valueFormat?: (v: number) => string;
  tickFormat?: (v: number) => string;
  className?: string;
  /** Hide axis lines/ticks for a cleaner editorial look. */
  minimal?: boolean;
  onClick?: () => void;
}

const tooltipStyle = {
  borderRadius: "0.625rem",
  border: "1px solid rgb(var(--color-border))",
  background: "rgb(var(--color-surface))",
  color: "rgb(var(--color-foreground))",
  fontSize: "0.8rem",
  boxShadow: "var(--shadow-lifted)",
} as const;

export default function StatChartImpl({
  title,
  description,
  data,
  series,
  xKey,
  type = "area",
  height = 280,
  valueFormat = (v) => v.toLocaleString("en-IN"),
  tickFormat = (v) => String(v),
  className,
  minimal,
  onClick,
}: StatChartProps) {
  const Chart = type === "bar" ? BarChart : type === "line" ? LineChart : AreaChart;

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        className,
        onClick &&
          "cursor-pointer transition-all hover:border-[rgb(var(--color-primary)/0.28)] hover:shadow-sm",
      )}
    >
      {title ? (
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              {description ? (
                <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{description}</p>
              ) : null}
            </div>
            {onClick ? (
              <span className="shrink-0 pt-0.5 text-[10px] font-medium text-[rgb(var(--color-muted-foreground))]">
                View details
              </span>
            ) : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              {series.map((s, i) => {
                const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]!;
                return (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            {!minimal ? (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(var(--color-border))"
                strokeOpacity={0.5}
                vertical={false}
              />
            ) : null}
            <XAxis
              dataKey={xKey}
              tick={{ fill: "rgb(var(--color-muted-foreground))", fontSize: 11 }}
              axisLine={!minimal}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fill: "rgb(var(--color-muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => tickFormat(Number(v))}
            />
            <Tooltip
              cursor={{ stroke: "rgb(var(--color-border))", strokeWidth: 1 }}
              contentStyle={tooltipStyle}
              formatter={(value: number | string, name: string) => [
                valueFormat(Number(value)),
                series.find((s) => s.key === name)?.label ?? name,
              ]}
            />
            {series.map((s, i) => {
              const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]!;
              if (type === "bar") {
                return (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.key}
                    fill={color}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                );
              }
              if (type === "line") {
                return (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.key}
                    stroke={color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                );
              }
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.key}
                  stroke={color}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#grad-${s.key})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              );
            })}
          </Chart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
