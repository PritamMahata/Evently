"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime, seatsRemaining, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EventRecord } from "@/types";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 shrink-0 fill-current", className)}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 1.892.527 3.662 1.442 5.172L2.05 21.95a.5.5 0 0 0 .614.614l4.823-1.396A9.958 9.958 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm-8.2 10c0-4.529 3.671-8.2 8.2-8.2s8.2 3.671 8.2 8.2-3.671 8.2-8.2 8.2a8.163 8.163 0 0 1-4.334-1.246.5.5 0 0 0-.41-.055l-3.376.977.994-3.264a.5.5 0 0 0-.058-.42A8.165 8.165 0 0 1 3.8 12zm13.672 2.382c-.301-.15-1.782-.88-2.059-.98-.276-.1-.477-.15-.678.15-.202.301-.78.98-.956 1.18-.176.202-.352.226-.653.076-.301-.15-1.272-.469-2.424-1.496-.895-.798-1.5-1.785-1.676-2.086-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.201-.301.301-.502.101-.201.05-.376-.025-.526-.075-.15-.678-1.634-.93-2.238-.244-.589-.493-.509-.678-.518-.175-.009-.376-.009-.577-.009-.201 0-.528.075-.804.376-.277.301-1.055 1.03-1.055 2.512 0 1.482 1.08 2.912 1.231 3.113.15.201 2.126 3.246 5.15 4.553.719.311 1.281.497 1.719.636.724.23 1.382.197 1.903.12.58-.087 1.782-.728 2.033-1.431.251-.703.251-1.305.176-1.431-.076-.126-.276-.201-.577-.351z"
      />
    </svg>
  );
}

interface WhatsAppShareButtonProps {
  event: Pick<
    EventRecord,
    "id" | "title" | "event_date" | "event_time" | "venue" | "seat_limit" | "registered_count"
  >;
  variant?: "brand" | "outline" | "ghost" | "icon";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

export function WhatsAppShareButton({
  event,
  variant = "brand",
  size = "default",
  className,
  label = "Share on WhatsApp",
}: WhatsAppShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string>("");

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const eventUrl = `${origin}/events/${event.id}`;
    const remaining = seatsRemaining(event);

    const lines = [
      `🎟️ *${event.title}*`,
      `📅 ${formatDate(event.event_date)} at ${formatTime(event.event_time)}`,
      event.venue ? `📍 ${event.venue}` : "",
      remaining > 0 ? `✨ ${remaining} seats left!` : "⚠️ Currently full",
      "",
      "Reserve your seat on Evently:",
      eventUrl,
    ].filter(Boolean);

    const message = lines.join("\n");
    setShareUrl(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`);
  }, [event]);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    toast.success("Opening WhatsApp to share event…");
  }

  if (variant === "icon") {
    return (
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "relative z-10 size-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/20",
          className,
        )}
        asChild
      >
        <a
          href={shareUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          title={`Share “${event.title}” on WhatsApp`}
          aria-label={`Share ${event.title} on WhatsApp`}
        >
          <WhatsAppIcon className="size-4" />
        </a>
      </Button>
    );
  }

  const isBrand = variant === "brand";

  return (
    <Button
      variant={isBrand ? "default" : variant}
      size={size}
      className={cn(
        "relative z-10 gap-2 transition-all duration-150",
        isBrand
          ? "bg-[#25D366] text-white hover:bg-[#20ba59] shadow-xs active:bg-[#1caa4f] dark:bg-[#25D366] dark:text-white dark:hover:bg-[#20ba59]"
          : "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400",
        className,
      )}
      asChild
    >
      <a
        href={shareUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`Share ${event.title} on WhatsApp`}
      >
        <WhatsAppIcon className="size-4.5" />
        <span className="font-semibold">{label}</span>
      </a>
    </Button>
  );
}
