"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ScrollText, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PageHeader,
  Badge,
  Skeleton,
  EmptyState,
} from "@doloyal/ui";
import type { ConnectionLogEntry } from "@doloyal/shared";
import { api } from "@/lib/api";

function levelVariant(level: string): "outline" | "warning" | "danger" | "success" {
  if (level === "ERROR") return "danger";
  if (level === "WARN") return "warning";
  if (level === "INFO") return "success";
  return "outline";
}

function ConnectionLogsContent() {
  const searchParams = useSearchParams();
  const websiteId = searchParams.get("websiteId") ?? undefined;
  const [logs, setLogs] = React.useState<ConnectionLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLogs(await api.listWebsiteConnectionLogs({ websiteId, limit: 100 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-[rgb(var(--color-danger))]" />
        <p className="mt-3 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <Button className="mt-4" onClick={() => void load()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        description={
          websiteId
            ? "Connection activity for the selected website"
            : "Connection activity across all websites"
        }
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-7 w-7" />}
          title="No logs yet"
          description="Logs appear when you generate, disconnect, or reconnect a website."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-[rgb(var(--color-border))] p-0">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={levelVariant(log.level)}>{log.level}</Badge>
                    <code className="text-xs">{log.event}</code>
                    {log.websiteName && (
                      <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        · {log.websiteName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{log.message}</p>
                </div>
                <div className="shrink-0 text-xs text-[rgb(var(--color-muted-foreground))]">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ConnectionLogsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <ConnectionLogsContent />
    </React.Suspense>
  );
}

