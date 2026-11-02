"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PrefsHiddenInputs, STEPS, type PrefsValue } from "@/components/onboarding/preference-steps";
import { Button } from "@/components/ui/button";
import { completeOnboarding, saveOnboardingStep, skipOnboarding } from "@/server/actions/preferences";
import { cn } from "@/lib/utils";

function toFormData(v: PrefsValue) {
  const fd = new FormData();
  fd.set("locationKey", v.locationKey);
  fd.set("travelRadiusMiles", v.travelRadiusMiles === null ? "any" : String(v.travelRadiusMiles));
  v.cuisines.forEach((c) => fd.append("cuisines", c));
  v.categories.forEach((c) => fd.append("categories", c));
  v.motivations.forEach((c) => fd.append("motivations", c));
  return fd;
}

/** Five optional steps. Progress is saved on every step and the step is kept in the URL. */
export function OnboardingWizard({ initial, initialStep }: { initial: PrefsValue; initialStep: number }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), STEPS.length - 1));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pending, startTransition] = useTransition();
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    startTransition(async () => {
      await saveOnboardingStep(toFormData(value));
      setStep(next);
      router.replace(`/onboarding?step=${next + 1}`, { scroll: false });
    });
  };

  const Step = current.Component;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {step + 1} of {STEPS.length}
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
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Onboarding progress"
        >
          {STEPS.map((s, i) => (
            <span key={s.key} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i <= step ? "bg-brand" : "bg-muted")} />
          ))}
        </div>
      </div>

      <div
        key={current.key}
        className={cn(
          "animate-in fade-in-0 duration-500 ease-out",
          direction === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6",
        )}
      >
        <h1 className="text-3xl sm:text-4xl">{current.title}</h1>
        <p className="mt-2 mb-8 text-muted-foreground">{current.description}</p>
        <fieldset aria-label={current.title} disabled={pending}>
          <Step value={value} onChange={setValue} />
        </fieldset>
      </div>

      <div className="sticky bottom-16 mt-10 flex items-center justify-between gap-3 border-t bg-background/95 py-4 backdrop-blur md:bottom-0">
        <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || pending}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        {last ? (
          <form action={completeOnboarding}>
            <PrefsHiddenInputs value={value} />
            <Button type="submit" variant="brand" size="lg">
              Finish and see recommendations
            </Button>
          </form>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => go(step + 1)} disabled={pending}>
              Skip step
            </Button>
            <Button type="button" onClick={() => go(step + 1)} disabled={pending}>
              Continue <ArrowRight aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
