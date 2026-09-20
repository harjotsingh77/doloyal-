import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Public } from '../modules/auth/public.decorator';

/**
 * Cheap liveness for the API root. Does not probe the database so Vercel
 * cold starts and platform pings stay fast. Use GET /health for readiness.
 */
@Controller()
export class RootController {
  @Public()
  @Get()
  root() {
    return {
      status: 'ok',
      service: 'doloyal-api',
      health: '/health',
    };
  }
}

/**
 * Lightweight liveness/readiness probe used by container health checks and
 * load balancers. Never returns sensitive information.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let database = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      database = 'unavailable';
      console.error('[health] database probe failed:', err instanceof Error ? err.stack || err.message : err);
    }
    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      service: 'doloyal-api',
      database,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
