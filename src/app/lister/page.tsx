import Link from "next/link";
import { Eye, KeyRound, ListChecks, MessageSquare, Plus, Star } from "lucide-react";
import { requireLister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listerStatus } from "@/lib/lister-data";
import { DashHeader } from "@/components/DashShell";
import { ReadinessChecklist } from "@/components/ReadinessChecklist";
import { TimeChart } from "@/components/charts";
import { Pill, StatCard, statusTone } from "@/components/ui";
import { LISTING_STATUS_LABELS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";

export default async function ListerOverview() {
  const user = await requireLister();
  const listerId = user.listerId;
  const since = new Date(Date.now() - 30 * 86400_000);
  const [st, listings, viewDays, unlocks30, reviews, unread, recentMsgs] = await Promise.all([
    listerStatus(listerId),
    prisma.property.findMany({
      where: { listerId },
      select: { id: true, slug: true, title: true, status: true, views: true, unlockCount: true, ratingAvg: true, ratingCount: true, _count: { select: { favourites: true } } },
      orderBy: { views: "desc" },
    }),
    prisma.propertyViewDay.groupBy({ by: ["day"], where: { property: { listerId }, day: { gte: since } }, _sum: { count: true }, orderBy: { day: "asc" } }),
    prisma.unlock.count({ where: { property: { listerId }, createdAt: { gte: since } } }),
    prisma.review.aggregate({ where: { property: { listerId }, status: "PUBLISHED" }, _avg: { rating: true }, _count: true }),
    prisma.message.count({ where: { listerId, readAt: null } }),
    prisma.message.findMany({ where: { listerId }, orderBy: { createdAt: "desc" }, take: 3, include: { sender: { select: { name: true } }, property: { select: { title: true } } } }),
  ]);

  // Fill missing days so the chart has a continuous 30-day axis.
  const byDay = new Map(viewDays.map((v) => [v.day.toISOString().slice(0, 10), v._sum.count ?? 0]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), views: byDay.get(key) ?? 0 };
  });
  const views30 = series.reduce((a, b) => a + b.views, 0);
  const live = listings.filter((l) => l.status === "ACTIVE").length;

  return (
    <>
      <DashHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        intro="Here's how your listings are performing."
        action={
          <Link href="/lister/listings/new" className="btn-gold">
            <Plus size={16} /> Add a listing
          </Link>
        }
      />
      <ReadinessChecklist st={st} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live listings" value={live} hint={`${listings.length} total`} icon={<ListChecks size={18} />} />
        <StatCard label="Views (30 days)" value={views30.toLocaleString()} icon={<Eye size={18} />} />
        <StatCard label="Unlocks (30 days)" value={unlocks30} hint="Seekers who paid to contact you" icon={<KeyRound size={18} />} />
        <StatCard label="Average rating" value={reviews._count ? (reviews._avg.rating ?? 0).toFixed(1) : "—"} hint={`${reviews._count} reviews`} icon={<Star size={18} />} />
      </div>

      <section className="card mt-6 p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl">Listing views</h2>
          <span className="text-xs text-muted">Last 30 days · all listings</span>
        </div>
        <TimeChart data={series} series={[{ key: "views", label: "Views" }]} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card overflow-x-auto">
          <div className="flex items-center justify-between p-5 pb-2">
            <h2 className="text-xl">Performance by listing</h2>
            <Link href="/lister/listings" className="link text-sm">Manage</Link>
          </div>
          <table className="table table-stack">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Status</th>
                <th className="text-right">Views</th>
                <th className="text-right">Unlocks</th>
                <th className="text-right">Saves</th>
                <th className="text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {listings.slice(0, 8).map((l) => (
                <tr key={l.id}>
                  <td className="max-w-[260px]">
                    <Link href={`/properties/${l.slug}`} className="block truncate text-ink hover:text-gold-deep">{l.title}</Link>
                  </td>
                  <td data-label="Status" className="stack-inline"><Pill tone={statusTone(l.status)}>{LISTING_STATUS_LABELS[l.status]}</Pill></td>
                  <td data-label="Views" className="stack-inline text-right">{l.views.toLocaleString()}</td>
                  <td data-label="Unlocks" className="stack-inline text-right">{l.unlockCount}</td>
                  <td data-label="Saves" className="stack-inline text-right">{l._count.favourites}</td>
                  <td data-label="Rating" className="stack-inline text-right">{l.ratingCount ? `${l.ratingAvg.toFixed(1)} (${l.ratingCount})` : "—"}</td>
                </tr>
              ))}
              {!listings.length && (
                <tr><td colSpan={6} className="py-8 text-center text-muted">No listings yet. <Link href="/lister/listings/new" className="link">Add your first</Link>.</td></tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Messages</h2>
            {unread > 0 && <Pill tone="gold">{unread} new</Pill>}
          </div>
          <ul className="space-y-3">
            {recentMsgs.map((m) => (
              <li key={m.id} className="rounded-xl bg-bg-alt p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-ink"><MessageSquare size={14} className="text-gold-deep" /> {m.sender.name}</p>
                <p className="truncate text-xs text-muted">{m.property.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink-2">{m.body}</p>
                <p className="mt-1 text-[11px] text-muted">{timeAgo(m.createdAt)}</p>
              </li>
            ))}
            {!recentMsgs.length && <li className="text-sm text-muted">No messages yet. Seekers who unlock your listings can message you here.</li>}
          </ul>
          <Link href="/lister/messages" className="btn-outline btn-sm mt-4 w-full">All messages</Link>
        </section>
      </div>
    </>
  );
}
