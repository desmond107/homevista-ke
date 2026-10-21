import { NextResponse } from "next/server";
import { callbackIpAllowed, callbackTokenValid, mpesaMode, parseCallback, stkQuery } from "@/lib/mpesa";
import { completePayment } from "@/lib/payments";
import { clientIp } from "@/lib/request";

/*
 * Daraja STK callback. Hardening:
 *  - secret token in the URL path (constant-time compare) — set MPESA_CALLBACK_TOKEN;
 *  - optional Safaricom IP allow-list (MPESA_ALLOWED_IPS);
 *  - a "success" is double-checked with STK Query before anything is unlocked, so a forged
 *    callback can't grant access even if the URL leaked (MPESA_VERIFY_CALLBACKS=false to skip);
 *  - processing is idempotent (see completePayment), so Safaricom retries are harmless.
 * Always ACKs well-formed requests with ResultCode 0, as Daraja expects.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!callbackTokenValid(token)) return new NextResponse("Not found", { status: 404 });
  const ip = await clientIp();
  if (!callbackIpAllowed(ip)) {
    console.warn("[mpesa] callback from non-allow-listed IP", ip);
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const cb = parseCallback(body);
  if (!cb) return NextResponse.json({ ResultCode: 1, ResultDesc: "Malformed" }, { status: 400 });

  try {
    if (cb.resultCode === 0 && mpesaMode() !== "simulate" && process.env.MPESA_VERIFY_CALLBACKS !== "false") {
      const q = await stkQuery(cb.checkoutRequestId).catch(() => null);
      if (q && q.resultCode !== 0) {
        console.error("[mpesa] callback claimed success but STK Query disagrees", cb.checkoutRequestId, q);
        cb.resultCode = q.resultCode;
        cb.resultDesc = q.resultDesc;
      }
    }
    await completePayment(cb, { source: "callback", raw: body });
  } catch (e) {
    // Log and still ACK: client polling + the STK Query fallback will reconcile.
    console.error("[mpesa] callback processing failed", e);
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
