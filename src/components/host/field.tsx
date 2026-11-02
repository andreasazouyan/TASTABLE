import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-invalid:border-destructive";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string[] | string;
  children: React.ReactNode;
  className?: string;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !msg && <p className="text-xs text-muted-foreground">{hint}</p>}
      {msg && <p className="text-xs text-destructive">{msg}</p>}
    </div>
  );
}
