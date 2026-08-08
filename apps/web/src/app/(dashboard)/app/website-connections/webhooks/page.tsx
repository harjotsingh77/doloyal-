"use client";

import * as React from "react";
import { Webhook, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PageHeader,
  Badge,
  Skeleton,
  EmptyState,
} from "@doloyal/ui";
import type { WebsiteConnectionWebhook } from "@doloyal/shared";
import { api } from "@/lib/api";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = React.useState<WebsiteConnectionWebhook[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setWebhooks(await api.listWebsiteConnectionWebhooks());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-28 w-full" />
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
        title="Webhooks"
        description="Outbound event deliveries for connected websites"
      />

      {webhooks.length === 0 ? (
        <EmptyState
          icon={<Webhook className="h-7 w-7" />}
          title="No webhooks configured"
          description="Webhooks are created automatically when you generate a website connection."
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{wh.website?.name ?? "Webhook"}</div>
                    <code className="text-xs text-[rgb(var(--color-muted-foreground))]">{wh.url}</code>
                  </div>
                  <Badge variant={wh.isActive ? "success" : "outline"}>
                    {wh.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {wh.events.map((event) => (
                    <Badge key={event} variant="outline" className="text-[0.65rem]">
                      {event}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  Secret · {wh.secretPrefix ?? "—"} · Failures · {wh.failureCount ?? 0}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
