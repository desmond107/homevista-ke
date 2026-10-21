"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { PURPOSE_LABELS, PURPOSE_SLUGS, type PurposeKey } from "@/lib/constants";
import { cx } from "./ui";

export type LocationOption = { name: string; slug: string; towns: { name: string; slug: string }[] };

const PRICE_PRESETS: Record<"buy" | "rent" | "stay", number[]> = {
  buy: [1_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000, 250_000_000],
  rent: [5_000, 10_000, 20_000, 35_000, 50_000, 80_000, 120_000, 200_000, 350_000],
  stay: [3_000, 5_000, 8_000, 12_000, 20_000, 35_000, 60_000],
};

const fmt = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1_000}K`);

export function HeroSearch({ counties, types }: { counties: LocationOption[]; types: { name: string; slug: string }[] }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<PurposeKey>("RENT");
  const [loc, setLoc] = useState("");
  const [type, setType] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const presets = PRICE_PRESETS[purpose === "RENT" ? "rent" : purpose === "SHORT_STAY" ? "stay" : "buy"];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ purpose: PURPOSE_SLUGS[purpose] });
    if (loc.startsWith("c:")) q.set("county", loc.slice(2));
    if (loc.startsWith("t:")) {
      const [county, town] = loc.slice(2).split("/");
      q.set("county", county!);
      q.set("town", town!);
    }
    if (type) q.set("type", type);
    if (min) q.set("minPrice", min);
    if (max) q.set("maxPrice", max);
    router.push(`/properties?${q}`);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-4xl" role="search" aria-label="Find a property">
      <div role="tablist" aria-label="Purpose" className="mb-3 inline-flex gap-1 rounded-full bg-white/10 p-1 backdrop-blur-md">
        {(Object.keys(PURPOSE_LABELS) as PurposeKey[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={purpose === k}
            onClick={() => {
              setPurpose(k);
              setMin("");
              setMax("");
            }}
            className={cx("rounded-full px-3.5 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm", purpose === k ? "bg-gold text-[#0c1a2e]" : "text-white/85 hover:text-white")}
          >
            {PURPOSE_LABELS[k]}
          </button>
        ))}
      </div>
      <div className="grid gap-2 rounded-3xl bg-surface p-2.5 shadow-lift sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_auto] lg:rounded-full lg:p-2">
        <label className="flex flex-col rounded-2xl px-4 py-2 transition hover:bg-bg-alt lg:rounded-full">
          <span className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">Location</span>
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className="-ml-1 w-full bg-transparent text-sm text-ink outline-none">
            <option value="">All of Kenya</option>
            {counties.map((c) => (
              <optgroup key={c.slug} label={c.name}>
                <option value={`c:${c.slug}`}>All of {c.name}</option>
                {c.towns.map((t) => (
                  <option key={t.slug} value={`t:${c.slug}/${t.slug}`}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col rounded-2xl px-4 py-2 transition hover:bg-bg-alt lg:rounded-full lg:border-l lg:border-line">
          <span className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">Property type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="-ml-1 w-full bg-transparent text-sm text-ink outline-none">
            <option value="">Any type</option>
            {types.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col rounded-2xl px-4 py-2 transition hover:bg-bg-alt sm:col-span-2 lg:col-span-1 lg:rounded-full lg:border-l lg:border-line">
          <span className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">Price range (KSh)</span>
          <div className="flex items-center gap-1">
            <select aria-label="Minimum price" value={min} onChange={(e) => setMin(e.target.value)} className="-ml-1 w-full bg-transparent text-sm text-ink outline-none">
              <option value="">No min</option>
              {presets.map((p) => (
                <option key={p} value={p}>
                  {fmt(p)}
                </option>
              ))}
            </select>
            <span className="text-muted">–</span>
            <select aria-label="Maximum price" value={max} onChange={(e) => setMax(e.target.value)} className="w-full bg-transparent text-sm text-ink outline-none">
              <option value="">No max</option>
              {presets.map((p) => (
                <option key={p} value={p}>
                  {fmt(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn-gold h-12 w-full !rounded-2xl sm:col-span-2 lg:col-span-1 lg:h-auto lg:w-auto lg:!rounded-full lg:px-7">
          <Search size={18} /> Search
        </button>
      </div>
    </form>
  );
}
