"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser, useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import { NotificationDropdown } from "./notification-dropdown";
import { UserDropdown } from "./user-dropdown";
import { CoinDropdown } from "./coin-dropdown";
import { useCurrentUser } from "@/hooks/use-users";
// import { isAuthError } from "@/lib/utils/error-handling";

export function Navigation() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const { data: currentUserData, isLoading: isUserLoading } = useCurrentUser();
  const pathname = usePathname();

  const coinsValue = currentUserData?.user?.coins;
  const parsedCoins =
    typeof coinsValue === "string"
      ? parseFloat(coinsValue)
      : coinsValue;
  const userCoins =
    typeof parsedCoins === "number" && !Number.isNaN(parsedCoins)
      ? parsedCoins
      : 0;
  
  // Check if the error is an authentication error
  // const isAuthErrorOccurred = isAuthError(userError);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 relative group">
            <Image
              src="/webyalaya-main-logo.svg"
              alt="Webyalaya"
              width={128}
              height={128}
              className="object-contain rounded-md px-1 transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isSignedIn ? (
              <>
                <Link
                  href="/browse"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    pathname === '/browse'
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
                  }`}
                >
                  Browse
                </Link>
                <Link
                  href="/how-it-works"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    pathname === '/how-it-works'
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
                  }`}
                >
                  How it works
                </Link>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    pathname === '/dashboard'
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
                  }`}
                >
                  Dashboard
                </Link>

                {/* Coins */}
                <CoinDropdown coins={userCoins} isLoading={isUserLoading} />

                {/* Notifications */}
                <NotificationDropdown />

                {/* User Dropdown */}
                <UserDropdown user={user} signOut={signOut} />
              </>
            ) : (
              <>
                <Link
                  href="/browse"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    pathname === '/browse'
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
                  }`}
                >
                  Browse
                </Link>
                <Link
                  href="/how-it-works"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    pathname === '/how-it-works'
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
                  }`}
                >
                  How it works
                </Link>
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button variant="outline" size="sm">
                      Sign Up
                    </Button>
                  </SignUpButton>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          {isSignedIn ? (
            <div className="md:hidden flex items-center gap-3">
              <div className="min-w-[110px]">
                <CoinDropdown coins={userCoins} isLoading={isUserLoading} />
              </div>
              <NotificationDropdown />
            </div>
          ) : (
            <div className="md:hidden flex items-center gap-2">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" size="sm">
                  Sign Up
                </Button>
              </SignUpButton>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
