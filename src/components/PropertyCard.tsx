import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, MapPin, Maximize2, PlayCircle, Star } from "lucide-react";
import type { CardProperty } from "@/lib/listings";
import { areaLabel } from "@/lib/listings";
import { PURPOSE_LABELS } from "@/lib/constants";
import { priceLabel, sizeLabel } from "@/lib/format";
import { FavouriteButton } from "./FavouriteButton";
import { VerifiedBadge, cx } from "./ui";

type Props = { p: CardProperty; saved?: boolean; signedIn?: boolean; layout?: "grid" | "list"; priority?: boolean };

export function PropertyCard({ p, saved = false, signedIn = false, layout = "grid", priority }: Props) {
  const cover = p.images[0];
  const list = layout === "list";
  return (
    <article
      className={cx(
        "group relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift",
        list && "sm:flex",
      )}
    >
      <Link href={`/properties/${p.slug}`} className={cx("relative block overflow-hidden bg-bg-alt", list ? "aspect-[4/3] sm:aspect-auto sm:w-80 sm:shrink-0" : "aspect-[4/3]")}>
        {cover && (
          <Image
            src={cover.url}
            alt={cover.alt ?? p.title}
            fill
            priority={priority}
            sizes={list ? "(min-width:640px) 320px, 100vw" : "(min-width:1280px) 400px, (min-width:768px) 50vw, 100vw"}
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-navy/85 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-on-navy backdrop-blur">{PURPOSE_LABELS[p.purpose]}</span>
            {p.featured && <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-[#0c1a2e]">Featured</span>}
          </div>
        </div>
        {(p.videoUrl || p.tourUrl) && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur">
            <PlayCircle size={13} /> {p.tourUrl ? "Virtual tour" : "Video"}
          </span>
        )}
      </Link>
      <div className="absolute top-3 right-3 z-10">
        <FavouriteButton propertyId={p.id} saved={saved} signedIn={signedIn} />
      </div>

      <div className={cx("flex flex-1 flex-col p-5", list && "sm:p-6")}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-serif text-[22px] leading-none text-ink">{priceLabel(p.price, p.pricePeriod)}</p>
          {p.ratingCount > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-2" title={`${p.ratingAvg} from ${p.ratingCount} reviews`}>
              <Star size={13} className="fill-gold text-gold" /> {p.ratingAvg.toFixed(1)} <span className="text-muted">({p.ratingCount})</span>
            </span>
          )}
        </div>
        <h3 className="mt-2.5 font-sans text-[15px] leading-snug font-semibold text-ink">
          <Link href={`/properties/${p.slug}`} className="line-clamp-2 after:absolute after:inset-0 after:content-[''] hover:text-gold-deep">
            {p.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-[13px] text-muted">
          <MapPin size={13} className="shrink-0 text-gold-deep" /> <span className="truncate">{areaLabel(p)}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[13px] text-ink-2">
          {p.bedrooms != null && (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble size={15} className="text-muted" /> {p.bedrooms} {p.bedrooms === 1 ? "bed" : "beds"}
            </span>
          )}
          {p.bathrooms != null && (
            <span className="inline-flex items-center gap-1.5">
              <Bath size={15} className="text-muted" /> {p.bathrooms} {p.bathrooms === 1 ? "bath" : "baths"}
            </span>
          )}
          {p.size != null && (
            <span className="inline-flex items-center gap-1.5">
              <Maximize2 size={14} className="text-muted" /> {sizeLabel(p.size, p.sizeUnit)}
            </span>
          )}
          <span className="ml-auto text-xs text-muted">{p.type.name}</span>
        </div>
        <div className="relative z-10 mt-3 flex items-center gap-2 text-xs text-muted">
          <Link href={`/listers/${p.lister.slug}`} className="truncate hover:text-ink">
            {p.lister.displayName}
          </Link>
          {p.lister.verified && <VerifiedBadge size="xs" label={false} />}
        </div>
      </div>
    </article>
  );
}
