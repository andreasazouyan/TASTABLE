import type { Metadata } from "next";
import { Suspense } from "react";
import { ChefHat, UserRound } from "lucide-react";

import { LogInForm } from "@/components/auth/account-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/demo";
import { getPersona } from "@/lib/domain/personas";
import { HOST_TYPES } from "@/lib/domain/taxonomy";
import { signInAs, signOut } from "@/server/actions/auth";
import { getDemoIdentities } from "@/server/queries/guest";

export const metadata: Metadata = { title: "Log in" };

function nextFrom(sp: Record<string, string | string[] | undefined>) {
  return typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") && !sp.next.startsWith("/\\") ? sp.next : undefined;
}

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <div className="container-page max-w-4xl pt-10 pb-16 sm:pt-16">
      <div className="mx-auto max-w-lg">
        <p className="eyebrow mb-2">Welcome back</p>
        <h1 className="text-4xl sm:text-5xl">Log in to Tastable</h1>
        <div className="mt-8 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <LogIn {...props} />
          </Suspense>
        </div>
      </div>

      <div className="mt-16 border-t pt-10">
        <p className="eyebrow mb-2">For demos</p>
        <h2 className="text-3xl">Explore with a demo persona</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          No account needed. Step into a fictional guest or host to see Tastable with sample bookings, saves and finances. Your choice is stored in a
          signed cookie on this device only.
        </p>
        <Suspense fallback={<Skeleton className="mt-10 h-96 rounded-2xl" />}>
          <Identities {...props} />
        </Suspense>
      </div>
    </div>
  );
}

async function LogIn({ searchParams }: PageProps<"/sign-in">) {
  const next = nextFrom(await searchParams);
  return <LogInForm next={next} />;
}

function personaLine(userId: string) {
  const p = getPersona(userId);
  return p ? `${p.age} · ${p.budget}. ${p.summary}` : "Demo guest";
}

function IdentityButton({ userId, next, title, subtitle, icon }: { userId: string; next?: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <form action={signInAs}>
      <input type="hidden" name="userId" value={userId} />
      {next && <input type="hidden" name="next" value={next} />}
      <button
        type="submit"
        className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-soft transition-[border-color,box-shadow] duration-200 hover:border-foreground/30 hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-accent-foreground">{icon}</span>
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          <span className="block text-sm text-muted-foreground">{subtitle}</span>
        </span>
      </button>
    </form>
  );
}

async function Identities({ searchParams }: PageProps<"/sign-in">) {
  const next = nextFrom(await searchParams);
  const [{ guests, hosts }, current] = await Promise.all([getDemoIdentities(), getCurrentUser()]);

  return (
    <div className="mt-10 space-y-10">
      {current && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted p-4 text-sm">
          <span>
            Signed in as <strong>{current.name}</strong>
            {current.isDemo ? ` (demo ${current.role.toLowerCase()})` : ""}.
          </span>
          <form action={signOut}>
            <button type="submit" className="font-medium text-brand underline-offset-4 hover:underline">
              Sign out
            </button>
          </form>
        </div>
      )}
      <section aria-labelledby="guests">
        <h3 id="guests" className="mb-4 text-2xl">
          Demo guests
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {guests.map((g) => (
            <IdentityButton
              key={g.id}
              userId={g.id}
              next={next}
              title={`${g.name} (demo guest)`}
              subtitle={personaLine(g.id)}
              icon={<UserRound className="size-5" aria-hidden />}
            />
          ))}
        </div>
      </section>
      <section aria-labelledby="hosts">
        <h3 id="hosts" className="mb-1 text-2xl">
          Demo hosts
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">Fictional hosts with sample events, reservations and simulated finances.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hosts.map((h) => (
            <IdentityButton
              key={h.id}
              userId={h.id}
              next={next?.startsWith("/host") ? next : undefined}
              title={h.hostProfile?.displayName ?? h.name}
              subtitle={h.hostProfile ? HOST_TYPES[h.hostProfile.hostType].label : "Host"}
              icon={<ChefHat className="size-5" aria-hidden />}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
