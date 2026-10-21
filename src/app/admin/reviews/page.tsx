import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActButton } from "@/components/admin/ActButton";
import { Pagination, Pill, Stars, statusTone } from "@/components/ui";
import { moderateReviewAction } from "@/app/actions/admin";

const PAGE = 25;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  await requireAdmin("reviews");
  const sp = await searchParams;
  const tab = sp.tab ?? "attention";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.ReviewWhereInput =
    tab === "attention" ? { OR: [{ flagged: true }, { status: "PENDING" }] } : tab === "hidden" ? { status: "HIDDEN" } : {};
  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { user: { select: { name: true, email: true } }, property: { select: { title: true, slug: true } }, _count: { select: { reports: true } } },
    }),
  ]);
  return (
    <>
      <DashHeader title="Reviews & comments" intro="Flagged reviews contain possible abuse or phone numbers, or were reported by users." />
      <div className="mb-4 flex gap-1.5">
        {[["attention", "Needs attention"], ["hidden", "Hidden"], ["all", "All"]].map(([k, l]) => (
          <Link key={k} href={`/admin/reviews?tab=${k}`} className={`chip ${tab === k ? "!border-navy !bg-navy !text-on-navy" : "hover:border-gold"}`}>{l}</Link>
        ))}
      </div>
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Stars value={r.rating} size={13} />
              <Pill tone={statusTone(r.status)}>{r.status.toLowerCase()}</Pill>
              {r.flagged && <Pill tone="danger">Flagged</Pill>}
              {r._count.reports > 0 && <Pill tone="danger">{r._count.reports} report(s)</Pill>}
              <span className="text-xs text-muted">{r.user.name} ({r.user.email}) · {timeAgo(r.createdAt)}</span>
            </div>
            <Link href={`/properties/${r.property.slug}#reviews`} className="mt-1 block text-xs text-muted hover:text-gold-deep">{r.property.title}</Link>
            <p className="mt-2 text-sm text-ink-2">{r.comment}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.status !== "PUBLISHED" && <ActButton action={moderateReviewAction.bind(null, r.id, "publish")} className="btn-primary btn-sm">Approve & publish</ActButton>}
              {r.status === "PUBLISHED" && r.flagged && <ActButton action={moderateReviewAction.bind(null, r.id, "unflag")}>Keep (unflag)</ActButton>}
              {r.status !== "HIDDEN" && <ActButton action={moderateReviewAction.bind(null, r.id, "hide")}>Hide</ActButton>}
              <ActButton action={moderateReviewAction.bind(null, r.id, "delete")} confirm="Delete this review permanently?" className="btn-ghost btn-sm text-danger">Delete</ActButton>
            </div>
          </li>
        ))}
        {!reviews.length && <li className="card p-10 text-center text-sm text-muted">Nothing to moderate. 🎉</li>}
      </ul>
      <Pagination page={page} pages={Math.ceil(total / PAGE)} href={(n) => `/admin/reviews?tab=${tab}&page=${n}`} />
    </>
  );
}
