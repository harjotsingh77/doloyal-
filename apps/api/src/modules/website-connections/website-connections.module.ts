import { Module } from '@nestjs/common';
import { WebsiteConnectionsController } from './website-connections.controller';
import { WebsiteConnectionsService } from './website-connections.service';

@Module({
  controllers: [WebsiteConnectionsController],
  providers: [WebsiteConnectionsService],
  exports: [WebsiteConnectionsService],
})
export class WebsiteConnectionsModule {}
