import {
  boroughKeyForName,
  boroughKeyOf,
  getNeighborhood,
  neighborhoodForName,
  type BoroughKey,
} from "@/lib/domain/neighborhoods";

/**
 * Borough → neighborhood location filter. A borough with no neighborhoods chosen in it matches
 * the whole borough; once neighborhoods are chosen in a borough, only those match. Neighborhoods
 * chosen without their borough still count. Selections in different boroughs combine (OR).
 */
export function resolveLocation(boroughs: readonly string[], neighborhoods: readonly string[]) {
  const hoods = neighborhoods.map(getNeighborhood).filter((n) => !!n);
  const wholeBoroughs = new Set<BoroughKey>();
  for (const b of boroughs as BoroughKey[]) if (!hoods.some((n) => boroughKeyOf(n) === b)) wholeBoroughs.add(b);
  return { wholeBoroughs, hoodKeys: new Set(hoods.map((n) => n.key)) };
}

export function locationMatcher(boroughs: readonly string[], neighborhoods: readonly string[]) {
  if (!boroughs.length && !neighborhoods.length) return () => true;
  const { wholeBoroughs, hoodKeys } = resolveLocation(boroughs, neighborhoods);
  return (venue: { neighborhood: string; borough: string }) => {
    const hood = neighborhoodForName(venue.neighborhood);
    const borough = boroughKeyForName(venue.borough) ?? (hood ? boroughKeyOf(hood) : undefined);
    return (!!borough && wholeBoroughs.has(borough)) || (!!hood && hoodKeys.has(hood.key));
  };
}
