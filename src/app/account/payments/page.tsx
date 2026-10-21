import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { kes } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { PaymentsTable } from "@/components/PaymentsTable";

export default async function PaymentsPage() {
  const user = await requireUser("/account/payments");
  const [rows, total] = await Promise.all([
    prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200, include: { property: { select: { title: true, slug: true } } } }),
    prisma.payment.aggregate({ where: { userId: user.id, status: "SUCCESS" }, _sum: { amount: true } }),
  ]);
  return (
    <>
      <DashHeader title="Payment history" intro={`All your M-Pesa payments. Total paid: ${kes(total._sum.amount ?? 0)}. Download a PDF receipt for any successful payment.`} />
      <PaymentsTable rows={rows} />
    </>
  );
}
