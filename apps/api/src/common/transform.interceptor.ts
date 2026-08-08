import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastifyReply } from 'fastify';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    return next.handle().pipe(
      map((payload) => {
        if (reply.sent) return payload;
        if (payload instanceof StreamableFile || Buffer.isBuffer(payload)) {
          return payload;
        }
        if (
          payload !== null &&
          payload !== undefined &&
          (payload as any).data !== undefined
        ) {
          return payload;
        }
        if (
          payload !== null &&
          payload !== undefined &&
          (payload as any).error !== undefined
        ) {
          return payload;
        }
        return { data: payload };
      }),
    );
  }
}
