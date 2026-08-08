"use client";

import * as React from "react";
import {
  CircleHelp,
  Search,
  Mail,
  BookOpen,
  MessageSquare,
  ChevronDown,
  ExternalLink,
  FileText,
  LifeBuoy,
  Sparkles,
  CircleDollarSign,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  PageHeader,
  Badge,
} from "@doloyal/ui";

const FAQS = [
  {
    q: "What is doloyal AI and how does it work?",
    a: "doloyal AI is an AI-powered customer retention platform designed for salons, spas, and clinics. It tracks customer visits, manages loyalty points, automates campaigns, and uses AI to predict churn — all from one dashboard.",
  },
  {
    q: "How do I set up a loyalty program for my business?",
    a: "Navigate to the Loyalty section in your dashboard. You can define earning rules (e.g., points per visit or spend), set reward tiers, and activate memberships. Customers will automatically start earning points on their next visit.",
  },
  {
    q: "Can I send automated messages to my customers?",
    a: "Yes. doloyal AI supports automated birthday messages, win-back campaigns for inactive customers, and appointment reminders via WhatsApp, SMS, and Email. Configure these under the Campaigns section.",
  },
  {
    q: "How does the AI retention engine work?",
    a: "The AI engine analyzes customer behavior patterns — visit frequency, average spend, redemption history — to predict which customers are at risk of churning. It then recommends targeted campaigns to re-engage them.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, RuPay, Amex), UPI, and net banking. Enterprise plans can also pay via invoice. All payments are processed securely through Stripe.",
  },
  {
    q: "Can I integrate doloyal AI with my existing tools?",
    a: "doloyal AI offers integrations with Google Calendar, WhatsApp Business, Stripe, Shopify, Mailchimp, Google Analytics, Zapier, and QuickBooks. Visit the Integrations page to connect them.",
  },
  {
    q: "How do I add staff members to my account?",
    a: "Go to Settings > Staff Management. You can invite team members via email, assign roles (Admin, Manager, Staff), and set permissions for each role.",
  },
  {
    q: "What happens when I exceed my plan limits?",
    a: "You will receive a notification when you reach 80% of your plan limit. If you exceed it, features may be restricted until you upgrade. You can upgrade at any time from the Billing page.",
  },
];

const HELP_CATEGORIES = [
  {
    title: "Getting Started",
    description: "Set up your account, configure your business, and launch your loyalty program.",
    icon: <Sparkles className="h-5 w-5" />,
    articles: 12,
  },
  {
    title: "Account & Billing",
    description: "Manage your subscription, payment methods, and billing history.",
    icon: <CircleDollarSign className="h-5 w-5" />,
    articles: 8,
  },
  {
    title: "Features",
    description: "Learn about loyalty, campaigns, appointments, and rewards.",
    icon: <FileText className="h-5 w-5" />,
    articles: 24,
  },
  {
    title: "API & Integrations",
    description: "Developer docs, API reference, and integration guides.",
    icon: <ExternalLink className="h-5 w-5" />,
    articles: 16,
  },
  {
    title: "Troubleshooting",
    description: "Fix common issues, error codes, and known limitations.",
    icon: <LifeBuoy className="h-5 w-5" />,
    articles: 10,
  },
];

const QUICK_LINKS = [
  { label: "API Documentation", href: "#" },
  { label: "Integration Guides", href: "#" },
  { label: "Video Tutorials", href: "#" },
  { label: "Community Forum", href: "#" },
  { label: "System Status", href: "#" },
  { label: "Release Notes", href: "#" },
];

function HelpSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-[rgb(var(--color-muted))] animate-pulse" />
      <div className="h-4 w-72 rounded bg-[rgb(var(--color-muted))] animate-pulse" />
      <div className="h-12 w-full max-w-md rounded-lg bg-[rgb(var(--color-muted))] animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
            <div className="h-5 w-32 rounded bg-[rgb(var(--color-muted))] animate-pulse" />
            <div className="mt-2 h-4 w-full rounded bg-[rgb(var(--color-muted))] animate-pulse" />
            <div className="mt-1 h-4 w-3/4 rounded bg-[rgb(var(--color-muted))] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const faqFiltered = FAQS.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) return <HelpSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Help & Support"
        description="Find answers, explore guides, or get in touch with our team."
      />

      <div className="relative mx-auto max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
        <Input
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 w-full pl-10 text-base"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {HELP_CATEGORIES.map((cat) => (
          <Card key={cat.title} interactive className="group cursor-pointer">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary)/0.08)] text-[rgb(var(--color-primary))] transition-colors group-hover:bg-[rgb(var(--color-primary)/0.14)]">
                {cat.icon}
              </div>
              <CardTitle className="text-sm">{cat.title}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {cat.description}
              </CardDescription>
              <Badge variant="default">
                {cat.articles} articles
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CircleHelp className="h-5 w-5 text-[rgb(var(--color-primary))]" />
                <CardTitle>Frequently Asked Questions</CardTitle>
              </div>
              <CardDescription>
                Quick answers to the most common questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {faqFiltered.length === 0 ? (
                <p className="py-8 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
                  No matching questions found. Try a different search term.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {faqFiltered.map((faq, i) => {
                    const isOpen = openFaq === i;
                    return (
                      <div
                        key={i}
                        className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))]"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : i)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium transition-colors hover:bg-[rgb(var(--color-muted))]"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))] transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-200 ${
                            isOpen ? "max-h-96" : "max-h-0"
                          }`}
                        >
                          <p className="border-t border-[rgb(var(--color-border))] px-5 py-4 text-sm leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[rgb(var(--color-accent))]" />
                <CardTitle>Contact Support</CardTitle>
              </div>
              <CardDescription>
                Get help from our support team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-accent))]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email us</p>
                  <a
                    href="mailto:support@doloyal.ai"
                    className="text-sm text-[rgb(var(--color-primary))] hover:underline"
                  >
                    support@doloyal.ai
                  </a>
                </div>
              </div>
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="success" dot>
                    Online
                  </Badge>
                  <span className="text-sm text-[rgb(var(--color-muted-foreground))])">
                    Typically responds within 2 hours
                  </span>
                </div>
              </div>
              <Button variant="primary" className="w-full">
                <Mail className="h-4 w-4" />
                Send a Message
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />
                <CardTitle>Quick Links</CardTitle>
              </div>
              <CardDescription>
                Popular resources and documentation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {QUICK_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]"
                      onClick={(e) => e.preventDefault()}
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
