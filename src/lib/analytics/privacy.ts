/**
 * Privacy rules for host-facing audience insights (k-anonymity style thresholds).
 *
 * - Hosts only ever receive COUNTS of guests, never ids, names, emails or per-guest rows.
 * - A segment (the audience after filters) smaller than MIN_SEGMENT_SIZE shows no breakdowns at
 *   all, and its size is reported as "fewer than N", so narrowing filters can't single anyone out.
 * - Within a segment, any option chosen by fewer than MIN_BUCKET_SIZE guests is suppressed; only the
 *   number of hidden options is reported. That includes custom dish names, so a unique free-text
 *   entry can never be shown.
 * - Cross-tab cells (heatmap, dish × neighborhood) follow the same bucket rule.
 */
export const MIN_SEGMENT_SIZE = 10;
export const MIN_BUCKET_SIZE = 5;

export type Bucket = { key: string; guests: number; share: number };
export type BucketList = { buckets: Bucket[]; suppressedOptions: number };

/** Applies the bucket threshold and computes share of the segment. Sorted by guests, then key. */
export function safeBuckets(rows: { key: string; guests: number }[], segmentSize: number): BucketList {
  const visible = rows.filter((r) => r.guests >= MIN_BUCKET_SIZE);
  return {
    buckets: visible
      .map((r) => ({ key: r.key, guests: r.guests, share: segmentSize ? r.guests / segmentSize : 0 }))
      .sort((a, b) => b.guests - a.guests || a.key.localeCompare(b.key)),
    suppressedOptions: rows.length - visible.length,
  };
}

/** A count that may be shown, or null when it is under the bucket threshold. */
export function safeCount(guests: number): number | null {
  return guests >= MIN_BUCKET_SIZE ? guests : null;
}

export function segmentAllowed(size: number) {
  return size >= MIN_SEGMENT_SIZE;
}

/** How to talk about a segment size without revealing small numbers. */
export function describeSegmentSize(size: number) {
  return segmentAllowed(size) ? `${size} guests` : `fewer than ${MIN_SEGMENT_SIZE} guests`;
}
