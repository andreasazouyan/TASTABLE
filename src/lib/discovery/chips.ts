import { CATEGORIES } from "@/lib/domain/categories";
import { boroughKeyOf, getBorough, getNeighborhood } from "@/lib/domain/neighborhoods";
import { cuisineLabel, FORMATS, HOST_TYPES, occasionLabel } from "@/lib/domain/taxonomy";
import { COLLECTIONS, filtersToQuery, type DiscoveryFilters } from "@/lib/discovery/filters";
import { WHEN_OPTIONS } from "@/lib/discovery/dates";
import { resolveLocation } from "@/lib/discovery/location";
import { formatDate } from "@/lib/format";
import { nyDateTime } from "@/lib/clock";

export type Chip = { label: string; href: string };

/** Removable "active filter" chips; `base` is the page they link back to (Discover or host Explore). */
export function chipsFor(f: DiscoveryFilters, base: string): Chip[] {
  const without = (patch: Partial<DiscoveryFilters>) => {
    const qs = filtersToQuery({ ...f, ...patch });
    return qs ? `${base}?${qs}` : base;
  };
  const chips: Chip[] = [];
  if (f.collection) chips.push({ label: COLLECTIONS.find((c) => c.key === f.collection)!.title, href: without({ collection: undefined }) });
  if (f.q) chips.push({ label: `“${f.q}”`, href: without({ q: undefined }) });
  const { wholeBoroughs } = resolveLocation(f.borough, f.neighborhood);
  for (const b of wholeBoroughs) chips.push({ label: getBorough(b)!.name, href: without({ borough: f.borough.filter((x) => x !== b) }) });
  for (const k of f.neighborhood) {
    const n = getNeighborhood(k)!;
    chips.push({ label: n.name, href: without({ neighborhood: f.neighborhood.filter((x) => x !== k), borough: f.borough.filter((x) => x !== boroughKeyOf(n) || f.neighborhood.some((y) => y !== k && boroughKeyOf(getNeighborhood(y)!) === x)) }) });
  }
  if (f.near) chips.push({ label: `Near ${getNeighborhood(f.near)!.name}`, href: without({ near: undefined, within: undefined }) });
  if (f.near && f.within) chips.push({ label: `Within ${f.within} mi`, href: without({ within: undefined }) });
  const dateLabel = (iso: string) => formatDate(nyDateTime(iso, 12), { weekday: "short", month: "short", day: "numeric" });
  const noDates = { when: undefined, date: undefined, from: undefined, to: undefined };
  if (f.when && f.when !== "custom") chips.push({ label: WHEN_OPTIONS.find((o) => o.key === f.when)!.label, href: without(noDates) });
  else if (f.when === "custom") {
    const first = f.from ?? f.to ?? f.date;
    const last = f.from && f.to && f.to > f.from ? f.to : null;
    if (first) chips.push({ label: last ? `${dateLabel(first)} – ${dateLabel(last)}` : `Date: ${dateLabel(first)}`, href: without(noDates) });
  } else {
    if (f.date) chips.push({ label: `Date: ${dateLabel(f.date)}`, href: without({ date: undefined }) });
    else if (f.from && f.to && f.to >= f.from) chips.push({ label: `Dates: ${dateLabel(f.from)} – ${dateLabel(f.to)}`, href: without(noDates) });
    else {
      if (f.from) chips.push({ label: `From ${dateLabel(f.from)}`, href: without({ from: undefined }) });
      if (f.to) chips.push({ label: `Until ${dateLabel(f.to)}`, href: without({ to: undefined }) });
    }
  }
  for (const slug of f.category)
    chips.push({ label: CATEGORIES.find((c) => c.slug === slug)!.shortName, href: without({ category: f.category.filter((x) => x !== slug) }) });
  for (const k of f.cuisine) chips.push({ label: cuisineLabel(k), href: without({ cuisine: f.cuisine.filter((x) => x !== k) }) });
  for (const k of f.occasion) chips.push({ label: occasionLabel(k), href: without({ occasion: f.occasion.filter((x) => x !== k) }) });
  for (const k of f.host) chips.push({ label: HOST_TYPES[k].label, href: without({ host: f.host.filter((x) => x !== k) }) });
  for (const k of f.format) chips.push({ label: FORMATS[k], href: without({ format: f.format.filter((x) => x !== k) }) });
  if (f.minPrice !== undefined) chips.push({ label: `From $${f.minPrice}`, href: without({ minPrice: undefined }) });
  if (f.maxPrice !== undefined) chips.push({ label: `Up to $${f.maxPrice}`, href: without({ maxPrice: undefined }) });
  if (f.spots) chips.push({ label: `${f.spots}+ spots`, href: without({ spots: undefined }) });
  return chips;
}
