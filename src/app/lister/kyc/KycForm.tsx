"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { submitKycAction } from "@/app/actions/lister";

function FileField({ name, label, hint, required, capture }: { name: string; label: string; hint?: string; required?: boolean; capture?: boolean }) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <div>
      <span className="label">
        {label} {required ? <span className="text-danger">*</span> : <span className="font-normal text-muted">(optional)</span>}
      </span>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line-strong px-4 py-3 text-sm text-ink-2 transition hover:border-gold">
        <FileUp size={18} className="shrink-0 text-gold-deep" />
        <span className="truncate">{fileName ?? "Choose a photo or PDF…"}</span>
        <input
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          {...(capture ? { capture: "user" as const } : {})}
          required={required}
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function KycForm({ type, defaults }: { type: string; defaults: { fullName: string; phone: string; email: string } }) {
  const business = type === "COMPANY" || type === "DEVELOPER";
  return (
    <ActionForm action={submitKycAction} className="card space-y-6 p-6" messageFirst>
      <div>
        <h2 className="text-xl">Personal details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full legal name (as on ID)" htmlFor="k-name">
            <input id="k-name" name="fullName" defaultValue={defaults.fullName} required className="input" />
          </Field>
          <div className="grid grid-cols-[130px_1fr] gap-2">
            <Field label="ID type" htmlFor="k-idtype">
              <select id="k-idtype" name="idType" className="input">
                <option value="NATIONAL_ID">National ID</option>
                <option value="PASSPORT">Passport</option>
              </select>
            </Field>
            <Field label="ID / passport no." htmlFor="k-idno">
              <input id="k-idno" name="idNumber" required className="input" />
            </Field>
          </div>
          <Field label="Phone number" htmlFor="k-phone">
            <input id="k-phone" name="phone" type="tel" defaultValue={defaults.phone} required className="input" />
          </Field>
          <Field label="Email" htmlFor="k-email">
            <input id="k-email" name="email" type="email" defaultValue={defaults.email} required className="input" />
          </Field>
          <Field label="Physical address" htmlFor="k-addr" className="sm:col-span-2">
            <input id="k-addr" name="address" required placeholder="Building, street, town" className="input" />
          </Field>
        </div>
      </div>

      <div>
        <h2 className="text-xl">Identity documents</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FileField name="idFront" label="ID — front" required />
          <FileField name="idBack" label="ID — back" required hint="For passports, upload the photo page twice." />
          <FileField name="selfie" label="Selfie holding your ID" required capture hint="Face and ID both clearly visible." />
        </div>
      </div>

      {(business || type === "AGENT") && (
        <div>
          <h2 className="text-xl">Business documents</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FileField name="businessCert" label="Certificate of registration / incorporation" required={business} />
            <Field label="KRA PIN" htmlFor="k-kra" hint="Format: P051234567X">
              <input id="k-kra" name="kraPin" required={business} className="input uppercase" />
            </Field>
            <FileField name="kraPinFile" label="KRA PIN certificate" />
          </div>
        </div>
      )}

      {type === "REALTOR" && (
        <div>
          <h2 className="text-xl">Professional registration</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="EARB registration number" htmlFor="k-earb" hint="Estate Agents Registration Board">
              <input id="k-earb" name="earbNumber" required className="input" />
            </Field>
          </div>
        </div>
      )}

      {type === "LANDLORD" && (
        <div>
          <h2 className="text-xl">Proof of ownership</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FileField name="ownershipProof" label="Title deed or lease" hint="Speeds up approval and builds trust with seekers." />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">By submitting you confirm the documents are genuine and belong to you or your business.</p>
        <SubmitButton className="btn-gold" pendingText="Uploading securely…">
          Submit for verification
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
