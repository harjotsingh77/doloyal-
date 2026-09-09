import { Controller, Sse, MessageEvent, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from './current-user.decorator';
import { CommerceRealtimeService } from './commerce-realtime.service';

@Controller()
export class CommerceRealtimeController {
  constructor(private readonly realtime: CommerceRealtimeService) {}

  @Sse('commerce/events')
  events(@CurrentUser() user?: { activeTenantId?: string }): Observable<MessageEvent> {
    if (!user?.activeTenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.realtime.stream(user.activeTenantId);
  }
}
