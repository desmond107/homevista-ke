import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleAuthUrl, googleEnabled } from "@/lib/google";
import { safeNext } from "@/lib/auth";

/** Starts Google sign-in. `as=lister` creates a lister account on first sign-in. */
export async function GET(req: Request) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google-disabled", req.url));
  const u = new URL(req.url);
  const state = crypto.randomBytes(24).toString("base64url");
  const jar = await cookies();
  const payload = JSON.stringify({ state, next: safeNext(u.searchParams.get("next"), ""), as: u.searchParams.get("as") === "lister" ? "lister" : "seeker" });
  jar.set("hv_oauth", payload, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(googleAuthUrl(state));
}
