import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, KeyRound, Quote, Search, Smartphone } from "lucide-react";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { cardSelect, publicWhere, savedSet } from "@/lib/listings";
import { getSettings } from "@/lib/settings";
import { HeroSearch } from "@/components/HeroSearch";
import { PropertyCard } from "@/components/PropertyCard";
import { AdSlot } from "@/components/AdSlot";
import { DynIcon } from "@/components/DynIcon";
import { Monogram, SectionHeading, Stars, VerifiedBadge } from "@/components/ui";
import { kes, plural } from "@/lib/format";


const HERO = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2400&q=80";

export default async function HomePage() {
  const where = publicWhere();
  const [user, settings, featured, latest, types, counties, realtors, companies, testimonials, categories, stats] = await Promise.all([
    getUser(),
    getSettings(),
    prisma.property.findMany({ where: { ...where, featured: true }, select: cardSelect, orderBy: [{ featuredRank: "desc" }, { publishedAt: "desc" }], take: 6 }),
    prisma.property.findMany({ where, select: cardSelect, orderBy: { publishedAt: "desc" }, take: 6 }),
    prisma.propertyType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { properties: { where } } } } }),
    prisma.county.findMany({ where: { popular: true }, orderBy: { name: "asc" }, include: { _count: { select: { properties: { where } } } } }),
    prisma.realtor.findMany({ where: { featured: true }, orderBy: [{ verified: "desc" }, { rating: "desc" }], take: 4, include: { company: { select: { name: true } } } }),
    prisma.company.findMany({ orderBy: [{ featured: "desc" }, { verified: "desc" }, { name: "asc" }], take: 6 }),
    prisma.testimonial.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { properties: { where } } } } }),
    Promise.all([prisma.property.count({ where }), prisma.listerProfile.count({ where: { verified: true } }), prisma.county.count({ where: { properties: { some: where } } })]),
  ]);
  const saved = await savedSet(user?.id, [...featured, ...latest].map((p) => p.id));
  const [listingCount, verifiedCount, countyCount] = stats;

  return (
    <>
      {/* ── Hero */}
      <section className="relative isolate overflow-hidden bg-navy">
        <Image src={HERO} alt="A modern luxury home with pool at dusk" fill priority sizes="100vw" className="-z-10 object-cover" />
        {/* Darker behind the text (left and bottom), clearer photo on the right. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/95 via-navy/75 to-navy/30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-transparent to-navy/40" />
        <div className="container-x flex min-h-[640px] flex-col justify-center pt-20 pb-16 sm:min-h-[700px]">
          <p className="animate-rise mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-navy/60 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-gold uppercase backdrop-blur-sm sm:text-[11px] sm:tracking-[0.22em]">
            <BadgeCheck size={14} /> Kenya&apos;s verified property marketplace
          </p>
          <h1 className="animate-rise max-w-3xl text-[44px] leading-[1.05] text-white drop-shadow-[0_2px_12px_rgb(0_0_0/0.35)] [animation-delay:80ms] sm:text-6xl lg:text-7xl">
            Find Your Vista.
            <br />
            <span className="text-gold italic">Find Your Home.</span>
          </h1>
          <p className="animate-rise mt-5 max-w-xl text-base leading-relaxed text-white/95 [animation-delay:160ms] sm:text-xl">
            Homes, apartments, land and commercial spaces across Kenya, listed by verified landlords, agents and developers.
          </p>
          <div className="animate-rise mt-9 [animation-delay:240ms]">
            <HeroSearch
              counties={(await prisma.county.findMany({ orderBy: { name: "asc" }, include: { towns: { orderBy: { name: "asc" }, select: { name: true, slug: true } } } })).map((c) => ({ name: c.name, slug: c.slug, towns: c.towns }))}
              types={types.map((t) => ({ name: t.name, slug: t.slug }))}
            />
          </div>
          <dl className="animate-rise mt-12 grid max-w-2xl grid-cols-3 gap-6 [animation-delay:320ms]">
            {[
              [listingCount.toLocaleString(), "Live listings"],
              [verifiedCount.toLocaleString(), "Verified listers"],
              [countyCount.toLocaleString(), "Counties covered"],
            ].map(([v, l]) => (
              <div key={l} className="border-l-2 border-gold/70 pl-4">
                <dt className="text-xs font-medium text-white/85 sm:text-sm">{l}</dt>
                <dd className="font-serif text-3xl text-white sm:text-4xl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-x -mt-2 pt-10">
        <AdSlot placement="HOME_HERO" variant="hero" />
      </div>

      {/* ── Featured */}
      <section className="container-x py-20">
        <SectionHeading
          eyebrow="Featured residences"
          title={<>Exceptional homes, <span className="text-gold-deep italic">carefully chosen</span></>}
          intro="A rotating selection of standout properties from our verified listers."
          action={
            <Link href="/properties?sort=recommended" className="btn-outline">
              View all <ArrowRight size={16} />
            </Link>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => (
            <PropertyCard key={p.id} p={p} saved={saved.has(p.id)} signedIn={!!user} priority={i < 3} />
          ))}
        </div>
      </section>

      {/* ── Browse by type */}
      <section className="bg-bg-alt py-20">
        <div className="container-x">
          <SectionHeading eyebrow="Browse by type" title="Whatever you're looking for" center />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {types.map((t) => (
              <Link key={t.id} href={`/properties?type=${t.slug}`} className="group flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-6 text-center transition hover:-translate-y-0.5 hover:border-gold hover:shadow-soft">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold-deep transition group-hover:bg-navy group-hover:text-gold">
                  <DynIcon name={t.icon} size={22} strokeWidth={1.6} />
                </span>
                <span className="text-sm font-medium text-ink">{t.name}</span>
                <span className="-mt-2 text-xs text-muted">{plural(t._count.properties, "listing")}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular locations */}
      <section className="container-x py-20">
        <SectionHeading eyebrow="Popular locations" title={<>Explore Kenya, <span className="text-gold-deep italic">county by county</span></>} />
        <div className="grid auto-rows-[200px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...counties].sort((a, b) => b._count.properties - a._count.properties).slice(0, 5).map((c, i) => (
            <Link
              key={c.id}
              href={`/properties?county=${c.slug}`}
              className={`group relative overflow-hidden rounded-[var(--radius-card)] bg-navy ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}
            >
              {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-90" />}
              <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
              <div className="absolute bottom-0 p-5">
                <p className={`font-serif text-white ${i === 0 ? "text-4xl" : "text-2xl"}`}>{c.name}</p>
                <p className="mt-1 text-sm text-white/75">{plural(c._count.properties, "property", "properties")} →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Collections */}
      <section className="container-x pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link key={c.id} href={`/properties?category=${c.slug}`} className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-3 pr-5 transition hover:border-gold hover:shadow-soft">
              <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-bg-alt">
                {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="96px" className="object-cover transition duration-500 group-hover:scale-110" />}
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-lg text-ink">{c.name}</span>
                <span className="line-clamp-1 text-xs text-muted">{c.description}</span>
                <span className="mt-1 block text-xs font-medium text-gold-deep">{plural(c._count.properties, "home")}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works */}
      <section className="relative overflow-hidden bg-navy py-20 text-on-navy">
        <div className="container-x">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-gold uppercase">How it works</p>
            <h2 className="text-3xl text-white sm:text-4xl">Direct, safe and refreshingly simple</h2>
            <p className="mt-3 text-on-navy/70">No viewing fees. No fake agents. Browse freely, and pay a small fee only when you&apos;re ready to talk to the lister.</p>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              { icon: <Search size={22} />, title: "Browse for free", body: "Search thousands of homes with photos, prices, amenities and honest reviews — no account needed." },
              { icon: <KeyRound size={22} />, title: `Unlock for ${kes(settings.unlockPrice)}`, body: "Pay once via M-Pesa to reveal the exact location, map pin and the lister's phone, WhatsApp and email. Yours forever." },
              { icon: <Smartphone size={22} />, title: "Call, view, move in", body: "Contact the lister directly, book a viewing and leave a Verified Viewer review to help others." },
            ].map((s, i) => (
              <li key={s.title} className="rounded-[var(--radius-card)] border border-white/10 bg-white/[0.03] p-7">
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-[#0c1a2e]">{s.icon}</span>
                  <span className="font-serif text-5xl text-white/10">0{i + 1}</span>
                </div>
                <h3 className="text-xl text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-navy/70">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-[var(--radius-card)] border border-gold/30 bg-gradient-to-r from-gold/15 to-transparent p-7 sm:flex-row sm:items-center">
            <div>
              <p className="font-serif text-2xl text-white">Are you a landlord, agent or developer?</p>
              <p className="mt-1 text-sm text-on-navy/70">
                List unlimited properties for {kes(settings.subscriptionPrice)} a month. Get verified, earn the gold badge and rank higher.
              </p>
            </div>
            <Link href="/register?as=lister" className="btn-gold shrink-0">
              Start listing <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Latest */}
      <section className="container-x py-20">
        <SectionHeading
          eyebrow="Just listed"
          title="Fresh on the market"
          action={
            <Link href="/properties?sort=newest" className="btn-outline">
              See newest <ArrowRight size={16} />
            </Link>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.slice(0, 3).map((p) => (
            <PropertyCard key={p.id} p={p} saved={saved.has(p.id)} signedIn={!!user} />
          ))}
        </div>
        <AdSlot placement="BETWEEN_LISTINGS" className="my-8" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.slice(3).map((p) => (
            <PropertyCard key={p.id} p={p} saved={saved.has(p.id)} signedIn={!!user} />
          ))}
        </div>
      </section>

      {/* ── Realtors */}
      <section className="bg-bg-alt py-20">
        <div className="container-x">
          <SectionHeading
            eyebrow="Verified realtors"
            title={<>Work with <span className="text-gold-deep italic">trusted professionals</span></>}
            action={
              <Link href="/realtors" className="btn-outline">
                All realtors <ArrowRight size={16} />
              </Link>
            }
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {realtors.map((r) => (
              <Link key={r.id} href={`/realtors/${r.slug}`} className="group overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                <div className="relative aspect-[4/4] bg-bg-alt">
                  {r.photoUrl && <Image src={r.photoUrl} alt={r.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-xl text-ink">{r.name}</p>
                    {r.verified && <VerifiedBadge size="xs" label={false} />}
                  </div>
                  <p className="text-xs text-muted">{r.company?.name ?? "Independent realtor"}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-ink-2">
                    <Stars value={r.rating} size={13} /> {r.rating.toFixed(1)} <span className="text-muted">({r.ratingCount})</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Companies */}
      <section className="container-x py-20">
        <SectionHeading
          eyebrow="Partner companies"
          title="Kenya's leading real estate firms"
          center
          intro="Agencies and developers with verified registration, ready to help you buy, rent or invest."
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {companies.map((c) => (
            <Link key={c.id} href={`/companies/${c.slug}`} className="group flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-center transition hover:border-gold hover:shadow-soft">
              {c.logoUrl ? <Image src={c.logoUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl object-cover" /> : <Monogram name={c.name} />}
              <span className="text-sm leading-tight font-medium text-ink">{c.name}</span>
              {c.verified && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gold-deep">
                  <BadgeCheck size={13} /> Verified
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Testimonials */}
      <section className="bg-bg-alt py-20">
        <div className="container-x">
          <SectionHeading eyebrow="Testimonials" title="Loved by seekers and listers" center />
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure key={t.id} className="card relative p-8">
                <Quote size={36} className="absolute top-6 right-6 text-gold/25" />
                <blockquote className="font-serif text-xl leading-relaxed text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  {t.avatarUrl && <Image src={t.avatarUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />}
                  <span>
                    <span className="block text-sm font-semibold text-ink">{t.name}</span>
                    <span className="block text-xs text-muted">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
