import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Platform-level audit trail for sensitive admin actions.
 * Every record is immutable — there is no update/delete path exposed.
 */
@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    actor: any,
    action: string,
    category: string,
    opts: {
      targetType?: string;
      targetId?: string;
      targetName?: string;
      metadata?: Record<string, unknown>;
      ip?: string;
      userAgent?: string;
    } = {},
  ) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          actorId: actor?.id ?? null,
          actorEmail: actor?.email ?? null,
          actorName:
            actor?.firstName || actor?.lastName
              ? `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim()
              : null,
          action,
          category,
          targetType: opts.targetType ?? null,
          targetId: opts.targetId ?? null,
          targetName: opts.targetName ?? null,
          metadata: (opts.metadata ?? undefined) as any,
          ip: opts.ip ?? null,
          userAgent: opts.userAgent ?? null,
        },
      });
    } catch {
      // Audit logging must never break the primary operation.
    }
  }
}
