"use client";

import { useActionState } from "react";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";
import { sendPhoneOtpAction, verifyPhoneAction } from "@/app/actions/auth";

export function VerifyPhoneForm({ phone, next }: { phone: string; next: string }) {
  const [sent, sendAction] = useActionState(sendPhoneOtpAction, null);
  return (
    <div className="space-y-6">
      <form action={sendAction} className="space-y-3">
        <Field label="Mobile number" htmlFor="otp-phone">
          <div className="flex gap-2">
            <input id="otp-phone" name="phone" type="tel" defaultValue={phone} placeholder="0712 345 678" required className="input" />
            <SubmitButton className="btn-outline shrink-0" pendingText="Sending…">
              {sent?.ok ? "Resend" : "Send code"}
            </SubmitButton>
          </div>
        </Field>
        <FormMessage state={sent} />
        {sent?.ok && sent.data?.devCode && (
          <p className="rounded-xl border border-dashed border-gold/60 bg-gold-soft px-3 py-2 text-xs text-gold-deep">
            Dev mode (no SMS provider configured): your code is <strong className="tracking-widest">{sent.data.devCode}</strong>
          </p>
        )}
      </form>
      <ActionForm action={verifyPhoneAction} className="space-y-3" refresh={false} messageFirst>
        <input type="hidden" name="next" value={next} />
        <Field label="6-digit code" htmlFor="otp-code">
          <input id="otp-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="input text-center text-2xl tracking-[0.5em]" />
        </Field>
        <SubmitButton className="btn-primary w-full !py-3" pendingText="Verifying…">
          Verify phone
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
