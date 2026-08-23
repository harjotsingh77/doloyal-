"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Skeleton } from "./skeleton";
import type { StatChartProps } from "./stat-chart-impl";

export type { SeriesConfig, StatChartProps } from "./stat-chart-impl";

/**
 * Lazy wrapper around the recharts implementation.
 *
 * recharts (and its d3 dependency chain) is kept out of every page's
 * initial bundle: it loads from an async chunk the first time a chart is
 * actually rendered. The fallback mirrors the final card's dimensions
 * (title/description/height) so there is no layout shift when the real
 * chart appears.
 */
const StatChartImpl = React.lazy(() => import("./stat-chart-impl"));

function StatChartFallback({
  title,
  description,
  height = 280,
  className,
}: Pick<StatChartProps, "title" | "description" | "height" | "className">) {
  return (
    <Card className={className}>
      {title ? (
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
          {description ? (
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{description}</p>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent>
        <Skeleton className="w-full" style={{ height }} aria-busy="true" />
      </CardContent>
    </Card>
  );
}

export function StatChart(props: StatChartProps) {
  return (
    <React.Suspense
      fallback={
        <StatChartFallback
          title={props.title}
          description={props.description}
          height={props.height}
          className={props.className}
        />
      }
    >
      <StatChartImpl {...props} />
    </React.Suspense>
  );
}
