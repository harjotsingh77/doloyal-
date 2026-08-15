import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';
import { SupportRealtimeService } from './support-realtime.service';

@Module({
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, SupportRealtimeService],
  exports: [SupportService, SupportRealtimeService],
})
export class SupportModule {}
