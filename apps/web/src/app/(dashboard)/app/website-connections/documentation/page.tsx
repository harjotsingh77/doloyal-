"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, PageHeader } from "@doloyal/ui";

export default function DocumentationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation"
        description="How Website Connections turn Doloyal into your business backend"
      />

      <div className="grid gap-4">
        {[
          {
            title: "1. Connect your website",
            body: "Open Connected Websites → Connect Website. Enter URL and framework, then click Generate Connection to create Business ID, public/secret keys, webhook secret, and connection token.",
          },
          {
            title: "2. Install the SDK",
            body: "Paste the script from the SDK tab into your website. One install works for HTML, PHP, React, Next.js, Vue, Laravel, WordPress, Shopify, and custom stacks.",
          },
          {
            title: "3. Automatic sync (coming next)",
            body: "Customer signup, login, bookings, memberships, loyalty, rewards, forms, and payments will sync to Doloyal in real time through public SDK APIs.",
          },
          {
            title: "Security",
            body: "Every request will validate Business ID, public key, JWT, origin, rate limits, and API keys. Secret keys are stored hashed and shown only once at generation.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                {item.title}
              </CardTitle>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </div>
  );
}
