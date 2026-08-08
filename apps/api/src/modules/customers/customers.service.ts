import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  prismaCustomerToShared,
  prismaPointsLedgerToShared,
} from '../../common/helpers';
import {
  buildCustomerExportWorkbook,
  isExcelFilename,
  parseCustomerExcel,
  type ParsedImportRow,
} from './customer-excel';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: {
    search?: string;
    tags?: string;
    band?: string;
    churnRisk?: string;
    limit?: number;
    cursor?: string;
  }) {
    const limit = query.limit || 50;
    const where: any = { tenantId };

    if (query.search) {
      const search = query.search;
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.tags) {
      const tags = query.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      if (tags.length) where.tags = { hasSome: tags };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const filtered = customers
      .map(prismaCustomerToShared)
      .filter((customer) => !query.band || customer.loyaltyBand === query.band)
      .filter((customer) => !query.churnRisk || customer.churnRisk === query.churnRisk);
    const cursorIndex = query.cursor ? filtered.findIndex((customer) => customer.id === query.cursor) + 1 : 0;
    const page = filtered.slice(cursorIndex, cursorIndex + limit);
    const hasMore = cursorIndex + limit < filtered.length;
    const nextCursor = hasMore ? page[page.length - 1]?.id || null : null;

    return {
      items: page,
      nextCursor,
      hasMore,
      total: filtered.length,
    };
  }

  async getById(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        appointments: {
          take: 10,
          orderBy: { startTime: 'desc' },
          include: { staff: true },
        },
        invoices: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        pointsLedger: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
        memberships: {
          include: { tier: true },
          take: 1,
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const shared = prismaCustomerToShared(customer);

    const preferredServicesMap = new Map<string, { count: number; lastAt: Date }>();
    for (const inv of customer.invoices) {
      for (const item of inv.items) {
        const existing = preferredServicesMap.get(item.description) || { count: 0, lastAt: new Date(0) };
        existing.count += item.quantity;
        if (inv.createdAt > existing.lastAt) existing.lastAt = inv.createdAt;
        preferredServicesMap.set(item.description, existing);
      }
    }
    const preferredServices = Array.from(preferredServicesMap.entries())
      .map(([name, data]) => ({ name, count: data.count, lastAt: data.lastAt.toISOString() }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const timeline: any[] = [
      ...customer.invoices.map((inv) => ({
        id: inv.id,
        kind: 'INVOICE' as const,
        title: `Invoice #${inv.invoiceNumber}`,
        description: `${inv.items.length} service(s)`,
        amount: inv.total,
        points: undefined,
        date: inv.createdAt.toISOString(),
      })),
      ...customer.pointsLedger.map((p) => ({
        id: p.id,
        kind: 'POINTS' as const,
        title: p.amount >= 0 ? 'Points Earned' : 'Points Redeemed',
        description: p.reason,
        amount: undefined,
        points: p.amount,
        date: p.createdAt.toISOString(),
      })),
      ...customer.appointments.map((a) => ({
        id: a.id,
        kind: 'VISIT' as const,
        title: a.serviceName,
        description: a.status,
        amount: undefined,
        points: undefined,
        date: a.startTime.toISOString(),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const membership = customer.memberships[0]
      ? {
          id: customer.memberships[0].id,
          customerId: customer.memberships[0].customerId,
          tierId: customer.memberships[0].tierId,
          tierName: customer.memberships[0].tier?.name as any || 'SILVER',
          startDate: customer.memberships[0].assignedAt.toISOString(),
          endDate: new Date(new Date(customer.memberships[0].assignedAt).getTime() + 365 * 86400000).toISOString(),
          active: true,
        }
      : null;

    const profile: any = {
      ...shared,
      preferredServices,
      membership,
      timeline,
      pointsLedger: customer.pointsLedger.map(prismaPointsLedgerToShared),
      predictedNextVisitDays: null,
      upgradeRecommendation: null,
    };

    return profile;
  }

  async create(tenantId: string, data: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    tags?: string[];
  }) {
    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts.shift() || data.name.trim();
    const lastName = nameParts.join(' ') || '-';
    const duplicate = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [
          { phone: data.phone },
          ...(data.email ? [{ email: { equals: data.email, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
    if (duplicate) {
      throw new ConflictException('A customer with this phone number or email already exists');
    }
    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        tags: data.tags || [],
        status: 'ACTIVE',
      },
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        customerId: customer.id,
        type: 'CUSTOMER_CREATED',
        message: `Customer ${customer.firstName} ${customer.lastName} was created`,
      },
    });

    const config = await this.prisma.loyaltyConfig.findUnique({
      where: { tenantId },
    });

    if (config && config.signupBonus > 0) {
      const newBalance = customer.pointsBalance + config.signupBonus;
      await this.prisma.pointsLedger.create({
        data: {
          tenantId,
          customerId: customer.id,
          amount: config.signupBonus,
          balanceAfter: newBalance,
          reason: 'Signup bonus',
        },
      });
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { pointsBalance: newBalance },
      });
    }

    return prismaCustomerToShared(customer);
  }

  async update(tenantId: string, id: string, data: { name?: string; phone?: string; email?: string; notes?: string; tags?: string[]; status?: 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'CHURNED' }) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    if (data.phone || data.email) {
      const duplicate = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          id: { not: id },
          OR: [
            ...(data.phone ? [{ phone: data.phone }] : []),
            ...(data.email ? [{ email: { equals: data.email, mode: 'insensitive' as const } }] : []),
          ],
        },
      });
      if (duplicate) throw new ConflictException('A customer with this phone number or email already exists');
    }

    const { name, ...rest } = data;
    const nameParts = name?.trim().split(/\s+/) ?? [];
    const firstName = name ? nameParts.shift() : undefined;
    const lastName = name ? (nameParts.join(' ') || '-') : undefined;
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      },
    });

    return prismaCustomerToShared(updated);
  }

  async softDelete(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    await this.prisma.customer.update({
      where: { id },
      data: { status: 'CHURNED' },
    });

    return { message: 'Customer deactivated successfully' };
  }

  async importFromExcel(tenantId: string, buffer: Buffer, filename: string) {
    if (!isExcelFilename(filename)) {
      throw new BadRequestException('Only Excel files (.xlsx, .xls) are supported');
    }

    const { rows, errors } = parseCustomerExcel(buffer);
    if (!rows.length && !errors.length) {
      throw new BadRequestException('No customer rows found in the Excel file');
    }

    const existing = await this.prisma.customer.findMany({
      where: { tenantId },
      select: { phone: true, email: true },
    });
    const existingPhones = new Set(
      existing.map((c) => c.phone.replace(/[\s-]/g, '')),
    );
    const existingEmails = new Set(
      existing
        .map((c) => c.email?.toLowerCase())
        .filter((e): e is string => Boolean(e)),
    );

    const toCreate: ParsedImportRow[] = [];
    for (const row of rows) {
      const phoneKey = row.phone.replace(/[\s-]/g, '');
      if (existingPhones.has(phoneKey)) {
        errors.push({
          row: row.row,
          reason: 'A customer with this phone number already exists',
        });
        continue;
      }
      if (row.email && existingEmails.has(row.email.toLowerCase())) {
        errors.push({
          row: row.row,
          reason: 'A customer with this email already exists',
        });
        continue;
      }
      existingPhones.add(phoneKey);
      if (row.email) existingEmails.add(row.email.toLowerCase());
      toCreate.push(row);
    }

    const createdCustomers = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);
      const created = await this.prisma.$transaction(
        batch.map((row) => {
          const nameParts = row.name.trim().split(/\s+/);
          const firstName = nameParts.shift() || row.name.trim();
          const lastName = nameParts.join(' ') || '-';
          return this.prisma.customer.create({
            data: {
              tenantId,
              firstName,
              lastName,
              phone: row.phone,
              email: row.email,
              notes: row.notes,
              tags: row.tags,
              status: row.status || 'ACTIVE',
            },
          });
        }),
      );
      createdCustomers.push(...created);
    }

    if (createdCustomers.length > 0) {
      await this.prisma.activity.create({
        data: {
          tenantId,
          type: 'CUSTOMER_CREATED',
          message: `Imported ${createdCustomers.length} customer${createdCustomers.length === 1 ? '' : 's'} from Excel`,
        },
      });
    }

    errors.sort((a, b) => a.row - b.row);

    return {
      imported: createdCustomers.length,
      skipped: errors.length,
      errors,
      customers: createdCustomers.map(prismaCustomerToShared),
    };
  }

  async exportToExcel(tenantId: string): Promise<{ buffer: Buffer; filename: string }> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const shared = customers.map((c) => {
      const mapped = prismaCustomerToShared(c);
      return {
        name: mapped.name,
        phone: mapped.phone,
        email: mapped.email,
        tags: mapped.tags,
        status: c.status,
        pointsBalance: mapped.pointsBalance,
        visitCount: mapped.visitCount,
        lifetimeValue: mapped.lifetimeValue,
        loyaltyBand: mapped.loyaltyBand,
        churnRisk: mapped.churnRisk,
        lastVisitAt: mapped.lastVisitAt,
        notes: mapped.notes,
        createdAt: mapped.createdAt,
      };
    });

    const buffer = buildCustomerExportWorkbook(shared);
    const date = new Date().toISOString().slice(0, 10);
    return { buffer, filename: `customers-${date}.xlsx` };
  }
}
