import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  applyCustomerSpendDelta,
  awardSpendPoints,
  logActivity,
  orderCountsAsRevenue,
} from '../../common/customer-commerce';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
type PaymentStatus = 'PAID' | 'PENDING' | 'PARTIALLY_PAID' | 'REFUNDED';

export function computeOrderTotal(quantity: number, unitPrice: number, discount: number, tax: number) {
  const subtotal = Math.max(0, quantity) * Math.max(0, unitPrice);
  const total = subtotal - Math.max(0, discount) + Math.max(0, tax);
  return Math.round(Math.max(0, total) * 100) / 100;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private map(
    row: {
      id: string;
      tenantId: string;
      orderNumber: string;
      customerId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      tax: number;
      total: number;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      orderDate: Date;
      notes: string | null;
      assignedStaffId: string | null;
      assignedStaffName: string | null;
      createdAt: Date;
      updatedAt: Date;
      customer: { firstName: string; lastName: string; phone: string; email: string | null };
      product: { name: string; sku: string };
    },
  ) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      orderNumber: row.orderNumber,
      customerId: row.customerId,
      customerName: `${row.customer.firstName} ${row.customer.lastName}`.trim(),
      customerPhone: row.customer.phone,
      customerEmail: row.customer.email,
      productId: row.productId,
      productName: row.product.name,
      productSku: row.product.sku,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      discount: row.discount,
      tax: row.tax,
      total: row.total,
      status: row.status,
      paymentStatus: row.paymentStatus,
      orderDate: row.orderDate.toISOString(),
      notes: row.notes,
      assignedStaffId: row.assignedStaffId,
      assignedStaffName: row.assignedStaffName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private include() {
    return {
      customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
      product: { select: { name: true, sku: true } },
    } as const;
  }

  async summary(tenantId: string) {
    const [total, pending, processing, completed, cancelled, value] = await Promise.all([
      this.prisma.clientOrder.count({ where: { tenantId } }),
      this.prisma.clientOrder.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.clientOrder.count({ where: { tenantId, status: 'PROCESSING' } }),
      this.prisma.clientOrder.count({ where: { tenantId, status: 'COMPLETED' } }),
      this.prisma.clientOrder.count({ where: { tenantId, status: 'CANCELLED' } }),
      this.prisma.clientOrder.aggregate({
        where: { tenantId, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ]);
    return {
      total,
      pending,
      processing,
      completed,
      cancelled,
      totalValue: value._sum.total ?? 0,
    };
  }

  async list(
    tenantId: string,
    query: {
      search?: string;
      productId?: string;
      customerId?: string;
      status?: 'ALL' | OrderStatus;
      paymentStatus?: 'ALL' | PaymentStatus;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.limit || 20));
    const where: Prisma.ClientOrderWhereInput = { tenantId };

    if (query.productId) where.productId = query.productId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.paymentStatus && query.paymentStatus !== 'ALL') where.paymentStatus = query.paymentStatus;
    if (query.from || query.to) {
      where.orderDate = {};
      if (query.from) where.orderDate.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) where.orderDate.lte = new Date(`${query.to}T23:59:59.999Z`);
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.clientOrder.findMany({
        where,
        include: this.include(),
        orderBy: { orderDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.clientOrder.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.map(row)),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      nextCursor: null as string | null,
    };
  }

  async getById(tenantId: string, id: string) {
    const row = await this.prisma.clientOrder.findFirst({
      where: { id, tenantId },
      include: this.include(),
    });
    if (!row) throw new NotFoundException('Order not found');
    return this.map(row);
  }

  private async nextOrderNumber(tenantId: string) {
    const last = await this.prisma.clientOrder.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const match = last?.orderNumber.match(/(\d+)$/);
    const next = match ? Number(match[1]) + 1 : 1001;
    return `ORD-${next}`;
  }

  async create(
    tenantId: string,
    dto: {
      customerId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      tax?: number;
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      orderDate?: string;
      notes?: string | null;
      assignedStaffId?: string | null;
      assignedStaffName?: string | null;
    },
  ) {
    const [customer, product] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } }),
      this.prisma.product.findFirst({ where: { id: dto.productId, tenantId } }),
    ]);
    if (!customer) throw new BadRequestException('Client not found');
    if (!product) throw new BadRequestException('Product not found');

    const quantity = Math.max(1, Math.floor(dto.quantity));
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = computeOrderTotal(quantity, dto.unitPrice, discount, tax);
    const status = dto.status ?? 'PENDING';
    const orderNumber = await this.nextOrderNumber(tenantId);

    const counts = orderCountsAsRevenue(status, dto.paymentStatus ?? 'PENDING');

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clientOrder.create({
        data: {
          tenantId,
          orderNumber,
          customerId: dto.customerId,
          productId: dto.productId,
          quantity,
          unitPrice: dto.unitPrice,
          discount,
          tax,
          total,
          status,
          paymentStatus: dto.paymentStatus ?? 'PENDING',
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          notes: dto.notes?.trim() || null,
          assignedStaffId: dto.assignedStaffId || null,
          assignedStaffName: dto.assignedStaffName?.trim() || null,
        },
        include: this.include(),
      });
      if (status !== 'CANCELLED') {
        const nextQty = Math.max(0, product.stockQuantity - quantity);
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: nextQty,
            availability: nextQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
          },
        });
      }
      return created;
    });

    if (counts) {
      await applyCustomerSpendDelta(this.prisma, {
        tenantId,
        customerId: dto.customerId,
        deltaAmount: total,
        deltaVisits: 1,
        lastVisitAt: row.orderDate,
      });
      await awardSpendPoints(this.prisma, {
        tenantId,
        customerId: dto.customerId,
        amount: total,
        reason: `Earned from order ${orderNumber}`,
      });
    }

    await logActivity(this.prisma, {
      tenantId,
      customerId: dto.customerId,
      type: counts ? 'INVOICE_PAID' : 'NOTE_ADDED',
      message: counts
        ? `Order ${orderNumber} recorded — ₹${total.toLocaleString('en-IN')} (${status})`
        : `Order ${orderNumber} created (${status})`,
    });

    return this.map(row);
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<{
      customerId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      tax: number;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      orderDate: string;
      notes: string | null;
      assignedStaffId: string | null;
      assignedStaffName: string | null;
    }>,
  ) {
    const existing = await this.prisma.clientOrder.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Order not found');

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
      if (!customer) throw new BadRequestException('Client not found');
    }
    if (dto.productId) {
      const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId } });
      if (!product) throw new BadRequestException('Product not found');
    }

    const quantity = dto.quantity ?? existing.quantity;
    const unitPrice = dto.unitPrice ?? existing.unitPrice;
    const discount = dto.discount ?? existing.discount;
    const tax = dto.tax ?? existing.tax;
    const status = dto.status ?? existing.status;
    const productId = dto.productId ?? existing.productId;
    const nextPayment = dto.paymentStatus ?? existing.paymentStatus;
    const nextCustomerId = dto.customerId ?? existing.customerId;
    const nextTotal = computeOrderTotal(quantity, unitPrice, discount, tax);
    const prevCounts = orderCountsAsRevenue(existing.status, existing.paymentStatus);
    const nextCounts = orderCountsAsRevenue(status, nextPayment);

    const row = await this.prisma.$transaction(async (tx) => {
      const prevConsumed = existing.status === 'CANCELLED' ? 0 : existing.quantity;
      const nextConsumed = status === 'CANCELLED' ? 0 : quantity;

      if (existing.productId === productId) {
        const delta = prevConsumed - nextConsumed;
        if (delta !== 0) {
          const product = await tx.product.findFirst({ where: { id: productId, tenantId } });
          if (product) {
            const nextQty = Math.max(0, product.stockQuantity + delta);
            await tx.product.update({
              where: { id: productId },
              data: {
                stockQuantity: nextQty,
                availability: nextQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
              },
            });
          }
        }
      } else {
        if (prevConsumed) {
          const prev = await tx.product.findFirst({ where: { id: existing.productId, tenantId } });
          if (prev) {
            const nextQty = Math.max(0, prev.stockQuantity + prevConsumed);
            await tx.product.update({
              where: { id: prev.id },
              data: {
                stockQuantity: nextQty,
                availability: nextQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
              },
            });
          }
        }
        if (nextConsumed) {
          const next = await tx.product.findFirst({ where: { id: productId, tenantId } });
          if (next) {
            const nextQty = Math.max(0, next.stockQuantity - nextConsumed);
            await tx.product.update({
              where: { id: next.id },
              data: {
                stockQuantity: nextQty,
                availability: nextQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
              },
            });
          }
        }
      }

      return tx.clientOrder.update({
        where: { id },
        data: {
          ...(dto.customerId ? { customerId: dto.customerId } : {}),
          productId,
          quantity,
          unitPrice,
          discount,
          tax,
          total: nextTotal,
          status,
          ...(dto.paymentStatus ? { paymentStatus: dto.paymentStatus } : {}),
          ...(dto.orderDate ? { orderDate: new Date(dto.orderDate) } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
          ...(dto.assignedStaffId !== undefined ? { assignedStaffId: dto.assignedStaffId || null } : {}),
          ...(dto.assignedStaffName !== undefined
            ? { assignedStaffName: dto.assignedStaffName?.trim() || null }
            : {}),
        },
        include: this.include(),
      });
    });

    if (existing.customerId === nextCustomerId) {
      const deltaAmount =
        (nextCounts ? nextTotal : 0) - (prevCounts ? existing.total : 0);
      const deltaVisits = (nextCounts ? 1 : 0) - (prevCounts ? 1 : 0);
      await applyCustomerSpendDelta(this.prisma, {
        tenantId,
        customerId: nextCustomerId,
        deltaAmount,
        deltaVisits,
        lastVisitAt: nextCounts ? row.orderDate : null,
      });
    } else {
      if (prevCounts) {
        await applyCustomerSpendDelta(this.prisma, {
          tenantId,
          customerId: existing.customerId,
          deltaAmount: -existing.total,
          deltaVisits: -1,
        });
      }
      if (nextCounts) {
        await applyCustomerSpendDelta(this.prisma, {
          tenantId,
          customerId: nextCustomerId,
          deltaAmount: nextTotal,
          deltaVisits: 1,
          lastVisitAt: row.orderDate,
        });
      }
    }

    if (nextCounts) {
      await awardSpendPoints(this.prisma, {
        tenantId,
        customerId: nextCustomerId,
        amount: nextTotal,
        reason: `Earned from order ${existing.orderNumber}`,
      });
    }

    if (prevCounts !== nextCounts || existing.status !== status) {
      await logActivity(this.prisma, {
        tenantId,
        customerId: nextCustomerId,
        type: nextCounts ? 'INVOICE_PAID' : 'NOTE_ADDED',
        message: `Order ${existing.orderNumber} updated to ${status} / ${nextPayment}`,
      });
    }

    return this.map(row);
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.clientOrder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Order not found');
    await this.prisma.$transaction(async (tx) => {
      if (existing.status !== 'CANCELLED') {
        const product = await tx.product.findFirst({ where: { id: existing.productId, tenantId } });
        if (product) {
          const nextQty = Math.max(0, product.stockQuantity + existing.quantity);
          await tx.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: nextQty,
              availability: nextQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
            },
          });
        }
      }
      await tx.clientOrder.delete({ where: { id } });
    });
    if (orderCountsAsRevenue(existing.status, existing.paymentStatus)) {
      await applyCustomerSpendDelta(this.prisma, {
        tenantId,
        customerId: existing.customerId,
        deltaAmount: -existing.total,
        deltaVisits: -1,
      });
    }
    await logActivity(this.prisma, {
      tenantId,
      customerId: existing.customerId,
      type: 'NOTE_ADDED',
      message: `Order ${existing.orderNumber} deleted`,
    });
    return { ok: true };
  }
}
