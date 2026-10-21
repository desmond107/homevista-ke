import "server-only";
import crypto from "crypto";
import { prisma } from "./db";
import { authSecret } from "./request";
import { sendSms } from "./notify";
import { UserError } from "./errors";

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (phone: string, code: string) => crypto.createHmac("sha256", authSecret()).update(`${phone}:${code}`).digest("hex");

/** Sends a 6-digit code. Returns the code ONLY in development without an SMS provider, so it can be shown on screen. */
export async function sendOtp(phone: string, purpose = "verify_phone") {
  const recent = await prisma.otpCode.count({ where: { phone, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent > 0) throw new UserError("A code was just sent. Please wait a minute before requesting another.");
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.updateMany({ where: { phone, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.otpCode.create({ data: { phone, purpose, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + TTL_MS) } });
  await sendSms(phone, `Your HomeVista Ke verification code is ${code}. It expires in 10 minutes. Never share this code.`);
  const devEcho = process.env.NODE_ENV !== "production" && !process.env.AT_API_KEY;
  return devEcho ? code : null;
}

export async function verifyOtp(phone: string, code: string, purpose = "verify_phone") {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new UserError("That code has expired. Request a new one.");
  if (otp.attempts >= MAX_ATTEMPTS) throw new UserError("Too many wrong attempts. Request a new code.");
  const a = Buffer.from(otp.codeHash);
  const b = Buffer.from(hash(phone, code.trim()));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new UserError("That code isn't right. Check the SMS and try again.");
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return true;
}
