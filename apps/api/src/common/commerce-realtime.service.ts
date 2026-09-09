import { Injectable, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, filter, interval, map, merge } from 'rxjs';

export type CommerceScope = 'products' | 'orders' | 'customers';

type CommerceEvent = {
  tenantId: string;
  scope: CommerceScope;
  at: string;
};

@Injectable()
export class CommerceRealtimeService implements OnModuleDestroy {
  private readonly bus = new Subject<CommerceEvent>();

  publish(tenantId: string, scope: CommerceScope) {
    if (!tenantId) return;
    this.bus.next({
      tenantId,
      scope,
      at: new Date().toISOString(),
    });
  }

  stream(tenantId: string): Observable<MessageEvent> {
    const events = this.bus.asObservable().pipe(
      filter((event) => event.tenantId === tenantId),
      map((event) => ({ data: event })),
    );
    const heartbeat = interval(25_000).pipe(
      map(() => ({ comment: 'keepalive' }) as unknown as MessageEvent),
    );
    return merge(events, heartbeat);
  }

  onModuleDestroy() {
    this.bus.complete();
  }
}
