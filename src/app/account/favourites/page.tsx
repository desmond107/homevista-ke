import Link from "next/link";
import { Heart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cardSelect, publicWhere } from "@/lib/listings";
import { DashHeader } from "@/components/DashShell";
import { PropertyCard } from "@/components/PropertyCard";
import { EmptyState } from "@/components/ui";

export default async function FavouritesPage() {
  const user = await requireUser("/account/favourites");
  const favs = await prisma.favourite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { ...cardSelect, status: true } } },
  });
  const visible = await prisma.property.findMany({ where: { id: { in: favs.map((f) => f.propertyId) }, ...publicWhere() }, select: { id: true } });
  const live = new Set(visible.map((v) => v.id));
  return (
    <>
      <DashHeader title="Saved homes" intro={`${favs.length} saved. Listings that are no longer available are shown faded.`} />
      {favs.length ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favs.map((f) => (
            <div key={f.propertyId} className={live.has(f.propertyId) ? "" : "opacity-50 grayscale"} title={live.has(f.propertyId) ? undefined : "No longer available"}>
              <PropertyCard p={f.property} saved signedIn />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Heart size={24} />} title="No saved homes yet" body="Tap the heart on any property to keep it here." action={<Link href="/properties" className="btn-primary">Browse properties</Link>} />
      )}
    </>
  );
}
