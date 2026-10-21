import Link from "next/link";
import { Inbox, Mail, Phone } from "lucide-react";
import { requireLister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { prettyPhone, timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ConfirmButton } from "@/components/forms";
import { Avatar, EmptyState, Pill, cx } from "@/components/ui";
import { markMessageReadAction } from "@/app/actions/lister";

export default async function MessagesPage() {
  const user = await requireLister();
  const messages = await prisma.message.findMany({
    where: { listerId: user.listerId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { sender: { select: { name: true, email: true, phone: true, avatarUrl: true } }, property: { select: { title: true, slug: true } } },
  });
  return (
    <>
      <DashHeader title="Messages" intro="Enquiries from seekers who unlocked your listings. Reply by phone, WhatsApp or email." />
      {messages.length ? (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={cx("card p-5", !m.readAt && "ring-1 ring-gold/50")}>
              <div className="flex items-start gap-3">
                <Avatar name={m.sender.name} src={m.sender.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{m.sender.name}</p>
                    {!m.readAt && <Pill tone="gold">New</Pill>}
                    <span className="text-xs text-muted">{timeAgo(m.createdAt)}</span>
                  </div>
                  <Link href={`/properties/${m.property.slug}`} className="block truncate text-xs text-muted hover:text-gold-deep">Re: {m.property.title}</Link>
                  <p className="mt-2 text-sm whitespace-pre-line text-ink-2">{m.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.sender.phone && (
                      <a href={`tel:+${m.sender.phone}`} className="btn-primary btn-sm"><Phone size={13} /> {prettyPhone(m.sender.phone)}</a>
                    )}
                    {m.sender.phone && (
                      <a href={`https://wa.me/${m.sender.phone}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-[#25d366] text-white">WhatsApp</a>
                    )}
                    <a href={`mailto:${m.sender.email}?subject=${encodeURIComponent(`Re: ${m.property.title}`)}`} className="btn-outline btn-sm"><Mail size={13} /> Email</a>
                    {!m.readAt && <ConfirmButton action={markMessageReadAction.bind(null, m.id)} className="btn-ghost btn-sm">Mark as read</ConfirmButton>}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Inbox size={24} />} title="No messages yet" body="When a seeker unlocks one of your listings they can message you here." />
      )}
    </>
  );
}
