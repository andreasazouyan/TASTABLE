import { getCurrentUser } from "@/lib/auth/demo";
import { appUrl, bookingToIcs } from "@/lib/calendar/booking-events";
import { buildIcs } from "@/lib/calendar/ics";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";

/** All of the signed-in guest's confirmed (and cancelled, marked CANCELLED) bookings. Private. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.guestProfile) return new Response("Sign in required", { status: 401 });
  const bookings = await db.booking.findMany({
    where: { guestId: user.guestProfile.id, status: { in: ["CONFIRMED", "COMPLETED", "CANCELLED"] } },
    include: { session: { include: { experience: { include: { venue: true } } } } },
    orderBy: { session: { startsAt: "asc" } },
  });
  const body = buildIcs(bookings.map((b) => bookingToIcs(b, appUrl())), { name: "My Tastable bookings", now: serverNow() });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tastable-bookings.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
