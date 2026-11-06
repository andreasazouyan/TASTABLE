import { AVAILABILITY_LABEL, type Availability } from "@/lib/booking/capacity";
import { cn } from "@/lib/utils";

/** Seats text that never presents a full session as available. */
export function spotsText(seatsLeft: number, availability: Availability, noun: "spot" | "seat" = "spot") {
  if (availability === "SOLD_OUT" || seatsLeft <= 0) return "Sold out";
  if (availability === "PAST") return "Ended";
  if (availability === "CANCELLED") return "Cancelled";
  return `${seatsLeft} ${noun}${seatsLeft === 1 ? "" : "s"} left`;
}

export function AvailabilityPill({ seatsLeft, availability, noun, className }: { seatsLeft: number; availability: Availability; noun?: "spot" | "seat"; className?: string }) {
  const tone =
    availability === "SOLD_OUT" || availability === "CANCELLED"
      ? "bg-foreground text-background"
      : availability === "LIMITED"
        ? "bg-brand text-brand-foreground"
        : "bg-card/90 text-foreground";
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium shadow-soft backdrop-blur", tone, className)}
      aria-label={`${AVAILABILITY_LABEL[availability]}: ${spotsText(seatsLeft, availability, noun)}`}
    >
      {spotsText(seatsLeft, availability, noun)}
    </span>
  );
}
