import { describe, expect, it } from "vitest";

import { buildIcs, escapeText, foldLine } from "@/lib/calendar/ics";

describe("iCalendar export", () => {
  const ics = buildIcs(
    [
      {
        uid: "bkg-1@tastable.demo",
        start: new Date("2026-11-06T23:30:00Z"),
        end: new Date("2026-11-07T02:00:00Z"),
        summary: "Chef's table; omakase, counter seats",
        description: "Line one\nLine two",
        location: "Fictional venue, Brooklyn",
      },
      { uid: "bkg-2@tastable.demo", start: new Date("2026-11-08T17:00:00Z"), end: new Date("2026-11-08T19:00:00Z"), summary: "Cancelled class", status: "CANCELLED", sequence: 1 },
    ],
    { name: "My Tastable", now: new Date("2026-11-02T17:00:00Z") },
  );

  it("has a valid calendar envelope with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("\r\n").every((l) => !l.includes("\n"))).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(2);
  });
  it("writes UTC timestamps", () => {
    expect(ics).toContain("DTSTART:20261106T233000Z");
    expect(ics).toContain("DTSTAMP:20261102T170000Z");
  });
  it("escapes commas, semicolons and newlines", () => {
    expect(escapeText("a,b;c\nd\\e")).toBe("a\\,b\\;c\\nd\\\\e");
    expect(ics).toContain("SUMMARY:Chef's table\\; omakase\\, counter seats");
  });
  it("marks cancelled events so calendar apps update them", () => {
    expect(ics).toContain("STATUS:CANCELLED\r\nSEQUENCE:1");
  });
  it("folds lines longer than 75 octets", () => {
    const folded = foldLine(`DESCRIPTION:${"x".repeat(200)}`);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(2);
    expect(parts.every((p) => new TextEncoder().encode(p).length <= 75)).toBe(true);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
  });
});
