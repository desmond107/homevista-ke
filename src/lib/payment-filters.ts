import type { Prisma } from "@prisma/client";

export type PaymentFilterParams = { kind?: string; status?: string; from?: string; to?: string; q?: string };

/** Shared between the admin payments page and its CSV/PDF export. */
export function paymentWhere(sp: PaymentFilterParams): Prisma.PaymentWhereInput {
  const created: Prisma.DateTimeFilter = {};
  if (sp.from && !isNaN(Date.parse(sp.from))) created.gte = new Date(sp.from);
  if (sp.to && !isNaN(Date.parse(sp.to))) created.lte = new Date(new Date(sp.to).getTime() + 86400_000 - 1);
  return {
    ...(sp.kind === "UNLOCK" || sp.kind === "SUBSCRIPTION" ? { kind: sp.kind } : {}),
    ...(sp.status && ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "TIMEOUT"].includes(sp.status) ? { status: sp.status as never } : {}),
    ...(created.gte || created.lte ? { createdAt: created } : {}),
    ...(sp.q
      ? { OR: [{ reference: { contains: sp.q, mode: "insensitive" } }, { mpesaReceipt: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q.replace(/\D/g, "") || sp.q } }, { user: { email: { contains: sp.q, mode: "insensitive" } } }] }
      : {}),
  };
}
