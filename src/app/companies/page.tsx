import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { Monogram, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Real Estate Companies in Kenya",
  description: "Verified real estate agencies and developers in Nairobi, Mombasa, Kisumu, Nakuru and across Kenya.",
};

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string }> }) {
  const sp = await searchParams;
  const companies = await prisma.company.findMany({
    where: {
      ...(sp.q ? { name: { contains: sp.q, mode: "insensitive" } } : {}),
      ...(sp.area ? { areasServed: { has: sp.area } } : {}),
    },
    orderBy: [{ featured: "desc" }, { verified: "desc" }, { name: "asc" }],
    include: { _count: { select: { realtors: true } } },
  });
  const areas = [...new Set((await prisma.company.findMany({ select: { areasServed: true } })).flatMap((c) => c.areasServed))].sort();
  return (
    <>
      <PageHeader eyebrow="Directory" title="Real estate companies" intro="Established agencies and developers with verified registration — ready to help you buy, rent, sell or invest." />
      <div className="container-x py-12">
        <form className="mb-8 flex flex-wrap gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Search companies…" className="input !w-64" />
          <select name="area" defaultValue={sp.area ?? ""} className="input !w-52">
            <option value="">All areas</option>
            {areas.map((a) => <option key={a}>{a}</option>)}
          </select>
          <button className="btn-primary">Search</button>
        </form>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((c) => (
            <Link key={c.id} href={`/companies/${c.slug}`} className="group overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
              <div className="relative h-36 bg-navy">
                {c.coverUrl && <Image src={c.coverUrl} alt="" fill sizes="(min-width:1280px) 33vw, 50vw" className="object-cover opacity-70 transition duration-700 group-hover:scale-105" />}
                <div className="absolute -bottom-7 left-5">{c.logoUrl ? <Image src={c.logoUrl} alt="" width={60} height={60} className="h-15 w-15 rounded-2xl border-2 border-surface object-cover" /> : <Monogram name={c.name} size={60} className="border-2 !border-surface" />}</div>
              </div>
              <div className="p-5 pt-10">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl text-ink">{c.name}</h2>
                  {c.verified && <BadgeCheck size={18} className="fill-gold text-surface" aria-label="Verified" />}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-2">{c.description}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><MapPin size={13} /> {c.areasServed.slice(0, 3).join(", ")}</span>
                  <span className="inline-flex items-center gap-1"><Users size={13} /> {c._count.realtors} realtors</span>
                </div>
              </div>
            </Link>
          ))}
          {!companies.length && <p className="text-sm text-muted">No companies match.</p>}
        </div>
      </div>
    </>
  );
}
