import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Lock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KYC_LABELS, LISTER_TYPE_LABELS } from "@/lib/constants";
import { dateTimeLabel, prettyPhone } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { Pill, statusTone } from "@/components/ui";
import { KycDecisionForm } from "./KycDecisionForm";

function Doc({ label, k }: { label: string; k: string | null }) {
  if (!k) return null;
  const url = `/api/admin/kyc-file/${k}`;
  const pdf = k.endsWith(".pdf");
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-surface">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] bg-bg-alt">
        {pdf ? (
          <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-ink-2"><FileText size={32} className="text-gold-deep" /> Open PDF</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-contain" />
        )}
      </a>
      <figcaption className="border-t border-line px-3 py-2 text-xs text-ink-2">{label}</figcaption>
    </figure>
  );
}

export default async function KycReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("kyc");
  const { id } = await params;
  const s = await prisma.kycSubmission.findUnique({
    where: { id },
    include: { lister: { include: { user: { select: { name: true, email: true, phone: true, phoneVerified: true, createdAt: true } }, _count: { select: { listings: true, kycSubmissions: true } } } } },
  });
  if (!s) notFound();
  const reviewer = s.reviewedById ? await prisma.user.findUnique({ where: { id: s.reviewedById }, select: { name: true } }) : null;
  const rows: [string, React.ReactNode][] = [
    ["Lister", <Link key="l" href={`/listers/${s.lister.slug}`} className="link">{s.lister.displayName}</Link>],
    ["Lister type", LISTER_TYPE_LABELS[s.lister.type]],
    ["Full name", s.fullName],
    [s.idType === "PASSPORT" ? "Passport no." : "National ID no.", s.idNumber],
    ["Phone", `${prettyPhone(s.phone)}${s.lister.user.phoneVerified && s.lister.user.phone === s.phone ? " (verified on account)" : ""}`],
    ["Email", s.email],
    ["Physical address", s.address],
    ["KRA PIN", s.kraPin ?? "—"],
    ["EARB number", s.earbNumber ?? "—"],
    ["Account", `${s.lister.user.email} · joined ${dateTimeLabel(s.lister.user.createdAt)}`],
    ["Listings", s.lister._count.listings],
    ["Submissions", s.lister._count.kycSubmissions],
    ["Submitted", dateTimeLabel(s.createdAt)],
    ["Reviewed", s.reviewedAt ? `${dateTimeLabel(s.reviewedAt)} by ${reviewer?.name ?? "—"}` : "—"],
  ];
  return (
    <>
      <DashHeader title={`KYC: ${s.lister.displayName}`} intro={<Pill tone={statusTone(s.status)}>{KYC_LABELS[s.status]}</Pill>} action={<Link href="/admin/kyc" className="btn-outline">Back to queue</Link>} />
      <p className="mb-4 flex items-center gap-2 text-xs text-muted"><Lock size={13} /> Private documents — every view is recorded in the audit log.</p>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Doc label="ID — front" k={s.idFrontKey} />
            <Doc label="ID — back" k={s.idBackKey} />
            <Doc label="Selfie with ID" k={s.selfieKey} />
            <Doc label="Business certificate" k={s.businessCertKey} />
            <Doc label="KRA PIN certificate" k={s.kraPinKey} />
            <Doc label="Proof of ownership" k={s.ownershipProofKey} />
          </div>
          <dl className="card divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[160px_1fr] gap-3 px-5 py-2.5 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <KycDecisionForm id={s.id} current={s.status} note={s.reviewNote ?? ""} />
          <div className="card mt-4 p-5 text-xs text-ink-2">
            <p className="mb-2 font-semibold text-ink">Checklist</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Name on ID matches the account and KRA documents</li>
              <li>Selfie clearly shows the same face as the ID</li>
              <li>ID number format is valid and not used by another lister</li>
              <li>Company/developer: certificate and KRA PIN match the business name</li>
              <li>Realtor: EARB number checked against the EARB register</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
