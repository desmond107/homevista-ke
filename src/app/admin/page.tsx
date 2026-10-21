import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Banknote, BadgeCheck, Building, CreditCard, Home, KeyRound, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicWhere } from "@/lib/listings";
import { ADMIN_PERMISSIONS, hasAdminPermission, type AdminPermission } from "@/lib/permissions";
import { kes, timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { RankBars, TimeChart } from "@/components/charts";
import { StatCard, cx } from "@/components/ui";

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "12 months" },
];

type Bucket = "day" | "week" | "month";

function buckets(from: Date, to: Date, unit: Bucket) {
  const out: Date[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), unit === "month" ? 1 : from.getUTCDate()));
  if (unit === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
  while (d <= to) {
    out.push(new Date(d));
    if (unit === "day") d.setUTCDate(d.getUTCDate() + 1);
    else if (unit === "week") d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

const keyOf = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; denied?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/admin");

  if (!hasAdminPermission(user, "analytics")) {
    const allowed = (Object.keys(ADMIN_PERMISSIONS) as AdminPermission[]).filter((p) => hasAdminPermission(user, p));
    return (
      <>
        <DashHeader title={`Welcome, ${user.name.split(" ")[0]}`} intro="Your staff role gives you access to the sections in the menu." />
        {sp.denied && <p className="mb-4 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">Your role doesn&apos;t include “{ADMIN_PERMISSIONS[sp.denied as AdminPermission] ?? sp.denied}”.</p>}
        <ul className="card divide-y divide-line">
          {allowed.map((p) => <li key={p} className="px-5 py-3 text-sm text-ink-2">{ADMIN_PERMISSIONS[p]}</li>)}
        </ul>
      </>
    );
  }

  // ── Date range
  const now = new Date();
  let from: Date;
  let to = now;
  if (sp.from && sp.to && !isNaN(Date.parse(sp.from)) && !isNaN(Date.parse(sp.to))) {
    from = new Date(sp.from);
    to = new Date(new Date(sp.to).getTime() + 86400_000 - 1);
  } else {
    from = new Date(now.getTime() - (parseInt(sp.range ?? "30", 10) || 30) * 86400_000);
  }
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400_000));
  const unit: Bucket = days <= 62 ? "day" : days <= 200 ? "week" : "month";

  const [users, listers, activeSubs, liveListings, allListings, pendingKyc, revenueByKind, unlocksInRange, signupsInRange, payAttempts, revenueSeries, signupSeries, topCounties, revenueByCounty, activity] =
    await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "LISTER" } }),
      prisma.listerProfile.count({ where: { subscriptionEndsAt: { gt: now } } }),
      prisma.property.count({ where: publicWhere() }),
      prisma.property.count(),
      prisma.kycSubmission.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
      prisma.payment.groupBy({ by: ["kind"], where: { status: "SUCCESS", completedAt: { gte: from, lte: to } }, _sum: { amount: true }, _count: true }),
      prisma.unlock.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.user.count({ where: { createdAt: { gte: from, lte: to }, role: { not: "ADMIN" } } }),
      prisma.payment.groupBy({ by: ["status"], where: { createdAt: { gte: from, lte: to } }, _count: true }),
      prisma.$queryRaw<{ d: Date; kind: string; total: bigint }[]>`
        SELECT date_trunc(${unit}, (("completedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Nairobi')) AS d, "kind"::text AS kind, SUM("amount")::bigint AS total
        FROM "Payment" WHERE "status" = 'SUCCESS' AND "completedAt" BETWEEN ${from} AND ${to}
        GROUP BY 1, 2 ORDER BY 1`,
      prisma.$queryRaw<{ d: Date; role: string; n: bigint }[]>`
        SELECT date_trunc(${unit}, (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Nairobi')) AS d, "role"::text AS role, COUNT(*)::bigint AS n
        FROM "User" WHERE "role" <> 'ADMIN' AND "createdAt" BETWEEN ${from} AND ${to}
        GROUP BY 1, 2 ORDER BY 1`,
      prisma.property.groupBy({ by: ["countyId"], where: publicWhere(), _count: true, orderBy: { _count: { countyId: "desc" } }, take: 6 }),
      prisma.$queryRaw<{ name: string; total: bigint }[]>(Prisma.sql`
        SELECT c."name", SUM(p."amount")::bigint AS total FROM "Payment" p
        JOIN "Property" pr ON pr."id" = p."propertyId" JOIN "County" c ON c."id" = pr."countyId"
        WHERE p."status" = 'SUCCESS' AND p."kind" = 'UNLOCK' AND p."completedAt" BETWEEN ${from} AND ${to}
        GROUP BY c."name" ORDER BY total DESC LIMIT 6`),
      prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }),
    ]);

  const countyNames = new Map((await prisma.county.findMany({ where: { id: { in: topCounties.map((t) => t.countyId) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]));
  const rev = (k: string) => revenueByKind.find((r) => r.kind === k)?._sum.amount ?? 0;
  const totalRevenue = rev("UNLOCK") + rev("SUBSCRIPTION");
  const attempts = payAttempts.reduce((a, b) => a + b._count, 0);
  const success = payAttempts.find((p) => p.status === "SUCCESS")?._count ?? 0;

  const fmtBucket = (d: Date) =>
    unit === "month" ? d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const bs = buckets(from, to, unit);
  const revMap = new Map<string, { s: number; u: number }>();
  for (const r of revenueSeries) {
    const k = keyOf(new Date(r.d));
    const cur = revMap.get(k) ?? { s: 0, u: 0 };
    if (r.kind === "SUBSCRIPTION") cur.s += Number(r.total);
    else cur.u += Number(r.total);
    revMap.set(k, cur);
  }
  const sigMap = new Map<string, { u: number; l: number }>();
  for (const r of signupSeries) {
    const k = keyOf(new Date(r.d));
    const cur = sigMap.get(k) ?? { u: 0, l: 0 };
    if (r.role === "LISTER") cur.l += Number(r.n);
    else cur.u += Number(r.n);
    sigMap.set(k, cur);
  }
  const revenueData = bs.map((b) => ({ label: fmtBucket(b), subscriptions: revMap.get(keyOf(b))?.s ?? 0, unlocks: revMap.get(keyOf(b))?.u ?? 0 }));
  const signupData = bs.map((b) => ({ label: fmtBucket(b), seekers: sigMap.get(keyOf(b))?.u ?? 0, listers: sigMap.get(keyOf(b))?.l ?? 0 }));
  const rangeKey = sp.from ? "custom" : (sp.range ?? "30");

  return (
    <>
      <DashHeader title="Analytics" intro={`${from.toLocaleDateString("en-GB")} – ${to.toLocaleDateString("en-GB")} · grouped by ${unit}`} />

      {/* Filters: one row above the charts */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-line bg-surface p-1">
          {RANGES.map((r) => (
            <Link key={r.key} href={`/admin?range=${r.key}`} className={cx("rounded-full px-3 py-1.5 text-xs", rangeKey === r.key ? "bg-navy text-on-navy" : "text-ink-2 hover:text-ink")}>
              {r.label}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-center gap-2 text-xs" action="/admin">
          <input type="date" name="from" defaultValue={sp.from} className="input !w-auto !rounded-full !py-1.5 !text-xs" aria-label="From date" required />
          <span className="text-muted">to</span>
          <input type="date" name="to" defaultValue={sp.to} className="input !w-auto !rounded-full !py-1.5 !text-xs" aria-label="To date" required />
          <button className="btn-outline btn-sm">Apply</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (range)" value={kes(totalRevenue)} hint={`${kes(rev("SUBSCRIPTION"))} subs · ${kes(rev("UNLOCK"))} unlocks`} icon={<Banknote size={18} />} />
        <StatCard label="Unlocks (range)" value={unlocksInRange.toLocaleString()} hint={`Payment success rate ${attempts ? Math.round((success / attempts) * 100) : 0}%`} icon={<KeyRound size={18} />} />
        <StatCard label="Active subscriptions" value={activeSubs} hint={`${listers} listers total`} icon={<CreditCard size={18} />} />
        <StatCard label="Live listings" value={liveListings} hint={`${allListings} total · ${pendingKyc} KYC waiting`} icon={<Home size={18} />} />
        <StatCard label="Property seekers" value={users.toLocaleString()} hint={`${signupsInRange} new sign-ups in range`} icon={<Users size={18} />} />
        <StatCard label="Listers" value={listers} icon={<Building size={18} />} />
        <StatCard label="Verified listers" value={await prisma.listerProfile.count({ where: { verified: true } })} icon={<BadgeCheck size={18} />} />
        <StatCard label="Avg. revenue / day" value={kes(Math.round(totalRevenue / days))} />
      </div>

      <section className="card mt-6 p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl">Revenue by source</h2>
          <span className="text-xs text-muted">KSh per {unit}</span>
        </div>
        <TimeChart
          kind="bar"
          money
          data={revenueData}
          series={[
            { key: "subscriptions", label: "Subscriptions" },
            { key: "unlocks", label: "Unlocks" },
          ]}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-xl">New sign-ups</h2>
          <TimeChart
            kind="bar"
            data={signupData}
            series={[
              { key: "seekers", label: "Seekers" },
              { key: "listers", label: "Listers" },
            ]}
            height={220}
          />
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-xl">Top locations</h2>
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Live listings by county</p>
          <RankBars data={topCounties.map((t) => ({ label: countyNames.get(t.countyId) ?? "—", value: t._count }))} />
          <p className="mt-6 mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Unlock revenue by county (range)</p>
          <RankBars money data={revenueByCounty.map((r) => ({ label: r.name, value: Number(r.total) }))} />
        </section>
      </div>

      <section className="card mt-6 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl">Recent activity</h2>
          {hasAdminPermission(user, "settings") && <Link href="/admin/activity" className="link text-sm">Full audit log</Link>}
        </div>
        <ul className="divide-y divide-line text-sm">
          {activity.map((a) => (
            <li key={a.id} className="flex justify-between gap-3 py-2.5">
              <span className="text-ink-2">
                <span className="font-medium text-ink">{a.user?.name ?? "System"}</span> · {a.action.replace(/[._]/g, " ")}
                {a.detail && <span className="text-muted"> — {a.detail.slice(0, 80)}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span>
            </li>
          ))}
          {!activity.length && <li className="py-3 text-muted">No activity yet.</li>}
        </ul>
      </section>
    </>
  );
}
