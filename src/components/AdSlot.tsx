import Image from "next/image";
import type { AdPlacement } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cx } from "./ui";

/** Picks an active advert for a placement, counts the impression, and links through the click tracker. */
export async function AdSlot({ placement, className, variant = "banner" }: { placement: AdPlacement; className?: string; variant?: "banner" | "tall" | "hero" }) {
  const now = new Date();
  const ads = await prisma.advert.findMany({ where: { placement, active: true, startsAt: { lte: now }, endsAt: { gte: now } }, take: 10 });
  if (!ads.length) return null;
  const ad = ads[Math.floor(Math.random() * ads.length)]!;
  prisma.advert.update({ where: { id: ad.id }, data: { impressions: { increment: 1 } } }).catch(() => {});

  return (
    <a
      href={`/api/ads/${ad.id}/click`}
      rel="sponsored noopener"
      target="_blank"
      className={cx(
        "group relative block overflow-hidden rounded-[var(--radius-card)] border border-line bg-navy shadow-soft",
        variant === "tall" ? "aspect-[4/5]" : variant === "hero" ? "aspect-[16/8] sm:aspect-[16/4.5] lg:aspect-[16/3.6]" : "aspect-[16/6] sm:aspect-[16/4]",
        className,
      )}
    >
      <Image src={ad.imageUrl} alt="" fill sizes="(min-width:1024px) 1200px, 100vw" className="object-cover opacity-80 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/50 to-transparent" />
      <div className="relative flex h-full flex-col justify-center p-6 sm:p-8">
        <span className="mb-2 w-fit rounded-full bg-white/10 px-2 py-0.5 text-[10px] tracking-[0.2em] text-on-navy/80 uppercase">Sponsored</span>
        <p className={cx("max-w-md font-serif leading-tight text-on-navy", variant === "tall" ? "text-2xl" : "text-2xl sm:text-3xl")}>{ad.title}</p>
        {ad.subtitle && <p className="mt-2 max-w-md text-sm text-on-navy/75">{ad.subtitle}</p>}
        <span className="mt-4 w-fit text-sm font-medium text-gold group-hover:underline">Learn more →</span>
      </div>
    </a>
  );
}
