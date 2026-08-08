"use client";

import * as React from "react";
import { Code2, Copy, Check } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  PageHeader,
  Skeleton,
} from "@doloyal/ui";
import type { ConnectedWebsite } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function SdkPage() {
  const [sites, setSites] = React.useState<ConnectedWebsite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    api
      .listConnectedWebsites()
      .then((data) => {
        setSites(data);
        if (data[0]) setSelectedId(data[0].id);
      })
      .catch(() => toast.error("Failed to load connections"))
      .finally(() => setLoading(false));
  }, []);

  const selected = sites.find((s) => s.id === selectedId) ?? sites[0];
  const snippet = selected
    ? `<!-- Doloyal SDK -->
<script
  src="https://cdn.doloyal.ai/sdk.js"
  data-business-id="${selected.businessId}"
  data-public-key="${selected.publicKey ?? "lf_pk_YOUR_KEY"}"
  data-connection-token="${selected.connectionToken}"
  async
></script>`
    : `<!-- Connect a website first to get your keys -->
<script src="https://cdn.doloyal.ai/sdk.js" async></script>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("SDK snippet copied");
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SDK"
        description="Install the Doloyal SDK on any website with one script tag"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4" />
            Universal install snippet
          </CardTitle>
          <CardDescription>
            Works with HTML, PHP, React, Next.js, Vue, Laravel, WordPress, Shopify, and custom sites.
            Full SDK methods ship in the next section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sites.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sites.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={selected?.id === s.id ? "primary" : "secondary"}
                  onClick={() => setSelectedId(s.id)}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          )}
          <pre className="overflow-x-auto rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.35)] p-4 text-xs leading-relaxed">
            {snippet}
          </pre>
          <Button size="sm" onClick={() => void handleCopy()}>
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            Copy snippet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
