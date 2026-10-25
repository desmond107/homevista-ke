import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateLabel } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActButton } from "@/components/admin/ActButton";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Pill, cx } from "@/components/ui";
import { deleteContentAction, saveFaqAction, savePageAction, saveTestimonialAction } from "@/app/actions/admin";

const TABS = [
  ["blog", "Blog & news"],
  ["faq", "FAQs"],
  ["pages", "Legal & about pages"],
  ["testimonials", "Testimonials"],
  ["homepage", "Homepage features"],
];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string }> }) {
  await requireAdmin("content");
  const sp = await searchParams;
  const tab = sp.tab ?? "blog";
  return (
    <>
      <DashHeader title="Site content" intro="Blog articles, FAQs, legal pages, testimonials and homepage features." />
      {sp.saved && <p className="mb-4 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">Saved.</p>}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin/content?tab=${k}`} className={cx("chip", tab === k ? "!border-navy !bg-navy !text-on-navy" : "hover:border-gold")}>{l}</Link>
        ))}
      </div>
      {tab === "blog" && <BlogTab />}
      {tab === "faq" && <FaqTab />}
      {tab === "pages" && <PagesTab />}
      {tab === "testimonials" && <TestimonialsTab />}
      {tab === "homepage" && <HomepageTab />}
    </>
  );
}

async function BlogTab() {
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <div className="mb-4 flex justify-end"><Link href="/admin/content/blog/new" className="btn-gold"><Plus size={16} /> New article</Link></div>
      <div className="card overflow-x-auto">
        <table className="table table-stack">
          <thead><tr><th>Title</th><th>Status</th><th>Published</th><th /></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/blog/${p.slug}`} className="font-medium text-ink hover:text-gold-deep">{p.title}</Link><span className="block text-xs text-muted">{p.tags.join(" · ")}</span></td>
                <td data-label="Status" className="stack-inline">{p.published ? <Pill tone="success">Published</Pill> : <Pill tone="warning">Draft</Pill>}</td>
                <td data-label="Published" className="stack-inline text-xs">{dateLabel(p.publishedAt)}</td>
                <td><div className="flex justify-end gap-1.5"><Link href={`/admin/content/blog/${p.id}`} className="btn-outline btn-sm">Edit</Link><ActButton action={deleteContentAction.bind(null, "blog", p.id)} confirm="Delete this article?" className="btn-ghost btn-sm text-danger">Delete</ActButton></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FaqForm({ f }: { f?: { id: string; question: string; answer: string; group: string; sortOrder: number } }) {
  return (
    <ActionForm action={saveFaqAction} className="space-y-2" resetOnSuccess={!f}>
      {f && <input type="hidden" name="id" value={f.id} />}
      <div className="grid gap-2 sm:grid-cols-[1fr_160px_80px]">
        <input name="question" defaultValue={f?.question} placeholder="Question" required className="input" />
        <input name="group" defaultValue={f?.group ?? "General"} placeholder="Group" className="input" />
        <input name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 0} className="input" title="Order" />
      </div>
      <textarea name="answer" defaultValue={f?.answer} rows={3} placeholder="Answer" required className="input" />
      <SubmitButton className="btn-primary btn-sm">{f ? "Save" : "Add FAQ"}</SubmitButton>
    </ActionForm>
  );
}

async function FaqTab() {
  const faqs = await prisma.faq.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }] });
  return (
    <div className="space-y-4">
      <div className="card p-5"><h2 className="mb-3 text-lg">New FAQ</h2><FaqForm /></div>
      <ul className="card divide-y divide-line">
        {faqs.map((f) => (
          <li key={f.id} className="p-4">
            <details>
              <summary className="cursor-pointer text-sm text-ink"><span className="mr-2 text-xs text-muted">[{f.group}]</span>{f.question}</summary>
              <div className="mt-3 space-y-2"><FaqForm f={f} /><ActButton action={deleteContentAction.bind(null, "faq", f.id)} confirm="Delete this FAQ?" className="btn-ghost btn-sm text-danger">Delete</ActButton></div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function PagesTab() {
  const pages = await prisma.page.findMany({ orderBy: { slug: "asc" } });
  const slugs = ["about", "terms", "privacy"];
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted">Formatting: blank line between paragraphs · <code>## Heading</code> · <code>- list item</code> · <code>**bold**</code> · <code>[link](https://…)</code></p>
      {slugs.map((slug) => {
        const p = pages.find((x) => x.slug === slug);
        return (
          <ActionForm key={slug} action={savePageAction} className="card space-y-3 p-6">
            <input type="hidden" name="slug" value={slug} />
            <div className="flex items-center justify-between"><h2 className="text-xl">/{slug}</h2>{p && <span className="text-xs text-muted">Updated {dateLabel(p.updatedAt)}</span>}</div>
            <Field label="Title" htmlFor={`pg-${slug}`}><input id={`pg-${slug}`} name="title" defaultValue={p?.title} required className="input" /></Field>
            <textarea name="body" defaultValue={p?.body} rows={14} required className="input font-mono text-xs" aria-label={`${slug} body`} />
            <SubmitButton className="btn-primary btn-sm">Save page</SubmitButton>
          </ActionForm>
        );
      })}
    </div>
  );
}

function TestimonialForm({ t }: { t?: { id: string; name: string; role: string; quote: string; sortOrder: number; active: boolean } }) {
  return (
    <ActionForm action={saveTestimonialAction} className="space-y-2" resetOnSuccess={!t}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_80px]">
        <input name="name" defaultValue={t?.name} placeholder="Name" required className="input" />
        <input name="role" defaultValue={t?.role} placeholder="e.g. Bought a home in Karen" required className="input" />
        <input name="sortOrder" type="number" defaultValue={t?.sortOrder ?? 0} className="input" title="Order" />
      </div>
      <textarea name="quote" defaultValue={t?.quote} rows={3} placeholder="Quote" required className="input" />
      <div className="flex flex-wrap items-center gap-4">
        <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="text-xs" aria-label="Photo" />
        <label className="flex items-center gap-1.5 text-xs text-ink-2"><input type="checkbox" name="active" defaultChecked={t?.active ?? true} className="accent-[var(--navy)]" /> Show on homepage</label>
        <SubmitButton className="btn-primary btn-sm">{t ? "Save" : "Add testimonial"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

async function TestimonialsTab() {
  const items = await prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="space-y-4">
      <div className="card p-5"><h2 className="mb-3 text-lg">New testimonial</h2><TestimonialForm /></div>
      <ul className="card divide-y divide-line">
        {items.map((t) => (
          <li key={t.id} className="p-4">
            <details>
              <summary className="cursor-pointer text-sm text-ink">{t.name} <span className="text-xs text-muted">— {t.role}</span> {!t.active && <Pill tone="warning">Hidden</Pill>}</summary>
              <div className="mt-3 space-y-2"><TestimonialForm t={t} /><ActButton action={deleteContentAction.bind(null, "testimonial", t.id)} confirm="Delete?" className="btn-ghost btn-sm text-danger">Delete</ActButton></div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function HomepageTab() {
  const [featured, realtors, companies] = await Promise.all([
    prisma.property.findMany({ where: { featured: true }, orderBy: { featuredRank: "desc" }, select: { id: true, title: true, slug: true, featuredRank: true, status: true } }),
    prisma.realtor.count({ where: { featured: true } }),
    prisma.company.count({ where: { featured: true } }),
  ]);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-6">
        <h2 className="text-xl">Featured listings</h2>
        <p className="mt-1 text-xs text-muted">Up to 6 live featured listings show on the homepage, highest rank first. Feature listings from Admin → Listings; change the rank from a listing&apos;s Edit page.</p>
        <ol className="mt-4 space-y-2">
          {featured.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-bg-alt px-3 py-2 text-sm">
              <Link href={`/admin/listings/${p.id}`} className="truncate text-ink hover:text-gold-deep">{p.title}</Link>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted">rank {p.featuredRank} {p.status !== "ACTIVE" && <Pill tone="warning">{p.status.toLowerCase()}</Pill>}</span>
            </li>
          ))}
        </ol>
        <Link href="/admin/listings?status=ACTIVE" className="btn-outline btn-sm mt-4">Choose listings to feature</Link>
      </section>
      <section className="card space-y-3 p-6 text-sm text-ink-2">
        <h2 className="text-xl text-ink">Other homepage sections</h2>
        <p><strong className="text-ink">{realtors}</strong> featured realtors — <Link href="/admin/realtors" className="link">manage</Link></p>
        <p><strong className="text-ink">{companies}</strong> featured companies — <Link href="/admin/companies" className="link">manage</Link></p>
        <p>Hero & between-listing banners — <Link href="/admin/adverts" className="link">Ads & adverts</Link></p>
        <p>Popular locations — mark counties “Popular” in <Link href="/admin/taxonomy" className="link">Types & locations</Link></p>
        <p>Testimonials — <Link href="/admin/content?tab=testimonials" className="link">Testimonials tab</Link></p>
      </section>
    </div>
  );
}
