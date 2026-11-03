import { Star } from "lucide-react";

import { ratingLabel, starFills } from "@/lib/reviews";
import { cn } from "@/lib/utils";

/**
 * Five star outlines filled to the host's average verified rating, with "4.7 (23 reviews)" or
 * "New host". The numbers always come from ratingSummary/getHostRatings; nothing is estimated.
 */
export function HostRating({ rating, size = "sm", className }: { rating: { average: number | null; count: number }; size?: "sm" | "md"; className?: string }) {
  const fills = starFills(rating.average);
  const label = ratingLabel(rating);
  const star = size === "md" ? "size-4" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex" role="img" aria-label={rating.average === null ? "No reviews yet" : `Rated ${rating.average.toFixed(1)} out of 5`}>
        {fills.map((f, i) => (
          <span key={i} className={cn("relative inline-block", star)}>
            <Star className={cn("absolute inset-0 text-brand/40", star)} aria-hidden />
            {f > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${f * 100}%` }}>
                <Star className={cn("fill-brand text-brand", star)} aria-hidden />
              </span>
            )}
          </span>
        ))}
      </span>
      <span className={cn("text-muted-foreground", size === "md" ? "text-sm" : "text-xs")}>{label}</span>
    </span>
  );
}
