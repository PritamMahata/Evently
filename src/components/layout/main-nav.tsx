"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NavItem } from "./mobile-nav";

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (href === "/organizer" && pathname === "/organizer") return true;
  if (
    href === "/organizer/events" &&
    pathname.startsWith("/organizer/events") &&
    pathname !== "/organizer/events/new"
  )
    return true;
  if (href === "/events" && pathname.startsWith("/events")) return true;
  if (href === "/dashboard" && pathname.startsWith("/dashboard")) return true;
  if (href === "/my-registrations" && pathname.startsWith("/my-registrations"))
    return true;
  return false;
}

export function MainNav({
  items,
  isOrganizer,
}: {
  items: NavItem[];
  isOrganizer?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
      {items.map((item) => {
        if (item.href === "/organizer/events/new" && isOrganizer) {
          return (
            <Button
              key={item.href}
              size="sm"
              asChild
              className="ml-2 gap-1.5 font-medium shadow-xs"
            >
              <Link href={item.href}>
                <Plus className="size-3.5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        }

        const active = isItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3.5 py-2 text-sm sm:text-base font-medium transition-all duration-150",
              active
                ? "bg-accent/80 text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

