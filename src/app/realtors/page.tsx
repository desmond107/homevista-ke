import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Stars, VerifiedBadge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Our Realtors — Verified Real Estate Agents in Kenya",
  description: "Find EARB-registered realtors and trusted agents across Kenya, with ratings, specialties and areas served.",
};

export default async function RealtorsPage({ searchParams }: { searchParams: Promise<{ q?: string; specialty?: string }> }) {
  const sp = await searchParams;
  const realtors = await prisma.realtor.findMany({
    where: {
      ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { areas: { has: sp.q } }] } : {}),
      ...(sp.specialty ? { specialties: { has: sp.specialty } } : {}),
    },
    orderBy: [{ featured: "desc" }, { verified: "desc" }, { rating: "desc" }],
    include: { company: { select: { name: true, slug: true } } },
  });
  const specialties = [...new Set((await prisma.realtor.findMany({ select: { specialties: true } })).flatMap((r) => r.specialties))].sort();
  return (
    <>
      <PageHeader eyebrow="Our realtors" title={<>Trusted professionals, <span className="text-gold italic">verified</span></>} intro="Work with experienced, EARB-registered realtors who know their neighbourhoods inside out." />
      <div className="container-x py-12">
        <form className="mb-8 flex flex-wrap gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Name or area (e.g. Karen)" className="input !w-64" />
          <select name="specialty" defaultValue={sp.specialty ?? ""} className="input !w-56">
            <option value="">All specialties</option>
            {specialties.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn-primary">Search</button>
        </form>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {realtors.map((r) => (
            <Link key={r.id} href={`/realtors/${r.slug}`} className="group overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
              <div className="relative aspect-square bg-bg-alt">{r.photoUrl && <Image src={r.photoUrl} alt={r.name} fill sizes="(min-width:1280px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />}</div>
              <div className="p-5">
                <div className="flex items-center gap-2"><h2 className="font-serif text-xl text-ink">{r.name}</h2>{r.verified && <VerifiedBadge size="xs" label={false} />}</div>
                <p className="text-xs text-muted">{r.company?.name ?? "Independent realtor"}{r.yearsExperience ? ` · ${r.yearsExperience} yrs` : ""}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-2"><Stars value={r.rating} size={13} /> {r.rating.toFixed(1)} <span className="text-muted">({r.ratingCount})</span></p>
                <div className="mt-3 flex flex-wrap gap-1">{r.specialties.slice(0, 3).map((s) => <span key={s} className="chip !text-[11px]">{s}</span>)}</div>
              </div>
            </Link>
          ))}
          {!realtors.length && <p className="text-sm text-muted">No realtors match.</p>}
        </div>
      </div>
    </>
  );
}
