import { BadgeCheck, Clock, FileWarning, Lock } from "lucide-react";
import { requireLister } from "@/lib/auth";
import { listerStatus } from "@/lib/lister-data";
import { prisma } from "@/lib/db";
import { KYC_LABELS, LISTER_TYPE_LABELS } from "@/lib/constants";
import { dateLabel } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { Pill, VerifiedBadge, statusTone } from "@/components/ui";
import { KycForm } from "./KycForm";

export const metadata = { title: "Verification (KYC)" };

export default async function KycPage() {
  const user = await requireLister();
  const st = await listerStatus(user.listerId);
  const history = await prisma.kycSubmission.findMany({ where: { listerId: user.listerId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, status: true, createdAt: true, reviewNote: true } });
  const status = st.lister.kycStatus;
  const canSubmit = ["NOT_SUBMITTED", "REJECTED", "RESUBMIT"].includes(status);

  return (
    <>
      <DashHeader title="Verification (KYC)" intro="Every lister is verified before listings go live. Approved listers get the gold Verified badge and rank higher in search." />

      <div className="card mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${status === "APPROVED" ? "bg-gold-soft text-gold-deep" : status === "REJECTED" || status === "RESUBMIT" ? "bg-danger-soft text-danger" : "bg-bg-alt text-ink-2"}`}>
          {status === "APPROVED" ? <BadgeCheck size={28} /> : status === "REJECTED" || status === "RESUBMIT" ? <FileWarning size={26} /> : <Clock size={26} />}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-2xl text-ink">{KYC_LABELS[status]}</p>
            {status === "APPROVED" && <VerifiedBadge size="md" />}
          </div>
          <p className="text-sm text-ink-2">
            {status === "APPROVED" && `Verified on ${dateLabel(st.lister.verifiedAt)}. Your badge shows on your profile, listings and in search results.`}
            {(status === "PENDING" || status === "UNDER_REVIEW") && "Thanks — our team is reviewing your documents (usually 1–2 business days). We'll email you."}
            {status === "NOT_SUBMITTED" && `Account type: ${LISTER_TYPE_LABELS[st.lister.type]}. Upload your documents below to get verified.`}
            {(status === "REJECTED" || status === "RESUBMIT") && (st.latestKyc?.reviewNote ? `Reviewer note: ${st.latestKyc.reviewNote}` : "Please correct the issues and resubmit.")}
          </p>
          {st.lister.badgeRevokedReason && status !== "APPROVED" && <p className="mt-1 text-xs text-danger">Badge revoked: {st.lister.badgeRevokedReason}</p>}
        </div>
      </div>

      {canSubmit && <KycForm type={st.lister.type} defaults={{ fullName: user.name, phone: user.phone ? `0${user.phone.slice(3)}` : "", email: user.email }} />}

      <p className="mt-6 flex items-center gap-2 text-xs text-muted">
        <Lock size={13} /> Documents are encrypted in private storage and visible only to authorised HomeVista administrators (Kenya Data Protection Act, 2019).
      </p>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl">Submission history</h2>
          <ul className="card divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-ink-2">{dateLabel(h.createdAt)}{h.reviewNote ? ` — ${h.reviewNote}` : ""}</span>
                <Pill tone={statusTone(h.status)}>{KYC_LABELS[h.status]}</Pill>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
