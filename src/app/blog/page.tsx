import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { dateLabel } from "@/lib/format";
import { readingMinutes } from "@/lib/markdown";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Insights & Guides", description: "Market reports, buying and renting guides, and investment insights for Kenyan real estate." };

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const sp = await searchParams;
  const posts = await prisma.blogPost.findMany({ where: { published: true, ...(sp.tag ? { tags: { has: sp.tag } } : {}) }, orderBy: { publishedAt: "desc" } });
  const tags = [...new Set((await prisma.blogPost.findMany({ where: { published: true }, select: { tags: true } })).flatMap((p) => p.tags))].sort();
  const [lead, ...rest] = posts;
  return (
    <>
      <PageHeader eyebrow="Insights" title="Guides, market reports & news" intro="Practical advice for buying, renting and investing in Kenyan property." />
      <div className="container-x py-12">
        <div className="mb-8 flex flex-wrap gap-1.5">
          <Link href="/blog" className={`chip ${!sp.tag ? "!border-navy !bg-navy !text-on-navy" : "hover:border-gold"}`}>All</Link>
          {tags.map((t) => <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className={`chip ${sp.tag === t ? "!border-navy !bg-navy !text-on-navy" : "hover:border-gold"}`}>{t}</Link>)}
        </div>
        {lead && (
          <Link href={`/blog/${lead.slug}`} className="group mb-12 grid overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-soft md:grid-cols-2">
            <div className="relative aspect-[16/10] bg-bg-alt md:aspect-auto">{lead.coverUrl && <Image src={lead.coverUrl} alt="" fill priority sizes="50vw" className="object-cover transition duration-700 group-hover:scale-105" />}</div>
            <div className="flex flex-col justify-center p-8">
              <p className="eyebrow mb-3">{lead.tags[0] ?? "Featured"}</p>
              <h2 className="text-3xl leading-tight group-hover:text-gold-deep">{lead.title}</h2>
              <p className="mt-3 text-ink-2">{lead.excerpt}</p>
              <p className="mt-4 text-xs text-muted">{dateLabel(lead.publishedAt)} · {readingMinutes(lead.body)} min read</p>
            </div>
          </Link>
        )}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-bg-alt">{p.coverUrl && <Image src={p.coverUrl} alt="" fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />}</div>
              <p className="eyebrow mt-4 mb-2">{p.tags[0]}</p>
              <h3 className="text-xl leading-snug group-hover:text-gold-deep">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-ink-2">{p.excerpt}</p>
              <p className="mt-2 text-xs text-muted">{dateLabel(p.publishedAt)} · {readingMinutes(p.body)} min read</p>
            </Link>
          ))}
        </div>
        {!posts.length && <p className="text-sm text-muted">No articles yet.</p>}
      </div>
    </>
  );
}
