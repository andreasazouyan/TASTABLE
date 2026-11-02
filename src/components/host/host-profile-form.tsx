"use client";

import { useActionState, useState } from "react";

import { Field, inputClass } from "@/components/host/field";
import { ChoiceCard } from "@/components/onboarding/choice-card";
import { Button } from "@/components/ui/button";
import { NEIGHBORHOODS } from "@/lib/domain/neighborhoods";
import { CUISINES, HOST_TYPES } from "@/lib/domain/taxonomy";
import { saveHostProfileAction, type FormState } from "@/server/actions/host";

export type HostProfileValue = {
  hostType: string;
  displayName: string;
  tagline: string;
  bio: string;
  background: string;
  cuisineExpertise: string[];
  homeNeighborhood: string;
  profilePhotoUrl: string;
  credentials: string;
  instagramHandle: string;
};

export function HostProfileForm({ initial, submitLabel }: { initial: HostProfileValue; submitLabel: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveHostProfileAction, null);
  const [hostType, setHostType] = useState(initial.hostType);
  const [cuisines, setCuisines] = useState(initial.cuisineExpertise);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-10">
      <section aria-labelledby="hp-type">
        <h2 id="hp-type" className="mb-1 text-2xl">
          What kind of host are you?
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">This describes you, not your events. Events still choose one of the four experience categories.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(HOST_TYPES).map(([key, t]) => (
            <ChoiceCard key={key} type="radio" name="hostType" value={key} checked={hostType === key} onChange={() => setHostType(key)} title={t.label} hint={t.description} />
          ))}
        </div>
        {fe.hostType && <p className="mt-2 text-sm text-destructive">{fe.hostType[0]}</p>}
      </section>

      <section aria-labelledby="hp-about" className="grid gap-5 sm:grid-cols-2">
        <h2 id="hp-about" className="text-2xl sm:col-span-2">
          About you
        </h2>
        <Field label="Host name" htmlFor="displayName" error={fe.displayName}>
          <input id="displayName" name="displayName" defaultValue={initial.displayName} className={inputClass} aria-invalid={!!fe.displayName} />
        </Field>
        <Field label="Tagline" htmlFor="tagline" error={fe.tagline} hint="One line guests see on your events">
          <input id="tagline" name="tagline" defaultValue={initial.tagline} className={inputClass} aria-invalid={!!fe.tagline} />
        </Field>
        <Field label="Bio" htmlFor="bio" error={fe.bio} className="sm:col-span-2">
          <textarea id="bio" name="bio" rows={4} defaultValue={initial.bio} className={inputClass} aria-invalid={!!fe.bio} />
        </Field>
        <Field label="Culinary background" htmlFor="background" error={fe.background} hint='e.g. "Trained in Osaka kitchens before cooking privately"'>
          <input id="background" name="background" defaultValue={initial.background} className={inputClass} aria-invalid={!!fe.background} />
        </Field>
        <Field label="Location" htmlFor="homeNeighborhood" error={fe.homeNeighborhood}>
          <select id="homeNeighborhood" name="homeNeighborhood" defaultValue={initial.homeNeighborhood} className={inputClass} aria-invalid={!!fe.homeNeighborhood}>
            <option value="">Choose a neighborhood</option>
            {NEIGHBORHOODS.map((n) => (
              <option key={n.key} value={n.key}>
                {n.name}, {n.borough}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profile photo URL" htmlFor="profilePhotoUrl" error={fe.profilePhotoUrl} hint="Optional. Uploads aren't stored in this prototype; paste an https image link.">
          <input id="profilePhotoUrl" name="profilePhotoUrl" type="url" defaultValue={initial.profilePhotoUrl} className={inputClass} placeholder="https://" />
        </Field>
        <Field label="Instagram handle" htmlFor="instagramHandle" hint="Optional">
          <input id="instagramHandle" name="instagramHandle" defaultValue={initial.instagramHandle} className={inputClass} placeholder="@" />
        </Field>
      </section>

      <section aria-labelledby="hp-cuisine">
        <h2 id="hp-cuisine" className="mb-4 text-2xl">
          Cuisine expertise
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CUISINES.map((c) => (
            <ChoiceCard
              key={c.key}
              type="checkbox"
              name="cuisineExpertise"
              value={c.key}
              checked={cuisines.includes(c.key)}
              onChange={(on) => setCuisines((xs) => (on ? [...xs, c.key] : xs.filter((x) => x !== c.key)))}
              title={c.label}
            />
          ))}
        </div>
        {fe.cuisineExpertise && <p className="mt-2 text-sm text-destructive">{fe.cuisineExpertise[0]}</p>}
      </section>

      <section aria-labelledby="hp-cred">
        <h2 id="hp-cred" className="mb-1 text-2xl">
          Credentials
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">One per line: training, residencies, press. Shown on your events as self-reported.</p>
        <textarea id="credentials" name="credentials" aria-labelledby="hp-cred" rows={4} defaultValue={initial.credentials} className={inputClass} />
      </section>

      <div className="sticky bottom-0 flex items-center gap-4 border-t bg-background/95 py-4 backdrop-blur">
        <Button type="submit" variant="brand" size="lg" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {state && (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm" : "text-sm text-destructive"}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
