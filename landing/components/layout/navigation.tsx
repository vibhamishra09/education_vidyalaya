"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

// Separate component for search params dependent functionality
function AuthButtons({ pathname }: { pathname: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.webyalaya.com";
  
  // Redirect to app.webyalaya.com after successful authentication
  const redirectUrl = appUrl;

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
        <Button variant="ghost" size="sm">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
        <Button variant="outline" size="sm">
          Sign Up
        </Button>
      </SignUpButton>
    </div>
  );
}

// Fallback auth buttons without redirect URL
function AuthButtonsFallback() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.webyalaya.com";
  
  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal" forceRedirectUrl={appUrl}>
        <Button variant="ghost" size="sm">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal" forceRedirectUrl={appUrl}>
        <Button variant="outline" size="sm">
          Sign Up
        </Button>
      </SignUpButton>
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();

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
              className="object-contain px-1 transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/browse"
              className={`text-sm font-medium transition-all relative pb-1 ${
                pathname === '/browse'
                  ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full'
                  : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
              }`}
            >
              Browse
            </Link>
            <Link
              href="/how-it-works"
              className={`text-sm font-medium transition-all relative pb-1 ${
                pathname === '/how-it-works'
                  ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full'
                  : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
              }`}
            >
              How it works
            </Link>
            <Suspense fallback={<AuthButtonsFallback />}>
              <AuthButtons pathname={pathname} />
            </Suspense>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <Link
              href="/browse"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Browse
            </Link>
            <Suspense fallback={<AuthButtonsFallback />}>
              <AuthButtons pathname={pathname} />
            </Suspense>
          </div>
        </div>
      </div>
    </nav>
  );
}
