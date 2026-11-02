"use client";

import { useActionState } from "react";

import { ShareButton } from "@/components/experiences/share-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteFriendAction, type InviteState } from "@/server/actions/sharing";

export function InviteForm({ bookingId, title }: { bookingId: string; title: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteFriendAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="inviteeName">Friend&apos;s name</Label>
          <Input id="inviteeName" name="inviteeName" className="mt-1.5" placeholder="Optional" />
        </div>
        <div>
          <Label htmlFor="inviteeEmail">Friend&apos;s email</Label>
          <Input id="inviteeEmail" name="inviteeEmail" type="email" className="mt-1.5" required />
        </div>
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Input id="message" name="message" className="mt-1.5" placeholder="I have a spare ticket. Want to come?" maxLength={280} />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Creating…" : "Create invitation"}
      </Button>
      {state && (
        <div role="status" className={state.ok ? "rounded-xl bg-muted p-3 text-sm" : "text-sm text-destructive"}>
          <p>{state.message}</p>
          {state.link && (
            <div className="mt-2">
              <ShareButton url={state.link} title={`Join me at ${title}`} label="Share invitation" />
            </div>
          )}
        </div>
      )}
    </form>
  );
}
