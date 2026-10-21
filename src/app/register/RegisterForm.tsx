"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { cx } from "@/components/ui";
import { registerAction } from "@/app/actions/auth";
import { LISTER_TYPES, LISTER_TYPE_LABELS } from "@/lib/constants";

export function RegisterForm({ initialAs, next }: { initialAs: "seeker" | "lister"; next: string }) {
  const [as, setAs] = useState(initialAs);
  const [type, setType] = useState("LANDLORD");
  return (
    <ActionForm action={registerAction} className="space-y-4" refresh={false} messageFirst>
      <input type="hidden" name="as" value={as} />
      <input type="hidden" name="next" value={next} />
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
        {(
          [
            ["seeker", <Search key="s" size={18} />, "I'm looking", "Buy, rent or stay"],
            ["lister", <Building2 key="l" size={18} />, "I'm listing", "Landlord, agent, developer"],
          ] as const
        ).map(([v, icon, label, sub]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={as === v}
            onClick={() => setAs(v)}
            className={cx("rounded-2xl border p-4 text-left transition", as === v ? "border-navy bg-navy text-on-navy" : "border-line bg-surface hover:border-gold")}
          >
            <span className={cx(as === v ? "text-gold" : "text-gold-deep")}>{icon}</span>
            <span className="mt-2 block text-sm font-semibold">{label}</span>
            <span className={cx("block text-xs", as === v ? "text-on-navy/70" : "text-muted")}>{sub}</span>
          </button>
        ))}
      </div>

      <Field label="Full name" htmlFor="name">
        <input id="name" name="name" autoComplete="name" required className="input" />
      </Field>
      {as === "lister" && (
        <>
          <Field label="I am a…" htmlFor="listerType">
            <select id="listerType" name="listerType" value={type} onChange={(e) => setType(e.target.value)} className="input">
              {LISTER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LISTER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          {type !== "LANDLORD" && (
            <Field label="Business / trading name" htmlFor="displayName" hint="Shown on your profile and listings.">
              <input id="displayName" name="displayName" className="input" />
            </Field>
          )}
        </>
      )}
      <Field label="Email address" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </Field>
      <Field label="Mobile number (M-Pesa)" htmlFor="phone" hint="We'll send a code to verify it.">
        <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0712 345 678" required className="input" />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters, with letters and numbers.">
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </Field>
      <label className="flex items-start gap-2.5 text-sm text-ink-2">
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-[var(--navy)]" />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="link">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="link">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <SubmitButton className="btn-primary w-full !py-3" pendingText="Creating account…">
        {as === "lister" ? "Create lister account" : "Create account"}
      </SubmitButton>
    </ActionForm>
  );
}
