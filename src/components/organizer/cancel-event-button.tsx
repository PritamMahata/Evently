"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
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

export function CancelEventButton({
  eventId,
  title,
  registrations,
  size = "default",
}: {
  eventId: string;
  title: string;
  registrations: number;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (loading) return;
    setLoading(true);
    const res = await api(`/api/events/${eventId}/cancel`);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    setOpen(false);
    toast.success("Event cancelled.");
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className="text-destructive hover:text-destructive"
        >
          <Ban /> Cancel event
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to cancel this event?
          </AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” will be marked as cancelled and no one will be able to
            register.{" "}
            {registrations > 0
              ? `The ${registrations} existing ${registrations === 1 ? "registration is" : "registrations are"} kept for your records.`
              : ""}{" "}
            This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep event</AlertDialogCancel>
          <Button variant="destructive" onClick={cancel} loading={loading}>
            {loading ? "Cancelling…" : "Yes, cancel event"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
