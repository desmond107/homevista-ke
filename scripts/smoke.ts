/*
 * End-to-end smoke test. Needs the seeded DB and a running server (npm run dev).
 *   npm run smoke            (BASE_URL defaults to http://localhost:3000)
 * Requires MPESA_MODE=simulate. Creates throwaway users and removes them afterwards.
 */
import crypto from "crypto";
import { prisma } from "../src/lib/db";
import { completePayment, initiatePayment } from "../src/lib/payments";
import { parseCallback, simulatedCallback } from "../src/lib/mpesa";
import { publicWhere } from "../src/lib/listings";
import { subscriptionReminders } from "../src/lib/cron";

const BASE = process.env.BASE_URL || "http://localhost:3000";
let passed = 0;
let failed = 0;
const created: string[] = [];

function check(name: string, cond: unknown, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, extra ?? "");
  }
}

async function get(path: string, cookie?: string) {
  return fetch(BASE + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
}

async function sessionCookie(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { tokenHash: crypto.createHash("sha256").update(token).digest("hex"), userId, expiresAt: new Date(Date.now() + 3600_000) } });
  return `hv_session=${token}`;
}

async function main() {
  if (process.env.MPESA_MODE && process.env.MPESA_MODE !== "simulate") throw new Error("Run the smoke test with MPESA_MODE=simulate");

  const property = await prisma.property.findFirstOrThrow({ where: publicWhere(), select: { id: true, slug: true, unlockCount: true } });
  const blog = await prisma.blogPost.findFirstOrThrow({ where: { published: true } });
  const company = await prisma.company.findFirstOrThrow();
  const realtor = await prisma.realtor.findFirstOrThrow();
  const lister = await prisma.listerProfile.findFirstOrThrow({ where: { listings: { some: publicWhere() } } });

  console.log("\nPublic pages");
  for (const p of ["/", "/properties", "/properties?purpose=for-rent&county=nairobi&beds=2", "/properties?view=map", "/properties?view=list&sort=price_asc", `/properties/${property.slug}`, "/realtors", `/realtors/${realtor.slug}`, "/companies", `/companies/${company.slug}`, `/listers/${lister.slug}`, "/blog", `/blog/${blog.slug}`, "/faq", "/about", "/terms", "/privacy", "/contact", "/login", "/register?as=lister", "/sitemap.xml", "/robots.txt"]) {
    const r = await get(p);
    check(`GET ${p} → 200`, r.status === 200, r.status);
  }
  check("Unknown listing → 404", (await get("/properties/does-not-exist")).status === 404);

  console.log("\nSecurity");
  const acc = await get("/account");
  check("Private area redirects to /login when signed out", acc.status === 307 && acc.headers.get("location")?.includes("/login"), acc.status);
  const csrf = await fetch(BASE + "/api/payments", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" });
  check("Cross-site POST blocked (CSRF)", csrf.status === 403, csrf.status);
  check("KYC documents not public", (await get("/api/admin/kyc-file/seed/sample-id-front.jpg")).status === 404);
  const badCb = await fetch(BASE + "/api/mpesa/callback/wrong-token", { method: "POST", body: "{}" });
  check("Callback with wrong token rejected", badCb.status === 404, badCb.status);
  const detailHtml = await (await get(`/properties/${property.slug}`)).text();
  const secret = await prisma.property.findUniqueOrThrow({ where: { id: property.id }, select: { address: true, lister: { select: { phone: true } } } });
  check("Locked address not in public HTML", !detailHtml.includes(secret.address!), secret.address);
  check("Locked phone not in public HTML", !detailHtml.includes(secret.lister.phone));
  check("Schema.org markup present", detailHtml.includes('"RealEstateListing"'));

  console.log("\nDashboards (signed in)");
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@homevista.co.ke" } });
  const grace = await prisma.user.findUniqueOrThrow({ where: { email: "grace@vistaprime.co.ke" } });
  const seeker = await prisma.user.findUniqueOrThrow({ where: { email: "wanjiku@example.com" } });
  const [ac, lc, sc] = await Promise.all([sessionCookie(admin.id), sessionCookie(grace.id), sessionCookie(seeker.id)]);
  const kyc = await prisma.kycSubmission.findFirstOrThrow();
  const graceListing = await prisma.property.findFirstOrThrow({ where: { lister: { userId: grace.id } } });
  for (const p of ["/account", "/account/favourites", "/account/unlocked", "/account/payments", "/account/reviews", "/account/searches", "/account/notifications", "/account/profile"]) {
    const r = await get(p, sc);
    check(`seeker ${p} → 200`, r.status === 200, r.status);
  }
  for (const p of ["/lister", "/lister/listings", "/lister/listings/new", `/lister/listings/${graceListing.id}/edit`, "/lister/subscription", "/lister/kyc", "/lister/messages", "/lister/reviews", "/lister/profile"]) {
    const r = await get(p, lc);
    check(`lister ${p} → 200`, r.status === 200, r.status);
  }
  for (const p of ["/admin", "/admin?range=365", "/admin/users", "/admin/kyc", `/admin/kyc/${kyc.id}`, "/admin/listings", `/admin/listings/${graceListing.id}`, "/admin/reports", "/admin/reviews", "/admin/payments", "/admin/adverts", "/admin/companies", "/admin/companies/new", "/admin/realtors", "/admin/realtors/new", "/admin/taxonomy", "/admin/content", "/admin/content?tab=faq", "/admin/content?tab=pages", "/admin/content?tab=testimonials", "/admin/content?tab=homepage", "/admin/content/blog/new", "/admin/settings", "/admin/staff", "/admin/activity"]) {
    const r = await get(p, ac);
    check(`admin ${p} → 200`, r.status === 200, r.status);
  }
  check("Seeker cannot open admin", (await get("/admin", sc)).status === 307);
  check("Admin can view KYC document", (await get("/api/admin/kyc-file/seed/sample-id-front.jpg", ac)).status === 200);
  const csv = await get("/api/admin/export?format=csv", ac);
  check("CSV export works", csv.status === 200 && (await csv.text()).includes("mpesa_receipt"));
  const pdf = await get("/api/admin/export?format=pdf", ac);
  check("PDF export works", pdf.status === 200 && pdf.headers.get("content-type") === "application/pdf");
  const paid = await prisma.payment.findFirstOrThrow({ where: { userId: seeker.id, status: "SUCCESS" } });
  check("Seeker downloads own receipt", (await get(`/api/payments/${paid.id}/receipt`, sc)).status === 200);
  check("Others can't download that receipt", (await get(`/api/payments/${paid.id}/receipt`, lc)).status === 404);

  console.log("\nM-Pesa unlock flow (simulator, real callback code)");
  const u = await prisma.user.create({ data: { name: "Smoke Tester", email: `smoke-${Date.now()}@test.local`, phone: `2547${String(Date.now()).slice(-8)}`, role: "USER" } });
  created.push(u.id);
  const { payment, reused } = await initiatePayment({ userId: u.id, kind: "UNLOCK", propertyId: property.id, phone: u.phone! });
  check("STK push creates PENDING payment", payment.status === "PENDING" && !!payment.checkoutRequestId && !reused);
  const again = await initiatePayment({ userId: u.id, kind: "UNLOCK", propertyId: property.id, phone: u.phone! });
  check("Second click reuses the in-flight prompt (no double charge)", again.reused && again.payment.id === payment.id);
  const body = simulatedCallback({ merchantRequestId: payment.merchantRequestId!, checkoutRequestId: payment.checkoutRequestId!, outcome: "success", amount: payment.amount, phone: payment.phone });
  await completePayment(parseCallback(body)!, { source: "simulator", raw: body });
  await completePayment(parseCallback(body)!, { source: "simulator", raw: body }); // Safaricom retry
  const unlocks = await prisma.unlock.count({ where: { userId: u.id, propertyId: property.id } });
  const after = await prisma.property.findUniqueOrThrow({ where: { id: property.id }, select: { unlockCount: true } });
  check("Payment success creates exactly one unlock (idempotent replay)", unlocks === 1, unlocks);
  check("Unlock count incremented once", after.unlockCount === property.unlockCount + 1, after.unlockCount);
  check("Paid payment has M-Pesa receipt", !!(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).mpesaReceipt);
  let blocked = false;
  try {
    await initiatePayment({ userId: u.id, kind: "UNLOCK", propertyId: property.id, phone: u.phone! });
  } catch {
    blocked = true;
  }
  check("Can't pay twice for an unlocked property", blocked);
  const uc = await sessionCookie(u.id);
  const unlockedHtml = await (await get(`/properties/${property.slug}`, uc)).text();
  check("After unlock, the address is shown", unlockedHtml.includes(secret.address!.replace(/&/g, "&amp;").replace(/'/g, "&#x27;")) || unlockedHtml.includes(secret.address!));
  check("Receipt notification sent", (await prisma.notification.count({ where: { userId: u.id, title: "Property unlocked" } })) === 1);

  console.log("\nCallback over HTTP + cancellation");
  const other = await prisma.property.findFirstOrThrow({ where: { ...publicWhere(), id: { not: property.id } }, select: { id: true } });
  const p2 = (await initiatePayment({ userId: u.id, kind: "UNLOCK", propertyId: other.id, phone: u.phone! })).payment;
  const cancel = simulatedCallback({ merchantRequestId: p2.merchantRequestId!, checkoutRequestId: p2.checkoutRequestId!, outcome: "cancel", amount: p2.amount, phone: p2.phone });
  const cbRes = await fetch(`${BASE}/api/mpesa/callback/${process.env.MPESA_CALLBACK_TOKEN}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cancel) });
  const cbJson = (await cbRes.json()) as { ResultCode: number };
  check("Callback endpoint ACKs Daraja", cbRes.status === 200 && cbJson.ResultCode === 0);
  const p2After = await prisma.payment.findUniqueOrThrow({ where: { id: p2.id } });
  check("Cancelled prompt → CANCELLED with friendly message", p2After.status === "CANCELLED" && /cancelled/i.test(p2After.resultDesc ?? ""), p2After);
  check("No unlock for cancelled payment", (await prisma.unlock.count({ where: { userId: u.id, propertyId: other.id } })) === 0);
  const retry = await initiatePayment({ userId: u.id, kind: "UNLOCK", propertyId: other.id, phone: u.phone! });
  check("Retry after cancel starts a fresh prompt", !retry.reused && retry.payment.id !== p2.id);

  console.log("\nSubscriptions & visibility");
  const lucy = await prisma.listerProfile.findFirstOrThrow({ where: { user: { email: "lucy.njeri@gmail.com" } }, include: { user: true } });
  const lucyVisibleBefore = await prisma.property.count({ where: { ...publicWhere(), listerId: lucy.id } });
  check("Expired lister's listings are hidden", lucyVisibleBefore === 0);
  const lucyListing = await prisma.property.findFirstOrThrow({ where: { listerId: lucy.id } });
  check("Expired lister's listing page → 404", (await get(`/properties/${lucyListing.slug}`)).status === 404);
  const faith = await prisma.listerProfile.findFirstOrThrow({ where: { user: { email: "faith@lakesidehomes.co.ke" } }, include: { user: true } });
  const sub = (await initiatePayment({ userId: faith.userId, kind: "SUBSCRIPTION", phone: faith.phone })).payment;
  const subCb = simulatedCallback({ merchantRequestId: sub.merchantRequestId!, checkoutRequestId: sub.checkoutRequestId!, outcome: "success", amount: sub.amount, phone: sub.phone });
  await completePayment(parseCallback(subCb)!, { source: "simulator", raw: subCb });
  const faithAfter = await prisma.listerProfile.findUniqueOrThrow({ where: { id: faith.id } });
  const added = (faithAfter.subscriptionEndsAt!.getTime() - faith.subscriptionEndsAt!.getTime()) / 86400_000;
  check("Renewal extends from current end date (+30 days, no lost days)", Math.round(added) === 30, added);

  console.log("\nCron reminders");
  // Put a fresh listing 1 day from expiry to trigger a reminder.
  const amani = await prisma.listerProfile.findFirstOrThrow({ where: { user: { email: "amani.realtor@gmail.com" } }, include: { subscriptions: { orderBy: { endsAt: "desc" }, take: 1 } } });
  const originalEnd = amani.subscriptionEndsAt!;
  const soon = new Date(Date.now() + 20 * 3600_000);
  await prisma.listerProfile.update({ where: { id: amani.id }, data: { subscriptionEndsAt: soon } });
  await prisma.subscription.update({ where: { id: amani.subscriptions[0]!.id }, data: { endsAt: soon, remindersSent: [] } });
  const sent1 = await subscriptionReminders();
  const sent2 = await subscriptionReminders();
  const subAfter = await prisma.subscription.findUniqueOrThrow({ where: { id: amani.subscriptions[0]!.id } });
  check("Reminder sent once for expiring subscription", sent1 >= 1 && subAfter.remindersSent.includes(1), { sent1, r: subAfter.remindersSent });
  check("Reminder not repeated on the next run", sent2 === 0 || sent2 < sent1, sent2);
  await prisma.listerProfile.update({ where: { id: amani.id }, data: { subscriptionEndsAt: originalEnd } });
  await prisma.subscription.update({ where: { id: amani.subscriptions[0]!.id }, data: { endsAt: originalEnd } });
  // Revert Faith's renewal so the demo data stays as seeded.
  await prisma.subscription.deleteMany({ where: { paymentId: sub.id } });
  await prisma.payment.delete({ where: { id: sub.id } });
  await prisma.listerProfile.update({ where: { id: faith.id }, data: { subscriptionEndsAt: faith.subscriptionEndsAt } });
}

main()
  .catch((e) => {
    failed++;
    console.error(e);
  })
  .finally(async () => {
    if (created.length) {
      await prisma.property.update({ where: { id: (await prisma.unlock.findFirst({ where: { userId: { in: created } } }))?.propertyId ?? "" }, data: { unlockCount: { decrement: 1 } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: created } } });
    }
    await prisma.session.deleteMany({ where: { createdAt: { gt: new Date(Date.now() - 10 * 60_000) }, ip: null } });
    console.log(`\n${passed} passed, ${failed} failed`);
    await prisma.$disconnect();
    process.exit(failed ? 1 : 0);
  });
