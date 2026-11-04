"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, RefreshCw, Sparkles, X } from "lucide-react";

import { Field, inputClass } from "@/components/host/field";
import { NeighborhoodOptions } from "@/components/site/neighborhood-options";
import { Button } from "@/components/ui/button";
import { demandLabel, type DemandDimension } from "@/lib/analytics/demand-insights";
import { CATEGORIES, getCategory } from "@/lib/domain/categories";
import { DAYS, TIME_SLOT_PREFS } from "@/lib/domain/preferences";
import { ATMOSPHERES, FORMATS, cuisineLabel } from "@/lib/domain/taxonomy";
import { conceptClock, type DemandContext, type EventConcept } from "@/lib/event-concepts/generate";
import { formatPercent } from "@/lib/format";
import { generateEventConceptAction } from "@/server/actions/event-concepts";

type Inputs = { neighborhood: string; category: string; priceMin: number; priceMax: number; capacity: number; theme: string };

/**
 * "Let AI Create the Event": a dialog that shows aggregated demand, takes the host's constraints and
 * returns a concept from the rule-based demo generator. It never saves or publishes anything;
 * "Use This Concept" only prefills the form (after a warning if the host has already typed).
 */
export function AiEventAssistant({
  context,
  defaults,
  filledFields,
  onUse,
}: {
  context: DemandContext;
  defaults: { priceMin: number; priceMax: number; capacity: number };
  filledFields: () => string[];
  onUse: (c: EventConcept) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [inputs, setInputs] = useState<Inputs>({ neighborhood: "", category: "", theme: "", ...defaults });
  const [variant, setVariant] = useState(0);
  const [concept, setConcept] = useState<EventConcept | null>(null);
  const [error, setError] = useState<{ message: string; fieldErrors?: Record<string, string[]> } | null>(null);
  const [overwrite, setOverwrite] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  // Contents only exist while the dialog is open, so a closed dialog adds nothing to the page.
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    setOverwrite(null);
    setIsOpen(true);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();
  const set = <K extends keyof Inputs>(k: K, value: Inputs[K]) => setInputs((p) => ({ ...p, [k]: value }));

  function generate(nextVariant: number) {
    setError(null);
    setOverwrite(null);
    start(async () => {
      const res = await generateEventConceptAction({ ...inputs, variant: nextVariant });
      if (!res.ok) {
        setError(res);
        return;
      }
      setVariant(nextVariant);
      setConcept(res.concept);
      ref.current?.querySelector("[data-dialog-body]")?.scrollTo({ top: 0 });
    });
  }

  function use(force = false) {
    if (!concept) return;
    const filled = filledFields();
    if (filled.length && !force) {
      setOverwrite(filled);
      return;
    }
    onUse(concept);
    close();
  }

  const fe = error?.fieldErrors ?? {};

  return (
    <>
      <Button type="button" variant="brand" onClick={open}>
        <Sparkles aria-hidden /> Let AI Create the Event
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="ai-title"
        aria-describedby="ai-subtitle"
        onClose={() => setIsOpen(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-2xl border bg-card p-0 text-foreground shadow-lift backdrop:bg-black/40"
      >
        {isOpen && (
        <div data-dialog-body className="max-h-[88vh] overflow-y-auto p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="ai-title" className="flex items-center gap-2 text-2xl sm:text-3xl">
                <Sparkles className="size-6 text-brand" aria-hidden /> Create an experience with AI
              </h2>
              <p id="ai-subtitle" className="mt-1 text-muted-foreground">
                Turn Tastable&apos;s latest guest preferences into your next culinary experience.
              </p>
            </div>
            <button type="button" onClick={close} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <p className="mt-4 rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground" data-testid="generator-label">
            <strong className="text-foreground">Demo generator.</strong> No AI model is connected to this prototype. Concepts come from transparent rules applied to aggregated
            guest preferences{context.dataSource !== "live" ? " (simulated sample data)" : ""}. Nothing is published: you review and confirm every detail.
          </p>

          {!concept ? (
            <>
              <DemandSummary context={context} />
              <form
                className="mt-6 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  generate(0);
                }}
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Target neighborhood" htmlFor="ai-neighborhood" hint="Optional">
                    <select id="ai-neighborhood" className={inputClass} value={inputs.neighborhood} onChange={(e) => set("neighborhood", e.target.value)}>
                      <option value="">Anywhere in NYC</option>
                      <NeighborhoodOptions />
                    </select>
                  </Field>
                  <Field label="Experience category" htmlFor="ai-category" hint="Optional: leave it to demand">
                    <select id="ai-category" className={inputClass} value={inputs.category} onChange={(e) => set("category", e.target.value)}>
                      <option value="">Most in-demand category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <fieldset className="sm:col-span-1">
                    <legend className="mb-1.5 text-sm font-medium">Ticket price range (USD)</legend>
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor="ai-price-min">
                        Lowest ticket price
                      </label>
                      <input id="ai-price-min" type="number" min={5} max={2000} className={inputClass} value={inputs.priceMin} onChange={(e) => set("priceMin", Number(e.target.value))} aria-invalid={!!fe.priceMin} />
                      <span aria-hidden>–</span>
                      <label className="sr-only" htmlFor="ai-price-max">
                        Highest ticket price
                      </label>
                      <input id="ai-price-max" type="number" min={5} max={2000} className={inputClass} value={inputs.priceMax} onChange={(e) => set("priceMax", Number(e.target.value))} aria-invalid={!!fe.priceMax} />
                    </div>
                    {(fe.priceMin ?? fe.priceMax)?.map((m) => (
                      <p key={m} className="mt-1 text-xs text-destructive">
                        {m}
                      </p>
                    ))}
                  </fieldset>
                  <Field label="Target guest capacity" htmlFor="ai-capacity">
                    <input id="ai-capacity" type="number" min={2} max={200} className={inputClass} value={inputs.capacity} onChange={(e) => set("capacity", Number(e.target.value))} aria-invalid={!!fe.capacity} />
                    {fe.capacity?.map((m) => (
                      <p key={m} className="mt-1 text-xs text-destructive">
                        {m}
                      </p>
                    ))}
                  </Field>
                  <Field label="Theme or creative direction" htmlFor="ai-theme" hint="Optional, e.g. “a cozy Korean barbecue night”" className="sm:col-span-2">
                    <input id="ai-theme" className={inputClass} value={inputs.theme} maxLength={120} onChange={(e) => set("theme", e.target.value)} />
                  </Field>
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error.message}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="brand" disabled={pending}>
                    <Sparkles aria-hidden /> {pending ? "Generating…" : "Generate My Experience"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <ConceptPreview concept={concept} />
          )}

          {concept && (
            <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 border-t bg-card px-5 py-4 sm:-mx-7 sm:-mb-7 sm:px-7">
              {overwrite ? (
                <div role="alertdialog" aria-labelledby="overwrite-title" className="space-y-3">
                  <p id="overwrite-title" className="flex items-start gap-2 text-sm font-medium">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    This will replace what you&apos;ve already entered: {overwrite.join(", ")}.
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setOverwrite(null)}>
                      Keep my entries
                    </Button>
                    <Button type="button" variant="brand" onClick={() => use(true)}>
                      Replace and use concept
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button type="button" variant="ghost" onClick={() => setConcept(null)}>
                    Edit inputs
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="button" variant="outline" onClick={() => generate(variant + 1)} disabled={pending}>
                      <RefreshCw aria-hidden /> {pending ? "Generating…" : "Regenerate"}
                    </Button>
                    <Button type="button" variant="brand" onClick={() => use()}>
                      Use This Concept
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </dialog>
    </>
  );
}

function DemandSummary({ context }: { context: DemandContext }) {
  const size = context.segment.allowed ? context.segment.guests : 0;
  const rows: { label: string; dim: DemandDimension; items: DemandContext["topCuisines"] }[] = [
    { label: "Popular cuisines", dim: "cuisine", items: context.topCuisines.filter((c) => c.key !== "any") },
    { label: "Most requested dishes", dim: "dish", items: context.topDishes },
    { label: "Preferred categories", dim: "category", items: context.topCategories },
    { label: "Popular days", dim: "day", items: context.topDays },
    { label: "Popular time slots", dim: "time", items: context.topTimes },
    { label: "Neighborhoods", dim: "neighborhood", items: context.topNeighborhoods },
    { label: "Social preferences", dim: "attendance", items: context.attendance },
  ];
  return (
    <section aria-labelledby="ai-demand-title" className="mt-6">
      <h3 id="ai-demand-title" className="text-lg">
        What guests want right now
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        {size ? `Aggregated from ${size} guests' stated preferences. Options chosen by fewer than 5 guests are hidden.` : "Not enough guests have shared preferences yet to show demand."}
      </p>
      {size > 0 && (
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{r.label}</dt>
              <dd className="mt-1">
                {r.items.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {r.items.slice(0, 4).map((i) => (
                      <li key={i.key} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                        {demandLabel(r.dim, i.key)} <span className="text-muted-foreground tabular-nums">{formatPercent(i.share)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-muted-foreground">Too few answers to show</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function ConceptPreview({ concept: c }: { concept: EventConcept }) {
  const day = DAYS.find((d) => d.key === c.day)!.label;
  const slot = TIME_SLOT_PREFS.find((t) => t.key === c.timeSlot)!;
  return (
    <section aria-labelledby="concept-title" className="mt-6 space-y-6">
      <div>
        <p className="eyebrow">Suggested concept</p>
        <h3 id="concept-title" className="mt-1 text-2xl">
          {c.title}
        </h3>
        <p className="mt-1 font-medium">{c.summary}</p>
        <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
        <Item label="Category" value={getCategory(c.category).name} />
        <Item label="Cuisine" value={cuisineLabel(c.cuisine)} />
        <Item label="Format" value={FORMATS[c.format]} />
        <Item label="Featured dishes" value={c.featuredDishes.map((k) => demandLabel("dish", k)).join(", ")} />
        <Item label="Suggested ticket price" value={`$${c.price.suggested} (your range $${c.price.min}–$${c.price.max})`} />
        <Item label="Suggested group size" value={`${c.groupSize.min}–${c.groupSize.max} guests`} />
        <Item label="Suggested day and time" value={`${day}, ${conceptClock(c.startTime, 0)} (${slot.label} slot)`} />
        <Item label="Suggested duration" value={`${Math.floor(c.durationMinutes / 60)} hr${c.durationMinutes % 60 ? ` ${c.durationMinutes % 60} min` : ""}`} />
        <Item label="Social atmosphere" value={`${ATMOSPHERES[c.socialAtmosphere].label}. ${c.atmosphereNote}`} />
        <Item label="Discovery tags" value={c.tags.join(", ")} />
      </dl>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 font-display text-lg">Menu</h4>
          <div className="space-y-3 text-sm">
            {c.menuSections.map((s) => (
              <div key={s.title}>
                <p className="font-medium">{s.title}</p>
                <ul className="text-muted-foreground">
                  {s.items.map((i) => (
                    <li key={i.name}>{i.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-2 font-display text-lg">Itinerary</h4>
          <ol className="space-y-1.5 text-sm" aria-label="Suggested itinerary">
            {c.itinerary.map((s) => (
              <li key={s.startOffsetMinutes + s.title} className="flex gap-3">
                <span className="w-16 shrink-0 text-muted-foreground tabular-nums">{conceptClock(c.startTime, s.startOffsetMinutes)}</span>
                <span>{s.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-display text-lg">Why this concept</h4>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground" aria-label="Demand signals used">
          {c.rationale.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        These are suggestions. Using the concept fills in your form; you&apos;ll still confirm the venue, date, time, price, capacity, menu and cancellation policy yourself before
        anything is published.
      </p>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
