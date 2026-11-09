"use client";

import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  LayoutDashboard,
  PlusCircle,
  Ticket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutMenuItem } from "./logout-button";

export function UserMenu({
  name,
  email,
  role,
  emailConfirmed,
}: {
  name: string;
  email: string;
  role: string;
  emailConfirmed?: boolean;
}) {
  const router = useRouter();
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 max-w-56 gap-2 px-2.5 shadow-2xs hover:bg-accent/80"
          aria-label="Account menu"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:bg-primary/20">
            {initials}
          </span>
          <span className="truncate text-sm font-medium">{name}</span>
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1 px-2 py-1.5">
            <span className="truncate font-semibold text-foreground">
              {name}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[11px] font-medium">
                {role === "ORGANIZER" ? "Organizer" : "Attendee"}
              </Badge>
              {emailConfirmed && (
                <Badge variant="success" className="text-[10px] py-0 px-1.5 font-normal">
                  Verified
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {role === "ORGANIZER" ? (
            <>
              <DropdownMenuItem onClick={() => router.push("/organizer")}>
                <LayoutDashboard className="size-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/organizer/events")}
              >
                <Calendar className="size-4" />
                <span>My Events</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/organizer/events/new")}
              >
                <PlusCircle className="size-4" />
                <span>Create Event</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <LayoutDashboard className="size-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/my-registrations")}
              >
                <Ticket className="size-4" />
                <span>My Registrations</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <LogoutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
