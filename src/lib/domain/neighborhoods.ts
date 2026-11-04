/**
 * The one NYC location vocabulary: five boroughs and their neighborhoods, used by onboarding,
 * host forms (venues, home neighborhood, venue requests), event cards and details, and the
 * Discover location filter. Venues store the neighborhood's `name` and the borough's `name`;
 * `neighborhoodForName` resolves stored names (and older spellings in `aliases`) back to a key.
 * Coordinates are approximate neighborhood centroids, used only for "travel distance".
 */
export type BoroughName = "Manhattan" | "Brooklyn" | "Queens" | "The Bronx" | "Staten Island";
export type Neighborhood = { key: string; name: string; borough: BoroughName; lat: number; lng: number; aliases?: readonly string[] };

export const BOROUGHS = [
  { key: "manhattan", name: "Manhattan" },
  { key: "brooklyn", name: "Brooklyn" },
  { key: "queens", name: "Queens" },
  { key: "bronx", name: "The Bronx" },
  { key: "staten-island", name: "Staten Island" },
] as const satisfies readonly { key: string; name: BoroughName }[];
export type BoroughKey = (typeof BOROUGHS)[number]["key"];
export const BOROUGH_KEYS = BOROUGHS.map((b) => b.key) as BoroughKey[];

export const NYC_CENTER = { key: "nyc", name: "Anywhere in NYC", borough: "New York City", lat: 40.7306, lng: -73.9866 };

export const NEIGHBORHOODS: readonly Neighborhood[] = [
  // Manhattan
  { key: "financial-district", name: "Financial District", borough: "Manhattan", lat: 40.7075, lng: -74.0113 },
  { key: "battery-park-city", name: "Battery Park City", borough: "Manhattan", lat: 40.7115, lng: -74.0160 },
  { key: "tribeca", name: "Tribeca", borough: "Manhattan", lat: 40.7163, lng: -74.0086 },
  { key: "soho", name: "SoHo", borough: "Manhattan", lat: 40.7233, lng: -74.0030 },
  { key: "noho", name: "NoHo", borough: "Manhattan", lat: 40.7262, lng: -73.9930 },
  { key: "nolita", name: "Nolita", borough: "Manhattan", lat: 40.7229, lng: -73.9955 },
  { key: "little-italy", name: "Little Italy", borough: "Manhattan", lat: 40.7191, lng: -73.9973 },
  { key: "chinatown", name: "Chinatown", borough: "Manhattan", lat: 40.7158, lng: -73.9970 },
  { key: "two-bridges", name: "Two Bridges", borough: "Manhattan", lat: 40.7108, lng: -73.9905 },
  { key: "lower-east-side", name: "Lower East Side", borough: "Manhattan", lat: 40.7150, lng: -73.9843 },
  { key: "east-village", name: "East Village", borough: "Manhattan", lat: 40.7265, lng: -73.9815 },
  { key: "west-village", name: "West Village", borough: "Manhattan", lat: 40.7358, lng: -74.0036 },
  { key: "greenwich-village", name: "Greenwich Village", borough: "Manhattan", lat: 40.7336, lng: -73.9976 },
  { key: "meatpacking-district", name: "Meatpacking District", borough: "Manhattan", lat: 40.7409, lng: -74.0080 },
  { key: "chelsea", name: "Chelsea", borough: "Manhattan", lat: 40.7465, lng: -74.0014 },
  { key: "flatiron", name: "Flatiron District", borough: "Manhattan", lat: 40.7411, lng: -73.9897, aliases: ["Flatiron"] },
  { key: "union-square", name: "Union Square", borough: "Manhattan", lat: 40.7359, lng: -73.9911 },
  { key: "gramercy", name: "Gramercy", borough: "Manhattan", lat: 40.7368, lng: -73.9845 },
  { key: "stuyvesant-town", name: "Stuyvesant Town", borough: "Manhattan", lat: 40.7316, lng: -73.9780 },
  { key: "kips-bay", name: "Kips Bay", borough: "Manhattan", lat: 40.7420, lng: -73.9780 },
  { key: "nomad", name: "NoMad", borough: "Manhattan", lat: 40.7450, lng: -73.9880 },
  { key: "koreatown", name: "Koreatown", borough: "Manhattan", lat: 40.7477, lng: -73.9869 },
  { key: "murray-hill", name: "Murray Hill", borough: "Manhattan", lat: 40.7479, lng: -73.9757 },
  { key: "midtown", name: "Midtown", borough: "Manhattan", lat: 40.7549, lng: -73.9840 },
  { key: "midtown-east", name: "Midtown East", borough: "Manhattan", lat: 40.7540, lng: -73.9700 },
  { key: "midtown-west", name: "Midtown West", borough: "Manhattan", lat: 40.7590, lng: -73.9890 },
  { key: "garment-district", name: "Garment District", borough: "Manhattan", lat: 40.7527, lng: -73.9903 },
  { key: "times-square", name: "Times Square", borough: "Manhattan", lat: 40.7580, lng: -73.9855 },
  { key: "hells-kitchen", name: "Hell's Kitchen", borough: "Manhattan", lat: 40.7638, lng: -73.9918, aliases: ["Hells Kitchen"] },
  { key: "hudson-yards", name: "Hudson Yards", borough: "Manhattan", lat: 40.7539, lng: -74.0005 },
  { key: "sutton-place", name: "Sutton Place", borough: "Manhattan", lat: 40.7577, lng: -73.9615 },
  { key: "roosevelt-island", name: "Roosevelt Island", borough: "Manhattan", lat: 40.7620, lng: -73.9500 },
  { key: "lenox-hill", name: "Lenox Hill", borough: "Manhattan", lat: 40.7660, lng: -73.9600 },
  { key: "upper-east-side", name: "Upper East Side", borough: "Manhattan", lat: 40.7736, lng: -73.9566 },
  { key: "yorkville", name: "Yorkville", borough: "Manhattan", lat: 40.7762, lng: -73.9492 },
  { key: "carnegie-hill", name: "Carnegie Hill", borough: "Manhattan", lat: 40.7845, lng: -73.9550 },
  { key: "lincoln-square", name: "Lincoln Square", borough: "Manhattan", lat: 40.7740, lng: -73.9850 },
  { key: "upper-west-side", name: "Upper West Side", borough: "Manhattan", lat: 40.7870, lng: -73.9754 },
  { key: "manhattan-valley", name: "Manhattan Valley", borough: "Manhattan", lat: 40.7975, lng: -73.9665 },
  { key: "morningside-heights", name: "Morningside Heights", borough: "Manhattan", lat: 40.8090, lng: -73.9620 },
  { key: "harlem", name: "Harlem", borough: "Manhattan", lat: 40.8116, lng: -73.9465 },
  { key: "east-harlem", name: "East Harlem", borough: "Manhattan", lat: 40.7957, lng: -73.9389 },
  { key: "hamilton-heights", name: "Hamilton Heights", borough: "Manhattan", lat: 40.8240, lng: -73.9490 },
  { key: "washington-heights", name: "Washington Heights", borough: "Manhattan", lat: 40.8417, lng: -73.9394 },
  { key: "inwood", name: "Inwood", borough: "Manhattan", lat: 40.8677, lng: -73.9212 },
  // Brooklyn
  { key: "williamsburg", name: "Williamsburg", borough: "Brooklyn", lat: 40.7081, lng: -73.9571 },
  { key: "east-williamsburg", name: "East Williamsburg", borough: "Brooklyn", lat: 40.7140, lng: -73.9370 },
  { key: "greenpoint", name: "Greenpoint", borough: "Brooklyn", lat: 40.7304, lng: -73.9515 },
  { key: "bushwick", name: "Bushwick", borough: "Brooklyn", lat: 40.6958, lng: -73.9171 },
  { key: "dumbo", name: "DUMBO", borough: "Brooklyn", lat: 40.7033, lng: -73.9881, aliases: ["Dumbo"] },
  { key: "vinegar-hill", name: "Vinegar Hill", borough: "Brooklyn", lat: 40.7037, lng: -73.9823 },
  { key: "brooklyn-heights", name: "Brooklyn Heights", borough: "Brooklyn", lat: 40.6960, lng: -73.9933 },
  { key: "downtown-brooklyn", name: "Downtown Brooklyn", borough: "Brooklyn", lat: 40.6930, lng: -73.9870 },
  { key: "cobble-hill", name: "Cobble Hill", borough: "Brooklyn", lat: 40.6860, lng: -73.9960 },
  { key: "boerum-hill", name: "Boerum Hill", borough: "Brooklyn", lat: 40.6848, lng: -73.9845 },
  { key: "carroll-gardens", name: "Carroll Gardens", borough: "Brooklyn", lat: 40.6795, lng: -73.9991 },
  { key: "red-hook", name: "Red Hook", borough: "Brooklyn", lat: 40.6734, lng: -74.0083 },
  { key: "gowanus", name: "Gowanus", borough: "Brooklyn", lat: 40.6733, lng: -73.9900 },
  { key: "park-slope", name: "Park Slope", borough: "Brooklyn", lat: 40.6710, lng: -73.9814 },
  { key: "fort-greene", name: "Fort Greene", borough: "Brooklyn", lat: 40.6892, lng: -73.9742 },
  { key: "clinton-hill", name: "Clinton Hill", borough: "Brooklyn", lat: 40.6890, lng: -73.9660 },
  { key: "prospect-heights", name: "Prospect Heights", borough: "Brooklyn", lat: 40.6775, lng: -73.9692 },
  { key: "bedford-stuyvesant", name: "Bedford-Stuyvesant", borough: "Brooklyn", lat: 40.6872, lng: -73.9418, aliases: ["Bed-Stuy", "Bedford Stuyvesant"] },
  { key: "crown-heights", name: "Crown Heights", borough: "Brooklyn", lat: 40.6694, lng: -73.9422 },
  { key: "prospect-lefferts-gardens", name: "Prospect Lefferts Gardens", borough: "Brooklyn", lat: 40.6590, lng: -73.9510 },
  { key: "windsor-terrace", name: "Windsor Terrace", borough: "Brooklyn", lat: 40.6540, lng: -73.9750 },
  { key: "kensington", name: "Kensington", borough: "Brooklyn", lat: 40.6390, lng: -73.9730 },
  { key: "flatbush", name: "Flatbush", borough: "Brooklyn", lat: 40.6410, lng: -73.9590 },
  { key: "ditmas-park", name: "Ditmas Park", borough: "Brooklyn", lat: 40.6363, lng: -73.9620 },
  { key: "east-flatbush", name: "East Flatbush", borough: "Brooklyn", lat: 40.6490, lng: -73.9300 },
  { key: "midwood", name: "Midwood", borough: "Brooklyn", lat: 40.6200, lng: -73.9590 },
  { key: "borough-park", name: "Borough Park", borough: "Brooklyn", lat: 40.6330, lng: -73.9960 },
  { key: "sunset-park", name: "Sunset Park", borough: "Brooklyn", lat: 40.6455, lng: -74.0124 },
  { key: "bay-ridge", name: "Bay Ridge", borough: "Brooklyn", lat: 40.6264, lng: -74.0299 },
  { key: "dyker-heights", name: "Dyker Heights", borough: "Brooklyn", lat: 40.6210, lng: -74.0090 },
  { key: "bensonhurst", name: "Bensonhurst", borough: "Brooklyn", lat: 40.6020, lng: -73.9940 },
  { key: "sheepshead-bay", name: "Sheepshead Bay", borough: "Brooklyn", lat: 40.5860, lng: -73.9540 },
  { key: "brighton-beach", name: "Brighton Beach", borough: "Brooklyn", lat: 40.5776, lng: -73.9614 },
  { key: "coney-island", name: "Coney Island", borough: "Brooklyn", lat: 40.5755, lng: -73.9707 },
  { key: "canarsie", name: "Canarsie", borough: "Brooklyn", lat: 40.6400, lng: -73.9000 },
  // Queens
  { key: "long-island-city", name: "Long Island City", borough: "Queens", lat: 40.7447, lng: -73.9485 },
  { key: "astoria", name: "Astoria", borough: "Queens", lat: 40.7644, lng: -73.9235 },
  { key: "ditmars-steinway", name: "Ditmars-Steinway", borough: "Queens", lat: 40.7750, lng: -73.9120, aliases: ["Ditmars", "Steinway"] },
  { key: "sunnyside", name: "Sunnyside", borough: "Queens", lat: 40.7433, lng: -73.9196 },
  { key: "woodside", name: "Woodside", borough: "Queens", lat: 40.7454, lng: -73.9030 },
  { key: "jackson-heights", name: "Jackson Heights", borough: "Queens", lat: 40.7557, lng: -73.8831 },
  { key: "east-elmhurst", name: "East Elmhurst", borough: "Queens", lat: 40.7610, lng: -73.8650 },
  { key: "elmhurst", name: "Elmhurst", borough: "Queens", lat: 40.7362, lng: -73.8780 },
  { key: "corona", name: "Corona", borough: "Queens", lat: 40.7470, lng: -73.8600 },
  { key: "ridgewood", name: "Ridgewood", borough: "Queens", lat: 40.7043, lng: -73.9018 },
  { key: "maspeth", name: "Maspeth", borough: "Queens", lat: 40.7233, lng: -73.9120 },
  { key: "middle-village", name: "Middle Village", borough: "Queens", lat: 40.7170, lng: -73.8810 },
  { key: "glendale", name: "Glendale", borough: "Queens", lat: 40.7020, lng: -73.8810 },
  { key: "rego-park", name: "Rego Park", borough: "Queens", lat: 40.7260, lng: -73.8620 },
  { key: "forest-hills", name: "Forest Hills", borough: "Queens", lat: 40.7185, lng: -73.8448 },
  { key: "kew-gardens", name: "Kew Gardens", borough: "Queens", lat: 40.7140, lng: -73.8310 },
  { key: "richmond-hill", name: "Richmond Hill", borough: "Queens", lat: 40.6960, lng: -73.8260 },
  { key: "ozone-park", name: "Ozone Park", borough: "Queens", lat: 40.6760, lng: -73.8440 },
  { key: "howard-beach", name: "Howard Beach", borough: "Queens", lat: 40.6570, lng: -73.8440 },
  { key: "jamaica", name: "Jamaica", borough: "Queens", lat: 40.7020, lng: -73.7890 },
  { key: "flushing", name: "Flushing", borough: "Queens", lat: 40.7675, lng: -73.8330 },
  { key: "college-point", name: "College Point", borough: "Queens", lat: 40.7860, lng: -73.8460 },
  { key: "whitestone", name: "Whitestone", borough: "Queens", lat: 40.7920, lng: -73.8100 },
  { key: "fresh-meadows", name: "Fresh Meadows", borough: "Queens", lat: 40.7350, lng: -73.7930 },
  { key: "bayside", name: "Bayside", borough: "Queens", lat: 40.7680, lng: -73.7770 },
  { key: "douglaston", name: "Douglaston", borough: "Queens", lat: 40.7690, lng: -73.7470 },
  { key: "rockaway-beach", name: "Rockaway Beach", borough: "Queens", lat: 40.5860, lng: -73.8160 },
  // The Bronx
  { key: "mott-haven", name: "Mott Haven", borough: "The Bronx", lat: 40.8091, lng: -73.9229 },
  { key: "port-morris", name: "Port Morris", borough: "The Bronx", lat: 40.8010, lng: -73.9100 },
  { key: "melrose", name: "Melrose", borough: "The Bronx", lat: 40.8240, lng: -73.9130 },
  { key: "hunts-point", name: "Hunts Point", borough: "The Bronx", lat: 40.8120, lng: -73.8840 },
  { key: "longwood", name: "Longwood", borough: "The Bronx", lat: 40.8240, lng: -73.8950 },
  { key: "concourse", name: "Concourse", borough: "The Bronx", lat: 40.8320, lng: -73.9200 },
  { key: "highbridge", name: "Highbridge", borough: "The Bronx", lat: 40.8370, lng: -73.9260 },
  { key: "morrisania", name: "Morrisania", borough: "The Bronx", lat: 40.8290, lng: -73.9060 },
  { key: "tremont", name: "Tremont", borough: "The Bronx", lat: 40.8470, lng: -73.8990 },
  { key: "belmont", name: "Belmont (Arthur Avenue)", borough: "The Bronx", lat: 40.8550, lng: -73.8880, aliases: ["Belmont", "Arthur Avenue"] },
  { key: "fordham", name: "Fordham", borough: "The Bronx", lat: 40.8610, lng: -73.8900 },
  { key: "bedford-park", name: "Bedford Park", borough: "The Bronx", lat: 40.8700, lng: -73.8870 },
  { key: "norwood", name: "Norwood", borough: "The Bronx", lat: 40.8770, lng: -73.8790 },
  { key: "kingsbridge", name: "Kingsbridge", borough: "The Bronx", lat: 40.8790, lng: -73.9050 },
  { key: "riverdale", name: "Riverdale", borough: "The Bronx", lat: 40.8990, lng: -73.9090 },
  { key: "soundview", name: "Soundview", borough: "The Bronx", lat: 40.8250, lng: -73.8680 },
  { key: "castle-hill", name: "Castle Hill", borough: "The Bronx", lat: 40.8170, lng: -73.8500 },
  { key: "parkchester", name: "Parkchester", borough: "The Bronx", lat: 40.8370, lng: -73.8600 },
  { key: "morris-park", name: "Morris Park", borough: "The Bronx", lat: 40.8520, lng: -73.8600 },
  { key: "throggs-neck", name: "Throggs Neck", borough: "The Bronx", lat: 40.8190, lng: -73.8170 },
  { key: "pelham-bay", name: "Pelham Bay", borough: "The Bronx", lat: 40.8500, lng: -73.8320 },
  { key: "city-island", name: "City Island", borough: "The Bronx", lat: 40.8470, lng: -73.7860 },
  { key: "co-op-city", name: "Co-op City", borough: "The Bronx", lat: 40.8740, lng: -73.8290 },
  { key: "williamsbridge", name: "Williamsbridge", borough: "The Bronx", lat: 40.8780, lng: -73.8620 },
  { key: "wakefield", name: "Wakefield", borough: "The Bronx", lat: 40.8950, lng: -73.8550 },
  // Staten Island
  { key: "st-george", name: "St. George", borough: "Staten Island", lat: 40.6437, lng: -74.0773, aliases: ["Saint George", "St George"] },
  { key: "tompkinsville", name: "Tompkinsville", borough: "Staten Island", lat: 40.6370, lng: -74.0780 },
  { key: "stapleton", name: "Stapleton", borough: "Staten Island", lat: 40.6270, lng: -74.0770 },
  { key: "rosebank", name: "Rosebank", borough: "Staten Island", lat: 40.6150, lng: -74.0700 },
  { key: "new-brighton", name: "New Brighton", borough: "Staten Island", lat: 40.6420, lng: -74.0920 },
  { key: "west-brighton", name: "West Brighton", borough: "Staten Island", lat: 40.6270, lng: -74.1100 },
  { key: "port-richmond", name: "Port Richmond", borough: "Staten Island", lat: 40.6340, lng: -74.1340 },
  { key: "mariners-harbor", name: "Mariners Harbor", borough: "Staten Island", lat: 40.6360, lng: -74.1590 },
  { key: "grasmere", name: "Grasmere", borough: "Staten Island", lat: 40.6040, lng: -74.0840 },
  { key: "todt-hill", name: "Todt Hill", borough: "Staten Island", lat: 40.6000, lng: -74.1100 },
  { key: "willowbrook", name: "Willowbrook", borough: "Staten Island", lat: 40.6030, lng: -74.1380 },
  { key: "south-beach", name: "South Beach", borough: "Staten Island", lat: 40.5890, lng: -74.0690 },
  { key: "dongan-hills", name: "Dongan Hills", borough: "Staten Island", lat: 40.5880, lng: -74.0960 },
  { key: "new-dorp", name: "New Dorp", borough: "Staten Island", lat: 40.5730, lng: -74.1170 },
  { key: "great-kills", name: "Great Kills", borough: "Staten Island", lat: 40.5540, lng: -74.1510 },
  { key: "eltingville", name: "Eltingville", borough: "Staten Island", lat: 40.5440, lng: -74.1640 },
  { key: "annadale", name: "Annadale", borough: "Staten Island", lat: 40.5400, lng: -74.1780 },
  { key: "tottenville", name: "Tottenville", borough: "Staten Island", lat: 40.5120, lng: -74.2450 },
];

export function getNeighborhood(key: string | null | undefined): Neighborhood | undefined {
  return NEIGHBORHOODS.find((n) => n.key === key);
}

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const BY_NAME = new Map<string, Neighborhood>();
for (const n of NEIGHBORHOODS) for (const label of [n.name, n.key, ...(n.aliases ?? [])]) BY_NAME.set(norm(label), n);

/** Resolves a stored venue neighborhood (canonical name, key or a known older spelling). */
export function neighborhoodForName(name: string | null | undefined): Neighborhood | undefined {
  return name ? BY_NAME.get(norm(name)) : undefined;
}

/** Kept for existing callers; same as `neighborhoodForName`. */
export function getNeighborhoodByName(name: string): Neighborhood | undefined {
  return neighborhoodForName(name);
}

export function getBorough(key: string | null | undefined) {
  return BOROUGHS.find((b) => b.key === key);
}

/** Borough key for a stored borough name ("The Bronx", "Bronx", "brooklyn"...). */
export function boroughKeyForName(name: string | null | undefined): BoroughKey | undefined {
  if (!name) return undefined;
  const n = norm(name).replace(/^the /, "");
  return BOROUGHS.find((b) => norm(b.name).replace(/^the /, "") === n || b.key.replace("-", " ") === n)?.key;
}

export function neighborhoodsIn(borough: BoroughKey) {
  const name = getBorough(borough)!.name;
  return NEIGHBORHOODS.filter((n) => n.borough === name);
}

export function boroughKeyOf(n: Neighborhood): BoroughKey {
  return boroughKeyForName(n.borough)!;
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
