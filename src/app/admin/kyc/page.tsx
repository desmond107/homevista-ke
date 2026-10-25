import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KYC_LABELS, LISTER_TYPE_LABELS } from "@/lib/constants";
import { dateTimeLabel, timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { EmptyState, Pill, statusTone } from "@/components/ui";

export default async function KycQueuePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("kyc");
  const sp = await searchParams;
  const status = sp.status ?? "queue";
  const subs = await prisma.kycSubmission.findMany({
    where: status === "queue" ? { status: { in: ["PENDING", "UNDER_REVIEW"] } } : status === "all" ? {} : { status: status as never },
    orderBy: { createdAt: status === "queue" ? "asc" : "desc" },
    take: 100,
    include: { lister: { select: { displayName: true, type: true } } },
  });
  const tabs = [
    ["queue", "Queue"],
    ["APPROVED", "Approved"],
    ["REJECTED", "Rejected"],
    ["RESUBMIT", "Resubmission"],
    ["all", "All"],
  ];
  return (
    <>
      <DashHeader title="KYC reviews" intro="Oldest first. Approving a lister grants the gold Verified badge and lets their listings go live." />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/admin/kyc?status=${k}`} className={`chip ${status === k ? "!border-navy !bg-navy !text-on-navy" : "hover:border-gold"}`}>{l}</Link>
        ))}
      </div>
      {subs.length ? (
        <div className="card overflow-x-auto">
          <table className="table table-stack">
            <thead><tr><th>Lister</th><th>Submitted</th><th>Applicant</th><th>Status</th><th /></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td><span className="block font-medium text-ink">{s.lister.displayName}</span><span className="text-xs text-muted">{LISTER_TYPE_LABELS[s.lister.type]}</span></td>
                  <td data-label="Submitted" className="stack-inline text-xs text-ink-2">{dateTimeLabel(s.createdAt)}<span className="block text-muted">{timeAgo(s.createdAt)}</span></td>
                  <td data-label="Applicant" className="stack-inline text-xs text-ink-2">{s.fullName}<span className="block text-muted">{s.idType === "PASSPORT" ? "Passport" : "ID"} {s.idNumber}</span></td>
                  <td data-label="Status" className="stack-inline"><Pill tone={statusTone(s.status)}>{KYC_LABELS[s.status]}</Pill></td>
                  <td className="text-right"><Link href={`/admin/kyc/${s.id}`} className="btn-primary btn-sm">Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<BadgeCheck size={24} />} title="Nothing in this list" body="New submissions appear here." />
      )}
    </>
  );
}
