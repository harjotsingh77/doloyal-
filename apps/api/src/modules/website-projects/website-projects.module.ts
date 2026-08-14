import { Module } from '@nestjs/common';
import { WebsiteProjectsService } from './website-projects.service';
import { WebsiteProjectsController } from './website-projects.controller';
import { AdminWebsiteProjectsController } from './admin-website-projects.controller';
import { WebsiteProjectsRealtimeService } from './website-projects-realtime.service';

@Module({
  controllers: [WebsiteProjectsController, AdminWebsiteProjectsController],
  providers: [
    WebsiteProjectsService,
    WebsiteProjectsRealtimeService,
  ],
  exports: [WebsiteProjectsService, WebsiteProjectsRealtimeService],
})
export class WebsiteProjectsModule {}
