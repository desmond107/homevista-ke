"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Star, Trash2 } from "lucide-react";
import { deleteReviewAction, reportAction, saveReviewAction } from "@/app/actions/user";
import { REPORT_REASONS } from "@/lib/constants";
import { ActionForm, SubmitButton } from "./forms";
import { cx } from "./ui";

export function StarPicker({ name, defaultValue = 0 }: { name: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Rating" className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => setValue(i)}
            onMouseEnter={() => setHover(i)}
            className="p-0.5"
          >
            <Star size={26} className={cx("transition", (hover || value) >= i ? "fill-gold text-gold" : "text-line-strong")} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <span className="text-sm text-ink-2">{labels[hover || value]}</span>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

// Survives the re-render that follows a successful save (the form collapses once a review exists).
const savedNotice = new Map<string, string>();

export function ReviewForm({ propertyId, existing }: { propertyId: string; existing?: { rating: number; comment: string } | null }) {
  const [editing, setEditing] = useState(!existing);
  const [notice, setNotice] = useState(() => savedNotice.get(propertyId) ?? null);
  if (!editing)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { savedNotice.delete(propertyId); setNotice(null); setEditing(true); }} className="btn-outline btn-sm">
          Edit your review
        </button>
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}
      </div>
    );
  return (
    <ActionForm
      action={saveReviewAction}
      className="card space-y-4 p-5"
      onSuccess={(r) => {
        const msg = (r as { message?: string }).message ?? "Saved.";
        savedNotice.set(propertyId, msg);
        setNotice(msg);
        setEditing(false);
      }}
    >
      <h3 className="text-xl">{existing ? "Edit your review" : "Rate this property"}</h3>
      <input type="hidden" name="propertyId" value={propertyId} />
      <StarPicker name="rating" defaultValue={existing?.rating ?? 0} />
      <div>
        <label htmlFor="review-comment" className="sr-only">
          Your review
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={4}
          maxLength={1500}
          required
          defaultValue={existing?.comment}
          placeholder="What was the property and the lister like? Was the listing accurate?"
          className="input"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">One review per property. Be honest and respectful.</p>
        <SubmitButton>{existing ? "Update review" : "Post review"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
      onClick={async () => {
        if (!confirm("Delete your review?")) return;
        const r = await deleteReviewAction(reviewId);
        if (!r.ok) alert(r.error);
        router.refresh();
      }}
    >
      <Trash2 size={13} /> Delete
    </button>
  );
}

export function ReportButton({ propertyId, reviewId, signedIn, label = "Report" }: { propertyId?: string; reviewId?: string; signedIn: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
        onClick={() => (signedIn ? setOpen(true) : router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`))}
      >
        <Flag size={13} /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Report">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="animate-rise relative w-full max-w-md rounded-t-3xl bg-surface p-6 shadow-lift sm:rounded-3xl">
            <h2 className="text-2xl">{reviewId ? "Report this review" : "Report this listing"}</h2>
            <p className="mt-1 text-sm text-ink-2">Our moderators review every report within 24 hours.</p>
            <ActionForm action={reportAction} className="mt-5 space-y-4" onSuccess={() => setTimeout(() => setOpen(false), 1500)} refresh={false}>
              {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
              {reviewId && <input type="hidden" name="reviewId" value={reviewId} />}
              <div>
                <label className="label" htmlFor="report-reason">
                  Reason
                </label>
                <select id="report-reason" name="reason" className="input" required defaultValue="">
                  <option value="" disabled>
                    Choose a reason…
                  </option>
                  {(reviewId ? ["Abusive review", "Misleading or fake listing", "Other"] : REPORT_REASONS).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="report-details">
                  Details (optional)
                </label>
                <textarea id="report-details" name="details" rows={3} maxLength={1000} className="input" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <SubmitButton className="btn-danger">Submit report</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      )}
    </>
  );
}
