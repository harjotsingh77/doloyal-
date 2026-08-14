import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { IS_PUBLIC_KEY } from '../modules/auth/jwt-auth.guard';

@Injectable()
export class MockAuthGuard implements CanActivate {
  private readonly logger = new Logger(MockAuthGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    if ((request as any).user) return true;

    const authHeader = request.headers['authorization'] as string;
    if (authHeader?.startsWith('Bearer ') && authHeader.length > 30) {
      return true;
    }

    const clerkKey = this.config?.get<string>('CLERK_SECRET_KEY') || process.env.CLERK_SECRET_KEY;

    if (!clerkKey) {
      return this.handleMockAuth(context);
    }
    return this.handleClerkAuth(context);
  }

  private async handleMockAuth(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    let user: any = null;
    let memberships: any[] = [];

    try {
      user = await this.prisma.user.findFirst({ where: { email: 'demo@doloyal.ai' } });
    } catch {
      this.logger.warn('Database query unavailable. Using in-memory mock dev user.');
    }

    if (!user) {
      user = {
        id: 'dev-user-id',
        email: 'demo@doloyal.ai',
        firstName: 'Demo',
        lastName: 'User',
        avatarUrl: null,
      };
    }

    try {
      memberships = await this.prisma.membership.findMany({ where: { userId: user.id } });
    } catch {
      this.logger.warn('Could not fetch memberships.');
    }

    if (!memberships || memberships.length === 0) {
      memberships = [
        { id: 'dev-membership-id', userId: user.id, tenantId: 'demo-tenant-id', role: 'OWNER', createdAt: new Date() },
      ];
    }

    let activeTenantId = memberships[0]?.tenantId || 'demo-tenant-id';
    let activeRole = memberships[0]?.role || 'OWNER';

    const headerTenant = request.headers['x-tenant-id'] as string;
    if (headerTenant) {
      const match = memberships.find((m: any) => m.tenantId === headerTenant);
      if (match) { activeTenantId = match.tenantId; activeRole = match.role; }
    }

    (request as any).user = {
      id: user.id,
      externalId: user.googleId || user.clerkId || user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin === true || user.email === 'demo@doloyal.ai',
      memberships: memberships.map((m: any) => ({
        id: m.id, userId: m.userId, tenantId: m.tenantId, role: m.role,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      })),
      activeTenantId,
      activeRole,
    };

    return true;
  }

  private async handleClerkAuth(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const { createClerkClient, verifyToken } = await import('@clerk/backend');
      const clerkKey = this.config?.get<string>('CLERK_SECRET_KEY') || process.env.CLERK_SECRET_KEY;
      const clerkClient = createClerkClient({ secretKey: clerkKey });

      const payload = await verifyToken(token, { secretKey: clerkKey });
      const clerkId = payload.sub;
      if (!clerkId) throw new UnauthorizedException('Invalid token payload');

      let user = await this.prisma.user.findUnique({ where: { clerkId } });

      if (!user) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          user = await this.prisma.user.create({
            data: {
              clerkId,
              email: clerkUser.emailAddresses[0]?.emailAddress || `${clerkId}@clerk.dev`,
              firstName: clerkUser.firstName || 'Unknown',
              lastName: clerkUser.lastName || 'User',
              avatarUrl: clerkUser.imageUrl || null,
            },
          });
        } catch {
          user = await this.prisma.user.create({
            data: { clerkId, email: `${clerkId}@clerk.dev`, firstName: 'Clerk', lastName: 'User' },
          });
        }
      }

      const memberships = await this.prisma.membership.findMany({ where: { userId: user.id } });

      let activeTenantId = memberships[0]?.tenantId;
      let activeRole = memberships[0]?.role || 'STAFF';

      const headerTenant = request.headers['x-tenant-id'] as string;
      if (headerTenant) {
        const match = memberships.find((m: any) => m.tenantId === headerTenant);
        if (match) { activeTenantId = match.tenantId; activeRole = match.role; }
      }

      (request as any).user = {
        id: user.id,
        externalId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin === true,
        memberships: memberships.map((m: any) => ({
          id: m.id, userId: m.userId, tenantId: m.tenantId, role: m.role,
          createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
        })),
        activeTenantId,
        activeRole,
      };

      return true;
    } catch (err: any) {
      this.logger.error(`Clerk auth failed: ${err.message}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}