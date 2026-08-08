"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Plus,
  ExternalLink,
  Eye,
  RefreshCw,
  MoreHorizontal,
  Copy,
  Trash2,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Rocket,
  Palette,
  Monitor,
  Smartphone,
  Tablet,
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
  EmptyState,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@doloyal/ui";
import { WEBSITE_STATUS } from "@doloyal/shared";
import { api } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]",
  GENERATING: "bg-[rgb(var(--color-warning)/0.15)] text-[rgb(var(--color-warning))]",
  PUBLISHED: "bg-[rgb(var(--color-success)/0.15)] text-[rgb(var(--color-success))]",
  ARCHIVED: "bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]",
};

export default function WebsitesPage() {
  const router = useRouter();
  const [sites, setSites] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newIndustry, setNewIndustry] = React.useState("BEAUTY_SALON");
  const [creating, setCreating] = React.useState(false);

  const loadSites = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listWebsites();
      setSites(Array.isArray(data) ? data : []);
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadSites(); }, [loadSites]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.createWebsite({ name: newName.trim(), industry: newIndustry });
      setCreateOpen(false);
      setNewName("");
      loadSites();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Builder"
        description="Create, manage, and publish AI-powered websites for your business."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                New Website
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Website</DialogTitle>
                <DialogDescription>
                  Give your website a name and select your industry. You can customize everything later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Website Name</Label>
                  <Input
                    placeholder="My Salon Website"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Select value={newIndustry} onValueChange={setNewIndustry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEAUTY_SALON">Beauty Salon</SelectItem>
                      <SelectItem value="BARBER_SHOP">Barber Shop</SelectItem>
                      <SelectItem value="GYM">Gym / Fitness</SelectItem>
                      <SelectItem value="SPA">Spa & Wellness</SelectItem>
                      <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                      <SelectItem value="CAFE">Café</SelectItem>
                      <SelectItem value="DENTAL_CLINIC">Dental Clinic</SelectItem>
                      <SelectItem value="CLINIC">Medical Clinic</SelectItem>
                      <SelectItem value="PET_GROOMING">Pet Grooming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button loading={creating} onClick={handleCreate}>Create Website</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5"><Skeleton className="h-40 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : sites.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={<Globe className="h-12 w-12" />}
              title="No websites yet"
              description="Create your first AI-powered website. We'll use your business info to generate a beautiful site."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create Your First Website
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <WebsiteCard key={site.id} site={site} onRefresh={loadSites} />
          ))}
        </div>
      )}
    </div>
  );
}

function WebsiteCard({ site, onRefresh }: { site: any; onRefresh: () => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteWebsite(site.id);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      await api.duplicateWebsite(site.id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card interactive className="group relative overflow-hidden">
      <div className="absolute right-3 top-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/app/websites/${site.id}`)}>
              <Eye className="h-4 w-4" /> Open Builder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 text-[rgb(var(--color-danger))]" />
              <span className="text-[rgb(var(--color-danger))]">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-5 pt-12" onClick={() => router.push(`/app/websites/${site.id}`)}>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)]">
          <Globe className="h-6 w-6 text-[rgb(var(--color-primary))]" />
        </div>
        <h3 className="font-semibold truncate">{site.name}</h3>
        {site.description && (
          <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))] line-clamp-2">{site.description}</p>
        )}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={STATUS_STYLES[site.status] ?? ""}>
            {site.status}
          </Badge>
          {site.totalPages > 0 && (
            <span className="flex items-center gap-1 text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
              <FileText className="h-3 w-3" /> {site.totalPages} pages
            </span>
          )}
        </div>
        {site.lastDeployment && (
          <p className="mt-2 text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
            Published {new Date(site.lastDeployment.createdAt).toLocaleDateString()}
          </p>
        )}
        {site.liveUrl && (
          <div className="mt-3 flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-[rgb(var(--color-success))]" />
            <span className="text-[0.6rem] text-[rgb(var(--color-success))] truncate">{site.liveUrl}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
