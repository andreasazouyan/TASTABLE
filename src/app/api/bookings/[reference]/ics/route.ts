import { getCurrentUser } from "@/lib/auth/demo";
import { appUrl, bookingToIcs } from "@/lib/calendar/booking-events";
import { buildIcs } from "@/lib/calendar/ics";
import { serverNow } from "@/lib/clock";
import { db } from "@/lib/db";

/** .ics for one booking. Owner only; anyone else gets 404. */
export async function GET(_req: Request, ctx: RouteContext<"/api/bookings/[reference]/ics">) {
  const { reference } = await ctx.params;
  const user = await getCurrentUser();
  const booking = await db.booking.findUnique({
    where: { reference },
    include: { session: { include: { experience: { include: { venue: true } } } } },
  });
  if (!user?.guestProfile || !booking || booking.guestId !== user.guestProfile.id || booking.status === "PENDING") {
    return new Response("Not found", { status: 404 });
  }
  const body = buildIcs([bookingToIcs(booking, appUrl())], { name: "Tastable booking", now: serverNow() });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tastable-${booking.reference}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
