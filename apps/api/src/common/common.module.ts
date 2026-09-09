import { Global, Module } from '@nestjs/common';
import { SchedulerLockService } from './scheduler-lock.service';
import { CommerceRealtimeService } from './commerce-realtime.service';
import { CommerceRealtimeController } from './commerce-realtime.controller';

@Global()
@Module({
  controllers: [CommerceRealtimeController],
  providers: [SchedulerLockService, CommerceRealtimeService],
  exports: [SchedulerLockService, CommerceRealtimeService],
})
export class CommonModule {}
