"use client";

import { ArrowDown, ArrowUp, ImagePlus, ListOrdered, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";

import { inputClass } from "@/components/host/field";
import { Button } from "@/components/ui/button";
import { DISHES } from "@/lib/domain/dishes";
import { itineraryProblems, MENU_STATUSES, type ItineraryStepInput, type MenuSectionInput } from "@/lib/domain/event-content";
import { DIETARY_OPTIONS } from "@/lib/domain/taxonomy";
import { cn } from "@/lib/utils";

type MenuStatus = keyof typeof MENU_STATUSES;
type Item = MenuSectionInput["items"][number];

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

function RowActions({ label, index, count, onMove, onRemove }: { label: string; index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index - 1)}>
        <ArrowUp aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}>
        <ArrowDown aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${label}`} onClick={onRemove}>
        <Trash2 aria-hidden />
      </Button>
    </div>
  );
}

/** Problems that block saving the menu step (the server applies the same rules). */
export function menuProblems(sections: MenuSectionInput[]) {
  const p: string[] = [];
  sections.forEach((s, i) => {
    if (!s.title.trim()) p.push(`Name course ${i + 1}.`);
    if (!s.items.length) p.push(`Add at least one item to ${s.title.trim() || `course ${i + 1}`}.`);
    s.items.forEach((it, j) => {
      if (!it.name.trim()) p.push(`Name item ${j + 1} in ${s.title.trim() || `course ${i + 1}`}.`);
      if (it.imageUrl !== undefined && !/^https:\/\/\S+$/.test(it.imageUrl)) p.push(`Use a full https URL for the photo of ${it.name || `item ${j + 1}`}.`);
    });
  });
  return p;
}

export function MenuStatusField({ value, onChange }: { value: MenuStatus; onChange: (s: MenuStatus) => void }) {
  const hints: Record<MenuStatus, string> = {
    FINAL: "Guests see exactly this menu.",
    SUBJECT_TO_CHANGE: "Shows a note that dishes may change with the season.",
    TO_BE_ANNOUNCED: "Hides the dishes and shows “Menu to be announced”.",
  };
  return (
    <fieldset>
      <legend className="mb-2 font-medium">Menu status</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(MENU_STATUSES) as MenuStatus[]).map((k) => (
          <label key={k} className={cn("flex cursor-pointer gap-2 rounded-xl border p-3 text-sm", value === k ? "border-foreground bg-muted/40" : "hover:border-foreground/40")}>
            <input type="radio" name="menu-status" className="mt-1 accent-[var(--color-brand)]" checked={value === k} onChange={() => onChange(k)} />
            <span>
              <span className="block font-medium">{MENU_STATUSES[k]}</span>
              <span className="text-muted-foreground">{hints[k]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ItemEditor({ item, label, onChange }: { item: Item; label: string; onChange: (i: Item) => void }) {
  const [showPhoto, setShowPhoto] = useState(item.imageUrl !== undefined);
  return (
    <div className="grid flex-1 gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label={`${label} dish name`} className={inputClass} value={item.name} placeholder="Dish or activity, e.g. Hand-rolled tagliatelle" onChange={(e) => onChange({ ...item, name: e.target.value })} />
        <input aria-label={`${label} description`} className={inputClass} value={item.description} placeholder="Short description (optional)" onChange={(e) => onChange({ ...item, description: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label} dietary labels`}>
        {DIETARY_OPTIONS.map((d) => {
          const on = item.dietaryTags.includes(d.key);
          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ ...item, dietaryTags: on ? item.dietaryTags.filter((t) => t !== d.key) : [...item.dietaryTags, d.key] })}
              className={cn("rounded-full border px-2.5 py-0.5 text-xs", on ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/40")}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      {showPhoto ? (
        <div className="grid gap-2 sm:grid-cols-[2fr_2fr_auto]">
          <input aria-label={`${label} photo URL`} className={inputClass} value={item.imageUrl ?? ""} placeholder="https://" onChange={(e) => onChange({ ...item, imageUrl: e.target.value })} />
          <input aria-label={`${label} photo description`} className={inputClass} value={item.imageAlt ?? ""} placeholder="What's in the photo" onChange={(e) => onChange({ ...item, imageAlt: e.target.value })} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${label} photo`}
            onClick={() => {
              setShowPhoto(false);
              onChange({ name: item.name, description: item.description, dietaryTags: item.dietaryTags, ...(item.dish ? { dish: item.dish } : {}) });
            }}
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : (
        <button type="button" className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setShowPhoto(true)}>
          <ImagePlus className="size-3.5" aria-hidden /> Add a photo (optional)
        </button>
      )}
    </div>
  );
}

/** Courses with dishes: add, edit, remove and reorder both courses and the items inside them. */
export function MenuSectionsEditor({ sections, onChange, category }: { sections: MenuSectionInput[]; onChange: (s: MenuSectionInput[]) => void; category: string }) {
  const isClass = category === "COOKING_CLASS_WORKSHOP";
  const blankItem: Item = { name: "", description: "", dietaryTags: [] };
  const setSection = (i: number, s: MenuSectionInput) => onChange(sections.map((x, j) => (j === i ? s : x)));
  return (
    <div>
      <h3 className="font-medium">{isClass ? "What guests will cook" : "Menu"}</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Group dishes by course{isClass ? " or by part of the class" : ""}. Guests see dietary labels next to each dish.
      </p>
      <ol className="space-y-4">
        {sections.map((s, i) => {
          const label = s.title.trim() || `course ${i + 1}`;
          return (
            <li key={i} className="rounded-2xl border p-4">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <input aria-label={`Course ${i + 1} name`} className={cn(inputClass, "font-medium")} value={s.title} placeholder={isClass ? "e.g. What you'll make" : "e.g. Starter"} onChange={(e) => setSection(i, { ...s, title: e.target.value })} />
                  <input aria-label={`Course ${i + 1} note`} className={inputClass} value={s.description} placeholder="Note (optional)" onChange={(e) => setSection(i, { ...s, description: e.target.value })} />
                </div>
                <RowActions label={`course ${label}`} index={i} count={sections.length} onMove={(to) => onChange(move(sections, i, to))} onRemove={() => onChange(sections.filter((_, j) => j !== i))} />
              </div>
              <ol className="mt-3 space-y-3 border-l-2 border-muted pl-3">
                {s.items.map((it, j) => {
                  const itemLabel = `${label} item ${j + 1}`;
                  return (
                    <li key={j} className="flex items-start gap-2">
                      <ItemEditor item={it} label={itemLabel} onChange={(next) => setSection(i, { ...s, items: s.items.map((x, k) => (k === j ? next : x)) })} />
                      <RowActions
                        label={itemLabel}
                        index={j}
                        count={s.items.length}
                        onMove={(to) => setSection(i, { ...s, items: move(s.items, j, to) })}
                        onRemove={() => setSection(i, { ...s, items: s.items.filter((_, k) => k !== j) })}
                      />
                    </li>
                  );
                })}
              </ol>
              <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={s.items.length >= 20} onClick={() => setSection(i, { ...s, items: [...s.items, blankItem] })}>
                <Plus aria-hidden /> Add a dish to {label}
              </Button>
            </li>
          );
        })}
      </ol>
      <Button type="button" variant="outline" size="sm" className="mt-3" disabled={sections.length >= 12} onClick={() => onChange([...sections, { title: "", description: "", items: [blankItem] }])}>
        <Plus aria-hidden /> Add a course
      </Button>
    </div>
  );
}

/** Featured dishes guests can match on ("Featuring one of your favorite dishes"). */
export function FeaturedDishesEditor({ dishes, onChange }: { dishes: string[]; onChange: (d: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const add = () => {
    const d = draft.trim();
    if (!d || dishes.length >= 8 || dishes.some((x) => x.toLowerCase() === d.toLowerCase())) return;
    onChange([...dishes, d]);
    setDraft("");
  };
  return (
    <div>
      <label htmlFor={`${listId}-input`} className="mb-1 block font-medium">
        Featured dishes <span className="font-normal text-muted-foreground">(up to 8)</span>
      </label>
      <p className="mb-2 text-sm text-muted-foreground">Used to match guests who list these as favorites. Pick from the list or type your own.</p>
      {dishes.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {dishes.map((d) => (
            <li key={d} className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm">
              {d}
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove featured dish ${d}`} onClick={() => onChange(dishes.filter((x) => x !== d))}>
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={`${listId}-input`}
          list={listId}
          className={inputClass}
          value={draft}
          placeholder="e.g. Pizza"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <datalist id={listId}>
          {DISHES.map((d) => (
            <option key={d.key} value={d.label} />
          ))}
        </datalist>
        <Button type="button" variant="outline" onClick={add} disabled={dishes.length >= 8}>
          Add
        </Button>
      </div>
    </div>
  );
}

function minutesValue(v: string) {
  return v === "" ? null : Math.max(0, Math.round(Number(v)));
}

/** Itinerary steps as minutes from the start, with live chronology checks. */
export function ItineraryEditor({ steps, onChange, durationMinutes }: { steps: ItineraryStepInput[]; onChange: (s: ItineraryStepInput[]) => void; durationMinutes: number }) {
  const problems = itineraryProblems(steps, durationMinutes);
  const setStep = (i: number, s: ItineraryStepInput) => onChange(steps.map((x, j) => (j === i ? s : x)));
  const lastEnd = steps.length ? (steps.at(-1)!.endOffsetMinutes ?? steps.at(-1)!.startOffsetMinutes + 15) : 0;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Your Experience</h3>
        <p className="text-sm text-muted-foreground">
          The run of show, in minutes from the start (this event lasts {durationMinutes} minutes). Guests see clock times for the date they pick, in New York time.
        </p>
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => {
          const label = `step ${i + 1}`;
          return (
            <li key={i} className="flex items-start gap-2 rounded-2xl border p-4">
              <div className="grid flex-1 gap-2">
                <div className="grid gap-2 sm:grid-cols-[7rem_7rem_1fr]">
                  <label className="text-xs text-muted-foreground">
                    Starts (min)
                    <input type="number" min={0} step={5} aria-label={`Step ${i + 1} starts, minutes after start`} className={inputClass} value={s.startOffsetMinutes} onChange={(e) => setStep(i, { ...s, startOffsetMinutes: minutesValue(e.target.value) ?? 0 })} />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Ends (min)
                    <input
                      type="number"
                      min={0}
                      step={5}
                      aria-label={`Step ${i + 1} ends, minutes after start`}
                      className={inputClass}
                      value={s.endOffsetMinutes ?? ""}
                      placeholder="Optional"
                      onChange={(e) => setStep(i, { ...s, endOffsetMinutes: minutesValue(e.target.value) })}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Title
                    <input aria-label={`Step ${i + 1} title`} className={inputClass} value={s.title} placeholder="e.g. Welcome drinks" onChange={(e) => setStep(i, { ...s, title: e.target.value })} />
                  </label>
                </div>
                <input aria-label={`Step ${i + 1} description`} className={inputClass} value={s.description} placeholder="What happens (optional)" onChange={(e) => setStep(i, { ...s, description: e.target.value })} />
              </div>
              <RowActions label={label} index={i} count={steps.length} onMove={(to) => onChange(move(steps, i, to))} onRemove={() => onChange(steps.filter((_, j) => j !== i))} />
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={steps.length >= 20}
          onClick={() => onChange([...steps, { startOffsetMinutes: Math.min(lastEnd, durationMinutes), endOffsetMinutes: null, title: "", description: "" }])}
        >
          <Plus aria-hidden /> Add a step
        </Button>
        {steps.length > 1 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...steps].sort((a, b) => a.startOffsetMinutes - b.startOffsetMinutes))}>
            <ListOrdered aria-hidden /> Sort by start time
          </Button>
        )}
      </div>
      {problems.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" aria-live="polite">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
