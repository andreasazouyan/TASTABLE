"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import { ChoiceCard } from "@/components/onboarding/choice-card";
import { fullPatch, PREFERENCE_PAGES, type GuestPrefsValue } from "@/components/onboarding/guest-preference-fields";
import { Button } from "@/components/ui/button";
import { MAX_PREFERRED_CATEGORIES } from "@/lib/domain/preferences";
import { BUDGETS, MOTIVATIONS } from "@/lib/domain/taxonomy";
import { savePreferencesFromProfile } from "@/server/actions/preferences";

type Extras = { maxBudgetDollars: number | null; motivations: string[] };

/**
 * My Preferences: every onboarding answer on one screen, using the same components and labels
 * as onboarding, plus the earlier budget and motivation answers (still used by recommendations).
 * Saves to the guest's single preferences record.
 */
export function PreferencesEditor({ initial, initialExtras }: { initial: GuestPrefsValue; initialExtras: Extras }) {
  const [value, setValue] = useState(initial);
  const [extras, setExtras] = useState(initialExtras);
  const [saved, setSaved] = useState<{ value: GuestPrefsValue; extras: Extras }>({ value: initial, extras: initialExtras });
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify({ value, extras }) !== JSON.stringify(saved);
  // Unanswered questions are fine here (older profiles may not have every answer); only
  // answers that break a rule block saving.
  const problems = value.categories.length > MAX_PREFERRED_CATEGORIES ? [`Choose up to ${MAX_PREFERRED_CATEGORIES} experience types.`] : [];

  const save = () => {
    if (problems.length) return setStatus({ ok: false, message: problems[0] });
    startTransition(async () => {
      const res = await savePreferencesFromProfile({
        ...fullPatch(value),
        motivations: extras.motivations as never,
        maxBudgetCents: extras.maxBudgetDollars === null ? null : extras.maxBudgetDollars * 100,
      });
      if (!res.ok) return setStatus({ ok: false, message: res.message });
      setSaved({ value, extras });
      setStatus({ ok: true, message: "Preferences saved. Your recommendations now use these answers." });
    });
  };

  const update = (v: GuestPrefsValue) => {
    setValue(v);
    setStatus(null);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-12"
      aria-describedby="prefs-status"
    >
      {PREFERENCE_PAGES.map((page, i) => {
        const Page = page.Component;
        return (
          <section key={page.key} aria-labelledby={`pref-${page.key}`} className="border-t pt-8 first:border-t-0 first:pt-0">
            <p className="eyebrow mb-1">{i + 1}</p>
            <h3 id={`pref-${page.key}`} className="text-2xl">
              {page.title}
            </h3>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              {page.subtitle}
              {page.optional && " Optional."}
            </p>
            <fieldset disabled={pending}>
              <Page value={value} onChange={update} />
            </fieldset>
          </section>
        );
      })}

      <section aria-labelledby="pref-more" className="border-t pt-8">
        <h3 id="pref-more" className="text-2xl">
          More about you
        </h3>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">Optional. Your typical spend and why you go out also shape recommendations.</p>
        <fieldset disabled={pending} className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {BUDGETS.map((b) => (
              <ChoiceCard
                key={b.label}
                type="radio"
                name="budget"
                value={b.value === null ? "any" : String(b.value)}
                checked={extras.maxBudgetDollars === b.value}
                onChange={() => (setExtras({ ...extras, maxBudgetDollars: b.value }), setStatus(null))}
                title={b.label}
                hint={b.hint}
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {MOTIVATIONS.map((m) => (
              <ChoiceCard
                key={m.key}
                type="checkbox"
                name="motivations"
                value={m.key}
                checked={extras.motivations.includes(m.key)}
                onChange={(on) => (setExtras({ ...extras, motivations: on ? [...extras.motivations, m.key] : extras.motivations.filter((x) => x !== m.key) }), setStatus(null))}
                title={m.label}
                hint={m.hint}
              />
            ))}
          </div>
        </fieldset>
      </section>

      <div className="sticky bottom-16 flex flex-wrap items-center gap-4 border-t bg-background/95 py-4 backdrop-blur md:bottom-0">
        <Button type="submit" variant="brand" size="lg" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save Changes"}
        </Button>
        <p id="prefs-status" role="status" className={status && !status.ok ? "text-sm text-destructive" : "flex items-center gap-1.5 text-sm"}>
          {status?.ok && <CheckCircle2 className="size-4 text-brand" aria-hidden />}
          {status?.message ?? (dirty ? "You have unsaved changes." : "")}
        </p>
      </div>
    </form>
  );
}
