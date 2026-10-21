import { requireLister } from "@/lib/auth";
import { listingFormOptions } from "@/lib/listing-options";
import { DashHeader } from "@/components/DashShell";
import { ListingForm } from "@/components/ListingForm";

export const metadata = { title: "New listing" };

export default async function NewListingPage() {
  await requireLister();
  const opts = await listingFormOptions();
  return (
    <>
      <DashHeader title="New listing" intro="Great photos and an honest description get more unlocks. You can save a draft at any time." />
      <ListingForm initial={{}} {...opts} />
    </>
  );
}
