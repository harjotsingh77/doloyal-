import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Public } from '../modules/auth/public.decorator';

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
    } catch {
      database = 'unavailable';
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
