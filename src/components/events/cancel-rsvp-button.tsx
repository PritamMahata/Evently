"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CancelRsvpButtonProps {
  eventId: string;
  eventTitle: string;
  canCancel: boolean;
  size?: "default" | "sm";
  variant?: "outline" | "ghost" | "destructive";
  className?: string;
}

export function CancelRsvpButton({
  eventId,
  eventTitle,
  canCancel,
  size = "default",
  variant = "outline",
  className,
}: CancelRsvpButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancelRsvp() {
    if (loading) return;
    setLoading(true);
    const res = await api(`/api/events/${eventId}/register`, {
      method: "DELETE",
    });
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }

    setOpen(false);
    toast.success("Your RSVP has been cancelled.");
    router.refresh();
  }

  if (!canCancel) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        title="RSVPs can only be cancelled up to 1 day (24 hours) before the event."
        className={`opacity-60 text-muted-foreground ${className ?? ""}`}
      >
        <Ban className="size-4 shrink-0" />
        <span>Cancel RSVP (cutoff passed)</span>
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`text-destructive hover:bg-destructive/10 hover:text-destructive ${className ?? ""}`}
        >
          <Ban className="size-4 shrink-0" />
          <span>Cancel RSVP</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="size-5 text-destructive" />
            <span>Cancel your RSVP?</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-1 text-sm text-muted-foreground">
            <p>
              Are you sure you want to cancel your seat for{" "}
              <strong className="text-foreground">“{eventTitle}”</strong>?
            </p>
            <p>
              Your reservation will be removed and your seat will immediately become
              available for other attendees. You can reserve again later if seats remain.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep my seat</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleCancelRsvp}
            loading={loading}
          >
            {loading ? "Cancelling…" : "Yes, cancel RSVP"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

