import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { BookingLinksService } from './booking-links.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { GoogleCalendarIntegrationService } from '../integrations/services/google-calendar.service';
import { StripeIntegrationService } from '../integrations/services/stripe.service';
import { RazorpayIntegrationService } from '../integrations/services/razorpay.service';
import {
  DEFAULT_AUTOMATIONS,
  DEFAULT_LOYALTY,
  DEFAULT_PAYMENT,
  DEFAULT_RULES,
} from './booking-defaults';

function generateIcsUrl(appointment: any, tenant: any): string {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Doloyal//Booking//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${appointment.serviceName}`,
    `DESCRIPTION:Appointment with ${tenant?.name || 'Business'}`,
    `LOCATION:${tenant?.address || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function generateGoogleCalendarUrl(appointment: any): string {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: appointment.serviceName,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Appointment: ${appointment.serviceName}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

@Injectable()
export class BookingOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingLinks: BookingLinksService,
    private readonly notifications: BookingNotificationsService,
    private readonly googleCalendar: GoogleCalendarIntegrationService,
    private readonly stripeIntegration: StripeIntegrationService,
    private readonly razorpayIntegration: RazorpayIntegrationService,
  ) {}

  private calcPaymentAmount(servicePrice: number, paymentCfg: any): {
    amount: number;
    status: string;
    mode: string;
  } {
    const mode = paymentCfg?.mode || 'NONE';
    if (mode === 'NONE' || mode === 'PAY_AT_STORE') {
      return { amount: servicePrice, status: mode === 'NONE' ? 'PENDING' : 'PENDING', mode };
    }
    if (mode === 'FULL') {
      return { amount: servicePrice, status: 'PENDING', mode };
    }
    if (mode === 'DEPOSIT') {
      const deposit =
        paymentCfg.depositAmount > 0
          ? paymentCfg.depositAmount
          : (servicePrice * (paymentCfg.depositPercent || 20)) / 100;
      return { amount: Math.round(deposit * 100) / 100, status: 'DEPOSIT', mode };
    }
    if (mode === 'PARTIAL') {
      const partial = (servicePrice * (paymentCfg.partialPercent || 50)) / 100;
      return { amount: Math.round(partial * 100) / 100, status: 'PENDING', mode };
    }
    return { amount: servicePrice, status: 'PENDING', mode };
  }

  private async createPaymentIntent(
    tenantId: string,
    amount: number,
    method?: string,
    currency = 'INR',
    appointmentId?: string,
  ) {
    const type = method === 'RAZORPAY' ? 'RAZORPAY' : 'STRIPE';

    if (type === 'STRIPE') {
      try {
        const intent = await this.stripeIntegration.createPaymentIntent(tenantId, amount, currency, {
          purpose: 'booking_deposit',
          ...(appointmentId ? { appointmentId } : {}),
        });
        return {
          provider: 'STRIPE',
          clientSecret: intent.client_secret,
          orderId: intent.id,
          amount: Math.round(amount * 100),
          simulated: false,
        };
      } catch (err: any) {
        return {
          provider: 'STRIPE',
          clientSecret: null,
          orderId: null,
          simulated: false,
          failed: true,
          message: err?.message || 'Stripe is not connected — choose Pay at Store or connect Stripe in Integrations',
        };
      }
    }

    // Razorpay — create a REAL order via the stored integration credentials.
    try {
      const order = await this.razorpayIntegration.createOrder(
        tenantId,
        amount,
        currency.toUpperCase(),
        `bkng_${Date.now().toString(36)}`,
      );
      return {
        provider: 'RAZORPAY',
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        simulated: false,
      };
    } catch (err: any) {
      return {
        provider: 'RAZORPAY',
        orderId: null,
        simulated: false,
        failed: true,
        message: err?.message || 'Razorpay is not connected — choose Pay at Store or connect Razorpay in Integrations',
      };
    }
  }

  async book(slug: string, dto: any, meta?: { ipHash?: string }) {
    if (dto.honeypot) throw new BadRequestException('Invalid request');

    const { tenant, bookingLink } = await this.bookingLinks.findBySlug(slug);
    this.bookingLinks.assertLinkBookable(bookingLink);
    this.bookingLinks.checkRateLimit(`book:${slug}:${meta?.ipHash || 'anon'}`);

    const authMode = (bookingLink.authMode as any)?.mode || 'GUEST';
    if (authMode === 'REQUIRE_LOGIN' || authMode === 'SIGNUP_BEFORE') {
      if (!dto.customerToken && !dto.email && !dto.customerEmail) {
        // Soft gate: still allow if phone provided for returning customers when enabled
        const returning = (bookingLink.authMode as any)?.returningCustomerLogin !== false;
        if (!returning) {
          throw new BadRequestException('Login required before booking');
        }
      }
    }

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, tenantId: tenant.id, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const rules = { ...DEFAULT_RULES, ...((bookingLink.rules as any) || {}) };
    const paymentCfg = { ...DEFAULT_PAYMENT, ...((bookingLink.payment as any) || {}) };
    const loyaltyCfg = { ...DEFAULT_LOYALTY, ...((bookingLink.loyalty as any) || {}) };
    const automations = { ...DEFAULT_AUTOMATIONS, ...((bookingLink.automations as any) || {}) };

    const startTime = new Date(dto.startTime);
    if (Number.isNaN(startTime.getTime())) throw new BadRequestException('Invalid start time');

    const minNoticeMs = (rules.minNoticeMinutes ?? 60) * 60_000;
    if (startTime.getTime() - Date.now() < minNoticeMs) {
      throw new BadRequestException('This time slot requires more advance notice');
    }

    const duration = rules.appointmentDurationMinutes || service.durationMinutes;
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const staffId = await this.bookingLinks.pickStaff(bookingLink, dto.staffId, tenant.id);

    // Double-booking guard
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        tenantId: tenant.id,
        staffId: staffId || undefined,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (conflict) throw new BadRequestException('This time slot is no longer available');

    // Google Calendar free/busy guard — rejects slots the business calendar already holds.
    try {
      const busy = await this.googleCalendar.isTimeSlotBusy(tenant.id, startTime, endTime);
      if (busy) throw new BadRequestException('This time slot is no longer available');
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      // Calendar unavailable (not connected / revoked) must not block bookings.
    }

    const phone = dto.phone || dto.customerPhone;
    if (!phone) throw new BadRequestException('Phone is required');

    const customerName =
      dto.customerName || `${dto.firstName || ''} ${dto.lastName || ''}`.trim() || 'Guest';
    const nameParts = customerName.trim().split(/\s+/);
    const firstName = dto.firstName || nameParts[0] || 'Guest';
    const lastName = dto.lastName || nameParts.slice(1).join(' ') || '';

    let isNewCustomer = false;
    let customer = await this.prisma.customer.findFirst({
      where: { tenantId: tenant.id, phone },
    });

    if (!customer && dto.email) {
      customer = await this.prisma.customer.findFirst({
        where: { tenantId: tenant.id, email: dto.email },
      });
    }

    if (!customer) {
      if (automations.createCustomer === false) {
        throw new BadRequestException('Customer creation is disabled for this link');
      }
      isNewCustomer = true;
      const tags = dto.referralSource ? [`referral:${dto.referralSource}`] : [];
      customer = await this.prisma.customer.create({
        data: {
          tenantId: tenant.id,
          firstName,
          lastName,
          phone,
          email: dto.email || dto.customerEmail || null,
          notes: [dto.notes, dto.address ? `Address: ${dto.address}` : null, dto.gender ? `Gender: ${dto.gender}` : null]
            .filter(Boolean)
            .join('\n') || null,
          dob: dto.birthday ? new Date(dto.birthday) : undefined,
          tags,
        },
      });
    } else if (automations.updateCrm !== false) {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          email: customer.email || dto.email || dto.customerEmail || undefined,
          notes: dto.notes ? `${customer.notes || ''}\n${dto.notes}`.trim() : customer.notes,
        },
      });
    }

    // Membership access check
    const membershipAccess = (bookingLink.membershipAccess as any)?.access || 'EVERYONE';
    if (membershipAccess !== 'EVERYONE' && membershipAccess !== 'STAFF_ONLY') {
      const memberships = await this.prisma.customerMembership.findMany({
        where: { customerId: customer.id },
        include: { tier: true },
      });
      if (membershipAccess === 'MEMBERS_ONLY' && memberships.length === 0) {
        throw new BadRequestException('This booking link is for members only');
      }
      if (['GOLD', 'SILVER', 'VIP'].includes(membershipAccess)) {
        const ok = memberships.some((m) =>
          (m.tier?.name || '').toUpperCase().includes(membershipAccess),
        );
        if (!ok) {
          throw new BadRequestException(`Requires ${membershipAccess} membership`);
        }
      }
    }

    // Membership discount
    let discount = 0;
    if (loyaltyCfg.membershipDiscount) {
      const memberships = await this.prisma.customerMembership.findMany({
        where: { customerId: customer.id },
        include: { tier: true },
      });
      const best = memberships.reduce(
        (max, m) => Math.max(max, m.tier?.discountPercent || 0),
        0,
      );
      discount = (service.price * best) / 100;
    }

    // Promo codes
    if (dto.promoCode && loyaltyCfg.couponSupport) {
      const codes = loyaltyCfg.promoCodes || [];
      if (codes.map((c: string) => c.toUpperCase()).includes(String(dto.promoCode).toUpperCase())) {
        discount += service.price * 0.1;
      }
    }

    const subtotal = Math.max(0, service.price - discount);
    const pay = this.calcPaymentAmount(subtotal, paymentCfg);

    // MANUAL approval stays BOOKED (awaiting staff confirm); AUTOMATIC becomes CONFIRMED
    const approvalStatus = rules.approvalMode === 'MANUAL' ? 'BOOKED' : 'CONFIRMED';

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        staffId,
        serviceId: service.id,
        serviceName: service.name,
        startTime,
        endTime,
        notes: dto.notes,
        status: approvalStatus as any,
        source: 'BOOKING_LINK',
        bookingLinkId: bookingLink.id,
        paymentStatus: pay.status,
        paymentAmount: pay.amount,
      },
      include: { customer: true, staff: true },
    });

    let invoice: any = null;
    if (automations.generateInvoice !== false && paymentCfg.mode !== 'NONE') {
      const count = await this.prisma.invoice.count({ where: { tenantId: tenant.id } });
      invoice = await this.prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          invoiceNumber: `INV-${String(count + 1).padStart(5, '0')}`,
          subtotal: service.price,
          discount,
          tax: 0,
          total: pay.amount,
          status: pay.mode === 'PAY_AT_STORE' || pay.mode === 'NONE' ? 'DRAFT' : 'PENDING',
          paymentMethod: dto.paymentMethod || (pay.mode === 'PAY_AT_STORE' ? 'CASH' : 'CARD'),
        },
      });
      await this.prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          serviceId: service.id,
          description: service.name,
          quantity: 1,
          unitPrice: service.price,
          total: service.price,
        },
      });
    }

    // Loyalty points
    let pointsEarned = 0;
    let currentBalance = customer.pointsBalance || 0;
    if (automations.addLoyaltyPoints !== false && loyaltyCfg.earnPoints !== false) {
      const config = await this.prisma.loyaltyConfig.findUnique({ where: { tenantId: tenant.id } });
      if (config) {
        pointsEarned =
          config.mode === 'VISIT_BASED'
            ? config.pointsPerVisit
            : Math.floor(subtotal / Math.max(config.currencyUnit, 0.01)) * config.pointsPerUnit;
        if (isNewCustomer && config.signupBonus) pointsEarned += config.signupBonus;
        if (pointsEarned > 0) {
          currentBalance += pointsEarned;
          await this.prisma.pointsLedger.create({
            data: {
              tenantId: tenant.id,
              customerId: customer.id,
              amount: pointsEarned,
              balanceAfter: currentBalance,
              reason: `Booking ${service.name}`,
            },
          });
          await this.prisma.customer.update({
            where: { id: customer.id },
            data: {
              pointsBalance: currentBalance,
              totalVisits: (customer.totalVisits || 0) + 1,
              lastVisitAt: new Date(),
            },
          });
          await this.prisma.activity.create({
            data: {
              tenantId: tenant.id,
              customerId: customer.id,
              type: 'POINTS_EARNED',
              message: `${pointsEarned} points earned — Booking ${service.name}`,
            },
          }).catch(() => undefined);
        }
      }
    }

    // Redeem points
    if (dto.redeemPoints && loyaltyCfg.redeemPoints && dto.redeemPoints > 0) {
      const redeem = Math.min(dto.redeemPoints, currentBalance);
      if (redeem > 0) {
        currentBalance -= redeem;
        await this.prisma.pointsLedger.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            amount: -redeem,
            balanceAfter: currentBalance,
            reason: 'Redeemed at booking',
          },
        });
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: { pointsBalance: currentBalance },
        });
        await this.prisma.activity.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            type: 'POINTS_REDEEMED',
            message: `${redeem} points redeemed at booking`,
          },
        }).catch(() => undefined);
      }
    }

    // Activity timeline
    if (automations.updateCrm !== false) {
      await this.prisma.activity.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          type: 'APPOINTMENT_BOOKED',
          message: `Booked ${service.name} via booking link ${bookingLink.slug}`,
          metadata: { appointmentId: appointment.id, bookingLinkId: bookingLink.id },
        },
      }).catch(() => undefined);
    }

    // Notifications
    try {
      if (automations.confirmationEmail !== false) {
        await this.notifications.createNotificationForAppointment(appointment, 'BOOKING_CONFIRMATION', 'EMAIL');
      }
      if (automations.confirmationWhatsApp !== false) {
        await this.notifications.createNotificationForAppointment(appointment, 'BOOKING_CONFIRMATION', 'WHATSAPP');
      }
      if (automations.confirmationSms) {
        await this.notifications.createNotificationForAppointment(appointment, 'BOOKING_CONFIRMATION', 'SMS');
      }
      if (automations.notifyStaff !== false || automations.notifyOwner !== false) {
        await this.notifications.createNotificationForAppointment(appointment, 'ADMIN_NEW_BOOKING', 'EMAIL');
      }
    } catch {
      // non-fatal
    }

    // Calendar event record — sync the appointment to the tenant's Google Calendar.
    try {
      await this.googleCalendar.syncAppointmentToCalendar(tenant.id, {
        id: appointment.id,
        tenantId: tenant.id,
        serviceName: service.name,
        startTime,
        endTime,
        notes: dto.notes,
        customer: customer
          ? { firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone }
          : null,
      });
    } catch {
      // Calendar sync must never block the booking flow.
    }

    // Update link metrics
    await this.prisma.bookingLink.update({
      where: { id: bookingLink.id },
      data: {
        bookingCount: (bookingLink.bookingCount ?? 0) + 1,
        revenueGenerated: (bookingLink.revenueGenerated ?? 0) + (pay.amount || 0),
        lastBookingAt: new Date(),
      },
    });

    // Webhook fire-and-forget
    const webhookUrl = bookingLink.webhookUrl || (bookingLink.branding as any)?.webhookUrl;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'booking.created',
          appointmentId: appointment.id,
          customerId: customer.id,
          serviceName: service.name,
          startTime: startTime.toISOString(),
        }),
      }).catch(() => undefined);
    }

    let paymentIntent: any = null;
    const needsOnlinePay =
      ['DEPOSIT', 'FULL', 'PARTIAL'].includes(pay.mode) &&
      dto.paymentMethod !== 'CASH' &&
      dto.paymentMethod !== 'PAY_AT_STORE' &&
      dto.paymentMethod !== 'UPI';

    if (needsOnlinePay) {
      paymentIntent = await this.createPaymentIntent(
        tenant.id,
        pay.amount,
        dto.paymentMethod,
        tenant.currency || 'INR',
        appointment.id,
      );
      if (paymentIntent?.failed) {
        // A real gateway was configured but refused the charge — surface it
        // instead of silently confirming an unpaid booking.
        throw new BadRequestException(paymentIntent.message || 'Online payment could not be initiated');
      }
    }

    return {
      id: appointment.id,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      serviceName: service.name,
      staffName: appointment.staff?.name || null,
      startsAt: appointment.startTime.toISOString(),
      endsAt: appointment.endTime.toISOString(),
      status: appointment.status,
      icsUrl: generateIcsUrl(appointment, tenant),
      googleCalendarUrl: generateGoogleCalendarUrl(appointment),
      confirmationMessage:
        bookingLink.confirmationMessage ||
        (bookingLink.branding as any)?.confirmationMessage ||
        'Your appointment has been booked successfully!',
      redirectUrl: bookingLink.redirectUrl || (bookingLink.branding as any)?.redirectUrl || null,
      paymentStatus: appointment.paymentStatus,
      paymentAmount: appointment.paymentAmount,
      invoiceId: invoice?.id || null,
      pointsEarned,
      isNewCustomer,
      paymentIntent,
    };
  }

  /**
   * Confirms an online booking payment. NEVER trusts client-declared status:
   * Stripe is verified by fetching the PaymentIntent from the API, Razorpay by
   * HMAC signature verification plus an independent payment fetch that checks
   * order linkage, capture status and exact amount.
   */
  async confirmPayment(
    tenantId: string,
    appointmentId: string,
    payment: { provider: 'STRIPE' | 'RAZORPAY'; paymentIntentId?: string; razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string },
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const expectedAmountPaise = Math.round(Number(appointment.paymentAmount || 0) * 100);
    if (expectedAmountPaise <= 0) {
      throw new BadRequestException('This appointment has no online payment due');
    }

    if (payment.provider === 'STRIPE') {
      if (!payment.paymentIntentId) throw new BadRequestException('paymentIntentId is required');

      const stripe = await this.stripeIntegration.getClient(tenantId, 'STRIPE');
      if (!stripe) throw new BadRequestException('Stripe is not connected');

      const intent = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
      const paidEnough =
        intent.status === 'succeeded' &&
        Number(intent.amount) >= expectedAmountPaise &&
        intent.metadata?.appointmentId === appointmentId;
      if (!paidEnough) {
        throw new BadRequestException(`Payment not completed (status: ${intent.status})`);
      }
    } else {
      if (!payment.razorpayOrderId || !payment.razorpayPaymentId || !payment.razorpaySignature) {
        throw new BadRequestException('Razorpay order id, payment id and signature are required');
      }

      const integration = await this.prisma.integration.findFirst({
        where: { tenantId, type: 'RAZORPAY', status: 'CONNECTED' },
        include: { tokens: true },
      });
      const raw = (integration?.tokens?.[0] as any) || {};
      const keySecret = raw.apiSecret;
      if (!keySecret) throw new BadRequestException('Razorpay is not connected');

      const crypto = await import('crypto');
      const expectedSig = crypto
        .createHmac('sha256', keySecret)
        .update(`${payment.razorpayOrderId}|${payment.razorpayPaymentId}`)
        .digest('hex');
      if (expectedSig !== payment.razorpaySignature) {
        throw new BadRequestException('Invalid payment signature');
      }

      // Independent verification against Razorpay's API.
      const client = await this.razorpayIntegration.getClient(tenantId);
      if (client) {
        const rpPayment = await client.payments.fetch(payment.razorpayPaymentId).catch(() => null);
        if (
          !rpPayment ||
          rpPayment.status !== 'captured' ||
          rpPayment.order_id !== payment.razorpayOrderId ||
          Number(rpPayment.amount) < expectedAmountPaise
        ) {
          throw new BadRequestException('Payment could not be verified with Razorpay');
        }
      }
    }

    await this.prisma.invoice.updateMany({
      where: {
        tenantId,
        customerId: appointment.customerId,
        status: 'PENDING',
        ...(appointment.paymentAmount != null ? { total: appointment.paymentAmount } : {}),
      },
      data: { status: 'PAID', paidAt: new Date() },
    });

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: 'PAID' },
    });
  }
}
