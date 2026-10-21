import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashHeader } from "@/components/DashShell";
import { ActButton } from "@/components/admin/ActButton";
import { ActionForm, SubmitButton } from "@/components/forms";
import { DynIcon } from "@/components/DynIcon";
import { Pill } from "@/components/ui";
import { deleteTaxonomyAction, saveTaxonomyAction } from "@/app/actions/admin";

type Kind = "type" | "amenity" | "category" | "county" | "town";

function TaxForm({ kind, row, counties, compact }: { kind: Kind; row?: Record<string, unknown>; counties?: { id: string; name: string }[]; compact?: boolean }) {
  const v = (k: string) => (row?.[k] as string | number | undefined) ?? "";
  return (
    <ActionForm action={saveTaxonomyAction} className={`grid gap-2 ${compact ? "sm:grid-cols-[1fr_auto]" : ""}`} resetOnSuccess={!row}>
      <input type="hidden" name="kind" value={kind} />
      {row && <input type="hidden" name="id" value={String(row.id)} />}
      <div className="flex flex-wrap gap-2">
        <input name="name" defaultValue={String(v("name"))} placeholder="Name" required className="input !w-48" />
        {(kind === "type" || kind === "amenity") && <input name="icon" defaultValue={String(v("icon"))} placeholder="lucide icon e.g. home" className="input !w-44" title="Any icon name from lucide.dev" />}
        {(kind === "type" || kind === "amenity" || kind === "category") && <input name="sortOrder" type="number" defaultValue={String(v("sortOrder") || 0)} className="input !w-20" title="Sort order" />}
        {kind === "category" && <input name="description" defaultValue={String(v("description"))} placeholder="Short description" className="input !w-64" />}
        {kind === "category" && <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-xs" title="Collection image" />}
        {(kind === "county" || kind === "town") && (
          <>
            <input name="lat" defaultValue={String(v("lat"))} placeholder="Latitude" required className="input !w-28" />
            <input name="lng" defaultValue={String(v("lng"))} placeholder="Longitude" required className="input !w-28" />
          </>
        )}
        {kind === "town" && (
          <select name="countyId" defaultValue={String(v("countyId"))} required className="input !w-40">
            <option value="">County…</option>
            {counties?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {kind === "county" && <label className="flex items-center gap-1.5 text-xs text-ink-2"><input type="checkbox" name="popular" defaultChecked={!!row?.popular} className="accent-[var(--navy)]" /> Popular</label>}
        {row && kind !== "county" && kind !== "town" && (
          <label className="flex items-center gap-1.5 text-xs text-ink-2"><input type="checkbox" name="active" defaultChecked={!!row.active} className="accent-[var(--navy)]" /> Active</label>
        )}
        <SubmitButton className="btn-primary btn-sm">{row ? "Save" : "Add"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function Section({ title, intro, children, addForm }: { title: string; intro?: string; children: React.ReactNode; addForm: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-xl">{title}</h2>
      {intro && <p className="mt-1 text-xs text-muted">{intro}</p>}
      <div className="mt-4 rounded-xl bg-bg-alt p-3">{addForm}</div>
      <ul className="mt-4 divide-y divide-line">{children}</ul>
    </section>
  );
}

export default async function TaxonomyPage() {
  await requireAdmin("taxonomy");
  const [types, amenities, categories, counties] = await Promise.all([
    prisma.propertyType.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { properties: true } } } }),
    prisma.amenity.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { properties: true } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { properties: true } } } }),
    prisma.county.findMany({ orderBy: { name: "asc" }, include: { towns: { orderBy: { name: "asc" }, include: { _count: { select: { properties: true } } } }, _count: { select: { properties: true } } } }),
  ]);
  const countyOpts = counties.map((c) => ({ id: c.id, name: c.name }));
  const Row = ({ kind, row, label, count, icon }: { kind: Kind; row: Record<string, unknown>; label: string; count: number; icon?: string }) => (
    <li className="py-2.5">
      <details>
        <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-ink">
            {icon && <DynIcon name={icon} size={16} className="text-gold-deep" />} {label}
            {row.active === false && <Pill tone="warning">Inactive</Pill>}
            {row.popular === true && <Pill tone="gold">Popular</Pill>}
          </span>
          <span className="text-xs text-muted">{count} listings · edit</span>
        </summary>
        <div className="mt-3 flex flex-wrap items-start gap-2">
          <TaxForm kind={kind} row={row} counties={countyOpts} />
          <ActButton action={deleteTaxonomyAction.bind(null, kind, String(row.id))} confirm={`Delete "${label}"?`} className="btn-ghost btn-sm text-danger">Delete</ActButton>
        </div>
      </details>
    </li>
  );

  return (
    <>
      <DashHeader title="Types, amenities & locations" intro="Changes apply immediately across search filters, listing forms and the homepage." />
      <div className="grid gap-6 2xl:grid-cols-2">
        <Section title="Property types" addForm={<TaxForm kind="type" />}>
          {types.map((t) => <Row key={t.id} kind="type" row={t} label={t.name} count={t._count.properties} icon={t.icon} />)}
        </Section>
        <Section title="Amenities" addForm={<TaxForm kind="amenity" />}>
          {amenities.map((a) => <Row key={a.id} kind="amenity" row={a} label={a.name} count={a._count.properties} icon={a.icon} />)}
        </Section>
        <Section title="Listing categories (collections)" intro="Curated groupings shown on the homepage and as a search filter." addForm={<TaxForm kind="category" />}>
          {categories.map((c) => <Row key={c.id} kind="category" row={c} label={c.name} count={c._count.properties} />)}
        </Section>
        <Section title="Counties & towns" intro="Coordinates position map pins. Popular counties appear on the homepage and footer." addForm={<div className="space-y-2"><TaxForm kind="county" /><TaxForm kind="town" counties={countyOpts} /></div>}>
          {counties.map((c) => (
            <li key={c.id} className="py-2">
              <Row kind="county" row={c} label={c.name} count={c._count.properties} />
              <ul className="ml-5 border-l border-line pl-4">
                {c.towns.map((t) => <Row key={t.id} kind="town" row={t} label={t.name} count={t._count.properties} />)}
              </ul>
            </li>
          ))}
        </Section>
      </div>
    </>
  );
}
