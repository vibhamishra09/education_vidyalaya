"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser, useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import { NotificationDropdown } from "./notification-dropdown";
import { UserDropdown } from "./user-dropdown";
import { CoinDropdown } from "./coin-dropdown";
import { useCurrentUser } from "@/hooks/use-users";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Separate component for search params dependent functionality
function AuthButtons({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  
  // Build redirect URL for sign-in/sign-up to return users to current page
  const redirectUrl = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
        <Button
          variant="default"
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Sign Up
        </Button>
      </SignUpButton>
    </div>
  );
}

// Fallback auth buttons without redirect URL
function AuthButtonsFallback() {
  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button
          variant="default"
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Sign Up
        </Button>
      </SignUpButton>
    </div>
  );
}

export function Navigation() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const { data: currentUserData, isLoading: isUserLoading } = useCurrentUser();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
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
        { href: "/dashboard", label: "Dashboard" },
      ]
    : [
        { href: "/browse", label: "Browse" },
        { href: "/how-it-works", label: "How it works" },
      ];

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div
          className={cn(
            "rounded-xl bg-background/40 backdrop-blur-md ring-1 ring-white/20 border border-white/10 shadow-md transition-all duration-300 supports-[backdrop-filter]:bg-background/35",
            isScrolled && "bg-background/70 shadow-lg supports-[backdrop-filter]:bg-background/60 ring-1 ring-white/30 border-white/20"
          )}
        >
          <div className="flex h-12 items-center justify-between px-4 sm:h-14 sm:px-5">
            {/* Left: logo + links */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 relative group">
                <Image
                  src="/webyalaya-main-logo.svg"
                  alt="Webyalaya"
                  width={128}
                  height={128}
                  className="object-contain px-1 transition-all duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                />
              </Link>

              <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                        "text-muted-foreground hover:text-foreground hover:bg-white/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isActive && "text-foreground bg-white/15 font-semibold"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: auth or signed-in controls */}
            <div className="hidden md:flex items-center gap-3">
              {isSignedIn ? (
                <>
                  <CoinDropdown coins={userCoins} isLoading={isUserLoading} />
                  <NotificationDropdown />
                  <UserDropdown user={user} signOut={signOut} />
                </>
              ) : (
                <Suspense fallback={<AuthButtonsFallback />}>
                  <AuthButtons pathname={pathname} />
                </Suspense>
              )}
            </div>

            {/* Mobile: utilities + menu toggle */}
            <div className="md:hidden flex items-center gap-2">
              {isSignedIn ? (
                <>
                  <div className="min-w-[110px]">
                    <CoinDropdown coins={userCoins} isLoading={isUserLoading} />
                  </div>
                  <NotificationDropdown />
                </>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-200"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile panel */}
          {isMobileMenuOpen ? (
            <div id="mobile-nav" className="md:hidden border-t border-white/10 px-4 pb-4 pt-3">
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                        "text-muted-foreground hover:text-foreground hover:bg-white/10",
                        isActive && "text-foreground bg-white/15 font-semibold"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {isSignedIn ? (
                <div className="mt-4 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="mt-4">
                  <Suspense fallback={<AuthButtonsFallback />}>
                    <AuthButtons pathname={pathname} />
                  </Suspense>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
