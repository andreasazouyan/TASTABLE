"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";

import { inputClass } from "@/components/host/field";
import { Button } from "@/components/ui/button";
import { REVIEW_MAX_LENGTH, REVIEW_MIN_LENGTH } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { editReviewAction, submitReviewAction } from "@/server/actions/reviews";

const WORDS = ["Poor", "Fair", "Good", "Great", "Excellent"];

/** Five stars as a native radio group: keyboard and screen-reader friendly. */
export function StarInput({ name, label, value, onChange, optional }: { name: string; label: string; value: number | null; onChange: (v: number | null) => void; optional?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden className="w-28 text-sm font-medium">
        {label}
        {optional && <span className="block text-xs font-normal text-muted-foreground">Optional</span>}
      </span>
      <span className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" aria-label={`${label}: ${n} of 5 (${WORDS[n - 1]})`} />
            <Star className={cn("size-7 transition-colors peer-focus-visible:rounded peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40", n <= shown ? "fill-brand text-brand" : "text-brand/40")} aria-hidden />
          </label>
        ))}
      </span>
      <span className="min-w-16 text-sm text-muted-foreground" aria-live="polite">
        {value ? WORDS[value - 1] : optional ? "" : "Required"}
      </span>
      {optional && value !== null && (
        <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => onChange(null)}>
          Clear {label.toLowerCase()}
        </button>
      )}
    </fieldset>
  );
}

type Value = { rating: number | null; body: string; foodRating: number | null; atmosphereRating: number | null; organizationRating: number | null; valueRating: number | null };

/** Leave or edit a verified review. The server re-checks eligibility and ownership. */
export function ReviewForm({ mode, bookingId, reviewId, initial, eventHref }: { mode: "create" | "edit"; bookingId?: string; reviewId?: string; initial?: Partial<Value>; eventHref: string }) {
  const [v, setV] = useState<Value>({ rating: null, body: "", foodRating: null, atmosphereRating: null, organizationRating: null, valueRating: null, ...initial });
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Value>(k: K, x: Value[K]) => setV((p) => ({ ...p, [k]: x }));
  const length = v.body.trim().length;
  const problem = !v.rating ? "Choose an overall rating." : length < REVIEW_MIN_LENGTH ? `Write at least ${REVIEW_MIN_LENGTH} characters.` : null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (problem) {
          setResult({ ok: false, message: problem });
          return;
        }
        start(async () => {
          const res = mode === "create" ? await submitReviewAction(bookingId!, v) : await editReviewAction(reviewId!, v);
          setResult(res);
        });
      }}
    >
      <div className="space-y-3 rounded-2xl border bg-card p-5">
        <StarInput name="rating" label="Overall" value={v.rating} onChange={(x) => set("rating", x)} />
        <div className="space-y-2 border-t pt-3">
          <StarInput name="food" label="Food" optional value={v.foodRating} onChange={(x) => set("foodRating", x)} />
          <StarInput name="atmosphere" label="Atmosphere" optional value={v.atmosphereRating} onChange={(x) => set("atmosphereRating", x)} />
          <StarInput name="organization" label="Organization" optional value={v.organizationRating} onChange={(x) => set("organizationRating", x)} />
          <StarInput name="value" label="Value" optional value={v.valueRating} onChange={(x) => set("valueRating", x)} />
        </div>
      </div>
      <div>
        <label htmlFor="review-body" className="mb-2 block font-medium">
          Your review
        </label>
        <textarea
          id="review-body"
          rows={6}
          maxLength={REVIEW_MAX_LENGTH}
          className={cn(inputClass, "h-auto py-3")}
          value={v.body}
          placeholder="What made it memorable? How were the food, the host and the group?"
          onChange={(e) => set("body", e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {length} / {REVIEW_MAX_LENGTH} characters. Your first name and the date you attended are shown with your review.
        </p>
      </div>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={cn("rounded-xl px-4 py-3 text-sm", result.ok ? "bg-[#e5eddc] text-[#3f5130]" : "bg-destructive/10 text-destructive")}>
          {result.message}{" "}
          {result.ok && (
            <Link href={eventHref} className="font-medium underline underline-offset-4">
              See it on the event page
            </Link>
          )}
        </p>
      )}
      <Button type="submit" variant="brand" disabled={pending || (mode === "create" && !!result?.ok)}>
        {pending ? "Saving…" : mode === "create" ? "Post review" : "Save changes"}
      </Button>
    </form>
  );
}
