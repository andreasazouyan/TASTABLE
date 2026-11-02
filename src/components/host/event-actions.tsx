"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Copy, Eye, EyeOff, Pencil, Send, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { eventCommandAction, type FormState } from "@/server/actions/host";

const CONFIRM: Record<string, string> = {
  cancel: "Cancel this event? Every upcoming date is cancelled and every guest is fully refunded (simulated). This can't be undone.",
  unpublish: "Unpublish this event? Guests can no longer find or book it. Existing bookings are kept.",
};

function Cmd({ command, label, icon: Icon, variant = "outline", pending }: { command: string; label: string; icon: typeof Send; variant?: "outline" | "ghost" | "brand"; pending: boolean }) {
  return (
    <Button
      type="submit"
      name="command"
      value={command}
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={(e) => {
        if (CONFIRM[command] && !window.confirm(CONFIRM[command])) e.preventDefault();
      }}
    >
      <Icon aria-hidden /> {label}
    </Button>
  );
}

export function EventActions({ id, slug, status }: { id: string; slug: string; status: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(eventCommandAction, null);
  const live = status === "PUBLISHED";
  const cancelled = status === "CANCELLED";

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="experienceId" value={id} />
        {!cancelled && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/host/events/${id}/edit`}>
              <Pencil aria-hidden /> Edit
            </Link>
          </Button>
        )}
        {live && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/experiences/${slug}`}>
              <Eye aria-hidden /> View live
            </Link>
          </Button>
        )}
        {!live && !cancelled && <Cmd pending={pending} command="publish" label="Publish" icon={Send} variant="brand" />}
        {live && <Cmd pending={pending} command="unpublish" label="Unpublish" icon={EyeOff} />}
        <Cmd pending={pending} command="duplicate" label="Duplicate" icon={Copy} variant="ghost" />
        {!cancelled && <Cmd pending={pending} command="cancel" label="Cancel event" icon={XCircle} variant="ghost" />}
      </form>
      {state && (
        <p role="status" className={state.ok ? "text-sm text-[#3f5130]" : "text-sm text-destructive"}>
          {state.message}
        </p>
      )}
    </div>
  );
}
