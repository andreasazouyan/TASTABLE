"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound, Users } from "lucide-react";

import { signOut } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

/** Avatar button at the far top right with the profile dropdown. */
export function UserMenuDropdown({ name, initials }: { name: string; initials: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border bg-card p-1 text-sm shadow-soft transition-colors hover:border-foreground/25 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none sm:pr-2.5"
      >
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-accent-foreground">
          {initials}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{name.split(" ")[0]}</span>
        <ChevronDown aria-hidden className={cn("hidden size-3.5 text-muted-foreground transition-transform sm:block", open && "rotate-180")} />
        <span className="sr-only">Account menu for {name}</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <p className="truncate px-3 pt-1.5 pb-2 text-xs text-muted-foreground">Signed in as {name}</p>
          <Link role="menuitem" href="/profile" className={item} onClick={() => setOpen(false)}>
            <UserRound aria-hidden className="size-4 text-muted-foreground" />
            My Profile
          </Link>
          <Link role="menuitem" href="/sign-in" className={item} onClick={() => setOpen(false)}>
            <Users aria-hidden className="size-4 text-muted-foreground" />
            Switch demo identity
          </Link>
          <form action={signOut}>
            <button role="menuitem" type="submit" className={item}>
              <LogOut aria-hidden className="size-4 text-muted-foreground" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
