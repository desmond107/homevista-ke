import "server-only";
import { prisma } from "./db";
import { BRAND } from "./constants";

/*
 * Notifications: in-app, email and SMS.
 *
 * Email goes through Resend (RESEND_API_KEY) and SMS through Africa's Talking (AT_USERNAME + AT_API_KEY).
 * Without credentials, messages are written to the OutboundMessage table and the server log
 * (status LOGGED) so the full flow can be tested locally. Admin → Settings shows the recent log.
 * Delivery failures never break the action that triggered them.
 */

export async function notifyInApp(userId: string, title: string, body: string, link?: string) {
  await prisma.notification.create({ data: { userId, title, body, link } }).catch((e) => console.error("[notify] in-app", e));
}

export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || `${BRAND.name} <no-reply@homevista.co.ke>`;
  let status = "LOGGED";
  let error: string | null = null;
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text, html: emailHtml(subject, text) }),
        signal: AbortSignal.timeout(10_000),
      });
      status = res.ok ? "SENT" : "FAILED";
      if (!res.ok) error = (await res.text()).slice(0, 300);
    } catch (e) {
      status = "FAILED";
      error = String(e).slice(0, 300);
    }
  } else {
    console.info(`[email:dev] → ${to} | ${subject}\n${text}`);
  }
  await prisma.outboundMessage.create({ data: { channel: "EMAIL", to, subject, body: text, status, error } }).catch(() => {});
}

export async function sendSms(to: string, text: string) {
  const username = process.env.AT_USERNAME;
  const key = process.env.AT_API_KEY;
  let status = "LOGGED";
  let error: string | null = null;
  if (username && key) {
    try {
      const host = username === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
      const body = new URLSearchParams({ username, to: `+${to.replace(/^\+/, "")}`, message: text });
      if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
      const res = await fetch(`https://${host}/version1/messaging`, {
        method: "POST",
        headers: { apiKey: key, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      status = res.ok ? "SENT" : "FAILED";
      if (!res.ok) error = (await res.text()).slice(0, 300);
    } catch (e) {
      status = "FAILED";
      error = String(e).slice(0, 300);
    }
  } else {
    console.info(`[sms:dev] → ${to} | ${text}`);
  }
  await prisma.outboundMessage.create({ data: { channel: "SMS", to, body: text, status, error } }).catch(() => {});
}

/** One call for the common case: in-app + email (+ SMS when a phone is known and sms text is given). */
export async function notifyUser(
  user: { id: string; email: string; phone?: string | null },
  msg: { title: string; body: string; link?: string; sms?: string; emailSubject?: string },
) {
  const url = msg.link ? `${appUrl()}${msg.link}` : appUrl();
  await Promise.all([
    notifyInApp(user.id, msg.title, msg.body, msg.link),
    sendEmail(user.email, msg.emailSubject ?? msg.title, `${msg.body}\n\n${url}\n\n— ${BRAND.name}\n${BRAND.tagline}`),
    msg.sms && user.phone ? sendSms(user.phone, msg.sms) : Promise.resolve(),
  ]);
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function emailHtml(subject: string, text: string) {
  const paras = esc(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#a8843f">$1</a>')}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f6f2ea;font-family:Helvetica,Arial,sans-serif;color:#1d2433">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0c1a2e;padding:22px 28px;color:#d9bf8c;font-family:Georgia,serif;font-size:22px">HomeVista <span style="color:#fff">Ke</span></td></tr>
<tr><td style="padding:28px"><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:22px;margin:0 0 16px">${esc(subject)}</h1>${paras}</td></tr>
<tr><td style="padding:16px 28px;background:#faf7f2;color:#7a7f8a;font-size:12px">${esc(BRAND.tagline)} · ${esc(BRAND.address)}</td></tr>
</table></td></tr></table></body></html>`;
}
