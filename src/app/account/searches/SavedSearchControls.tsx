"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateSavedSearchAction } from "@/app/actions/user";

export function SavedSearchControls({ id, alerts }: { id: string; alerts: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          defaultChecked={alerts}
          disabled={pending}
          onChange={(e) => start(async () => { await updateSavedSearchAction(id, { alerts: e.target.checked }); router.refresh(); })}
          className="h-4 w-4 accent-[var(--navy)]"
        />
        Email alerts
      </label>
      <button
        type="button"
        disabled={pending}
        className="btn-ghost btn-sm text-danger"
        onClick={() => {
          if (!confirm("Delete this saved search?")) return;
          start(async () => { await updateSavedSearchAction(id, { delete: true }); router.refresh(); });
        }}
      >
        Delete
      </button>
    </div>
  );
}
