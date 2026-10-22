import "server-only";
import crypto from "crypto";

/*
 * Safaricom M-Pesa Daraja — Lipa na M-Pesa Online (STK Push).
 *
 * MPESA_MODE:
 *   simulate   — no network calls; the payment modal shows a "simulated phone" so the full
 *                callback path can be exercised locally (default when no credentials are set).
 *   sandbox    — https://sandbox.safaricom.co.ke
 *   production — https://api.safaricom.co.ke
 *
 * Required for sandbox/production: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
 * MPESA_PASSKEY, MPESA_CALLBACK_TOKEN, APP_URL (public HTTPS). Optional: MPESA_TRANSACTION_TYPE
 * (CustomerPayBillOnline | CustomerBuyGoodsOnline), MPESA_PARTY_B (till number for Buy Goods).
 */

export type MpesaMode = "simulate" | "sandbox" | "production";

export function mpesaMode(): MpesaMode {
  const m = process.env.MPESA_MODE;
  if (m === "sandbox" || m === "production") return m;
  return "simulate";
}

/**
 * The simulator hands out unlocks and subscriptions for free, so a production build refuses it
 * unless ALLOW_SIMULATED_PAYMENTS=true (e.g. a private staging deployment).
 */
export function simulatorBlocked() {
  return mpesaMode() === "simulate" && process.env.NODE_ENV === "production" && process.env.ALLOW_SIMULATED_PAYMENTS !== "true";
}

function baseUrl() {
  return mpesaMode() === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function callbackUrl() {
  const app = (process.env.APP_URL || "").replace(/\/$/, "");
  return `${app}/api/mpesa/callback/${env("MPESA_CALLBACK_TOKEN")}`;
}

/** Constant-time check of the secret path segment on the callback URL. */
export function callbackTokenValid(token: string) {
  const expected = process.env.MPESA_CALLBACK_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Optional allow-list of Safaricom callback IPs (comma-separated MPESA_ALLOWED_IPS). */
export function callbackIpAllowed(ip: string) {
  const list = process.env.MPESA_ALLOWED_IPS?.split(",").map((s) => s.trim()).filter(Boolean);
  return !list?.length || list.includes(ip);
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const auth = Buffer.from(`${env("MPESA_CONSUMER_KEY")}:${env("MPESA_CONSUMER_SECRET")}`).toString("base64");
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Daraja auth failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: string };
  tokenCache = { token: j.access_token, expiresAt: Date.now() + Number(j.expires_in || 3599) * 1000 };
  return j.access_token;
}

function timestamp() {
  // Daraja wants Nairobi local time as YYYYMMDDHHmmss.
  const d = new Date(Date.now() + 3 * 3600 * 1000);
  return d.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

function password(ts: string) {
  return Buffer.from(`${env("MPESA_SHORTCODE")}${env("MPESA_PASSKEY")}${ts}`).toString("base64");
}

export type StkPushResult = { merchantRequestId: string; checkoutRequestId: string; customerMessage: string };

export async function stkPush(opts: { phone: string; amount: number; reference: string; description: string }): Promise<StkPushResult> {
  if (mpesaMode() === "simulate") {
    const id = crypto.randomBytes(8).toString("hex");
    return { merchantRequestId: `SIM-MR-${id}`, checkoutRequestId: `ws_CO_SIM_${id}`, customerMessage: "Success. Request accepted for processing" };
  }
  const ts = timestamp();
  const shortcode = env("MPESA_SHORTCODE");
  const type = process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline";
  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password(ts),
      Timestamp: ts,
      TransactionType: type,
      Amount: Math.round(opts.amount),
      PartyA: opts.phone,
      PartyB: process.env.MPESA_PARTY_B || shortcode,
      PhoneNumber: opts.phone,
      CallBackURL: callbackUrl(),
      AccountReference: opts.reference.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok || j.ResponseCode !== "0") {
    throw new MpesaError(j.errorMessage || j.ResponseDescription || `M-Pesa request failed (${res.status})`);
  }
  return { merchantRequestId: j.MerchantRequestID, checkoutRequestId: j.CheckoutRequestID, customerMessage: j.CustomerMessage };
}

/** Asks Daraja for the final state of an STK request. `null` means it is still being processed. */
export async function stkQuery(checkoutRequestId: string): Promise<{ resultCode: number; resultDesc: string } | null> {
  if (mpesaMode() === "simulate") return null;
  const ts = timestamp();
  const res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: env("MPESA_SHORTCODE"), Password: password(ts), Timestamp: ts, CheckoutRequestID: checkoutRequestId }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, string>;
  // "The transaction is being processed" comes back as an error code while the user is still on the PIN prompt.
  if (j.errorCode === "500.001.1001" || j.ResultCode === undefined) return null;
  return { resultCode: Number(j.ResultCode), resultDesc: j.ResultDesc ?? "" };
}

export class MpesaError extends Error {}

export type ParsedCallback = {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  receipt: string | null;
  amount: number | null;
  phone: string | null;
};

/** Parses Daraja's STK callback body. Returns null for anything that isn't one. */
export function parseCallback(body: unknown): ParsedCallback | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string") return null;
  const items = ((cb.CallbackMetadata as { Item?: { Name: string; Value?: unknown }[] })?.Item ?? []) as { Name: string; Value?: unknown }[];
  const get = (n: string) => items.find((i) => i.Name === n)?.Value;
  return {
    merchantRequestId: String(cb.MerchantRequestID ?? ""),
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: Number(cb.ResultCode),
    resultDesc: String(cb.ResultDesc ?? ""),
    receipt: get("MpesaReceiptNumber") ? String(get("MpesaReceiptNumber")) : null,
    amount: get("Amount") != null ? Number(get("Amount")) : null,
    phone: get("PhoneNumber") != null ? String(get("PhoneNumber")) : null,
  };
}

/** Builds a Daraja-shaped callback body. Used by the local simulator so it runs the real callback code. */
export function simulatedCallback(p: { merchantRequestId: string; checkoutRequestId: string; outcome: "success" | "cancel" | "fail" | "timeout"; amount: number; phone: string }) {
  const codes = {
    success: [0, "The service request is processed successfully."],
    cancel: [1032, "Request cancelled by user"],
    fail: [2001, "The initiator information is invalid."],
    timeout: [1037, "DS timeout user cannot be reached"],
  } as const;
  const [code, desc] = codes[p.outcome];
  const ts = timestamp();
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: p.merchantRequestId,
        CheckoutRequestID: p.checkoutRequestId,
        ResultCode: code,
        ResultDesc: desc,
        ...(code === 0
          ? {
              CallbackMetadata: {
                Item: [
                  { Name: "Amount", Value: p.amount },
                  { Name: "MpesaReceiptNumber", Value: "S" + crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 9) },
                  { Name: "TransactionDate", Value: Number(ts) },
                  { Name: "PhoneNumber", Value: Number(p.phone) },
                ],
              },
            }
          : {}),
      },
    },
  };
}

/** Friendly copy for Daraja result codes. */
export function resultMessage(code: number | null | undefined, fallback?: string | null) {
  switch (code) {
    case 0:
      return "Payment received. Thank you!";
    case 1032:
      return "You cancelled the M-Pesa prompt. No money was taken.";
    case 1037:
    case 1019:
      return "The M-Pesa prompt timed out before a PIN was entered. Please try again with your phone unlocked.";
    case 1:
      return "Your M-Pesa balance is too low for this payment.";
    case 2001:
      return "The M-Pesa PIN entered was incorrect. Please try again.";
    case 1001:
      return "Your line has another M-Pesa transaction in progress. Wait a moment and retry.";
    case 1025:
    case 9999:
      return "M-Pesa couldn't send the prompt. Please try again shortly.";
    default:
      return fallback || "The payment didn't go through. Please try again.";
  }
}
