"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, PageHeader } from "@doloyal/ui";

export default function WidgetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Widgets"
        description="Embed booking, chat, and lead forms on connected websites"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Booking Widget",
            description: "Let customers book appointments that sync to your dashboard.",
            href: "/app/appointments/widget",
          },
          {
            title: "Lead / Contact Form",
            description: "Capture leads from your website into doloyal AI CRM.",
            href: "/app/website-connections/documentation",
          },
          {
            title: "AI Chat Widget",
            description: "Embed AI customer support powered by doloyal AI.",
            href: "/app/assistant",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutTemplate className="h-4 w-4" />
                {item.title}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="secondary" asChild>
                <Link href={item.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
