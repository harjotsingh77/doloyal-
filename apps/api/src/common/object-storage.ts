import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '@nestjs/common';

/**
 * Durable object storage for user-uploaded media (product images, review
 * photos and video).
 *
 * These used to be written to `apps/api/uploads/` on local disk. That works in
 * development but silently loses every file on a managed host, where the
 * filesystem is recreated on each deploy and restart. Production therefore
 * stores them in a Supabase Storage bucket.
 *
 * Local development deliberately keeps using the disk so `pnpm dev` needs no
 * cloud credentials and never writes test uploads into the production bucket.
 *
 * Object keys are unchanged (`products/<tenantId>/<uuid>.<ext>`), so rows
 * already in the database keep resolving through the same public endpoints.
 */

const logger = new Logger('ObjectStorage');

const DEFAULT_BUCKET = 'doloyal-media';

let cachedClient: SupabaseClient | null | undefined;

function bucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

/** Remote storage is used in production only — see the note above. */
export function isRemoteStorageEnabled(): boolean {
  return process.env.NODE_ENV === 'production';
}

function client(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

/**
 * Throws rather than falling back to disk. A silent fallback in production
 * would accept the upload, show success, and then lose the file on the next
 * deploy — far worse than a clear error naming the missing variable.
 */
function requireClient(): SupabaseClient {
  const c = client();
  if (!c) {
    throw new Error(
      'Media storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY so uploads persist across deploys.',
    );
  }
  return c;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await requireClient()
    .storage.from(bucketName())
    .upload(key, body, { contentType, upsert: true });

  if (error) throw new Error(`Media upload failed: ${error.message}`);
}

export async function getObject(key: string): Promise<Buffer | null> {
  const c = client();
  if (!c) return null;

  const { data, error } = await c.storage.from(bucketName()).download(key);
  if (error || !data) return null;

  return Buffer.from(await data.arrayBuffer());
}

export async function deleteObject(key: string): Promise<void> {
  const c = client();
  if (!c) return;

  const { error } = await c.storage.from(bucketName()).remove([key]);
  // A missing object is not worth failing a delete over.
  if (error) logger.warn(`Could not delete ${key}: ${error.message}`);
}

export async function copyObject(fromKey: string, toKey: string): Promise<boolean> {
  const c = client();
  if (!c) return false;

  const { error } = await c.storage.from(bucketName()).copy(fromKey, toKey);
  if (error) {
    logger.warn(`Could not copy ${fromKey}: ${error.message}`);
    return false;
  }
  return true;
}
