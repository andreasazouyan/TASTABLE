"use client";

import { useId, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import { ChoiceCard } from "@/components/onboarding/choice-card";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/domain/categories";
import { DISHES, dishLabel, normalizeDish, normalizeDishText, MAX_FAVORITE_DISHES } from "@/lib/domain/dishes";
import { NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import {
  ATTENDANCE,
  DAYS,
  MAX_PREFERRED_CATEGORIES,
  PREFERENCE_CUISINES,
  SUGGESTED_DISHES,
  TIME_SLOT_PREFS,
  TRAVEL_TIMES,
  toggleCuisine,
} from "@/lib/domain/preferences";
import type { DishChoice, GuestPrefsValue } from "@/lib/domain/preferences-value";
import type { GuestPreferencesPatch } from "@/lib/validation/preferences";
import { cn } from "@/lib/utils";

/**
 * Selection components shared by the six-page onboarding and the profile "My Preferences" editor,
 * so both use the exact same options and labels.
 */
export type { DishChoice, GuestPrefsValue } from "@/lib/domain/preferences-value";
type FieldProps = { value: GuestPrefsValue; onChange: (v: GuestPrefsValue) => void };

const toggle = (list: string[], key: string, on: boolean) => (on ? Array.from(new Set([...list, key])) : list.filter((x) => x !== key));

function Chip({ checked, children, ...input }: { checked: boolean; children: React.ReactNode } & React.ComponentProps<"input">) {
  return (
    <label
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40",
        checked ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/30",
      )}
    >
      <input {...input} checked={checked} className="sr-only" />
      {children}
    </label>
  );
}

// ─── Page 1 ──────────────────────────────────────────────────────────────────

export function NeighborhoodField({ value, onChange }: FieldProps) {
  const [query, setQuery] = useState("");
  const id = useId();
  const q = normalizeDishText(query);
  const matches = NEIGHBORHOODS.filter((n) => !q || normalizeDishText(`${n.name} ${n.borough}`).includes(q));
  const boroughs = Array.from(new Set(matches.map((n) => n.borough)));
  const selected = NEIGHBORHOODS.find((n) => n.key === value.locationKey);
  return (
    <fieldset>
      <legend className="sr-only">NYC neighborhood</legend>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id={id} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search neighborhoods" aria-label="Search neighborhoods" className="pl-9" />
      </div>
      {selected && (
        <p className="mb-3 text-sm" aria-live="polite">
          Selected: <strong>{selected.name}</strong>
        </p>
      )}
      <div className="space-y-4">
        {boroughs.map((b) => (
          <div key={b} role="group" aria-label={b}>
            <p className="mb-2 text-sm font-medium text-muted-foreground">{b}</p>
            <div className="flex flex-wrap gap-2">
              {matches
                .filter((n) => n.borough === b)
                .map((n) => (
                  <Chip key={n.key} type="radio" name="neighborhood" value={n.key} checked={value.locationKey === n.key} onChange={() => onChange({ ...value, locationKey: n.key })}>
                    {n.name}
                  </Chip>
                ))}
            </div>
          </div>
        ))}
        {!matches.length && <p className="text-sm text-muted-foreground">No neighborhood matches &ldquo;{query}&rdquo;.</p>}
      </div>
    </fieldset>
  );
}

export function TravelTimeField({ value, onChange }: FieldProps) {
  return (
    <fieldset>
      <legend className="mb-1 font-display text-xl">How long are you willing to travel?</legend>
      <p className="mb-4 text-sm text-muted-foreground">Your answer, not a routing estimate: we don&apos;t calculate exact journey times.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {TRAVEL_TIMES.map((t) => (
          <ChoiceCard
            key={t.minutes}
            type="radio"
            name="maxTravelMinutes"
            value={String(t.minutes)}
            checked={value.maxTravelMinutes === t.minutes}
            onChange={() => onChange({ ...value, maxTravelMinutes: t.minutes })}
            title={t.label}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ─── Page 2 ──────────────────────────────────────────────────────────────────

export function DaysField({ value, onChange }: FieldProps) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-xl">Days</legend>
      <div className="flex flex-wrap gap-2">
        {[...DAYS.slice(1), DAYS[0]].map((d) => (
          <Chip
            key={d.key}
            type="checkbox"
            name="preferredDays"
            value={d.key}
            checked={value.preferredDays.includes(d.key)}
            onChange={(e) => onChange({ ...value, preferredDays: toggle(value.preferredDays, d.key, e.target.checked) })}
          >
            {d.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function TimeSlotsField({ value, onChange }: FieldProps) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-xl">Time slots</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TIME_SLOT_PREFS.map((s) => (
          <ChoiceCard
            key={s.key}
            type="checkbox"
            name="preferredTimes"
            value={s.key}
            checked={value.preferredTimes.includes(s.key)}
            onChange={(on) => onChange({ ...value, preferredTimes: toggle(value.preferredTimes, s.key, on) })}
            title={s.label}
            hint={s.hint}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ─── Page 3 ──────────────────────────────────────────────────────────────────

export function AttendanceField({ value, onChange }: FieldProps) {
  return (
    <fieldset>
      <legend className="sr-only">Social preference</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(ATTENDANCE) as (keyof typeof ATTENDANCE)[]).map((k) => (
          <ChoiceCard
            key={k}
            type="radio"
            name="attendancePreference"
            value={k}
            checked={value.attendancePreference === k}
            onChange={() => onChange({ ...value, attendancePreference: k })}
            title={ATTENDANCE[k].label}
            hint={ATTENDANCE[k].hint}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ─── Page 4 ──────────────────────────────────────────────────────────────────

/** Exact card copy from the onboarding brief. */
export const CATEGORY_CARD_HINTS: Record<string, string> = {
  SUPPER_CLUB_PRIVATE_DINING: "Intimate dinners and chef's tables",
  COOKING_CLASS_WORKSHOP: "Get hands-on and learn something new",
  POPUP_EXCLUSIVE: "Discover limited-edition culinary events",
  SOCIAL_CULINARY: "Connect with people over great food",
};

export function CategoriesField({ value, onChange }: FieldProps) {
  const count = value.categories.length;
  const full = count >= MAX_PREFERRED_CATEGORIES;
  return (
    <fieldset>
      <legend className="sr-only">Experience categories</legend>
      <p className={cn("mb-4 text-sm font-medium", count > MAX_PREFERRED_CATEGORIES && "text-destructive")} aria-live="polite">
        {count} of {MAX_PREFERRED_CATEGORIES} selected
        {count > MAX_PREFERRED_CATEGORIES && ": please remove one"}
        {count === MAX_PREFERRED_CATEGORIES && " (deselect one to choose another)"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <ChoiceCard
              key={c.id}
              type="checkbox"
              name="categories"
              value={c.id}
              checked={value.categories.includes(c.id)}
              disabled={full}
              onChange={(on) => onChange({ ...value, categories: toggle(value.categories, c.id, on) })}
              title={c.name}
              hint={CATEGORY_CARD_HINTS[c.id]}
              icon={<Icon className="size-5" aria-hidden />}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── Page 5 ──────────────────────────────────────────────────────────────────

export function CuisinesField({ value, onChange }: FieldProps) {
  return (
    <fieldset>
      <legend className="sr-only">Cuisines</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PREFERENCE_CUISINES.map((c) => (
          <ChoiceCard
            key={c.key}
            type="checkbox"
            name="cuisines"
            value={c.key}
            checked={value.cuisines.includes(c.key)}
            onChange={(on) => onChange({ ...value, cuisines: toggleCuisine(value.cuisines, c.key, on) })}
            title={c.label}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ─── Page 6 ──────────────────────────────────────────────────────────────────

export function DishesField({ value, onChange }: FieldProps) {
  const [query, setQuery] = useState("");
  const id = useId();
  const selectedKeys = new Set(value.favoriteDishes.map((d) => d.key));
  const full = value.favoriteDishes.length >= MAX_FAVORITE_DISHES;
  const q = normalizeDishText(query);
  const suggestions = useMemo(() => {
    if (!q) return SUGGESTED_DISHES.map((k) => DISHES.find((d) => d.key === k)!).filter(Boolean);
    return DISHES.filter((d) => [d.label, ...(d.aliases ?? [])].some((t) => normalizeDishText(t).includes(q))).slice(0, 16);
  }, [q]);
  const normalizedQuery = q ? normalizeDish({ custom: query }) : null;
  const canAddCustom = !!normalizedQuery && normalizedQuery.isCustom && !selectedKeys.has(normalizedQuery.dishKey);

  const add = (d: DishChoice) => {
    if (full || selectedKeys.has(d.key)) return;
    onChange({ ...value, favoriteDishes: [...value.favoriteDishes, d] });
  };
  const remove = (key: string) => onChange({ ...value, favoriteDishes: value.favoriteDishes.filter((d) => d.key !== key) });
  const addTyped = () => {
    if (!normalizedQuery) return;
    add({ key: normalizedQuery.dishKey, label: dishLabel(normalizedQuery.dishKey, normalizedQuery.customName), isCustom: normalizedQuery.isCustom });
    setQuery("");
  };

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          type="search"
          value={query}
          maxLength={60}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTyped();
            }
          }}
          placeholder="Search or add a dish"
          aria-label="Search or add a dish"
          className="pl-9"
          disabled={full}
        />
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        {value.favoriteDishes.length} of {MAX_FAVORITE_DISHES} chosen. Can&apos;t find it? Type it and press Enter.
      </p>

      {value.favoriteDishes.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2" aria-label="Your dishes">
          {value.favoriteDishes.map((d) => (
            <li key={d.key}>
              <button
                type="button"
                onClick={() => remove(d.key)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-foreground bg-foreground px-4 py-2 text-sm text-background"
                aria-label={`Remove ${d.label}`}
              >
                {d.label}
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Suggestions">
        {suggestions
          .filter((d) => !selectedKeys.has(d.key))
          .map((d) => (
            <button
              key={d.key}
              type="button"
              disabled={full}
              onClick={() => add({ key: d.key, label: d.label, isCustom: false })}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:border-foreground/30 disabled:opacity-50"
            >
              <Plus className="size-3.5" aria-hidden />
              {d.label}
            </button>
          ))}
        {canAddCustom && (
          <button
            type="button"
            disabled={full}
            onClick={addTyped}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed bg-card px-4 py-2 text-sm hover:border-foreground/30"
          >
            <Plus className="size-3.5" aria-hidden />
            Add &ldquo;{query.trim()}&rdquo;
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export type PrefsPage = {
  key: string;
  title: string;
  subtitle: string;
  optional?: boolean;
  /** Message shown when Continue is pressed without a valid answer (null = valid). */
  problem: (v: GuestPrefsValue) => string | null;
  /** The fields this page saves. */
  patch: (v: GuestPrefsValue) => GuestPreferencesPatch;
  Component: (p: FieldProps) => React.ReactNode;
};

export const PREFERENCE_PAGES: PrefsPage[] = [
  {
    key: "location",
    title: "Where are you based?",
    subtitle: "We'll find experiences worth exploring near you.",
    problem: (v) => (!v.locationKey ? "Choose your neighborhood." : v.maxTravelMinutes === null ? "Choose how long you're willing to travel." : null),
    patch: (v) => ({ ...(v.locationKey ? { locationKey: v.locationKey } : {}), maxTravelMinutes: v.maxTravelMinutes }),
    Component: (p) => (
      <div className="space-y-10">
        <NeighborhoodField {...p} />
        <TravelTimeField {...p} />
      </div>
    ),
  },
  {
    key: "when",
    title: "When do you love going out?",
    subtitle: "Pick your favorite days and time slots.",
    problem: (v) => (!v.preferredDays.length ? "Pick at least one day." : !v.preferredTimes.length ? "Pick at least one time slot." : null),
    patch: (v) => ({ preferredDays: v.preferredDays as GuestPreferencesPatch["preferredDays"], preferredTimes: v.preferredTimes as GuestPreferencesPatch["preferredTimes"] }),
    Component: (p) => (
      <div className="space-y-10">
        <DaysField {...p} />
        <TimeSlotsField {...p} />
      </div>
    ),
  },
  {
    key: "social",
    title: "Who would you love to share an experience with?",
    subtitle: "Every experience is better your way.",
    problem: (v) => (!v.attendancePreference ? "Choose one option." : null),
    patch: (v) => ({ attendancePreference: v.attendancePreference }),
    Component: AttendanceField,
  },
  {
    key: "categories",
    title: "What experiences excite you the most?",
    subtitle: "Select up to 3 types of experiences.",
    problem: (v) =>
      !v.categories.length ? "Select at least one type of experience." : v.categories.length > MAX_PREFERRED_CATEGORIES ? `Select up to ${MAX_PREFERRED_CATEGORIES}.` : null,
    patch: (v) => ({ categories: v.categories as GuestPreferencesPatch["categories"] }),
    Component: CategoriesField,
  },
  {
    key: "cuisines",
    title: "Which cuisines do you love?",
    subtitle: "Choose your favorites. We'll find experiences that match your taste.",
    problem: (v) => (!v.cuisines.length ? "Choose at least one cuisine, or “Open to everything”." : null),
    patch: (v) => ({ cuisines: v.cuisines }),
    Component: CuisinesField,
  },
  {
    key: "dishes",
    title: "Anything you're craving?",
    subtitle: "Tell us the dishes you'd love to discover.",
    optional: true,
    problem: () => null,
    patch: (v) => ({ favoriteDishes: v.favoriteDishes.map((d) => (d.isCustom ? { custom: d.label } : { key: d.key })) }),
    Component: DishesField,
  },
];

/** Every page's fields in one patch (profile editor saves everything at once). */
export function fullPatch(v: GuestPrefsValue): GuestPreferencesPatch {
  return Object.assign({}, ...PREFERENCE_PAGES.map((p) => p.patch(v)));
}
