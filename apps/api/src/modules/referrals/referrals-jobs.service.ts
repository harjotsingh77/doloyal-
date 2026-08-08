import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ReferralsService } from './referrals.service';
import { ReferralsRealtimeService } from './referrals-realtime.service';

@Injectable()
export class ReferralsJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReferralsJobsService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly referrals: ReferralsService,
    private readonly realtime: ReferralsRealtimeService,
  ) {}

  onModuleInit() {
    // Campaign expiry — every 5 minutes
    this.timers.push(setInterval(() => void this.expireCampaigns(), 5 * 60_000));
    // Link expiry — every 10 minutes
    this.timers.push(setInterval(() => void this.expireLinks(), 10 * 60_000));
    // Leaderboard recompute — every 2 minutes
    this.timers.push(setInterval(() => void this.recomputeAllLeaderboards(), 2 * 60_000));
    // Pending reward sweep — every 3 minutes
    this.timers.push(setInterval(() => void this.processPendingRewards(), 3 * 60_000));
    // Source aggregation — every 5 minutes
    this.timers.push(setInterval(() => void this.aggregateSources(), 5 * 60_000));
    // Fraud scan — every 15 minutes
    this.timers.push(setInterval(() => void this.scanFraud(), 15 * 60_000));

    // Kick once shortly after boot
    setTimeout(() => {
      void this.expireCampaigns();
      void this.recomputeAllLeaderboards();
    }, 15_000);
  }

  onModuleDestroy() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  async expireCampaigns() {
    try {
      const now = new Date();
      const result = await this.prisma.referralCampaign.updateMany({
        where: {
          deletedAt: null,
          status: { in: ['ACTIVE', 'PAUSED'] },
          endsAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
      });
      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} referral campaign(s)`);
      }
    } catch (e: any) {
      this.logger.warn(`expireCampaigns failed: ${e?.message}`);
    }
  }

  async expireLinks() {
    try {
      const now = new Date();
      await this.prisma.referralLink.updateMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          expiresAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
      });
    } catch (e: any) {
      this.logger.warn(`expireLinks failed: ${e?.message}`);
    }
  }

  async recomputeAllLeaderboards() {
    try {
      const tenants = await this.prisma.referralConversion.findMany({
        where: { status: { in: ['SIGNED_UP', 'BOOKED', 'CONVERTED', 'REWARD_SENT'] } },
        select: { tenantId: true },
        distinct: ['tenantId'],
      });
      for (const t of tenants) {
        await this.referrals.recomputeLeaderboard(t.tenantId);
        this.realtime.publish(t.tenantId, 'LEADERBOARD_UPDATED');
      }
    } catch (e: any) {
      this.logger.warn(`recomputeAllLeaderboards failed: ${e?.message}`);
    }
  }

  async processPendingRewards() {
    try {
      const pending = await this.prisma.referralConversion.findMany({
        where: {
          status: 'CONVERTED',
          rewardStatus: 'PENDING',
        },
        take: 50,
        orderBy: { convertedAt: 'asc' },
      });
      for (const row of pending) {
        try {
          await this.referrals.creditRewards(row.tenantId, row.id);
          this.realtime.publish(row.tenantId, 'REWARD_CREDITED', { conversionId: row.id });
        } catch (err: any) {
          this.logger.warn(`creditRewards ${row.id}: ${err?.message}`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`processPendingRewards failed: ${e?.message}`);
    }
  }

  async aggregateSources() {
    try {
      const tenants = await this.prisma.referralVisit.findMany({
        select: { tenantId: true },
        distinct: ['tenantId'],
        take: 200,
      });
      for (const t of tenants) {
        await this.referrals.aggregateSources(t.tenantId);
      }
    } catch (e: any) {
      this.logger.warn(`aggregateSources failed: ${e?.message}`);
    }
  }

  async scanFraud() {
    try {
      const recent = await this.prisma.referralConversion.findMany({
        where: {
          status: { in: ['SIGNED_UP', 'BOOKED', 'PENDING', 'VISITED'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
        },
        take: 200,
        orderBy: { createdAt: 'desc' },
      });
      for (const row of recent) {
        const flags = await this.referrals.evaluateFraudFlags(row.tenantId, row.id);
        if (flags.length > 0) {
          await this.prisma.referralConversion.update({
            where: { id: row.id },
            data: { suspicious: true, fraudFlags: flags as any },
          });
          this.realtime.publish(row.tenantId, 'FRAUD_FLAGGED', {
            conversionId: row.id,
            flags,
          });
        }
      }
    } catch (e: any) {
      this.logger.warn(`scanFraud failed: ${e?.message}`);
    }
  }
}
