import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  DEFAULT_AUTOMATIONS,
  DEFAULT_AUTH_MODE,
  DEFAULT_BRANDING,
  DEFAULT_CUSTOMER_FIELDS,
  DEFAULT_LOYALTY,
  DEFAULT_MEMBERSHIP_ACCESS,
  DEFAULT_PAGE_CONFIG,
  DEFAULT_PAYMENT,
  DEFAULT_RULES,
  DEFAULT_SEO,
  asStringArray,
  bookingUrl,
  defaultDomain,
  mergeDefaults,
  qrCodeUrl,
  subdomainUrl,
} from './booking-defaults';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

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

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class BookingLinksService {
  constructor(private readonly prisma: PrismaService) {}

  private publicUrl(slug: string) {
    return bookingUrl(slug);
  }

  private enrichLink(link: any, staffMap: Map<string, string>, metrics?: any) {
    const staffIds = asStringArray(link.staffIds);
    if (link.staffId && !staffIds.includes(link.staffId)) staffIds.unshift(link.staffId);
    const staffNames = staffIds.map((id) => staffMap.get(id)).filter(Boolean) as string[];
    const url = this.publicUrl(link.slug);
    const visits = link.visitCount ?? 0;
    const bookings = link.bookingCount ?? 0;
    const revenue = link.revenueGenerated ?? 0;
    const domain = mergeDefaults(link.domain, defaultDomain(link.slug));
    const customDomain = (domain.customDomain || '').trim();
    const customDomainUrl = customDomain
      ? (customDomain.startsWith('http') ? customDomain : `https://${customDomain}`)
      : null;

    return {
      id: link.id,
      tenantId: link.tenantId,
      staffId: link.staffId,
      staffName: staffNames[0] ?? staffMap.get(link.staffId) ?? null,
      staffNames,
      slug: link.slug,
      type: link.type ?? 'PERSONAL',
      name: link.name,
      description: link.description,
      isActive: link.isActive,
      isPaused: link.isPaused ?? false,
      assignmentMode: link.assignmentMode ?? 'SINGLE',
      staffIds,
      serviceIds: asStringArray(link.serviceIds),
      customerFields: link.customerFields ?? DEFAULT_CUSTOMER_FIELDS,
      rules: link.rules ?? DEFAULT_RULES,
      payment: link.payment ?? DEFAULT_PAYMENT,
      loyalty: link.loyalty ?? DEFAULT_LOYALTY,
      membershipAccess: link.membershipAccess ?? DEFAULT_MEMBERSHIP_ACCESS,
      authMode: link.authMode ?? DEFAULT_AUTH_MODE,
      branding: mergeDefaults(link.branding, DEFAULT_BRANDING),
      automations: link.automations ?? DEFAULT_AUTOMATIONS,
      pageConfig: mergeDefaults(link.pageConfig, DEFAULT_PAGE_CONFIG),
      seo: mergeDefaults(link.seo, DEFAULT_SEO),
      domain,
      confirmationMessage: link.confirmationMessage,
      redirectUrl: link.redirectUrl,
      webhookUrl: link.webhookUrl,
      expiresAt: link.expiresAt?.toISOString?.() ?? link.expiresAt ?? null,
      visitCount: visits,
      bookingCount: bookings,
      revenueGenerated: revenue,
      lastBookingAt: link.lastBookingAt?.toISOString?.() ?? link.lastBookingAt ?? null,
      metaTitle: link.metaTitle,
      metaDescription: link.metaDescription,
      status: link.status ?? 'PUBLISHED',
      publishedAt: link.publishedAt?.toISOString?.() ?? link.publishedAt ?? null,
      url,
      subdomainUrl: subdomainUrl(link.slug),
      customDomainUrl,
      qrUrl: qrCodeUrl(url, (link.branding as any)?.qrColor || '#111827'),
      metrics: metrics ?? {
        totalVisits: visits,
        totalBookings: bookings,
        conversionRate: visits > 0 ? Math.round((bookings / visits) * 1000) / 10 : 0,
        revenueGenerated: revenue,
        totalCustomers: metrics?.totalCustomers ?? 0,
        upcomingAppointments: metrics?.upcomingAppointments ?? 0,
        averageBookingValue: bookings > 0 ? Math.round((revenue / bookings) * 100) / 100 : 0,
        lastBookingAt: link.lastBookingAt?.toISOString?.() ?? link.lastBookingAt ?? null,
      },
      createdAt: link.createdAt?.toISOString?.() ?? link.createdAt,
      updatedAt: link.updatedAt?.toISOString?.() ?? link.updatedAt,
    };
  }

  private async buildStaffMap(tenantId: string) {
    const staff = await this.prisma.staff.findMany({ where: { tenantId } });
    return new Map(staff.map((s) => [s.id, s.name]));
  }

  private async computeLinkMetrics(tenantId: string, linkId: string, link: any) {
    const now = new Date();
    const appointments = await this.prisma.appointment.findMany({
      where: { tenantId, bookingLinkId: linkId },
      select: {
        id: true,
        customerId: true,
        status: true,
        startTime: true,
        paymentAmount: true,
      },
    });
    const customerIds = new Set(appointments.map((a) => a.customerId));
    const upcoming = appointments.filter(
      (a) => a.startTime >= now && !['CANCELLED', 'NO_SHOW'].includes(a.status),
    ).length;
    const visits = link.visitCount ?? 0;
    const bookings = link.bookingCount ?? appointments.length;
    const revenue = link.revenueGenerated ?? 0;
    return {
      totalVisits: visits,
      totalBookings: bookings,
      conversionRate: visits > 0 ? Math.round((bookings / visits) * 1000) / 10 : 0,
      revenueGenerated: revenue,
      totalCustomers: customerIds.size,
      upcomingAppointments: upcoming,
      averageBookingValue: bookings > 0 ? Math.round((revenue / bookings) * 100) / 100 : 0,
      lastBookingAt: link.lastBookingAt?.toISOString?.() ?? link.lastBookingAt ?? null,
    };
  }

  async list(tenantId: string) {
    const links = await this.prisma.bookingLink.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const staffMap = await this.buildStaffMap(tenantId);
    const enriched = await Promise.all(
      links.map(async (link) => {
        const metrics = await this.computeLinkMetrics(tenantId, link.id, link);
        return this.enrichLink(link, staffMap, metrics);
      }),
    );
    return enriched;
  }

  async getById(tenantId: string, id: string) {
    const link = await this.prisma.bookingLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Booking link not found');
    const staffMap = await this.buildStaffMap(tenantId);
    const metrics = await this.computeLinkMetrics(tenantId, link.id, link);
    return this.enrichLink(link, staffMap, metrics);
  }

  private async resolveUniqueSlug(base: string, excludeId?: string) {
    let slug = base || `booking-${randomSuffix()}`;
    let existing = await this.prisma.bookingLink.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      slug = `${base}-${randomSuffix()}`;
      existing = await this.prisma.bookingLink.findUnique({ where: { slug } });
      if (existing && existing.id !== excludeId) {
        slug = `${base}-${Date.now().toString(36)}`;
      }
    }
    return slug;
  }

  async create(tenantId: string, dto: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const baseSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name || tenant.name);
    const slug = await this.resolveUniqueSlug(baseSlug);

    const staffIds = asStringArray(dto.staffIds);
    if (dto.staffId && !staffIds.includes(dto.staffId)) staffIds.push(dto.staffId);

    const link = await this.prisma.bookingLink.create({
      data: {
        tenantId,
        slug,
        name: dto.name,
        description: dto.description,
        type: dto.type ?? (dto.staffId ? 'PERSONAL' : 'COMPANY'),
        isActive: dto.isActive ?? true,
        isPaused: false,
        allowCustomTime: dto.allowCustomTime ?? true,
        staffId: dto.staffId || staffIds[0] || null,
        staffIds,
        assignmentMode: dto.assignmentMode ?? (staffIds.length > 1 ? 'MULTI' : 'SINGLE'),
        serviceIds: asStringArray(dto.serviceIds),
        customerFields: dto.customerFields ?? DEFAULT_CUSTOMER_FIELDS,
        rules: { ...DEFAULT_RULES, ...(dto.rules || {}) },
        payment: { ...DEFAULT_PAYMENT, ...(dto.payment || {}) },
        loyalty: { ...DEFAULT_LOYALTY, ...(dto.loyalty || {}) },
        membershipAccess: { ...DEFAULT_MEMBERSHIP_ACCESS, ...(dto.membershipAccess || {}) },
        authMode: { ...DEFAULT_AUTH_MODE, ...(dto.authMode || {}) },
        branding: { ...DEFAULT_BRANDING, ...(dto.branding || {}) },
        automations: { ...DEFAULT_AUTOMATIONS, ...(dto.automations || {}) },
        pageConfig: { ...DEFAULT_PAGE_CONFIG, ...(dto.pageConfig || {}) },
        seo: { ...DEFAULT_SEO, ...(dto.seo || {}) },
        domain: { ...defaultDomain(slug), ...(dto.domain || {}) },
        confirmationMessage: dto.confirmationMessage ?? DEFAULT_BRANDING.confirmationMessage,
        redirectUrl: dto.redirectUrl || null,
        webhookUrl: dto.webhookUrl || null,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        status: dto.status ?? 'PUBLISHED',
        publishedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      } as any,
    });

    const staffMap = await this.buildStaffMap(tenantId);
    return this.enrichLink(link, staffMap);
  }

  async update(tenantId: string, id: string, dto: any) {
    const link = await this.prisma.bookingLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Booking link not found');

    const data: any = {};
    const scalarKeys = [
      'name', 'description', 'type', 'isActive', 'isPaused', 'allowCustomTime',
      'staffId', 'assignmentMode', 'confirmationMessage', 'redirectUrl', 'webhookUrl',
      'metaTitle', 'metaDescription', 'status',
    ];
    for (const key of scalarKeys) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (dto.slug !== undefined) {
      const next = await this.resolveUniqueSlug(slugify(dto.slug), id);
      data.slug = next;
    }
    if (dto.staffIds !== undefined) data.staffIds = asStringArray(dto.staffIds);
    if (dto.serviceIds !== undefined) data.serviceIds = asStringArray(dto.serviceIds);
    if (dto.customerFields !== undefined) data.customerFields = dto.customerFields;
    if (dto.rules !== undefined) data.rules = { ...(link.rules as any), ...dto.rules };
    if (dto.payment !== undefined) data.payment = { ...(link.payment as any), ...dto.payment };
    if (dto.loyalty !== undefined) data.loyalty = { ...(link.loyalty as any), ...dto.loyalty };
    if (dto.membershipAccess !== undefined) data.membershipAccess = dto.membershipAccess;
    if (dto.authMode !== undefined) data.authMode = { ...(link.authMode as any), ...dto.authMode };
    if (dto.branding !== undefined) data.branding = { ...(link.branding as any), ...dto.branding };
    if (dto.automations !== undefined) data.automations = { ...(link.automations as any), ...dto.automations };
    if (dto.pageConfig !== undefined) data.pageConfig = { ...((link as any).pageConfig || {}), ...dto.pageConfig };
    if (dto.seo !== undefined) data.seo = { ...((link as any).seo || {}), ...dto.seo };
    if (dto.domain !== undefined) {
      data.domain = {
        ...defaultDomain(data.slug || link.slug),
        ...((link as any).domain || {}),
        ...dto.domain,
        status: dto.domain.status || (dto.domain.customDomain ? 'PENDING' : (link as any).domain?.status || 'PENDING'),
      };
    }
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.status === 'PUBLISHED' && (link as any).status !== 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    const updated = await this.prisma.bookingLink.update({ where: { id }, data: data as any });
    const staffMap = await this.buildStaffMap(tenantId);
    const metrics = await this.computeLinkMetrics(tenantId, id, updated);
    return this.enrichLink(updated, staffMap, metrics);
  }

  async getSettings(tenantId: string, id: string) {
    return this.getById(tenantId, id);
  }

  async updateSettings(tenantId: string, id: string, dto: any) {
    return this.update(tenantId, id, dto);
  }

  async duplicate(tenantId: string, id: string) {
    const link = await this.prisma.bookingLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Booking link not found');

    return this.create(tenantId, {
      name: `${link.name || 'Booking Link'} (Copy)`,
      description: link.description,
      type: link.type,
      staffId: link.staffId,
      staffIds: asStringArray(link.staffIds),
      assignmentMode: link.assignmentMode,
      serviceIds: asStringArray(link.serviceIds),
      customerFields: link.customerFields,
      rules: link.rules,
      payment: link.payment,
      loyalty: link.loyalty,
      membershipAccess: link.membershipAccess,
      authMode: link.authMode,
      branding: link.branding,
      automations: link.automations,
      pageConfig: (link as any).pageConfig,
      seo: (link as any).seo,
      domain: (link as any).domain,
      confirmationMessage: link.confirmationMessage,
      redirectUrl: link.redirectUrl,
      webhookUrl: link.webhookUrl,
      metaTitle: link.metaTitle,
      metaDescription: link.metaDescription,
      isActive: true,
      status: 'DRAFT',
    });
  }

  async getPage(tenantId: string, id: string) {
    return this.getById(tenantId, id);
  }

  async updatePage(tenantId: string, id: string, dto: any) {
    return this.update(tenantId, id, {
      pageConfig: dto.pageConfig,
      branding: dto.branding,
      seo: dto.seo,
      domain: dto.domain,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      name: dto.name,
      description: dto.description,
      status: dto.status ?? 'DRAFT',
    });
  }

  async publish(tenantId: string, id: string) {
    const link = await this.prisma.bookingLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Booking link not found');
    const updated = await this.prisma.bookingLink.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        isActive: true,
        domain: {
          ...defaultDomain(link.slug),
          ...((link as any).domain || {}),
          status: (link as any).domain?.customDomain ? 'PENDING' : ((link as any).domain?.status || 'PENDING'),
        },
      } as any,
    });
    const staffMap = await this.buildStaffMap(tenantId);
    const metrics = await this.computeLinkMetrics(tenantId, id, updated);
    return this.enrichLink(updated, staffMap, metrics);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const link = await this.prisma.bookingLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Booking link not found');
    await this.prisma.bookingLinkVisit.deleteMany({ where: { bookingLinkId: id } }).catch(() => undefined);
    await this.prisma.bookingLink.delete({ where: { id } });
  }

  async regenerate(tenantId: string, id: string) {
    const link = await this.prisma.bookingLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Booking link not found');
    const baseSlug = slugify(link.name ?? 'booking');
    const newSlug = await this.resolveUniqueSlug(baseSlug, id);
    const updated = await this.prisma.bookingLink.update({
      where: { id },
      data: { slug: newSlug },
    });
    const staffMap = await this.buildStaffMap(tenantId);
    return this.enrichLink(updated, staffMap);
  }

  assertLinkBookable(bookingLink: any) {
    if (!bookingLink.isActive) throw new BadRequestException('This booking link is inactive');
    if (bookingLink.isPaused) throw new BadRequestException('Bookings are temporarily paused');
    if (bookingLink.expiresAt && new Date(bookingLink.expiresAt) < new Date()) {
      throw new BadRequestException('This booking link has expired');
    }
  }

  checkRateLimit(key: string, limit = 20, windowMs = 60_000) {
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (bucket.count >= limit) {
      throw new BadRequestException('Too many requests. Please try again shortly.');
    }
    bucket.count += 1;
  }

  async findBySlug(slug: string) {
    const bookingLink = await this.prisma.bookingLink.findUnique({
      where: { slug },
      include: { tenant: true },
    });
    if (!bookingLink) throw new NotFoundException('Booking link not found');

    let staff = null;
    if (bookingLink.staffId) {
      staff = await this.prisma.staff.findUnique({ where: { id: bookingLink.staffId } });
    }

    return { tenant: bookingLink.tenant, staff, bookingLink };
  }

  async trackVisit(slug: string, meta: {
    source?: string;
    referrer?: string;
    userAgent?: string;
    ipHash?: string;
    sessionId?: string;
  }) {
    const { bookingLink, tenant } = await this.findBySlug(slug);
    await this.prisma.bookingLinkVisit.create({
      data: {
        bookingLinkId: bookingLink.id,
        tenantId: tenant.id,
        source: meta.source || 'direct',
        referrer: meta.referrer,
        userAgent: meta.userAgent,
        ipHash: meta.ipHash,
        sessionId: meta.sessionId,
      },
    });
    await this.prisma.bookingLink.update({
      where: { id: bookingLink.id },
      data: { visitCount: (bookingLink.visitCount ?? 0) + 1 },
    });
    return { ok: true };
  }

  async getPublicBusinessInfo(slug: string) {
    const { tenant, bookingLink } = await this.findBySlug(slug);

    if (!bookingLink.isActive) {
      throw new BadRequestException('This booking link is inactive');
    }
    if (bookingLink.expiresAt && new Date(bookingLink.expiresAt) < new Date()) {
      throw new BadRequestException('This booking link has expired');
    }

    const serviceIds = asStringArray(bookingLink.serviceIds);
    const services = await this.prisma.service.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        ...(serviceIds.length ? { id: { in: serviceIds } } : {}),
      },
    });

    const staffIds = asStringArray(bookingLink.staffIds);
    if (bookingLink.staffId && !staffIds.includes(bookingLink.staffId)) staffIds.push(bookingLink.staffId);

    const staffMembers = await this.prisma.staff.findMany({
      where: {
        tenantId: tenant.id,
        isAvailable: true,
        ...(staffIds.length && bookingLink.assignmentMode !== 'AUTO'
          ? { id: { in: staffIds } }
          : {}),
      },
    });

    const branding = mergeDefaults((bookingLink as any).branding, DEFAULT_BRANDING);
    const pageConfig = mergeDefaults((bookingLink as any).pageConfig, DEFAULT_PAGE_CONFIG);
    const seo = mergeDefaults((bookingLink as any).seo, DEFAULT_SEO);
    const domain = mergeDefaults((bookingLink as any).domain, defaultDomain(bookingLink.slug));
    const hours = (tenant as any).businessHours || null;
    const brandColor =
      branding.primaryColor || branding.themeColor || tenant.brandColor || '#2563EB';

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: branding.logoUrl || tenant.logoUrl,
      coverBannerUrl: branding.coverBannerUrl || tenant.coverBannerUrl || null,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      website: tenant.website,
      whatsapp: (tenant as any).whatsapp || tenant.phone,
      instagram: (tenant as any).instagram || (tenant as any).socialLinks?.instagram || null,
      facebook: (tenant as any).facebook || (tenant as any).socialLinks?.facebook || null,
      mapsUrl: (tenant as any).mapsUrl || null,
      brandColor,
      timezone: tenant.timezone,
      currency: tenant.currency,
      rating: 4.8,
      tagline: pageConfig.tagline || bookingLink.description || 'Book your next appointment online',
      about: pageConfig.about || bookingLink.description || null,
      businessHours: hours,
      pageConfig,
      seo,
      bookingLink: {
        id: bookingLink.id,
        slug: bookingLink.slug,
        name: bookingLink.name,
        description: bookingLink.description,
        allowCustomTime: bookingLink.allowCustomTime,
        defaultStaffId: bookingLink.staffId,
        assignmentMode: bookingLink.assignmentMode,
        customerFields: bookingLink.customerFields ?? DEFAULT_CUSTOMER_FIELDS,
        payment: bookingLink.payment ?? DEFAULT_PAYMENT,
        authMode: bookingLink.authMode ?? DEFAULT_AUTH_MODE,
        branding,
        membershipAccess: bookingLink.membershipAccess ?? DEFAULT_MEMBERSHIP_ACCESS,
        loyalty: bookingLink.loyalty ?? DEFAULT_LOYALTY,
        rules: bookingLink.rules ?? DEFAULT_RULES,
        pageConfig,
        seo,
        domain,
        isPaused: bookingLink.isPaused,
        status: (bookingLink as any).status ?? 'PUBLISHED',
        confirmationMessage: bookingLink.confirmationMessage || branding.confirmationMessage,
        redirectUrl: bookingLink.redirectUrl || branding.redirectUrl,
        metaTitle: bookingLink.metaTitle || `${tenant.name} — Book Online`,
        metaDescription: bookingLink.metaDescription || `Book an appointment with ${tenant.name}`,
      },
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        category: s.category,
        isActive: s.isActive,
      })),
      staff: staffMembers.map((s) => ({
        id: s.id,
        name: s.name,
        roleTitle: s.roleTitle,
        avatarUrl: s.avatarUrl,
        isAvailable: s.isAvailable,
      })),
    };
  }

  async getPublicServices(slug: string) {
    const info = await this.getPublicBusinessInfo(slug);
    return info.services;
  }

  async getPublicStaff(slug: string) {
    const info = await this.getPublicBusinessInfo(slug);
    return info.staff;
  }

  async getAvailableSlots(slug: string, date: string, serviceId: string, staffId?: string) {
    const { tenant, bookingLink } = await this.findBySlug(slug);
    this.assertLinkBookable(bookingLink);

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId: tenant.id },
    });
    if (!service) throw new NotFoundException('Service not found');

    const rules = { ...DEFAULT_RULES, ...((bookingLink.rules as any) || {}) };
    const dateObj = new Date(date);
    const now = new Date();

    const maxAdvance = rules.maxAdvanceBookingDays ?? 60;
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + maxAdvance);
    if (dateObj > maxDate) return [];

    const minNoticeMs = (rules.minNoticeMinutes ?? 60) * 60_000;
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const availability = await this.prisma.availabilityConfig.findUnique({
      where: { tenantId: tenant.id },
    });

    const blockDateStart = new Date(dateObj);
    blockDateStart.setHours(0, 0, 0, 0);
    const blockDateEnd = new Date(dateObj);
    blockDateEnd.setHours(23, 59, 59, 999);
    const blockDates = await this.prisma.blockedDate.findMany({
      where: { tenantId: tenant.id, date: { gte: blockDateStart, lte: blockDateEnd } },
    });
    if (blockDates.length > 0) return [];

    const linkHours = rules.businessHours?.[dayOfWeek];
    const defaultHours = { start: '09:00', end: '18:00', isAvailable: true };
    const dayConfig = linkHours || (availability ? (availability as any)[dayOfWeek] : null) || defaultHours;
    if (!dayConfig.isAvailable) return [];

    const slotInterval = availability?.slotIntervalMinutes || 30;
    const duration =
      rules.appointmentDurationMinutes || service.durationMinutes;
    const bufferBefore = rules.bufferBeforeMinutes ?? 0;
    const bufferAfter = rules.bufferAfterMinutes ?? 0;
    const maxPerSlot = rules.maxBookingsPerSlot ?? 1;
    const maxPerDay = rules.maxAppointmentsPerDay ?? 50;

    const dayStartFilter = new Date(dateObj);
    dayStartFilter.setHours(0, 0, 0, 0);
    const dayEndFilter = new Date(dateObj);
    dayEndFilter.setHours(23, 59, 59, 999);

    const dayAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startTime: { gte: dayStartFilter, lte: dayEndFilter },
        ...(staffId ? { staffId } : {}),
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true, endTime: true },
    });

    if (dayAppointments.length >= maxPerDay) return [];

    const [startHour, startMin] = String(dayConfig.start || '09:00').split(':').map(Number);
    const [endHour, endMin] = String(dayConfig.end || '18:00').split(':').map(Number);
    const dayStart = new Date(dateObj);
    dayStart.setHours(startHour, startMin, 0, 0);
    const dayEnd = new Date(dateObj);
    dayEnd.setHours(endHour, endMin, 0, 0);

    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;
    if (dayConfig.breakStart && dayConfig.breakEnd) {
      const [bsH, bsM] = String(dayConfig.breakStart).split(':').map(Number);
      const [beH, beM] = String(dayConfig.breakEnd).split(':').map(Number);
      breakStart = new Date(dateObj);
      breakStart.setHours(bsH, bsM, 0, 0);
      breakEnd = new Date(dateObj);
      breakEnd.setHours(beH, beM, 0, 0);
    }

    const slots: { time: string; endTime: string; available: boolean; staffId?: string | null }[] = [];
    const current = new Date(dayStart);

    while (current < dayEnd) {
      const slotStart = new Date(current);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      if (slotEnd > dayEnd) break;

      const bufferedStart = new Date(slotStart.getTime() - bufferBefore * 60000);
      const bufferedEnd = new Date(slotEnd.getTime() + bufferAfter * 60000);

      const tooSoon = slotStart.getTime() - now.getTime() < minNoticeMs;
      const inBreak =
        breakStart &&
        breakEnd &&
        slotStart < breakEnd &&
        slotEnd > breakStart;

      const overlapping = dayAppointments.filter((apt) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        return bufferedStart < aptEnd && bufferedEnd > aptStart;
      });

      const hh = String(slotStart.getHours()).padStart(2, '0');
      const mm = String(slotStart.getMinutes()).padStart(2, '0');

      slots.push({
        time: `${hh}:${mm}`,
        endTime: slotEnd.toISOString(),
        available: !tooSoon && !inBreak && overlapping.length < maxPerSlot,
        staffId: staffId || null,
      });

      current.setMinutes(current.getMinutes() + slotInterval);
    }

    return slots;
  }

  async pickStaff(bookingLink: any, preferredStaffId?: string, tenantId?: string) {
    if (preferredStaffId) return preferredStaffId;
    if (bookingLink.staffId && bookingLink.assignmentMode === 'SINGLE') return bookingLink.staffId;

    const staffIds = asStringArray(bookingLink.staffIds);
    if (bookingLink.staffId && !staffIds.includes(bookingLink.staffId)) staffIds.push(bookingLink.staffId);

    if (!staffIds.length) {
      const any = await this.prisma.staff.findFirst({
        where: { tenantId: tenantId || bookingLink.tenantId, isAvailable: true },
      });
      return any?.id || null;
    }

    if (bookingLink.assignmentMode === 'ROUND_ROBIN') {
      const idx = bookingLink.roundRobinIndex % staffIds.length;
      await this.prisma.bookingLink.update({
        where: { id: bookingLink.id },
        data: { roundRobinIndex: (bookingLink.roundRobinIndex + 1) % Math.max(staffIds.length, 1) },
      });
      return staffIds[idx];
    }

    if (bookingLink.assignmentMode === 'AUTO' || bookingLink.assignmentMode === 'MULTI') {
      // pick staff with fewest upcoming appointments
      const now = new Date();
      let bestId = staffIds[0];
      let bestCount = Number.MAX_SAFE_INTEGER;
      for (const id of staffIds) {
        const count = await this.prisma.appointment.count({
          where: {
            staffId: id,
            startTime: { gte: now },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        });
        if (count < bestCount) {
          bestCount = count;
          bestId = id;
        }
      }
      return bestId;
    }

    return staffIds[0] || null;
  }

  /** Legacy public booking — orchestrator preferred */
  async createPublicBooking(slug: string, dto: any) {
    const { tenant, bookingLink } = await this.findBySlug(slug);
    this.assertLinkBookable(bookingLink);
    this.checkRateLimit(`book:${slug}`);

    if (dto.honeypot) throw new BadRequestException('Invalid request');

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, tenantId: tenant.id },
    });
    if (!service) throw new NotFoundException('Service not found');

    const rules = { ...DEFAULT_RULES, ...((bookingLink.rules as any) || {}) };
    const startTime = new Date(dto.startTime);
    const duration = rules.appointmentDurationMinutes || service.durationMinutes;
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const staffId = await this.pickStaff(bookingLink, dto.staffId, tenant.id);

    const customerName = dto.customerName || `${dto.firstName || ''} ${dto.lastName || ''}`.trim();
    const nameParts = customerName.trim().split(/\s+/);
    const firstName = dto.firstName || nameParts[0] || customerName;
    const lastName = dto.lastName || nameParts.slice(1).join(' ') || '';

    let customer = await this.prisma.customer.findFirst({
      where: { tenantId: tenant.id, phone: dto.customerPhone || dto.phone },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          tenantId: tenant.id,
          firstName,
          lastName,
          phone: dto.customerPhone || dto.phone,
          email: dto.customerEmail || dto.email || null,
          notes: dto.notes,
          dob: dto.birthday ? new Date(dto.birthday) : undefined,
        },
      });
    }

    const approval = rules.approvalMode === 'MANUAL' ? 'BOOKED' : 'CONFIRMED';

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
        status: approval as any,
        source: 'BOOKING_LINK',
        bookingLinkId: bookingLink.id,
        paymentStatus: 'PENDING',
        paymentAmount: service.price,
      },
      include: { customer: true, staff: true },
    });

    await this.prisma.bookingLink.update({
      where: { id: bookingLink.id },
      data: {
        bookingCount: (bookingLink.bookingCount ?? 0) + 1,
        lastBookingAt: new Date(),
      },
    });

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
    };
  }

  async getBookingConfirmation(slug: string, bookingId: string) {
    const { tenant } = await this.findBySlug(slug);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: bookingId, tenantId: tenant.id },
      include: { customer: true, staff: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return {
      id: appointment.id,
      customerId: appointment.customerId,
      customerName: `${appointment.customer.firstName} ${appointment.customer.lastName}`.trim(),
      serviceName: appointment.serviceName,
      staffName: appointment.staff?.name || null,
      startsAt: appointment.startTime.toISOString(),
      endsAt: appointment.endTime.toISOString(),
      status: appointment.status,
      notes: appointment.notes,
      icsUrl: generateIcsUrl(appointment, tenant),
      googleCalendarUrl: generateGoogleCalendarUrl(appointment),
      paymentStatus: appointment.paymentStatus,
      paymentAmount: appointment.paymentAmount,
    };
  }

  async getLinkAnalytics(tenantId: string, id: string, from?: string, to?: string) {
    const link = await this.prisma.bookingLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Booking link not found');

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const visits = await this.prisma.bookingLinkVisit.findMany({
      where: { bookingLinkId: id, createdAt: { gte: fromDate, lte: toDate } },
    });
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        bookingLinkId: id,
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: { staff: true },
    });

    const uniqueSessions = new Set(visits.map((v) => v.sessionId || v.ipHash || v.id));
    const customerIds = appointments.map((a) => a.customerId);
    const uniqueCustomers = new Set(customerIds);
    const repeat = customerIds.length - uniqueCustomers.size;

    const sourceMap = new Map<string, number>();
    for (const v of visits) {
      const s = v.source || 'direct';
      sourceMap.set(s, (sourceMap.get(s) || 0) + 1);
    }

    const serviceMap = new Map<string, { count: number; revenue: number }>();
    for (const a of appointments) {
      const cur = serviceMap.get(a.serviceName) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += a.paymentAmount || 0;
      serviceMap.set(a.serviceName, cur);
    }

    const staffMap = new Map<string, { id: string; name: string; count: number; revenue: number }>();
    for (const a of appointments) {
      if (!a.staffId) continue;
      const cur = staffMap.get(a.staffId) || {
        id: a.staffId,
        name: a.staff?.name || 'Staff',
        count: 0,
        revenue: 0,
      };
      cur.count += 1;
      cur.revenue += a.paymentAmount || 0;
      staffMap.set(a.staffId, cur);
    }

    const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
    const rescheduled = appointments.filter((a) => !!a.rescheduledFrom).length;
    const revenue = appointments.reduce((s, a) => s + (a.paymentAmount || 0), 0);
    const bookings = appointments.length;
    const visitCount = visits.length || link.visitCount || 0;

    const peakHours = new Map<number, number>();
    for (const a of appointments) {
      const h = new Date(a.startTime).getHours();
      peakHours.set(h, (peakHours.get(h) || 0) + 1);
    }
    const peakHour = [...peakHours.entries()].sort((a, b) => b[1] - a[1])[0];

    const insights: { title: string; body: string; severity: 'info' | 'warning' | 'success' }[] = [];
    if (peakHour && peakHour[0] >= 18) {
      insights.push({
        title: 'Evening demand is high',
        body: `Most bookings happen after ${peakHour[0]}:00. Consider adding more staff in the evening.`,
        severity: 'info',
      });
    }
    if (cancelled / Math.max(bookings, 1) > 0.15) {
      insights.push({
        title: 'High cancellation rate detected',
        body: 'Recommend requiring a deposit to reduce no-shows and cancellations.',
        severity: 'warning',
      });
    }
    const topServices = [...serviceMap.entries()].sort((a, b) => b[1].count - a[1].count);
    if (topServices.length >= 2) {
      insights.push({
        title: 'Combo offer opportunity',
        body: `Customers frequently book ${topServices[0][0]}. Suggest bundling with ${topServices[1][0]}.`,
        severity: 'success',
      });
    }
    if (visitCount > 20 && bookings / visitCount < 0.1) {
      insights.push({
        title: 'Low conversion rate',
        body: 'Many visitors are not booking. Simplify the form or enable guest checkout.',
        severity: 'warning',
      });
    }

    return {
      linkId: id,
      visits: visitCount,
      uniqueVisitors: uniqueSessions.size || visitCount,
      bookings,
      conversionRate: visitCount > 0 ? Math.round((bookings / visitCount) * 1000) / 10 : 0,
      revenue,
      averageBookingValue: bookings > 0 ? Math.round((revenue / bookings) * 100) / 100 : 0,
      topServices: topServices.slice(0, 5).map(([name, v]) => ({ name, ...v })),
      topStaff: [...staffMap.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      repeatCustomers: Math.max(0, repeat),
      newCustomers: uniqueCustomers.size,
      cancelledBookings: cancelled,
      rescheduledBookings: rescheduled,
      trafficSources: [...sourceMap.entries()].map(([source, count]) => ({ source, count })),
      insights,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    };
  }

  async getAvailability(tenantId: string) {
    let config = await this.prisma.availabilityConfig.findUnique({ where: { tenantId } });
    if (!config) {
      config = await this.prisma.availabilityConfig.create({ data: { tenantId } });
    }
    return config;
  }

  async updateAvailability(tenantId: string, dto: any) {
    let config = await this.prisma.availabilityConfig.findUnique({ where: { tenantId } });
    if (!config) {
      config = await this.prisma.availabilityConfig.create({ data: { tenantId, ...dto } });
    } else {
      config = await this.prisma.availabilityConfig.update({ where: { id: config.id }, data: dto });
    }
    return config;
  }

  async addBlockDate(tenantId: string, dto: { date: string; reason?: string }) {
    return this.prisma.blockedDate.create({
      data: { tenantId, date: new Date(dto.date), reason: dto.reason },
    });
  }

  async removeBlockDate(tenantId: string, id: string): Promise<void> {
    const block = await this.prisma.blockedDate.findFirst({ where: { id, tenantId } });
    if (!block) throw new NotFoundException('Blocked date not found');
    await this.prisma.blockedDate.delete({ where: { id } });
  }

  async listBlockDates(tenantId: string) {
    return this.prisma.blockedDate.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
    });
  }

  async getWidgetSettings(tenantId: string) {
    let settings = await this.prisma.widgetSettings.findUnique({ where: { tenantId } });
    if (!settings) {
      settings = await this.prisma.widgetSettings.create({ data: { tenantId } });
    }
    return settings;
  }

  async updateWidgetSettings(tenantId: string, dto: any) {
    let settings = await this.prisma.widgetSettings.findUnique({ where: { tenantId } });
    if (!settings) {
      settings = await this.prisma.widgetSettings.create({ data: { tenantId, ...dto } });
    } else {
      settings = await this.prisma.widgetSettings.update({ where: { id: settings.id }, data: dto });
    }
    return settings;
  }

  async getWidgetEmbed(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const settings = await this.getWidgetSettings(tenantId);
    const bookingLinks = await this.prisma.bookingLink.findMany({
      where: { tenantId, isActive: true },
      take: 1,
    });
    const slug = bookingLinks[0]?.slug || tenant.slug;
    const script = `<script src="https://doloyal.ai/widget.js" data-slug="${slug}" data-primary-color="${settings.primaryColor}" data-font="${settings.fontFamily}"></script>`;
    return {
      embedCode: script,
      iframeCode: `<iframe src="${bookingUrl(slug)}" width="100%" height="600" frameborder="0" style="border-radius:${settings.borderRadius};"></iframe>`,
      widgetUrl: bookingUrl(slug),
      slug,
    };
  }

  async getAppointmentDetail(tenantId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: { customer: true, staff: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async updateAppointment(tenantId: string, id: string, dto: any) {
    const appointment = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    const updateData: any = {};
    if (dto.customerId) updateData.customerId = dto.customerId;
    if (dto.staffId !== undefined) updateData.staffId = dto.staffId;
    if (dto.serviceName) updateData.serviceName = dto.serviceName;
    if (dto.startTime) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime) updateData.endTime = new Date(dto.endTime);
    if (dto.status) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.paymentStatus) updateData.paymentStatus = dto.paymentStatus;
    return this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { customer: true, staff: true },
    });
  }

  async deleteAppointment(tenantId: string, id: string): Promise<void> {
    const appointment = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }
}
