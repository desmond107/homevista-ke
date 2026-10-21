import { getUser } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/permissions";
import { contentTypeFor, readFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

/** Streams a private KYC document — admins with the "kyc" permission only. Every access is audited. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await getUser();
  if (!user || !hasAdminPermission(user, "kyc")) return new Response("Not found", { status: 404 });
  const key = (await params).key.join("/");
  let body: Buffer | null = null;
  try {
    body = await readFile("private", key);
  } catch {
    return new Response("Bad key", { status: 400 });
  }
  if (!body) return new Response("Not found", { status: 404 });
  await logActivity(user.id, "kyc.document_viewed", key);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentTypeFor(key),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
