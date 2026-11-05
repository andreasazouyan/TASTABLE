import Link from "next/link";

import { UserMenuDropdown } from "@/components/site/user-menu-dropdown";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/demo";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Signed-in demo persona, or a sign-in prompt. Reads cookies: render inside <Suspense>.
 * `dropdown` (guest header) opens the profile dropdown; without it (host shell) it links to the profile.
 */
export async function UserMenu({ dropdown = false }: { dropdown?: boolean }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  }
  if (dropdown) return <UserMenuDropdown name={user.name} initials={initials(user.name)} />;
  return (
    <Link
      href="/profile"
      className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm shadow-soft transition-colors hover:border-foreground/25 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <span aria-hidden className="grid size-7 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-accent-foreground">
        {initials(user.name)}
      </span>
      <span className="max-w-[9rem] truncate">{user.name.split(" ")[0]}</span>
      <span className="sr-only">, view profile</span>
    </Link>
  );
}

export function UserMenuFallback({ className }: { className?: string }) {
  return <div aria-hidden className={className ?? "h-9 w-24 rounded-full bg-muted"} />;
}
