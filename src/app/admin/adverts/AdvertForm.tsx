"use client";

import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { AD_PLACEMENT_LABELS } from "@/lib/constants";
import { saveAdvertAction } from "@/app/actions/admin";

type Initial = { id: string; title: string; subtitle: string; linkUrl: string; placement: string; startsAt: string; endsAt: string; imageUrl: string; active: boolean } | null;

export function AdvertForm({ initial }: { initial: Initial }) {
  const today = new Date().toISOString().slice(0, 16);
  const in30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 16);
  return (
    <ActionForm action={saveAdvertAction} className="card space-y-4 self-start p-6" resetOnSuccess={!initial}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl">{initial ? "Edit advert" : "New advert"}</h2>
        {initial && <Link href="/admin/adverts" className="link text-sm">+ New instead</Link>}
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {initial && <input type="hidden" name="imageUrl" value={initial.imageUrl} />}
      <Field label="Title" htmlFor="ad-title"><input id="ad-title" name="title" defaultValue={initial?.title} required className="input" /></Field>
      <Field label="Subtitle" htmlFor="ad-sub"><input id="ad-sub" name="subtitle" defaultValue={initial?.subtitle} className="input" /></Field>
      <Field label="Link" htmlFor="ad-link"><input id="ad-link" name="linkUrl" defaultValue={initial?.linkUrl} placeholder="https://" required className="input" /></Field>
      <Field label="Placement" htmlFor="ad-place">
        <select id="ad-place" name="placement" defaultValue={initial?.placement ?? "BETWEEN_LISTINGS"} className="input">
          {Object.entries(AD_PLACEMENT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" htmlFor="ad-start"><input id="ad-start" name="startsAt" type="datetime-local" defaultValue={initial?.startsAt ?? today} required className="input" /></Field>
        <Field label="Ends" htmlFor="ad-end"><input id="ad-end" name="endsAt" type="datetime-local" defaultValue={initial?.endsAt ?? in30} required className="input" /></Field>
      </div>
      <Field label={initial ? "Replace banner (optional)" : "Banner image"} htmlFor="ad-img" hint="Wide images work best (e.g. 1800×600). JPG, PNG or WebP.">
        <input id="ad-img" name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!initial} className="text-sm" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="h-4 w-4 accent-[var(--navy)]" /> Active</label>
      <SubmitButton>{initial ? "Save advert" : "Publish advert"}</SubmitButton>
    </ActionForm>
  );
}
