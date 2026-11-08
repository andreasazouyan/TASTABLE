import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, Lock, MapPin, Share2, Ticket } from "lucide-react";

import { ReminderBanners } from "@/components/booking/reminder-banners";
import { ShareButton } from "@/components/experiences/share-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGuest } from "@/lib/auth/demo";
import { addDaysIso, addMonthsIso, monthGrid, sameMonth, weekDays } from "@/lib/calendar/grid";
import { nyDateTime } from "@/lib/clock";
import { formatDate, formatTime, isoDateNY } from "@/lib/format";
import { requestNow } from "@/lib/request-clock";
import { cn } from "@/lib/utils";
import { enableCalendarSharing, revokeCalendarSharing, setShowTitles, toggleSharedSession } from "@/server/actions/sharing";
import { getCalendarItems, getSharingSettings, type CalendarItem, type CalendarItemKind } from "@/server/queries/calendar";

export const metadata: Metadata = { title: "Calendar" };

const KIND_STYLE: Record<CalendarItemKind, { label: string; chip: string; dot: string }> = {
  booking: {
    label: "Booked",
    chip: "bg-brand text-brand-foreground",
    dot: "bg-brand",
  },
  saved: {
    label: "Saved",
    chip: "border border-foreground/30 bg-card text-foreground",
    dot: "border border-foreground/50 bg-card",
  },
  invitation: {
    label: "Invitation",
    chip: "border border-dashed border-brand bg-brand-soft text-accent-foreground",
    dot: "border border-dashed border-brand bg-brand-soft",
  },
  cancelled: {
    label: "Cancelled",
    chip: "bg-muted text-muted-foreground line-through",
    dot: "bg-muted-foreground/40",
  },
};

export default function CalendarPage(props: PageProps<"/calendar">) {
  return (
    <div className="container-page pt-8 sm:pt-12">
      <Suspense fallback={<Skeleton className="h-[36rem] rounded-2xl" />}>
        <Calendar {...props} />
      </Suspense>
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-4 text-sm" aria-label="Legend">
      {(Object.keys(KIND_STYLE) as CalendarItemKind[]).map((k) => (
        <li key={k} className="flex items-center gap-2">
          <span aria-hidden className={cn("size-3 rounded-full", KIND_STYLE[k].dot)} />
          {KIND_STYLE[k].label}
        </li>
      ))}
    </ul>
  );
}

function ItemChip({ item, compact }: { item: CalendarItem; compact?: boolean }) {
  const s = KIND_STYLE[item.kind];
  return (
    <Link
      href={item.href}
      className={cn("block truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight transition-opacity hover:opacity-85 sm:text-xs", s.chip, !compact && "px-2.5 py-2 text-sm")}
      title={`${item.title} · ${formatTime(item.startsAt)} · ${s.label}`}
    >
      <span className="sr-only">{s.label}: </span>
      {!compact && (
        <span className="block text-xs opacity-80">
          {formatTime(item.startsAt)} · {item.detail}
        </span>
      )}
      {compact && <span className="hidden sm:inline">{formatTime(item.startsAt)} </span>}
      {item.title}
    </Link>
  );
}

const ITEM_ACTION: Record<CalendarItemKind, string> = {
  booking: "View booking & ticket",
  cancelled: "View booking",
  saved: "View experience",
  invitation: "View invitation",
};

/** The selected day: personal plans first, then a way into Discover for that date. */
function DayPanel({ day, items, today }: { day: string; items: CalendarItem[]; today: string }) {
  const past = day < today;
  const label = formatDate(nyDateTime(day, 12), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: day.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
  });
  const discoverHref = `/discover?date=${day}`;
  const hasBooking = items.some((i) => i.kind === "booking");
  return (
    <section id="selected-day" aria-labelledby="selected-day-title" className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft">
      <p className="eyebrow mb-1">{day === today ? "Today" : past ? "Past day" : "Selected day"}</p>
      <h2 id="selected-day-title" className="text-2xl">
        {label}
      </h2>
      {!hasBooking && <p className="mt-3 text-sm text-muted-foreground">No experiences planned yet.</p>}
      {items.length > 0 && (
        <ul className="mt-4 space-y-3" aria-label={`Your plans on ${label}`}>
          {items.map((it) => {
            const s = KIND_STYLE[it.kind];
            return (
              <li key={it.id} className={cn("rounded-xl border p-3", it.kind === "booking" ? "border-brand/50 bg-brand-soft/40" : "bg-card")}>
                <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", s.chip, "no-underline")}>{it.status}</span>
                <p className={cn("mt-1.5 font-medium leading-snug", it.kind === "cancelled" && "text-muted-foreground line-through")}>{it.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden />{" "}
                  {formatDate(it.startsAt, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {formatTime(it.startsAt)}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden /> {it.place}
                </p>
                {it.tickets !== null && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Ticket className="size-3.5" aria-hidden /> {it.tickets} {it.tickets === 1 ? "ticket" : "tickets"}
                  </p>
                )}
                <Link href={it.href} className="mt-2 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline">
                  {ITEM_ACTION[it.kind]}
                  <span className="sr-only">: {it.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {past ? (
        <p className="mt-4 text-xs text-muted-foreground">This day has passed, so there&apos;s nothing left to book.</p>
      ) : (
        <Button asChild className="mt-5 w-full" variant={items.length ? "outline" : "default"}>
          <Link href={discoverHref}>{items.length ? "Explore experiences on this day" : "Discover experiences for this day"}</Link>
        </Button>
      )}
    </section>
  );
}

async function Calendar({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const { guest } = await requireGuest("/calendar");
  const now = await requestNow();
  const today = isoDateNY(now);
  const view = sp.view === "week" ? "week" : "month";
  const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  const anchor = isIso(sp.date) ? sp.date : isIso(sp.day) ? sp.day : today;

  const days = view === "month" ? monthGrid(anchor).flat() : weekDays(anchor);
  const from = nyDateTime(days[0]);
  const to = nyDateTime(addDaysIso(days[days.length - 1], 1));
  const [items, sharing] = await Promise.all([getCalendarItems(guest.id, from, to), getSharingSettings(guest.id, now)]);
  const byDate = new Map<string, CalendarItem[]>();
  for (const it of items) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);

  const prev = view === "month" ? addMonthsIso(anchor, -1) : addDaysIso(anchor, -7);
  const next = view === "month" ? addMonthsIso(anchor, 1) : addDaysIso(anchor, 7);
  const title =
    view === "month"
      ? formatDate(nyDateTime(anchor, 12), { month: "long", year: "numeric" })
      : `${formatDate(nyDateTime(days[0], 12), { month: "short", day: "numeric" })} – ${formatDate(nyDateTime(days[6], 12), { month: "short", day: "numeric", year: "numeric" })}`;
  const link = (patch: Record<string, string>) => `/calendar?${new URLSearchParams({ view, date: anchor, ...patch })}`;
  // The selected day: chosen by the guest, else today when it's in view.
  const selected = isIso(sp.day) ? sp.day : days.includes(today) ? today : null;
  const selectedItems = selected
    ? (byDate.get(selected) ?? (selected >= days[0] && selected <= days[days.length - 1] ? [] : await getCalendarItems(guest.id, nyDateTime(selected), nyDateTime(addDaysIso(selected, 1)))))
    : [];
  const selectHref = (d: string) => `${link({ day: d })}#selected-day`;
  const dayName = (d: string) =>
    formatDate(nyDateTime(d, 12), {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const shareUrl = sharing.pref?.shareToken ? `/c/${sharing.pref.shareToken}` : null;

  return (
    <>
      <ReminderBanners guestId={guest.id} now={now} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Your plans</p>
          <h1 className="text-4xl sm:text-5xl">Calendar</h1>
        </div>
        <Button asChild variant="outline">
          <a href="/api/calendar/me.ics" download>
            <CalendarPlus aria-hidden /> Export bookings (.ics)
          </a>
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon-sm">
            <Link href={link({ date: prev })} aria-label={view === "month" ? "Previous month" : "Previous week"}>
              <ChevronLeft aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon-sm">
            <Link href={link({ date: next })} aria-label={view === "month" ? "Next month" : "Next week"}>
              <ChevronRight aria-hidden />
            </Link>
          </Button>
          <h2 className="ml-2 font-display text-2xl" aria-live="polite">
            {title}
          </h2>
          <Link href={link({ date: today, day: today })} className="ml-2 text-sm text-brand underline-offset-4 hover:underline">
            Today
          </Link>
        </div>
        <nav aria-label="Calendar view" className="inline-flex rounded-full bg-muted p-1 text-sm">
          {(["month", "week"] as const).map((v) => (
            <Link
              key={v}
              href={link({ view: v, ...(selected ? { date: selected, day: selected } : {}) })}
              aria-current={view === v ? "page" : undefined}
              className={cn("rounded-full px-4 py-1.5 capitalize", view === v ? "bg-card font-medium shadow-soft" : "text-muted-foreground")}
            >
              {v}
            </Link>
          ))}
        </nav>
      </div>
      <Legend />
      <p className="mt-2 text-xs text-muted-foreground">Tap a day to see your plans and explore what&apos;s on.</p>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {view === "month" ? (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft" role="grid" aria-label={title}>
              <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground" role="row">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-2" role="columnheader">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d) => {
                  const list = byDate.get(d) ?? [];
                  const booked = list.some((i) => i.kind === "booking");
                  const isSelected = d === selected;
                  return (
                    <div
                      key={d}
                      role="gridcell"
                      aria-selected={isSelected}
                      className={cn(
                        "relative min-h-20 border-r border-b p-1 last:border-r-0 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
                        !sameMonth(d, anchor) && "bg-muted/30 text-muted-foreground",
                        isSelected && "bg-brand-soft/50 ring-2 ring-brand ring-inset",
                      )}
                    >
                      {/* The whole cell selects the day; event chips sit above it and open the event. */}
                      <Link
                        href={selectHref(d)}
                        className="absolute inset-0 z-0 rounded-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
                        aria-label={`Select ${dayName(d)}${list.length ? `, ${list.length} ${list.length === 1 ? "item" : "items"}` : ""}${booked ? ", booked" : ""}`}
                        aria-current={d === today ? "date" : undefined}
                      />
                      <span className="pointer-events-none relative mb-1 flex items-center gap-1">
                        <span
                          className={cn(
                            "inline-grid size-6 place-items-center rounded-full text-xs",
                            d === today && "bg-foreground font-semibold text-background",
                            isSelected && d !== today && "bg-brand font-semibold text-brand-foreground",
                          )}
                        >
                          {Number(d.slice(8))}
                        </span>
                        {booked && <span aria-hidden className="size-1.5 rounded-full bg-brand" />}
                      </span>
                      <div className="relative z-10 space-y-1">
                        {list.slice(0, 3).map((it) => (
                          <ItemChip key={it.id} item={it} compact />
                        ))}
                        {list.length > 3 && <span className="pointer-events-none block text-[11px] text-muted-foreground">+{list.length - 3} more</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <ol className="grid gap-3 md:grid-cols-7 lg:grid-cols-1 xl:grid-cols-7">
              {days.map((d) => {
                const list = byDate.get(d) ?? [];
                const booked = list.some((i) => i.kind === "booking");
                return (
                  <li key={d} className={cn("rounded-2xl border bg-card p-3 shadow-soft", d === today && "border-foreground", d === selected && "bg-brand-soft/50 ring-2 ring-brand")}>
                    <Link
                      href={selectHref(d)}
                      className="mb-2 flex items-center gap-1.5 rounded text-sm font-medium underline-offset-4 hover:underline"
                      aria-label={`Select ${dayName(d)}${list.length ? `, ${list.length} ${list.length === 1 ? "item" : "items"}` : ""}`}
                      aria-current={d === today ? "date" : undefined}
                    >
                      {formatDate(nyDateTime(d, 12), {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {booked && <span aria-hidden className="size-1.5 rounded-full bg-brand" />}
                    </Link>
                    {list.length ? (
                      <div className="space-y-2">
                        {list.map((it) => (
                          <ItemChip key={it.id} item={it} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nothing planned</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        {selected ? (
          <DayPanel day={selected} items={selectedItems} today={today} />
        ) : (
          <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">Select a day to see your plans and explore experiences on that date.</p>
        )}
      </div>

      <section aria-labelledby="sharing-title" className="mt-12 grid gap-6 rounded-2xl border bg-card p-6 shadow-soft lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 id="sharing-title" className="flex items-center gap-2 text-2xl">
            <Share2 className="size-5 text-brand" aria-hidden /> Share your calendar
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your bookings are private by default. Choose exactly which upcoming events friends can see. Shared pages show the event, date and neighborhood only: never ticket counts, booking
            references, names or emails.
          </p>
          {shareUrl ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm">
                Sharing is <strong>on</strong>. Anyone with this link can see the events you selected:
              </p>
              <code className="block truncate rounded-lg bg-muted px-3 py-2 text-xs" data-testid="share-link">
                {shareUrl}
              </code>
              <ShareButton url={shareUrl} title="My Tastable plans" label="Share link" />
              <form action={setShowTitles} className="flex items-center gap-2 text-sm">
                <input type="checkbox" id="show-titles" name="show" defaultChecked={sharing.pref?.showExperienceTitles} className="size-4 accent-[var(--brand)]" />
                <label htmlFor="show-titles">Show experience titles</label>
                <Button type="submit" variant="ghost" size="sm">
                  Update
                </Button>
              </form>
              <form action={revokeCalendarSharing}>
                <Button type="submit" variant="outline">
                  <Lock aria-hidden /> Revoke link
                </Button>
              </form>
            </div>
          ) : (
            <form action={enableCalendarSharing} className="mt-5">
              <p className="mb-3 text-sm">Sharing is off. {sharing.pref?.revokedAt ? "Your previous link was revoked and no longer works." : ""}</p>
              <Button type="submit">Create a share link</Button>
            </form>
          )}
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold tracking-wide uppercase">Visible on your shared calendar</h3>
          {sharing.sessions.length ? (
            <ul className="divide-y rounded-xl border">
              {sharing.sessions.map((s) => (
                <li key={s.sessionId} className="flex items-center justify-between gap-3 p-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.startsAt)} · {formatTime(s.startsAt)}
                    </span>
                  </span>
                  <form action={toggleSharedSession}>
                    <input type="hidden" name="sessionId" value={s.sessionId} />
                    <Button type="submit" size="sm" variant={s.shared ? "default" : "outline"} aria-pressed={s.shared} aria-label={`${s.shared ? "Hide" : "Show"} ${s.title} on shared calendar`}>
                      {s.shared ? "Shared" : "Private"}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Book an experience to choose what to share.</p>
          )}
        </div>
      </section>
    </>
  );
}
