import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class WebsitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const sites = await this.prisma.website.findMany({
      where: { tenantId },
      include: {
        pages: { include: { sections: true }, orderBy: { sortOrder: "asc" } },
        domains: true,
        deployments: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { pages: true, assets: true, domains: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return sites.map((s) => ({
      ...s,
      totalPages: s._count.pages,
      assetCount: s._count.assets,
      domainCount: s._count.domains,
      lastDeployment: s.deployments[0] ?? null,
      liveUrl: s.status === "PUBLISHED" ? `https://${s.slug}.doloyal.ai` : null,
      previewUrl: s.status !== "ARCHIVED" ? `/api/websites/${s.id}/preview` : null,
    }));
  }

  async get(tenantId: string, id: string) {
    const site = await this.prisma.website.findFirst({
      where: { id, tenantId },
      include: {
        pages: { include: { sections: true }, orderBy: { sortOrder: "asc" } },
        assets: true,
        domains: true,
        deployments: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!site) throw new NotFoundException("Website not found");
    return site;
  }

  async create(tenantId: string, dto: { name: string; description?: string; industry?: string }) {
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) + "-" + Date.now().toString(36);
    const existing = await this.prisma.website.findUnique({ where: { slug } });
    if (existing) throw new ConflictException("Website slug already exists");
    return this.prisma.website.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        industry: dto.industry,
        theme: {
          preset: "MODERN",
          primaryColor: "#2563EB",
          secondaryColor: "#60A5FA",
          accentColor: "#8B5CF6",
          backgroundColor: "#FFFFFF",
          surfaceColor: "#F8FAFC",
          textColor: "#0F172A",
          headingFont: "Inter",
          bodyFont: "Inter",
          borderRadius: "1rem",
          spacing: "1.5rem",
        },
      },
    });
  }

  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    const site = await this.prisma.website.findFirst({ where: { id, tenantId } });
    if (!site) throw new NotFoundException("Website not found");
    return this.prisma.website.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    const site = await this.prisma.website.findFirst({ where: { id, tenantId } });
    if (!site) throw new NotFoundException("Website not found");
    await this.prisma.website.update({ where: { id }, data: { status: "ARCHIVED" } });
  }

  async duplicate(tenantId: string, id: string) {
    const site = await this.prisma.website.findFirst({
      where: { id, tenantId },
      include: { pages: { include: { sections: true } } },
    });
    if (!site) throw new NotFoundException("Website not found");
    const newSlug = `${site.slug}-copy-${Date.now().toString(36)}`;
    const created = await this.prisma.website.create({
      data: {
        tenantId,
        name: `${site.name} (Copy)`,
        slug: newSlug,
        description: site.description,
        industry: site.industry,
        status: "DRAFT",
        theme: site.theme as any,
        brandData: site.brandData as any,
      },
    });
    for (const page of site.pages) {
      const newPage = await this.prisma.websitePage.create({
        data: {
          websiteId: created.id,
          title: page.title,
          slug: page.slug,
          sortOrder: page.sortOrder,
          isHome: page.isHome,
          seo: page.seo as any,
        },
      });
      for (const section of page.sections) {
        await this.prisma.websiteSection.create({
          data: {
            pageId: newPage.id,
            component: section.component as any,
            sortOrder: section.sortOrder,
            content: section.content as any,
            styles: section.styles as any,
          },
        });
      }
    }
    return created;
  }

  // ─── Pages ──────────────────────────────────────────────────────────────────

  async listPages(tenantId: string, websiteId: string) {
    const site = await this.prisma.website.findFirst({ where: { id: websiteId, tenantId } });
    if (!site) throw new NotFoundException("Website not found");
    return this.prisma.websitePage.findMany({
      where: { websiteId },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createPage(tenantId: string, websiteId: string, dto: { title: string; slug: string; isHome?: boolean }) {
    const site = await this.prisma.website.findFirst({ where: { id: websiteId, tenantId } });
    if (!site) throw new NotFoundException("Website not found");
    const maxOrder = await this.prisma.websitePage.findFirst({
      where: { websiteId },
      orderBy: { sortOrder: "desc" },
    });
    return this.prisma.websitePage.create({
      data: {
        websiteId,
        title: dto.title,
        slug: dto.slug,
        sortOrder: (maxOrder?.sortOrder ?? 0) + 1,
        isHome: dto.isHome ?? false,
      },
    });
  }

  async updatePage(tenantId: string, websiteId: string, pageId: string, dto: Record<string, unknown>) {
    const page = await this.prisma.websitePage.findFirst({
      where: { id: pageId, websiteId, website: { tenantId } },
    });
    if (!page) throw new NotFoundException("Page not found");
    return this.prisma.websitePage.update({ where: { id: pageId }, data: dto });
  }

  async deletePage(tenantId: string, websiteId: string, pageId: string) {
    const page = await this.prisma.websitePage.findFirst({
      where: { id: pageId, websiteId, website: { tenantId } },
    });
    if (!page) throw new NotFoundException("Page not found");
    await this.prisma.websiteSection.deleteMany({ where: { pageId } });
    await this.prisma.websitePage.delete({ where: { id: pageId } });
  }

  // ─── Sections ───────────────────────────────────────────────────────────────

  async updateSection(tenantId: string, websiteId: string, sectionId: string, dto: Record<string, unknown>) {
    const section = await this.prisma.websiteSection.findFirst({
      where: { id: sectionId, page: { websiteId, website: { tenantId } } },
    });
    if (!section) throw new NotFoundException("Section not found");
    return this.prisma.websiteSection.update({ where: { id: sectionId }, data: dto });
  }

  async addSection(tenantId: string, websiteId: string, pageId: string, dto: {
    component: string; content: Record<string, unknown>; sortOrder?: number; styles?: Record<string, unknown>;
  }) {
    const page = await this.prisma.websitePage.findFirst({
      where: { id: pageId, websiteId, website: { tenantId } },
    });
    if (!page) throw new NotFoundException("Page not found");
    const maxOrder = await this.prisma.websiteSection.findFirst({
      where: { pageId },
      orderBy: { sortOrder: "desc" },
    });
    return this.prisma.websiteSection.create({
      data: {
        pageId,
        component: dto.component as any,
        sortOrder: dto.sortOrder ?? (maxOrder?.sortOrder ?? 0) + 1,
        content: dto.content as any,
        styles: dto.styles as any,
      },
    });
  }

  async deleteSection(tenantId: string, websiteId: string, sectionId: string) {
    const section = await this.prisma.websiteSection.findFirst({
      where: { id: sectionId, page: { websiteId, website: { tenantId } } },
    });
    if (!section) throw new NotFoundException("Section not found");
    await this.prisma.websiteSection.delete({ where: { id: sectionId } });
  }

  async reorderSections(tenantId: string, websiteId: string, pageId: string, sectionIds: string[]) {
    const page = await this.prisma.websitePage.findFirst({
      where: { id: pageId, websiteId, website: { tenantId } },
    });
    if (!page) throw new NotFoundException("Page not found");
    const updates = sectionIds.map((id, idx) =>
      this.prisma.websiteSection.update({ where: { id }, data: { sortOrder: idx } })
    );
    await this.prisma.$transaction(updates);
  }
}
