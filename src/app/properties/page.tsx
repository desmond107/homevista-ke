import type { Metadata } from "next";
import Link from "next/link";
import { Grid3x3, List, Map as MapIcon, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { areaLabel, cardSelect, savedSet } from "@/lib/listings";
import { buildOrderBy, buildWhere, describeFilters, PAGE_SIZE, parseFilters, withParams, type SearchParams } from "@/lib/search";
import { PURPOSE_LABELS } from "@/lib/constants";
import { kesCompact, plural } from "@/lib/format";
import { PropertyCard } from "@/components/PropertyCard";
import { AdSlot } from "@/components/AdSlot";
import { Filters } from "@/components/search/Filters";
import { FilterDrawer, SaveSearchButton, SortSelect } from "@/components/search/SearchControls";
import { MapLoader } from "@/components/search/MapLoader";
import { EmptyState, Pagination, cx } from "@/components/ui";

type Props = { searchParams: Promise<SearchParams> };

async function names(sp: SearchParams) {
  const f = parseFilters(sp);
  const [type, county, town] = await Promise.all([
    f.types[0] ? prisma.propertyType.findUnique({ where: { slug: f.types[0] }, select: { name: true } }) : null,
    f.county ? prisma.county.findUnique({ where: { slug: f.county }, select: { name: true } }) : null,
    f.town ? prisma.town.findFirst({ where: { slug: f.town }, select: { name: true } }) : null,
  ]);
  return { f, type: type?.name, county: county?.name, town: town?.name };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const n = await names(sp);
  const what = n.type ?? "Property";
  const purpose = n.f.purpose ? ` ${PURPOSE_LABELS[n.f.purpose].toLowerCase()}` : "";
  const where = n.town ? ` in ${n.town}` : n.county ? ` in ${n.county}` : " in Kenya";
  const title = `${what}${purpose}${where}`;
  return {
    title,
    description: `Browse ${title.toLowerCase()} on HomeVista Ke — verified listers, real photos and prices in KES.`,
    alternates: { canonical: `/properties${withParams(sp, { page: null, view: null, sort: null })}` },
  };
}

export default async function PropertiesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { f, ...n } = await names(sp);
  const where = buildWhere(f);
  const user = await getUser();

  const [total, results, counties, types, amenities, categories] = await Promise.all([
    prisma.property.count({ where }),
    f.view === "map"
      ? prisma.property.findMany({ where, select: cardSelect, orderBy: buildOrderBy(f.sort), take: 500 })
      : prisma.property.findMany({ where, select: cardSelect, orderBy: buildOrderBy(f.sort), skip: (f.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.county.findMany({ orderBy: { name: "asc" }, include: { towns: { orderBy: { name: "asc" }, select: { name: true, slug: true } } } }),
    prisma.propertyType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
    prisma.amenity.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
  ]);
  const saved = await savedSet(user?.id, results.map((r) => r.id));
  const pages = Math.ceil(total / PAGE_SIZE);
  const heading = describeFilters(f, n);
  const activeCount =
    [f.purpose, f.county, f.town, f.q, f.minPrice, f.maxPrice, f.beds, f.baths, f.minSize, f.maxSize, f.furnished, f.minRating, f.posted, f.category].filter((v) => v != null && v !== "").length +
    f.types.length +
    f.amenities.length +
    (f.verified ? 1 : 0) +
    (f.media ? 1 : 0);

  const filterProps = {
    f,
    counties: counties.map((c) => ({ name: c.name, slug: c.slug, towns: c.towns })),
    types,
    amenities,
    categories,
  };

  return (
    <div className="container-x py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        / <span className="text-ink-2">Properties</span>
      </nav>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl leading-tight sm:text-4xl">{heading}</h1>
          <p className="mt-1.5 text-sm text-ink-2">{plural(total, "property", "properties")} found · verified listers shown first</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDrawer activeCount={activeCount}>
            <Filters {...filterProps} />
          </FilterDrawer>
          <SortSelect value={f.sort} />
          <div className="flex rounded-full border border-line bg-surface p-1" role="group" aria-label="View">
            {(
              [
                ["grid", <Grid3x3 key="g" size={16} />, "Grid view"],
                ["list", <List key="l" size={16} />, "List view"],
                ["map", <MapIcon key="m" size={16} />, "Map view"],
              ] as const
            ).map(([v, icon, label]) => (
              <Link
                key={v}
                href={`/properties${withParams(sp, { view: v === "grid" ? null : v, page: null })}`}
                aria-label={label}
                aria-current={f.view === v ? "true" : undefined}
                className={cx("flex h-8 w-8 items-center justify-center rounded-full transition", f.view === v ? "bg-navy text-on-navy" : "text-ink-2 hover:text-ink")}
              >
                {icon}
              </Link>
            ))}
          </div>
          <SaveSearchButton signedIn={!!user} defaultName={heading} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[290px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto p-5">
            <Filters {...filterProps} />
          </div>
          <div className="mt-6">
            <AdSlot placement="SIDEBAR" variant="tall" />
          </div>
        </aside>

        <section aria-label="Results">
          {total === 0 ? (
            <EmptyState
              icon={<SearchX size={24} />}
              title="No properties match these filters"
              body="Try widening your price range, choosing a nearby area, or removing some amenities."
              action={
                <Link href="/properties" className="btn-primary">
                  Clear all filters
                </Link>
              }
            />
          ) : f.view === "map" ? (
            <>
              <MapLoader
                pins={results
                  .filter((p) => p.approxLat != null && p.approxLng != null)
                  .map((p) => ({ id: p.id, slug: p.slug, title: p.title, price: kesCompact(p.price), lat: p.approxLat!, lng: p.approxLng!, image: p.images[0]?.url, area: areaLabel(p) }))}
              />
              <p className="mt-3 text-xs text-muted">Pins show approximate areas. Unlock a property to see its exact location.</p>
            </>
          ) : (
            <>
              <div className={cx("grid gap-6", f.view === "list" ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3")}>
                {results.map((p, i) => (
                  <div key={p.id} className={cx(i === 6 && "contents")}>
                    {i === 6 && (
                      <div className={cx(f.view === "list" ? "" : "sm:col-span-2 xl:col-span-3")}>
                        <AdSlot placement="BETWEEN_LISTINGS" />
                      </div>
                    )}
                    <PropertyCard p={p} saved={saved.has(p.id)} signedIn={!!user} layout={f.view === "list" ? "list" : "grid"} priority={i < 3} />
                  </div>
                ))}
              </div>
              <Pagination page={f.page} pages={pages} href={(p) => `/properties${withParams(sp, { page: p === 1 ? null : p })}`} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
