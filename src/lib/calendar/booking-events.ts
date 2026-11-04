import type { IcsEvent } from "@/lib/calendar/ics";

type BookingForIcs = {
  id: string;
  reference: string;
  status: string;
  ticketCount: number;
  session: {
    startsAt: Date;
    endsAt: Date;
    experience: { title: string; slug: string; venue: { name: string; neighborhood: string; addressLine: string; isSecretLocation: boolean } };
  };
};

/** Maps a guest's own booking to an iCalendar event. Cancelled bookings are exported as CANCELLED. */
export function bookingToIcs(b: BookingForIcs, baseUrl: string): IcsEvent {
  const e = b.session.experience;
  const location = e.venue.isSecretLocation ? `Secret location, ${e.venue.neighborhood}, New York` : `${e.venue.name}, ${e.venue.addressLine}, ${e.venue.neighborhood}, New York`;
  return {
    uid: `booking-${b.id}@tastable.local`,
    start: b.session.startsAt,
    end: b.session.endsAt,
    summary: `${e.title} (Tastable)`,
    description: `Booking ${b.reference} · ${b.ticketCount} ticket(s). Demo booking for a fictional sample event.`,
    location,
    url: `${baseUrl}/experiences/${e.slug}`,
    status: b.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
    sequence: b.status === "CANCELLED" ? 1 : 0,
    // 24-hour reminder in the guest's own calendar app, matching the in-app reminder.
    alarmHoursBefore: 24,
  };
}

export function appUrl() {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const fallback = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
  return (process.env.NEXT_PUBLIC_APP_URL || fallback).replace(/\/$/, "");
}
