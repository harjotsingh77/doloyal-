import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class WebsiteDomainService {
  private readonly logger = new Logger(WebsiteDomainService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addDomain(tenantId: string, websiteId: string, domain: string) {
    const site = await this.prisma.website.findFirst({ where: { id: websiteId, tenantId } });
    if (!site) throw new Error("Website not found");

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    const dnsRecords = [
      { type: "CNAME", name: "www", value: `${site.slug}.doloyal.ai`, status: "pending" },
      { type: "TXT", name: "@", value: `doloyal-verify=${site.id}`, status: "pending" },
    ];

    return this.prisma.websiteDomain.create({
      data: { websiteId, domain: cleanDomain, dnsRecords: dnsRecords as any },
    });
  }

  async verifyDomain(tenantId: string, websiteId: string, domainId: string) {
    const domain = await this.prisma.websiteDomain.findFirst({
      where: { id: domainId, websiteId, website: { tenantId } },
    });
    if (!domain) throw new Error("Domain not found");

    const updatedRecords = (domain.dnsRecords as any[] ?? []).map((r: any) => ({
      ...r, status: "verified",
    }));

    return this.prisma.websiteDomain.update({
      where: { id: domainId },
      data: {
        verified: true,
        verifiedAt: new Date(),
        sslStatus: "PROVISIONING",
        dnsRecords: updatedRecords as any,
      },
    });
  }

  async removeDomain(tenantId: string, websiteId: string, domainId: string) {
    const domain = await this.prisma.websiteDomain.findFirst({
      where: { id: domainId, websiteId, website: { tenantId } },
    });
    if (!domain) throw new Error("Domain not found");
    await this.prisma.websiteDomain.delete({ where: { id: domainId } });
  }

  async listDomains(tenantId: string, websiteId: string) {
    const site = await this.prisma.website.findFirst({ where: { id: websiteId, tenantId } });
    if (!site) throw new Error("Website not found");
    return this.prisma.websiteDomain.findMany({ where: { websiteId } });
  }
}
