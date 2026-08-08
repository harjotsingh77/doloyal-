import { Injectable, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';

export type ReferralRealtimeEvent = {
  tenantId: string;
  type: string;
  payload?: Record<string, unknown>;
  at: string;
};

@Injectable()
export class ReferralsRealtimeService implements OnModuleDestroy {
  private readonly bus = new Subject<ReferralRealtimeEvent>();

  publish(tenantId: string, type: string, payload?: Record<string, unknown>) {
    this.bus.next({
      tenantId,
      type,
      payload,
      at: new Date().toISOString(),
    });
  }

  stream(tenantId: string): Observable<MessageEvent> {
    return this.bus.asObservable().pipe(
      filter((e) => e.tenantId === tenantId),
      map((e) => ({
        data: e,
        type: e.type,
        id: `${e.at}:${e.type}`,
      })),
    );
  }

  onModuleDestroy() {
    this.bus.complete();
  }
}
