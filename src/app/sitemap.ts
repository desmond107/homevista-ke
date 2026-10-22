import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { publicWhere } from "@/lib/listings";
import { appUrl } from "@/lib/notify";

// Built on first request (then cached for an hour) so `next build` never needs the database.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const [properties, posts, companies, realtors, listers, counties, types] = await Promise.all([
    prisma.property.findMany({ where: publicWhere(), select: { slug: true, updatedAt: true }, take: 45000 }),
    prisma.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.company.findMany({ select: { slug: true } }),
    prisma.realtor.findMany({ select: { slug: true } }),
    prisma.listerProfile.findMany({ where: { listings: { some: publicWhere() } }, select: { slug: true } }),
    prisma.county.findMany({ select: { slug: true } }),
    prisma.propertyType.findMany({ where: { active: true }, select: { slug: true } }),
  ]);
  const staticPages = ["", "/properties", "/realtors", "/companies", "/blog", "/about", "/contact", "/faq", "/terms", "/privacy"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 })),
    ...["for-sale", "for-rent", "short-stay", "off-plan"].map((p) => ({ url: `${base}/properties?purpose=${p}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...counties.map((c) => ({ url: `${base}/properties?county=${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...types.map((t) => ({ url: `${base}/properties?type=${t.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...properties.map((p) => ({ url: `${base}/properties/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    ...companies.map((c) => ({ url: `${base}/companies/${c.slug}`, priority: 0.5 })),
    ...realtors.map((r) => ({ url: `${base}/realtors/${r.slug}`, priority: 0.5 })),
    ...listers.map((l) => ({ url: `${base}/listers/${l.slug}`, priority: 0.4 })),
  ];
}
