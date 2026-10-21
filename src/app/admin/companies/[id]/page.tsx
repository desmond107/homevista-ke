import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashHeader } from "@/components/DashShell";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { saveCompanyAction } from "@/app/actions/admin";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("directory");
  const { id } = await params;
  const c = id === "new" ? null : await prisma.company.findUnique({ where: { id } });
  if (id !== "new" && !c) notFound();
  return (
    <>
      <DashHeader title={c ? `Edit ${c.name}` : "Add company"} />
      <ActionForm action={saveCompanyAction} className="card max-w-3xl space-y-4 p-6">
        {c && <input type="hidden" name="id" value={c.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" htmlFor="c-name"><input id="c-name" name="name" defaultValue={c?.name} required className="input" /></Field>
          <Field label="Founded (year)" htmlFor="c-year"><input id="c-year" name="foundedYear" type="number" min={1900} max={2100} defaultValue={c?.foundedYear ?? ""} className="input" /></Field>
          <Field label="Phone" htmlFor="c-phone"><input id="c-phone" name="phone" defaultValue={c?.phone ?? ""} className="input" /></Field>
          <Field label="Email" htmlFor="c-email"><input id="c-email" name="email" type="email" defaultValue={c?.email ?? ""} className="input" /></Field>
          <Field label="Website" htmlFor="c-web"><input id="c-web" name="website" defaultValue={c?.website ?? ""} placeholder="https://" className="input" /></Field>
          <Field label="Office address" htmlFor="c-addr"><input id="c-addr" name="address" defaultValue={c?.address ?? ""} className="input" /></Field>
        </div>
        <Field label="Description" htmlFor="c-desc"><textarea id="c-desc" name="description" rows={5} defaultValue={c?.description} required className="input" /></Field>
        <Field label="Areas served" htmlFor="c-areas" hint="Comma or line separated"><textarea id="c-areas" name="areasServed" rows={2} defaultValue={c?.areasServed.join(", ")} className="input" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo" htmlFor="c-logo"><input id="c-logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></Field>
          <Field label="Cover image" htmlFor="c-cover"><input id="c-cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></Field>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="verified" defaultChecked={c?.verified} className="h-4 w-4 accent-[var(--navy)]" /> Verified</label>
          <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="featured" defaultChecked={c?.featured} className="h-4 w-4 accent-[var(--navy)]" /> Featured on homepage</label>
        </div>
        <SubmitButton>Save company</SubmitButton>
      </ActionForm>
    </>
  );
}
