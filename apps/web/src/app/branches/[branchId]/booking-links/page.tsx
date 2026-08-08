"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Link2, Plus, MousePointerClick, CalendarDays, Percent } from "lucide-react";
import {
  PageHeader,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
} from "@doloyal/ui";
import { useBranch } from "@/lib/branch-context";
import { generateLinks } from "@/lib/branches";
import { PageSkeleton, usePageLoading } from "@/components/branch-ui";

export default function BranchBookingLinksPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const loading = usePageLoading(420);

  const links = React.useMemo(() => (branchId ? generateLinks(branchId) : []), [branchId]);

  if (loading || !selectedBranch) return <PageSkeleton cards={3} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Links"
        description={`Booking links created for ${selectedBranch.name}.`}
        actions={<Button><Plus className="h-4 w-4" /> New Booking Link</Button>}
      />

      {links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-6 w-6" />}
          title="No booking links yet"
          description="Create a shareable link so customers can book at this branch."
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{l.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="cursor-pointer text-sm text-[rgb(var(--color-primary))] hover:underline">{l.url}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5 text-[rgb(var(--color-muted-foreground))]" />{l.clicks}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-[rgb(var(--color-muted-foreground))]" />{l.bookings}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary"><Percent className="h-3 w-3" />{l.conversion}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}