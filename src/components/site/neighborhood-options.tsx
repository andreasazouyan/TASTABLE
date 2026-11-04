import { BOROUGHS, neighborhoodsIn } from "@/lib/domain/neighborhoods";

/** <option>s for every NYC neighborhood, grouped by borough (the shared location vocabulary). */
export function NeighborhoodOptions() {
  return BOROUGHS.map((b) => (
    <optgroup key={b.key} label={b.name}>
      {neighborhoodsIn(b.key).map((n) => (
        <option key={n.key} value={n.key}>
          {n.name}
        </option>
      ))}
    </optgroup>
  ));
}
