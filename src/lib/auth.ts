import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { clientIp, clientUserAgent } from "./request";
import { hasAdminPermission, type AdminPermission } from "./permissions";
import { AuthError } from "./errors";

export const SESSION_COOKIE = "hv_session";
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  avatarUrl: string | null;
  role: Role;
  isSuperAdmin: boolean;
  adminPermissions: string[];
  listerId: string | null;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

let dummyHash: Promise<string> | null = null;
/** Compares against a real hash, or a throwaway one when the account doesn't exist, so timing doesn't leak which emails are registered. */
export async function verifyPasswordOrDummy(pw: string, hash: string | null) {
  dummyHash ??= bcrypt.hash("timing-equaliser", 12);
  const ok = await bcrypt.compare(pw, hash ?? (await dummyHash));
  return !!hash && ok;
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Use a mix of letters and numbers.";
  return null;
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { tokenHash: sha(token), userId, expiresAt, ip: await clientIp(), userAgent: await clientUserAgent() },
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in user, or null. Suspended and banned accounts are treated as signed out. */
export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({
    where: { tokenHash: sha(token) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          phoneVerified: true,
          avatarUrl: true,
          role: true,
          isSuperAdmin: true,
          adminPermissions: true,
          status: true,
          lister: { select: { id: true } },
        },
      },
    },
  });
  if (!s || s.expiresAt < new Date() || s.user.status !== "ACTIVE") return null;
  const { status: _s, lister, ...u } = s.user;
  return { ...u, listerId: lister?.id ?? null };
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export { AuthError };

// ── Page guards (redirect) ──

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireLister(): Promise<SessionUser & { listerId: string }> {
  const user = await requireUser("/lister");
  if (user.role !== "LISTER" || !user.listerId) redirect("/account?notice=lister-only");
  return user as SessionUser & { listerId: string };
}

export async function requireAdmin(perm: AdminPermission = "analytics"): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  if (!hasAdminPermission(user, perm)) redirect(`/admin?denied=${perm}`);
  return user;
}

// ── Action / route guards (throw) ──

export async function assertUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new AuthError("Please sign in to continue.");
  return user;
}

export async function assertLister(): Promise<SessionUser & { listerId: string }> {
  const user = await assertUser();
  if (user.role !== "LISTER" || !user.listerId) throw new AuthError("This is only available to lister accounts.", 403);
  return user as SessionUser & { listerId: string };
}

export async function assertAdmin(perm: AdminPermission): Promise<SessionUser> {
  const user = await assertUser();
  if (!hasAdminPermission(user, perm)) throw new AuthError("Your admin role doesn't allow that.", 403);
  return user;
}

/** Only allow same-site relative redirects after login (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Where a user lands after signing in, by role. */
export function homeFor(role: Role) {
  return role === "ADMIN" ? "/admin" : role === "LISTER" ? "/lister" : "/account";
}
