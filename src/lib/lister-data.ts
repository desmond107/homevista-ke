import "server-only";
import { prisma } from "./db";

/** The lister's readiness checklist: what stands between them and live listings. */
export async function listerStatus(listerId: string) {
  const l = await prisma.listerProfile.findUniqueOrThrow({
    where: { id: listerId },
    include: { user: { select: { phoneVerified: true, status: true } }, kycSubmissions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const now = new Date();
  const subActive = !!l.subscriptionEndsAt && l.subscriptionEndsAt > now;
  const daysLeft = subActive ? Math.ceil((l.subscriptionEndsAt!.getTime() - now.getTime()) / 86400_000) : 0;
  return {
    lister: l,
    phoneVerified: l.user.phoneVerified,
    kycApproved: l.kycStatus === "APPROVED",
    subActive,
    daysLeft,
    live: l.kycStatus === "APPROVED" && subActive && l.user.status === "ACTIVE",
    latestKyc: l.kycSubmissions[0] ?? null,
  };
}

export type ListerStatus = Awaited<ReturnType<typeof listerStatus>>;
