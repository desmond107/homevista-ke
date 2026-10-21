import Link from "next/link";
import { PURPOSE_LABELS, PURPOSE_SLUGS, type PurposeKey } from "@/lib/constants";
import type { SearchFilters } from "@/lib/search";

type Opt = { name: string; slug: string };

/**
 * Advanced filters as a plain GET form: works without JavaScript, produces shareable SEO-friendly URLs.
 */
export function Filters({
  f,
  counties,
  types,
  amenities,
  categories,
}: {
  f: SearchFilters;
  counties: (Opt & { towns: Opt[] })[];
  types: Opt[];
  amenities: Opt[];
  categories: Opt[];
}) {
  const sel = "input !py-2";
  return (
    <form action="/properties" method="get" className="space-y-5 text-sm">
      <input type="hidden" name="sort" value={f.sort} />
      <input type="hidden" name="view" value={f.view} />

      <fieldset>
        <legend className="label">Purpose</legend>
        <div className="grid grid-cols-2 gap-1.5">
          <Radio name="purpose" value="" label="Any" checked={!f.purpose} />
          {(Object.keys(PURPOSE_LABELS) as PurposeKey[]).map((k) => (
            <Radio key={k} name="purpose" value={PURPOSE_SLUGS[k]} label={PURPOSE_LABELS[k]} checked={f.purpose === k} />
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="f-county">
          County
        </label>
        <select id="f-county" name="county" defaultValue={f.county ?? ""} className={sel}>
          <option value="">All counties</option>
          {counties.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-town">
          Town / area
        </label>
        <select id="f-town" name="town" defaultValue={f.town ?? ""} className={sel}>
          <option value="">Any area</option>
          {counties
            .filter((c) => !f.county || c.slug === f.county)
            .map((c) => (
              <optgroup key={c.slug} label={c.name}>
                {c.towns.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-q">
          Estate or keyword
        </label>
        <input id="f-q" name="q" defaultValue={f.q ?? ""} placeholder="e.g. Kirichwa Road, pool" className={sel} />
      </div>

      <div>
        <label className="label" htmlFor="f-type">
          Property type
        </label>
        <select id="f-type" name="type" defaultValue={f.types[0] ?? ""} className={sel}>
          <option value="">Any type</option>
          {types.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="label">Price (KSh)</span>
        <div className="grid grid-cols-2 gap-2">
          <input name="minPrice" inputMode="numeric" placeholder="Min" defaultValue={f.minPrice ?? ""} className={sel} aria-label="Minimum price" />
          <input name="maxPrice" inputMode="numeric" placeholder="Max" defaultValue={f.maxPrice ?? ""} className={sel} aria-label="Maximum price" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="f-beds">
            Bedrooms
          </label>
          <select id="f-beds" name="beds" defaultValue={f.beds ?? ""} className={sel}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-baths">
            Bathrooms
          </label>
          <select id="f-baths" name="baths" defaultValue={f.baths ?? ""} className={sel}>
            <option value="">Any</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className="label">Size (sq ft / acres)</span>
        <div className="grid grid-cols-2 gap-2">
          <input name="minSize" inputMode="numeric" placeholder="Min" defaultValue={f.minSize ?? ""} className={sel} aria-label="Minimum size" />
          <input name="maxSize" inputMode="numeric" placeholder="Max" defaultValue={f.maxSize ?? ""} className={sel} aria-label="Maximum size" />
        </div>
      </div>

      <fieldset>
        <legend className="label">Furnishing</legend>
        <div className="grid grid-cols-3 gap-1.5">
          <Radio name="furnished" value="" label="Any" checked={!f.furnished} />
          <Radio name="furnished" value="yes" label="Furnished" checked={f.furnished === "yes"} />
          <Radio name="furnished" value="no" label="Unfurnished" checked={f.furnished === "no"} />
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="f-rating">
          Minimum rating
        </label>
        <select id="f-rating" name="minRating" defaultValue={f.minRating ?? ""} className={sel}>
          <option value="">Any rating</option>
          {[4.5, 4, 3].map((n) => (
            <option key={n} value={n}>
              {n}★ & up
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="f-posted">
          Listed
        </label>
        <select id="f-posted" name="posted" defaultValue={f.posted ?? ""} className={sel}>
          <option value="">Any time</option>
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>

      <div className="space-y-2">
        <Check name="verified" value="1" label="Verified listers only" checked={f.verified} gold />
        <Check name="media" value="1" label="With video / virtual tour" checked={f.media} />
      </div>

      <fieldset>
        <legend className="label">Amenities</legend>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          {amenities.map((a) => (
            <Check key={a.slug} name="amenities" value={a.slug} label={a.name} checked={f.amenities.includes(a.slug)} small />
          ))}
        </div>
      </fieldset>

      {categories.length > 0 && (
        <div>
          <label className="label" htmlFor="f-cat">
            Collection
          </label>
          <select id="f-cat" name="category" defaultValue={f.category ?? ""} className={sel}>
            <option value="">All collections</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="sticky bottom-0 -mx-1 flex gap-2 bg-surface px-1 pt-2 pb-1">
        <button type="submit" className="btn-primary flex-1">
          Apply filters
        </button>
        <Link href="/properties" className="btn-outline">
          Reset
        </Link>
      </div>
    </form>
  );
}

function Radio({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="block rounded-lg border border-line px-2 py-1.5 text-center text-xs text-ink-2 transition peer-checked:border-navy peer-checked:bg-navy peer-checked:text-on-navy peer-focus-visible:ring-2 peer-focus-visible:ring-gold hover:border-gold">
        {label}
      </span>
    </label>
  );
}

function Check({ name, value, label, checked, small, gold }: { name: string; value: string; label: string; checked: boolean; small?: boolean; gold?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 ${small ? "text-xs" : "text-sm"} text-ink-2`}>
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className={`h-4 w-4 rounded border-line-strong ${gold ? "accent-[var(--gold)]" : "accent-[var(--navy)]"}`} />
      {label}
    </label>
  );
}
