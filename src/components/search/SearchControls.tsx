"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BellPlus, SlidersHorizontal, X } from "lucide-react";
import { SORTS } from "@/lib/constants";
import { saveSearchAction } from "@/app/actions/user";
import { ActionForm, SubmitButton } from "../forms";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      <span className="hidden sm:inline">Sort</span>
      <select
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams(sp.toString());
          q.set("sort", e.target.value);
          q.delete("page");
          router.push(`/properties?${q}`);
        }}
        className="input !w-auto !rounded-full !py-2 !pr-8"
      >
        <option value="recommended">Recommended</option>
        {SORTS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Mobile: the filter form slides in as a drawer. Desktop: rendered inline by the page. */
export function FilterDrawer({ children, activeCount }: { children: ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sp = useSearchParams();
  useEffect(() => setOpen(false), [pathname, sp]);
  return (
    <>
      <button type="button" className="btn-outline lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal size={16} /> Filters {activeCount > 0 && <span className="rounded-full bg-navy px-1.5 text-[10px] text-on-navy">{activeCount}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="animate-rise absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-surface px-5 pt-4 pb-6 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-serif text-xl">Filters</span>
              <button type="button" className="btn-ghost h-9 w-9 !p-0" onClick={() => setOpen(false)} aria-label="Close filters">
                <X size={18} />
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

export function SaveSearchButton({ signedIn, defaultName }: { signedIn: boolean; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  return (
    <>
      <button
        type="button"
        className="btn-outline"
        onClick={() => (signedIn ? setOpen(true) : router.push(`/login?next=${encodeURIComponent(`${pathname}?${sp}`)}`))}
      >
        <BellPlus size={16} /> <span className="hidden sm:inline">Save search</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Save search">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="animate-rise relative w-full max-w-md rounded-t-3xl bg-surface p-6 shadow-lift sm:rounded-3xl">
            <h2 className="text-2xl">Save this search</h2>
            <p className="mt-1 text-sm text-ink-2">Get an email when new homes match these filters.</p>
            <ActionForm action={saveSearchAction} className="mt-5 space-y-4" onSuccess={() => setTimeout(() => setOpen(false), 1200)}>
              <input type="hidden" name="query" value={sp.toString()} />
              <div>
                <label className="label" htmlFor="ss-name">
                  Name
                </label>
                <input id="ss-name" name="name" defaultValue={defaultName} className="input" maxLength={100} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" name="alerts" defaultChecked className="h-4 w-4 accent-[var(--navy)]" /> Email me new matches (daily at most)
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <SubmitButton>Save search</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      )}
    </>
  );
}
