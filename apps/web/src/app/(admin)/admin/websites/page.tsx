"use client";

import * as React from "react";
import { FileText, Globe, Info, Sparkles } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminWebsiteBuilderOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

const STATUS_VARIANT: Record<string, string> = {
  GENERATED: "success",
  PUBLISHED: "success",
  DRAFT: "warning",
  FAILED: "danger",
  PENDING: "outline",
  PROCESSING: "outline",
};

export default function AdminWebsitesPage() {
  const [data, setData] = React.useState<AdminWebsiteBuilderOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .adminWebsiteBuilderOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState icon={<Globe className="h-10 w-10" />} title="Website builder data unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Builder"
        description="AI-generated websites across all businesses."
        breadcrumbs={[{ label: "Admin" }, { label: "Website Builder" }]}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AdminStatCard label="Total projects" value={data.totalProjects} icon={<Globe className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="Generated" value={data.generated} icon={<Sparkles className="h-4 w-4" />} tone="success" />
        <AdminStatCard label="Draft" value={data.draft} icon={<FileText className="h-4 w-4" />} tone="warning" />
        <AdminStatCard label="Published" value={data.published} icon={<Globe className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="Failed" value={data.failed} icon={<Info className="h-4 w-4" />} tone={data.failed > 0 ? "danger" : "success"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.history.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
              No website projects yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.history.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-[rgb(var(--color-foreground))]">{p.name}</TableCell>
                    <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">{p.businessName}</TableCell>
                    <TableCell className="font-mono text-xs">{p.model ?? "—"}</TableCell>
                    <TableCell className="hidden text-xs text-[rgb(var(--color-muted-foreground))] sm:table-cell">{relativeTime(p.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(STATUS_VARIANT[p.status] as any) ?? "outline"}>{p.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}