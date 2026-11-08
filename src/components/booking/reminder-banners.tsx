import Link from "next/link";
import { BellRing, X } from "lucide-react";

import { formatTime, isoDateNY } from "@/lib/format";
import { db } from "@/lib/db";
import { dismissReminderAction } from "@/server/actions/bookings";
import { dueReminders } from "@/server/services/reminders";

/**
 * In-app reminders for bookings starting within 24 hours. Shown on Tastable pages only; the copy
 * never claims an email or push notification was sent.
 */
export async function ReminderBanners({ guestId, now }: { guestId: string; now: Date }) {
  const reminders = await dueReminders(db, guestId, now);
  if (!reminders.length) return null;
  const today = isoDateNY(now);
  return (
    <ul className="mb-6 space-y-2" aria-label="Reminders">
      {reminders.map((r) => {
        const { startsAt, experience } = r.booking.session;
        const when = `${isoDateNY(startsAt) === today ? "today" : "tomorrow"} at ${formatTime(startsAt)}`;
        return (
          <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-brand/40 bg-brand-soft/60 p-4 text-sm">
            <BellRing className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Reminder: {experience.title} starts {when}.
              </p>
              <p className="text-muted-foreground">
                {r.booking.ticketCount} {r.booking.ticketCount === 1 ? "ticket" : "tickets"} ·{" "}
                <Link href={`/bookings/${r.booking.reference}`} className="text-brand underline-offset-4 hover:underline">
                  View ticket
                </Link>{" "}
                · In-app reminder only (no email or push notifications in this demo).
              </p>
            </div>
            <form action={dismissReminderAction}>
              <input type="hidden" name="reminderId" value={r.id} />
              <button type="submit" className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground" aria-label={`Dismiss reminder for ${experience.title}`}>
                <X className="size-4" aria-hidden />
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
