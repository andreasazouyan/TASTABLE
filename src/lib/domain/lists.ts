import { z } from "zod";

/** Multi-value fields are stored as comma-separated strings (kept portable across databases). */
export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function serializeList(values: readonly string[]): string {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).join(",");
}

/** Free-text lists (menu, highlights...) are JSON arrays. Invalid JSON yields []. */
export function parseJson<T>(value: string | null | undefined, schema: z.ZodType<T>): T[] {
  try {
    const parsed = z.array(schema).safeParse(JSON.parse(value ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export const menuItemSchema = z.object({ title: z.string(), description: z.string().optional().default("") });
export type MenuItem = z.infer<typeof menuItemSchema>;
export const stringItem = z.string();
