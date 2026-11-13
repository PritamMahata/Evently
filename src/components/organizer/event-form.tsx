"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { eventSchema, type EventInput } from "@/lib/validation/schemas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BannerUpload } from "./banner-upload";

interface Props {
  mode: "create" | "edit";
  eventId?: string;
  defaults?: EventInput;
  minSeats?: number;
}

const EMPTY: EventInput = {
  title: "",
  description: "",
  eventDate: "",
  eventTime: "",
  eventDeadline:"",
  venue: "",
  seatLimit: 50,
  bannerUrl: "",
};

export function EventForm({
  mode,
  eventId,
  defaults = EMPTY,
  minSeats = 1,
}: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: defaults,
  });
  const { isSubmitting } = form.formState;
  const today = new Date().toISOString().slice(0, 10);
  const watchedDate = form.watch("eventDate");
  const watchedTime = form.watch("eventTime");
  const maxDeadline =
    watchedDate && watchedTime ? `${watchedDate}T${watchedTime}` : undefined;

  async function onSubmit(values: EventInput) {
    setFormError(null);
    const res = await api<{ event: { id: string } }>(
      mode === "create" ? "/api/events" : `/api/events/${eventId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        body: values,
      },
    );
    if (!res.ok) {
      const { fields, message } = res.error;
      if (fields)
        for (const [k, v] of Object.entries(fields))
          form.setError(k as keyof EventInput, { message: v });
      setFormError(message);
      toast.error(message);
      return;
    }
    toast.success(mode === "create" ? "Event created." : "Event updated.");
    router.push(`/organizer/events/${res.data.event.id}`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Couldn’t save the event</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="bannerUrl"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <BannerUpload
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. React & Next.js Developer Meetup"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What will happen, who it’s for, what to bring…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" min={today} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="eventTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventDeadline"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>
                  Registration Deadline{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    max={maxDeadline}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  Optional cutoff for registrations. If set, must be before the event starts.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="venue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue</FormLabel>
              <FormControl>
                <Input
                  placeholder="Address or online link name"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="seatLimit"
          render={({ field }) => (
            <FormItem className="sm:max-w-xs">
              <FormLabel>Seat limit</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={minSeats}
                  step={1}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? NaN : e.target.valueAsNumber,
                    )
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                {minSeats > 1
                  ? `At least ${minSeats} — that many people have already registered.`
                  : "Registration closes automatically when every seat is taken."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting
              ? "Saving…"
              : mode === "create"
                ? "Create event"
                : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
