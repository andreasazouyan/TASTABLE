import { simulatedPaymentReference } from "@/lib/booking/codes";

/**
 * SIMULATED PAYMENTS ONLY. Tastable never collects card data and never calls a processor.
 * SIMULATED_PAYMENTS_MODE=fail makes every simulated charge decline (for testing error states).
 */
export type SimulatedCharge =
  | { ok: true; reference: string }
  | { ok: false; reference: string; reason: string };

export function simulateCharge(amountCents: number): SimulatedCharge {
  const reference = simulatedPaymentReference();
  if (amountCents <= 0) return { ok: false, reference, reason: "Amount must be positive." };
  if (process.env.SIMULATED_PAYMENTS_MODE === "fail") {
    return { ok: false, reference, reason: "Simulated decline (SIMULATED_PAYMENTS_MODE=fail)." };
  }
  return { ok: true, reference };
}
