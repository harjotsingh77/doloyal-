"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@doloyal/ui";
import { useBranchWorkspace } from "../layout";
import { BranchHeader } from "../branch-section";

export default function BranchStaffPage() {
  const { stats } = useBranchWorkspace();

  return (
    <div className="space-y-6">
      <BranchHeader title="Team" />

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            Staff assigned to this branch. Their completed appointments and revenue are counted in
            this branch&apos;s numbers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stats.staff.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                title="No team members assigned"
                description="Open the main Staff page to add team members and assign them to this branch."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="pr-6 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 font-medium">{s.name}</TableCell>
                    <TableCell>{s.roleTitle || "Specialist"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isAvailable
                            ? "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]"
                            : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]"
                        }`}
                      >
                        {s.isAvailable ? "Available" : "Off duty"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
        Manage detailed schedules, invitations and permissions in the{" "}
        <a href="/app/staff" className="font-medium text-[rgb(var(--color-primary))] hover:underline">
          main Staff workspace
        </a>
        .
      </p>
    </div>
  );
}
