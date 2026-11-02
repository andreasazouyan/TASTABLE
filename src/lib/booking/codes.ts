import { randomBytes, randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function code(length: number) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** Booking reference shown to guests, e.g. TBL-7K3M9Q. */
export function bookingReference() {
  return `TBL-${code(6)}`;
}

/** Per-seat ticket code encoded in the QR, e.g. TKT-7K3M-Q9XD-2B. */
export function ticketCode() {
  return `TKT-${code(4)}-${code(4)}-${code(2)}`;
}

/** Simulated payment reference. Never a real processor id. */
export function simulatedPaymentReference() {
  return `sim_${randomBytes(10).toString("hex")}`;
}

/** Non-guessable token for share links (160 bits, URL-safe). */
export function shareToken() {
  return randomBytes(20).toString("base64url");
}
