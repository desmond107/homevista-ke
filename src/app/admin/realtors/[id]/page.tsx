import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashHeader } from "@/components/DashShell";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { saveRealtorAction } from "@/app/actions/admin";

export default async function EditRealtorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("directory");
  const { id } = await params;
  const [r, companies, listers] = await Promise.all([
    id === "new" ? null : prisma.realtor.findUnique({ where: { id } }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.listerProfile.findMany({ orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
  ]);
  if (id !== "new" && !r) notFound();
  return (
    <>
      <DashHeader title={r ? `Edit ${r.name}` : "Add realtor"} />
      <ActionForm action={saveRealtorAction} className="card max-w-3xl space-y-4 p-6">
        {r && <input type="hidden" name="id" value={r.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="r-name"><input id="r-name" name="name" defaultValue={r?.name} required className="input" /></Field>
          <Field label="Company" htmlFor="r-co">
            <select id="r-co" name="companyId" defaultValue={r?.companyId ?? ""} className="input">
              <option value="">Independent</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Phone" htmlFor="r-phone"><input id="r-phone" name="phone" defaultValue={r?.phone ?? ""} className="input" /></Field>
          <Field label="Email" htmlFor="r-email"><input id="r-email" name="email" type="email" defaultValue={r?.email ?? ""} className="input" /></Field>
          <Field label="EARB registration no." htmlFor="r-earb"><input id="r-earb" name="earbNumber" defaultValue={r?.earbNumber ?? ""} className="input" /></Field>
          <Field label="Years of experience" htmlFor="r-years"><input id="r-years" name="yearsExperience" type="number" min={0} max={60} defaultValue={r?.yearsExperience ?? ""} className="input" /></Field>
          <Field label="Rating (0–5)" htmlFor="r-rating"><input id="r-rating" name="rating" type="number" step="0.1" min={0} max={5} defaultValue={r?.rating ?? ""} className="input" /></Field>
          <Field label="Linked lister account" htmlFor="r-lister" hint="Shows their live listings on the profile.">
            <select id="r-lister" name="listerId" defaultValue={r?.listerId ?? ""} className="input">
              <option value="">None</option>
              {listers.map((l) => <option key={l.id} value={l.id}>{l.displayName}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Bio" htmlFor="r-bio"><textarea id="r-bio" name="bio" rows={5} defaultValue={r?.bio} required className="input" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Specialties" htmlFor="r-spec" hint="Comma separated"><input id="r-spec" name="specialties" defaultValue={r?.specialties.join(", ")} className="input" /></Field>
          <Field label="Areas" htmlFor="r-areas" hint="Comma separated"><input id="r-areas" name="areas" defaultValue={r?.areas.join(", ")} className="input" /></Field>
        </div>
        <Field label="Photo" htmlFor="r-photo"><input id="r-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></Field>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="verified" defaultChecked={r?.verified} className="h-4 w-4 accent-[var(--navy)]" /> Verified</label>
          <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="featured" defaultChecked={r?.featured} className="h-4 w-4 accent-[var(--navy)]" /> Featured on homepage</label>
        </div>
        <SubmitButton>Save realtor</SubmitButton>
      </ActionForm>
    </>
  );
}
