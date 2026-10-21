import "server-only";
import type { Prisma, Purpose } from "@prisma/client";
import { PURPOSES, PURPOSE_SLUGS } from "./constants";
import { publicWhere } from "./listings";

/*
 * Search URL contract (all optional, shareable and SEO-friendly):
 *   q, purpose (SALE|for-sale…), type (slug, repeatable or comma list), county, town (slugs), category,
 *   minPrice, maxPrice, beds, baths (minimums), minSize, maxSize, amenities (comma slugs — all required),
 *   furnished (yes|no), verified (1), minRating (1–5), media (1 = has video/virtual tour),
 *   posted (days: 1|7|30), sort, page, view (grid|list|map)
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export type SearchFilters = {
  q?: string;
  purpose?: Purpose;
  types: string[];
  county?: string;
  town?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  minSize?: number;
  maxSize?: number;
  amenities: string[];
  furnished?: "yes" | "no";
  verified: boolean;
  minRating?: number;
  media: boolean;
  posted?: number;
  sort: string;
  page: number;
  view: "grid" | "list" | "map";
};

export const PAGE_SIZE = 12;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+$/.test(s))
    .slice(0, 20);
const num = (v: string | string[] | undefined) => {
  const s = one(v)?.replace(/[, ]/g, "");
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parsePurpose(v: string | undefined): Purpose | undefined {
  if (!v) return undefined;
  const up = v.toUpperCase().replace(/-/g, "_");
  if ((PURPOSES as readonly string[]).includes(up)) return up as Purpose;
  const bySlug = Object.entries(PURPOSE_SLUGS).find(([, slug]) => slug === v.toLowerCase());
  return bySlug ? (bySlug[0] as Purpose) : undefined;
}

export function parseFilters(sp: SearchParams): SearchFilters {
  const view = one(sp.view);
  const sort = one(sp.sort) ?? "recommended";
  return {
    q: one(sp.q)?.slice(0, 80),
    purpose: parsePurpose(one(sp.purpose)),
    types: many(sp.type),
    county: one(sp.county),
    town: one(sp.town),
    category: one(sp.category),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    beds: num(sp.beds),
    baths: num(sp.baths),
    minSize: num(sp.minSize),
    maxSize: num(sp.maxSize),
    amenities: many(sp.amenities),
    furnished: one(sp.furnished) === "yes" ? "yes" : one(sp.furnished) === "no" ? "no" : undefined,
    verified: one(sp.verified) === "1",
    minRating: num(sp.minRating),
    media: one(sp.media) === "1",
    posted: num(sp.posted),
    sort: ["recommended", "newest", "price_asc", "price_desc", "rating", "popular"].includes(sort) ? sort : "recommended",
    page: Math.max(1, Math.min(500, Math.floor(num(sp.page) ?? 1))),
    view: view === "list" || view === "map" ? view : "grid",
  };
}

export function buildWhere(f: SearchFilters): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [publicWhere()];
  if (f.q) {
    const contains = { contains: f.q, mode: "insensitive" as const };
    and.push({
      OR: [{ title: contains }, { estate: contains }, { town: { name: contains } }, { county: { name: contains } }, { type: { name: contains } }],
    });
  }
  if (f.purpose) and.push({ purpose: f.purpose });
  if (f.types.length) and.push({ type: { slug: { in: f.types } } });
  if (f.county) and.push({ county: { slug: f.county } });
  if (f.town) and.push({ town: { slug: f.town } });
  if (f.category) and.push({ categories: { some: { slug: f.category } } });
  if (f.minPrice != null || f.maxPrice != null) and.push({ price: { gte: f.minPrice, lte: f.maxPrice } });
  if (f.beds) and.push({ bedrooms: { gte: f.beds } });
  if (f.baths) and.push({ bathrooms: { gte: f.baths } });
  if (f.minSize != null || f.maxSize != null) and.push({ size: { gte: f.minSize, lte: f.maxSize } });
  for (const a of f.amenities) and.push({ amenities: { some: { slug: a } } });
  if (f.furnished) and.push({ furnished: f.furnished === "yes" });
  if (f.verified) and.push({ lister: { verified: true } });
  if (f.minRating) and.push({ ratingAvg: { gte: f.minRating } });
  if (f.media) and.push({ OR: [{ videoUrl: { not: null } }, { tourUrl: { not: null } }] });
  if (f.posted) and.push({ publishedAt: { gte: new Date(Date.now() - f.posted * 86400_000) } });
  return { AND: and };
}

export function buildOrderBy(sort: string): Prisma.PropertyOrderByWithRelationInput[] {
  // Verified listers rank higher in every relevance-style sort.
  switch (sort) {
    case "newest":
      return [{ publishedAt: "desc" }, { lister: { verified: "desc" } }];
    case "price_asc":
      return [{ price: "asc" }, { lister: { verified: "desc" } }];
    case "price_desc":
      return [{ price: "desc" }, { lister: { verified: "desc" } }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { lister: { verified: "desc" } }];
    case "popular":
      return [{ views: "desc" }, { lister: { verified: "desc" } }];
    default:
      return [{ featured: "desc" }, { lister: { verified: "desc" } }, { publishedAt: "desc" }];
  }
}

/** Rebuilds a query string from params, overriding/removing keys. */
export function withParams(sp: SearchParams, changes: Record<string, string | number | null | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    for (const s of Array.isArray(v) ? v : [v]) if (s !== "") u.append(k, s);
  }
  for (const [k, v] of Object.entries(changes)) {
    u.delete(k);
    if (v != null && v !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** Human summary of a saved search, e.g. "3+ bed Apartments for rent in Kilimani". */
export function describeFilters(f: SearchFilters, names: { type?: string; county?: string; town?: string }) {
  const parts: string[] = [];
  if (f.beds) parts.push(`${f.beds}+ bed`);
  parts.push(names.type ?? "Properties");
  if (f.purpose) parts.push(f.purpose === "SALE" ? "for sale" : f.purpose === "RENT" ? "for rent" : f.purpose === "SHORT_STAY" ? "short stay" : "off-plan");
  if (names.town || names.county) parts.push(`in ${names.town ?? names.county}`);
  if (f.q) parts.push(`matching "${f.q}"`);
  return parts.join(" ");
}
