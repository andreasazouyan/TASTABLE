import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "Confirmed", cls: "bg-[#e5eddc] text-[#3f5130]" },
  COMPLETED: { label: "Attended", cls: "bg-muted text-muted-foreground" },
  PENDING: { label: "Pending", cls: "bg-secondary text-foreground" },
  CANCELLED: { label: "Cancelled", cls: "bg-foreground text-background" },
  WAITING: { label: "On waitlist", cls: "bg-brand-soft text-accent-foreground" },
  NOTIFIED: { label: "Seats opened up", cls: "bg-brand text-brand-foreground" },
  VALID: { label: "Valid", cls: "bg-[#e5eddc] text-[#3f5130]" },
  CHECKED_IN: { label: "Checked in", cls: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, className, label }: { status: string; className?: string; label?: string }) {
  const s = STYLES[status] ?? { label: status, cls: "bg-muted" };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", s.cls, className)}>{label ?? s.label}</span>;
}
