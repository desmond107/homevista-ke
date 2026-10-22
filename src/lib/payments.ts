import "server-only";
import crypto from "crypto";
import { Prisma, type Payment, type PaymentStatus } from "@prisma/client";
import { prisma } from "./db";
import { getSettings } from "./settings";
import { mpesaMode, MpesaError, resultMessage, simulatorBlocked, stkPush, stkQuery, type ParsedCallback } from "./mpesa";
import { publicWhere } from "./listings";
import { notifyUser } from "./notify";
import { UserError } from "./errors";
import { kes, dateLabel } from "./format";

/*
 * Payment lifecycle
 *
 *   initiatePayment ──► Payment(PENDING) ──► STK push to phone
 *                                │
 *          Daraja callback / STK query / simulator
 *                                ▼
 *                       completePayment()  (idempotent, single code path)
 *                        ├─ SUCCESS → fulfil: Unlock row or Subscription extension
 *                        └─ CANCELLED / FAILED / TIMEOUT → clear message + retry
 *
 * Duplicate-charge protection:
 *  - a partial unique index allows only ONE pending payment per (user, kind, property);
 *    a second click returns the in-flight payment instead of sending another prompt;
 *  - an already-unlocked property can't be paid for again;
 *  - mpesaReceipt is unique, and fulfilment is guarded by a status transition, so a replayed
 *    callback can never fulfil twice.
 */

const PENDING_MAX_AGE_MS = 3 * 60 * 1000; // after this, an unanswered prompt is treated as timed out

export function newReference() {
  return "HV-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 7);
}

type InitArgs = { userId: string; kind: "UNLOCK" | "SUBSCRIPTION"; propertyId?: string | null; phone: string };

export async function initiatePayment(args: InitArgs): Promise<{ payment: Payment; reused: boolean }> {
  if (simulatorBlocked()) {
    console.error("[mpesa] MPESA_MODE is not set to sandbox/production; refusing payments in a production build");
    throw new UserError("Payments are temporarily unavailable. Please try again later.");
  }
  const settings = await getSettings();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: args.userId }, include: { lister: true } });

  let amount: number;
  let description: string;
  let propertyId: string | null = null;

  if (args.kind === "UNLOCK") {
    if (!args.propertyId) throw new UserError("Missing property.");
    const property = await prisma.property.findFirst({ where: { id: args.propertyId, ...publicWhere() }, select: { id: true, listerId: true } });
    if (!property) throw new UserError("This listing is no longer available.");
    if (user.lister?.id === property.listerId) throw new UserError("This is your own listing — the details are already visible to you.");
    const existing = await prisma.unlock.findUnique({ where: { userId_propertyId: { userId: user.id, propertyId: property.id } } });
    if (existing) throw new UserError("You've already unlocked this property.");
    amount = settings.unlockPrice;
    description = "Unlock";
    propertyId = property.id;
  } else {
    if (!user.lister) throw new UserError("Only lister accounts need a subscription.");
    amount = settings.subscriptionPrice;
    description = "Subscription";
  }

  await expireStalePending(user.id, args.kind, propertyId);

  // Reuse an in-flight prompt rather than charging twice.
  const inflight = await prisma.payment.findFirst({ where: { userId: user.id, kind: args.kind, propertyId, status: "PENDING" } });
  if (inflight) return { payment: inflight, reused: true };

  let payment: Payment;
  try {
    payment = await prisma.payment.create({
      data: { reference: newReference(), userId: user.id, kind: args.kind, amount, phone: args.phone, propertyId },
    });
  } catch (e) {
    // Lost a race with a concurrent click: the unique pending index fired.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const p = await prisma.payment.findFirst({ where: { userId: user.id, kind: args.kind, propertyId, status: "PENDING" } });
      if (p) return { payment: p, reused: true };
    }
    throw e;
  }

  try {
    const push = await stkPush({ phone: args.phone, amount, reference: payment.reference, description });
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: { merchantRequestId: push.merchantRequestId, checkoutRequestId: push.checkoutRequestId },
    });
  } catch (e) {
    const msg = e instanceof MpesaError ? e.message : "We couldn't reach M-Pesa. Please try again.";
    if (!(e instanceof MpesaError)) console.error("[mpesa] stk push", e);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", resultDesc: msg, completedAt: new Date() } });
    throw new UserError(msg);
  }
  return { payment, reused: false };
}

async function expireStalePending(userId: string, kind: "UNLOCK" | "SUBSCRIPTION", propertyId: string | null) {
  const stale = await prisma.payment.findMany({
    where: { userId, kind, propertyId, status: "PENDING", createdAt: { lt: new Date(Date.now() - PENDING_MAX_AGE_MS) } },
  });
  for (const p of stale) await refreshPayment(p, { force: true });
}

const lastQuery = new Map<string, number>();

/**
 * Called while the client polls. Falls back to Daraja's STK Query when the callback is slow
 * (or never arrives — e.g. a firewall), and times out abandoned prompts.
 */
export async function refreshPayment(payment: Payment, opts: { force?: boolean } = {}): Promise<Payment> {
  if (payment.status !== "PENDING") return payment;
  const age = Date.now() - payment.createdAt.getTime();

  if (payment.checkoutRequestId && mpesaMode() !== "simulate" && age > 20_000) {
    const last = lastQuery.get(payment.id) ?? 0;
    if (opts.force || Date.now() - last > 10_000) {
      lastQuery.set(payment.id, Date.now());
      try {
        const q = await stkQuery(payment.checkoutRequestId);
        if (q) {
          await completePayment({
            checkoutRequestId: payment.checkoutRequestId,
            merchantRequestId: payment.merchantRequestId ?? "",
            resultCode: q.resultCode,
            resultDesc: q.resultDesc,
            receipt: null,
            amount: null,
            phone: null,
          }, { source: "query" });
          return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
        }
      } catch (e) {
        console.error("[mpesa] stk query", e);
      }
    }
  }

  if (age > PENDING_MAX_AGE_MS) {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "TIMEOUT", resultCode: 1037, resultDesc: "No response from M-Pesa in time.", completedAt: new Date() },
    });
    return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  }
  return payment;
}

function statusFor(code: number): PaymentStatus {
  if (code === 0) return "SUCCESS";
  if (code === 1032) return "CANCELLED";
  if (code === 1037 || code === 1019) return "TIMEOUT";
  return "FAILED";
}

/**
 * The single place a payment is resolved. Safe to call any number of times for the same request.
 * `source: "query"` results carry no receipt; a later callback fills it in.
 */
export async function completePayment(cb: ParsedCallback, ctx: { source: "callback" | "query" | "simulator"; raw?: unknown }) {
  const payment = await prisma.payment.findUnique({ where: { checkoutRequestId: cb.checkoutRequestId } });
  if (!payment) {
    console.warn("[mpesa] callback for unknown CheckoutRequestID", cb.checkoutRequestId);
    return { handled: false as const };
  }

  // Late receipt for an already-successful payment (query resolved it first).
  if (payment.status === "SUCCESS") {
    if (cb.receipt && !payment.mpesaReceipt) {
      await prisma.payment.update({ where: { id: payment.id }, data: { mpesaReceipt: cb.receipt, raw: (ctx.raw as Prisma.InputJsonValue) ?? undefined } }).catch(() => {});
    }
    return { handled: true as const, payment };
  }

  const status = statusFor(cb.resultCode);

  if (status !== "SUCCESS") {
    // Only a PENDING payment can fail; never downgrade a TIMEOUT that later succeeds.
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status, resultCode: cb.resultCode, resultDesc: resultMessage(cb.resultCode, cb.resultDesc), completedAt: new Date(), raw: (ctx.raw as Prisma.InputJsonValue) ?? undefined },
    });
    return { handled: true as const, payment };
  }

  if (cb.amount != null && cb.amount < payment.amount) {
    console.error("[mpesa] underpayment", payment.reference, cb.amount, payment.amount);
    await prisma.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "TIMEOUT"] } },
      data: { status: "FAILED", resultCode: cb.resultCode, resultDesc: `Amount mismatch: received ${cb.amount}`, completedAt: new Date() },
    });
    return { handled: true as const, payment };
  }

  const settings = await getSettings();
  const fulfilled = await prisma.$transaction(async (tx) => {
    // The status transition is the lock: only one caller can move PENDING/TIMEOUT/FAILED → SUCCESS.
    const moved = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "TIMEOUT", "FAILED", "CANCELLED"] } },
      data: {
        status: "SUCCESS",
        resultCode: 0,
        resultDesc: "Paid",
        mpesaReceipt: cb.receipt ?? undefined,
        completedAt: new Date(),
        raw: (ctx.raw as Prisma.InputJsonValue) ?? undefined,
      },
    });
    if (moved.count === 0) return null;

    if (payment.kind === "UNLOCK" && payment.propertyId) {
      const created = await tx.unlock.upsert({
        where: { userId_propertyId: { userId: payment.userId, propertyId: payment.propertyId } },
        create: { userId: payment.userId, propertyId: payment.propertyId, paymentId: payment.id },
        update: {},
      });
      if (created.paymentId === payment.id) {
        await tx.property.update({ where: { id: payment.propertyId }, data: { unlockCount: { increment: 1 } } });
      }
      return { kind: "UNLOCK" as const };
    }

    const lister = await tx.listerProfile.findUniqueOrThrow({ where: { userId: payment.userId } });
    const now = new Date();
    const startsAt = lister.subscriptionEndsAt && lister.subscriptionEndsAt > now ? lister.subscriptionEndsAt : now;
    const endsAt = new Date(startsAt.getTime() + settings.subscriptionDays * 86400_000);
    await tx.subscription.create({ data: { listerId: lister.id, paymentId: payment.id, amount: payment.amount, startsAt, endsAt } });
    await tx.listerProfile.update({ where: { id: lister.id }, data: { subscriptionEndsAt: endsAt } });
    return { kind: "SUBSCRIPTION" as const, endsAt };
  });

  if (fulfilled) await sendReceipt(payment.id, fulfilled.kind === "SUBSCRIPTION" ? fulfilled.endsAt : null);
  return { handled: true as const, payment };
}

async function sendReceipt(paymentId: string, endsAt: Date | null) {
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true, property: { select: { title: true, slug: true } } },
  });
  if (!p) return;
  const receipt = p.mpesaReceipt ? ` M-Pesa ref ${p.mpesaReceipt}.` : "";
  if (p.kind === "UNLOCK") {
    await notifyUser(p.user, {
      title: "Property unlocked",
      body: `You paid ${kes(p.amount)} to unlock "${p.property?.title}". The exact location and the lister's contacts are now permanently available in your account.${receipt} Receipt ${p.reference}.`,
      link: p.property ? `/properties/${p.property.slug}` : "/account/unlocked",
      sms: `HomeVista: ${kes(p.amount)} received (${p.reference}).${receipt} "${p.property?.title?.slice(0, 40)}" is unlocked.`,
      emailSubject: `Receipt ${p.reference} — property unlocked`,
    });
  } else {
    await notifyUser(p.user, {
      title: "Subscription active",
      body: `Thank you — ${kes(p.amount)} received.${receipt} Your listings are live until ${dateLabel(endsAt)}. Receipt ${p.reference}.`,
      link: "/lister/subscription",
      sms: `HomeVista: ${kes(p.amount)} received (${p.reference}).${receipt} Subscription active until ${dateLabel(endsAt)}.`,
      emailSubject: `Receipt ${p.reference} — subscription active`,
    });
  }
}

/** Client-facing view of a payment's state. */
export function paymentView(p: Payment) {
  return {
    id: p.id,
    reference: p.reference,
    status: p.status,
    kind: p.kind,
    amount: p.amount,
    receipt: p.mpesaReceipt,
    message:
      p.status === "PENDING"
        ? "Check your phone and enter your M-Pesa PIN to complete the payment."
        : p.status === "SUCCESS"
          ? resultMessage(0)
          : (p.resultDesc ?? resultMessage(p.resultCode)),
    simulate: mpesaMode() === "simulate",
  };
}

export type PaymentView = ReturnType<typeof paymentView>;
