"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Uses the native share sheet where available, otherwise copies the link. */
export function ShareButton({ url, title, text, variant = "outline", label = "Share" }: { url: string; title: string; text?: string; variant?: "outline" | "ghost" | "default"; label?: string }) {
  const [copied, setCopied] = useState(false);
  const absolute = () => (url.startsWith("http") ? url : `${window.location.origin}${url}`);

  async function copy() {
    try {
      await navigator.clipboard.writeText(absolute());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", absolute());
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ url: absolute(), title, text });
        return;
      } catch {
        /* cancelled: fall back to copy */
      }
    }
    await copy();
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant={variant} onClick={share}>
        <Share2 aria-hidden />
        {label}
      </Button>
      <Button type="button" variant="ghost" onClick={copy} aria-label="Copy link">
        {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
        <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
      </Button>
    </div>
  );
}
