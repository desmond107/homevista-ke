"use client";

import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleFavouriteAction } from "@/app/actions/user";
import { cx } from "./ui";

export function FavouriteButton({ propertyId, saved, signedIn, variant = "icon" }: { propertyId: string; saved: boolean; signedIn: boolean; variant?: "icon" | "button" }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    start(async () => {
      setOptimistic(!optimistic);
      const r = await toggleFavouriteAction(propertyId);
      if (!r.ok) window.alert(r.error);
      router.refresh();
    });
  }

  if (variant === "button")
    return (
      <button type="button" onClick={toggle} className="btn-outline" aria-pressed={optimistic}>
        <Heart size={16} className={cx(optimistic && "fill-danger text-danger")} />
        {optimistic ? "Saved" : "Save"}
      </button>
    );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Remove from saved homes" : "Save this home"}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1b2232] shadow-md backdrop-blur transition hover:scale-110"
    >
      <Heart size={17} className={cx("transition", optimistic && "fill-[#c0392b] text-[#c0392b]")} />
    </button>
  );
}
