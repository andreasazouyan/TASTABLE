"use server";

import { z } from "zod";

import { requireHost } from "@/lib/auth/demo";
import { conceptRequest, eventConcept, generateEventConcept, type EventConcept } from "@/lib/event-concepts/generate";
import { getEventCreationContext } from "@/server/queries/audience-insights";

export type ConceptState = { ok: true; concept: EventConcept } | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Generates an event concept for the Create Event form. No AI provider is configured for
 * Tastable, so this uses the deterministic, rule-based demo generator (labelled as such in the UI);
 * if a provider is added later, its key stays here on the server and its output must pass the same
 * `eventConcept` schema. Nothing is saved or published: the concept only prefills the host's form.
 */
export async function generateEventConceptAction(input: unknown): Promise<ConceptState> {
  await requireHost();
  const parsed = conceptRequest.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }
  // Aggregated, privacy-thresholded demand only; a generous `top` so neighborhood lookups are exact.
  const context = await getEventCreationContext({}, 50);
  const result = eventConcept.safeParse(generateEventConcept(context, parsed.data));
  if (!result.success) return { ok: false, message: "The generator produced an incomplete concept. Try Regenerate or adjust your inputs." };
  return { ok: true, concept: result.data };
}
