import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { googleProfile } from "@/lib/google";
import { createSession, homeFor, safeNext } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { notifyUser } from "@/lib/notify";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const jar = await cookies();
  const raw = jar.get("hv_oauth")?.value;
  jar.delete("hv_oauth");
  let saved: { state: string; next: string; as: string } | null = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {}
  // CSRF protection for OAuth: the state must match the one we set.
  if (!saved || !u.searchParams.get("code") || u.searchParams.get("state") !== saved.state) {
    return NextResponse.redirect(new URL("/login?error=google", req.url));
  }
  try {
    const g = await googleProfile(u.searchParams.get("code")!);
    if (!g.email_verified) return NextResponse.redirect(new URL("/login?error=google-unverified", req.url));
    const email = g.email.toLowerCase();
    let user = await prisma.user.findFirst({ where: { OR: [{ googleId: g.sub }, { email }] } });
    let isNew = false;
    if (user) {
      if (user.status !== "ACTIVE") return NextResponse.redirect(new URL("/login?error=suspended", req.url));
      if (!user.googleId) user = await prisma.user.update({ where: { id: user.id }, data: { googleId: g.sub, emailVerified: true, avatarUrl: user.avatarUrl ?? g.picture } });
    } else {
      isNew = true;
      const lister = saved.as === "lister";
      let slug = slugify(g.name) || "lister";
      if (lister && (await prisma.listerProfile.findUnique({ where: { slug } }))) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      user = await prisma.user.create({
        data: {
          name: g.name,
          email,
          emailVerified: true,
          googleId: g.sub,
          avatarUrl: g.picture,
          role: lister ? "LISTER" : "USER",
          ...(lister ? { lister: { create: { type: "LANDLORD", displayName: g.name, slug, phone: "", email } } } : {}),
        },
      });
      await notifyUser(user, { title: "Welcome to HomeVista Ke", body: "Your account is ready. Verify your phone number to unlock properties and receive SMS updates.", link: "/verify-phone" });
    }
    await createSession(user.id);
    await logActivity(user.id, isNew ? "auth.register_google" : "auth.login_google");
    const dest = isNew || !user.phoneVerified ? `/verify-phone?next=${encodeURIComponent(safeNext(saved.next, homeFor(user.role)))}` : safeNext(saved.next, homeFor(user.role));
    return NextResponse.redirect(new URL(dest, req.url));
  } catch (e) {
    console.error("[google] sign-in failed", e);
    return NextResponse.redirect(new URL("/login?error=google", req.url));
  }
}
