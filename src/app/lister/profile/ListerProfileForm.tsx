"use client";

import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Avatar } from "@/components/ui";
import { updateListerProfileAction } from "@/app/actions/lister";

type Initial = { displayName: string; bio: string; phone: string; whatsapp: string; email: string; website: string; logoUrl: string | null };

export function ListerProfileForm({ initial }: { initial: Initial }) {
  return (
    <ActionForm action={updateListerProfileAction} className="card space-y-5 p-6">
      <div className="flex items-center gap-4">
        <Avatar name={initial.displayName} src={initial.logoUrl} size={64} />
        <Field label="Logo or photo" htmlFor="lp-logo" hint="Square image, at least 400×400.">
          <input id="lp-logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" htmlFor="lp-name">
          <input id="lp-name" name="displayName" defaultValue={initial.displayName} required className="input" />
        </Field>
        <Field label="Website" htmlFor="lp-web">
          <input id="lp-web" name="website" type="url" defaultValue={initial.website} placeholder="https://" className="input" />
        </Field>
        <Field label="Contact phone 🔒" htmlFor="lp-phone">
          <input id="lp-phone" name="phone" type="tel" defaultValue={initial.phone} required className="input" />
        </Field>
        <Field label="WhatsApp number 🔒" htmlFor="lp-wa">
          <input id="lp-wa" name="whatsapp" type="tel" defaultValue={initial.whatsapp} className="input" />
        </Field>
        <Field label="Contact email 🔒" htmlFor="lp-email" className="sm:col-span-2">
          <input id="lp-email" name="email" type="email" defaultValue={initial.email} required className="input" />
        </Field>
        <Field label="About" htmlFor="lp-bio" className="sm:col-span-2">
          <textarea id="lp-bio" name="bio" rows={5} maxLength={1500} defaultValue={initial.bio} className="input" placeholder="Tell seekers about your experience, areas you cover and what makes you different." />
        </Field>
      </div>
      <SubmitButton>Save profile</SubmitButton>
    </ActionForm>
  );
}
