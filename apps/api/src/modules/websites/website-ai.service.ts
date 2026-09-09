import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { WebsitePage } from "@prisma/client";
import { composeKnowledgeWallPrompt, resolveKnowledgeWall } from "@doloyal/shared";
import { PrismaService } from "../../common/prisma.service";
import {
  clientPageDesignerSystemPrompt,
  clientPageSnapshot,
  designClientPageLocally,
  parseLooseJsonObject,
  patchesAreEmpty,
} from "./client-page-ai";

const WEBSITE_COMPONENTS = new Set([
  "HERO",
  "FEATURES",
  "SERVICES",
  "GALLERY",
  "TEAM",
  "PRICING",
  "TESTIMONIALS",
  "FAQ",
  "ABOUT",
  "CONTACT",
  "FOOTER",
  "HEADER",
  "CTA",
  "BLOG",
  "NEWSLETTER",
  "STATS",
  "VIDEO",
  "MAP",
  "TIMELINE",
  "CUSTOM",
]);

@Injectable()
export class WebsiteAIService {
  private readonly logger = new Logger(WebsiteAIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async collectBusinessData(tenantId: string) {
    const [tenant, services, staff, branches, loyaltyConfig, rewards, tiers] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.service.findMany({ where: { tenantId, isActive: true } }),
      this.prisma.staff.findMany({ where: { tenantId, isAvailable: true } }),
      this.prisma.branch.findMany({ where: { tenantId } }),
      this.prisma.loyaltyConfig.findUnique({ where: { tenantId } }),
      this.prisma.reward.findMany({ where: { tenantId, status: 'ACTIVE' as any } }),
      this.prisma.membershipTier.findMany({ where: { tenantId } }),
    ]);
    return { tenant, services, staff, branches, loyaltyConfig, rewards, tiers };
  }

  async generate(request: {
    tenantId: string;
    websiteId: string;
    prompt: string;
    industry?: string;
    businessData: any;
  }) {
    const generation = await this.prisma.aIWebsiteGeneration.create({
      data: {
        websiteId: request.websiteId,
        prompt: request.prompt,
        mergedData: request.businessData as any,
        status: "PROCESSING",
      },
    });
    try {
      const fallback = this.buildGeneratedSite(request.prompt, request.industry, request.businessData);
      const aiSite = await this.generateSiteWithWebsiteAi({
        prompt: request.prompt,
        industry: request.industry ?? request.businessData?.tenant?.category,
        businessData: request.businessData,
        fallback,
      });
      const result = this.mergeGeneratedSite(fallback, aiSite);
      await this.prisma.aIWebsiteGeneration.update({
        where: { id: generation.id },
        data: { status: "COMPLETED", result: result as any, completedAt: new Date() },
      });
      await this.applyGeneration(request.tenantId, request.websiteId, result);
      return { generationId: generation.id, ...result };
    } catch (err: any) {
      await this.prisma.aIWebsiteGeneration.update({
        where: { id: generation.id },
        data: { status: "FAILED", errorMessage: err.message },
      });
      throw err;
    }
  }

  private buildGeneratedSite(prompt: string, industry: string | undefined, data: any) {
    const theme = this.inferTheme(industry ?? data?.tenant?.category);
    const pages = this.buildPages(industry ?? data?.tenant?.category, data);
    return { theme, pages };
  }

  private inferTheme(industry: string | undefined) {
    const themes: Record<string, any> = {
      BEAUTY_SALON: { preset: "ELEGANT", primaryColor: "#8B5CF6", headingFont: "Playfair Display", bodyFont: "Inter", borderRadius: "1.25rem" },
      BARBER_SHOP: { preset: "BOLD", primaryColor: "#1E293B", headingFont: "Oswald", bodyFont: "Inter", borderRadius: "0.5rem" },
      GYM: { preset: "BOLD", primaryColor: "#EF4444", headingFont: "Anton", bodyFont: "Inter", borderRadius: "0.375rem" },
      SPA: { preset: "MINIMAL", primaryColor: "#10B981", headingFont: "Lora", bodyFont: "Inter", borderRadius: "1rem" },
      RESTAURANT: { preset: "WARM", primaryColor: "#F59E0B", headingFont: "Playfair Display", bodyFont: "Inter", borderRadius: "0.75rem" },
      CAFE: { preset: "WARM", primaryColor: "#D97706", headingFont: "Cabin", bodyFont: "Inter", borderRadius: "0.75rem" },
      DENTAL_CLINIC: { preset: "MODERN", primaryColor: "#0EA5E9", headingFont: "Inter", bodyFont: "Inter", borderRadius: "0.625rem" },
      CLINIC: { preset: "MODERN", primaryColor: "#2563EB", headingFont: "Inter", bodyFont: "Inter", borderRadius: "0.625rem" },
      PET_GROOMING: { preset: "WARM", primaryColor: "#22C55E", headingFont: "Fredoka", bodyFont: "Inter", borderRadius: "1rem" },
    };
    return themes[industry ?? ""] ?? { preset: "MODERN", primaryColor: "#2563EB", headingFont: "Inter", bodyFont: "Inter", borderRadius: "0.75rem" };
  }

  private buildPages(industry: string | undefined, data: any) {
    const businessName = data?.tenant?.name ?? "Your Business";
    const tagline = data?.tenant?.category ? `Premium ${data.tenant.category.replace(/_/g, " ").toLowerCase()}` : "Premium services";
    const pages: any[] = [];

    // Home
    pages.push({
      title: "Home", slug: "home", isHome: true, seo: { metaTitle: `${businessName} — ${tagline}`, metaDescription: `Experience premium ${tagline} at ${businessName}. Book your appointment today.` },
      sections: [
        { component: "HERO", sortOrder: 0, content: { type: "hero", data: { headline: `Welcome to ${businessName}`, subheadline: tagline, cta: { text: "Book Now", href: "#book" }, secondaryCta: { text: "Learn More", href: "#about" } } } },
        { component: "FEATURES", sortOrder: 1, content: { type: "features", data: { items: this.getIndustryFeatures(industry) } } },
        { component: "SERVICES", sortOrder: 2, content: { type: "services", data: { items: data?.services?.map((s: any) => ({ name: s.name, description: s.description, price: s.price, duration: s.durationMinutes })) ?? [] } } },
        { component: "TESTIMONIALS", sortOrder: 3, content: { type: "testimonials", data: { items: [{ name: "Happy Customer", text: `Amazing service at ${businessName}! Highly recommended.`, rating: 5 }] } } },
        { component: "CTA", sortOrder: 4, content: { type: "cta", data: { headline: "Ready to get started?", subheadline: "Book your appointment in seconds", buttonText: "Book Appointment" } } },
      ],
    });

    // About
    pages.push({
      title: "About", slug: "about", isHome: false, seo: { metaTitle: `About ${businessName} — Our Story`, metaDescription: `Learn about ${businessName} and our mission to provide exceptional service.` },
      sections: [
        { component: "ABOUT", sortOrder: 0, content: { type: "about", data: { headline: `About ${businessName}`, body: `${businessName} is dedicated to providing exceptional ${tagline} experiences. Our team of professionals is committed to excellence.`, image: null } } },
        { component: "TEAM", sortOrder: 1, content: { type: "team", data: { members: data?.staff?.map((s: any) => ({ name: s.name, role: s.roleTitle, bio: `Experienced ${s.roleTitle?.toLowerCase() ?? "professional"}`, image: s.avatarUrl })) ?? [] } } },
        { component: "STATS", sortOrder: 2, content: { type: "stats", data: { items: [{ label: "Happy Customers", value: "500+" }, { label: "Years Experience", value: "10+" }, { label: "Services", value: `${data?.services?.length ?? 50}+` }] } } },
      ],
    });

    // Services
    if (data?.services?.length > 0) {
      pages.push({
        title: "Services", slug: "services", isHome: false, seo: { metaTitle: `${businessName} — Our Services`, metaDescription: `Browse our full range of ${tagline} services.` },
        sections: [
          { component: "SERVICES", sortOrder: 0, content: { type: "services", data: { headline: "Our Services", items: data.services.map((s: any) => ({ name: s.name, description: s.description, price: s.price, duration: s.durationMinutes })) } } },
          { component: "PRICING", sortOrder: 1, content: { type: "pricing", data: { headline: "Pricing", plans: data.services.slice(0, 3).map((s: any) => ({ name: s.name, price: s.price, features: [s.description ?? `${s.durationMinutes} min session`] })) } } },
        ],
      });
    }

    // Gallery
    pages.push({
      title: "Gallery", slug: "gallery", isHome: false, seo: { metaTitle: `Gallery — ${businessName}`, metaDescription: `View our work and gallery at ${businessName}.` },
      sections: [
        { component: "GALLERY", sortOrder: 0, content: { type: "gallery", data: { headline: "Our Work", images: [] } } },
      ],
    });

    // FAQ
    pages.push({
      title: "FAQ", slug: "faq", isHome: false, seo: { metaTitle: `FAQ — ${businessName}`, metaDescription: `Frequently asked questions about ${businessName}.` },
      sections: [
        { component: "FAQ", sortOrder: 0, content: { type: "faq", data: { headline: "Frequently Asked Questions", items: this.getIndustryFAQs(industry, businessName) } } },
      ],
    });

    // Contact
    pages.push({
      title: "Contact", slug: "contact", isHome: false, seo: { metaTitle: `Contact ${businessName}`, metaDescription: `Get in touch with ${businessName}. Book an appointment or visit us.` },
      sections: [
        { component: "CONTACT", sortOrder: 0, content: { type: "contact", data: { headline: "Get in Touch", address: data?.tenant?.address, phone: data?.tenant?.phone, email: data?.tenant?.email } } },
        { component: "MAP", sortOrder: 1, content: { type: "map", data: { address: data?.tenant?.address } } },
      ],
    });

    return pages;
  }

  private getIndustryFeatures(industry: string | undefined) {
    const features: Record<string, any[]> = {
      BEAUTY_SALON: [
        { icon: "Scissors", title: "Expert Stylists", text: "Certified professionals with years of experience" },
        { icon: "Sparkles", title: "Premium Products", text: "Using only the finest hair and beauty products" },
        { icon: "Calendar", title: "Easy Booking", text: "Book your appointment online 24/7" },
      ],
      GYM: [
        { icon: "Dumbbell", title: "Modern Equipment", text: "State-of-the-art fitness equipment" },
        { icon: "Users", title: "Expert Trainers", text: "Certified personal trainers" },
        { icon: "Heart", title: "Wellness Focus", text: "Holistic approach to fitness" },
      ],
      RESTAURANT: [
        { icon: "ChefHat", title: "Expert Chefs", text: "Crafted by award-winning chefs" },
        { icon: "UtensilsCrossed", title: "Fresh Ingredients", text: "Locally sourced, seasonal ingredients" },
        { icon: "Wine", title: "Curated Menu", text: "Carefully designed dining experience" },
      ],
    };
    return features[industry ?? ""] ?? [
      { icon: "Star", title: "Quality Service", text: "Committed to excellence in every service" },
      { icon: "Clock", title: "Convenient Hours", text: "Flexible scheduling to fit your life" },
      { icon: "Shield", title: "Satisfaction", text: "Your satisfaction is our top priority" },
    ];
  }

  private getIndustryFAQs(industry: string | undefined, businessName: string) {
    return [
      { question: "What services do you offer?", answer: `We offer a comprehensive range of services at ${businessName}. Browse our services page for full details.` },
      { question: "How do I book an appointment?", answer: "You can book online through our website, call us, or use our booking widget. We offer 24/7 online scheduling." },
      { question: "What is your cancellation policy?", answer: "We require 24 hours notice for cancellations. Late cancellations may be subject to a fee." },
      { question: "Do you accept walk-ins?", answer: "Yes, we welcome walk-ins based on availability. However, we recommend booking in advance to secure your preferred time." },
      { question: "What payment methods do you accept?", answer: "We accept cash, cards, UPI, and digital wallets." },
    ];
  }

  private async applyGeneration(tenantId: string, websiteId: string, result: { theme: any; pages: any[] }) {
    const site = await this.prisma.website.findFirst({ where: { id: websiteId, tenantId } });
    if (!site) throw new BadRequestException("Website not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.website.update({
        where: { id: websiteId },
        data: { theme: result.theme as any, status: "DRAFT", draftVersion: { increment: 1 } },
      });
      const existingPages = await tx.websitePage.findMany({ where: { websiteId } });
      const bySlug = new Map(existingPages.map((p: WebsitePage) => [p.slug, p]));

      for (const pageData of result.pages) {
        const existing = bySlug.get(pageData.slug);
        const page = existing
          ? await tx.websitePage.update({
              where: { id: existing.id },
              data: {
                title: pageData.title,
                isHome: Boolean(pageData.isHome),
                seo: pageData.seo as any,
              },
            })
          : await tx.websitePage.create({
              data: {
                websiteId,
                title: pageData.title,
                slug: pageData.slug,
                isHome: Boolean(pageData.isHome),
                seo: pageData.seo as any,
              },
            });

        if (existing) {
          await tx.websiteSection.deleteMany({ where: { pageId: page.id } });
        }

        for (const [index, section] of (pageData.sections ?? []).entries()) {
          await tx.websiteSection.create({
            data: {
              pageId: page.id,
              component: section.component as any,
              sortOrder: Number.isFinite(section.sortOrder) ? section.sortOrder : index,
              content: section.content as any,
              styles: section.styles as any,
            },
          });
        }
      }
    });
  }

  async chatClientPage(input: {
    tenantId: string;
    message: string;
    history?: Array<{ role?: string; content?: string }>;
    selectedSection?: string;
    config?: Record<string, unknown>;
  }) {
    const businessData = await this.collectBusinessData(input.tenantId);
    const brief = this.businessBrief(businessData);
    const history = (input.history ?? [])
      .filter((item) => (item.role === "user" || item.role === "assistant") && String(item.content || "").trim())
      .slice(-8)
      .map((item) => ({
        role: item.role as "user" | "assistant",
        content: String(item.content).slice(0, 2000),
      }));

    const snapshot = clientPageSnapshot(input.config ?? {}, input.selectedSection);
    const local = designClientPageLocally({
      message: input.message,
      selectedSection: input.selectedSection,
      business: brief,
      snapshot,
    });

    const messages = this.withKnowledgeWall(
      [
        { role: "system", content: clientPageDesignerSystemPrompt() },
        ...history,
        {
          role: "user",
          content: JSON.stringify({
            instruction: input.message,
            selectedSection: input.selectedSection || "hero",
            business: brief,
            page: snapshot,
            output: "JSON only with reply, configPatch, brandPatch, selectSection",
          }),
        },
      ],
      3500,
    );

    let parsed: any = null;
    try {
      const text = await this.chatWebsiteRaw(messages, 0.25, true);
      parsed = this.parseJsonObject(text);
    } catch (err: any) {
      this.logger.warn(`Client Page AI fell back to local designer: ${err?.message || err}`);
    }

    const configPatch = this.sanitizeClientPageConfigPatch(parsed?.configPatch ?? parsed?.config ?? {});
    const brandPatch = this.sanitizeClientPageBrandPatch(parsed?.brandPatch ?? {});
    const usedLocal = !parsed || patchesAreEmpty(configPatch, brandPatch);
    const reply = String(
      (usedLocal ? local.reply : parsed?.reply || parsed?.message || local.reply) || "Updated the page.",
    ).trim();

    return {
      reply: reply.slice(0, 800),
      configPatch: usedLocal ? this.sanitizeClientPageConfigPatch(local.configPatch) : configPatch,
      brandPatch: usedLocal ? this.sanitizeClientPageBrandPatch(local.brandPatch) : brandPatch,
      selectSection: typeof parsed?.selectSection === "string"
        ? parsed.selectSection
        : local.selectSection,
      provider: usedLocal && !parsed ? "local" : this.getWebsiteAiConfig().provider,
      model: usedLocal && !parsed ? "page-designer" : this.getWebsiteAiConfig().model,
    };
  }

  async regenerateSection(tenantId: string, websiteId: string, pageSlug: string, sectionId: string, prompt: string) {
    const section = await this.prisma.websiteSection.findFirst({
      where: { id: sectionId, page: { slug: pageSlug, websiteId, website: { tenantId } } },
    });
    if (!section) throw new Error("Section not found");
    const updatedContent = await this.reviseSectionWithWebsiteAi(
      section.component as string,
      section.content as any,
      prompt,
      tenantId,
    );
    return this.prisma.websiteSection.update({
      where: { id: sectionId },
      data: { content: updatedContent as any },
    });
  }

  /** Website builder only — never reads the platform assistant keys. */
  private getWebsiteAiConfig() {
    const apiKey = this.config.get<string>("WEBSITE_AI_API_KEY")?.trim() || "";
    const baseURL = (this.config.get<string>("WEBSITE_AI_BASE_URL")?.trim() || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
    const model = this.config.get<string>("WEBSITE_AI_MODEL")?.trim() || "meta/llama-3.2-11b-vision-instruct";
    const provider = this.config.get<string>("WEBSITE_AI_PROVIDER")?.trim() || "nvidia";
    return { apiKey, baseURL, model, provider };
  }

  private requireWebsiteAi() {
    const cfg = this.getWebsiteAiConfig();
    if (!cfg.apiKey) {
      throw new BadRequestException("Website AI is not configured. Add WEBSITE_AI_API_KEY.");
    }
    return cfg;
  }

  private businessBrief(data: any) {
    const tenant = data?.tenant ?? {};
    return {
      name: tenant.name ?? "Your Business",
      category: tenant.category ?? null,
      description: tenant.description ?? null,
      tagline: tenant.tagline ?? null,
      phone: tenant.phone ?? null,
      email: tenant.email ?? null,
      address: tenant.address ?? null,
      city: tenant.city ?? null,
      brandColor: tenant.brandColor ?? null,
      services: (data?.services ?? []).slice(0, 20).map((s: any) => ({
        name: s.name,
        description: s.description,
        price: s.price,
        durationMinutes: s.durationMinutes,
      })),
      staff: (data?.staff ?? []).slice(0, 12).map((s: any) => ({
        name: s.name,
        role: s.roleTitle,
      })),
    };
  }

  private async generateSiteWithWebsiteAi(opts: {
    prompt: string;
    industry?: string;
    businessData: any;
    fallback: { theme: any; pages: any[] };
  }) {
    const brief = this.businessBrief(opts.businessData);
    const parsed = await this.chatWebsiteJson(
      this.withKnowledgeWall([
        {
          role: "system",
          content:
            "You generate local-business websites. Follow the Website Knowledge Wall first. Return JSON only with keys theme and pages. theme: {preset, primaryColor, headingFont, bodyFont, borderRadius}. pages: array of {title, slug, isHome, seo:{metaTitle,metaDescription}, sections:[{component, sortOrder, content:{type, data}}]}. component must be one of HERO, FEATURES, SERVICES, GALLERY, TEAM, PRICING, TESTIMONIALS, FAQ, ABOUT, CONTACT, FOOTER, HEADER, CTA, BLOG, NEWSLETTER, STATS, VIDEO, MAP, TIMELINE, CUSTOM. Use the real business name, services, and contact details. No markdown.",
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt: opts.prompt,
            industry: opts.industry ?? null,
            business: brief,
            exampleShape: {
              theme: opts.fallback.theme,
              pageSlugs: opts.fallback.pages.map((p: any) => p.slug),
            },
          }),
        },
      ]),
      0.4,
    );
    return parsed;
  }

  private mergeGeneratedSite(fallback: { theme: any; pages: any[] }, ai: any) {
    const theme = {
      ...fallback.theme,
      ...(ai?.theme && typeof ai.theme === "object" ? ai.theme : {}),
    };
    const aiPages = Array.isArray(ai?.pages) ? ai.pages : [];
    if (!aiPages.length) {
      throw new BadRequestException("Website AI did not return any pages.");
    }
    const pages = aiPages
      .map((page: any, pageIndex: number) => this.normalizePage(page, pageIndex))
      .filter(Boolean);
    if (!pages.length) {
      throw new BadRequestException("Website AI returned invalid page data.");
    }
    if (!pages.some((p: any) => p.isHome)) pages[0].isHome = true;
    return { theme, pages, provider: this.getWebsiteAiConfig().provider, model: this.getWebsiteAiConfig().model };
  }

  private normalizePage(page: any, pageIndex: number) {
    if (!page || typeof page !== "object") return null;
    const title = String(page.title || "Page").slice(0, 80);
    const slug = String(page.slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || `page-${pageIndex + 1}`;
    const sections = Array.isArray(page.sections)
      ? page.sections
          .map((section: any, index: number) => this.normalizeSection(section, index))
          .filter(Boolean)
      : [];
    return {
      title,
      slug,
      isHome: Boolean(page.isHome) || slug === "home",
      seo: {
        metaTitle: String(page.seo?.metaTitle || title).slice(0, 120),
        metaDescription: String(page.seo?.metaDescription || title).slice(0, 300),
      },
      sections,
    };
  }

  private normalizeSection(section: any, index: number) {
    if (!section || typeof section !== "object") return null;
    const component = String(section.component || "CUSTOM").toUpperCase();
    if (!WEBSITE_COMPONENTS.has(component)) return null;
    return {
      component,
      sortOrder: Number.isFinite(section.sortOrder) ? section.sortOrder : index,
      content: section.content && typeof section.content === "object"
        ? section.content
        : { type: component.toLowerCase(), data: {} },
      styles: section.styles && typeof section.styles === "object" ? section.styles : undefined,
    };
  }

  private async reviseSectionWithWebsiteAi(component: string, content: any, prompt: string, tenantId?: string) {
    const parsed = await this.chatWebsiteJson(
      this.withKnowledgeWall([
        {
          role: "system",
          content:
            "You edit one website section. Follow the Website Knowledge Wall first. Return JSON only: {\"content\":{\"type\":\"string\",\"data\":{...}}}. Keep the same structure, apply the user's change, and do not add markdown.",
        },
        {
          role: "user",
          content: JSON.stringify({ component, currentContent: content, prompt }),
        },
      ]),
      0.3,
    );
    const next = parsed?.content && typeof parsed.content === "object" ? parsed.content : parsed;
    if (!next || typeof next !== "object") {
      throw new BadRequestException("Website AI did not return updated section content.");
    }
    const payload = next as Record<string, unknown>;
    return payload.type ? payload : { ...(content ?? {}), data: payload };
  }

  private knowledgeSystemContent(): string | null {
    const composed = composeKnowledgeWallPrompt(resolveKnowledgeWall(undefined));
    return composed ? composed.slice(0, 20000) : null;
  }

  private withKnowledgeWall(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    maxChars = 20000,
  ) {
    const wall = this.knowledgeSystemContent();
    if (!wall) return messages;
    const clipped = wall.slice(0, maxChars);
    const first = messages[0];
    if (first?.role === "system") {
      return [{ ...first, content: `${clipped}\n\n${first.content}` }, ...messages.slice(1)];
    }
    return [{ role: "system" as const, content: clipped }, ...messages];
  }

  private sanitizeClientPageConfigPatch(raw: unknown) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const source = raw as Record<string, unknown>;
    const allowed = new Set([
      "heroHeading", "heroDescription", "heroBadge", "heroButtonLabel", "bookingButtonLabel",
      "featuredTitle", "introHeading", "introBody", "ctaHeading", "ctaBody",
      "offerTitle", "offerBody", "offerCta", "secondaryCta", "marqueeText", "videoUrl",
      "heroVideoSrc", "businessType", "heroMode", "heroAlign", "heroHeight", "navStyle",
      "heroOverlay", "showSearch", "pinChrome", "marqueeEnabled", "animations",
      "hoverEffects", "autoSlide", "socialAnimations", "slideMs", "serviceColumns",
      "faqs", "testimonials", "galleryUrls", "sectionUi", "sections",
    ]);
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      if (!allowed.has(key) || value === undefined) continue;
      if (key === "sections" && Array.isArray(value)) {
        patch.sections = value
          .filter((item) => item && typeof item === "object" && typeof (item as any).id === "string")
          .slice(0, 30)
          .map((item: any) => ({
            id: String(item.id).slice(0, 40),
            enabled: item.enabled !== false,
            hidden: Boolean(item.hidden),
            ...(typeof item.title === "string" ? { title: item.title.slice(0, 80) } : {}),
          }));
        continue;
      }
      if (key === "sectionUi" && value && typeof value === "object" && !Array.isArray(value)) {
        patch.sectionUi = Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .slice(0, 30)
            .map(([id, ui]) => [
              String(id).slice(0, 40),
              ui && typeof ui === "object" && !Array.isArray(ui) ? ui : {},
            ]),
        );
        continue;
      }
      if (typeof value === "string") {
        patch[key] = value.slice(0, 2000);
        continue;
      }
      patch[key] = value;
    }
    return patch;
  }

  private sanitizeClientPageBrandPatch(raw: unknown) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const source = raw as Record<string, unknown>;
    const allowed = new Set(["brandColor", "secondaryColor", "backgroundColor", "textColor", "tagline", "description", "brandName"]);
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      if (!allowed.has(key) || typeof value !== "string") continue;
      patch[key] = value.slice(0, 240);
    }
    return patch;
  }

  private async chatWebsiteRaw(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    temperature: number,
    jsonMode = false,
  ): Promise<string> {
    const { apiKey, baseURL, model, provider } = this.requireWebsiteAi();
    this.logger.log(`Website AI request via ${provider} (${model})`);

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: 4096,
      stream: false,
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    if (!res.ok && jsonMode) {
      this.logger.warn(`Website AI JSON mode HTTP ${res.status}, retrying without response_format`);
      return this.chatWebsiteRaw(messages, temperature, false);
    }
    if (!res.ok) {
      this.logger.warn(`Website AI HTTP ${res.status}: ${raw.slice(0, 300)}`);
      throw new BadRequestException(`Website AI request failed (${res.status}).`);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException("Website AI returned an unreadable response.");
    }

    const text = String(parsed?.choices?.[0]?.message?.content || "").trim();
    if (!text) {
      throw new BadRequestException("Website AI returned an empty response.");
    }
    return text;
  }

  private async chatWebsiteJson(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    temperature: number,
  ) {
    return this.parseJsonObject(await this.chatWebsiteRaw(messages, temperature));
  }

  private parseJsonObject(text: string) {
    try {
      return parseLooseJsonObject(text);
    } catch {
      throw new BadRequestException("Website AI returned invalid JSON.");
    }
  }
}
