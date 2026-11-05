import { z } from "zod";

import { MAX_TICKETS_PER_BOOKING } from "@/lib/booking/pricing";
import { REGINA_MAINS } from "@/lib/domain/reginas-table";

const mainKey = z.enum(REGINA_MAINS.map((m) => m.key) as [string, ...string[]], { error: "Choose a main course" });

/**
 * Regina's Entrepreneurship Class Supper reservation: 1 seat up to the seats left, each guest
 * with a main course. Guest 1 is the person reserving; other guests' names are optional.
 */
export const reginaReservationSchema = z
  .object({
    sessionId: z.string().min(1, "Choose a date"),
    contactName: z.string().trim().min(2, "Enter your name").max(80),
    contactEmail: z.email("Enter a valid email"),
    ticketCount: z.coerce.number().int().min(1, "Reserve at least 1 seat").max(MAX_TICKETS_PER_BOOKING, `At most ${MAX_TICKETS_PER_BOOKING} seats per reservation`),
    guestNames: z.array(z.string().trim().max(80)).max(MAX_TICKETS_PER_BOOKING).default([]),
    mains: z.array(z.string().optional()).max(MAX_TICKETS_PER_BOOKING),
    dietaryRequirements: z.string().trim().max(500).optional().default(""),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (let i = 0; i < v.ticketCount; i++) {
      if (!mainKey.safeParse(v.mains[i]).success) ctx.addIssue({ code: "custom", path: [`main${i}`], message: "Choose a main course" });
    }
  });

export type ReginaReservationInput = z.infer<typeof reginaReservationSchema>;

export function reginaReservationFromFormData(fd: FormData) {
  const count = Number(fd.get("ticketCount"));
  const n = Number.isInteger(count) && count > 0 ? Math.min(count, MAX_TICKETS_PER_BOOKING) : 0;
  return reginaReservationSchema.safeParse({
    sessionId: fd.get("sessionId"),
    contactName: fd.get("contactName"),
    contactEmail: fd.get("contactEmail"),
    ticketCount: fd.get("ticketCount"),
    guestNames: Array.from({ length: n }, (_, i) => (i === 0 ? "" : String(fd.get(`guestName${i}`) ?? ""))),
    mains: Array.from({ length: n }, (_, i) => (fd.get(`main${i}`) as string | null) ?? undefined),
    dietaryRequirements: fd.get("dietaryRequirements") ?? "",
  });
}
