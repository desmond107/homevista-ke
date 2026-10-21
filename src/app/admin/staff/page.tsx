import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/permissions";
import { dateLabel } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/ui";
import { saveStaffAction } from "@/app/actions/admin";

const PERMS = (Object.keys(ADMIN_PERMISSIONS) as AdminPermission[]).filter((p) => p !== "staff");

function PermForm({ email, current }: { email?: string; current?: string[] }) {
  return (
    <ActionForm action={saveStaffAction} className="space-y-3" resetOnSuccess={!email}>
      {email ? <input type="hidden" name="email" value={email} /> : <input name="email" type="email" placeholder="Their account email" required className="input !w-72" />}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {PERMS.map((p) => (
          <label key={p} className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" name="permissions" value={p} defaultChecked={current?.includes(p)} className="h-4 w-4 accent-[var(--navy)]" /> {ADMIN_PERMISSIONS[p]}
          </label>
        ))}
      </div>
      <SubmitButton className="btn-primary btn-sm">{email ? "Save permissions" : "Grant admin access"}</SubmitButton>
      {email && <p className="text-xs text-muted">Untick everything and save to remove admin access.</p>}
    </ActionForm>
  );
}

export default async function StaffPage() {
  await requireAdmin("staff");
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }] });
  return (
    <>
      <DashHeader title="Staff admins" intro="Give team members only the permissions they need. Super admins have full access and can't be edited here." />
      <section className="card mb-6 p-6">
        <h2 className="mb-3 text-xl">Add a staff admin</h2>
        <p className="mb-3 text-xs text-muted">They must already have a (non-lister) account. They&apos;ll be signed out and get admin access at their next sign-in.</p>
        <PermForm />
      </section>
      <ul className="space-y-3">
        {admins.map((a) => (
          <li key={a.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-medium text-ink">{a.name}</p><p className="text-xs text-muted">{a.email} · since {dateLabel(a.createdAt)} · last sign-in {dateLabel(a.lastLoginAt)}</p></div>
              {a.isSuperAdmin ? <Pill tone="gold">Super admin</Pill> : <Pill>{a.adminPermissions.length} permissions</Pill>}
            </div>
            {!a.isSuperAdmin && (
              <details className="mt-3"><summary className="cursor-pointer text-sm text-gold-deep">Edit permissions</summary><div className="mt-3"><PermForm email={a.email} current={a.adminPermissions} /></div></details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
