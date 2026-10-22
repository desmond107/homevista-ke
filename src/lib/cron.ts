import "server-only";
import { prisma } from "./db";
import { getSettings } from "./settings";
import { notifyUser, sendEmail, appUrl } from "./notify";
import { dateLabel, plural } from "./format";
import { buildWhere, parseFilters } from "./search";

/*
 * Scheduled jobs. Run daily on Vercel Hobby (hourly is better if your plan allows) via GET /api/cron?key=CRON_SECRET (Vercel Cron, a server crontab,
 * or `npm run cron:run`). Every job is idempotent, so running it more often is harmless.
 */

/** Subscription reminders 5, 2 and 1 day(s) before expiry (email + SMS + in-app), and an expiry notice. */
export async function subscriptionReminders() {
  const { reminderDays, subscriptionPrice } = await getSettings();
  const now = Date.now();
  let sent = 0;

  // The current (latest-ending) subscription of each lister whose access is still running.
  const listers = await prisma.listerProfile.findMany({
    where: { subscriptionEndsAt: { gt: new Date(now), lt: new Date(now + (Math.max(...reminderDays, 1) + 1) * 86400_000) } },
    include: { user: true, subscriptions: { orderBy: { endsAt: "desc" }, take: 1 } },
  });
  for (const l of listers) {
    const sub = l.subscriptions[0];
    if (!sub || !l.subscriptionEndsAt) continue;
    const daysLeft = Math.ceil((l.subscriptionEndsAt.getTime() - now) / 86400_000);
    // Send the most urgent reminder that is due and not yet sent.
    const due = reminderDays.filter((d) => daysLeft <= d && !sub.remindersSent.includes(d));
    if (!due.length) continue;
    await notifyUser(l.user, {
      title: `Subscription ends in ${plural(daysLeft, "day")}`,
      body: `Your HomeVista Ke lister subscription ends on ${dateLabel(l.subscriptionEndsAt)}. Renew for KSh ${subscriptionPrice} via M-Pesa to keep your listings visible.`,
      link: "/lister/subscription",
      sms: `HomeVista: your lister subscription ends in ${plural(daysLeft, "day")} (${dateLabel(l.subscriptionEndsAt)}). Renew at ${appUrl()}/lister/subscription to keep your listings live.`,
    });
    // Mark every reminder at or above this one as sent, so a late cron doesn't fire 5-, 2- and 1-day messages at once.
    await prisma.subscription.update({ where: { id: sub.id }, data: { remindersSent: [...new Set([...sub.remindersSent, ...due])] } });
    sent++;
  }

  // Expiry notices: listings are hidden by the visibility rule automatically; this just tells the lister.
  const expired = await prisma.subscription.findMany({
    where: { endsAt: { lte: new Date(now), gt: new Date(now - 7 * 86400_000) }, expiredNoticeSent: false },
    include: { lister: { include: { user: true } } },
  });
  for (const s of expired) {
    // Skip if a later subscription already extended them.
    if (s.lister.subscriptionEndsAt && s.lister.subscriptionEndsAt > new Date(now)) {
      await prisma.subscription.update({ where: { id: s.id }, data: { expiredNoticeSent: true } });
      continue;
    }
    await notifyUser(s.lister.user, {
      title: "Subscription expired — listings hidden",
      body: `Your subscription ended on ${dateLabel(s.endsAt)}, so your listings are hidden from search. Renew any time and they go live again instantly.`,
      link: "/lister/subscription",
      sms: `HomeVista: your subscription has expired and your listings are hidden. Renew at ${appUrl()}/lister/subscription`,
    });
    await prisma.subscription.update({ where: { id: s.id }, data: { expiredNoticeSent: true } });
    sent++;
  }
  return sent;
}

/** Emails users about new listings matching their saved searches (at most once a day per search). */
export async function savedSearchAlerts() {
  const searches = await prisma.savedSearch.findMany({
    where: { alerts: true, lastNotifiedAt: { lt: new Date(Date.now() - 20 * 3600_000) } },
    include: { user: true },
    take: 500,
  });
  let sent = 0;
  for (const s of searches) {
    const filters = parseFilters(Object.fromEntries(new URLSearchParams(s.query)));
    const where = { AND: [buildWhere(filters), { publishedAt: { gt: s.lastNotifiedAt } }] };
    const matches = await prisma.property.findMany({ where, select: { title: true, slug: true, price: true }, take: 6, orderBy: { publishedAt: "desc" } });
    if (matches.length) {
      const list = matches.map((m) => `• ${m.title} — ${appUrl()}/properties/${m.slug}`).join("\n");
      await sendEmail(
        s.user.email,
        `New homes for "${s.name}"`,
        `Hi ${s.user.name.split(" ")[0]},\n\nNew listings match your saved search "${s.name}":\n\n${list}\n\nSee all: ${appUrl()}/properties?${s.query}\n\nManage alerts: ${appUrl()}/account/searches`,
      );
      sent++;
    }
    await prisma.savedSearch.update({ where: { id: s.id }, data: { lastNotifiedAt: new Date() } });
  }
  return sent;
}

/** Housekeeping: expired sessions, OTPs and rate buckets. */
export async function cleanup() {
  const now = new Date();
  await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.otpCode.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 86400_000) } } });
  await prisma.rateBucket.deleteMany({ where: { resetAt: { lt: now } } });
  // Prompts nobody answered and no callback ever resolved.
  await prisma.payment.updateMany({
    where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - 10 * 60_000) } },
    data: { status: "TIMEOUT", resultDesc: "No response from M-Pesa in time.", completedAt: now },
  });
}

export async function runAllJobs() {
  const reminders = await subscriptionReminders();
  const alerts = await savedSearchAlerts();
  await cleanup();
  return { reminders, alerts };
}
