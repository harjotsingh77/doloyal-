"use client";

import * as React from "react";
import { KeyRound, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PageHeader,
  Badge,
  Skeleton,
  EmptyState,
} from "@doloyal/ui";
import type { WebsiteConnectionApiKey } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ApiKeysPage() {
  const [keys, setKeys] = React.useState<WebsiteConnectionApiKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setKeys(await api.listWebsiteConnectionApiKeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
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
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
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
        title="API Keys"
        description="Public and secret keys generated for each connected website"
      />

      {keys.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-7 w-7" />}
          title="No API keys yet"
          description="Generate a connection from Connected Websites to create API keys."
        />
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{key.website?.name ?? key.label ?? "API Key"}</div>
                    <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      Business ID · {key.businessId}
                    </div>
                  </div>
                  <Badge variant={key.isActive ? "success" : "danger"}>
                    {key.isActive ? "Active" : "Revoked"}
                  </Badge>
                </div>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <div className="text-[rgb(var(--color-muted-foreground))]">Public Key</div>
                    <code className="break-all">{key.publicKey}</code>
                  </div>
                  <div>
                    <div className="text-[rgb(var(--color-muted-foreground))]">Secret Key</div>
                    <code>{key.secretKeyPrefix}</code>
                  </div>
                  <div>
                    <div className="text-[rgb(var(--color-muted-foreground))]">Webhook Secret</div>
                    <code>{key.webhookSecretPrefix ?? "—"}</code>
                  </div>
                  <div>
                    <div className="text-[rgb(var(--color-muted-foreground))]">Created</div>
                    <div>{new Date(key.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
