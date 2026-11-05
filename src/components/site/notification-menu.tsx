"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, BellRing, X } from "lucide-react";

import { dismissReminderAction } from "@/server/actions/bookings";

export type NotificationItem = { id: string; title: string; when: string; tickets: number; reference: string };

/** Bell button with a dropdown of due in-app reminders. */
export function NotificationMenu({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const count = items.length;

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={count ? `Notifications: ${count} reminder${count > 1 ? "s" : ""}` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-9 place-items-center rounded-full border bg-card shadow-soft transition-colors hover:border-foreground/25 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <Bell aria-hidden className="size-[18px]" strokeWidth={1.75} />
        {count > 0 && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} role="dialog" aria-label="Notifications" className="absolute top-full right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg">
          <p className="px-3 pt-1.5 pb-2 text-xs text-muted-foreground">Reminders</p>
          {count === 0 ? (
            <p className="px-3 pb-3 text-sm text-muted-foreground">Nothing coming up in the next 24 hours. Reminders appear here the day before a booking.</p>
          ) : (
            <ul className="space-y-1">
              {items.map((n) => (
                <li key={n.id} className="flex items-start gap-2.5 rounded-lg px-3 py-2 hover:bg-muted">
                  <BellRing aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                  <Link href={`/bookings/${n.reference}`} onClick={() => setOpen(false)} className="min-w-0 flex-1 text-sm focus-visible:outline-none">
                    <span className="block truncate font-medium">{n.title}</span>
                    <span className="block text-muted-foreground">
                      {n.when} · {n.tickets} {n.tickets === 1 ? "ticket" : "tickets"}
                    </span>
                  </Link>
                  <form action={dismissReminderAction}>
                    <input type="hidden" name="reminderId" value={n.id} />
                    <button type="submit" className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground" aria-label={`Dismiss reminder for ${n.title}`}>
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t px-3 pt-2 pb-1 text-[11px] text-muted-foreground">In-app only. No email or push notifications in this demo.</p>
        </div>
      )}
    </div>
  );
}
