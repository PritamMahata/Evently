import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { MainNav } from "./main-nav";
import { MobileNav, type NavItem } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

function navFor(role?: string): NavItem[] {
  if (role === "ORGANIZER")
    return [
      { href: "/events", label: "Events" },
      { href: "/organizer", label: "Dashboard" },
      { href: "/organizer/events", label: "My events" },
      { href: "/organizer/events/new", label: "New event" },
    ];
  if (role === "ATTENDEE")
    return [
      { href: "/events", label: "Events" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/my-registrations", label: "My registrations" },
    ];
  return [
    { href: "/", label: "Home" },
    { href: "/events", label: "Events" },
  ];
}

export async function SiteHeader() {
  const user = await getSessionUser();
  const items = navFor(user?.role);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-2xs">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <MobileNav
            items={user ? items : [...items]}
            user={user}
            role={user?.role}
          />
          <Logo />
          <MainNav items={items} isOrganizer={user?.role === "ORGANIZER"} />
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {user ? (
            <div className="hidden sm:block">
              <UserMenu name={user.name} email={user.email} role={user.role} />
            </div>
          ) : (
            <div className="items-center gap-1 flex">
              <Button variant="ghost" asChild className="h-9 px-4 text-sm sm:text-base font-medium">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="h-9 px-4.5 text-sm sm:text-base font-semibold shadow-xs">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
