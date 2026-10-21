import "server-only";
import { prisma } from "./db";
import { clientIp } from "./request";

/** Audit trail for admin and account actions. Never throws. */
export async function logActivity(userId: string | null, action: string, target?: string | null, detail?: string | null) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, target: target ?? null, detail: detail?.slice(0, 500) ?? null, ip: await clientIp().catch(() => null) },
    });
  } catch (e) {
    console.error("[activity] failed to log", action, e);
  }
}
