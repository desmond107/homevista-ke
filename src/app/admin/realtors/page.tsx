import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashHeader } from "@/components/DashShell";
import { ActButton } from "@/components/admin/ActButton";
import { Avatar, Pill } from "@/components/ui";
import { deleteDirectoryAction } from "@/app/actions/admin";

export default async function AdminRealtorsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin("directory");
  const sp = await searchParams;
  const realtors = await prisma.realtor.findMany({ orderBy: { name: "asc" }, include: { company: { select: { name: true } }, lister: { select: { displayName: true } } } });
  return (
    <>
      <DashHeader title="Realtors & agents" intro="Shown on the public “Our Realtors” directory with individual profile pages." action={<Link href="/admin/realtors/new" className="btn-gold"><Plus size={16} /> Add realtor</Link>} />
      {sp.saved && <p className="mb-4 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">Realtor saved.</p>}
      <div className="card overflow-x-auto">
        <table className="table table-stack">
          <thead><tr><th>Realtor</th><th>Company</th><th>Specialties</th><th>Rating</th><th>Status</th><th /></tr></thead>
          <tbody>
            {realtors.map((r) => (
              <tr key={r.id}>
                <td><div className="flex items-center gap-3"><Avatar name={r.name} src={r.photoUrl} size={36} /><span><Link href={`/realtors/${r.slug}`} className="font-medium text-ink hover:text-gold-deep">{r.name}</Link><span className="block text-xs text-muted">{r.earbNumber ?? "No EARB no."}{r.lister ? ` · linked to ${r.lister.displayName}` : ""}</span></span></div></td>
                <td data-label="Company" className="stack-inline text-xs">{r.company?.name ?? "Independent"}</td>
                <td data-label="Specialties" className="max-w-[220px] text-xs text-ink-2">{r.specialties.join(", ")}</td>
                <td data-label="Rating" className="stack-inline text-xs">{r.rating.toFixed(1)} ({r.ratingCount})</td>
                <td data-label="Status" className="stack-inline space-x-1">{r.verified ? <Pill tone="gold">Verified</Pill> : <Pill>Unverified</Pill>}{r.featured && <Pill tone="navy">Featured</Pill>}</td>
                <td><div className="flex justify-end gap-1.5"><Link href={`/admin/realtors/${r.id}`} className="btn-outline btn-sm">Edit</Link><ActButton action={deleteDirectoryAction.bind(null, "realtor", r.id)} confirm={`Delete ${r.name}?`} className="btn-ghost btn-sm text-danger">Delete</ActButton></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
