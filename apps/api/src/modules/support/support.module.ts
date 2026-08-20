import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';
import { SupportRealtimeService } from './support-realtime.service';
import { SupportAiService } from './support-ai.service';

@Module({
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, SupportRealtimeService, SupportAiService],
  exports: [SupportService, SupportRealtimeService, SupportAiService],
})
export class SupportModule {}
