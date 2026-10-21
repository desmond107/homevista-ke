"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  assertUser, createSession, destroyAllSessions, destroySession, hashPassword, homeFor, passwordProblem, safeNext, verifyPassword, verifyPasswordOrDummy,
} from "@/lib/auth";
import { safeAction, UserError, type ActionResult } from "@/lib/action";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/request";
import { normalizeKePhone, slugify } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { sendOtp, verifyOtp } from "@/lib/otp";
import { logActivity } from "@/lib/activity";
import { LISTER_TYPES } from "@/lib/constants";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(80),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  phone: z.string().trim().min(9, "Please enter your phone number."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  as: z.enum(["seeker", "lister"]),
  listerType: z.enum(LISTER_TYPES).optional(),
  displayName: z.string().trim().max(80).optional(),
  terms: z.literal("on", { errorMap: () => ({ message: "Please accept the Terms of Use and Privacy Policy." }) }),
  next: z.string().optional(),
});

export async function registerAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = await safeAction(async () => {
    const ip = hashIp(await clientIp());
    if (!(await rateLimit(`register:${ip}`, 8, 3600)).ok) throw new UserError("Too many sign-ups from this network. Try again later.");
    const d = registerSchema.parse(Object.fromEntries(fd));
    const pwIssue = passwordProblem(d.password);
    if (pwIssue) throw new UserError(pwIssue);
    const phone = normalizeKePhone(d.phone);
    if (!phone) throw new UserError("Enter a valid Kenyan mobile number, e.g. 0712 345 678.");
    if (await prisma.user.findUnique({ where: { email: d.email } })) throw new UserError("An account with this email already exists. Try signing in.");
    if (await prisma.user.findUnique({ where: { phone } })) throw new UserError("This phone number is already registered.");

    const isLister = d.as === "lister";
    if (isLister && !d.listerType) throw new UserError("Choose what kind of lister you are.");
    const display = (isLister && d.displayName) || d.name;
    let slug = slugify(display) || "lister";
    if (await prisma.listerProfile.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const user = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        phone,
        passwordHash: await hashPassword(d.password),
        role: isLister ? "LISTER" : "USER",
        ...(isLister
          ? { lister: { create: { type: d.listerType!, displayName: display, slug, phone, whatsapp: phone, email: d.email } } }
          : {}),
      },
    });
    await createSession(user.id);
    await logActivity(user.id, "auth.register", user.email);
    await notifyUser(user, {
      title: "Welcome to HomeVista Ke",
      body: isLister
        ? "Your lister account is ready. Next: verify your phone, complete KYC and activate your subscription to publish listings."
        : "Your account is ready. Save homes you love, and unlock any property's exact location and contacts via M-Pesa.",
      link: isLister ? "/lister" : "/properties",
      emailSubject: "Welcome to HomeVista Ke",
    });
    return { ok: true as const, data: undefined, message: isLister ? "/lister" : safeNext(d.next, "/account") };
  });
  if (res.ok) redirect(`/verify-phone?next=${encodeURIComponent(res.message ?? "/account")}`);
  return res;
}

export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = await safeAction(async () => {
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");
    const ip = hashIp(await clientIp());
    // Two limits: per account (stops password guessing) and per network.
    if (!(await rateLimit(`login:${email}`, 8, 900)).ok || !(await rateLimit(`login-ip:${ip}`, 30, 900)).ok) {
      throw new UserError("Too many sign-in attempts. Please wait 15 minutes and try again.");
    }
    const user = await prisma.user.findUnique({ where: { email } });
    // Always run bcrypt so response time doesn't reveal whether the email exists.
    const ok = await verifyPasswordOrDummy(password, user?.passwordHash ?? null);
    if (!user || !user.passwordHash || !ok) {
      await logActivity(user?.id ?? null, "auth.login_failed", email);
      throw new UserError(user && !user.passwordHash ? "This account uses Google sign-in. Use the Google button." : "Incorrect email or password.");
    }
    if (user.status !== "ACTIVE") throw new UserError(`This account is ${user.status.toLowerCase()}. Contact support if you think this is a mistake.`);
    await createSession(user.id);
    await logActivity(user.id, "auth.login");
    return { ok: true as const, message: safeNext(String(fd.get("next") ?? ""), homeFor(user.role)) };
  });
  if (res.ok) redirect(res.message!);
  return res;
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function sendPhoneOtpAction(_prev: ActionResult<{ devCode?: string }> | null, fd: FormData): Promise<ActionResult<{ devCode?: string }>> {
  return safeAction(async () => {
    const user = await assertUser();
    const phone = normalizeKePhone(String(fd.get("phone") ?? user.phone ?? ""));
    if (!phone) throw new UserError("Enter a valid Kenyan mobile number.");
    const clash = await prisma.user.findFirst({ where: { phone, id: { not: user.id } } });
    if (clash) throw new UserError("This number is linked to another account.");
    if (!(await rateLimit(`otp:${user.id}`, 5, 3600)).ok) throw new UserError("Too many codes requested. Try again in an hour.");
    if (phone !== user.phone) await prisma.user.update({ where: { id: user.id }, data: { phone, phoneVerified: false } });
    const devCode = await sendOtp(phone);
    return { ok: true as const, data: { devCode: devCode ?? undefined }, message: `We sent a 6-digit code to +${phone}.` };
  });
}

export async function verifyPhoneAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = await safeAction(async () => {
    const user = await assertUser();
    if (!user.phone) throw new UserError("Add your phone number first.");
    await verifyOtp(user.phone, String(fd.get("code") ?? ""));
    await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
    await logActivity(user.id, "auth.phone_verified", user.phone);
    return { ok: true as const, message: safeNext(String(fd.get("next") ?? ""), homeFor(user.role)) };
  });
  if (res.ok) redirect(res.message!);
  return res;
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function updateProfileAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertUser();
    const d = profileSchema.parse(Object.fromEntries(fd));
    await prisma.user.update({ where: { id: user.id }, data: { name: d.name } });
    return { ok: true as const, message: "Profile updated." };
  });
}

export async function changePasswordAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertUser();
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("password") ?? "");
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (row.passwordHash && !(await verifyPassword(current, row.passwordHash))) throw new UserError("Your current password is incorrect.");
    const issue = passwordProblem(next);
    if (issue) throw new UserError(issue);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
    await destroyAllSessions(user.id);
    await createSession(user.id);
    await logActivity(user.id, "auth.password_changed");
    return { ok: true as const, message: "Password changed. Other devices have been signed out." };
  });
}
