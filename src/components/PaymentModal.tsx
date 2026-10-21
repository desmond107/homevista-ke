"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, Smartphone, X, XCircle } from "lucide-react";
import { cx } from "./ui";

type View = {
  id: string;
  reference: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT";
  amount: number;
  receipt: string | null;
  message: string;
  simulate: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  kind: "UNLOCK" | "SUBSCRIPTION";
  propertyId?: string;
  amount: number;
  defaultPhone?: string | null;
  title: string;
  subtitle: string;
};

const POLL_MS = 3000;

/**
 * M-Pesa STK Push flow: enter number → prompt sent → poll until the callback (or STK Query) resolves it.
 * Handles success, cancellation, wrong PIN, insufficient funds and timeouts with a retry.
 */
export function PaymentModal({ open, onClose, kind, propertyId, amount, defaultPhone, title, subtitle }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone ? `0${defaultPhone.slice(3)}` : "");
  const [payment, setPayment] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  useEffect(() => {
    if (!open) {
      stop();
      setPayment(null);
      setError(null);
    }
  }, [open]);

  function poll(id: string) {
    stop();
    started.current = Date.now();
    timer.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/payments/${id}`, { cache: "no-store" });
        const j = await r.json();
        if (j.payment) {
          setPayment(j.payment);
          if (j.payment.status !== "PENDING") stop();
        }
      } catch {
        /* transient network error: keep polling */
      }
      if (Date.now() - started.current > 3.5 * 60_000) stop();
    }, POLL_MS);
  }

  async function pay(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, propertyId, phone }),
      });
      const j = await r.json();
      if (r.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!r.ok) throw new Error(j.error || "Payment could not be started.");
      setPayment(j.payment);
      poll(j.payment.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function simulate(outcome: "success" | "cancel" | "fail" | "timeout") {
    if (!payment) return;
    setBusy(true);
    const r = await fetch(`/api/payments/${payment.id}/simulate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome }) });
    const j = await r.json();
    setBusy(false);
    if (j.payment) {
      setPayment(j.payment);
      stop();
    }
  }

  // Refresh only once the user dismisses the success screen: refreshing earlier re-renders the
  // page (the unlock card becomes the contact card) and would unmount this confirmation.
  const close = () => {
    const paid = payment?.status === "SUCCESS";
    onClose();
    if (paid) router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && payment?.status !== "PENDING") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!open) return null;
  const status = payment?.status;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="pay-title">
      <div className="absolute inset-0 bg-navy/70 backdrop-blur-sm" onClick={status === "PENDING" ? undefined : close} />
      <div className="animate-rise relative w-full max-w-md overflow-hidden rounded-t-3xl bg-surface shadow-lift sm:rounded-3xl">
        <div className="flex items-center justify-between bg-navy px-6 py-4 text-on-navy">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3aa935] text-[10px] font-black text-white" aria-hidden>
              M
            </span>
            <span className="text-sm font-medium">Lipa na M-PESA</span>
          </div>
          <button type="button" onClick={close} className="rounded-full p-1.5 text-on-navy/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {!payment && (
            <form onSubmit={pay}>
              <h2 id="pay-title" className="text-2xl leading-tight">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>
              <div className="my-5 flex items-baseline justify-between rounded-2xl bg-bg-alt px-4 py-3">
                <span className="text-sm text-ink-2">Amount</span>
                <span className="font-serif text-2xl text-ink">KSh {amount.toLocaleString()}</span>
              </div>
              <label className="label" htmlFor="mpesa-phone">
                M-Pesa phone number
              </label>
              <div className="relative">
                <Smartphone size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                <input
                  id="mpesa-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0712 345 678"
                  required
                  className="input !pl-10 text-base"
                />
              </div>
              {error && (
                <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="btn-gold mt-5 w-full !py-3">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
                Pay KSh {amount.toLocaleString()}
              </button>
              <p className="mt-3 text-center text-xs text-muted">You&apos;ll get a prompt on your phone. We never see your M-Pesa PIN.</p>
            </form>
          )}

          {status === "PENDING" && payment && (
            <div className="text-center" aria-live="polite">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft">
                <Smartphone size={28} className="animate-pulse text-gold-deep" />
              </div>
              <h2 id="pay-title" className="text-2xl">
                Check your phone
              </h2>
              <p className="mt-2 text-sm text-ink-2">{payment.message}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
                <Loader2 size={14} className="animate-spin" /> Waiting for M-Pesa confirmation… Ref {payment.reference}
              </p>
              {payment.simulate && (
                <div className="mt-6 rounded-2xl border border-dashed border-gold/60 bg-gold-soft/50 p-4 text-left">
                  <p className="text-xs font-semibold tracking-wide text-gold-deep uppercase">Simulated phone (dev mode)</p>
                  <p className="mt-1 text-xs text-ink-2">MPESA_MODE=simulate — choose what the customer does. This runs the real callback handler.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" disabled={busy} onClick={() => simulate("success")} className="btn-primary btn-sm">
                      Enter PIN ✓
                    </button>
                    <button type="button" disabled={busy} onClick={() => simulate("cancel")} className="btn-outline btn-sm">
                      Cancel prompt
                    </button>
                    <button type="button" disabled={busy} onClick={() => simulate("fail")} className="btn-outline btn-sm">
                      Wrong PIN
                    </button>
                    <button type="button" disabled={busy} onClick={() => simulate("timeout")} className="btn-outline btn-sm">
                      Let it time out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === "SUCCESS" && payment && (
            <div className="text-center" aria-live="polite">
              <CheckCircle2 size={56} className="mx-auto mb-3 text-success" />
              <h2 id="pay-title" className="text-2xl">
                Payment confirmed
              </h2>
              <p className="mt-2 text-sm text-ink-2">
                {kind === "UNLOCK" ? "The exact location and contact details are now unlocked — permanently." : "Your subscription is active and your listings are live."}
              </p>
              <dl className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-y-1 text-left text-sm">
                <dt className="text-muted">Receipt</dt>
                <dd className="text-right font-medium">{payment.reference}</dd>
                {payment.receipt && (
                  <>
                    <dt className="text-muted">M-Pesa ref</dt>
                    <dd className="text-right font-medium">{payment.receipt}</dd>
                  </>
                )}
              </dl>
              <div className="mt-6 flex gap-2">
                <a href={`/api/payments/${payment.id}/receipt`} className="btn-outline flex-1">
                  Download receipt
                </a>
                <button type="button" onClick={close} className="btn-primary flex-1">
                  {kind === "UNLOCK" ? "View details" : "Done"}
                </button>
              </div>
            </div>
          )}

          {status && !["PENDING", "SUCCESS"].includes(status) && payment && (
            <div className="text-center" aria-live="assertive">
              <XCircle size={56} className={cx("mx-auto mb-3", status === "CANCELLED" ? "text-warning" : "text-danger")} />
              <h2 id="pay-title" className="text-2xl">
                {status === "CANCELLED" ? "Payment cancelled" : status === "TIMEOUT" ? "Payment timed out" : "Payment failed"}
              </h2>
              <p className="mt-2 text-sm text-ink-2">{payment.message}</p>
              <div className="mt-6 flex gap-2">
                <button type="button" onClick={onClose} className="btn-outline flex-1">
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPayment(null);
                    setError(null);
                  }}
                  className="btn-gold flex-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A button + modal pair, for server pages. */
export function PayButton({ label, className = "btn-gold w-full", ...props }: Omit<Props, "open" | "onClose"> & { label: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <PaymentModal open={open} onClose={() => setOpen(false)} {...props} />
    </>
  );
}
