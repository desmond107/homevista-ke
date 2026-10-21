import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { initiatePayment, paymentView } from "@/lib/payments";
import { UserError } from "@/lib/action";
import { rateLimit } from "@/lib/ratelimit";
import { normalizeKePhone } from "@/lib/format";

const schema = z.object({
  kind: z.enum(["UNLOCK", "SUBSCRIPTION"]),
  propertyId: z.string().max(40).optional(),
  phone: z.string().max(20),
});

/** Starts an M-Pesa STK push. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!(await rateLimit(`pay:${user.id}`, 6, 600)).ok) {
    return NextResponse.json({ error: "Too many payment attempts. Please wait a few minutes." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const phone = normalizeKePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid Safaricom number, e.g. 0712 345 678." }, { status: 400 });
  try {
    const { payment, reused } = await initiatePayment({ userId: user.id, kind: parsed.data.kind, propertyId: parsed.data.propertyId, phone });
    return NextResponse.json({ payment: paymentView(payment), reused });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[payments] initiate", e);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again." }, { status: 500 });
  }
}
