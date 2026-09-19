import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, normalize } from 'path';
import { randomUUID } from 'crypto';
import {
  deleteObject,
  getObject,
  isRemoteStorageEnabled,
  putObject,
} from '../../common/object-storage';

export const REVIEW_UPLOAD_ROOT = join(process.cwd(), 'uploads', 'reviews');
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

const VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
]);

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export function isVideoMime(mime: string): boolean {
  return VIDEO_MIMES.has(mime) || mime.startsWith('video/');
}

export function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime);
}

export function extForMime(mime: string, filename = ''): string {
  const fromName = filename.toLowerCase().match(/\.(mp4|webm|mov|m4v|png|jpe?g|webp)$/);
  if (fromName) return fromName[0] === '.jpeg' ? '.jpg' : fromName[0];
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('quicktime') || mime.includes('mov')) return '.mov';
  if (mime.includes('mp4') || mime.includes('m4v')) return '.mp4';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  return '.bin';
}

export function isStoredMediaKey(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith('reviews/'));
}

function safeJoin(root: string, relative: string): string {
  const resolved = normalize(join(root, relative.replace(/^reviews\//, '')));
  if (!resolved.startsWith(normalize(root))) {
    throw new Error('Invalid media path');
  }
  return resolved;
}

export async function saveReviewMedia(opts: {
  tenantId: string;
  buffer: Buffer;
  mime: string;
  filename: string;
}): Promise<{ key: string; mime: string }> {
  const ext = extForMime(opts.mime, opts.filename);
  const name = `${randomUUID()}${ext}`;
  const key = `reviews/${opts.tenantId}/${name}`;

  if (isRemoteStorageEnabled()) {
    await putObject(key, opts.buffer, opts.mime);
    return { key, mime: opts.mime };
  }

  const dir = join(REVIEW_UPLOAD_ROOT, opts.tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), opts.buffer);
  return { key, mime: opts.mime };
}

export function mediaAbsolutePath(key: string): string | null {
  if (!isStoredMediaKey(key)) return null;
  return safeJoin(REVIEW_UPLOAD_ROOT, key);
}

export function mediaExists(key: string): boolean {
  const abs = mediaAbsolutePath(key);
  return Boolean(abs && existsSync(abs));
}

/**
 * Returns a readable stream on local disk, or the raw bytes when the object
 * lives in remote storage. Callers hand either shape straight to Fastify.
 */
export async function openMedia(
  key: string,
): Promise<{ stream?: NodeJS.ReadableStream; buffer?: Buffer } | null> {
  if (isRemoteStorageEnabled()) {
    const buffer = await getObject(key);
    return buffer ? { buffer } : null;
  }

  const abs = mediaAbsolutePath(key);
  if (!abs || !existsSync(abs)) return null;
  return { stream: createReadStream(abs) };
}

export async function deleteReviewMedia(key: string | null | undefined): Promise<void> {
  if (!key || !isStoredMediaKey(key)) return;

  if (isRemoteStorageEnabled()) {
    await deleteObject(key);
    return;
  }

  const abs = mediaAbsolutePath(key);
  if (!abs) return;
  try {
    await unlink(abs);
  } catch {
    // ignore missing files
  }
}

export function mimeFromKey(key: string, fallback = 'application/octet-stream'): string {
  if (key.endsWith('.webm')) return 'video/webm';
  if (key.endsWith('.mp4') || key.endsWith('.m4v')) return 'video/mp4';
  if (key.endsWith('.mov')) return 'video/quicktime';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  return fallback;
}
