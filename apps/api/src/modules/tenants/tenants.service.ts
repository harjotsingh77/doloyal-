import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { mapModeToPrisma } from '../../common/helpers';

export interface OnboardLoyaltyInput {
  mode?: string;
  pointsPerCurrency?: number;
  pointsPerVisit?: number;
  currencyPerPoint?: number;
  expiryDays?: number;
}

export interface OnboardInput {
  name: string;
  slug?: string;
  category: string;
  phone?: string;
  email?: string;
  address?: string;
  gst?: string;
  logoUrl?: string;
  currency?: string;
  timezone?: string;
  brandColor?: string;
  loyalty?: OnboardLoyaltyInput;
  userId: string;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a business (tenant) from the onboarding flow.
   *
   * Idempotent: if the user already owns a tenant whose onboarding is complete,
   * we short-circuit and return that tenant instead of creating a duplicate —
   * this makes accidental double-submits and re-runs safe.
   */
  async onboard(data: OnboardInput) {
    // 1. Idempotency — user may already have completed onboarding.
    const existingMembership = await this.prisma.membership.findFirst({
      where: { userId: data.userId, role: 'OWNER' },
      include: { tenant: true },
    });
    if (existingMembership?.tenant?.onboardingComplete) {
      return existingMembership.tenant;
    }

    const baseSlug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Ensure slug uniqueness without hard-failing on a name collision.
    const slug = await this.uniqueSlug(baseSlug);

    // 2. Persist the full profile the form collected.
    const tenant = await this.prisma.tenant.create({
      data: {
        name: data.name,
        slug,
        category: data.category,
        phone: data.phone,
        email: data.email,
        address: data.address,
        gst: data.gst,
        logoUrl: data.logoUrl,
        currency: data.currency || 'INR',
        timezone: data.timezone || 'Asia/Kolkata',
        brandColor: data.brandColor || '#2563EB',
        onboardingComplete: true,
      },
    });

    // 3. Link the owner to the new tenant.
    await this.prisma.membership.create({
      data: {
        userId: data.userId,
        tenantId: tenant.id,
        role: 'OWNER',
      },
    });

    // 4. Loyalty config — use the values the owner chose, falling back to sane
    //    defaults if a field was omitted. Translate the shared mode enum into
    //    the Prisma LoyaltyMode enum.
    const loyalty = data.loyalty ?? {};
    await this.prisma.loyaltyConfig.create({
      data: {
        tenantId: tenant.id,
        mode: mapModeToPrisma(loyalty.mode ?? 'CURRENCY'),
        pointsPerUnit: this.coerceInt(loyalty.pointsPerCurrency, 1),
        currencyUnit: this.coerceNum(loyalty.currencyPerPoint, 1),
        pointsPerVisit: this.coerceInt(loyalty.pointsPerVisit, 10),
        expiryDays: this.coerceInt(loyalty.expiryDays, 365),
        signupBonus: 50,
        referralBonus: 100,
      },
    });

    // 5. Default subscription.
    await this.prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'professional',
        status: 'ACTIVE',
      },
    });

    return this.prisma.tenant.findUnique({
      where: { id: tenant.id },
    });
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base || 'business';
    let n = 1;
    // Loop until we find a slug that isn't taken.
    while (await this.prisma.tenant.findUnique({ where: { slug: candidate } })) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    return candidate;
  }

  private coerceInt(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.round(value as number)) : fallback;
  }

  private coerceNum(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) ? Math.max(0, value as number) : fallback;
  }

  async getById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        loyaltyConfig: true,
        subscriptions: true,
        _count: {
          select: {
            customers: true,
            staff: true,
            branches: true,
            appointments: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.mapTenant(tenant);
  }

  async update(id: string, data: Record<string, unknown>) {
    return this.updateSettings(id, data);
  }

  async updateSettings(id: string, data: Record<string, unknown> | object) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const source = data as Record<string, unknown>;
    const allowed = [
      'name', 'category', 'phone', 'email', 'website', 'address', 'city', 'state', 'zip',
      'country', 'currency', 'timezone', 'language', 'dateFormat', 'timeFormat',
      'brandColor', 'secondaryColor', 'accentColor', 'fontFamily', 'taxRate',
      'gst', 'registrationNumber', 'tagline', 'description', 'whatsapp', 'mapsUrl',
      'logoUrl', 'coverBannerUrl', 'faviconUrl', 'businessHours', 'socialLinks',
      'legalPolicies', 'businessStatus', 'notificationPrefs',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        updateData[key] = source[key];
      }
    }

    if (typeof updateData.website === 'string' && updateData.website === '') {
      updateData.website = null;
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    return this.mapTenant(updated);
  }

  async uploadImage(
    tenantId: string,
    buffer: Buffer,
    mimetype: string,
    filename: string,
    kind: string,
  ) {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowed.includes(mimetype) && !/\.(png|jpe?g|webp|svg|ico)$/i.test(filename)) {
      throw new BadRequestException('Unsupported image type');
    }
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Image must be under 2MB');
    }

    const field =
      kind === 'cover' ? 'coverBannerUrl' : kind === 'favicon' ? 'faviconUrl' : 'logoUrl';
    const dataUrl = `data:${mimetype};base64,${buffer.toString('base64')}`;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { [field]: dataUrl },
    });

    return {
      url: dataUrl,
      field,
      tenant: this.mapTenant(updated),
    };
  }

  private mergeJsonDefaults<T extends Record<string, unknown>>(
    value: unknown,
    defaults: T,
  ): T {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ...defaults };
    }
    return { ...defaults, ...(value as T) };
  }

  private mapTenant(tenant: any) {
    const businessHoursDefaults = {
      openingTime: '09:00',
      closingTime: '18:00',
      weeklyOff: ['Sunday'],
      breakStart: '',
      breakEnd: '',
    };
    const socialDefaults = {
      instagram: '',
      facebook: '',
      linkedin: '',
      youtube: '',
      googleBusiness: '',
      whatsapp: '',
    };
    const legalDefaults = {
      privacyPolicy: '',
      termsAndConditions: '',
      refundPolicy: '',
      cancellationPolicy: '',
    };
    const statusDefaults = {
      activeBusiness: true,
      onlineBooking: true,
      walkIns: true,
      showOnWebsite: true,
    };
    const notificationDefaults = {
      email: true,
      sms: true,
      whatsapp: true,
      marketingEmails: false,
    };

    return {
      id: tenant.id,
      name: tenant.name,
      category: tenant.category,
      phone: tenant.phone || '',
      email: tenant.email || '',
      website: tenant.website ?? null,
      address: tenant.address ?? null,
      gst: tenant.gst ?? null,
      registrationNumber: tenant.registrationNumber ?? null,
      logoUrl: tenant.logoUrl ?? null,
      coverBannerUrl: tenant.coverBannerUrl ?? null,
      faviconUrl: tenant.faviconUrl ?? null,
      tagline: tenant.tagline ?? null,
      description: tenant.description ?? null,
      whatsapp: tenant.whatsapp ?? null,
      mapsUrl: tenant.mapsUrl ?? null,
      currency: tenant.currency,
      timezone: tenant.timezone,
      language: tenant.language ?? 'en',
      dateFormat: tenant.dateFormat ?? 'DD/MM/YYYY',
      timeFormat: tenant.timeFormat ?? '12h',
      brandColor: tenant.brandColor || '#2563EB',
      secondaryColor: tenant.secondaryColor || '#64748B',
      accentColor: tenant.accentColor || '#F59E0B',
      fontFamily: tenant.fontFamily || 'Inter',
      taxRate: tenant.taxRate ?? 0,
      businessHours: this.mergeJsonDefaults(tenant.businessHours, businessHoursDefaults),
      socialLinks: this.mergeJsonDefaults(tenant.socialLinks, socialDefaults),
      legalPolicies: this.mergeJsonDefaults(tenant.legalPolicies, legalDefaults),
      businessStatus: this.mergeJsonDefaults(tenant.businessStatus, statusDefaults),
      notificationPrefs: this.mergeJsonDefaults(tenant.notificationPrefs, notificationDefaults),
      onboardingComplete: tenant.onboardingComplete,
      createdAt: tenant.createdAt?.toISOString?.() ?? tenant.createdAt,
      _count: tenant._count,
      loyaltyConfig: tenant.loyaltyConfig,
      subscriptions: tenant.subscriptions,
    };
  }

  async getStats(id: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalCustomers,
      todayAppointments,
      totalRevenue,
      activeRewards,
      pendingInvoices,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId: id } }),
      this.prisma.appointment.count({
        where: {
          tenantId: id,
          startTime: { gte: startOfDay },
          status: { in: ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId: id, status: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.reward.count({ where: { tenantId: id, status: 'ACTIVE' as any } }),
      this.prisma.invoice.count({
        where: { tenantId: id, status: 'PENDING' },
      }),
    ]);

    return {
      totalCustomers,
      todayAppointments,
      totalRevenue: totalRevenue._sum.total || 0,
      activeRewards,
      pendingInvoices,
    };
  }
}
