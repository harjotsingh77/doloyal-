import { Injectable, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';

export type WebsiteRealtimeEvent = {
  tenantId: string;
  /** CUSTOMER | ADMIN | BOTH — which streams should receive the event. */
  audience: 'CUSTOMER' | 'ADMIN' | 'BOTH';
  type: string;
  payload?: Record<string, unknown>;
  at: string;
};

@Injectable()
export class WebsiteProjectsRealtimeService implements OnModuleDestroy {
  private readonly bus = new Subject<WebsiteRealtimeEvent>();

  publish(
    tenantId: string,
    audience: 'CUSTOMER' | 'ADMIN' | 'BOTH',
    type: string,
    payload?: Record<string, unknown>,
  ) {
    this.bus.next({
      tenantId,
      audience,
      type,
      payload,
      at: new Date().toISOString(),
    });
  }

  /** Customer stream — only events for the caller's tenant. */
  stream(tenantId: string): Observable<MessageEvent> {
    return this.bus.asObservable().pipe(
      filter(
        (e) =>
          e.tenantId === tenantId &&
          (e.audience === 'CUSTOMER' || e.audience === 'BOTH'),
      ),
      map((e) => ({
        data: e,
        type: e.type,
        id: `${e.at}:${e.type}`,
      })),
    );
  }

  /** Admin stream — all tenants, admin-relevant events only. */
  streamAdmin(): Observable<MessageEvent> {
    return this.bus.asObservable().pipe(
      filter(
        (e) => e.audience === 'ADMIN' || e.audience === 'BOTH',
      ),
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
