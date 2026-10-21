import { contentTypeFor, readFile } from "@/lib/storage";

/** Serves PUBLIC uploads from local storage (property photos, logos, banners). KYC files never live here. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  let body: Buffer | null = null;
  try {
    body = await readFile("public", key);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": contentTypeFor(key), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
