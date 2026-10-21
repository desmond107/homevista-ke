"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertUser } from "@/lib/auth";
import { safeAction, UserError, type ActionResult } from "@/lib/action";
import { rateLimit } from "@/lib/ratelimit";
import { publicWhere, refreshRating } from "@/lib/listings";
import { getSettings } from "@/lib/settings";
import { notifyInApp, notifyUser } from "@/lib/notify";
import { REPORT_REASONS } from "@/lib/constants";

/** Toggles a favourite. Returns the new state. */
export async function toggleFavouriteAction(propertyId: string): Promise<ActionResult<{ saved: boolean }>> {
  return safeAction(async () => {
    const user = await assertUser();
    const key = { userId_propertyId: { userId: user.id, propertyId } };
    const existing = await prisma.favourite.findUnique({ where: key });
    if (existing) {
      await prisma.favourite.delete({ where: key });
    } else {
      const p = await prisma.property.findFirst({ where: { id: propertyId, ...publicWhere() }, select: { id: true } });
      if (!p) throw new UserError("This listing is no longer available.");
      await prisma.favourite.create({ data: { userId: user.id, propertyId } });
    }
    revalidatePath("/account/favourites");
    return { ok: true as const, data: { saved: !existing } };
  });
}

// Very small abuse heuristic; anything flagged goes to the moderation queue.
const ABUSE = /\b(idiot|stupid|fool|crook|thief|thieves|scam+ers?|f+u+c+k|shit|bastard|mjinga|mwizi|wezi)\b/i;
const PHONE_IN_TEXT = /(\+?254|0)[17]\d{2}[\s-]?\d{3}[\s-]?\d{3}/;

const reviewSchema = z.object({
  propertyId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Choose a star rating.").max(5),
  comment: z.string().trim().min(10, "Please write at least a sentence (10+ characters).").max(1500),
});

export async function saveReviewAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertUser();
    if (!(await rateLimit(`review:${user.id}`, 10, 3600)).ok) throw new UserError("You're reviewing very quickly — please try again later.");
    const d = reviewSchema.parse(Object.fromEntries(fd));
    const property = await prisma.property.findFirst({ where: { id: d.propertyId, ...publicWhere() }, select: { id: true, slug: true, title: true, lister: { select: { userId: true } } } });
    if (!property) throw new UserError("This listing is no longer available.");
    if (property.lister.userId === user.id) throw new UserError("You can't review your own listing.");
    const { reviewModeration } = await getSettings();
    const flagged = ABUSE.test(d.comment) || PHONE_IN_TEXT.test(d.comment);
    const status = reviewModeration || flagged ? "PENDING" : "PUBLISHED";

    const existing = await prisma.review.findUnique({ where: { propertyId_userId: { propertyId: d.propertyId, userId: user.id } } });
    await prisma.review.upsert({
      where: { propertyId_userId: { propertyId: d.propertyId, userId: user.id } },
      create: { propertyId: d.propertyId, userId: user.id, rating: d.rating, comment: d.comment, status, flagged },
      update: { rating: d.rating, comment: d.comment, status, flagged },
    });
    await refreshRating(d.propertyId);
    if (!existing && status === "PUBLISHED") {
      await notifyInApp(property.lister.userId, "New review", `${user.name} rated "${property.title}" ${d.rating}★.`, "/lister/reviews");
    }
    revalidatePath(`/properties/${property.slug}`);
    return {
      ok: true as const,
      message: status === "PENDING" ? "Thanks! Your review will appear once a moderator has checked it." : existing ? "Your review has been updated." : "Thanks — your review is live.",
    };
  });
}

export async function deleteReviewAction(reviewId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertUser();
    const r = await prisma.review.findUnique({ where: { id: reviewId }, include: { property: { select: { slug: true } } } });
    if (!r || r.userId !== user.id) throw new UserError("Review not found.");
    await prisma.review.delete({ where: { id: reviewId } });
    await refreshRating(r.propertyId);
    revalidatePath(`/properties/${r.property.slug}`);
    revalidatePath("/account/reviews");
    return { ok: true as const, message: "Review deleted." };
  });
}

const reportSchema = z.object({
  propertyId: z.string().optional(),
  reviewId: z.string().optional(),
  reason: z.string().refine((r) => REPORT_REASONS.includes(r) || r === "Abusive review", "Choose a reason."),
  details: z.string().trim().max(1000).optional(),
});

export async function reportAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertUser();
    if (!(await rateLimit(`report:${user.id}`, 10, 3600)).ok) throw new UserError("Too many reports — please try again later.");
    const d = reportSchema.parse(Object.fromEntries(fd));
    if (!d.propertyId && !d.reviewId) throw new UserError("Nothing to report.");
    await prisma.report.create({ data: { reporterId: user.id, propertyId: d.propertyId || null, reviewId: d.reviewId || null, reason: d.reason, details: d.details || null } });
    if (d.reviewId) await prisma.review.update({ where: { id: d.reviewId }, data: { flagged: true } }).catch(() => {});
    return { ok: true as const, message: "Thank you. Our moderation team will review this within 24 hours." };
  });
}

export async function saveSearchAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertUser();
    const name = String(fd.get("name") ?? "").trim().slice(0, 100) || "My search";
    const query = String(fd.get("query") ?? "").replace(/^\?/, "").slice(0, 1000);
    const params = new URLSearchParams(query);
    params.delete("page");
    params.delete("view");
    const count = await prisma.savedSearch.count({ where: { userId: user.id } });
    if (count >= 20) throw new UserError("You can keep up to 20 saved searches. Delete one first.");
    await prisma.savedSearch.create({ data: { userId: user.id, name, query: params.toString(), alerts: fd.get("alerts") === "on" } });
    revalidatePath("/account/searches");
    return { ok: true as const, message: "Search saved. We'll email you when new matching homes are listed." };
  });
}

export async function updateSavedSearchAction(id: string, change: { alerts?: boolean; delete?: boolean }): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertUser();
    const s = await prisma.savedSearch.findUnique({ where: { id } });
    if (!s || s.userId !== user.id) throw new UserError("Saved search not found.");
    if (change.delete) await prisma.savedSearch.delete({ where: { id } });
    else await prisma.savedSearch.update({ where: { id }, data: { alerts: !!change.alerts } });
    revalidatePath("/account/searches");
    return { ok: true as const };
  });
}

export async function sendMessageAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertUser();
    const propertyId = String(fd.get("propertyId") ?? "");
    const body = String(fd.get("body") ?? "").trim();
    if (body.length < 5) throw new UserError("Please write a short message.");
    if (body.length > 2000) throw new UserError("Messages are limited to 2,000 characters.");
    if (!(await rateLimit(`msg:${user.id}`, 20, 3600)).ok) throw new UserError("You're sending messages too quickly.");
    // Messaging is part of what an unlock buys.
    const unlock = await prisma.unlock.findUnique({ where: { userId_propertyId: { userId: user.id, propertyId } } });
    if (!unlock) throw new UserError("Unlock this property to message the lister.");
    const p = await prisma.property.findUniqueOrThrow({ where: { id: propertyId }, include: { lister: { include: { user: true } } } });
    await prisma.message.create({ data: { propertyId, senderId: user.id, listerId: p.listerId, body } });
    await notifyUser(p.lister.user, {
      title: "New enquiry",
      body: `${user.name} sent you a message about "${p.title}":\n\n"${body.slice(0, 300)}"`,
      link: "/lister/messages",
      emailSubject: `New enquiry: ${p.title}`,
    });
    return { ok: true as const, message: "Message sent. The lister will contact you on your phone or email." };
  });
}

export async function markNotificationsReadAction(): Promise<void> {
  const user = await assertUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}
