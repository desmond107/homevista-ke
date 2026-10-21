"use server";

import { z } from "zod";
import { safeAction, UserError, type ActionResult } from "@/lib/action";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/request";
import { sendEmail } from "@/lib/notify";
import { BRAND } from "@/lib/constants";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().max(20).optional(),
  topic: z.string().trim().max(60),
  message: z.string().trim().min(10, "Please write a little more.").max(3000),
  website: z.string().max(0, "Spam detected.").optional(), // honeypot: humans never see this field
});

export async function contactAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    if (!(await rateLimit(`contact:${hashIp(await clientIp())}`, 5, 3600)).ok) throw new UserError("Too many messages — please try again later or call us.");
    const d = schema.parse(Object.fromEntries(fd));
    await sendEmail(
      process.env.CONTACT_INBOX || BRAND.email,
      `[Contact] ${d.topic} — ${d.name}`,
      `From: ${d.name} <${d.email}>${d.phone ? `\nPhone: ${d.phone}` : ""}\nTopic: ${d.topic}\n\n${d.message}`,
    );
    await sendEmail(d.email, "We've received your message", `Hi ${d.name.split(" ")[0]},\n\nThanks for contacting HomeVista Ke. Our team will reply within one business day.\n\nYour message:\n${d.message}`);
    return { ok: true as const, message: "Thank you! We'll get back to you within one business day." };
  });
}
