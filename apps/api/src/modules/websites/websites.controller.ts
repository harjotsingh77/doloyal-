import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsString, IsOptional, IsNotEmpty } from "class-validator";
import { WebsitesService } from "./websites.service";
import { WebsiteAIService } from "./website-ai.service";
import { WebsitePublishingService } from "./website-publishing.service";
import { WebsiteDomainService } from "./website-domain.service";
import { CurrentUser } from "../../common/current-user.decorator";

class CreateWebsiteDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() industry?: string;
}

class CreatePageDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() slug: string;
  @IsOptional() isHome?: boolean;
}

class AddSectionDto {
  @IsString() @IsNotEmpty() component: string;
  @IsNotEmpty() content: Record<string, unknown>;
  @IsOptional() sortOrder?: number;
  @IsOptional() styles?: Record<string, unknown>;
}

class GenerateDto {
  @IsString() @IsNotEmpty() prompt: string;
  @IsString() @IsOptional() industry?: string;
}

class AddDomainDto {
  @IsString() @IsNotEmpty() domain: string;
}

class RegenerateSectionDto {
  @IsString() @IsNotEmpty() pageSlug: string;
  @IsString() @IsNotEmpty() sectionId: string;
  @IsString() @IsNotEmpty() prompt: string;
}

@Controller()
export class WebsitesController {
  constructor(
    private readonly websitesService: WebsitesService,
    private readonly aiService: WebsiteAIService,
    private readonly publishingService: WebsitePublishingService,
    private readonly domainService: WebsiteDomainService,
  ) {}

  @Get("websites")
  list(@CurrentUser() user: any) {
    return this.websitesService.list(user.activeTenantId);
  }

  @Post("websites")
  create(@Body() dto: CreateWebsiteDto, @CurrentUser() user: any) {
    return this.websitesService.create(user.activeTenantId, dto);
  }

  @Get("websites/:id")
  get(@Param("id") id: string, @CurrentUser() user: any) {
    return this.websitesService.get(user.activeTenantId, id);
  }

  @Patch("websites/:id")
  update(@Param("id") id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: any) {
    return this.websitesService.update(user.activeTenantId, id, dto);
  }

  @Delete("websites/:id")
  delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.websitesService.delete(user.activeTenantId, id);
  }

  @Post("websites/:id/duplicate")
  duplicate(@Param("id") id: string, @CurrentUser() user: any) {
    return this.websitesService.duplicate(user.activeTenantId, id);
  }

  // ─── AI Generation ──────────────────────────────────────────────────────

  @Post("websites/:id/generate")
  async generate(
    @Param("id") id: string,
    @Body() dto: GenerateDto,
    @CurrentUser() user: any,
  ) {
    const businessData = await this.aiService.collectBusinessData(user.activeTenantId);
    return this.aiService.generate({
      tenantId: user.activeTenantId,
      websiteId: id,
      prompt: dto.prompt,
      industry: dto.industry,
      businessData,
    });
  }

  @Post("websites/:id/regenerate-section")
  regenerateSection(
    @Param("id") id: string,
    @Body() dto: RegenerateSectionDto,
    @CurrentUser() user: any,
  ) {
    return this.aiService.regenerateSection(user.activeTenantId, id, dto.pageSlug, dto.sectionId, dto.prompt);
  }

  // ─── Pages ──────────────────────────────────────────────────────────────

  @Get("websites/:id/pages")
  listPages(@Param("id") id: string, @CurrentUser() user: any) {
    return this.websitesService.listPages(user.activeTenantId, id);
  }

  @Post("websites/:id/pages")
  createPage(@Param("id") id: string, @Body() dto: CreatePageDto, @CurrentUser() user: any) {
    return this.websitesService.createPage(user.activeTenantId, id, dto);
  }

  @Patch("websites/:id/pages/:pageId")
  updatePage(
    @Param("id") id: string,
    @Param("pageId") pageId: string,
    @Body() dto: Record<string, unknown>,
    @CurrentUser() user: any,
  ) {
    return this.websitesService.updatePage(user.activeTenantId, id, pageId, dto);
  }

  @Delete("websites/:id/pages/:pageId")
  deletePage(
    @Param("id") id: string,
    @Param("pageId") pageId: string,
    @CurrentUser() user: any,
  ) {
    return this.websitesService.deletePage(user.activeTenantId, id, pageId);
  }

  // ─── Sections ───────────────────────────────────────────────────────────

  @Patch("websites/:id/sections/:sectionId")
  updateSection(
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
    @Body() dto: Record<string, unknown>,
    @CurrentUser() user: any,
  ) {
    return this.websitesService.updateSection(user.activeTenantId, id, sectionId, dto);
  }

  @Post("websites/:id/pages/:pageId/sections")
  addSection(
    @Param("id") id: string,
    @Param("pageId") pageId: string,
    @Body() dto: AddSectionDto,
    @CurrentUser() user: any,
  ) {
    return this.websitesService.addSection(user.activeTenantId, id, pageId, dto);
  }

  @Delete("websites/:id/sections/:sectionId")
  deleteSection(
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
    @CurrentUser() user: any,
  ) {
    return this.websitesService.deleteSection(user.activeTenantId, id, sectionId);
  }

  @Post("websites/:id/pages/:pageId/reorder")
  reorderSections(
    @Param("id") id: string,
    @Param("pageId") pageId: string,
    @Body("sectionIds") sectionIds: string[],
    @CurrentUser() user: any,
  ) {
    return this.websitesService.reorderSections(user.activeTenantId, id, pageId, sectionIds);
  }

  // ─── Publishing ─────────────────────────────────────────────────────────

  @Post("websites/:id/publish")
  publish(@Param("id") id: string, @CurrentUser() user: any) {
    return this.publishingService.publish(user.activeTenantId, id);
  }

  @Get("websites/:id/preview")
  getPreview(@Param("id") id: string, @CurrentUser() user: any) {
    return this.publishingService.getPreview(user.activeTenantId, id);
  }

  @Get("websites/:id/deployments")
  getDeployments(@Param("id") id: string, @CurrentUser() user: any) {
    return this.publishingService.getDeployments(user.activeTenantId, id);
  }

  @Get("websites/:id/lighthouse")
  getLighthouse(@Param("id") id: string, @CurrentUser() user: any) {
    return this.publishingService.getLighthouseScore(user.activeTenantId, id);
  }

  // ─── Domains ────────────────────────────────────────────────────────────

  @Get("websites/:id/domains")
  listDomains(@Param("id") id: string, @CurrentUser() user: any) {
    return this.domainService.listDomains(user.activeTenantId, id);
  }

  @Post("websites/:id/domains")
  addDomain(@Param("id") id: string, @Body() dto: AddDomainDto, @CurrentUser() user: any) {
    return this.domainService.addDomain(user.activeTenantId, id, dto.domain);
  }

  @Post("websites/:id/domains/:domainId/verify")
  verifyDomain(
    @Param("id") id: string,
    @Param("domainId") domainId: string,
    @CurrentUser() user: any,
  ) {
    return this.domainService.verifyDomain(user.activeTenantId, id, domainId);
  }

  @Delete("websites/:id/domains/:domainId")
  removeDomain(
    @Param("id") id: string,
    @Param("domainId") domainId: string,
    @CurrentUser() user: any,
  ) {
    return this.domainService.removeDomain(user.activeTenantId, id, domainId);
  }
}
