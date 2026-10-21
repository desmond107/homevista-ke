import Link from "next/link";
import { Flag } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActButton } from "@/components/admin/ActButton";
import { EmptyState, Pill, statusTone } from "@/components/ui";
import { moderateListingAction, moderateReviewAction, resolveReportAction } from "@/app/actions/admin";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("listings");
  const sp = await searchParams;
  const status = sp.status === "closed" ? "closed" : "open";
  const reports = await prisma.report.findMany({
    where: status === "open" ? { status: "OPEN" } : { status: { not: "OPEN" } },
    orderBy: { createdAt: status === "open" ? "asc" : "desc" },
    take: 100,
    include: {
      reporter: { select: { name: true, email: true } },
      property: { select: { id: true, title: true, slug: true, status: true } },
      review: { select: { id: true, comment: true, rating: true, status: true, user: { select: { name: true } } } },
    },
  });
  return (
    <>
      <DashHeader title="Reports" intro="Listings and reviews flagged by users." />
      <div className="mb-4 flex gap-1.5">
        <Link href="/admin/reports" className={`chip ${status === "open" ? "!border-navy !bg-navy !text-on-navy" : ""}`}>Open</Link>
        <Link href="/admin/reports?status=closed" className={`chip ${status === "closed" ? "!border-navy !bg-navy !text-on-navy" : ""}`}>Closed</Link>
      </div>
      {reports.length ? (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="danger">{r.reason}</Pill>
                <Pill tone={statusTone(r.status)}>{r.status.toLowerCase()}</Pill>
                <span className="text-xs text-muted">by {r.reporter?.name ?? "deleted user"} · {timeAgo(r.createdAt)}</span>
              </div>
              {r.property && (
                <p className="mt-2 text-sm">Listing: <Link href={`/properties/${r.property.slug}`} className="link">{r.property.title}</Link> <span className="text-xs text-muted">({r.property.status.toLowerCase()})</span></p>
              )}
              {r.review && (
                <blockquote className="mt-2 rounded-xl border-l-2 border-danger bg-bg-alt px-3 py-2 text-sm text-ink-2">
                  “{r.review.comment}” — {r.review.user.name} ({r.review.rating}★)
                </blockquote>
              )}
              {r.details && <p className="mt-2 text-sm text-ink-2">{r.details}</p>}
              {r.status === "OPEN" && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.property && r.property.status === "ACTIVE" && (
                    <ActButton action={moderateListingAction.bind(null, r.property.id, "pause")} ask="Note to the lister:">Pause listing</ActButton>
                  )}
                  {r.property && r.property.status !== "REMOVED" && (
                    <ActButton action={moderateListingAction.bind(null, r.property.id, "remove")} ask="Reason for removal:" askRequired className="btn-outline btn-sm text-danger">Remove listing</ActButton>
                  )}
                  {r.review && <ActButton action={moderateReviewAction.bind(null, r.review.id, "hide")}>Hide review</ActButton>}
                  {r.review && <ActButton action={moderateReviewAction.bind(null, r.review.id, "delete")} confirm="Delete this review?" className="btn-outline btn-sm text-danger">Delete review</ActButton>}
                  <ActButton action={resolveReportAction.bind(null, r.id, "RESOLVED")} className="btn-primary btn-sm">Mark resolved</ActButton>
                  <ActButton action={resolveReportAction.bind(null, r.id, "DISMISSED")} className="btn-ghost btn-sm">Dismiss</ActButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Flag size={24} />} title={status === "open" ? "No open reports" : "No closed reports"} />
      )}
    </>
  );
}
