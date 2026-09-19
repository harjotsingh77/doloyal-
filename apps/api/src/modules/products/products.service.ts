import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CommerceRealtimeService } from '../../common/commerce-realtime.service';
import {
  copyProductImage,
  deleteProductImage,
  isProductImageMime,
  isStoredProductKey,
  mimeFromProductKey,
  openProductMedia,
  PRODUCT_IMAGE_MAX_BYTES,
  productImageExt,
  resolveProductImageUrl,
  saveProductImage,
} from './product-media';

type StockFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
type SortKey = 'name' | 'sku' | 'category' | 'price' | 'stock' | 'status' | 'updatedAt';

function stockStatus(product: {
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  stockQuantity: number;
  lowStockThreshold: number;
}): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (product.availability === 'OUT_OF_STOCK' || product.stockQuantity <= 0) return 'OUT_OF_STOCK';
  if (product.stockQuantity <= product.lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: CommerceRealtimeService,
  ) {}

  private mapCategory(row: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapProduct(row: {
    id: string;
    tenantId: string;
    name: string;
    sku: string;
    description: string | null;
    categoryId: string | null;
    price: number;
    originalPrice: number | null;
    discount: number | null;
    stockQuantity: number;
    lowStockThreshold: number;
    unit: string | null;
    brand: string | null;
    productCode: string | null;
    imageUrl: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    availability: 'IN_STOCK' | 'OUT_OF_STOCK';
    createdAt: Date;
    updatedAt: Date;
    category?: { name: string } | null;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      sku: row.sku,
      description: row.description,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      price: row.price,
      originalPrice: row.originalPrice,
      discount: row.discount,
      stockQuantity: row.stockQuantity,
      lowStockThreshold: row.lowStockThreshold,
      unit: row.unit,
      brand: row.brand,
      productCode: row.productCode,
      imageUrl: resolveProductImageUrl(row),
      status: row.status,
      availability: row.availability,
      stockStatus: stockStatus(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async summary(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: {
        status: true,
        availability: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
    });
    let active = 0;
    let lowStock = 0;
    let outOfStock = 0;
    for (const p of products) {
      if (p.status === 'ACTIVE') active += 1;
      const status = stockStatus(p);
      if (status === 'LOW_STOCK') lowStock += 1;
      if (status === 'OUT_OF_STOCK') outOfStock += 1;
    }
    return { total: products.length, active, lowStock, outOfStock };
  }

  async listCategories(tenantId: string) {
    const rows = await this.prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.mapCategory(row));
  }

  async createCategory(
    tenantId: string,
    dto: { name: string; description?: string },
  ) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Category name is required');
    try {
      const row = await this.prisma.productCategory.create({
        data: {
          tenantId,
          name,
          description: dto.description?.trim() || null,
        },
      });
      return this.mapCategory(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A category with this name already exists');
      }
      throw err;
    }
  }

  async list(
    tenantId: string,
    query: {
      search?: string;
      categoryId?: string;
      status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
      stock?: StockFilter;
      sort?: SortKey;
      order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.limit || 20));
    const where: Prisma.ProductWhereInput = { tenantId };

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { productCode: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status && query.status !== 'ALL') where.status = query.status;

    const order: Prisma.SortOrder = query.order === 'asc' ? 'asc' : 'desc';
    const sort = query.sort || 'updatedAt';
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === 'name'
        ? { name: order }
        : sort === 'sku'
          ? { sku: order }
          : sort === 'price'
            ? { price: order }
            : sort === 'stock'
              ? { stockQuantity: order }
              : sort === 'status'
                ? { status: order }
                : sort === 'category'
                  ? { category: { name: order } }
                  : { updatedAt: order };

    const rows = await this.prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy,
    });

    let items = rows.map((row) => this.mapProduct(row));
    if (query.stock && query.stock !== 'ALL') {
      items = items.filter((item) => item.stockStatus === query.stock);
    }

    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return {
      items: paged,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      nextCursor: null as string | null,
    };
  }

  async getById(tenantId: string, id: string) {
    const row = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Product not found');
    return this.mapProduct(row);
  }

  private normalizeSku(sku: string) {
    return sku.trim().toUpperCase();
  }

  async create(
    tenantId: string,
    dto: {
      name: string;
      sku: string;
      description?: string | null;
      categoryId?: string | null;
      price: number;
      originalPrice?: number | null;
      discount?: number | null;
      stockQuantity?: number;
      lowStockThreshold?: number;
      unit?: string | null;
      brand?: string | null;
      productCode?: string | null;
      imageUrl?: string | null;
      status?: 'ACTIVE' | 'INACTIVE';
      availability?: 'IN_STOCK' | 'OUT_OF_STOCK';
    },
  ) {
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) throw new BadRequestException('Category not found');
    }
    try {
      const row = await this.prisma.product.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          sku: this.normalizeSku(dto.sku),
          description: dto.description?.trim() || null,
          categoryId: dto.categoryId || null,
          price: dto.price,
          originalPrice: dto.originalPrice ?? null,
          discount: dto.discount ?? null,
          stockQuantity: dto.stockQuantity ?? 0,
          lowStockThreshold: dto.lowStockThreshold ?? 5,
          unit: dto.unit?.trim() || null,
          brand: dto.brand?.trim() || null,
          productCode: dto.productCode?.trim() || null,
          imageUrl: await this.persistIncomingImage(tenantId, null, dto.imageUrl),
          status: dto.status ?? 'ACTIVE',
          availability: dto.availability ?? 'IN_STOCK',
        },
        include: { category: { select: { name: true } } },
      });
      return this.afterProductChange(this.mapProduct(row));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A product with this SKU already exists');
      }
      throw err;
    }
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<{
      name: string;
      sku: string;
      description: string | null;
      categoryId: string | null;
      price: number;
      originalPrice: number | null;
      discount: number | null;
      stockQuantity: number;
      lowStockThreshold: number;
      unit: string | null;
      brand: string | null;
      productCode: string | null;
      imageUrl: string | null;
      status: 'ACTIVE' | 'INACTIVE';
      availability: 'IN_STOCK' | 'OUT_OF_STOCK';
    }>,
  ) {
    const current = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundException('Product not found');
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) throw new BadRequestException('Category not found');
    }
    const nextImageUrl =
      dto.imageUrl !== undefined
        ? await this.persistIncomingImage(tenantId, current.imageUrl, dto.imageUrl)
        : undefined;
    try {
      const row = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name != null ? { name: dto.name.trim() } : {}),
          ...(dto.sku != null ? { sku: this.normalizeSku(dto.sku) } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId || null } : {}),
          ...(dto.price != null ? { price: dto.price } : {}),
          ...(dto.originalPrice !== undefined ? { originalPrice: dto.originalPrice } : {}),
          ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
          ...(dto.stockQuantity != null ? { stockQuantity: dto.stockQuantity } : {}),
          ...(dto.lowStockThreshold != null ? { lowStockThreshold: dto.lowStockThreshold } : {}),
          ...(dto.unit !== undefined ? { unit: dto.unit?.trim() || null } : {}),
          ...(dto.brand !== undefined ? { brand: dto.brand?.trim() || null } : {}),
          ...(dto.productCode !== undefined ? { productCode: dto.productCode?.trim() || null } : {}),
          ...(nextImageUrl !== undefined ? { imageUrl: nextImageUrl } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.availability ? { availability: dto.availability } : {}),
        },
        include: { category: { select: { name: true } } },
      });
      return this.afterProductChange(this.mapProduct(row));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A product with this SKU already exists');
      }
      throw err;
    }
  }

  async duplicate(tenantId: string, id: string) {
    const source = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!source) throw new NotFoundException('Product not found');
    const baseSku = this.normalizeSku(source.sku).replace(/-COPY(-\d+)?$/, '');
    let sku = `${baseSku}-COPY`;
    let n = 2;
    while (await this.prisma.product.findFirst({ where: { tenantId, sku } })) {
      sku = `${baseSku}-COPY-${n}`;
      n += 1;
    }
    const row = await this.prisma.product.create({
      data: {
        tenantId,
        name: source.name.endsWith(' (Copy)') ? source.name : `${source.name} (Copy)`,
        sku,
        description: source.description,
        categoryId: source.categoryId,
        price: source.price,
        originalPrice: source.originalPrice,
        discount: source.discount,
        stockQuantity: source.stockQuantity,
        lowStockThreshold: source.lowStockThreshold,
        unit: source.unit,
        brand: source.brand,
        productCode: source.productCode,
        imageUrl: source.imageUrl && isStoredProductKey(source.imageUrl)
          ? await copyProductImage(source.imageUrl, tenantId)
          : source.imageUrl,
        status: source.status,
        availability: source.availability,
      },
      include: { category: { select: { name: true } } },
    });
    return this.afterProductChange(this.mapProduct(row));
  }

  async changeStatus(tenantId: string, id: string, status?: 'ACTIVE' | 'INACTIVE') {
    const current = await this.getById(tenantId, id);
    const next = status ?? (current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    return this.update(tenantId, id, { status: next });
  }

  async remove(tenantId: string, id: string) {
    const current = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundException('Product not found');
    const orderCount = await this.prisma.clientOrder.count({ where: { tenantId, productId: id } });
    if (orderCount > 0) {
      throw new BadRequestException('This product has related orders and cannot be deleted');
    }
    await this.prisma.product.delete({ where: { id } });
    await deleteProductImage(current.imageUrl);
    await this.prisma.service.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
    this.realtime.publish(tenantId, 'products');
    return { ok: true };
  }

  async setImage(tenantId: string, id: string, buffer: Buffer, mimetype: string, filename: string) {
    const mime = (mimetype || '').toLowerCase();
    const hasExt = /\.(png|jpe?g|webp|gif|avif)$/i.test(filename || '');
    if (!isProductImageMime(mime) && !hasExt) {
      throw new BadRequestException('Unsupported image type. Use PNG, JPEG, WebP, GIF or AVIF.');
    }
    if (buffer.length > PRODUCT_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Image must be under 12MB');
    }
    const current = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundException('Product not found');
    const key = await saveProductImage({
      tenantId,
      buffer,
      mime: mime || 'image/jpeg',
      filename: filename || `upload${productImageExt(mime, filename)}`,
    });
    if (current.imageUrl && current.imageUrl !== key) {
      await deleteProductImage(current.imageUrl);
    }
    return this.update(tenantId, id, { imageUrl: key });
  }

  async clearImage(tenantId: string, id: string) {
    return this.update(tenantId, id, { imageUrl: null });
  }

  async openImage(opts: { id: string; tenantId?: string; publicOnly?: boolean }) {
    const row = await this.prisma.product.findFirst({
      where: {
        id: opts.id,
        ...(opts.tenantId ? { tenantId: opts.tenantId } : {}),
        ...(opts.publicOnly ? { status: 'ACTIVE' } : {}),
      },
    });
    if (!row?.imageUrl) throw new NotFoundException('Product image not found');
    if (row.imageUrl.startsWith('data:')) {
      const match = row.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new NotFoundException('Product image not found');
      return {
        mime: match[1],
        buffer: Buffer.from(match[2], 'base64'),
      };
    }
    if (!isStoredProductKey(row.imageUrl)) {
      throw new NotFoundException('Product image not found');
    }
    const media = await openProductMedia(row.imageUrl);
    if (!media) throw new NotFoundException('Product image not found');
    return { mime: mimeFromProductKey(row.imageUrl), ...media };
  }

  private async persistIncomingImage(
    tenantId: string,
    previous: string | null,
    incoming: string | null | undefined,
  ): Promise<string | null> {
    if (incoming == null || incoming === '') {
      await deleteProductImage(previous);
      return null;
    }
    if (incoming.startsWith('data:')) {
      const match = incoming.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new BadRequestException('Invalid image data');
      const mime = match[1].toLowerCase();
      const buffer = Buffer.from(match[2], 'base64');
      if (!isProductImageMime(mime)) {
        throw new BadRequestException('Unsupported image type. Use PNG, JPEG, WebP, GIF or AVIF.');
      }
      if (buffer.length > PRODUCT_IMAGE_MAX_BYTES) {
        throw new BadRequestException('Image must be under 12MB');
      }
      const key = await saveProductImage({
        tenantId,
        buffer,
        mime,
        filename: `upload${productImageExt(mime)}`,
      });
      if (previous && previous !== key) await deleteProductImage(previous);
      return key;
    }
    if (isStoredProductKey(incoming) || incoming.startsWith('/public/products/')) {
      return isStoredProductKey(incoming) ? incoming : previous;
    }
    if (incoming.startsWith('http://') || incoming.startsWith('https://')) {
      if (previous && previous !== incoming) await deleteProductImage(previous);
      return incoming;
    }
    throw new BadRequestException('Invalid image');
  }

  private async afterProductChange<T extends {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    price: number;
    unit: string | null;
    categoryName: string | null;
    status: 'ACTIVE' | 'INACTIVE';
  }>(product: T): Promise<T> {
    await this.syncBookingService(product);
    this.realtime.publish(product.tenantId, 'products');
    return product;
  }

  private async syncBookingService(product: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    price: number;
    unit: string | null;
    categoryName: string | null;
    status: 'ACTIVE' | 'INACTIVE';
  }) {
    const duration =
      product.unit === 'Package' ? 90 : product.unit === 'Session' ? 45 : product.unit === 'Piece' ? 30 : 60;
    const data = {
      tenantId: product.tenantId,
      name: product.name,
      description: product.description,
      durationMinutes: duration,
      price: product.price,
      category: product.categoryName || 'General',
      isActive: product.status === 'ACTIVE',
    };
    await this.prisma.service.upsert({
      where: { id: product.id },
      create: { id: product.id, ...data },
      update: data,
    });
  }
}
