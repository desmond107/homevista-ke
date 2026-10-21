import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { ListerStatus } from "@/lib/lister-data";
import { KYC_LABELS } from "@/lib/constants";
import { dateLabel } from "@/lib/format";
import { cx } from "./ui";

/** Shows what a lister still needs to do before their listings are visible. */
export function ReadinessChecklist({ st }: { st: ListerStatus }) {
  const steps = [
    { done: st.phoneVerified, title: "Verify your phone number", body: "For M-Pesa payments and SMS alerts.", href: "/verify-phone?next=/lister", cta: "Verify" },
    {
      done: st.kycApproved,
      title: "Complete KYC verification",
      body: st.kycApproved ? "Approved — you have the gold Verified badge." : `Status: ${KYC_LABELS[st.lister.kycStatus]}${st.latestKyc?.reviewNote && ["REJECTED", "RESUBMIT"].includes(st.lister.kycStatus) ? ` — ${st.latestKyc.reviewNote}` : ""}`,
      href: "/lister/kyc",
      cta: ["PENDING", "UNDER_REVIEW"].includes(st.lister.kycStatus) ? "View" : "Start KYC",
    },
    {
      done: st.subActive,
      title: "Activate your subscription",
      body: st.subActive ? `Active until ${dateLabel(st.lister.subscriptionEndsAt)} (${st.daysLeft} days left).` : "Your listings are hidden until you subscribe.",
      href: "/lister/subscription",
      cta: st.lister.subscriptionEndsAt ? "Renew" : "Subscribe",
    },
  ];
  if (st.live && st.phoneVerified) return null;
  return (
    <div className="card mb-8 overflow-hidden">
      <div className="border-b border-line bg-gold-soft/60 px-5 py-4">
        <p className="font-serif text-xl text-ink">{st.live ? "Almost there" : "Get your listings live"}</p>
        <p className="text-sm text-ink-2">{st.live ? "Your listings are visible. One more step recommended:" : "Listings become visible once KYC is approved and your subscription is active."}</p>
      </div>
      <ol className="divide-y divide-line">
        {steps.map((s) => (
          <li key={s.title} className="flex items-center gap-4 px-5 py-4">
            {s.done ? <CheckCircle2 size={22} className="shrink-0 text-success" /> : <Circle size={22} className="shrink-0 text-line-strong" />}
            <div className="min-w-0 flex-1">
              <p className={cx("text-sm font-medium", s.done ? "text-muted line-through" : "text-ink")}>{s.title}</p>
              <p className="text-xs text-muted">{s.body}</p>
            </div>
            {!s.done && (
              <Link href={s.href} className="btn-primary btn-sm shrink-0">
                {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
