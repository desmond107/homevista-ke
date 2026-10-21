import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/permissions";
import { appUrl } from "@/lib/notify";
import { dateLabel } from "@/lib/format";
import { Markdown, readingMinutes } from "@/lib/markdown";
import { ShareButtons } from "@/components/ShareButtons";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await prisma.blogPost.findUnique({ where: { slug: (await params).slug } });
  if (!p) return { title: "Article not found" };
  return { title: p.title, description: p.excerpt, openGraph: { type: "article", title: p.title, description: p.excerpt, images: p.coverUrl ? [p.coverUrl] : [], publishedTime: p.publishedAt?.toISOString() } };
}

export default async function BlogPostPage({ params }: Props) {
  const p = await prisma.blogPost.findUnique({ where: { slug: (await params).slug } });
  if (!p || (!p.published && !hasAdminPermission(await getUser(), "content"))) notFound();
  const more = await prisma.blogPost.findMany({ where: { published: true, id: { not: p.id } }, orderBy: { publishedAt: "desc" }, take: 3 });
  const url = `${appUrl()}/blog/${p.slug}`;
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.excerpt, image: p.coverUrl ?? undefined, datePublished: p.publishedAt?.toISOString(), dateModified: p.updatedAt.toISOString(), author: { "@type": "Organization", name: p.author }, publisher: { "@type": "Organization", name: "HomeVista Ke" } };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="container-x max-w-3xl pt-12 pb-8 text-center">
        <Link href="/blog" className="eyebrow">Insights</Link>
        <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
        <p className="mt-4 text-sm text-muted">{p.author} · {dateLabel(p.publishedAt)} · {readingMinutes(p.body)} min read</p>
      </header>
      {p.coverUrl && (
        <div className="container-x max-w-5xl">
          <div className="relative aspect-[16/8] overflow-hidden rounded-[var(--radius-card)]"><Image src={p.coverUrl} alt="" fill priority sizes="(min-width:1024px) 1000px, 100vw" className="object-cover" /></div>
        </div>
      )}
      <div className="container-x max-w-3xl py-12">
        <div className="prose-hv text-base"><Markdown source={p.body} /></div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <div className="flex flex-wrap gap-1.5">{p.tags.map((t) => <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="chip hover:border-gold">{t}</Link>)}</div>
          <ShareButtons url={url} title={p.title} />
        </div>
      </div>
      {more.length > 0 && (
        <section className="bg-bg-alt py-14">
          <div className="container-x">
            <h2 className="mb-6 text-2xl">Keep reading</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {more.map((m) => (
                <Link key={m.id} href={`/blog/${m.slug}`} className="card group p-5"><p className="eyebrow mb-2">{m.tags[0]}</p><h3 className="text-lg group-hover:text-gold-deep">{m.title}</h3><p className="mt-2 line-clamp-2 text-sm text-ink-2">{m.excerpt}</p></Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
