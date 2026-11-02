"use client";

import { useActionState, useState } from "react";

import { Field, inputClass } from "@/components/host/field";
import { Button } from "@/components/ui/button";
import { NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import { cn } from "@/lib/utils";
import { venueRequestAction, type FormState } from "@/server/actions/host";

export function VenueRequestForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(venueRequestAction, null);
  const [hoods, setHoods] = useState<string[]>([]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6 rounded-2xl border bg-card p-5 shadow-soft sm:p-8">
      <fieldset>
        <legend className="mb-3 font-medium">Preferred neighborhoods</legend>
        <div className="flex flex-wrap gap-2">
          {NEIGHBORHOODS.map((n) => {
            const on = hoods.includes(n.key);
            return (
              <label
                key={n.key}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40",
                  on ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/40",
                )}
              >
                <input type="checkbox" name="neighborhoods" value={n.key} checked={on} onChange={() => setHoods(on ? hoods.filter((h) => h !== n.key) : [...hoods, n.key])} className="sr-only" />
                {n.name}
              </label>
            );
          })}
        </div>
        {fe.neighborhoods && <p className="mt-2 text-sm text-destructive">{fe.neighborhoods[0]}</p>}
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Expected guests" htmlFor="guestCount" error={fe.guestCount}>
          <input id="guestCount" name="guestCount" type="number" min={2} defaultValue={16} className={inputClass} />
        </Field>
        <Field label="Budget per event (USD, optional)" htmlFor="budgetDollars" error={fe.budgetDollars}>
          <input id="budgetDollars" name="budgetDollars" type="number" min={0} className={inputClass} />
        </Field>
        <Field label="Preferred dates" htmlFor="preferredDates" error={fe.preferredDates} hint='e.g. "Fridays in December"' className="sm:col-span-2">
          <input id="preferredDates" name="preferredDates" className={inputClass} />
        </Field>
        <Field label="Anything else" htmlFor="notes" className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={3} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="needsKitchen" defaultChecked className="size-4 accent-[var(--brand)]" /> I need a working kitchen
        </label>
      </div>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={cn("rounded-xl px-4 py-3 text-sm", state.ok ? "bg-[#e5eddc] text-[#3f5130]" : "bg-destructive/10 text-destructive")}>
          {state.message}
        </p>
      )}
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
