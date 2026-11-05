import { z } from "zod";

import { REGINA_MAINS } from "@/lib/domain/reginas-table";

const mainKey = z.enum(REGINA_MAINS.map((m) => m.key) as [string, ...string[]], { error: "Choose a main course" });

/** Regina's Table reservation: always two guests (you and a +1), each with a main course. */
export const reginaReservationSchema = z
  .object({
    sessionId: z.string().min(1, "Choose a date"),
    contactName: z.string().trim().min(2, "Enter your name").max(80),
    contactEmail: z.email("Enter a valid email"),
    plusOneName: z.string().trim().max(80).optional().default(""),
    mainGuest: mainKey,
    mainPlusOne: mainKey,
    dietaryRequirements: z.string().trim().max(500).optional().default(""),
  })
  .strict();

export type ReginaReservationInput = z.infer<typeof reginaReservationSchema>;

export function reginaReservationFromFormData(fd: FormData) {
  return reginaReservationSchema.safeParse({
    sessionId: fd.get("sessionId"),
    contactName: fd.get("contactName"),
    contactEmail: fd.get("contactEmail"),
    plusOneName: fd.get("plusOneName") ?? "",
    mainGuest: fd.get("mainGuest") ?? undefined,
    mainPlusOne: fd.get("mainPlusOne") ?? undefined,
    dietaryRequirements: fd.get("dietaryRequirements") ?? "",
  });
}
