"use client";

import { useActionState } from "react";
import { RotateCcw, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resetReginasTableAction, type ResetState } from "@/server/actions/reginas-table";

/** Developer-only control (rendered only when demo tools are enabled). */
export function ReginaResetPanel({ className }: { className?: string }) {
  const [state, action, pending] = useActionState<ResetState>(resetReginasTableAction, null);
  return (
    <form action={action} className={cn("rounded-2xl border border-dashed bg-muted/40 p-4 text-sm", className)} data-testid="regina-reset">
      <p className="flex items-center gap-1.5 font-medium">
        <Wrench className="size-4 text-muted-foreground" aria-hidden /> Developer only
      </p>
      <p className="mt-1 text-muted-foreground">Restores 6 available seats and clears only the reservations made during the demo.</p>
      <Button type="submit" variant="outline" size="sm" className="mt-3" disabled={pending}>
        <RotateCcw aria-hidden /> {pending ? "Resetting…" : "Reset demo event"}
      </Button>
      {state && (
        <p role="status" className={cn("mt-2", state.ok ? "text-foreground" : "text-destructive")}>
          {state.message}
        </p>
      )}
    </form>
  );
}
