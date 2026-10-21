import Link from "next/link";
import { ArrowRight, Heart, KeyRound, ShieldAlert, Star } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cardSelect, publicWhere, savedSet } from "@/lib/listings";
import { kes } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { PropertyCard } from "@/components/PropertyCard";
import { StatCard } from "@/components/ui";

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/account");
  const [favs, unlocks, reviews, spent, recent] = await Promise.all([
    prisma.favourite.count({ where: { userId: user.id } }),
    prisma.unlock.count({ where: { userId: user.id } }),
    prisma.review.count({ where: { userId: user.id } }),
    prisma.payment.aggregate({ where: { userId: user.id, status: "SUCCESS", kind: "UNLOCK" }, _sum: { amount: true } }),
    prisma.property.findMany({ where: { ...publicWhere(), favourites: { some: { userId: user.id } } }, select: cardSelect, take: 3, orderBy: { publishedAt: "desc" } }),
  ]);
  const saved = await savedSet(user.id, recent.map((r) => r.id));
  return (
    <>
      <DashHeader title={`Karibu, ${user.name.split(" ")[0]}`} intro="Your homes, unlocks and payments in one place." />
      {sp.notice === "lister-only" && <p className="mb-5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">That area is for lister accounts. To list property, register a lister account.</p>}
      {!user.phoneVerified && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-warning">
            <ShieldAlert size={18} /> Verify your phone number to receive SMS receipts and alerts.
          </p>
          <Link href="/verify-phone?next=/account" className="btn-primary btn-sm">
            Verify now
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saved homes" value={favs} icon={<Heart size={18} />} />
        <StatCard label="Unlocked" value={unlocks} icon={<KeyRound size={18} />} />
        <StatCard label="Reviews written" value={reviews} icon={<Star size={18} />} />
        <StatCard label="Spent on unlocks" value={kes(spent._sum.amount ?? 0)} />
      </div>
      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-2xl">Recently saved</h2>
        <Link href="/account/favourites" className="link text-sm">
          All saved homes <ArrowRight size={14} className="inline" />
        </Link>
      </div>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {recent.map((p) => (
          <PropertyCard key={p.id} p={p} saved={saved.has(p.id)} signedIn />
        ))}
        {!recent.length && (
          <p className="text-sm text-muted">
            Nothing saved yet. Tap the heart on any property to save it. <Link href="/properties" className="link">Browse homes</Link>
          </p>
        )}
      </div>
    </>
  );
}
