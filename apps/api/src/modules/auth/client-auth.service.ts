import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { AuthUser, ClientSignInPublicConfig } from '@doloyal/shared';
import { resolveClientSignInPublicConfig } from '@doloyal/shared';
import { PrismaService } from '../../common/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { AuthService, type LoginMeta } from './auth.service';

export function normalizePhone(phone: string): string {
  return String(phone || '').trim();
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function hasPhone(phone?: string | null): boolean {
  return !!phone && isValidPhone(phone);
}

@Injectable()
export class ClientAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly customers: CustomersService,
    private readonly auth: AuthService,
  ) {}

  async resolveBusiness(slug: string) {
    const key = String(slug || '').trim().toLowerCase();
    if (!key) throw new NotFoundException('Business not found');

    const link = await this.prisma.bookingLink.findFirst({
      where: { slug: key },
      include: { tenant: true },
    });
    if (link?.tenant) {
      return { tenant: link.tenant, slug: link.slug };
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { slug: key } });
    if (!tenant) throw new NotFoundException('Business not found');

    const companyLink =
      (await this.prisma.bookingLink.findFirst({
        where: { tenantId: tenant.id, type: 'COMPANY' },
      })) ||
      (await this.prisma.bookingLink.findFirst({
        where: { tenantId: tenant.id },
      }));

    return { tenant, slug: companyLink?.slug || tenant.slug };
  }

  publicSignInConfig(tenant: {
    id: string;
    name: string;
    logoUrl: string | null;
    brandColor?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    accentColor?: string | null;
    clientSignInBranding: unknown;
  }, slug: string): ClientSignInPublicConfig {
    return resolveClientSignInPublicConfig({
      slug,
      tenantId: tenant.id,
      businessName: tenant.name,
      logoUrl: tenant.logoUrl,
      branding: tenant.clientSignInBranding as Record<string, unknown> | null,
      brand: {
        primaryColor: tenant.brandColor,
        backgroundColor: tenant.backgroundColor,
        textColor: tenant.textColor,
        accentColor: tenant.accentColor,
      },
    });
  }

  async getPublicConfig(slug: string): Promise<ClientSignInPublicConfig> {
    const { tenant, slug: resolved } = await this.resolveBusiness(slug);
    return this.publicSignInConfig(tenant, resolved);
  }

  async signUp(data: {
    tenantSlug: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
  }, meta?: LoginMeta) {
    const phone = normalizePhone(data.phone);
    if (!isValidPhone(phone)) {
      throw new BadRequestException('Enter a valid phone number.');
    }
    const email = String(data.email || '').trim().toLowerCase();
    if (!email) throw new BadRequestException('Email is required');
    if (!data.password || data.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const { tenant, slug } = await this.resolveBusiness(data.tenantSlug);
    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered. Sign in instead.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: data.firstName.trim() || 'Customer',
        lastName: data.lastName.trim(),
        phone,
        password: hashedPassword,
      },
      include: { memberships: true },
    });

    const customer = await this.customers.ensureLinkedClient({
      tenantId: tenant.id,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone,
      avatarUrl: user.avatarUrl,
      source: 'CLIENT_PAGE',
    });

    return this.issueCustomerSession(user, tenant.id, slug, customer.id, meta);
  }

  async login(email: string, password: string, tenantSlug: string, meta?: LoginMeta) {
    const { tenant, slug } = await this.resolveBusiness(tenantSlug);
    const user = await this.prisma.user.findUnique({
      where: { email: String(email || '').trim().toLowerCase() },
      include: { memberships: true },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!hasPhone(user.phone)) {
      return this.issueCustomerSession(user, tenant.id, slug, null, meta, true);
    }

    const customer = await this.customers.ensureLinkedClient({
      tenantId: tenant.id,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone!,
      avatarUrl: user.avatarUrl,
      source: 'CLIENT_PAGE',
    });

    return this.issueCustomerSession(user, tenant.id, slug, customer.id, meta);
  }

  async googleLogin(
    googleProfile: { id: string; email: string; firstName: string; lastName: string; avatarUrl?: string },
    tenantSlug: string,
    meta?: LoginMeta,
  ) {
    const { tenant, slug } = await this.resolveBusiness(tenantSlug);
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleProfile.id }, { email: googleProfile.email }] },
      include: { memberships: true },
    });

    if (user) {
      const updateData: Record<string, unknown> = {};
      if (!user.googleId) updateData.googleId = googleProfile.id;
      if (googleProfile.avatarUrl && googleProfile.avatarUrl !== user.avatarUrl) {
        updateData.avatarUrl = googleProfile.avatarUrl;
      }
      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { memberships: true },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: googleProfile.email,
          firstName: googleProfile.firstName,
          lastName: googleProfile.lastName,
          avatarUrl: googleProfile.avatarUrl,
          googleId: googleProfile.id,
        },
        include: { memberships: true },
      });
    }

    if (!hasPhone(user!.phone)) {
      return this.issueCustomerSession(user!, tenant.id, slug, null, meta, true);
    }

    const customer = await this.customers.ensureLinkedClient({
      tenantId: tenant.id,
      userId: user!.id,
      firstName: user!.firstName,
      lastName: user!.lastName,
      email: user!.email,
      phone: user!.phone!,
      avatarUrl: user!.avatarUrl,
      source: 'CLIENT_PAGE',
    });

    return this.issueCustomerSession(user!, tenant.id, slug, customer.id, meta);
  }

  async completePhone(userId: string, tenantId: string, slug: string, phone: string, meta?: LoginMeta) {
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      throw new BadRequestException('Enter a valid phone number.');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { phone: normalized },
      include: { memberships: true },
    });

    const customer = await this.customers.ensureLinkedClient({
      tenantId,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: normalized,
      avatarUrl: user.avatarUrl,
      source: 'CLIENT_PAGE',
    });

    return this.issueCustomerSession(user, tenantId, slug, customer.id, meta);
  }

  async issueCustomerSession(
    user: any,
    tenantId: string,
    slug: string,
    customerId: string | null,
    meta?: LoginMeta,
    forceNeedsPhone = false,
  ) {
    const needsPhone = forceNeedsPhone || !hasPhone(user.phone);
    const payload = {
      sub: user.id,
      email: user.email,
      tv: user.tokenVersion ?? 0,
      kind: 'customer' as const,
      tid: tenantId,
      slug,
    };
    const token = this.jwtService.sign(payload);

    if (customerId) {
      await this.customers.touchClientLogin(tenantId, customerId);
    }

    await this.auth.touchSession(user.id, {
      id: `client-${tenantId}-${Date.now()}`,
      device: meta?.userAgent ? String(meta.userAgent).slice(0, 80) : 'Client Page',
      ip: meta?.ip,
      token,
    });

    return {
      token,
      user: this.mapCustomerUser(user, tenantId, slug, customerId, needsPhone),
      needsPhone,
    };
  }

  mapCustomerUser(
    user: any,
    tenantId: string,
    slug: string,
    customerId: string | null,
    needsPhone: boolean,
  ): AuthUser {
    return {
      id: user.id,
      externalId: user.googleId || user.clerkId || user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      isAdmin: false,
      adminRole: null,
      adminPermissions: [],
      memberships: [],
      activeTenantId: tenantId,
      activeRole: 'CUSTOMER',
      sessionKind: 'customer',
      customerId,
      needsPhone,
      clientSlug: slug,
    };
  }
}
