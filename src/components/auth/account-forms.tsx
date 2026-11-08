"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ChefHat, UserRound } from "lucide-react";

import { Field } from "@/components/host/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { logIn, signUp, type AuthFormState } from "@/server/actions/auth";

function FormMessage({ state }: { state: AuthFormState }) {
  if (!state?.message) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {state.message}
    </p>
  );
}

export function LogInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(logIn, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <Field label="Email" htmlFor="login-email" error={fe.email}>
        <Input id="login-email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} aria-invalid={!!fe.email} />
      </Field>
      <Field label="Password" htmlFor="login-password" error={fe.password}>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!fe.password} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to Tastable?{" "}
        <Link href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"} className="font-medium text-brand underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

const ROLES = [
  { value: "guest", title: "I want to attend", body: "Find supper clubs, classes and pop-ups.", icon: UserRound },
  { value: "host", title: "I want to host", body: "Publish your own culinary events.", icon: ChefHat },
] as const;

export function SignUpForm({ as: initialAs }: { as: "guest" | "host" }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, null);
  const [as, setAs] = useState<"guest" | "host">(initialAs);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">How will you use Tastable?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-[border-color,box-shadow] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40",
                as === r.value ? "border-foreground/60 shadow-soft" : "hover:border-foreground/25",
              )}
            >
              <input type="radio" name="as" value={r.value} checked={as === r.value} onChange={() => setAs(r.value)} className="sr-only" />
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-accent-foreground">
                <r.icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-medium">{r.title}</span>
                <span className="block text-xs text-muted-foreground">{r.body}</span>
              </span>
            </label>
          ))}
        </div>
        {as === "host" && <p className="mt-2 text-xs text-muted-foreground">You can still book events as a guest with the same account.</p>}
      </fieldset>
      <Field label="Your name" htmlFor="signup-name" error={fe.name}>
        <Input id="signup-name" name="name" autoComplete="name" required defaultValue={state?.name} aria-invalid={!!fe.name} />
      </Field>
      <Field label="Email" htmlFor="signup-email" error={fe.email}>
        <Input id="signup-email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} aria-invalid={!!fe.email} />
      </Field>
      <Field label="Password" htmlFor="signup-password" hint="At least 8 characters." error={fe.password}>
        <Input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!fe.password} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Tastable is an early prototype. Payments are simulated and no card details are ever collected.</p>
    </form>
  );
}
