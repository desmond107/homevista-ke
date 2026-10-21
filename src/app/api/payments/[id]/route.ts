import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentView, refreshPayment } from "@/lib/payments";

/** Polled by the payment modal every few seconds. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const fresh = await refreshPayment(payment);
  return NextResponse.json({ payment: paymentView(fresh) }, { headers: { "Cache-Control": "no-store" } });
}
