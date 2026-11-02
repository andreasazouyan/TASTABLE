"use client";

import { useActionState, useState } from "react";

import { Field, inputClass } from "@/components/host/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveExpenseAction, type FormState } from "@/server/actions/host";

export const EXPENSE_CATEGORIES: Record<string, string> = {
  INGREDIENTS: "Ingredients",
  BEVERAGES: "Beverages",
  VENUE: "Venue",
  STAFF: "Staff",
  EQUIPMENT: "Equipment",
  MARKETING: "Marketing",
  OTHER: "Other",
};

type Event = { id: string; title: string; sessions: { id: string; label: string }[] };
export type ExpenseValue = { id?: string; experienceId: string; sessionId: string; category: string; description: string; amountDollars: string; incurredOn: string };

export function ExpenseForm({ events, initial, onDone }: { events: Event[]; initial: ExpenseValue; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await saveExpenseAction(prev, fd);
    if (r?.ok) onDone?.();
    return r;
  }, null);
  const [experienceId, setExperienceId] = useState(initial.experienceId);
  const sessions = events.find((e) => e.id === experienceId)?.sessions ?? [];
  const fe = state?.fieldErrors ?? {};
  const uid = initial.id ?? "new";

  if (!events.length) return <p className="text-sm text-muted-foreground">Create an event first to record expenses against it.</p>;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Event" htmlFor={`ex-ev-${uid}`} error={fe.experienceId}>
        <select id={`ex-ev-${uid}`} name="experienceId" className={inputClass} value={experienceId} onChange={(e) => setExperienceId(e.target.value)}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date of event (optional)" htmlFor={`ex-s-${uid}`}>
        <select id={`ex-s-${uid}`} name="sessionId" className={inputClass} defaultValue={initial.sessionId} key={experienceId}>
          <option value="">Whole event</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Category" htmlFor={`ex-c-${uid}`} error={fe.category}>
        <select id={`ex-c-${uid}`} name="category" className={inputClass} defaultValue={initial.category}>
          {Object.entries(EXPENSE_CATEGORIES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description" htmlFor={`ex-d-${uid}`} error={fe.description}>
        <input id={`ex-d-${uid}`} name="description" className={inputClass} defaultValue={initial.description} />
      </Field>
      <Field label="Amount (USD)" htmlFor={`ex-a-${uid}`} error={fe.amountDollars}>
        <input id={`ex-a-${uid}`} name="amountDollars" type="number" min="0.01" step="0.01" className={inputClass} defaultValue={initial.amountDollars} />
      </Field>
      <Field label="Date paid" htmlFor={`ex-i-${uid}`} error={fe.incurredOn}>
        <input id={`ex-i-${uid}`} name="incurredOn" type="date" className={inputClass} defaultValue={initial.incurredOn} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <Button type="submit" variant={initial.id ? "default" : "brand"} disabled={pending}>
          {pending ? "Saving…" : initial.id ? "Save expense" : "Add expense"}
        </Button>
        {state && (
          <p role={state.ok ? "status" : "alert"} className={cn("text-sm", state.ok ? "text-[#3f5130]" : "text-destructive")}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function ExpenseEditToggle({ events, initial }: { events: Event[]; initial: ExpenseValue }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Close" : "Edit"}
      </Button>
      {open && (
        <div className="basis-full rounded-xl border bg-background p-4">
          <ExpenseForm events={events} initial={initial} onDone={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
