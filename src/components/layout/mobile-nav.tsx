"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./logout-button";

export interface NavItem {
  href: string;
  label: string;
}

export function MobileNav({
  items,
  user,
  role,
}: {
  items: NavItem[];
  user: { name: string; email: string } | null;
  role?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col justify-between">
        <div>
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-lg font-bold">Evently</SheetTitle>
            <SheetDescription className="truncate text-xs">
              {user ? (
                <span className="flex items-center gap-1.5 pt-1">
                  <span className="truncate font-medium text-foreground">
                    {user.name}
                  </span>
                  {role ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5"
                    >
                      {role === "ORGANIZER" ? "Organizer" : "Attendee"}
                    </Badge>
                  ) : null}
                </span>
              ) : (
                "Simple event discovery & booking"
              )}
            </SheetDescription>
          </SheetHeader>

          <nav
            aria-label="Mobile navigation"
            className="flex flex-col gap-1 p-3"
          >
            {items.map((i) => {
              const active =
                pathname === i.href ||
                (i.href !== "/" &&
                  pathname.startsWith(i.href) &&
                  i.href !== "/organizer/events/new");
              const isNewEvent = i.href === "/organizer/events/new";

              if (isNewEvent) {
                return (
                  <SheetClose asChild key={i.href}>
                    <Link
                      href={i.href}
                      className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-center font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                    >
                      <Plus className="size-4" />
                      <span>{i.label}</span>
                    </Link>
                  </SheetClose>
                );
              }

              return (
                <SheetClose asChild key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                      active
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {i.label}
                  </Link>
                </SheetClose>
              );
            })}
          </nav>
        </div>

        <div className="border-t pt-4 p-3">
          {user && (
            <SheetClose asChild>
              <LogoutButton className="w-full justify-center" />
            </SheetClose>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
