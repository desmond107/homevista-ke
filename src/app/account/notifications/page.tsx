import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { markNotificationsReadAction } from "@/app/actions/user";
import { DashHeader } from "@/components/DashShell";
import { EmptyState, cx } from "@/components/ui";

export default async function NotificationsPage() {
  const user = await requireUser("/account/notifications");
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((i) => !i.read).length;
  return (
    <>
      <DashHeader
        title="Notifications"
        intro={unread ? `${unread} unread` : "You're all caught up."}
        action={
          unread > 0 && (
            <form action={markNotificationsReadAction}>
              <button className="btn-outline btn-sm">Mark all as read</button>
            </form>
          )
        }
      />
      {items.length ? (
        <ul className="card divide-y divide-line">
          {items.map((n) => (
            <li key={n.id} className={cx("flex gap-3 p-4", !n.read && "bg-gold-soft/40")}>
              <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-gold")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{n.link ? <Link href={n.link} className="hover:text-gold-deep">{n.title}</Link> : n.title}</p>
                <p className="mt-0.5 text-sm whitespace-pre-line text-ink-2">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{timeAgo(n.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Bell size={24} />} title="No notifications" />
      )}
    </>
  );
}
