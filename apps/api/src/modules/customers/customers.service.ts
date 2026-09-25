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
import { ensureClientNumber, nextClientNumber } from '../../common/client-number';
import {
  buildCustomerExportWorkbook,
  isExcelFilename,
  parseCustomerExcel,
  type ParsedImportRow,
} from './customer-excel';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { CommerceRealtimeService } from '../../common/commerce-realtime.service';

const DAY_MS = 86_400_000;

/** floor((now - t) / day) <= days  <=>  t > now - (days + 1) days */
function visitedSince(days: number) {
  return new Date(Date.now() - (days + 1) * DAY_MS);
}

function loyaltyBandWhere(band: string) {
  const vip = { OR: [{ totalSpent: { gte: 50000 } }, { pointsBalance: { gte: 5000 } }] };
  const loyal = { OR: [{ totalSpent: { gte: 10000 } }, { totalVisits: { gte: 20 } }] };
  const growing = { OR: [{ totalSpent: { gte: 2000 } }, { totalVisits: { gte: 5 } }] };
  if (band === 'VIP') return vip;
  if (band === 'LOYAL') return { NOT: vip, OR: loyal.OR };
  if (band === 'GROWING') return { NOT: { OR: [vip, loyal] }, OR: growing.OR };
  if (band === 'NEW') return { NOT: { OR: [vip, loyal, growing] } };
  return { AND: [{ totalSpent: { gt: 0 } }, { totalSpent: { lt: 0 } }] };
}

function churnRiskWhere(risk: string) {
  const within30 = visitedSince(30);
  const within60 = visitedSince(60);
  const within90 = visitedSince(90);
  if (risk === 'LOW') {
    return { lastVisitAt: { gt: within30 }, totalVisits: { gt: 0 } };
  }
  if (risk === 'MEDIUM') {
    return {
      AND: [
        { lastVisitAt: { gt: within60 } },
        { NOT: { AND: [{ lastVisitAt: { gt: within30 } }, { totalVisits: { gt: 0 } }] } },
      ],
    };
  }
  if (risk === 'HIGH') {
    return { lastVisitAt: { gt: within90, lte: within60 } };
  }
  return { OR: [{ lastVisitAt: null }, { lastVisitAt: { lte: within90 } }] };
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly realtime: CommerceRealtimeService,
  ) {}

  async list(tenantId: string, query: {
    search?: string;
    tags?: string;
    band?: string;
    churnRisk?: string;
    limit?: number;
    cursor?: string;
  }) {
    const limit = Math.min(query.limit || 50, 100);
    const and: Record<string, unknown>[] = [];

    if (query.search) {
      const search = query.search;
      and.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.band) and.push(loyaltyBandWhere(query.band));
    if (query.churnRisk) and.push(churnRiskWhere(query.churnRisk));

    const where: Record<string, unknown> = { tenantId };
    if (query.tags) {
      const tags = query.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      if (tags.length) where.tags = { hasSome: tags };
    }
    if (and.length) where.AND = and;

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where: where as any }),
      this.prisma.customer.findMany({
        where: where as any,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
    ]);

    const hasMore = customers.length > limit;
    const page = customers.slice(0, limit).map(prismaCustomerToShared);

    return {
      items: page,
      nextCursor: hasMore ? page[page.length - 1]?.id || null : null,
      hasMore,
      total,
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
        orders: {
          take: 20,
          orderBy: { orderDate: 'desc' },
          include: { product: { select: { name: true } } },
        },
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
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
    for (const order of customer.orders || []) {
      const name = order.product?.name || 'Order';
      const existing = preferredServicesMap.get(name) || { count: 0, lastAt: new Date(0) };
      existing.count += order.quantity;
      if (order.orderDate > existing.lastAt) existing.lastAt = order.orderDate;
      preferredServicesMap.set(name, existing);
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
      ...(customer.orders || []).map((order) => ({
        id: order.id,
        kind: 'ORDER' as const,
        title: `Order ${order.orderNumber}`,
        description: `${order.product?.name || 'Product'} · ${order.status}`,
        amount: order.total,
        points: undefined,
        date: order.orderDate.toISOString(),
      })),
      ...(customer.reviews || []).map((review) => ({
        id: review.id,
        kind: 'REVIEW' as const,
        title: `${review.rating}-star review`,
        description: review.status === 'APPROVED' ? 'Approved' : review.status === 'REJECTED' ? 'Rejected' : 'Pending approval',
        amount: undefined,
        points: undefined,
        date: review.createdAt.toISOString(),
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
    const clientNumber = await nextClientNumber(this.prisma, tenantId);
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
        signupSource: 'MANUAL',
        clientNumber,
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

    try {
      await this.workflowEngine.handleEvent(tenantId, 'customer_created', {
        customerId: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        email: customer.email,
        phone: customer.phone,
      });
    } catch {
      // Workflows must never block customer creation
    }

    this.realtime.publish(tenantId, 'customers');
    return prismaCustomerToShared(customer);
  }

  async ensureLinkedClient(input: {
    tenantId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatarUrl?: string | null;
    source?: string;
  }) {
    const tenantId = input.tenantId;
    const now = new Date();

    const byUser = await this.prisma.customer.findFirst({
      where: { tenantId, userId: input.userId },
    });
    if (byUser) {
      const updated = await this.prisma.customer.update({
        where: { id: byUser.id },
        data: {
          phone: input.phone || byUser.phone,
          email: input.email || byUser.email,
          avatarUrl: input.avatarUrl || byUser.avatarUrl,
          lastLoginAt: now,
          lastActivityAt: now,
          status: byUser.status === 'INACTIVE' ? 'ACTIVE' : byUser.status,
        },
      });
      const withId = await ensureClientNumber(this.prisma, updated);
      this.realtime.publish(tenantId, 'customers');
      return withId;
    }

    const orFilters: Array<{ email?: { equals: string; mode: 'insensitive' }; phone?: string }> = [];
    if (input.email) orFilters.push({ email: { equals: input.email, mode: 'insensitive' } });
    if (input.phone) orFilters.push({ phone: input.phone });

    const existing = orFilters.length
      ? await this.prisma.customer.findFirst({
          where: { tenantId, OR: orFilters },
        })
      : null;

    if (existing) {
      if (existing.userId && existing.userId !== input.userId) {
        throw new ConflictException('This customer profile is already linked to another account for this business.');
      }
      const linked = await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          userId: input.userId,
          phone: input.phone || existing.phone,
          email: input.email || existing.email,
          avatarUrl: input.avatarUrl || existing.avatarUrl,
          lastLoginAt: now,
          lastActivityAt: now,
          signupSource: existing.signupSource || input.source || 'CLIENT_PAGE',
        },
      });
      const withId = await ensureClientNumber(this.prisma, linked);
      this.realtime.publish(tenantId, 'customers');
      return withId;
    }

    const created = await this.create(tenantId, {
      name: `${input.firstName} ${input.lastName}`.trim() || input.firstName,
      phone: input.phone,
      email: input.email,
      tags: ['client-page'],
    });

    const linked = await this.prisma.customer.update({
      where: { id: created.id },
      data: {
        userId: input.userId,
        avatarUrl: input.avatarUrl || undefined,
        signupSource: input.source || 'CLIENT_PAGE',
        lastLoginAt: now,
        lastActivityAt: now,
        firstName: input.firstName || undefined,
        lastName: input.lastName || undefined,
      },
    });
    this.realtime.publish(tenantId, 'customers');
    return linked;
  }

  async touchClientLogin(tenantId: string, customerId: string) {
    const now = new Date();
    await this.prisma.customer.updateMany({
      where: { id: customerId, tenantId },
      data: { lastLoginAt: now, lastActivityAt: now },
    });
  }

  async getClientPortal(tenantId: string, userId: string) {
    let customer = await this.prisma.customer.findFirst({
      where: { tenantId, userId },
      include: {
        appointments: {
          take: 20,
          orderBy: { startTime: 'desc' },
          include: { staff: true },
        },
        orders: {
          take: 20,
          orderBy: { orderDate: 'desc' },
          include: { product: { select: { name: true } } },
        },
        memberships: { include: { tier: true }, take: 1 },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found for this business.');
    }

    if (!customer.clientNumber) {
      const withId = await ensureClientNumber(this.prisma, customer);
      customer = { ...customer, clientNumber: withId.clientNumber };
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastActivityAt: new Date() },
    });

    const rewards = await this.prisma.reward.findMany({
      where: { tenantId, status: 'ACTIVE' as any },
      orderBy: { pointsCost: 'asc' },
      take: 12,
    });

    const membership = customer.memberships[0]?.tier
      ? { name: customer.memberships[0].tier.name, color: customer.memberships[0].tier.color }
      : null;

    return {
      customer: prismaCustomerToShared(customer),
      appointments: customer.appointments.map((apt) => ({
        id: apt.id,
        startTime: apt.startTime.toISOString(),
        endTime: apt.endTime?.toISOString?.() ?? null,
        status: apt.status,
        serviceName: apt.serviceName,
        staffName: apt.staff?.name ?? null,
      })),
      orders: customer.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        productName: order.product?.name ?? 'Order',
        quantity: order.quantity,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        orderDate: order.orderDate.toISOString(),
      })),
      rewards: rewards.map((r) => ({
        id: r.id,
        name: r.name,
        pointsCost: r.pointsCost,
        description: r.description,
      })),
      membership,
      referralCode: customer.referralCode,
      pointsBalance: customer.pointsBalance,
    };
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

    this.realtime.publish(tenantId, 'customers');
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

    this.realtime.publish(tenantId, 'customers');
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
    let seqBase = 0;
    {
      const existingNumbers = await this.prisma.customer.findMany({
        where: { tenantId, clientNumber: { startsWith: 'CL-' } },
        select: { clientNumber: true },
      });
      for (const row of existingNumbers) {
        const n = Number(String(row.clientNumber || '').replace(/^CL-/i, ''));
        if (Number.isFinite(n) && n > seqBase) seqBase = n;
      }
    }

    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);
      const created = await this.prisma.$transaction(
        batch.map((row, idx) => {
          const nameParts = row.name.trim().split(/\s+/);
          const firstName = nameParts.shift() || row.name.trim();
          const lastName = nameParts.join(' ') || '-';
          const clientNumber = `CL-${String(seqBase + i + idx + 1).padStart(4, '0')}`;
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
              clientNumber,
              signupSource: 'IMPORT',
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
