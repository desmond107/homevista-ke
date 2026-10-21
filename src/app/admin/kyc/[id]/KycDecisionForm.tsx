"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { reviewKycAction } from "@/app/actions/admin";

export function KycDecisionForm({ id, current, note }: { id: string; current: string; note: string }) {
  const options = [
    ["UNDER_REVIEW", "Mark as under review", "Let the lister know you've started."],
    ["APPROVED", "Approve & grant Verified badge", "Listings can go live (with an active subscription)."],
    ["RESUBMIT", "Request resubmission", "Ask for clearer or missing documents."],
    ["REJECTED", "Reject", "Fraudulent or ineligible applicant."],
  ];
  return (
    <ActionForm action={reviewKycAction} className="card space-y-4 p-5">
      <h2 className="text-xl">Decision</h2>
      <input type="hidden" name="id" value={id} />
      <div className="space-y-2">
        {options.map(([v, label, hint]) => (
          <label key={v} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 transition has-[:checked]:border-navy has-[:checked]:bg-bg-alt">
            <input type="radio" name="decision" value={v} defaultChecked={current === v} className="mt-1 accent-[var(--navy)]" required />
            <span>
              <span className="block text-sm font-medium text-ink">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </span>
          </label>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="kyc-note">Note to lister (required for reject / resubmit)</label>
        <textarea id="kyc-note" name="note" rows={3} defaultValue={note} className="input" placeholder="e.g. The selfie is blurry — please retake it in good light." />
      </div>
      <SubmitButton className="btn-primary w-full">Save decision & notify lister</SubmitButton>
    </ActionForm>
  );
}
