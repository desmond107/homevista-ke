import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, KeyRound, ListChecks, Plus, Star } from "lucide-react";
import { requireLister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listerStatus } from "@/lib/lister-data";
import { LISTING_STATUS_LABELS, PURPOSE_LABELS } from "@/lib/constants";
import { priceLabel, timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { EmptyState, Pill, statusTone } from "@/components/ui";
import { ListingActions } from "./ListingActions";

const SAVED_MSG: Record<string, string> = {
  submitted: "Saved and submitted for approval. We usually review new listings within a few hours.",
  draft: "Draft saved. Publish it whenever you're ready.",
  live: "Saved — your listing is live.",
};

export default async function MyListingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; status?: string }> }) {
  const sp = await searchParams;
  const user = await requireLister();
  const [st, listings] = await Promise.all([
    listerStatus(user.listerId),
    prisma.property.findMany({
      where: { listerId: user.listerId, ...(sp.status ? { status: sp.status as never } : {}) },
      orderBy: { updatedAt: "desc" },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, county: { select: { name: true } }, town: { select: { name: true } }, _count: { select: { favourites: true } } },
    }),
  ]);
  return (
    <>
      <DashHeader
        title="My listings"
        intro={st.live ? "Live listings are visible to everyone." : "Your listings are hidden until KYC is approved and your subscription is active."}
        action={
          <Link href="/lister/listings/new" className="btn-gold">
            <Plus size={16} /> Add a listing
          </Link>
        }
      />
      {sp.saved && SAVED_MSG[sp.saved] && <p className="mb-5 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">{SAVED_MSG[sp.saved]}</p>}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {["", "ACTIVE", "PENDING", "PAUSED", "DRAFT", "REJECTED"].map((s) => (
          <Link key={s} href={s ? `/lister/listings?status=${s}` : "/lister/listings"} className={`chip ${sp.status === s || (!sp.status && !s) ? "!border-navy !bg-navy !text-on-navy" : "hover:border-gold"}`}>
            {s ? LISTING_STATUS_LABELS[s] : "All"}
          </Link>
        ))}
      </div>
      {listings.length ? (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-bg-alt sm:w-40">
                {l.images[0] && <Image src={l.images[0].url} alt="" fill sizes="160px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={statusTone(l.status)}>{LISTING_STATUS_LABELS[l.status]}</Pill>
                  <span className="text-xs text-muted">{PURPOSE_LABELS[l.purpose]} · updated {timeAgo(l.updatedAt)}</span>
                  {l.featured && <Pill tone="gold">Featured</Pill>}
                </div>
                <Link href={`/properties/${l.slug}`} className="mt-1 block truncate font-serif text-lg text-ink hover:text-gold-deep">
                  {l.title}
                </Link>
                <p className="text-sm text-ink-2">
                  {priceLabel(l.price, l.pricePeriod)} · {[l.estate, l.town?.name, l.county.name].filter(Boolean).join(", ")}
                </p>
                {l.statusNote && ["REJECTED", "PAUSED", "REMOVED"].includes(l.status) && <p className="mt-1 text-xs text-danger">Moderator note: {l.statusNote}</p>}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><Eye size={13} /> {l.views.toLocaleString()} views</span>
                  <span className="inline-flex items-center gap-1"><KeyRound size={13} /> {l.unlockCount} unlocks</span>
                  <span className="inline-flex items-center gap-1"><Heart size={13} /> {l._count.favourites} saves</span>
                  <span className="inline-flex items-center gap-1"><Star size={13} /> {l.ratingCount ? `${l.ratingAvg.toFixed(1)} (${l.ratingCount})` : "No reviews"}</span>
                </div>
              </div>
              <ListingActions id={l.id} status={l.status} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<ListChecks size={24} />}
          title={sp.status ? "No listings with this status" : "You haven't listed anything yet"}
          body="Add photos, a description and the exact location. You can save a draft and publish later."
          action={<Link href="/lister/listings/new" className="btn-primary">Create your first listing</Link>}
        />
      )}
    </>
  );
}
