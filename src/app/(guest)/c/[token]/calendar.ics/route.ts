import { appUrl } from "@/lib/calendar/booking-events";
import { buildIcs } from "@/lib/calendar/ics";
import { serverNow } from "@/lib/clock";
import { getSharedCalendar } from "@/server/queries/calendar";

/** Public .ics for a shared calendar. Same privacy rules as the shared page; revoked → 404. */
export async function GET(_req: Request, ctx: RouteContext<"/c/[token]/calendar.ics">) {
  const { token } = await ctx.params;
  const now = serverNow();
  const cal = await getSharedCalendar(token, now);
  if (!cal) return new Response("Not found", { status: 404 });
  const body = buildIcs(
    cal.events.map((e) => ({
      uid: `shared-${e.sessionId}@tastable.local`,
      start: e.startsAt,
      end: e.endsAt,
      summary: e.title,
      location: `${e.neighborhood}, ${e.borough}, New York`,
      url: e.slug ? `${appUrl()}/experiences/${e.slug}` : undefined,
    })),
    { name: `${cal.ownerFirstName}'s Tastable plans`, now },
  );
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
