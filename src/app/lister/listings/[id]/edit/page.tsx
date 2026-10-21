import { notFound } from "next/navigation";
import { requireLister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listingFormOptions } from "@/lib/listing-options";
import { DashHeader } from "@/components/DashShell";
import { ListingForm } from "@/components/ListingForm";

export const metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireLister();
  const { id } = await params;
  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { select: { id: true } }, categories: { select: { id: true } } },
  });
  if (!p || p.listerId !== user.listerId || p.status === "REMOVED") notFound();
  const opts = await listingFormOptions();
  return (
    <>
      <DashHeader title="Edit listing" intro={p.title} />
      <ListingForm
        {...opts}
        initial={{
          id: p.id,
          title: p.title,
          description: p.description,
          purpose: p.purpose,
          typeId: p.typeId,
          price: p.price,
          pricePeriod: p.pricePeriod,
          countyId: p.countyId,
          townId: p.townId,
          estate: p.estate,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          size: p.size,
          sizeUnit: p.sizeUnit,
          furnished: p.furnished,
          titleDeed: p.titleDeed,
          videoUrl: p.videoUrl,
          tourUrl: p.tourUrl,
          availableFrom: p.availableFrom?.toISOString().slice(0, 10) ?? null,
          amenityIds: p.amenities.map((a) => a.id),
          categoryIds: p.categories.map((c) => c.id),
          images: p.images.map((i) => ({ id: i.id, url: i.url })),
        }}
      />
    </>
  );
}
