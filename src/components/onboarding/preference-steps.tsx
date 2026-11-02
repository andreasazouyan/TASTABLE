"use client";

import { MapPin } from "lucide-react";

import { ChoiceCard } from "@/components/onboarding/choice-card";
import { CATEGORIES } from "@/lib/domain/categories";
import { NEIGHBORHOODS, TRAVEL_RADII } from "@/lib/domain/neighborhoods";
import { BUDGETS, CUISINES, MOTIVATIONS } from "@/lib/domain/taxonomy";

export type PrefsValue = {
  locationKey: string;
  travelRadiusMiles: number | null;
  cuisines: string[];
  categories: string[];
  motivations: string[];
  /** Per-person budget in dollars, or null for no limit. */
  maxBudgetDollars: number | null;
};

type StepProps = { value: PrefsValue; onChange: (v: PrefsValue) => void };

const toggle = (list: string[], key: string, on: boolean) => (on ? Array.from(new Set([...list, key])) : list.filter((x) => x !== key));

export function LocationStep({ value, onChange }: StepProps) {
  const boroughs = Array.from(new Set(NEIGHBORHOODS.map((n) => n.borough)));
  return (
    <div className="space-y-6">
      <ChoiceCard
        type="radio"
        name="locationKey"
        value="nyc"
        checked={value.locationKey === "nyc"}
        onChange={() => onChange({ ...value, locationKey: "nyc", travelRadiusMiles: null })}
        title="Anywhere in New York City"
        hint="The default. We won't filter by distance."
        icon={<MapPin className="size-5" aria-hidden />}
      />
      {boroughs.map((b) => (
        <fieldset key={b}>
          <legend className="mb-2 text-sm font-medium text-muted-foreground">{b}</legend>
          <div className="flex flex-wrap gap-2">
            {NEIGHBORHOODS.filter((n) => n.borough === b).map((n) => {
              const checked = value.locationKey === n.key;
              return (
                <label
                  key={n.key}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 ${checked ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/30"}`}
                >
                  <input type="radio" name="locationKey" value={n.key} checked={checked} onChange={() => onChange({ ...value, locationKey: n.key, travelRadiusMiles: value.travelRadiusMiles ?? 5 })} className="sr-only" />
                  {n.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <p className="text-xs text-muted-foreground">We never ask for location permissions. Pick a neighborhood manually.</p>
    </div>
  );
}

export function RadiusStep({ value, onChange }: StepProps) {
  const anywhere = value.locationKey === "nyc";
  return (
    <div>
      {anywhere && (
        <p className="mb-4 rounded-xl bg-muted p-3 text-sm">You chose anywhere in NYC, so distance won&apos;t be used. Pick a neighborhood in step 1 to set a radius.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {TRAVEL_RADII.map((r) => (
          <ChoiceCard
            key={r.label}
            type="radio"
            name="travelRadiusMiles"
            value={r.value === null ? "any" : String(r.value)}
            checked={(anywhere ? null : value.travelRadiusMiles) === r.value}
            onChange={() => onChange({ ...value, travelRadiusMiles: r.value })}
            title={r.label}
            hint={r.hint}
            className={anywhere && r.value !== null ? "pointer-events-none opacity-50" : undefined}
          />
        ))}
      </div>
      <fieldset className="mt-10">
        <legend className="mb-1 text-xl font-display">What do you usually like to spend?</legend>
        <p className="mb-4 text-sm text-muted-foreground">Per person. Recommendations above your budget are left out; you can still browse everything.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {BUDGETS.map((b) => (
            <ChoiceCard
              key={b.label}
              type="radio"
              name="maxBudgetDollars"
              value={b.value === null ? "any" : String(b.value)}
              checked={value.maxBudgetDollars === b.value}
              onChange={() => onChange({ ...value, maxBudgetDollars: b.value })}
              title={b.label}
              hint={b.hint}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function CuisineStep({ value, onChange }: StepProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {CUISINES.map((c) => (
        <ChoiceCard
          key={c.key}
          type="checkbox"
          name="cuisines"
          value={c.key}
          checked={value.cuisines.includes(c.key)}
          onChange={(on) => onChange({ ...value, cuisines: toggle(value.cuisines, c.key, on) })}
          title={c.label}
        />
      ))}
    </div>
  );
}

export function CategoryStep({ value, onChange }: StepProps) {
  return (
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
            onChange={(on) => onChange({ ...value, categories: toggle(value.categories, c.id, on) })}
            title={c.name}
            hint={c.description}
            icon={<Icon className="size-5" aria-hidden />}
          />
        );
      })}
    </div>
  );
}

export function MotivationStep({ value, onChange }: StepProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MOTIVATIONS.map((m) => (
        <ChoiceCard
          key={m.key}
          type="checkbox"
          name="motivations"
          value={m.key}
          checked={value.motivations.includes(m.key)}
          onChange={(on) => onChange({ ...value, motivations: toggle(value.motivations, m.key, on) })}
          title={m.label}
          hint={m.hint}
        />
      ))}
    </div>
  );
}

/** Hidden inputs that carry the full preference state in every submit. */
export function PrefsHiddenInputs({ value }: { value: PrefsValue }) {
  return (
    <>
      <input type="hidden" name="locationKey" value={value.locationKey} />
      <input type="hidden" name="travelRadiusMiles" value={value.travelRadiusMiles === null ? "any" : String(value.travelRadiusMiles)} />
      <input type="hidden" name="maxBudgetDollars" value={value.maxBudgetDollars === null ? "any" : String(value.maxBudgetDollars)} />
      {value.cuisines.map((c) => (
        <input key={c} type="hidden" name="cuisines" value={c} />
      ))}
      {value.categories.map((c) => (
        <input key={c} type="hidden" name="categories" value={c} />
      ))}
      {value.motivations.map((c) => (
        <input key={c} type="hidden" name="motivations" value={c} />
      ))}
    </>
  );
}

export const STEPS = [
  { key: "location", title: "Where are you based?", description: "We'll prioritise experiences nearby.", Component: LocationStep },
  { key: "radius", title: "How far will you go, and what will you spend?", description: "Recommendations outside your radius or budget are left out.", Component: RadiusStep },
  { key: "cuisines", title: "What do you love to eat?", description: "Pick as many as you like.", Component: CuisineStep },
  { key: "categories", title: "Which experiences appeal to you?", description: "Choose any of the four Tastable categories.", Component: CategoryStep },
  { key: "motivations", title: "Why do you go out?", description: "This shapes what we highlight for you.", Component: MotivationStep },
] as const;
