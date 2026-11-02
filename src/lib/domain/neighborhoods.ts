/** NYC neighborhoods with approximate centroids, used for manual location and distance filters. */
export type Neighborhood = { key: string; name: string; borough: string; lat: number; lng: number };

export const NYC_CENTER = { key: "nyc", name: "Anywhere in NYC", borough: "New York City", lat: 40.7306, lng: -73.9866 };

export const NEIGHBORHOODS: readonly Neighborhood[] = [
  { key: "west-village", name: "West Village", borough: "Manhattan", lat: 40.7358, lng: -74.0036 },
  { key: "east-village", name: "East Village", borough: "Manhattan", lat: 40.7265, lng: -73.9815 },
  { key: "lower-east-side", name: "Lower East Side", borough: "Manhattan", lat: 40.715, lng: -73.9843 },
  { key: "soho", name: "SoHo", borough: "Manhattan", lat: 40.7233, lng: -74.003 },
  { key: "tribeca", name: "Tribeca", borough: "Manhattan", lat: 40.7163, lng: -74.0086 },
  { key: "chelsea", name: "Chelsea", borough: "Manhattan", lat: 40.7465, lng: -74.0014 },
  { key: "flatiron", name: "Flatiron", borough: "Manhattan", lat: 40.7411, lng: -73.9897 },
  { key: "harlem", name: "Harlem", borough: "Manhattan", lat: 40.8116, lng: -73.9465 },
  { key: "williamsburg", name: "Williamsburg", borough: "Brooklyn", lat: 40.7081, lng: -73.9571 },
  { key: "greenpoint", name: "Greenpoint", borough: "Brooklyn", lat: 40.7304, lng: -73.9515 },
  { key: "bushwick", name: "Bushwick", borough: "Brooklyn", lat: 40.6958, lng: -73.9171 },
  { key: "dumbo", name: "DUMBO", borough: "Brooklyn", lat: 40.7033, lng: -73.9881 },
  { key: "fort-greene", name: "Fort Greene", borough: "Brooklyn", lat: 40.6892, lng: -73.9742 },
  { key: "park-slope", name: "Park Slope", borough: "Brooklyn", lat: 40.671, lng: -73.9814 },
  { key: "red-hook", name: "Red Hook", borough: "Brooklyn", lat: 40.6734, lng: -74.0083 },
  { key: "long-island-city", name: "Long Island City", borough: "Queens", lat: 40.7447, lng: -73.9485 },
  { key: "astoria", name: "Astoria", borough: "Queens", lat: 40.7644, lng: -73.9235 },
  { key: "flushing", name: "Flushing", borough: "Queens", lat: 40.7675, lng: -73.833 },
  { key: "mott-haven", name: "Mott Haven", borough: "The Bronx", lat: 40.8091, lng: -73.9229 },
] as const;

export function getNeighborhood(key: string | null | undefined): Neighborhood | undefined {
  return NEIGHBORHOODS.find((n) => n.key === key);
}

export function getNeighborhoodByName(name: string): Neighborhood | undefined {
  return NEIGHBORHOODS.find((n) => n.name === name);
}

/** Great-circle distance in miles. */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const TRAVEL_RADII = [
  { value: 2, label: "2 miles", hint: "A short walk or ride" },
  { value: 5, label: "5 miles", hint: "Across a borough or two" },
  { value: 10, label: "10 miles", hint: "Happy to travel" },
  { value: null, label: "Anywhere in NYC", hint: "Distance doesn't matter" },
] as const;
