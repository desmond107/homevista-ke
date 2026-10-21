import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { cardSelect, publicWhere, savedSet } from "@/lib/listings";
import { prettyPhone } from "@/lib/format";
import { PropertyCard } from "@/components/PropertyCard";
import { Monogram, Stars, VerifiedBadge } from "@/components/ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await prisma.company.findUnique({ where: { slug: (await params).slug } });
  return c ? { title: c.name, description: c.description.slice(0, 160) } : { title: "Company not found" };
}

export default async function CompanyPage({ params }: Props) {
  const c = await prisma.company.findUnique({ where: { slug: (await params).slug }, include: { realtors: { orderBy: { rating: "desc" } } } });
  if (!c) notFound();
  const listerIds = c.realtors.map((r) => r.listerId).filter((x): x is string => !!x);
  const [user, listings] = await Promise.all([
    getUser(),
    listerIds.length ? prisma.property.findMany({ where: { ...publicWhere(), listerId: { in: listerIds } }, select: cardSelect, orderBy: { publishedAt: "desc" }, take: 9 }) : [],
  ]);
  const saved = await savedSet(user?.id, listings.map((l) => l.id));
  const jsonLd = { "@context": "https://schema.org", "@type": "RealEstateAgent", name: c.name, description: c.description, url: c.website ?? undefined, telephone: c.phone ? `+${c.phone}` : undefined, email: c.email ?? undefined, address: c.address ?? undefined, areaServed: c.areasServed };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative h-64 bg-navy sm:h-80">
        {c.coverUrl && <Image src={c.coverUrl} alt="" fill priority sizes="100vw" className="object-cover opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-navy to-transparent" />
      </section>
      <div className="container-x -mt-20 relative">
        <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-8">
          {c.logoUrl ? <Image src={c.logoUrl} alt="" width={96} height={96} className="h-24 w-24 rounded-2xl object-cover" /> : <Monogram name={c.name} size={96} />}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl sm:text-4xl">{c.name}</h1>{c.verified && <VerifiedBadge size="md" />}</div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2"><MapPin size={14} className="text-gold-deep" /> {c.address}{c.foundedYear ? ` · Since ${c.foundedYear}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.phone && <a href={`tel:+${c.phone}`} className="btn-primary"><Phone size={15} /> {prettyPhone(c.phone)}</a>}
            {c.email && <a href={`mailto:${c.email}`} className="btn-outline"><Mail size={15} /> Email</a>}
            {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="btn-outline"><Globe size={15} /> Website</a>}
          </div>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="mb-3 text-2xl">About</h2>
            <p className="text-[15px] leading-7 text-ink-2">{c.description}</p>
            <h3 className="mt-6 mb-2 text-lg">Areas served</h3>
            <div className="flex flex-wrap gap-2">{c.areasServed.map((a) => <Link key={a} href={`/properties?q=${encodeURIComponent(a)}`} className="chip hover:border-gold">{a}</Link>)}</div>
          </div>
          <aside>
            <h2 className="mb-3 text-2xl">Our realtors</h2>
            <ul className="space-y-3">
              {c.realtors.map((r) => (
                <li key={r.id}>
                  <Link href={`/realtors/${r.slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-gold">
                    {r.photoUrl && <Image src={r.photoUrl} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />}
                    <span><span className="block text-sm font-medium text-ink">{r.name}</span><span className="flex items-center gap-1 text-xs text-muted"><Stars value={r.rating} size={11} /> {r.rating.toFixed(1)}</span></span>
                  </Link>
                </li>
              ))}
              {!c.realtors.length && <li className="text-sm text-muted">No realtors listed yet.</li>}
            </ul>
          </aside>
        </div>
        {listings.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-3xl">Listings by {c.name}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{listings.map((p) => <PropertyCard key={p.id} p={p} saved={saved.has(p.id)} signedIn={!!user} />)}</div>
          </section>
        )}
      </div>
    </>
  );
}
