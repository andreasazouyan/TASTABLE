"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";

import { inputClass } from "@/components/host/field";
import { Button } from "@/components/ui/button";
import { REPORT_REASONS } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { reportReviewAction } from "@/server/actions/reviews";

/** Report a review for moderation. Reporting never hides it; moderators decide. */
export function ReportReview({ reviewId, signedIn }: { reviewId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  if (result?.ok) return <p role="status" className="text-xs text-muted-foreground">{result.message}</p>;
  if (!open) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={() => (signedIn ? setOpen(true) : setResult({ ok: false, message: "Log in to report a review." }))}
      >
        <Flag className="size-3" aria-hidden /> Report
        {result && !result.ok && <span role="alert"> · {result.message}</span>}
      </button>
    );
  }
  return (
    <form
      className="mt-2 grid gap-2 rounded-xl border bg-background p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await reportReviewAction(reviewId, { reason, details })));
      }}
    >
      <label className="text-xs text-muted-foreground">
        Reason
        <select className={cn(inputClass, "mt-1")} value={reason} onChange={(e) => setReason(e.target.value)} required>
          <option value="" disabled>
            Choose a reason
          </option>
          {REPORT_REASONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted-foreground">
        Details (optional)
        <input className={cn(inputClass, "mt-1")} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
      </label>
      <div className="flex gap-1">
        <Button type="submit" size="sm" disabled={pending || !reason}>
          Send report
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {result && !result.ok && (
        <p role="alert" className="text-xs text-destructive sm:col-span-3">
          {result.message}
        </p>
      )}
    </form>
  );
}
