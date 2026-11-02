import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Marks fictional demo content. Required on every seeded host and experience. */
export function SampleBadge({ className, variant = "glass" }: { className?: string; variant?: "glass" | "outline" }) {
  return (
    <Badge variant={variant} className={cn("font-normal", className)} title="Fictional sample content for this prototype">
      Sample listing
    </Badge>
  );
}
