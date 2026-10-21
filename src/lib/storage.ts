import "server-only";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

/*
 * File storage with two strictly separate areas:
 *
 *  public  — property photos, logos, ad banners. Served at /media/<key> (local) or the bucket's public URL.
 *  private — KYC documents. NEVER publicly reachable; streamed only through /api/admin/kyc-file/<key>
 *            after an admin permission check.
 *
 * Driver: S3-compatible object storage (AWS S3, Cloudflare R2, DigitalOcean Spaces…) when S3_BUCKET is set,
 * otherwise the local ./storage directory (fine for a single server; use S3/R2 for multi-instance hosting).
 */

const LOCAL_ROOT = path.join(process.cwd(), "storage");
type Area = "public" | "private";

function s3Enabled() {
  return !!process.env.S3_BUCKET;
}

let s3Client: import("@aws-sdk/client-s3").S3Client | null = null;
async function s3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3Client ??= new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return s3Client;
}

function bucketFor(area: Area) {
  // A separate private bucket is recommended; falls back to a "private/" prefix in the same (non-public) bucket.
  return area === "private" ? process.env.S3_PRIVATE_BUCKET || process.env.S3_BUCKET! : process.env.S3_BUCKET!;
}

function safeKey(key: string) {
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes("..")) throw new Error("Invalid storage key");
  return key;
}

export function newKey(folder: string, ext: string) {
  const d = new Date();
  return `${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomBytes(12).toString("hex")}.${ext}`;
}

export async function putFile(area: Area, key: string, body: Buffer, contentType: string) {
  safeKey(key);
  if (s3Enabled()) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const Key = area === "private" && !process.env.S3_PRIVATE_BUCKET ? `private/${key}` : key;
    await (await s3()).send(
      new PutObjectCommand({
        Bucket: bucketFor(area),
        Key,
        Body: body,
        ContentType: contentType,
        CacheControl: area === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
      }),
    );
  } else {
    const file = path.join(LOCAL_ROOT, area, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }
  return key;
}

/** Public URL for a stored public file. */
export function publicUrl(key: string) {
  if (s3Enabled() && process.env.S3_PUBLIC_URL) return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  return `/media/${key}`;
}

export async function readFile(area: Area, key: string): Promise<Buffer | null> {
  safeKey(key);
  if (s3Enabled()) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const Key = area === "private" && !process.env.S3_PRIVATE_BUCKET ? `private/${key}` : key;
      const out = await (await s3()).send(new GetObjectCommand({ Bucket: bucketFor(area), Key }));
      return Buffer.from(await out.Body!.transformToByteArray());
    } catch {
      return null;
    }
  }
  try {
    return await fs.readFile(path.join(LOCAL_ROOT, area, key));
  } catch {
    return null;
  }
}

export async function deleteFile(area: Area, key: string) {
  safeKey(key);
  if (s3Enabled()) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const Key = area === "private" && !process.env.S3_PRIVATE_BUCKET ? `private/${key}` : key;
    await (await s3()).send(new DeleteObjectCommand({ Bucket: bucketFor(area), Key })).catch(() => {});
  } else {
    await fs.rm(path.join(LOCAL_ROOT, area, key), { force: true });
  }
}

export function contentTypeFor(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  return ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "pdf" ? "application/pdf" : "application/octet-stream";
}

/** If a URL points at our own public storage, return its key (for clean-up). */
export function keyFromPublicUrl(url: string) {
  if (url.startsWith("/media/")) return url.slice(7);
  const base = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  if (base && url.startsWith(base + "/")) return url.slice(base.length + 1);
  return null;
}
