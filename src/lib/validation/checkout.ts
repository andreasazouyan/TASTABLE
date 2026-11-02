import { z } from "zod";

import { MAX_TICKETS_PER_BOOKING } from "@/lib/booking/pricing";

/** Checkout form. Note: there are deliberately no card fields: payment is simulated. */
export const checkoutSchema = z
  .object({
    sessionId: z.string().min(1, "Choose a date"),
    ticketCount: z.coerce.number().int().min(1).max(MAX_TICKETS_PER_BOOKING, `At most ${MAX_TICKETS_PER_BOOKING} tickets per booking`),
    contactName: z.string().trim().min(2, "Enter the lead guest's name").max(80),
    contactEmail: z.email("Enter a valid email"),
    dietaryRequirements: z.string().trim().max(500).optional().default(""),
    attendeeNames: z.array(z.string().trim().max(80)).default([]),
    attendeeDietary: z.array(z.string().trim().max(200)).default([]),
    acknowledgePolicy: z.literal("on", { error: "Please read and acknowledge the cancellation policy" }),
    acknowledgeSimulated: z.literal("on", { error: "Please confirm you understand this is a simulated payment" }),
  })
  .strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function checkoutFromFormData(fd: FormData) {
  return checkoutSchema.safeParse({
    sessionId: fd.get("sessionId"),
    ticketCount: fd.get("ticketCount"),
    contactName: fd.get("contactName"),
    contactEmail: fd.get("contactEmail"),
    dietaryRequirements: fd.get("dietaryRequirements") ?? "",
    attendeeNames: fd.getAll("attendeeName").map(String),
    attendeeDietary: fd.getAll("attendeeDietary").map(String),
    acknowledgePolicy: fd.get("acknowledgePolicy") ?? undefined,
    acknowledgeSimulated: fd.get("acknowledgeSimulated") ?? undefined,
  });
}
