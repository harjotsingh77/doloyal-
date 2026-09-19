import { createReadStream, existsSync } from 'fs';
import { copyFile, mkdir, unlink, writeFile } from 'fs/promises';
import { join, normalize } from 'path';
import { randomUUID } from 'crypto';
import {
  copyObject,
  deleteObject,
  getObject,
  isRemoteStorageEnabled,
  putObject,
} from '../../common/object-storage';

export const PRODUCT_UPLOAD_ROOT = join(process.cwd(), 'uploads', 'products');
export const PRODUCT_IMAGE_MAX_BYTES = 12 * 1024 * 1024;

const IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export function isProductImageMime(mime: string): boolean {
  return IMAGE_MIMES.has((mime || '').toLowerCase());
}

export function productImageExt(mime: string, filename = ''): string {
  const fromName = filename.toLowerCase().match(/\.(png|jpe?g|webp|gif|avif)$/);
  if (fromName) return fromName[0] === '.jpeg' ? '.jpg' : fromName[0];
  const lower = (mime || '').toLowerCase();
  if (lower.includes('png')) return '.png';
  if (lower.includes('webp')) return '.webp';
  if (lower.includes('gif')) return '.gif';
  if (lower.includes('avif')) return '.avif';
  if (lower.includes('jpeg') || lower.includes('jpg')) return '.jpg';
  return '.jpg';
}

export function isStoredProductKey(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith('products/'));
}

function safeJoin(root: string, relative: string): string {
  const resolved = normalize(join(root, relative.replace(/^products\//, '')));
  if (!resolved.startsWith(normalize(root))) {
    throw new Error('Invalid media path');
  }
  return resolved;
}

export async function saveProductImage(opts: {
  tenantId: string;
  buffer: Buffer;
  mime: string;
  filename: string;
}): Promise<string> {
  const ext = productImageExt(opts.mime, opts.filename);
  const key = `products/${opts.tenantId}/${randomUUID()}${ext}`;

  if (isRemoteStorageEnabled()) {
    await putObject(key, opts.buffer, opts.mime);
    return key;
  }

  const dir = join(PRODUCT_UPLOAD_ROOT, opts.tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, key.split('/').pop()!), opts.buffer);
  return key;
}

export async function copyProductImage(key: string, tenantId: string): Promise<string> {
  const ext = key.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '.jpg';
  const target = `products/${tenantId}/${randomUUID()}${ext}`;

  if (isRemoteStorageEnabled()) {
    // Fall back to the original key so the duplicate still shows an image
    // rather than a broken one.
    return (await copyObject(key, target)) ? target : key;
  }

  const abs = productMediaAbsolutePath(key);
  if (!abs || !existsSync(abs)) return key;
  const dir = join(PRODUCT_UPLOAD_ROOT, tenantId);
  await mkdir(dir, { recursive: true });
  await copyFile(abs, join(dir, target.split('/').pop()!));
  return target;
}

export function productMediaAbsolutePath(key: string): string | null {
  if (!isStoredProductKey(key)) return null;
  return safeJoin(PRODUCT_UPLOAD_ROOT, key);
}

/**
 * Returns a readable stream on local disk, or the raw bytes when the object
 * lives in remote storage. Callers hand either shape straight to Fastify.
 */
export async function openProductMedia(
  key: string,
): Promise<{ stream?: NodeJS.ReadableStream; buffer?: Buffer } | null> {
  if (isRemoteStorageEnabled()) {
    const buffer = await getObject(key);
    return buffer ? { buffer } : null;
  }

  const abs = productMediaAbsolutePath(key);
  if (!abs || !existsSync(abs)) return null;
  return { stream: createReadStream(abs) };
}

export async function deleteProductImage(key: string | null | undefined): Promise<void> {
  if (!isStoredProductKey(key)) return;

  if (isRemoteStorageEnabled()) {
    await deleteObject(key!);
    return;
  }

  const abs = productMediaAbsolutePath(key!);
  if (!abs) return;
  try {
    await unlink(abs);
  } catch {
    // ignore missing files
  }
}

export function mimeFromProductKey(key: string, fallback = 'image/jpeg'): string {
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.gif')) return 'image/gif';
  if (key.endsWith('.avif')) return 'image/avif';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  return fallback;
}

export function resolveProductImageUrl(row: {
  id: string;
  imageUrl: string | null;
  updatedAt: Date;
}): string | null {
  if (!row.imageUrl) return null;
  if (
    row.imageUrl.startsWith('data:') ||
    row.imageUrl.startsWith('http://') ||
    row.imageUrl.startsWith('https://') ||
    row.imageUrl.startsWith('blob:')
  ) {
    return row.imageUrl;
  }
  if (isStoredProductKey(row.imageUrl) || row.imageUrl.startsWith('/public/products/')) {
    return `/public/products/${row.id}/image?v=${row.updatedAt.getTime()}`;
  }
  return row.imageUrl;
}
