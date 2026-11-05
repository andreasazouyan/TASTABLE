import { NotificationMenu, type NotificationItem } from "@/components/site/notification-menu";
import { getCurrentUser } from "@/lib/auth/demo";
import { db } from "@/lib/db";
import { formatTime, isoDateNY } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { dueReminders } from "@/server/services/reminders";

/**
 * Header bell for signed-in guests: in-app booking reminders (24 hours before). Reads cookies and
 * the clock: render inside <Suspense>. Never claims an email or push notification was sent.
 */
export async function NotificationBell() {
  const user = await getCurrentUser();
  if (!user?.guestProfile) return null;
  const now = await requestNow();
  const today = isoDateNY(now);
  const reminders = await dueReminders(db, user.guestProfile.id, now);
  const items: NotificationItem[] = reminders.map((r) => {
    const { startsAt, experience } = r.booking.session;
    return {
      id: r.id,
      title: experience.title,
      when: `${isoDateNY(startsAt) === today ? "Today" : "Tomorrow"} at ${formatTime(startsAt)}`,
      tickets: r.booking.ticketCount,
      reference: r.booking.reference,
    };
  });
  return <NotificationMenu items={items} />;
}
