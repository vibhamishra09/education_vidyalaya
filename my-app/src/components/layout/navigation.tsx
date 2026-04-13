"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser, useAuth, SignInButton } from "@clerk/nextjs";
import { AuthPromptButtons } from "@/components/auth/auth-prompt-buttons";
import { NotificationDropdown } from "./notification-dropdown";
import { UserDropdown } from "./user-dropdown";
import { CoinDropdown } from "./coin-dropdown";
import { useCurrentUser } from "@/hooks/use-users";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const { data: currentUserData, isLoading: isUserLoading } = useCurrentUser();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const coinsValue = currentUserData?.user?.coins;
  const parsedCoins =
    typeof coinsValue === "string"
      ? parseFloat(coinsValue)
      : coinsValue;
  const userCoins =
    typeof parsedCoins === "number" && !Number.isNaN(parsedCoins)
      ? parsedCoins
      : 0;

  const links = isSignedIn
    ? [
        { href: "/browse", label: "Browse" },
        { href: "/how-it-works", label: "How it works" },
        { href: "/pricing", label: "Pricing" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "https://www.webyalaya.com/updates", label: "Webya Updates", external: true },
      ]
    : [
        { href: "/browse", label: "Browse" },
        { href: "/how-it-works", label: "How it works" },
        { href: "/pricing", label: "Pricing" },
        { href: "https://www.webyalaya.com/updates", label: "Webya Updates", external: true },
      ];

  return (
    <header className="sticky top-0 z-50 w-full pointer-events-none">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
        <div
          className={cn(
            "pointer-events-auto relative rounded-2xl border border-white/10 transition-all duration-500 will-change-transform",
            "bg-background/60 backdrop-blur-xl shadow-lg",
            isScrolled 
              ? "bg-background/80 shadow-xl border-white/15 translate-y-0" 
              : "bg-background/50 shadow-md translate-y-1"
          )}
        >
          <div className="flex h-14 items-center justify-between px-3 sm:px-4 md:px-6">
            {/* Left: logo + links */}
            <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
              <Link href="/" className="flex items-center gap-2 relative group shrink-0">
                <Image
                  src="/webyalaya-main-logo.svg"
                  alt="Webyalaya"
                  width={140}
                  height={140}
                  className="object-contain w-auto h-5 sm:h-6 md:h-8 transition-all duration-300 group-hover:scale-105 opacity-95 group-hover:opacity-100"
                />
              </Link>

              <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  const linkProps = link.external
                    ? {
                        href: link.href,
                        target: "_blank",
                        rel: "noopener noreferrer",
                      }
                    : { href: link.href };
                  
                  return (
                    <Link
                      key={link.href}
                      {...linkProps}
                      className={cn(
                        "relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                        "text-muted-foreground hover:text-foreground",
                        isActive && "text-foreground font-semibold bg-gray-100/50 border border-gray-200"
                      )}
                    >
                      {link.label}
                      {isActive && (
                        <span className="absolute inset-0 rounded-full bg-transparent -z-10" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: auth or signed-in controls */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              {isSignedIn ? (
                <>
                  <CoinDropdown coins={userCoins} isLoading={isUserLoading} />
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <NotificationDropdown />
                  <UserDropdown user={user} signOut={signOut} />
                </>
              ) : (
                <AuthPromptButtons />
              )}
            </div>

            {/* Mobile: utilities + menu toggle */}
            <div className="md:hidden flex items-center gap-1.5 sm:gap-2 shrink-0">
              {isSignedIn ? (
                <>
                  <CoinDropdown coins={userCoins} isLoading={isUserLoading} />
                  <NotificationDropdown />
                </>
              ) : (
                <div className="flex items-center">
                  <SignInButton mode="modal">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-none h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm mr-1"
                    >
                      Sign In
                    </Button>
                  </SignInButton>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-white/10 shrink-0"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile panel */}
          {isMobileMenuOpen && (
            <div id="mobile-nav" className="md:hidden border-t border-white/10 px-3 sm:px-4 pb-4 sm:pb-5 pt-2 animate-in slide-in-from-top-2 fade-in-20">
              <nav className="flex flex-col gap-2 mt-2" aria-label="Mobile">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                        "hover:bg-white/5 text-muted-foreground hover:text-foreground",
                        isActive && "bg-white/10 text-foreground font-semibold"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 flex items-center justify-end border-t border-white/5 pt-4">
                {isSignedIn ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => void signOut()}
                    >
                      Sign out
                    </Button>
                ) : (
                  <div className="w-full flex justify-end">
                    <AuthPromptButtons />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
