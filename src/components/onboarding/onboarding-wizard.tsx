"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PREFERENCE_PAGES, type GuestPrefsValue } from "@/components/onboarding/guest-preference-fields";
import { Button } from "@/components/ui/button";
import { finishOnboarding, saveOnboardingAnswers, skipOnboarding } from "@/server/actions/preferences";
import { cn } from "@/lib/utils";

/**
 * Six-page onboarding. Each page's answers are saved to the guest's preferences when moving on
 * (and when going back with a valid page), and the page number lives in the URL, so a refresh
 * resumes on the same page with the saved answers. Going back keeps every selection in memory.
 */
export function OnboardingWizard({ initial, initialStep }: { initial: GuestPrefsValue; initialStep: number }) {
  const [value, setValue] = useState(initial);
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), PREFERENCE_PAGES.length - 1));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const page = PREFERENCE_PAGES[step];
  const last = step === PREFERENCE_PAGES.length - 1;
  const problem = page.problem(value);

  const moveTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError(null);
    // Native history keeps the step in the URL without a server round trip (Next syncs with it).
    window.history.replaceState(null, "", `/onboarding?step=${next + 1}`);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const continueOn = () => {
    if (problem) return setError(problem);
    startTransition(async () => {
      const res = await saveOnboardingAnswers(page.patch(value));
      if (!res.ok) return setError(res.message);
      moveTo(step + 1);
    });
  };

  const back = () => {
    startTransition(async () => {
      // Keep valid answers from this page too; invalid ones stay in memory only.
      if (!problem) await saveOnboardingAnswers(page.patch(value));
      moveTo(step - 1);
    });
  };

  const finish = (withDishes: boolean) => {
    startTransition(async () => {
      const res = await finishOnboarding(withDishes ? page.patch(value) : {});
      if (res && !res.ok) setError(res.message);
    });
  };

  const Page = page.Component;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {step + 1} of {PREFERENCE_PAGES.length}
          </span>
          <form action={skipOnboarding}>
            <button type="submit" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Skip for now
            </button>
          </form>
        </div>
        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={PREFERENCE_PAGES.length}
          aria-valuenow={step + 1}
          aria-label="Onboarding progress"
        >
          {PREFERENCE_PAGES.map((p, i) => (
            <span key={p.key} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i <= step ? "bg-brand" : "bg-muted")} />
          ))}
        </div>
      </div>

      <div key={page.key} className={cn("animate-in fade-in-0 duration-500 ease-out", direction === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6")}>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl outline-none sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-2 mb-8 text-muted-foreground">
          {page.subtitle}
          {page.optional && <span className="ml-1">This step is optional.</span>}
        </p>
        <fieldset aria-label={page.title} disabled={pending}>
          <Page value={value} onChange={(v) => (setValue(v), setError(null))} />
        </fieldset>
      </div>

      <p role="alert" className="mt-6 min-h-5 text-sm text-destructive">
        {error}
      </p>

      <div className="sticky bottom-16 mt-4 flex items-center justify-between gap-3 border-t bg-background/95 py-4 backdrop-blur md:bottom-0">
        <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || pending}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        {last ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => finish(false)} disabled={pending}>
              Skip this step
            </Button>
            <Button type="button" variant="brand" size="lg" onClick={() => finish(true)} disabled={pending}>
              {pending ? "Saving…" : "Finish"}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={continueOn} disabled={pending} aria-describedby={problem ? undefined : undefined}>
            Continue <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
