/**
 * Minimal RFC 5545 iCalendar writer for confirmed bookings and shared calendars.
 * Lines use CRLF, text is escaped, and long lines are folded at 75 octets.
 */
export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  status?: "CONFIRMED" | "CANCELLED" | "TENTATIVE";
  /** Bumped when an event changes (e.g. cancelled) so calendar apps update it. */
  sequence?: number;
};

export function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function formatIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Folds a content line to 75 octets per RFC 5545 §3.1 (continuation lines start with a space). */
export function foldLine(line: string) {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74;
    if (bytes.encode(current + ch).length > limit) {
      out.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(events: IcsEvent[], opts: { name: string; now: Date }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tastable//Prototype//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${formatIcsDate(opts.now)}`,
      `DTSTART:${formatIcsDate(e.start)}`,
      `DTEND:${formatIcsDate(e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push(`STATUS:${e.status ?? "CONFIRMED"}`, `SEQUENCE:${e.sequence ?? 0}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
