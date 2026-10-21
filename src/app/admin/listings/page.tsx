import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LISTING_STATUS_LABELS, PURPOSE_LABELS } from "@/lib/constants";
import { priceLabel, timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActButton } from "@/components/admin/ActButton";
import { Pagination, Pill, VerifiedBadge, statusTone } from "@/components/ui";
import { moderateListingAction } from "@/app/actions/admin";

const PAGE = 20;

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; featured?: string; page?: string }> }) {
  await requireAdmin("listings");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const status = sp.status ?? "PENDING";
  const where: Prisma.PropertyWhereInput = {
    ...(status !== "ALL" ? { status: status as never } : {}),
    ...(sp.featured ? { featured: true } : {}),
    ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { lister: { displayName: { contains: sp.q, mode: "insensitive" } } }] } : {}),
  };
  const [total, rows, counts] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: status === "PENDING" ? { createdAt: "asc" } : { updatedAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        county: { select: { name: true } },
        lister: { select: { displayName: true, verified: true, kycStatus: true, subscriptionEndsAt: true } },
        _count: { select: { reports: { where: { status: "OPEN" } } } },
      },
    }),
    prisma.property.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const tab = (s: string, label: string) => (
    <Link key={s} href={`/admin/listings?status=${s}`} className={`chip ${status === s ? "!border-navy !bg-navy !text-on-navy" : "hover:border-gold"}`}>
      {label}{s !== "ALL" ? ` (${count(s)})` : ""}
    </Link>
  );
  return (
    <>
      <DashHeader title="Listings" intro="Approve new listings, feature the best on the homepage, and remove anything that breaks the rules." />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tab("PENDING", "Awaiting approval")}
        {tab("ACTIVE", "Live")}
        {tab("PAUSED", "Paused")}
        {tab("REJECTED", "Rejected")}
        {tab("REMOVED", "Removed")}
        {tab("DRAFT", "Drafts")}
        {tab("ALL", "All")}
      </div>
      <form className="mb-4 flex gap-2">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={sp.q} placeholder="Search title or lister…" className="input !w-72" />
        <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="featured" value="1" defaultChecked={!!sp.featured} className="accent-[var(--navy)]" /> Featured only</label>
        <button className="btn-primary">Search</button>
      </form>
      <ul className="space-y-3">
        {rows.map((p) => {
          const subOk = !!p.lister.subscriptionEndsAt && p.lister.subscriptionEndsAt > new Date();
          return (
            <li key={p.id} className="card flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-bg-alt lg:w-36">
                {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="150px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={statusTone(p.status)}>{LISTING_STATUS_LABELS[p.status]}</Pill>
                  {p.featured && <Pill tone="gold">Featured #{p.featuredRank}</Pill>}
                  {p._count.reports > 0 && <Pill tone="danger">{p._count.reports} open report(s)</Pill>}
                  {p.lister.kycStatus !== "APPROVED" && <Pill tone="warning">Lister KYC pending</Pill>}
                  {!subOk && <Pill tone="danger">No subscription</Pill>}
                </div>
                <Link href={`/properties/${p.slug}`} className="mt-1 block truncate font-serif text-lg text-ink hover:text-gold-deep">{p.title}</Link>
                <p className="text-sm text-ink-2">{PURPOSE_LABELS[p.purpose]} · {priceLabel(p.price, p.pricePeriod)} · {p.county.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted">{p.lister.displayName} {p.lister.verified && <VerifiedBadge size="xs" label={false} />} · updated {timeAgo(p.updatedAt)} · {p.views} views</p>
                {p.statusNote && <p className="mt-1 text-xs text-danger">Note: {p.statusNote}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5 lg:max-w-[260px] lg:justify-end">
                {p.status !== "ACTIVE" && p.status !== "DRAFT" && <ActButton action={moderateListingAction.bind(null, p.id, "approve")} className="btn-primary btn-sm">Approve</ActButton>}
                {p.status === "PENDING" && <ActButton action={moderateListingAction.bind(null, p.id, "reject")} ask="Reason for rejection (sent to the lister):" askRequired>Reject</ActButton>}
                {p.status === "ACTIVE" && (p.featured
                  ? <ActButton action={moderateListingAction.bind(null, p.id, "unfeature")}>Unfeature</ActButton>
                  : <ActButton action={moderateListingAction.bind(null, p.id, "feature")}>★ Feature</ActButton>)}
                {p.status === "ACTIVE" && <ActButton action={moderateListingAction.bind(null, p.id, "pause")} ask="Reason for pausing (sent to the lister):">Pause</ActButton>}
                <Link href={`/admin/listings/${p.id}`} className="btn-outline btn-sm">Edit</Link>
                {p.status !== "REMOVED" && <ActButton action={moderateListingAction.bind(null, p.id, "remove")} ask="Reason for removal (sent to the lister):" askRequired className="btn-ghost btn-sm text-danger">Remove</ActButton>}
              </div>
            </li>
          );
        })}
        {!rows.length && <li className="card p-10 text-center text-sm text-muted">No listings here.</li>}
      </ul>
      <Pagination page={page} pages={Math.ceil(total / PAGE)} href={(n) => `/admin/listings?status=${status}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}&page=${n}`} />
    </>
  );
}
