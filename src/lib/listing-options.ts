import "server-only";
import { prisma } from "./db";

/** Everything the listing editor's dropdowns need. */
export async function listingFormOptions() {
  const [types, counties, amenities, categories] = await Promise.all([
    prisma.propertyType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.county.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, lat: true, lng: true, towns: { orderBy: { name: "asc" }, select: { id: true, name: true, lat: true, lng: true } } } }),
    prisma.amenity.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return { types, counties, amenities, categories };
}
