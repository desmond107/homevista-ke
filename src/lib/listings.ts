import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * A listing is publicly visible only when ALL of these hold:
 *  - it is ACTIVE (approved, not paused/removed),
 *  - its lister passed KYC,
 *  - the lister's subscription has not expired (expired listers are hidden automatically, no cron needed),
 *  - the lister's account is active.
 */
export function publicWhere(now = new Date()): Prisma.PropertyWhereInput {
  return {
    status: "ACTIVE",
    lister: { kycStatus: "APPROVED", subscriptionEndsAt: { gt: now }, user: { status: "ACTIVE" } },
  };
}

/** Fields needed to render a property card. Exact location and contacts are never selected here. */
export const cardSelect = {
  id: true,
  slug: true,
  title: true,
  purpose: true,
  price: true,
  pricePeriod: true,
  estate: true,
  bedrooms: true,
  bathrooms: true,
  size: true,
  sizeUnit: true,
  featured: true,
  ratingAvg: true,
  ratingCount: true,
  videoUrl: true,
  tourUrl: true,
  approxLat: true,
  approxLng: true,
  createdAt: true,
  county: { select: { name: true } },
  town: { select: { name: true } },
  type: { select: { name: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 3, select: { url: true, alt: true } },
  lister: { select: { displayName: true, verified: true, slug: true } },
} satisfies Prisma.PropertySelect;

export type CardProperty = Prisma.PropertyGetPayload<{ select: typeof cardSelect }>;

export function areaLabel(p: { estate?: string | null; town?: { name: string } | null; county: { name: string } }) {
  return [p.estate, p.town?.name, p.county.name].filter(Boolean).join(", ");
}

/** Recomputes cached rating figures on a property after a review changes. */
export async function refreshRating(propertyId: string) {
  const agg = await prisma.review.aggregate({
    where: { propertyId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.property.update({
    where: { id: propertyId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
  });
}

/** Records a page view (total + daily bucket for charts). */
export async function recordView(propertyId: string) {
  const day = new Date(new Date().toISOString().slice(0, 10));
  await prisma.$transaction([
    prisma.property.update({ where: { id: propertyId }, data: { views: { increment: 1 } } }),
    prisma.$executeRaw`INSERT INTO "PropertyViewDay" ("propertyId", "day", "count") VALUES (${propertyId}, ${day}, 1)
      ON CONFLICT ("propertyId", "day") DO UPDATE SET "count" = "PropertyViewDay"."count" + 1`,
  ]);
}

/** Offsets an exact point by roughly 400–900 m in a stable, per-listing direction so the public pin can't be reverse-engineered. */
export function approximate(lat: number, lng: number, seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  const dist = 0.004 + ((h >> 9) % 500) / 100000; // degrees ≈ 0.4–0.9 km
  return { approxLat: lat + Math.sin(angle) * dist, approxLng: lng + Math.cos(angle) * dist };
}

/** IDs of the given properties that this user has saved. */
export async function savedSet(userId: string | null | undefined, ids: string[]) {
  if (!userId || !ids.length) return new Set<string>();
  const rows = await prisma.favourite.findMany({ where: { userId, propertyId: { in: ids } }, select: { propertyId: true } });
  return new Set(rows.map((r) => r.propertyId));
}
