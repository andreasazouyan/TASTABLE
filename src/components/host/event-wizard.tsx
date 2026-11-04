"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";

import { EventMenu, menuHeading } from "@/components/experiences/event-menu";
import { AiEventAssistant } from "@/components/host/ai-event-dialog";
import { PageHeader } from "@/components/host/stat-tile";
import { ExperienceTimeline } from "@/components/experiences/experience-timeline";
import { FeaturedDishesEditor, ItineraryEditor, MenuSectionsEditor, MenuStatusField, menuProblems } from "@/components/host/event-content-editors";
import { Field, inputClass } from "@/components/host/field";
import { ChoiceCard } from "@/components/onboarding/choice-card";
import { Photo } from "@/components/site/photo";
import { Button } from "@/components/ui/button";
import { NeighborhoodOptions } from "@/components/site/neighborhood-options";
import { nyDateTime } from "@/lib/clock";
import { CATEGORIES } from "@/lib/domain/categories";
import { itineraryProblems, legacyMenuFromSections, sectionsFromLegacyMenu, stepDuration } from "@/lib/domain/event-content";
import { PHOTOS } from "@/lib/domain/photos";
import { ATMOSPHERES, CUISINES, DIETARY_OPTIONS, FORMATS, OCCASIONS } from "@/lib/domain/taxonomy";
import { addIsoDays, isoWeekday } from "@/lib/discovery/dates";
import { DAY_KEYS } from "@/lib/domain/preferences";
import type { DemandContext, EventConcept } from "@/lib/event-concepts/generate";
import { cn } from "@/lib/utils";
import type { EventInput } from "@/lib/validation/event";
import { saveEventAction } from "@/server/actions/host";

type Venue = { id: string; name: string; neighborhood: string; maxCapacity: number; isSecretLocation: boolean };
type Policy = { id: string; name: string; summary: string; hostId: string | null };

const VENUE_TYPES: Record<string, string> = {
  RESTAURANT: "Restaurant",
  PRIVATE_HOME: "Private home",
  LOFT: "Loft",
  ROOFTOP: "Rooftop",
  STUDIO_KITCHEN: "Studio kitchen",
  GALLERY: "Gallery",
  BAR: "Bar",
  OUTDOOR: "Outdoor",
  SECRET_LOCATION: "Secret location",
};

const STEPS = ["Basics", "Category", "Photos", "Venue", "Dates & price", "Menu", "Itinerary", "Policy", "Review"] as const;
const REVIEW = STEPS.length - 1;
/** Steps whose content a suggested concept fills in (Basics, Category, Dates & price, Menu, Itinerary). */
const SUGGESTED_STEPS = new Set([0, 1, 4, 5, 6]);

type NewVenue = { name: string; type: string; neighborhood: string; addressLine: string; maxCapacity: number; isSecretLocation: boolean };
type Custom = { fullRefundHours: number; partialRefundHours: number | null; partialRefundPercent: number };

export function EventWizard({
  experienceId,
  initial,
  venues,
  policies,
  today,
  sold = {},
  live = false,
  header,
  ai,
}: {
  live?: boolean;
  /** Page header rendered by the wizard so the AI button can sit at its top right. */
  header?: { title: string; description: string };
  /** Aggregated demand for AI-assisted creation (new events only). */
  ai?: { context: DemandContext };
  experienceId?: string;
  initial: EventInput;
  venues: Venue[];
  policies: Policy[];
  today: string;
  sold?: Record<string, number>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [v, setV] = useState<EventInput>(() => ({
    ...initial,
    menuSections: initial.menuSections ?? sectionsFromLegacyMenu(initial.menu),
    menuStatus: initial.menuStatus ?? "FINAL",
    itinerary: initial.itinerary ?? [],
    featuredDishes: initial.featuredDishes ?? [],
  }));
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [hasVenue, setHasVenue] = useState<boolean>(initial.venue.mode !== "tbc");
  const [venueMode, setVenueMode] = useState<"existing" | "new">(initial.venue.mode === "new" || !venues.length ? "new" : "existing");
  const [venueId, setVenueId] = useState(initial.venue.mode === "existing" ? initial.venue.venueId : (venues[0]?.id ?? ""));
  const [newVenue, setNewVenue] = useState<NewVenue>({ name: "", type: "LOFT", neighborhood: "williamsburg", addressLine: "", maxCapacity: 20, isSecretLocation: false });
  const [policyMode, setPolicyMode] = useState<"template" | "custom">(initial.policy.mode);
  const [templateId, setTemplateId] = useState(initial.policy.mode === "template" ? initial.policy.templateId : (policies[0]?.id ?? ""));
  const [custom, setCustom] = useState<Custom>({ fullRefundHours: 72, partialRefundHours: 24, partialRefundPercent: 50 });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [aiApplied, setAiApplied] = useState(false);
  const [aiConfirmed, setAiConfirmed] = useState(false);

  const set = <K extends keyof EventInput>(k: K, value: EventInput[K]) => setV((p) => ({ ...p, [k]: value }));

  const payload = useMemo((): EventInput => {
    const venue: EventInput["venue"] = !hasVenue
      ? { mode: "tbc" }
      : venueMode === "existing"
        ? { mode: "existing", venueId }
        : { mode: "new", ...newVenue, type: newVenue.type as "LOFT" };
    const policy: EventInput["policy"] = policyMode === "template" ? { mode: "template", templateId } : { mode: "custom", ...custom };
    const tags = tagText
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);
    const menuSections = v.menuSections ?? [];
    return { ...v, menu: legacyMenuFromSections(menuSections), tags, venue, policy };
  }, [v, tagText, hasVenue, venueMode, venueId, newVenue, policyMode, templateId, custom]);

  const stepProblems = problemsFor(step, payload);
  const publishBlockers = [
    ...(payload.venue.mode === "tbc" ? ["A confirmed venue (venue requests don't secure one)"] : []),
    ...(payload.sessions.some((s) => s.date >= today) ? [] : ["At least one future date"]),
    ...(payload.photos.length ? [] : ["At least one photo"]),
    ...(payload.menu.length || payload.menuStatus === "TO_BE_ANNOUNCED" ? [] : ["The menu or activities (or mark the menu as to be announced)"]),
    ...menuProblems(payload.menuSections ?? []),
    ...itineraryStepProblems(payload),
    ...(aiApplied && !aiConfirmed ? ["Your confirmation of the suggested details (tick the box below)"] : []),
  ];
  const previewStart = payload.sessions
    .filter((s) => s.date >= today)
    .map((s) => nyDateTime(s.date, ...(s.time.split(":").map(Number) as [number, number])))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  /** Labels of the parts of the form the host has already changed (for the overwrite warning). */
  function filledFields() {
    const changed = (k: keyof EventInput) => JSON.stringify(v[k] ?? null) !== JSON.stringify(initial[k] ?? null);
    const fields: [string, boolean][] = [
      ["title", changed("title")],
      ["summary", changed("summary")],
      ["description", changed("description")],
      ["highlights", changed("highlights")],
      ["category and cuisine", changed("category") || changed("cuisine") || changed("format")],
      ["tags", tagText !== initial.tags.join(", ")],
      ["dates and price", changed("sessions") || changed("ticketPriceDollars") || changed("durationMinutes")],
      ["menu", (v.menuSections?.length ?? 0) > 0],
      ["itinerary", (v.itinerary?.length ?? 0) > 0],
    ];
    return fields.filter(([, on]) => on).map(([label]) => label);
  }

  /** Prefills the form from a suggested concept. Venue, photos and policy are left to the host. */
  function applyConcept(c: EventConcept) {
    const target = DAY_KEYS.indexOf(c.day);
    const from = addIsoDays(today, 14);
    const date = addIsoDays(from, (target - isoWeekday(from) + 7) % 7);
    setV((p) => ({
      ...p,
      title: c.title,
      summary: c.summary,
      description: c.description,
      category: c.category,
      cuisine: c.cuisine,
      format: c.format,
      occasions: c.occasions,
      socialAtmosphere: c.socialAtmosphere,
      durationMinutes: c.durationMinutes,
      ticketPriceDollars: c.price.suggested,
      sessions: [{ date, time: c.startTime, capacity: c.groupSize.max }],
      menuSections: c.menuSections,
      menuStatus: "SUBJECT_TO_CHANGE",
      itinerary: c.itinerary,
      featuredDishes: c.featuredDishes,
    }));
    setTagText(c.tags.join(", "));
    setAiApplied(true);
    setAiConfirmed(false);
    setMessage(null);
    setStep(0);
  }

  function submit(intent: "draft" | "publish") {
    setMessage(null);
    startTransition(async () => {
      const res = await saveEventAction(JSON.stringify({ ...payload, intent }), experienceId);
      if (!res?.ok) {
        setMessage({ ok: false, text: res?.message ?? "Something went wrong." });
        return;
      }
      setMessage({ ok: true, text: res.message });
      router.push(`/host/events?status=${intent === "publish" || live ? "PUBLISHED" : "DRAFT"}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[13rem_1fr]">
      {header && (
        <div className="lg:col-span-2 [&>header]:mb-0">
          <PageHeader
            title={header.title}
            description={header.description}
            actions={
              ai ? (
                <AiEventAssistant
                  context={ai.context}
                  defaults={{ priceMin: Math.max(5, Math.round(v.ticketPriceDollars * 0.7)), priceMax: Math.round(v.ticketPriceDollars * 1.3), capacity: v.sessions[0]?.capacity ?? 12 }}
                  filledFields={filledFields}
                  onUse={applyConcept}
                />
              ) : undefined
            }
          />
        </div>
      )}
      {aiApplied && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 text-sm lg:col-span-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <p>
            <span className="font-medium">Filled in from a suggested concept (rule-based demo generator).</span> Every field stays editable. Steps marked &ldquo;Suggested&rdquo;
            aren&apos;t confirmed yet: check the venue, date and time, ticket price, capacity, menu and cancellation policy before you publish. Nothing has been saved or published.
          </p>
        </div>
      )}
      <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="shrink-0">
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                i === step ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span className={cn("grid size-5 place-items-center rounded-full border text-[11px]", i === step ? "border-background" : "border-current")}>
                {i < step ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              {label}
              {aiApplied && SUGGESTED_STEPS.has(i) && <span className="ml-auto rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] text-brand">Suggested</span>}
            </button>
          </li>
        ))}
      </ol>

      <div className="min-w-0">
        <div className="rounded-2xl border bg-card p-5 shadow-soft sm:p-8">
          <h2 className="mb-6 text-2xl">
            <span className="sr-only">Step {step + 1} of {STEPS.length}: </span>
            {STEPS[step]}
            {aiApplied && SUGGESTED_STEPS.has(step) && (
              <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 align-middle font-sans text-xs text-brand">
                <Sparkles className="size-3" aria-hidden /> Suggested, please confirm
              </span>
            )}
          </h2>

          {step === 0 && (
            <div className="space-y-5">
              <Field label="Event title" htmlFor="title" hint="4–90 characters">
                <input id="title" className={inputClass} value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={90} />
              </Field>
              <Field label="One-line summary" htmlFor="summary" hint="Shown on cards (10–160 characters)">
                <input id="summary" className={inputClass} value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={160} />
              </Field>
              <Field label="Description" htmlFor="description" hint="What happens, who it's for, what makes it unique (30+ characters)">
                <textarea id="description" rows={6} className={inputClass} value={v.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <ListEditor label="What makes it special" placeholder="e.g. Eight courses served at the counter" items={v.highlights} max={6} onChange={(x) => set("highlights", x)} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <fieldset>
                <legend className="mb-3 font-medium">Category</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CATEGORIES.map((c) => (
                    <ChoiceCard key={c.id} type="radio" name="category" value={c.id} checked={v.category === c.id} onChange={() => set("category", c.id)} title={c.name} hint={c.description} icon={<c.icon className="size-5" />} />
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Cuisine" htmlFor="cuisine">
                  <select id="cuisine" className={inputClass} value={v.cuisine} onChange={(e) => set("cuisine", e.target.value as EventInput["cuisine"])}>
                    {CUISINES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Format" htmlFor="format">
                  <select id="format" className={inputClass} value={v.format} onChange={(e) => set("format", e.target.value as EventInput["format"])}>
                    {Object.entries(FORMATS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tags" htmlFor="tags" hint="Comma-separated, up to 8" className="sm:col-span-2">
                  <input id="tags" className={inputClass} value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="omakase, seasonal, natural wine" />
                </Field>
              </div>
              <fieldset>
                <legend className="mb-3 font-medium">Social atmosphere</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(ATMOSPHERES).map(([k, a]) => (
                    <ChoiceCard key={k} type="radio" name="atmosphere" value={k} checked={v.socialAtmosphere === k} onChange={() => set("socialAtmosphere", k as EventInput["socialAtmosphere"])} title={a.label} hint={a.hint} />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-3 font-medium">Good for</legend>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => (
                    <Toggle key={o.key} label={o.label} checked={v.occasions.includes(o.key)} onChange={(on) => set("occasions", on ? [...v.occasions, o.key] : v.occasions.filter((x) => x !== o.key))} />
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 2 && <PhotosStep photos={v.photos} onChange={(p) => set("photos", p)} />}

          {step === 3 && (
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-3 font-medium">Do you have a venue for this event?</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceCard type="radio" name="hasVenue" value="yes" checked={hasVenue} onChange={() => setHasVenue(true)} title="Yes, I have a venue" hint="Choose a saved venue or add a new one" />
                  <ChoiceCard type="radio" name="hasVenue" value="no" checked={!hasVenue} onChange={() => setHasVenue(false)} title="Not yet" hint="Save as a draft and request venue assistance" />
                </div>
              </fieldset>
              {hasVenue ? (
                <div className="space-y-5">
                  {venues.length > 0 && (
                    <div className="flex gap-2">
                      <Toggle label="Saved venue" checked={venueMode === "existing"} onChange={() => setVenueMode("existing")} />
                      <Toggle label="Add a new venue" checked={venueMode === "new"} onChange={() => setVenueMode("new")} />
                    </div>
                  )}
                  {venueMode === "existing" && venues.length > 0 ? (
                    <Field label="Venue" htmlFor="venueId">
                      <select id="venueId" className={inputClass} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                        {venues.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}, {x.neighborhood} (up to {x.maxCapacity})
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Venue name" htmlFor="vname">
                        <input id="vname" className={inputClass} value={newVenue.name} onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })} />
                      </Field>
                      <Field label="Venue type" htmlFor="vtype">
                        <select id="vtype" className={inputClass} value={newVenue.type} onChange={(e) => setNewVenue({ ...newVenue, type: e.target.value })}>
                          {Object.entries(VENUE_TYPES).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Neighborhood" htmlFor="vhood">
                        <select id="vhood" className={inputClass} value={newVenue.neighborhood} onChange={(e) => setNewVenue({ ...newVenue, neighborhood: e.target.value })}>
                          <NeighborhoodOptions />
                        </select>
                      </Field>
                      <Field label="Maximum guests" htmlFor="vcap">
                        <input id="vcap" type="number" min={1} className={inputClass} value={newVenue.maxCapacity} onChange={(e) => setNewVenue({ ...newVenue, maxCapacity: Number(e.target.value) })} />
                      </Field>
                      <Field label="Address" htmlFor="vaddr" hint="Shared with booked guests only" className="sm:col-span-2">
                        <input id="vaddr" className={inputClass} value={newVenue.addressLine} onChange={(e) => setNewVenue({ ...newVenue, addressLine: e.target.value })} />
                      </Field>
                      <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input type="checkbox" checked={newVenue.isSecretLocation} onChange={(e) => setNewVenue({ ...newVenue, isSecretLocation: e.target.checked })} className="size-4 accent-[var(--brand)]" />
                        Secret location (address revealed 24 hours before)
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/40 p-5 text-sm">
                  <p className="font-medium">Tastable has not secured a venue for you.</p>
                  <p className="mt-1 text-muted-foreground">
                    You can save this event as a draft now. Publishing needs a confirmed venue. You can also send a venue assistance request describing what you need; it&rsquo;s a request only and
                    in this prototype no one will follow up.
                  </p>
                  <a href="/host/venue-request" target="_blank" rel="noopener" className="mt-3 inline-block text-brand underline">
                    Open the venue assistance form (new tab)
                  </a>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Ticket price (USD)" htmlFor="price" hint="Per guest, before the guest service fee">
                  <input id="price" type="number" min={5} step={1} className={inputClass} value={v.ticketPriceDollars} onChange={(e) => set("ticketPriceDollars", Number(e.target.value))} />
                </Field>
                <Field label="Duration (minutes)" htmlFor="duration">
                  <input id="duration" type="number" min={30} step={15} className={inputClass} value={v.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} />
                </Field>
              </div>
              <div>
                <h3 className="mb-3 font-medium">Dates, times and capacity</h3>
                <ul className="space-y-3">
                  {v.sessions.map((s, i) => {
                    const soldHere = s.id ? (sold[s.id] ?? 0) : 0;
                    const update = (patch: Partial<typeof s>) => set("sessions", v.sessions.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <li key={s.id ?? `new-${i}`} className="grid grid-cols-2 items-end gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
                        <Field label="Date" htmlFor={`d${i}`}>
                          <input id={`d${i}`} type="date" min={today} className={inputClass} value={s.date} onChange={(e) => update({ date: e.target.value })} />
                        </Field>
                        <Field label="Start" htmlFor={`t${i}`}>
                          <input id={`t${i}`} type="time" className={inputClass} value={s.time} onChange={(e) => update({ time: e.target.value })} />
                        </Field>
                        <Field label="Capacity" htmlFor={`c${i}`} hint={soldHere ? `${soldHere} sold` : undefined}>
                          <input id={`c${i}`} type="number" min={Math.max(1, soldHere)} className={inputClass} value={s.capacity} onChange={(e) => update({ capacity: Number(e.target.value) })} />
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={soldHere > 0}
                          title={soldHere > 0 ? "Dates with bookings can't be removed" : "Remove date"}
                          aria-label={`Remove date ${i + 1}`}
                          onClick={() => set("sessions", v.sessions.filter((_, j) => j !== i))}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={v.sessions.length >= 20}
                  onClick={() => {
                    const last = v.sessions[v.sessions.length - 1];
                    set("sessions", [...v.sessions, { date: last?.date ?? today, time: last?.time ?? "19:00", capacity: last?.capacity ?? 12 }]);
                  }}
                >
                  <Plus aria-hidden /> Add a date
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8">
              <MenuStatusField value={v.menuStatus ?? "FINAL"} onChange={(st) => set("menuStatus", st)} />
              <MenuSectionsEditor sections={v.menuSections ?? []} category={v.category} onChange={(m) => set("menuSections", m)} />
              <FeaturedDishesEditor dishes={v.featuredDishes ?? []} onChange={(d) => set("featuredDishes", d)} />
              <ListEditor label="What's included" placeholder="e.g. Natural wine pairing" items={v.inclusions} max={10} onChange={(x) => set("inclusions", x)} />
              <fieldset>
                <legend className="mb-3 font-medium">Dietary options you can accommodate</legend>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((d) => (
                    <Toggle key={d.key} label={d.label} checked={v.dietaryOptions.includes(d.key)} onChange={(on) => set("dietaryOptions", on ? [...v.dietaryOptions, d.key] : v.dietaryOptions.filter((x) => x !== d.key))} />
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 6 && <ItineraryEditor steps={v.itinerary ?? []} durationMinutes={v.durationMinutes} onChange={(st) => set("itinerary", st)} />}

          {step === 7 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">These terms apply to every booking for this event. Guests see them before paying and see the exact refund before cancelling.</p>
              <div className="flex gap-2">
                <Toggle label="Use a template" checked={policyMode === "template"} onChange={() => setPolicyMode("template")} />
                <Toggle label="Custom terms" checked={policyMode === "custom"} onChange={() => setPolicyMode("custom")} />
              </div>
              {policyMode === "template" ? (
                <div className="grid gap-3">
                  {policies.map((p) => (
                    <ChoiceCard key={p.id} type="radio" name="policy" value={p.id} checked={templateId === p.id} onChange={() => setTemplateId(p.id)} title={p.name} hint={p.summary} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Full refund if cancelled more than (hours before)" htmlFor="full">
                    <input id="full" type="number" min={0} className={inputClass} value={custom.fullRefundHours} onChange={(e) => setCustom({ ...custom, fullRefundHours: Number(e.target.value) })} />
                  </Field>
                  <Field label="Partial refund window ends at (hours before)" htmlFor="partialH" hint="Leave empty for no partial refund">
                    <input
                      id="partialH"
                      type="number"
                      min={0}
                      className={inputClass}
                      value={custom.partialRefundHours ?? ""}
                      onChange={(e) => setCustom({ ...custom, partialRefundHours: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Partial refund (%)" htmlFor="partialP">
                    <input id="partialP" type="number" min={0} max={100} className={inputClass} value={custom.partialRefundPercent} onChange={(e) => setCustom({ ...custom, partialRefundPercent: Number(e.target.value) })} />
                  </Field>
                  <p className="text-sm text-muted-foreground sm:col-span-3">
                    Preview: full refund more than {custom.fullRefundHours}h before
                    {custom.partialRefundHours !== null && custom.partialRefundPercent > 0
                      ? `; ${custom.partialRefundPercent}% between ${custom.partialRefundHours}h and ${custom.fullRefundHours}h; no refund within ${custom.partialRefundHours}h.`
                      : `; no refund within ${custom.fullRefundHours}h.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === REVIEW && (
            <div className="space-y-6">
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Summary label="Title" value={payload.title || "—"} />
                <Summary label="Category" value={CATEGORIES.find((c) => c.id === payload.category)?.name ?? "—"} />
                <Summary label="Cuisine" value={CUISINES.find((c) => c.key === payload.cuisine)?.label ?? "—"} />
                <Summary label="Price" value={`$${payload.ticketPriceDollars} per guest`} />
                <Summary label="Dates" value={`${payload.sessions.length} date(s)`} />
                <Summary label="Photos" value={`${payload.photos.length}`} />
                <Summary label="Venue" value={payload.venue.mode === "tbc" ? "To be confirmed" : payload.venue.mode === "new" ? `New: ${newVenue.name || "unnamed"}` : (venues.find((x) => x.id === venueId)?.name ?? "—")} />
                <Summary label="Menu" value={payload.menuStatus === "TO_BE_ANNOUNCED" ? "To be announced" : `${payload.menu.length} item(s)${payload.menuStatus === "SUBJECT_TO_CHANGE" ? ", subject to change" : ""}`} />
                <Summary label="Itinerary" value={`${payload.itinerary?.length ?? 0} step(s)`} />
              </dl>
              <section aria-labelledby="preview-heading" className="rounded-2xl border bg-background p-5">
                <p className="eyebrow">Preview</p>
                <h3 id="preview-heading" className="mb-1 text-xl">How guests will see it</h3>
                <p className="mb-5 text-sm text-muted-foreground">Nothing is published until you choose Publish.</p>
                <h4 className="mb-3 font-display text-lg">{menuHeading(payload.category)}</h4>
                <EventMenu menu={{ status: payload.menuStatus ?? "FINAL", sections: payload.menuSections ?? [] }} />
                {(payload.itinerary?.length ?? 0) > 0 && (
                  <>
                    <h4 className="mt-8 mb-3 font-display text-lg">Your Experience</h4>
                    <ExperienceTimeline steps={(payload.itinerary ?? []).map((st) => ({ ...st, durationMinutes: stepDuration(st) }))} startsAt={previewStart ?? null} />
                  </>
                )}
              </section>
              {aiApplied && (
                <label className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
                  <input type="checkbox" checked={aiConfirmed} onChange={(e) => setAiConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
                  <span>
                    I&apos;ve confirmed the venue, date and time, ticket price, capacity, menu and cancellation policy myself. The suggested concept was only a starting point.
                  </span>
                </label>
              )}
              {publishBlockers.length > 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4 text-brand" aria-hidden /> Before you can publish, add:
                  </p>
                  <ul className="mt-2 list-disc pl-6 text-muted-foreground">
                    {publishBlockers.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-muted-foreground">You can save a draft any time.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ready to publish. Published events appear in guest discovery immediately.</p>
              )}
            </div>
          )}

          {stepProblems.length > 0 && step < REVIEW && (
            <ul className="mt-6 space-y-1 text-sm text-muted-foreground">
              {stepProblems.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <AlertTriangle className="size-3.5 text-brand" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>

        {message && (
          <p role={message.ok ? "status" : "alert"} className={cn("mt-4 rounded-xl px-4 py-3 text-sm", message.ok ? "bg-[#e5eddc] text-[#3f5130]" : "bg-destructive/10 text-destructive")}>
            {message.text}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft aria-hidden /> Back
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => submit("draft")} disabled={pending}>
              {pending ? "Saving…" : live ? "Save changes" : "Save draft"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" variant="default" onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button type="button" variant="brand" onClick={() => submit("publish")} disabled={pending || publishBlockers.length > 0}>
                {live ? "Save and keep published" : "Publish event"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function problemsFor(step: number, v: EventInput): string[] {
  const p: string[] = [];
  if (step === 0) {
    if (v.title.trim().length < 4) p.push("Title needs at least 4 characters.");
    if (v.summary.trim().length < 10) p.push("Summary needs at least 10 characters.");
    if (v.description.trim().length < 30) p.push("Description needs at least 30 characters.");
  }
  if (step === 3 && v.venue.mode === "new" && (!v.venue.name || !v.venue.addressLine)) p.push("Add the venue name and address.");
  if (step === 4) {
    if (!v.sessions.length) p.push("Add at least one date.");
    if (v.ticketPriceDollars < 5) p.push("Minimum ticket price is $5.");
  }
  if (step === 5) p.push(...menuProblems(v.menuSections ?? []));
  if (step === 6) p.push(...itineraryStepProblems(v));
  return p;
}

function itineraryStepProblems(v: EventInput) {
  const steps = v.itinerary ?? [];
  const p = steps.flatMap((st, i) => [
    ...(st.title.trim() ? [] : [`Give step ${i + 1} a title.`]),
    ...(st.endOffsetMinutes !== null && st.endOffsetMinutes <= st.startOffsetMinutes ? [`Step ${i + 1} must end after it starts.`] : []),
  ]);
  return [...p, ...itineraryProblems(steps, v.durationMinutes)];
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
        checked ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/40",
      )}
    >
      {label}
    </button>
  );
}

function ListEditor({ label, placeholder, items, max, onChange }: { label: string; placeholder: string; items: string[]; max: number; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const id = label.toLowerCase().replace(/\W+/g, "-");
  const add = () => {
    if (!draft.trim() || items.length >= max) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  };
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label} <span className="font-normal text-muted-foreground">(up to {max})</span>
      </label>
      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
              {it}
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${it}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          className={inputClass}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={items.length >= max}>
          Add
        </Button>
      </div>
    </div>
  );
}

function PhotosStep({ photos, onChange }: { photos: EventInput["photos"]; onChange: (p: EventInput["photos"]) => void }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const full = photos.length >= 6;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add up to six photos by URL, or pick from the licensed placeholder library. Only use images you have the rights to. Describe each one for screen readers.
      </p>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={`${p.url}-${i}`} className="overflow-hidden rounded-xl border bg-background">
              <Photo src={p.url} alt={p.alt} theme="terracotta" sizes="200px" className="aspect-[4/3] w-full" />
              <div className="flex items-start justify-between gap-2 p-2 text-xs">
                <span className="line-clamp-2">{i === 0 ? <strong>Cover · </strong> : null}{p.alt}</span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(photos.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-[2fr_2fr_auto] sm:items-end">
        <Field label="Photo URL (https)" htmlFor="purl">
          <input id="purl" className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Description" htmlFor="palt">
          <input id="palt" className={inputClass} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="What's in the photo" />
        </Field>
        <Button
          type="button"
          variant="outline"
          disabled={full || !/^https:\/\/\S+$/.test(url) || alt.trim().length < 3}
          onClick={() => {
            onChange([...photos, { url, alt: alt.trim() }]);
            setUrl("");
            setAlt("");
          }}
        >
          <ImagePlus aria-hidden /> Add
        </Button>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium">Placeholder library (Unsplash License)</h3>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Object.entries(PHOTOS).map(([key, p]) => {
            const added = photos.some((x) => x.url === p.src);
            return (
              <li key={key}>
                <button
                  type="button"
                  disabled={added || full}
                  onClick={() => onChange([...photos, { url: p.src, alt: p.alt }])}
                  className="group relative block w-full overflow-hidden rounded-lg border focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-40"
                  aria-label={`Add photo: ${p.alt}`}
                >
                  <Photo src={p.src} alt="" theme="terracotta" sizes="120px" className="aspect-square w-full" />
                  {added && <Check className="absolute top-1 right-1 size-4 rounded-full bg-brand p-0.5 text-brand-foreground" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
