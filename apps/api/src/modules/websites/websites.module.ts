import { Module } from "@nestjs/common";
import { WebsitesController } from "./websites.controller";
import { WebsitesService } from "./websites.service";
import { WebsiteAIService } from "./website-ai.service";
import { WebsitePublishingService } from "./website-publishing.service";
import { WebsiteDomainService } from "./website-domain.service";
@Module({
  controllers: [WebsitesController],
  providers: [
    WebsitesService,
    WebsiteAIService,
    WebsitePublishingService,
    WebsiteDomainService,
  ],
  exports: [
    WebsitesService,
    WebsiteAIService,
    WebsitePublishingService,
    WebsiteDomainService,
  ],
})
export class WebsitesModule {}
