"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function RegisterButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function register() {
    if (loading) return;
    setLoading(true);
    const res = await api(`/api/events/${eventId}/register`);
    if (res.ok) {
      setDone(true);
      toast.success("You're registered. See you there!");
    } else {
      toast.error(res.error.message);
    }
    setLoading(false);
    router.refresh(); // reload seat counts / state from the server
  }

  if (done)
    return (
      <Button variant="secondary" className="w-full" asChild>
        <Link href="/my-registrations">
          <CheckCircle2 /> Registered — view my registrations
        </Link>
      </Button>
    );
  return (
    <Button size="lg" className="w-full" onClick={register} loading={loading}>
      {!loading && <Ticket />}{" "}
      {loading ? "Registering…" : "Register for this event"}
    </Button>
  );
}
