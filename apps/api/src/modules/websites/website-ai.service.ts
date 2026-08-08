import { Injectable, Logger } from "@nestjs/common";
import type { WebsitePage } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class WebsiteAIService {
  private readonly logger = new Logger(WebsiteAIService.name);

  constructor(private readonly prisma: PrismaService) {}

  async collectBusinessData(tenantId: string) {
    const [tenant, services, staff, branches, loyaltyConfig, rewards, tiers, customers] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.service.findMany({ where: { tenantId, isActive: true } }),
      this.prisma.staff.findMany({ where: { tenantId, isAvailable: true } }),
      this.prisma.branch.findMany({ where: { tenantId } }),
      this.prisma.loyaltyConfig.findUnique({ where: { tenantId } }),
      this.prisma.reward.findMany({ where: { tenantId, status: 'ACTIVE' as any } }),
      this.prisma.membershipTier.findMany({ where: { tenantId } }),
      this.prisma.customer.findMany({ where: { tenantId }, take: 5, orderBy: { totalSpent: "desc" } }),
    ]);
    return { tenant, services, staff, branches, loyaltyConfig, rewards, tiers, topCustomers: customers };
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
      const result = this.buildGeneratedSite(request.prompt, request.industry, request.businessData);
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
    await this.prisma.website.update({
      where: { id: websiteId },
      data: { theme: result.theme as any, status: "DRAFT", draftVersion: { increment: 1 } },
    });
    const existingPages = await this.prisma.websitePage.findMany({ where: { websiteId } });
    const existingSlugs = new Set(existingPages.map((p: WebsitePage) => p.slug));
    for (const pageData of result.pages) {
      if (existingSlugs.has(pageData.slug)) continue;
      const page = await this.prisma.websitePage.create({
        data: {
          websiteId,
          title: pageData.title,
          slug: pageData.slug,
          isHome: pageData.isHome,
          seo: pageData.seo as any,
        },
      });
      for (const section of pageData.sections) {
        await this.prisma.websiteSection.create({
          data: {
            pageId: page.id,
            component: section.component as any,
            sortOrder: section.sortOrder,
            content: section.content as any,
            styles: section.styles as any,
          },
        });
      }
    }
  }

  async regenerateSection(tenantId: string, websiteId: string, pageSlug: string, sectionId: string, prompt: string) {
    const section = await this.prisma.websiteSection.findFirst({
      where: { id: sectionId, page: { slug: pageSlug, websiteId, website: { tenantId } } },
    });
    if (!section) throw new Error("Section not found");
    const updatedContent = this.enhanceSectionContent(section.component as string, section.content as any, prompt);
    return this.prisma.websiteSection.update({
      where: { id: sectionId },
      data: { content: updatedContent as any },
    });
  }

  private enhanceSectionContent(component: string, content: any, prompt: string) {
    const data = { ...content?.data ?? {} };
    if (component === "HERO") {
      if (prompt.includes("premium") || prompt.includes("luxury")) {
        data.headline = `${data.headline} — Premium Experience`;
        data.subheadline = "Where excellence meets elegance";
      }
      if (prompt.includes("dark")) data.styles = { ...data.styles, darkOverlay: true };
    }
    if (prompt.includes("seo") && data.metaTitle) {
      // SEO improvements would call the AI model
    }
    return { ...content, data };
  }
}
