import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Globe, Home, Lock, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { cardSelect, publicWhere, savedSet } from "@/lib/listings";
import { LISTER_TYPE_LABELS } from "@/lib/constants";
import { PropertyCard } from "@/components/PropertyCard";
import { Avatar, EmptyState, VerifiedBadge } from "@/components/ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await prisma.listerProfile.findUnique({ where: { slug: (await params).slug } });
  return l ? { title: `${l.displayName} — ${LISTER_TYPE_LABELS[l.type]}`, description: l.bio?.slice(0, 160) ?? `Properties listed by ${l.displayName} on HomeVista Ke.` } : { title: "Lister not found" };
}

export default async function ListerProfilePage({ params }: Props) {
  const l = await prisma.listerProfile.findUnique({ where: { slug: (await params).slug }, include: { user: { select: { avatarUrl: true, status: true } }, realtor: { select: { slug: true } } } });
  if (!l || l.user.status === "BANNED") notFound();
  const [user, listings, rating] = await Promise.all([
    getUser(),
    prisma.property.findMany({ where: { ...publicWhere(), listerId: l.id }, select: cardSelect, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }] }),
    prisma.review.aggregate({ where: { property: { listerId: l.id }, status: "PUBLISHED" }, _avg: { rating: true }, _count: true }),
  ]);
  const saved = await savedSet(user?.id, listings.map((x) => x.id));
  return (
    <div className="container-x py-10 sm:py-14">
      <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar name={l.displayName} src={l.logoUrl ?? l.user.avatarUrl} size={96} />
        <div className="flex-1">
          <p className="eyebrow mb-1">{LISTER_TYPE_LABELS[l.type]}</p>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl sm:text-4xl">{l.displayName}</h1>{l.verified && <VerifiedBadge size="md" />}</div>
          {l.bio && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-2">{l.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><Home size={13} /> {listings.length} live listings</span>
            {rating._count > 0 && <span className="inline-flex items-center gap-1"><Star size={13} className="fill-gold text-gold" /> {(rating._avg.rating ?? 0).toFixed(1)} from {rating._count} reviews</span>}
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> Member since {l.createdAt.getFullYear()}</span>
            {l.website && <a href={l.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:text-ink"><Globe size={13} /> Website</a>}
            {l.realtor && <Link href={`/realtors/${l.realtor.slug}`} className="link">Realtor profile</Link>}
          </div>
        </div>
        <p className="flex max-w-[220px] items-start gap-2 rounded-2xl bg-bg-alt p-4 text-xs text-ink-2"><Lock size={14} className="mt-0.5 shrink-0 text-gold-deep" /> Contact details are shared when you unlock one of {l.displayName.split(" ")[0]}&apos;s properties.</p>
      </div>
      <h2 className="mt-12 mb-6 text-3xl">Properties</h2>
      {listings.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{listings.map((p) => <PropertyCard key={p.id} p={p} saved={saved.has(p.id)} signedIn={!!user} />)}</div>
      ) : (
        <EmptyState icon={<Home size={24} />} title="No live listings right now" body="Check back soon, or browse similar homes." action={<Link href="/properties" className="btn-primary">Browse properties</Link>} />
      )}
    </div>
  );
}
