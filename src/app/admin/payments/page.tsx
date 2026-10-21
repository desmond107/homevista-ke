import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentWhere, type PaymentFilterParams } from "@/lib/payment-filters";
import { kes } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { PaymentsTable } from "@/components/PaymentsTable";
import { Pagination, StatCard } from "@/components/ui";

const PAGE = 30;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<PaymentFilterParams & { page?: string }> }) {
  await requireAdmin("payments");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where = paymentWhere(sp);
  const [total, rows, sums, activeSubs] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { user: { select: { name: true, email: true } }, property: { select: { title: true, slug: true } } } }),
    prisma.payment.groupBy({ by: ["kind"], where: { ...where, status: "SUCCESS" }, _sum: { amount: true }, _count: true }),
    prisma.listerProfile.count({ where: { subscriptionEndsAt: { gt: new Date() } } }),
  ]);
  const sum = (k: string) => sums.find((s) => s.kind === k)?._sum.amount ?? 0;
  const cnt = (k: string) => sums.find((s) => s.kind === k)?._count ?? 0;
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  return (
    <>
      <DashHeader
        title="Payments & subscriptions"
        intro="Every M-Pesa transaction. Filters apply to the exports too."
        action={
          <div className="flex gap-2">
            <a href={`/api/admin/export?format=csv&${qs}`} className="btn-outline"><Download size={15} /> CSV</a>
            <a href={`/api/admin/export?format=pdf&${qs}`} className="btn-outline"><Download size={15} /> PDF</a>
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected (filtered)" value={kes(sum("UNLOCK") + sum("SUBSCRIPTION"))} />
        <StatCard label="Subscriptions" value={kes(sum("SUBSCRIPTION"))} hint={`${cnt("SUBSCRIPTION")} payments`} />
        <StatCard label="Unlocks" value={kes(sum("UNLOCK"))} hint={`${cnt("UNLOCK")} payments`} />
        <StatCard label="Active subscriptions now" value={activeSubs} />
      </div>
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Ref, M-Pesa code, phone, email" className="input !w-60" />
        <select name="kind" defaultValue={sp.kind ?? ""} className="input !w-40">
          <option value="">All types</option>
          <option value="UNLOCK">Unlocks</option>
          <option value="SUBSCRIPTION">Subscriptions</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input !w-36">
          <option value="">Any status</option>
          <option value="SUCCESS">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="TIMEOUT">Timed out</option>
        </select>
        <input type="date" name="from" defaultValue={sp.from} className="input !w-auto" aria-label="From" />
        <input type="date" name="to" defaultValue={sp.to} className="input !w-auto" aria-label="To" />
        <button className="btn-primary">Filter</button>
      </form>
      <PaymentsTable rows={rows} showUser />
      <Pagination page={page} pages={Math.ceil(total / PAGE)} href={(n) => `/admin/payments?${qs}&page=${n}`} />
    </>
  );
}
