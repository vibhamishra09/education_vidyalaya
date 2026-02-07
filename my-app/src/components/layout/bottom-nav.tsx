"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LayoutDashboard, User, CircleHelp } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export function BottomNav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  // Don't render if user is not signed in
  if (!isSignedIn) {
    return null;
  }

  // Hide navigation when in video session (mobile view)
  if (pathname?.startsWith('/rooms/') || pathname?.startsWith('/sessions/') || pathname?.startsWith('/studyroom/') || pathname?.startsWith('/debateroom/')) {
    return null;
  }

  const navItems = [
    {
      href: "/browse",
      label: "Browse",
      icon: Compass,
      isActive: pathname === "/browse" || pathname.startsWith("/browse/"),
    },
    {
      href: "/how-it-works",
      label: "How it works",
      icon: CircleHelp,
      isActive: pathname === "/how-it-works",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard" || pathname.startsWith("/dashboard/"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      isActive: pathname === "/profile" || pathname.startsWith("/profile/"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  item.isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${item.isActive ? "stroke-2" : ""}`} />
                <span className={`text-xs font-medium ${item.isActive ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
