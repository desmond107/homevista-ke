import { CheckCircle2, CircleDashed } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { mpesaMode, simulatorBlocked } from "@/lib/mpesa";
import { googleEnabled } from "@/lib/google";
import { timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/ui";
import { saveSettingsAction } from "@/app/actions/admin";

export default async function SettingsPage() {
  await requireAdmin("settings");
  const [s, outbound] = await Promise.all([getSettings(), prisma.outboundMessage.findMany({ orderBy: { createdAt: "desc" }, take: 15 })]);
  const integrations = [
    ["M-Pesa Daraja", mpesaMode() === "simulate" ? (simulatorBlocked() ? "Not configured: payments off" : "Simulator (dev)") : mpesaMode() === "sandbox" ? "Sandbox" : "Live", mpesaMode() === "production"],
    ["Email (Resend)", process.env.RESEND_API_KEY ? "Connected" : "Logging only", !!process.env.RESEND_API_KEY],
    ["SMS (Africa's Talking)", process.env.AT_API_KEY ? `Connected (${process.env.AT_USERNAME})` : "Logging only", !!process.env.AT_API_KEY],
    ["Google sign-in", googleEnabled() ? "Enabled" : "Not configured", googleEnabled()],
    ["File storage", process.env.S3_BUCKET ? `S3: ${process.env.S3_BUCKET}` : "Local disk (./storage)", !!process.env.S3_BUCKET],
    ["Cron jobs", process.env.CRON_SECRET ? "Secret set" : "CRON_SECRET missing", !!process.env.CRON_SECRET],
  ] as const;
  return (
    <>
      <DashHeader title="Pricing & system settings" />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <ActionForm action={saveSettingsAction} className="card space-y-5 p-6">
          <h2 className="text-xl">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Unlock price (KSh)" htmlFor="s-unlock"><input id="s-unlock" name="unlock_price" type="number" min={1} defaultValue={s.unlockPrice} required className="input" /></Field>
            <Field label="Subscription price (KSh)" htmlFor="s-sub"><input id="s-sub" name="subscription_price" type="number" min={1} defaultValue={s.subscriptionPrice} required className="input" /></Field>
            <Field label="Subscription length (days)" htmlFor="s-days"><input id="s-days" name="subscription_days" type="number" min={1} max={366} defaultValue={s.subscriptionDays} required className="input" /></Field>
          </div>
          <Field label="Reminder days before expiry" htmlFor="s-rem" hint="Comma separated, e.g. 5,2,1"><input id="s-rem" name="reminder_days" defaultValue={s.reminderDays.join(",")} className="input" /></Field>
          <h2 className="pt-2 text-xl">Moderation</h2>
          <div className="space-y-2.5 text-sm text-ink-2">
            <label className="flex items-start gap-2.5"><input type="checkbox" name="require_listing_approval" defaultChecked={s.requireListingApproval} className="mt-0.5 h-4 w-4 accent-[var(--navy)]" /> New listings need admin approval before going live</label>
            <label className="flex items-start gap-2.5"><input type="checkbox" name="auto_publish_verified" defaultChecked={s.autoPublishVerified} className="mt-0.5 h-4 w-4 accent-[var(--navy)]" /> …except listings from Verified listers (publish instantly)</label>
            <label className="flex items-start gap-2.5"><input type="checkbox" name="review_moderation" defaultChecked={s.reviewModeration} className="mt-0.5 h-4 w-4 accent-[var(--navy)]" /> Hold all new reviews for approval (abusive ones are always held)</label>
          </div>
          <Field label="Site notice (optional banner)" htmlFor="s-notice"><input id="s-notice" name="site_notice" defaultValue={s.siteNotice} maxLength={300} className="input" placeholder="e.g. M-Pesa maintenance tonight 11pm–1am" /></Field>
          <SubmitButton>Save settings</SubmitButton>
        </ActionForm>
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-3 text-xl">Integrations</h2>
            <ul className="space-y-2 text-sm">
              {integrations.map(([name, status, ok]) => (
                <li key={name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-ink">{ok ? <CheckCircle2 size={16} className="text-success" /> : <CircleDashed size={16} className="text-warning" />} {name}</span>
                  <span className="text-xs text-muted">{status}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Configured with environment variables — see README.</p>
          </section>
          <section className="card p-6">
            <h2 className="mb-3 text-xl">Recent emails & SMS</h2>
            <ul className="space-y-2 text-xs">
              {outbound.map((m) => (
                <li key={m.id} className="rounded-lg bg-bg-alt px-3 py-2">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium text-ink">{m.channel} → {m.to}</span><Pill tone={m.status === "SENT" ? "success" : m.status === "FAILED" ? "danger" : "neutral"}>{m.status.toLowerCase()}</Pill></div>
                  <p className="mt-0.5 truncate text-ink-2">{m.subject ?? m.body}</p>
                  <p className="text-muted">{timeAgo(m.createdAt)}{m.error ? ` · ${m.error}` : ""}</p>
                </li>
              ))}
              {!outbound.length && <li className="text-muted">Nothing sent yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
