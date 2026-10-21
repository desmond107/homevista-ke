import { CalendarClock, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { requireLister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listerStatus } from "@/lib/lister-data";
import { getSettings } from "@/lib/settings";
import { dateLabel, kes } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { PayButton } from "@/components/PaymentModal";
import { PaymentsTable } from "@/components/PaymentsTable";
import { Pill } from "@/components/ui";

export default async function SubscriptionPage() {
  const user = await requireLister();
  const [st, settings, payments, subs] = await Promise.all([
    listerStatus(user.listerId),
    getSettings(),
    prisma.payment.findMany({ where: { userId: user.id, kind: "SUBSCRIPTION" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.subscription.findMany({ where: { listerId: user.listerId }, orderBy: { endsAt: "desc" }, take: 12 }),
  ]);
  const ends = st.lister.subscriptionEndsAt;
  const newEnd = new Date(Math.max(Date.now(), ends?.getTime() ?? 0) + settings.subscriptionDays * 86400_000);

  return (
    <>
      <DashHeader title="Subscription" intro={`${kes(settings.subscriptionPrice)} per ${settings.subscriptionDays} days · unlimited listings · cancel any time (it simply expires).`} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card overflow-hidden">
          <div className={`p-6 ${st.subActive ? "bg-navy text-on-navy" : "bg-danger-soft"}`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold tracking-widest uppercase ${st.subActive ? "text-gold" : "text-danger"}`}>{st.subActive ? "Active" : ends ? "Expired" : "Not subscribed"}</p>
              {st.subActive && st.daysLeft <= 5 && <Pill tone="gold">Renew soon</Pill>}
            </div>
            <p className={`mt-2 font-serif text-4xl ${st.subActive ? "text-white" : "text-ink"}`}>
              {st.subActive ? `${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"} left` : ends ? "Your listings are hidden" : "Start listing today"}
            </p>
            <p className={`mt-1 text-sm ${st.subActive ? "text-on-navy/70" : "text-ink-2"}`}>
              {st.subActive ? `Listings visible until ${dateLabel(ends)}.` : ends ? `Expired on ${dateLabel(ends)}. Renew and they go live again instantly.` : "Subscribe to make your approved listings visible."}
            </p>
          </div>
          <div className="space-y-4 p-6">
            <ul className="space-y-2 text-sm text-ink-2">
              {["Unlimited listings with up to 20 photos each", "Analytics: views, unlocks, saves and ratings", "Reminders by email & SMS 5, 2 and 1 day before expiry", "Renewals extend from your current end date — no lost days"].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" /> {t}
                </li>
              ))}
            </ul>
            <PayButton
              kind="SUBSCRIPTION"
              amount={settings.subscriptionPrice}
              defaultPhone={user.phone}
              title={st.subActive ? "Renew subscription" : "Activate subscription"}
              subtitle={`${settings.subscriptionDays} days of visibility for all your listings. New end date: ${dateLabel(newEnd)}.`}
              label={<><CreditCard size={16} /> {st.subActive ? "Renew" : "Pay"} {kes(settings.subscriptionPrice)} via M-Pesa</>}
              className="btn-gold w-full !py-3"
            />
            {!st.kycApproved && (
              <p className="flex gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
                <ShieldCheck size={15} className="shrink-0" /> Listings also need approved KYC before they appear in search.
              </p>
            )}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl"><CalendarClock size={18} className="text-gold-deep" /> Periods</h2>
          <ul className="space-y-2 text-sm">
            {subs.map((s) => {
              const active = s.startsAt <= new Date() && s.endsAt > new Date();
              return (
                <li key={s.id} className="flex items-center justify-between rounded-xl bg-bg-alt px-3 py-2">
                  <span className="text-ink-2">{dateLabel(s.startsAt)} → {dateLabel(s.endsAt)}</span>
                  {active ? <Pill tone="success">Current</Pill> : s.startsAt > new Date() ? <Pill tone="gold">Upcoming</Pill> : <span className="text-xs text-muted">{kes(s.amount)}</span>}
                </li>
              );
            })}
            {!subs.length && <li className="text-muted">No subscription periods yet.</li>}
          </ul>
        </section>
      </div>
      <h2 className="mt-10 mb-4 text-2xl">Payment history</h2>
      <PaymentsTable rows={payments} />
    </>
  );
}
