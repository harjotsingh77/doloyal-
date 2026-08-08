import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { prismaInvoiceToShared, generateInvoiceNumber } from '../../common/helpers';
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referrals: ReferralsService,
  ) {}

  async list(tenantId: string, query: { customerId?: string; status?: string }) {
    const where: any = { tenantId };
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;
    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, customer: true },
      take: 100,
    });
    return invoices.map(prismaInvoiceToShared);
  }

  async create(tenantId: string, data: {
    customerId: string;
    items: { serviceName: string; quantity: number; unitPrice: number }[];
    discount?: number;
    taxRate?: number;
    paymentMethod?: string;
    notes?: string;
  }) {
    const customer = await this.prisma.customer.findFirst({ where: { id: data.customerId, tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const invoiceCount = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNumber = generateInvoiceNumber('INV', invoiceCount);

    const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const discount = data.discount || 0;
    const taxRate = data.taxRate || 0;
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * taxRate * 100) / 10000;
    const total = Math.round((taxable + tax) * 100) / 100;

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        customerId: data.customerId,
        invoiceNumber,
        subtotal,
        discount,
        tax,
        total,
        status: 'PAID',
        paymentMethod: data.paymentMethod || 'CASH',
        paidAt: new Date(),
        items: {
          create: data.items.map((item) => ({
            description: item.serviceName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    const newVisits = customer.totalVisits + 1;
    const newSpent = customer.totalSpent + total;

    await this.prisma.customer.update({
      where: { id: data.customerId },
      data: {
        totalVisits: newVisits,
        totalSpent: newSpent,
        lastVisitAt: new Date(),
      },
    });

    const config = await this.prisma.loyaltyConfig.findUnique({ where: { tenantId } });
    if (config && config.mode === 'POINTS_PER_SPEND' && config.pointsPerUnit > 0) {
      const pointsEarned = Math.floor((total / config.currencyUnit) * config.pointsPerUnit);
      if (pointsEarned > 0) {
        const newBalance = customer.pointsBalance + pointsEarned;
        await this.prisma.pointsLedger.create({
          data: {
            tenantId,
            customerId: data.customerId,
            amount: pointsEarned,
            balanceAfter: newBalance,
            reason: `Earned from invoice ${invoiceNumber}`,
          },
        });
        await this.prisma.customer.update({
          where: { id: data.customerId },
          data: { pointsBalance: newBalance },
        });
        await this.prisma.activity.create({
          data: {
            tenantId,
            customerId: data.customerId,
            type: 'POINTS_EARNED',
            message: `${customer.firstName} ${customer.lastName} earned ${pointsEarned} points from invoice ${invoiceNumber}`,
          },
        });
      }
    }

    await this.prisma.activity.create({
      data: {
        tenantId,
        customerId: data.customerId,
        type: 'INVOICE_PAID',
        message: `Invoice ${invoiceNumber} for ${data.items.length} service(s) - ₹${total.toLocaleString('en-IN')}`,
      },
    });

    try {
      await this.referrals.onFriendConverted(tenantId, data.customerId, {
        invoiceId: invoice.id,
        orderValue: total,
      });
    } catch {
      // Referral conversion must not block invoicing
    }

    return prismaInvoiceToShared(invoice);
  }

  async getById(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { items: true, customer: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return prismaInvoiceToShared(invoice);
  }
}
