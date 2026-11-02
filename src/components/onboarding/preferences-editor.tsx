"use client";

import { useActionState, useState } from "react";

import { PrefsHiddenInputs, STEPS, type PrefsValue } from "@/components/onboarding/preference-steps";
import { Button } from "@/components/ui/button";
import { updatePreferences, type PrefsState } from "@/server/actions/preferences";

/** Edit Preferences: every onboarding section on one screen. */
export function PreferencesEditor({ initial }: { initial: PrefsValue }) {
  const [value, setValue] = useState(initial);
  const [state, action, pending] = useActionState<PrefsState, FormData>(updatePreferences, null);
  return (
    <form action={action} className="space-y-12">
      <PrefsHiddenInputs value={value} />
      {STEPS.map((s, i) => {
        const Step = s.Component;
        return (
          <section key={s.key} aria-labelledby={`pref-${s.key}`} className="border-t pt-8 first:border-t-0 first:pt-0">
            <p className="eyebrow mb-1">{i + 1}</p>
            <h2 id={`pref-${s.key}`} className="text-2xl">
              {s.title}
            </h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">{s.description}</p>
            {/* Visual controls use their own names; hidden inputs above carry the submitted values. */}
            <div>
              <Step value={value} onChange={setValue} />
            </div>
          </section>
        );
      })}
      <div className="sticky bottom-16 flex items-center gap-4 border-t bg-background/95 py-4 backdrop-blur md:bottom-0">
        <Button type="submit" variant="brand" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
        {state && (
          <p role="status" className={state.ok ? "text-sm" : "text-sm text-destructive"}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
