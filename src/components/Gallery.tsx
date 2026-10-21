"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Grid2x2, X } from "lucide-react";

type Img = { url: string; alt: string | null };

/** Hero mosaic + full-screen lightbox with keyboard and swipe navigation. */
export function Gallery({ images, title }: { images: Img[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const n = images.length;
  const go = useCallback((d: number) => setIndex((i) => (i == null ? i : (i + d + n) % n)), [n]);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, go]);

  if (!n) return <div className="aspect-[16/9] rounded-[var(--radius-card)] bg-bg-alt" />;

  let touchX = 0;
  return (
    <>
      <div className="relative grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[var(--radius-card)] sm:h-[460px]">
        {images.slice(0, 5).map((img, i) => (
          <button
            key={img.url + i}
            type="button"
            onClick={() => setIndex(i)}
            className={`group relative overflow-hidden bg-bg-alt ${i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block"}`}
            aria-label={`Open photo ${i + 1} of ${n}`}
          >
            <Image src={img.url} alt={img.alt ?? title} fill priority={i === 0} sizes={i === 0 ? "(min-width:640px) 50vw, 100vw" : "25vw"} className="object-cover transition duration-700 group-hover:scale-105" />
          </button>
        ))}
        <button type="button" onClick={() => setIndex(0)} className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-[#1b2232] shadow-lg hover:bg-white">
          <Grid2x2 size={16} /> Show all {n} photos
        </button>
      </div>

      {index != null && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          onTouchStart={(e) => (touchX = e.touches[0]!.clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0]!.clientX - touchX;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between p-4 text-white/80">
            <span className="text-sm">
              {index + 1} / {n}
            </span>
            <button type="button" onClick={() => setIndex(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close gallery">
              <X size={22} />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={images[index]!.url} alt={images[index]!.alt ?? title} fill sizes="100vw" className="object-contain" />
            <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous photo">
              <ChevronLeft size={24} />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next photo">
              <ChevronRight size={24} />
            </button>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto p-4">
            {images.map((img, i) => (
              <button key={img.url + i} type="button" onClick={() => setIndex(i)} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ${i === index ? "ring-2 ring-gold" : "opacity-60 hover:opacity-100"}`} aria-label={`Photo ${i + 1}`}>
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
