import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// Reuse the client across hot reloads in dev.
const globalForR2 = globalThis as unknown as { __r2?: S3Client };

function r2(): S3Client {
  if (!globalForR2.__r2) {
    globalForR2.__r2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return globalForR2.__r2;
}

function bucket(): string {
  return process.env.R2_BUCKET_NAME!;
}

/** Canonical object key — keeps all media under a single prefix. */
export function r2Key(id: string, ext: string): string {
  return `media/${id}.${ext}`;
}

/**
 * Direct public URL for an object (R2.dev dev URL, or a custom domain if
 * you switch to one later) — set R2_PUBLIC_URL to enable serving media
 * straight from Cloudflare's edge instead of proxying through this server.
 * Returns null (falls back to proxying) if it isn't configured.
 */
export function r2PublicUrl(key: string): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key}`;
}

/** Upload a buffer as a new R2 object. */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/**
 * Delete an object from R2.
 * Idempotent — R2 returns 204 even if the key doesn't exist, so no
 * error is thrown for missing objects.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/**
 * Fetch an object from R2 and return a fully-formed HTTP Response.
 *
 * Passing the browser's Range header through lets video players seek
 * without downloading the whole file — R2 handles the byte slicing.
 *
 * Throws with err.name === "NoSuchKey" if the object doesn't exist,
 * so callers can fall back to the local disk (migration period).
 */
export async function streamFromR2(
  key: string,
  rangeHeader: string | null,
  contentType: string
): Promise<Response> {
  const result = await r2().send(
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    })
  );

  const headers: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Cache-Control": IMMUTABLE_CACHE,
    "Content-Type": contentType,
  };
  if (result.ContentLength !== undefined) {
    headers["Content-Length"] = String(result.ContentLength);
  }
  if (result.ContentRange) {
    headers["Content-Range"] = result.ContentRange;
  }

  // Body is a SdkStreamMixin in Node.js — transformToWebStream() converts
  // it to a WHATWG ReadableStream that Next.js can return directly.
  const webStream = result.Body!.transformToWebStream() as ReadableStream;
  return new Response(webStream, {
    status: rangeHeader ? 206 : 200,
    headers,
  });
}
