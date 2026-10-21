"use client";

import dynamic from "next/dynamic";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { saveListingAction } from "@/app/actions/lister";
import { MAX_PROPERTY_IMAGES, PURPOSES, PURPOSE_LABELS } from "@/lib/constants";
import { FormMessage } from "./forms";
import { cx } from "./ui";

const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-2xl bg-bg-alt" /> });

type Opt = { id: string; name: string };
type County = Opt & { lat: number; lng: number; towns: (Opt & { lat: number; lng: number })[] };
export type ListingInitial = {
  id?: string;
  title?: string;
  description?: string;
  purpose?: string;
  typeId?: string;
  price?: number;
  pricePeriod?: string;
  countyId?: string;
  townId?: string | null;
  estate?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size?: number | null;
  sizeUnit?: string;
  furnished?: boolean;
  titleDeed?: boolean | null;
  videoUrl?: string | null;
  tourUrl?: string | null;
  availableFrom?: string | null;
  amenityIds?: string[];
  categoryIds?: string[];
  images?: { id: string; url: string }[];
};

type Photo = { key: string; kind: "existing"; id: string; url: string } | { key: string; kind: "new"; file: File; url: string };

/** Downscale large photos in the browser (≤2000px JPEG) so uploads from phones are fast. */
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 900_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function ListingForm({ initial, types, counties, amenities, categories }: { initial: ListingInitial; types: Opt[]; counties: County[]; amenities: Opt[]; categories: Opt[] }) {
  const [state, action, pending] = useActionState(saveListingAction, null);
  const [purpose, setPurpose] = useState(initial.purpose ?? "RENT");
  const [countyId, setCountyId] = useState(initial.countyId ?? counties[0]?.id ?? "");
  const [townId, setTownId] = useState(initial.townId ?? "");
  const county = counties.find((c) => c.id === countyId);
  const town = county?.towns.find((t) => t.id === townId);
  const [pin, setPin] = useState<{ lat: number; lng: number }>({
    lat: initial.lat ?? town?.lat ?? county?.lat ?? -1.2864,
    lng: initial.lng ?? town?.lng ?? county?.lng ?? 36.8172,
  });
  const [photos, setPhotos] = useState<Photo[]>(() => (initial.images ?? []).map((i) => ({ key: i.id, kind: "existing" as const, id: i.id, url: i.url })));
  const [processing, setProcessing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const intent = useRef<"publish" | "draft">("publish");

  useEffect(() => () => photos.forEach((p) => p.kind === "new" && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state && !state.ok) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state]);

  const isSale = purpose === "SALE" || purpose === "OFF_PLAN";
  const periodDefault = useMemo(() => (purpose === "SHORT_STAY" ? "NIGHT" : "MONTH"), [purpose]);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setProcessing(true);
    const room = MAX_PROPERTY_IMAGES - photos.length;
    const files = await Promise.all([...list].slice(0, room).map(compress));
    setPhotos((cur) => [...cur, ...files.map((f, i) => ({ key: `n${Date.now()}${i}`, kind: "new" as const, file: f, url: URL.createObjectURL(f) }))]);
    setProcessing(false);
  }
  const move = (from: number, to: number) =>
    setPhotos((cur) => {
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m!);
      return next;
    });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("intent", intent.current);
    fd.set("lat", String(pin.lat));
    fd.set("lng", String(pin.lng));
    fd.delete("images");
    let n = 0;
    for (const p of photos) {
      if (p.kind === "existing") {
        fd.append("keepImages", p.id);
        fd.append("imageOrder", `e:${p.id}`);
      } else {
        fd.append("images", p.file);
        fd.append("imageOrder", `n:${n++}`);
      }
    }
    startTransition(() => action(fd));
  }

  const section = "card space-y-5 p-6";
  return (
    <form ref={formRef} onSubmit={submit} className="space-y-6" noValidate={false}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <FormMessage state={state} />

      <section className={section}>
        <h2 className="text-xl">Basics</h2>
        <div>
          <span className="label">Listing purpose</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PURPOSES.map((p) => (
              <label key={p} className="cursor-pointer">
                <input type="radio" name="purpose" value={p} checked={purpose === p} onChange={() => setPurpose(p)} className="peer sr-only" />
                <span className="block rounded-xl border border-line px-3 py-2.5 text-center text-sm transition peer-checked:border-navy peer-checked:bg-navy peer-checked:text-on-navy peer-focus-visible:ring-2 peer-focus-visible:ring-gold hover:border-gold">
                  {PURPOSE_LABELS[p]}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="l-title">Title</label>
          <input id="l-title" name="title" defaultValue={initial.title} required minLength={10} maxLength={120} placeholder="e.g. Elegant 3-Bedroom Apartment with Pool, Kilimani" className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="l-type">Property type</label>
            <select id="l-type" name="typeId" defaultValue={initial.typeId ?? ""} required className="input">
              <option value="" disabled>Choose…</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="l-price">Price (KSh)</label>
            <div className="flex gap-2">
              <input id="l-price" name="price" type="number" min={1} step={1} defaultValue={initial.price} required className="input" />
              {!isSale ? (
                <select name="pricePeriod" defaultValue={initial.pricePeriod && initial.pricePeriod !== "TOTAL" ? initial.pricePeriod : periodDefault} key={purpose} className="input !w-36" aria-label="Price period">
                  <option value="MONTH">/ month</option>
                  <option value="NIGHT">/ night</option>
                  <option value="WEEK">/ week</option>
                  <option value="YEAR">/ year</option>
                </select>
              ) : (
                <input type="hidden" name="pricePeriod" value="TOTAL" />
              )}
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="l-desc">Description</label>
          <textarea id="l-desc" name="description" defaultValue={initial.description} rows={8} required minLength={40} maxLength={8000} className="input" placeholder="Describe the layout, finishes, neighbourhood, nearby schools and transport. Leave a blank line between paragraphs." />
        </div>
      </section>

      <section className={section}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl">Photos</h2>
          <span className="text-xs text-muted">{photos.length} / {MAX_PROPERTY_IMAGES} · first photo is the cover · drag to reorder</span>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li
              key={p.key}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex != null) move(dragIndex, i);
                setDragIndex(null);
              }}
              className={cx("group relative aspect-[4/3] overflow-hidden rounded-xl border bg-bg-alt", i === 0 ? "border-gold ring-2 ring-gold/40" : "border-line", dragIndex === i && "opacity-50")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full cursor-grab object-cover" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-[#0c1a2e]"><Star size={10} /> Cover</span>}
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} className="rounded-full bg-white/90 p-1 text-[#1b2232]" aria-label="Move earlier"><ArrowLeft size={13} /></button>
                  <button type="button" onClick={() => move(i, i + 1)} className="rounded-full bg-white/90 p-1 text-[#1b2232]" aria-label="Move later"><ArrowRight size={13} /></button>
                </span>
                <button type="button" onClick={() => setPhotos((c) => c.filter((x) => x.key !== p.key))} className="rounded-full bg-white/90 p-1 text-[#b4423a]" aria-label="Remove photo"><X size={13} /></button>
              </div>
            </li>
          ))}
          {photos.length < MAX_PROPERTY_IMAGES && (
            <li>
              <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong text-sm text-ink-2 transition hover:border-gold hover:text-gold-deep">
                {processing ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
                Add photos
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              </label>
            </li>
          )}
        </ul>
        <p className="text-xs text-muted">JPG, PNG or WebP up to 12 MB each. Location data (EXIF) is stripped automatically.</p>
      </section>

      <section className={section}>
        <h2 className="text-xl">Location</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="l-county">County</label>
            <select
              id="l-county"
              name="countyId"
              value={countyId}
              onChange={(e) => {
                const c = counties.find((x) => x.id === e.target.value)!;
                setCountyId(c.id);
                setTownId("");
                setPin({ lat: c.lat, lng: c.lng });
              }}
              className="input"
            >
              {counties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="l-town">Town / area</label>
            <select
              id="l-town"
              name="townId"
              value={townId}
              onChange={(e) => {
                setTownId(e.target.value);
                const t = county?.towns.find((x) => x.id === e.target.value);
                if (t) setPin({ lat: t.lat, lng: t.lng });
              }}
              className="input"
            >
              <option value="">—</option>
              {county?.towns.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="l-estate">Estate / road</label>
            <input id="l-estate" name="estate" defaultValue={initial.estate ?? ""} maxLength={80} placeholder="e.g. Kirichwa Road" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="l-address">Exact address <span className="font-normal text-muted">(🔒 shown only to seekers who unlock)</span></label>
          <input id="l-address" name="address" defaultValue={initial.address ?? ""} required maxLength={200} placeholder="Building, floor/unit, street" className="input" />
        </div>
        <div>
          <span className="label">Map pin <span className="font-normal text-muted">(🔒 exact pin shown only after unlock; the public map shows an approximate area)</span></span>
          <LocationPicker lat={pin.lat} lng={pin.lng} onChange={(lat, lng) => setPin({ lat, lng })} />
          <p className="mt-1.5 text-xs text-muted">Click the map or drag the pin. {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</p>
        </div>
      </section>

      <section className={section}>
        <h2 className="text-xl">Details</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="l-beds">Bedrooms</label>
            <input id="l-beds" name="bedrooms" type="number" min={0} max={50} defaultValue={initial.bedrooms ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="l-baths">Bathrooms</label>
            <input id="l-baths" name="bathrooms" type="number" min={0} max={50} defaultValue={initial.bathrooms ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="l-size">Size</label>
            <input id="l-size" name="size" type="number" min={0} step="any" defaultValue={initial.size ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="l-unit">Unit</label>
            <select id="l-unit" name="sizeUnit" defaultValue={initial.sizeUnit ?? "SQFT"} className="input">
              <option value="SQFT">sq ft</option>
              <option value="SQM">m²</option>
              <option value="ACRES">acres</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2.5 text-sm text-ink-2">
            <input type="checkbox" name="furnished" defaultChecked={initial.furnished} className="h-4 w-4 accent-[var(--navy)]" /> Furnished
          </label>
          {isSale && (
            <label className="flex items-center gap-2.5 text-sm text-ink-2">
              <input type="checkbox" name="titleDeed" defaultChecked={!!initial.titleDeed} className="h-4 w-4 accent-[var(--navy)]" /> Title deed available
            </label>
          )}
          <div>
            <label className="label" htmlFor="l-avail">Available from</label>
            <input id="l-avail" name="availableFrom" type="date" defaultValue={initial.availableFrom ?? ""} className="input" />
          </div>
        </div>
        <fieldset>
          <legend className="label">Amenities</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {amenities.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" name="amenities" value={a.id} defaultChecked={initial.amenityIds?.includes(a.id)} className="h-4 w-4 accent-[var(--navy)]" /> {a.name}
              </label>
            ))}
          </div>
        </fieldset>
        {categories.length > 0 && (
          <fieldset>
            <legend className="label">Collections (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <label key={c.id} className="cursor-pointer">
                  <input type="checkbox" name="categories" value={c.id} defaultChecked={initial.categoryIds?.includes(c.id)} className="peer sr-only" />
                  <span className="chip peer-checked:!border-navy peer-checked:!bg-navy peer-checked:!text-on-navy">{c.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      <section className={section}>
        <h2 className="text-xl">Video & virtual tour <span className="text-sm font-normal text-muted">(optional)</span></h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="l-video">Video link</label>
            <input id="l-video" name="videoUrl" type="url" defaultValue={initial.videoUrl ?? ""} placeholder="https://youtube.com/watch?v=…" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="l-tour">Virtual tour link</label>
            <input id="l-tour" name="tourUrl" type="url" defaultValue={initial.tourUrl ?? ""} placeholder="https://my.matterport.com/show/?m=…" className="input" />
          </div>
        </div>
        <p className="text-xs text-muted">YouTube, Vimeo, Matterport and Kuula links embed on your listing; other links open in a new tab.</p>
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <button type="submit" onClick={() => (intent.current = "draft")} disabled={pending || processing} className="btn-outline">
          Save draft
        </button>
        <button type="submit" onClick={() => (intent.current = "publish")} disabled={pending || processing} className="btn-gold">
          {pending && <Loader2 size={16} className="animate-spin" />}
          {initial.id ? "Save changes" : "Publish listing"}
        </button>
      </div>
    </form>
  );
}
