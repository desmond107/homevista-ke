"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pause, Pencil, Play, Trash2 } from "lucide-react";
import { setListingStatusAction } from "@/app/actions/lister";

export function ListingActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: "pause" | "resume" | "delete", confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => {
      const r = await setListingStatusAction(id, action);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  };
  return (
    <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
      {status !== "REMOVED" && (
        <Link href={`/lister/listings/${id}/edit`} className="btn-outline btn-sm">
          <Pencil size={13} /> Edit
        </Link>
      )}
      {status === "ACTIVE" && (
        <button type="button" disabled={pending} onClick={() => run("pause")} className="btn-outline btn-sm">
          <Pause size={13} /> Pause
        </button>
      )}
      {(status === "PAUSED" || status === "DRAFT") && (
        <button type="button" disabled={pending} onClick={() => run("resume")} className="btn-primary btn-sm">
          <Play size={13} /> {status === "DRAFT" ? "Publish" : "Resume"}
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => run("delete", "Delete this listing permanently? Photos, reviews and stats will be removed.")} className="btn-ghost btn-sm text-danger">
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}
