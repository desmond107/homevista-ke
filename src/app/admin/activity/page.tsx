import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTimeLabel } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { Pagination } from "@/components/ui";

const PAGE = 50;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin("settings");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where = sp.q ? { OR: [{ action: { contains: sp.q, mode: "insensitive" as const } }, { user: { email: { contains: sp.q, mode: "insensitive" as const } } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { user: { select: { name: true, email: true } } } }),
  ]);
  return (
    <>
      <DashHeader title="Audit log" intro="Sign-ins, moderation decisions, KYC document views, exports and settings changes." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Filter by action or email (e.g. kyc, login)" className="input !w-80" /><button className="btn-primary">Filter</button></form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target / detail</th><th>IP</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-xs whitespace-nowrap text-ink-2">{dateTimeLabel(r.createdAt)}</td>
                <td className="text-xs">{r.user ? <><span className="block text-ink">{r.user.name}</span><span className="text-muted">{r.user.email}</span></> : <span className="text-muted">—</span>}</td>
                <td><code className="rounded bg-bg-alt px-1.5 py-0.5 text-xs">{r.action}</code></td>
                <td className="max-w-sm text-xs break-all text-ink-2">{r.target}{r.detail ? ` — ${r.detail}` : ""}</td>
                <td className="text-xs text-muted">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(total / PAGE)} href={(n) => `/admin/activity?${sp.q ? `q=${encodeURIComponent(sp.q)}&` : ""}page=${n}`} />
    </>
  );
}
