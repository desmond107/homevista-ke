import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LISTING_STATUS_LABELS } from "@/lib/constants";
import { DashHeader } from "@/components/DashShell";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Pill, statusTone } from "@/components/ui";
import { adminEditListingAction } from "@/app/actions/admin";

export default async function AdminEditListing({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("listings");
  const { id } = await params;
  const p = await prisma.property.findUnique({ where: { id }, include: { lister: { select: { displayName: true } }, reports: { orderBy: { createdAt: "desc" }, include: { reporter: { select: { name: true } } } } } });
  if (!p) notFound();
  return (
    <>
      <DashHeader title="Edit listing" intro={<span className="flex items-center gap-2">{p.lister.displayName} · <Pill tone={statusTone(p.status)}>{LISTING_STATUS_LABELS[p.status]}</Pill></span>} action={<Link href={`/properties/${p.slug}`} className="btn-outline">View listing</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ActionForm action={adminEditListingAction} className="card space-y-4 p-6">
          <input type="hidden" name="id" value={p.id} />
          <Field label="Title" htmlFor="a-title"><input id="a-title" name="title" defaultValue={p.title} required className="input" /></Field>
          <Field label="Price (KSh)" htmlFor="a-price"><input id="a-price" name="price" type="number" defaultValue={p.price} required className="input" /></Field>
          <Field label="Description" htmlFor="a-desc"><textarea id="a-desc" name="description" rows={10} defaultValue={p.description} required className="input" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="featured" defaultChecked={p.featured} className="h-4 w-4 accent-[var(--navy)]" /> Featured on homepage</label>
            <Field label="Featured rank (higher shows first)" htmlFor="a-rank"><input id="a-rank" name="featuredRank" type="number" min={0} max={100} defaultValue={p.featuredRank} className="input" /></Field>
          </div>
          <Field label="Moderator note (visible to lister)" htmlFor="a-note"><input id="a-note" name="statusNote" defaultValue={p.statusNote ?? ""} className="input" /></Field>
          <SubmitButton>Save changes</SubmitButton>
          <p className="text-xs text-muted">Use the Listings table to approve, reject, pause or remove. Photos and location are edited by the lister.</p>
        </ActionForm>
        <section className="card p-5">
          <h2 className="mb-3 text-xl">Reports</h2>
          <ul className="space-y-3 text-sm">
            {p.reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-bg-alt p-3">
                <p className="font-medium text-ink">{r.reason} <Pill tone={statusTone(r.status)}>{r.status.toLowerCase()}</Pill></p>
                {r.details && <p className="mt-1 text-ink-2">{r.details}</p>}
                <p className="mt-1 text-xs text-muted">by {r.reporter?.name ?? "deleted user"}</p>
              </li>
            ))}
            {!p.reports.length && <li className="text-muted">No reports.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
