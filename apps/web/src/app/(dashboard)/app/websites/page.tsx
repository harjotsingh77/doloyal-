"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Users,
  Clock,
  ArrowUpRight,
  Globe,
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Loader2,
  CheckCircle2,
  Building2,
  MessagesSquare,
  FileText,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PageHeader,
  Badge,
  Skeleton,
  Input,
  Textarea,
  Label,
  cn,
} from "@doloyal/ui";
import {
  WEBSITE_PROJECT_STATUS_LABELS,
  WEBSITE_TYPE_LABELS,
  BUSINESS_CATEGORY_LABELS,
  relativeTime,
  initials,
  avatarColor,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

const STATUS_VARIANT: Record<
  string,
  "default" | "primary" | "accent" | "success" | "danger" | "warning" | "outline"
> = {
  REQUESTED: "warning",
  REVIEWING: "primary",
  IN_DISCUSSION: "primary",
  IN_PROGRESS: "accent",
  DESIGN_REVIEW: "accent",
  DEVELOPMENT: "accent",
  READY_FOR_REVIEW: "warning",
  PUBLISHED: "success",
  COMPLETED: "success",
};

const WEBSITE_TYPE_ICON: Record<string, string> = {
  BUSINESS: "Business",
  BOOKING: "Booking",
  E_COMMERCE: "Store",
  PORTFOLIO: "Portfolio",
  LANDING_PAGE: "Landing",
  BLOG: "Blog",
};

const EXAMPLE_PROMPTS = [
  "Create a premium salon website with online booking.",
  "Build a modern café website with menu and reservations.",
  "Create a minimal gym website with memberships and booking.",
  "Design a dental clinic site with appointments & services.",
];

export default function WebsiteBuilderPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"ai" | "team">("ai");

  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // AI Builder state
  const [prompt, setPrompt] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [tenant, setTenant] = React.useState<any>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Team request state
  const [projectName, setProjectName] = React.useState("");
  const [websiteType, setWebsiteType] = React.useState("BUSINESS");
  const [teamGoal, setTeamGoal] = React.useState("");
  const [submittingTeam, setSubmittingTeam] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, currentTenant] = await Promise.all([
        api.listWebsiteProjects().catch(() => []),
        api.getTenant().catch(() => null),
      ]);
      setProjects(Array.isArray(data) ? data : []);
      setTenant(currentTenant);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const es = api.subscribeWebsiteProjectEvents();
    const refresh = () => void load();
    ["project.created", "project.status_changed", "project.assigned", "message.created", "project.updated"].forEach(
      (ev) => es?.addEventListener(ev, refresh),
    );
    es?.addEventListener("error", () => {});
    return () => es?.close();
  }, [load]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(next, 28)}px`;
  }, [prompt]);

  const handleGenerateAiWebsite = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Please enter a prompt to describe your website");
      return;
    }
    setGenerating(true);
    try {
      const site = await api.createWebsite({
        name: `${tenant?.name ?? "My Business"} Website`,
        description: trimmed,
        industry: tenant?.category ?? "OTHER",
      });
      await api.generateWebsite(site.id, {
        prompt: trimmed,
        industry: tenant?.category ?? "OTHER",
      });
      toast.success("Website created! Opening AI Builder...");
      router.push(`/app/websites/builder/${site.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to generate website. Please try again.");
      setGenerating(false);
    }
  };

  const handleSubmitTeamRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    setSubmittingTeam(true);
    try {
      const project = await api.createWebsiteProject({
        name: projectName.trim(),
        websiteType,
        goal: teamGoal.trim() || undefined,
        requirements: {
          businessName: tenant?.name ?? projectName.trim(),
          businessType: tenant?.category ?? "OTHER",
          businessPhone: tenant?.phone ?? undefined,
        },
      });
      toast.success("Project request sent to Doloyal Team!");
      setProjectName("");
      setTeamGoal("");
      void load();
      router.push(`/app/websites/${project.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to submit request.");
    } finally {
      setSubmittingTeam(false);
    }
  };

  const businessCategory =
    (tenant?.category &&
      BUSINESS_CATEGORY_LABELS[tenant.category as keyof typeof BUSINESS_CATEGORY_LABELS]) ??
    tenant?.category ??
    "Other";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Builder"
        description="Create your website with AI or let the Doloyal team build it for you."
        breadcrumbs={[{ label: "Home", href: "/app" }, { label: "Website Builder" }]}
        actions={
          <div className="flex items-center gap-2 rounded-xl bg-[rgb(var(--color-muted))] p-1 border border-[rgb(var(--color-border))]">
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200",
                activeTab === "ai"
                  ? "bg-[#105EF6] text-white shadow-sm"
                  : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Build Website with AI
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("team")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200",
                activeTab === "team"
                  ? "bg-[#105EF6] text-white shadow-sm"
                  : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]",
              )}
            >
              <Users className="h-3.5 w-3.5" />
              From Doloyal Team
            </button>
          </div>
        }
      />

      {/* ─── ACTIVE TAB VIEW ─── */}
      {activeTab === "ai" ? (
        <div className="flex flex-col justify-between min-h-[calc(100vh-14rem)] space-y-6 pt-4">
          {/* Clean canvas */}
          <div className="flex-1" />

          {/* Bottom Floating Pill Chat Box with Horizontal Suggestions */}
          <div className="max-w-3xl mx-auto w-full pb-4 space-y-3">
            {/* Horizontal Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 py-1 px-2 max-w-full">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-2xs backdrop-blur-xs transition-all hover:border-[#105EF6] hover:text-[#105EF6] hover:bg-[#105EF6]/5 active:scale-95 text-center max-w-full"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="relative w-full rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition focus-within:border-[#105EF6] focus-within:ring-2 focus-within:ring-[#105EF6]/20">
              <div className="flex items-end gap-2 px-3 py-3">
                {/* Action Icons */}
                <div className="flex items-center gap-1 pb-1">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B7280] transition hover:bg-slate-100 hover:text-[#111827]"
                    title="Attach file"
                    onClick={() => toast.info("File attachment ready")}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B7280] transition hover:bg-slate-100 hover:text-[#111827]"
                    title="Upload image"
                    onClick={() => toast.info("Image upload ready")}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B7280] transition hover:bg-slate-100 hover:text-[#111827]"
                    title="Voice input"
                    onClick={() => toast.info("Voice input ready")}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>

                {/* Textarea Input */}
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={generating}
                  placeholder="Describe your website or ask Doloyal AI to build..."
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleGenerateAiWebsite();
                    }
                  }}
                  className="max-h-[200px] min-h-[28px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-[#111827] outline-none placeholder:text-[#9CA3AF]"
                />

                {/* Send / Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateAiWebsite}
                  disabled={!prompt.trim() || generating}
                  className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#105EF6] text-white transition hover:bg-[#0D4FD2] disabled:cursor-not-allowed disabled:opacity-40"
                  title="Generate Website"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-[#9CA3AF]">
              Doloyal AI generates your custom website using your business data.
            </p>
          </div>
        </div>
      ) : (
        /* ─── DOLOYAL TEAM TAB VIEW ─── */
        <section className="mx-auto max-w-3xl space-y-6 pt-4">
          <Card className="shadow-md overflow-hidden border-[rgb(var(--color-border))]">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-[rgb(var(--color-border))] pb-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]">
                  <Users className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[rgb(var(--color-foreground))]">
                    Request Website Build from Doloyal Team
                  </h2>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    Our expert designers & developers will craft a custom website for your business.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitTeamRequest} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="text-xs font-bold">
                    Project Name *
                  </Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="E.g., Hair Salon Main Website"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Website Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "BUSINESS", label: "Business" },
                      { id: "BOOKING", label: "Booking" },
                      { id: "E_COMMERCE", label: "Store" },
                      { id: "LANDING_PAGE", label: "Landing" },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setWebsiteType(type.id)}
                        className={cn(
                          "flex items-center justify-center rounded-lg border py-2.5 px-3 text-xs font-semibold transition-all",
                          websiteType === type.id
                            ? "border-[#105EF6] bg-[#105EF6]/10 text-[#105EF6]"
                            : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-muted-foreground))] hover:border-[rgb(var(--color-foreground)/0.2)]",
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamGoal" className="text-xs font-bold">
                    What are your goals or design preferences?
                  </Label>
                  <Textarea
                    id="teamGoal"
                    value={teamGoal}
                    onChange={(e) => setTeamGoal(e.target.value)}
                    placeholder="Tell us what sections, features, colors, or references you want our team to include..."
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={submittingTeam || !projectName.trim()} className="w-full sm:w-auto gap-2 bg-[#105EF6] hover:bg-[#0D4FD2]">
                  {submittingTeam ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Request to Doloyal Team
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ─── EXISTING PROJECTS SECTION ─── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-3 h-4 w-24" />
                <Skeleton className="mt-6 h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length > 0 ? (
        <section className="space-y-4 pt-6 border-t border-[rgb(var(--color-border))]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">
                Your Website Projects
              </h3>
              <Badge variant="outline">{projects.length}</Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const unread = project.conversation?._count?.messages ?? 0;
  const websiteTypeLabel =
    WEBSITE_TYPE_LABELS[project.websiteType as keyof typeof WEBSITE_TYPE_LABELS] ??
    project.websiteType;
  const typeName = WEBSITE_TYPE_ICON[project.websiteType as keyof typeof WEBSITE_TYPE_ICON];
  const isPublished = project.status === "PUBLISHED" || project.status === "COMPLETED";
  const created = formatDay(project.createdAt);
  const updated = formatDay(project.updatedAt);

  return (
    <Card interactive className="group flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#105EF6]/10 text-[#105EF6]">
            <Globe className="h-5 w-5" />
          </div>
          {unread > 0 ? (
            <Badge variant="primary" className="rounded-full px-2">
              {unread} new
            </Badge>
          ) : (
            <ArrowUpRight className="h-4 w-4 text-[rgb(var(--color-muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>

        <h3 className="truncate font-semibold text-[rgb(var(--color-foreground))]">{project.name}</h3>
        <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
          {typeName ? `${typeName} website` : websiteTypeLabel}
          {project.requirements?.businessName ? ` · ${project.requirements.businessName}` : ""}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <Badge variant={STATUS_VARIANT[project.status] ?? "outline"}>
            {WEBSITE_PROJECT_STATUS_LABELS[project.status as keyof typeof WEBSITE_PROJECT_STATUS_LABELS] ??
              project.status}
          </Badge>
          <span className="flex items-center gap-1 text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
            <Clock className="h-3 w-3" />
            {relativeTime(project.updatedAt)}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-[rgb(var(--color-border))] pt-3 text-[0.6rem]">
          <div>
            <dt className="text-[rgb(var(--color-muted-foreground))]">Created</dt>
            <dd className="font-medium text-[rgb(var(--color-foreground))]">{created}</dd>
          </div>
          <div>
            <dt className="text-[rgb(var(--color-muted-foreground))]">Last updated</dt>
            <dd className="font-medium text-[rgb(var(--color-foreground))]">{updated}</dd>
          </div>
        </dl>

        {project.conversation?.assignedAdminName ? (
          <div className="mt-3 flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white"
              style={{ backgroundColor: avatarColor(project.conversation.assignedAdminName) }}
            >
              {initials(project.conversation.assignedAdminName)}
            </span>
            <span className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
              Team member: {project.conversation.assignedAdminName}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
            Awaiting team assignment
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild size="sm" className="bg-[#105EF6] hover:bg-[#0D4FD2]">
            <Link href={project.isAi ? `/app/websites/builder/${project.id}` : `/app/websites/${project.id}`}>
              Open Project
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/app/websites/${project.id}?tab=chat`}>
              <MessagesSquare className="h-3.5 w-3.5" />
              Chat
            </Link>
          </Button>
          {isPublished && project.liveUrl ? (
            <a href={project.liveUrl} target="_blank" rel="noreferrer" className="col-span-2">
              <Button size="sm" variant="outline" className="w-full">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Visit Website
              </Button>
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDay(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}