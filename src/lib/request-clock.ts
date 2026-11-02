import "server-only";

import { connection } from "next/server";

import { serverNow } from "@/lib/clock";

/**
 * Server-component access to the single server clock. Awaiting connection() marks the
 * render as request-time (required by Cache Components before reading the current time).
 */
export async function requestNow(): Promise<Date> {
  await connection();
  return serverNow();
}
