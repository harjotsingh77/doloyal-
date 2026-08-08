"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Globe,
  ArrowLeft,
  Save,
  Rocket,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  Plus,
  Sparkles,
  Trash2,
  GripVertical,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Image,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Palette,
  Layout,
  Copy,
  X,
  History,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Badge,
  Skeleton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@doloyal/ui";
import { WEBSITE_COMPONENT_LIBRARY } from "@doloyal/shared";
import type { WebsiteComponentDefinition } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ViewMode = "desktop" | "tablet" | "mobile";

export default function WebsiteBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [website, setWebsite] = React.useState<any>(null);
  const [pages, setPages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activePageId, setActivePageId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("desktop");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [publishing, setPublishing] = React.useState(false);
  const [publishResult, setPublishResult] = React.useState<any>(null);
  const [generating, setGenerating] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiOpen, setAiOpen] = React.useState(false);
  const [showAiPanel, setShowAiPanel] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"select" | "edit">("select");

  const loadWebsite = React.useCallback(async () => {
    try {
      const [site, sitePages] = await Promise.all([
        api.getWebsite(id),
        api.listPages(id),
      ]);
      setWebsite(site);
      const p = Array.isArray(sitePages) ? sitePages : site?.pages ?? [];
      setPages(p);
      if (!activePageId && p.length > 0) {
        const home = p.find((pg: any) => pg.isHome);
        setActivePageId(home?.id ?? p[0].id);
      }
    } catch (err) {
      console.error("Failed to load website", err);
    } finally {
      setLoading(false);
    }
  }, [id, activePageId]);

  React.useEffect(() => { loadWebsite(); }, [loadWebsite]);

  const activePage = pages.find((p) => p.id === activePageId);
  const otherPages = pages.filter((p) => p.id !== activePageId);

  const sectionComponents = React.useMemo(() => {
    const grouped: Record<string, WebsiteComponentDefinition[]> = {};
    for (const comp of WEBSITE_COMPONENT_LIBRARY) {
      if (!grouped[comp.category]) grouped[comp.category] = [];
      grouped[comp.category].push(comp);
    }
    return grouped;
  }, []);

  const handleGenerate = async () => {
    if (!aiPrompt.trim() || !website) return;
    setGenerating(true);
    try {
      const result = await api.generateWebsite(website.id, {
        prompt: aiPrompt,
        industry: website.industry,
      });
      toast.success("Website generated successfully!");
      setAiPrompt("");
      setAiOpen(false);
      loadWebsite();
    } catch (err: any) {
      toast.error(err.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!website) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const result = await api.publishWebsite(website.id);
      setPublishResult(result);
      toast.success("Website published successfully!");
      loadWebsite();
    } catch (err: any) {
      toast.error(err.message ?? "Publishing failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleAddSection = async (component: string) => {
    if (!website || !activePageId) return;
    try {
      const comp = WEBSITE_COMPONENT_LIBRARY.find((c) => c.type === component);
      await api.addSection(website.id, activePageId, {
        component,
        content: { type: component.toLowerCase(), data: {} },
      });
      toast.success(`Added ${comp?.label ?? component} section`);
      loadWebsite();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add section");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!website) return;
    try {
      await api.deleteSection(website.id, sectionId);
      toast.success("Section deleted");
      loadWebsite();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete section");
    }
  };

  const handleAiEditSection = async (sectionId: string) => {
    if (!website || !activePage?.slug) return;
    setShowAiPanel(true);
    setAiPrompt("");
  };

  const handleAiSubmitForSection = async (sectionId: string) => {
    if (!aiPrompt.trim() || !website || !activePage?.slug) return;
    try {
      await api.regenerateSection(website.id, {
        pageSlug: activePage.slug,
        sectionId,
        prompt: aiPrompt,
      });
      toast.success("Section updated with AI");
      setAiPrompt("");
      loadWebsite();
    } catch (err: any) {
      toast.error(err.message ?? "AI edit failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-[rgb(var(--color-danger))] mb-4" />
        <h2 className="text-xl font-bold">Website not found</h2>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/app/websites")}>
          <ArrowLeft className="h-4 w-4" /> Back to Websites
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/app/websites")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-[rgb(var(--color-border))]" />
          <Globe className="h-4 w-4 text-[rgb(var(--color-primary))]" />
          <div>
            <h1 className="text-sm font-semibold">{website.name}</h1>
            <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
              {website.status} · v{website.draftVersion}
            </p>
          </div>
          <Badge variant="outline" className="ml-2 text-[0.55rem] uppercase">
            {website.industry?.replace(/_/g, " ") ?? "General"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-[rgb(var(--color-border))] p-0.5">
            {(["desktop", "tablet", "mobile"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === mode ? "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]" : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
                }`}
              >
                {mode === "desktop" ? <Monitor className="h-4 w-4" /> : mode === "tablet" ? <Tablet className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[rgb(var(--color-border))]" />

          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            {sidebarOpen ? "Hide Panel" : "Show Panel"}
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setAiOpen(true)} disabled={generating}>
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating..." : "AI Generate"}
          </Button>

          <Button size="sm" variant="secondary" onClick={handlePublish} loading={publishing}>
            <Rocket className="h-4 w-4" />
            {publishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-72 shrink-0 overflow-y-auto border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
            <Tabs defaultValue="pages" className="h-full">
              <TabsList className="w-full rounded-none border-b border-[rgb(var(--color-border))] px-2">
                <TabsTrigger value="pages" className="flex-1 text-xs">Pages</TabsTrigger>
                <TabsTrigger value="components" className="flex-1 text-xs">Components</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="pages" className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                    Pages ({pages.length})
                  </span>
                  <Button variant="ghost" size="icon-sm" onClick={async () => {
                    const title = prompt("Page title:");
                    if (!title) return;
                    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    try {
                      await api.createPage(website.id, { title, slug });
                      toast.success("Page created");
                      loadWebsite();
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                  }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {pages.map((page: any) => (
                  <button
                    key={page.id}
                    onClick={() => setActivePageId(page.id)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activePageId === page.id ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))] font-medium" : "hover:bg-[rgb(var(--color-muted))]"
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{page.title}</span>
                    {page.isHome && <Badge variant="outline" className="text-[0.5rem]">Home</Badge>}
                    <Badge variant={page.status === "PUBLISHED" ? "success" : "outline"} className="text-[0.5rem]">{page.status === "PUBLISHED" ? "Live" : "Draft"}</Badge>
                  </button>
                ))}
                {otherPages.map((page: any) => null)}
              </TabsContent>

              <TabsContent value="components" className="p-3 space-y-4 overflow-y-auto">
                {Object.entries(sectionComponents).map(([category, comps]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))] mb-2 capitalize">
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {comps.map((comp) => (
                        <button
                          key={comp.type}
                          onClick={() => handleAddSection(comp.type)}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[rgb(var(--color-muted))] transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[rgb(var(--color-muted))]">
                            <Layout className="h-3.5 w-3.5 text-[rgb(var(--color-muted-foreground))]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{comp.label}</p>
                            <p className="text-[0.55rem] text-[rgb(var(--color-muted-foreground))] truncate">{comp.description}</p>
                          </div>
                          <Plus className="h-3 w-3 text-[rgb(var(--color-muted-foreground))] shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="settings" className="p-3 space-y-4">
                <div>
                  <Label className="text-xs">Website Name</Label>
                  <Input value={website.name} onChange={() => {}} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Theme Preset</Label>
                  <Select value={website.theme?.preset ?? "MODERN"}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREMIUM">Premium</SelectItem>
                      <SelectItem value="MODERN">Modern</SelectItem>
                      <SelectItem value="MINIMAL">Minimal</SelectItem>
                      <SelectItem value="BOLD">Bold</SelectItem>
                      <SelectItem value="ELEGANT">Elegant</SelectItem>
                      <SelectItem value="WARM">Warm</SelectItem>
                      <SelectItem value="DARK">Dark</SelectItem>
                      <SelectItem value="LIGHT">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Primary Color</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border border-[rgb(var(--color-border))]" style={{ backgroundColor: website.theme?.primaryColor ?? "#2563EB" }} />
                    <Input value={website.theme?.primaryColor ?? "#2563EB"} onChange={() => {}} className="flex-1 text-sm" />
                  </div>
                </div>
                {website.liveUrl && (
                  <div className="rounded-lg border border-[rgb(var(--color-border))] p-3">
                    <p className="text-xs font-medium mb-1">Live URL</p>
                    <a href={website.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[rgb(var(--color-primary))] hover:underline">
                      {website.liveUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto bg-[rgb(var(--color-muted))]">
          <div className={`mx-auto py-6 transition-all ${
            viewMode === "desktop" ? "max-w-5xl" : viewMode === "tablet" ? "max-w-2xl" : "max-w-sm"
          }`}>
            {activePage ? (
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-soft overflow-hidden">
                {/* Page Header */}
                <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[rgb(var(--color-primary))]" />
                    <span className="text-sm font-semibold">{activePage.title}</span>
                    {activePage.isHome && <Badge variant="outline" className="text-[0.5rem]">Home</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleAiEditSection("new")}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                    {activePage.seo && (
                      <span className="text-[0.55rem] text-[rgb(var(--color-muted-foreground))]">
                        SEO Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* Sections */}
                <div className="divide-y divide-[rgb(var(--color-border))]">
                  {activePage.sections?.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                      <Layout className="h-10 w-10 text-[rgb(var(--color-muted-foreground))] mb-3" />
                      <p className="text-sm font-medium">No sections yet</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))] mb-4">Add sections from the Components panel</p>
                    </div>
                  ) : (
                    activePage.sections?.map((section: any, idx: number) => (
                      <div key={section.id} className="group relative">
                        <SectionRenderer section={section} />
                        {/* Section Controls */}
                        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" size="icon-sm" onClick={() => handleAiEditSection(section.id)}>
                            <Sparkles className="h-3 w-3" />
                          </Button>
                          <Button variant="secondary" size="icon-sm" onClick={() => handleDeleteSection(section.id)}>
                            <Trash2 className="h-3 w-3 text-[rgb(var(--color-danger))]" />
                          </Button>
                        </div>
                        {/* AI Edit Panel */}
                        {showAiPanel && (
                          <div className="border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] p-3">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Describe the change you want..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="flex-1 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAiSubmitForSection(section.id);
                                }}
                              />
                              <Button size="sm" onClick={() => handleAiSubmitForSection(section.id)}>
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {["Make it premium", "Change colors", "Rewrite text", "Add CTA"].map((suggestion) => (
                                <button
                                  key={suggestion}
                                  onClick={() => { setAiPrompt(suggestion); handleAiSubmitForSection(section.id); }}
                                  className="text-[0.55rem] px-2 py-1 rounded-full bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Section Inline */}
                <div className="flex items-center justify-center border-t border-dashed border-[rgb(var(--color-border))] py-4">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const sidebarTab = document.querySelector('[data-value="components"]');
                    if (sidebarTab) (sidebarTab as HTMLElement).click();
                  }}>
                    <Plus className="h-4 w-4" /> Add Section
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <FileText className="h-12 w-12 text-[rgb(var(--color-muted-foreground))] mb-4" />
                <h3 className="font-semibold">No page selected</h3>
                <p className="text-sm text-[rgb(var(--color-muted-foreground))]">Select a page from the sidebar or create a new one</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Generation Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[rgb(var(--color-primary))]" />
              Generate Website with AI
            </DialogTitle>
            <DialogDescription>
              Describe your ideal website. We'll use your business info to generate a complete site.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="min-h-[120px] rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your website... For example: Create a premium salon website with a elegant design, dark purple theme, showcasing our haircut and coloring services. Include a booking section, staff profiles, and customer testimonials..."
                className="w-full min-h-[100px] bg-transparent text-sm resize-none focus:outline-none placeholder:text-[rgb(var(--color-muted-foreground))]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "Create a modern salon website with booking",
                "Design a luxury spa website with calm colors",
                "Build a fitness gym website with bold energy",
                "Make a restaurant website with food gallery",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setAiPrompt(suggestion)}
                  className="text-[0.6rem] px-2.5 py-1.5 rounded-full bg-[rgb(var(--color-muted))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} loading={generating} disabled={!aiPrompt.trim()}>
              <Sparkles className="h-4 w-4" />
              {generating ? "Generating..." : "Generate Website"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Result Dialog */}
      <Dialog open={!!publishResult} onOpenChange={(o) => { if (!o) setPublishResult(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[rgb(var(--color-success))]" />
              Published Successfully
            </DialogTitle>
          </DialogHeader>
          {publishResult && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[rgb(var(--color-muted-foreground))]">Version</span>
                  <span className="text-sm font-semibold">v{publishResult.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[rgb(var(--color-muted-foreground))]">Build Time</span>
                  <span className="text-sm font-semibold">{(publishResult.buildTimeMs / 1000).toFixed(1)}s</span>
                </div>
                {publishResult.lighthouse && (
                  <>
                    <div className="border-t border-[rgb(var(--color-border))] pt-3">
                      <p className="text-xs font-medium mb-2">Lighthouse Scores</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(publishResult.lighthouse).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-[rgb(var(--color-muted-foreground))] capitalize">{key}</span>
                            <span className={`font-semibold ${(val as number) >= 90 ? "text-[rgb(var(--color-success))]" : (val as number) >= 70 ? "text-[rgb(var(--color-warning))]" : "text-[rgb(var(--color-danger))]"}`}>
                              {val as number}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {publishResult.liveUrl && (
                  <div className="border-t border-[rgb(var(--color-border))] pt-3">
                    <a href={publishResult.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[rgb(var(--color-primary))] hover:underline">
                      <ExternalLink className="h-4 w-4" /> {publishResult.liveUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPublishResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section Renderer ─────────────────────────────────────────────────────────

function SectionRenderer({ section }: { section: any }) {
  const comp = section.component;
  const data = section.content?.data ?? {};

  switch (comp) {
    case "HERO":
      return (
        <div className="relative overflow-hidden bg-gradient-to-br from-[rgb(var(--color-primary)/0.08)] to-transparent px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-3">{data.headline ?? "Hero Headline"}</h2>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))] max-w-xl mx-auto mb-6">{data.subheadline ?? "Subtitle"}</p>
          <div className="flex items-center justify-center gap-3">
            {data.cta && <Button>{data.cta.text ?? "Get Started"}</Button>}
            {data.secondaryCta && <Button variant="secondary">{data.secondaryCta.text ?? "Learn More"}</Button>}
          </div>
        </div>
      );
    case "SERVICES":
      return (
        <div className="px-8 py-12">
          <h3 className="text-xl font-bold text-center mb-8">{data.headline ?? "Our Services"}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data.items ?? []).map((item: any, i: number) => (
              <div key={i} className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
                <h4 className="font-semibold">{item.name}</h4>
                {item.description && <p className="text-xs text-[rgb(var(--color-muted-foreground))] mt-1">{item.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  {item.price && <span className="text-sm font-bold">₹{item.price}</span>}
                  {item.duration && <span className="text-xs text-[rgb(var(--color-muted-foreground))]">{item.duration} min</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "CTA":
      return (
        <div className="bg-[rgb(var(--color-primary))] px-8 py-12 text-center">
          <h3 className="text-xl font-bold text-white mb-2">{data.headline ?? "Call to Action"}</h3>
          {data.subheadline && <p className="text-sm text-white/80 mb-4">{data.subheadline}</p>}
          <Button variant="secondary">{data.buttonText ?? "Get Started"}</Button>
        </div>
      );
    case "ABOUT":
      return (
        <div className="px-8 py-12">
          <h3 className="text-xl font-bold mb-4">{data.headline ?? "About Us"}</h3>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))] max-w-2xl">{data.body ?? "Your story here"}</p>
        </div>
      );
    case "CONTACT":
      return (
        <div className="px-8 py-12">
          <h3 className="text-xl font-bold mb-4">{data.headline ?? "Contact Us"}</h3>
          <div className="space-y-2 text-sm">
            {data.phone && <p>📞 {data.phone}</p>}
            {data.email && <p>✉️ {data.email}</p>}
            {data.address && <p>📍 {data.address}</p>}
          </div>
        </div>
      );
    case "TESTIMONIALS":
      return (
        <div className="px-8 py-12">
          <h3 className="text-xl font-bold text-center mb-8">{data.headline ?? "Testimonials"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {(data.items ?? []).map((item: any, i: number) => (
              <div key={i} className="rounded-xl border border-[rgb(var(--color-border))] p-4">
                <p className="text-sm italic">"{item.text}"</p>
                <p className="text-xs font-medium mt-2">— {item.name}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "FAQ":
      return (
        <div className="px-8 py-12">
          <h3 className="text-xl font-bold mb-6">{data.headline ?? "FAQ"}</h3>
          <div className="space-y-3 max-w-2xl">
            {(data.items ?? []).map((item: any, i: number) => (
              <details key={i} className="rounded-xl border border-[rgb(var(--color-border))] p-4">
                <summary className="text-sm font-medium cursor-pointer">{item.question}</summary>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))] mt-2">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      );
    case "GALLERY":
      return (
        <div className="px-8 py-12">
          <h3 className="text-xl font-bold text-center mb-8">{data.headline ?? "Gallery"}</h3>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-[rgb(var(--color-muted))] flex items-center justify-center">
                <Image className="h-6 w-6 text-[rgb(var(--color-muted-foreground))]" />
              </div>
            ))}
          </div>
        </div>
      );
    case "TEAM":
      return (
        <div className="px-8 py-12">
          <h3 className="text-xl font-bold text-center mb-8">{data.headline ?? "Our Team"}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data.members ?? []).map((member: any, i: number) => (
              <div key={i} className="text-center p-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-[rgb(var(--color-muted))] mb-3" />
                <h4 className="font-semibold text-sm">{member.name}</h4>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "FEATURES":
      return (
        <div className="px-8 py-12">
          <div className="grid gap-6 sm:grid-cols-3">
            {(data.items ?? []).map((item: any, i: number) => (
              <div key={i} className="text-center">
                <div className="mx-auto h-10 w-10 rounded-xl bg-[rgb(var(--color-primary)/0.1)] flex items-center justify-center mb-3">
                  <div className="h-5 w-5 rounded bg-[rgb(var(--color-primary))]" />
                </div>
                <h4 className="font-semibold text-sm">{item.title}</h4>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))] mt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "STATS":
      return (
        <div className="px-8 py-12 bg-[rgb(var(--color-muted))]">
          <div className="grid gap-6 sm:grid-cols-3 text-center">
            {(data.items ?? []).map((item: any, i: number) => (
              <div key={i}>
                <p className="text-2xl font-bold text-[rgb(var(--color-primary))]">{item.value}</p>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "FOOTER":
      return (
        <div className="border-t border-[rgb(var(--color-border))] px-8 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
          <p>© 2026 doloyal AI. All rights reserved.</p>
        </div>
      );
    case "HEADER":
      return (
        <div className="border-b border-[rgb(var(--color-border))] px-8 py-3 flex items-center justify-between">
          <span className="font-bold text-sm">Logo</span>
          <div className="flex items-center gap-4 text-xs text-[rgb(var(--color-muted-foreground))]">
            <span>Home</span>
            <span>About</span>
            <span>Services</span>
            <span>Contact</span>
          </div>
        </div>
      );
    default:
      return (
        <div className="px-8 py-12 text-center">
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{comp} Section</p>
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Edit content in the page builder</p>
        </div>
      );
  }
}
