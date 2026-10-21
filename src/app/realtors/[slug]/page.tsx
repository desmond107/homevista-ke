import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Briefcase, Mail, MapPin, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { cardSelect, publicWhere, savedSet } from "@/lib/listings";
import { prettyPhone } from "@/lib/format";
import { PropertyCard } from "@/components/PropertyCard";
import { Stars, VerifiedBadge } from "@/components/ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await prisma.realtor.findUnique({ where: { slug: (await params).slug } });
  return r ? { title: `${r.name} — Realtor`, description: r.bio.slice(0, 160), openGraph: { images: r.photoUrl ? [r.photoUrl] : [] } } : { title: "Realtor not found" };
}

export default async function RealtorPage({ params }: Props) {
  const r = await prisma.realtor.findUnique({ where: { slug: (await params).slug }, include: { company: true } });
  if (!r) notFound();
  const [user, listings] = await Promise.all([
    getUser(),
    r.listerId ? prisma.property.findMany({ where: { ...publicWhere(), listerId: r.listerId }, select: cardSelect, orderBy: { publishedAt: "desc" }, take: 9 }) : [],
  ]);
  const saved = await savedSet(user?.id, listings.map((l) => l.id));
  const jsonLd = { "@context": "https://schema.org", "@type": "RealEstateAgent", name: r.name, image: r.photoUrl ?? undefined, description: r.bio, telephone: r.phone ? `+${r.phone}` : undefined, worksFor: r.company ? { "@type": "Organization", name: r.company.name } : undefined, aggregateRating: r.ratingCount ? { "@type": "AggregateRating", ratingValue: r.rating, reviewCount: r.ratingCount } : undefined };
  return (
    <div className="container-x py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-6 text-xs text-muted"><Link href="/realtors" className="hover:text-ink">Our realtors</Link> / <span className="text-ink-2">{r.name}</span></nav>
      <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-bg-alt">{r.photoUrl && <Image src={r.photoUrl} alt={r.name} fill priority sizes="(min-width:1024px) 360px, 100vw" className="object-cover" />}</div>
        <div>
          <p className="eyebrow mb-2">{r.company ? <Link href={`/companies/${r.company.slug}`} className="hover:underline">{r.company.name}</Link> : "Independent realtor"}</p>
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-4xl sm:text-5xl">{r.name}</h1>{r.verified && <VerifiedBadge size="md" />}</div>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-2"><Stars value={r.rating} size={16} /> {r.rating.toFixed(1)} from {r.ratingCount} clients</p>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-ink-2">{r.bio}</p>
          <dl className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
            {r.yearsExperience != null && <div className="flex gap-3"><Briefcase size={18} className="mt-0.5 text-gold-deep" /><div><dt className="text-xs text-muted">Experience</dt><dd className="text-sm text-ink">{r.yearsExperience} years</dd></div></div>}
            {r.earbNumber && <div className="flex gap-3"><Award size={18} className="mt-0.5 text-gold-deep" /><div><dt className="text-xs text-muted">EARB registration</dt><dd className="text-sm text-ink">{r.earbNumber}</dd></div></div>}
            {r.areas.length > 0 && <div className="flex gap-3 sm:col-span-2"><MapPin size={18} className="mt-0.5 text-gold-deep" /><div><dt className="text-xs text-muted">Areas</dt><dd className="text-sm text-ink">{r.areas.join(" · ")}</dd></div></div>}
          </dl>
          <div className="mt-5 flex flex-wrap gap-1.5">{r.specialties.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          <div className="mt-8 flex flex-wrap gap-2">
            {r.phone && <a href={`tel:+${r.phone}`} className="btn-primary"><Phone size={15} /> {prettyPhone(r.phone)}</a>}
            {r.phone && <a href={`https://wa.me/${r.phone}`} target="_blank" rel="noopener noreferrer" className="btn bg-[#25d366] text-white">WhatsApp</a>}
            {r.email && <a href={`mailto:${r.email}`} className="btn-outline"><Mail size={15} /> Email</a>}
          </div>
        </div>
      </div>
      {listings.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-3xl">Listings by {r.name.split(" ")[0]}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{listings.map((p) => <PropertyCard key={p.id} p={p} saved={saved.has(p.id)} signedIn={!!user} />)}</div>
        </section>
      )}
    </div>
  );
}
