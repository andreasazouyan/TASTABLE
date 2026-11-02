import { z } from "zod";
import { CATEGORIES } from "@/lib/domain/categories";

const categorySlugs = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

/** Query-string filters for the experience browser. Invalid values fall back to "no filter". */
export const experienceSearchSchema = z.object({
  category: z.enum(categorySlugs).optional().catch(undefined),
  city: z.string().trim().max(60).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  /** ISO calendar date (YYYY-MM-DD): only experiences with a session that day. */
  date: z.iso.date().optional().catch(undefined),
});

export type ExperienceSearch = z.infer<typeof experienceSearchSchema>;
