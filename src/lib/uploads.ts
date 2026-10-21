import "server-only";
import sharp from "sharp";
import { UserError } from "./errors";
import { newKey, publicUrl, putFile } from "./storage";

/*
 * Secure uploads:
 *  - size limits enforced server-side;
 *  - the file is identified by its CONTENT (sharp decode / %PDF magic bytes), never by name or MIME header;
 *  - images are re-encoded to WebP, which strips EXIF (GPS!) and any embedded payloads;
 *  - names are random; the user's filename is never used.
 */

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_DOC_BYTES = 8 * 1024 * 1024;

export function isFile(v: FormDataEntryValue | null): v is File {
  return !!v && typeof v === "object" && "arrayBuffer" in v && (v as File).size > 0;
}

/** Validates, resizes and stores a public image. Returns its URL. */
export async function savePublicImage(file: File, folder: string, opts: { maxWidth?: number; maxHeight?: number } = {}) {
  if (file.size > MAX_IMAGE_BYTES) throw new UserError(`"${file.name}" is larger than 12 MB.`);
  const input = Buffer.from(await file.arrayBuffer());
  let out: Buffer;
  try {
    out = await sharp(input, { failOn: "error", limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: opts.maxWidth ?? 2000, height: opts.maxHeight ?? 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new UserError(`"${file.name}" isn't a supported image. Use JPG, PNG or WebP.`);
  }
  const key = newKey(folder, "webp");
  await putFile("public", key, out, "image/webp");
  return publicUrl(key);
}

/**
 * Validates and stores a private KYC document (image or PDF). Returns its storage key.
 * Images are re-encoded (EXIF stripped); PDFs are stored as-is after a magic-byte check.
 */
export async function savePrivateDocument(file: File, folder: string) {
  if (file.size > MAX_DOC_BYTES) throw new UserError(`"${file.name}" is larger than 8 MB.`);
  const input = Buffer.from(await file.arrayBuffer());
  if (input.subarray(0, 5).toString("latin1") === "%PDF-") {
    const key = newKey(folder, "pdf");
    await putFile("private", key, input, "application/pdf");
    return key;
  }
  let out: Buffer;
  try {
    out = await sharp(input, { failOn: "error", limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    throw new UserError(`"${file.name}" must be a photo (JPG/PNG/WebP) or a PDF.`);
  }
  const key = newKey(folder, "jpg");
  await putFile("private", key, out, "image/jpeg");
  return key;
}
