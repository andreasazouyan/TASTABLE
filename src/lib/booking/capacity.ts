/** Seat availability rules. A session with no seats left is never shown as available. */
export const LIMITED_THRESHOLD = 0.2; // 20% or fewer seats left (or <= 3 seats) reads as "limited"

export type Availability = "AVAILABLE" | "LIMITED" | "SOLD_OUT" | "PAST" | "CANCELLED";

export type SessionLike = { capacity: number; seatsReserved: number; startsAt: Date; status: string };

export function seatsLeft(s: Pick<SessionLike, "capacity" | "seatsReserved">) {
  return Math.max(0, s.capacity - s.seatsReserved);
}

export function availability(s: SessionLike, now: Date): Availability {
  if (s.status === "CANCELLED") return "CANCELLED";
  if (s.startsAt <= now) return "PAST";
  const left = seatsLeft(s);
  if (left <= 0) return "SOLD_OUT";
  if (left <= 3 || left / s.capacity <= LIMITED_THRESHOLD) return "LIMITED";
  return "AVAILABLE";
}

export function isBookable(s: SessionLike, now: Date, tickets = 1) {
  const a = availability(s, now);
  return (a === "AVAILABLE" || a === "LIMITED") && seatsLeft(s) >= tickets;
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  AVAILABLE: "Available",
  LIMITED: "Limited spots",
  SOLD_OUT: "Sold out",
  PAST: "Ended",
  CANCELLED: "Cancelled",
};
