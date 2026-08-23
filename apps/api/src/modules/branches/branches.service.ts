import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './branches.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwned(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async list(tenantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    // Real per-branch staff counts from the Staff table's direct link.
    const staffCounts = await this.prisma.staff.groupBy({
      by: ['branchId'],
      where: { tenantId, branchId: { not: null } },
      _count: { id: true },
    });
    const countByBranch = new Map(
      staffCounts.filter((s) => s.branchId).map((s) => [s.branchId as string, s._count.id]),
    );

    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      phone: b.phone,
      address: b.address,
      city: b.city,
      createdAt: b.createdAt,
      staffCount: countByBranch.get(b.id) || 0,
    }));
  }

  async create(tenantId: string, dto: CreateBranchDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Branch name is required');

    const existing = await this.prisma.branch.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' as any } },
    });
    if (existing) throw new BadRequestException('A branch with this name already exists');

    return this.prisma.branch.create({
      data: {
        tenantId,
        name,
        phone: dto.phone || null,
        address: dto.address || null,
        city: dto.city || null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateBranchDto) {
    await this.assertOwned(tenantId, id);
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('Branch name cannot be empty');
    }
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.address !== undefined) data.address = dto.address || null;
    if (dto.city !== undefined) data.city = dto.city || null;
    return this.prisma.branch.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    await this.assertOwned(tenantId, id);
    // StaffBranch assignments cascade; Staff rows keep their history.
    await this.prisma.branch.delete({ where: { id } });
    await this.prisma.staff.updateMany({
      where: { tenantId, branchId: id },
      data: { branchId: null },
    });
    return { success: true };
  }

  /**
   * REAL branch-scoped stats. In the current schema a branch scopes its TEAM
   * (Staff.branchId); customers and appointments are business-wide records
   * attributed to staff members. These numbers therefore reflect activity
   * delivered by this branch's team — nothing is estimated or invented.
   */
  async getStats(tenantId: string, id: string) {
    const branch = await this.assertOwned(tenantId, id);

    const staffRows = await this.prisma.staff.findMany({
      where: { tenantId, branchId: id },
      select: { id: true, name: true, roleTitle: true, isAvailable: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
    const staffIds = staffRows.map((s) => s.id);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 86400000);
    const from30 = new Date(Date.now() - 30 * 86400000);

    const activeFilter = { tenantId, staffId: { in: staffIds } };
    const [appointmentsToday, appointments30d, completed30d, revenueAgg] = await Promise.all([
      staffIds.length
        ? this.prisma.appointment.count({
            where: {
              ...activeFilter,
              startTime: { gte: startOfDay, lt: endOfDay },
              status: { notIn: ['CANCELLED', 'NO_SHOW'] as any[] },
            },
          })
        : Promise.resolve(0),
      staffIds.length
        ? this.prisma.appointment.count({ where: { ...activeFilter, startTime: { gte: from30 } } })
        : Promise.resolve(0),
      staffIds.length
        ? this.prisma.appointment.count({ where: { ...activeFilter, startTime: { gte: from30 }, status: 'COMPLETED' as any } })
        : Promise.resolve(0),
      staffIds.length
        ? this.prisma.appointment.aggregate({
            where: { ...activeFilter, startTime: { gte: from30 }, status: 'COMPLETED' as any },
            _sum: { paymentAmount: true },
          })
        : Promise.resolve({ _sum: { paymentAmount: 0 } }),
    ]);

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        phone: branch.phone,
        address: branch.address,
        city: branch.city,
        createdAt: branch.createdAt,
      },
      teamSize: staffRows.length,
      staff: staffRows,
      appointmentsToday,
      appointments30d,
      completed30d,
      revenue30d: Math.round(((revenueAgg as any)?._sum?.paymentAmount || 0) * 100) / 100,
    };
  }
}
