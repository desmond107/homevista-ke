import crypto from "crypto";
import { NextResponse } from "next/server";
import { runAllJobs } from "@/lib/cron";

/** Daily jobs (06:00 UTC / 09:00 EAT on Vercel Hobby): subscription reminders/expiry notices, saved-search alerts, housekeeping.
 *  Authenticate with `Authorization: Bearer CRON_SECRET` (Vercel Cron) or `?key=CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? new URL(req.url).searchParams.get("key") ?? "";
  const ok = !!secret && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const result = await runAllJobs();
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}
