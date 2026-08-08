import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = this.sanitize(response);
      } else if (typeof response === 'object' && response) {
        const respObj = response as Record<string, unknown>;
        const raw = respObj.message;
        message = this.sanitize(
          Array.isArray(raw) ? raw.join(', ') : (raw as string) || exception.message,
        );
        details = respObj.details;
      }
      code = this.statusToCode(status);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`Prisma ${exception.code}: ${exception.message}`, exception.stack);
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      code = mapped.code;
      message = mapped.message;
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma init failed: ${exception.message}`, exception.stack);
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'DATABASE_UNAVAILABLE';
      message = 'Unable to connect to the database. Please try again shortly.';
    } else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      this.logger.error(`Prisma panic: ${exception.message}`, exception.stack);
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'DATABASE_ERROR';
      message = 'A database error occurred. Please try again.';
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      this.logger.error(`Prisma unknown: ${exception.message}`, exception.stack);
      status = HttpStatus.BAD_GATEWAY;
      code = 'DATABASE_ERROR';
      message = 'Unable to complete the database request. Please try again.';
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
      if (/can't reach database server|ECONNREFUSED|P1001|P1017/i.test(exception.message)) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        code = 'DATABASE_UNAVAILABLE';
        message = 'Unable to connect to the database. Please try again shortly.';
      } else {
        message = 'An unexpected error occurred. Please try again.';
      }
    }

    reply.status(status).send({
      error: {
        code,
        message,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
  } {
    switch (err.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'A record with this value already exists.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'The requested record was not found.',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'BAD_REQUEST',
          message: 'Related record is missing or invalid.',
        };
      case 'P1001':
      case 'P1002':
      case 'P1017':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'DATABASE_UNAVAILABLE',
          message: 'Unable to connect to the database. Please try again shortly.',
        };
      default:
        return {
          status: HttpStatus.BAD_GATEWAY,
          code: 'DATABASE_ERROR',
          message: 'Unable to complete the database request. Please try again.',
        };
    }
  }

  /** Never leak internals (stack paths, host:port, SQL) to clients. */
  private sanitize(msg: string): string {
    if (!msg) return 'An unexpected error occurred';
    const lower = msg.toLowerCase();
    if (
      lower.includes('prisma') ||
      lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('database server') ||
      lower.includes('econnrefused') ||
      lower.includes('/users/') ||
      lower.includes('invocation')
    ) {
      if (lower.includes("can't reach") || lower.includes('econnrefused') || lower.includes('p1001')) {
        return 'Unable to connect to the database. Please try again shortly.';
      }
      return 'Unable to complete the request. Please try again.';
    }
    return msg;
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'DATABASE_UNAVAILABLE',
    };
    return map[status] || 'UNKNOWN_ERROR';
  }
}
