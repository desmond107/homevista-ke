import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dateLabel } from "@/lib/format";
import { Markdown } from "@/lib/markdown";
import { PageHeader } from "./ui";

/** Renders an admin-editable page (about / terms / privacy). */
export async function StaticPage({ slug, eyebrow, children }: { slug: string; eyebrow: string; children?: React.ReactNode }) {
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) notFound();
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={page.title} />
      <div className="container-x max-w-3xl py-12">
        <div className="prose-hv">
          <Markdown source={page.body} />
        </div>
        {children}
        <p className="mt-10 text-xs text-muted">Last updated {dateLabel(page.updatedAt)}</p>
      </div>
    </>
  );
}

export async function pageMeta(slug: string, fallback: string) {
  const p = await prisma.page.findUnique({ where: { slug }, select: { title: true, body: true } });
  return { title: p?.title ?? fallback, description: p?.body.replace(/[#*_\[\]()]/g, "").slice(0, 160) };
}
