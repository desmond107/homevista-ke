import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAdminPermission } from "@/lib/permissions";
import { receiptPdf } from "@/lib/pdf";

/** Downloadable PDF receipt — for the payer, or an admin with payments access. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Unauthorised", { status: 401 });
  const { id } = await params;
  const p = await prisma.payment.findUnique({ where: { id }, include: { user: true, property: { select: { title: true } } } });
  if (!p || (p.userId !== user.id && !hasAdminPermission(user, "payments"))) return new Response("Not found", { status: 404 });
  const bytes = await receiptPdf({
    reference: p.reference,
    kind: p.kind,
    amount: p.amount,
    status: p.status,
    phone: p.phone,
    receipt: p.mpesaReceipt,
    createdAt: p.createdAt,
    completedAt: p.completedAt,
    customer: { name: p.user.name, email: p.user.email },
    item: p.kind === "UNLOCK" ? (p.property?.title ?? "Property (removed)") : "30-day lister subscription",
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="HomeVista-receipt-${p.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
