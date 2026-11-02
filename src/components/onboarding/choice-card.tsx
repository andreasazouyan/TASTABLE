import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Visual selection card backed by a real checkbox/radio input (keyboard and screen-reader friendly). */
export function ChoiceCard({
  type,
  name,
  value,
  checked,
  onChange,
  title,
  hint,
  icon,
  className,
}: {
  type: "checkbox" | "radio";
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-1 rounded-2xl border bg-card p-4 text-left transition-[border-color,box-shadow,background-color,transform] duration-200 ease-soft has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 hover:-translate-y-px hover:shadow-soft",
        checked ? "border-foreground bg-card shadow-soft" : "border-border",
        className,
      )}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          "absolute top-3 right-3 grid size-5 place-items-center rounded-full border transition-colors",
          checked ? "border-brand bg-brand text-brand-foreground" : "border-input bg-background",
        )}
      >
        {checked && <Check className="size-3" />}
      </span>
      {icon && <span className="mb-2 text-brand">{icon}</span>}
      <span className="pr-6 font-medium">{title}</span>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
    </label>
  );
}
