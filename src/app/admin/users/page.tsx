import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KYC_LABELS, LISTER_TYPE_LABELS } from "@/lib/constants";
import { dateLabel, prettyPhone } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActButton } from "@/components/admin/ActButton";
import { Pagination, Pill, VerifiedBadge, statusTone } from "@/components/ui";
import { deleteUserAction, setBadgeAction, setUserStatusAction } from "@/app/actions/admin";

const PAGE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }> }) {
  await requireAdmin("users");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.UserWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q.replace(/\D/g, "") || sp.q } }, { lister: { displayName: { contains: sp.q, mode: "insensitive" } } }] } : {}),
    ...(sp.role ? { role: sp.role as never } : {}),
    ...(sp.status ? { status: sp.status as never } : {}),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { lister: { select: { id: true, slug: true, displayName: true, type: true, kycStatus: true, verified: true, subscriptionEndsAt: true, _count: { select: { listings: true } } } }, _count: { select: { unlocks: true, payments: true } } },
    }),
  ]);
  const qs = (p: number) => `/admin/users?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.role ? { role: sp.role } : {}), ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`;

  return (
    <>
      <DashHeader title="Users & listers" intro={`${total.toLocaleString()} accounts`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search name, email, phone, business…" className="input basis-full sm:!w-72 sm:basis-auto" />
        <select name="role" defaultValue={sp.role ?? ""} className="input !w-40">
          <option value="">All roles</option>
          <option value="USER">Seekers</option>
          <option value="LISTER">Listers</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input !w-40">
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
        </select>
        <button className="btn-primary">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table table-stack">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Lister</th>
              <th>Activity</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const subActive = !!u.lister?.subscriptionEndsAt && u.lister.subscriptionEndsAt > new Date();
              return (
                <tr key={u.id}>
                  <td>
                    <span className="block font-medium text-ink">{u.name}</span>
                    <span className="block text-xs text-muted">{u.email}</span>
                    <span className="block text-xs text-muted">{u.phone ? prettyPhone(u.phone) : "no phone"}{u.phoneVerified ? " ✓" : ""} · joined {dateLabel(u.createdAt)}</span>
                  </td>
                  <td data-label="Role" className="stack-inline"><Pill>{u.role === "USER" ? "Seeker" : u.role === "LISTER" ? "Lister" : u.isSuperAdmin ? "Super admin" : "Staff admin"}</Pill></td>
                  <td data-label="Lister" className="text-xs">
                    {u.lister ? (
                      <div className="space-y-1">
                        <Link href={`/listers/${u.lister.slug}`} className="flex items-center gap-1 text-sm text-ink hover:text-gold-deep">
                          {u.lister.displayName} {u.lister.verified && <VerifiedBadge size="xs" label={false} />}
                        </Link>
                        <span className="block text-muted">{LISTER_TYPE_LABELS[u.lister.type]} · {u.lister._count.listings} listings</span>
                        <span className="flex flex-wrap gap-1">
                          <Pill tone={statusTone(u.lister.kycStatus)}>KYC: {KYC_LABELS[u.lister.kycStatus]}</Pill>
                          <Pill tone={subActive ? "success" : "danger"}>{subActive ? `Sub to ${dateLabel(u.lister.subscriptionEndsAt)}` : "No subscription"}</Pill>
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td data-label="Activity" className="stack-inline text-xs text-ink-2">{u._count.unlocks} unlocks<br />{u._count.payments} payments</td>
                  <td data-label="Status" className="stack-inline">
                    <Pill tone={statusTone(u.status)}>{u.status.toLowerCase()}</Pill>
                    {u.statusReason && <span className="mt-1 block max-w-[160px] text-[11px] text-muted">{u.statusReason}</span>}
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {!u.isSuperAdmin && u.status !== "ACTIVE" && <ActButton action={setUserStatusAction.bind(null, u.id, "ACTIVE")} confirm={`Reactivate ${u.name}?`}>Reactivate</ActButton>}
                      {!u.isSuperAdmin && u.status === "ACTIVE" && <ActButton action={setUserStatusAction.bind(null, u.id, "SUSPENDED")} ask="Reason for suspension (shown to the user):">Suspend</ActButton>}
                      {!u.isSuperAdmin && u.status !== "BANNED" && <ActButton action={setUserStatusAction.bind(null, u.id, "BANNED")} ask="Reason for ban (shown to the user):" askRequired className="btn-outline btn-sm text-danger">Ban</ActButton>}
                      {u.lister?.verified && <ActButton action={setBadgeAction.bind(null, u.lister.id, false)} ask="Reason for revoking the Verified badge:" askRequired>Revoke badge</ActButton>}
                      {u.lister && !u.lister.verified && u.lister.kycStatus === "APPROVED" && <ActButton action={setBadgeAction.bind(null, u.lister.id, true)}>Restore badge</ActButton>}
                      {!u.isSuperAdmin && <ActButton action={deleteUserAction.bind(null, u.id)} confirm={`Permanently delete ${u.email}? This cannot be undone.`} className="btn-ghost btn-sm text-danger">Delete</ActButton>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(total / PAGE)} href={qs} />
    </>
  );
}
