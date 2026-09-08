import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

export type ImportedGoogleReview = {
  googleReviewId: string;
  rating: number;
  body: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  googleAuthorUrl?: string | null;
  publishedAt: Date;
};

@Injectable()
export class GoogleReviewsService {
  private readonly logger = new Logger(GoogleReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    private readonly config: ConfigService,
  ) {}

  placesConfigured(): boolean {
    return Boolean(this.config.get<string>('GOOGLE_PLACES_API_KEY')?.trim());
  }

  async isBusinessProfileConnected(tenantId: string): Promise<boolean> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: 'GOOGLE_BUSINESS_PROFILE' } },
    });
    return integration?.status === 'CONNECTED';
  }

  async syncAvailability(tenantId: string): Promise<{
    available: boolean;
    method: 'places' | 'business_profile' | null;
    reason?: string;
  }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { available: false, method: null, reason: 'Business not found.' };

    const gbp = await this.isBusinessProfileConnected(tenantId);
    if (gbp) {
      return { available: true, method: 'business_profile' };
    }

    if (this.placesConfigured() && tenant.googlePlaceId?.trim()) {
      return { available: true, method: 'places' };
    }

    if (this.placesConfigured() && !tenant.googlePlaceId?.trim()) {
      return {
        available: false,
        method: null,
        reason: 'Add a Google Place ID in Business Profile to import Place reviews.',
      };
    }

    return {
      available: false,
      method: null,
      reason:
        'Google review import needs a connected Google Business Profile or a Places API key plus Place ID. Doloyal does not generate Google reviews.',
    };
  }

  async fetchReviews(tenantId: string): Promise<ImportedGoogleReview[]> {
    const availability = await this.syncAvailability(tenantId);
    if (!availability.available || !availability.method) {
      throw new BadRequestException(availability.reason || 'Google review import is not available.');
    }

    if (availability.method === 'business_profile') {
      return this.fetchFromBusinessProfile(tenantId);
    }
    return this.fetchFromPlaces(tenantId);
  }

  private async fetchFromPlaces(tenantId: string): Promise<ImportedGoogleReview[]> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const placeId = tenant?.googlePlaceId?.trim();
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY')?.trim();
    if (!placeId || !apiKey) {
      throw new BadRequestException('Google Places is not configured for this business.');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'reviews,name');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('reviews_sort', 'newest');

    const res = await fetch(url.toString());
    if (!res.ok) {
      this.logger.warn(`Places API HTTP ${res.status} for tenant ${tenantId}`);
      throw new BadRequestException('Google Places could not be reached. Try again later.');
    }
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      result?: {
        reviews?: Array<{
          author_name?: string;
          author_url?: string;
          profile_photo_url?: string;
          rating?: number;
          text?: string;
          time?: number;
        }>;
      };
    };

    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      this.logger.warn(`Places API status ${data.status}: ${data.error_message || ''}`);
      throw new BadRequestException(
        data.error_message || 'Google Places did not return reviews for this Place ID.',
      );
    }

    const reviews = data.result?.reviews ?? [];
    return reviews
      .filter((r) => typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5)
      .map((r) => {
        const publishedAt = r.time ? new Date(r.time * 1000) : new Date();
        const authorName = (r.author_name || 'Google user').trim();
        return {
          googleReviewId: `places:${placeId}:${r.time ?? 0}:${authorName}`,
          rating: Math.round(r.rating as number),
          body: (r.text || '').trim(),
          authorName,
          authorAvatarUrl: r.profile_photo_url || null,
          googleAuthorUrl: r.author_url || null,
          publishedAt,
        };
      });
  }

  private async fetchFromBusinessProfile(tenantId: string): Promise<ImportedGoogleReview[]> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_type: { tenantId, type: 'GOOGLE_BUSINESS_PROFILE' } },
    });
    if (!integration || integration.status !== 'CONNECTED') {
      throw new BadRequestException('Google Business Profile is not connected.');
    }

    const metadata = (integration.metadata || {}) as Record<string, unknown>;
    const locationName =
      (typeof metadata.locationName === 'string' && metadata.locationName) ||
      (typeof metadata.location === 'string' && metadata.location) ||
      '';
    if (!locationName) {
      throw new BadRequestException(
        'Google Business Profile is connected, but no location is selected. Save the location resource name on the integration, then sync again.',
      );
    }

    const accessToken = await this.integrations.getValidAccessToken(integration.id);
    const parent = locationName.replace(/^\/+/, '');
    const res = await fetch(`https://mybusiness.googleapis.com/v4/${parent}/reviews?pageSize=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`GBP reviews HTTP ${res.status}: ${text.slice(0, 300)}`);
      throw new BadRequestException(
        'Google Business Profile did not return reviews. Confirm the location and reconnect if needed.',
      );
    }

    const data = (await res.json()) as {
      reviews?: Array<{
        reviewId?: string;
        name?: string;
        starRating?: string;
        comment?: string;
        createTime?: string;
        reviewer?: { displayName?: string; profilePhotoUrl?: string };
      }>;
    };

    const starMap: Record<string, number> = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    };

    const imported: ImportedGoogleReview[] = [];
    for (const r of data.reviews ?? []) {
      const rating = starMap[String(r.starRating || '').toUpperCase()] || 0;
      const googleReviewId = r.reviewId || r.name;
      if (!googleReviewId || rating < 1) continue;
      imported.push({
        googleReviewId: `gbp:${googleReviewId}`,
        rating,
        body: (r.comment || '').trim(),
        authorName: (r.reviewer?.displayName || 'Google user').trim(),
        authorAvatarUrl: r.reviewer?.profilePhotoUrl || null,
        googleAuthorUrl: null,
        publishedAt: r.createTime ? new Date(r.createTime) : new Date(),
      });
    }
    return imported;
  }
}
