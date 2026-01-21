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
        <Button variant="default" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-none">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
        <Button
          variant="default"
          size="sm"
          className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-none"
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
        <Button variant="default" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-none">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button
          variant="default"
          size="sm"
          className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-none"
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
        { href: "/dashboard", label: "Dashboard" },
      ]
    : [
        { href: "/browse", label: "Browse" },
        { href: "/how-it-works", label: "How it works" },
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
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            {/* Left: logo + links */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 relative group shrink-0">
                <Image
                  src="/webyalaya-main-logo.svg"
                  alt="Webyalaya"
                  width={140}
                  height={140}
                  className="object-contain w-auto h-6 sm:h-8 transition-all duration-300 group-hover:scale-105 opacity-95 group-hover:opacity-100"
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
            <div className="hidden md:flex items-center gap-3">
              {isSignedIn ? (
                <>
                  <CoinDropdown coins={userCoins} isLoading={isUserLoading} />
                  <div className="w-px h-6 bg-white/10 mx-1" />
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
            <div className="md:hidden flex items-center gap-3">
              {isSignedIn && (
                <>
                  <CoinDropdown coins={userCoins} isLoading={isUserLoading} />
                  <NotificationDropdown />
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-white/10"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile panel */}
          {isMobileMenuOpen && (
            <div id="mobile-nav" className="md:hidden border-t border-white/10 px-4 pb-5 pt-2 animate-in slide-in-from-top-2 fade-in-20">
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
                  <Suspense fallback={<AuthButtonsFallback />}>
                    <div className="w-full flex justify-end">
                       <AuthButtons pathname={pathname} />
                    </div>
                  </Suspense>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
