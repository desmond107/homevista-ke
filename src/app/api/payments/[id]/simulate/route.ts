import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mpesaMode, parseCallback, simulatedCallback } from "@/lib/mpesa";
import { completePayment, paymentView } from "@/lib/payments";

/**
 * LOCAL SIMULATOR ONLY (MPESA_MODE=simulate). Stands in for the customer's phone: builds a
 * Daraja-shaped callback and feeds it through the exact same completePayment() as the real callback.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (mpesaMode() !== "simulate") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  const { outcome } = (await req.json().catch(() => ({}))) as { outcome?: string };
  if (!["success", "cancel", "fail", "timeout"].includes(outcome ?? "")) return NextResponse.json({ error: "Bad outcome" }, { status: 400 });
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.userId !== user.id || !payment.checkoutRequestId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = simulatedCallback({
    merchantRequestId: payment.merchantRequestId ?? "",
    checkoutRequestId: payment.checkoutRequestId,
    outcome: outcome as "success",
    amount: payment.amount,
    phone: payment.phone,
  });
  await completePayment(parseCallback(body)!, { source: "simulator", raw: body });
  const fresh = await prisma.payment.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ payment: paymentView(fresh) });
}
