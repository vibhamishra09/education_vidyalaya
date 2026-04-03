"use client";

import { useMemo, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Same Sign In / Sign Up styling as the main nav — use for inline “please sign in” prompts. */
function AuthPromptButtonsInner({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const redirectUrl = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
        <Button
          variant="default"
          size="sm"
          className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-none"
        >
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

export function AuthPromptButtonsFallback({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <SignInButton mode="modal">
        <Button
          variant="default"
          size="sm"
          className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-none"
        >
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

/** Clerk modal buttons that return the user to the current URL after sign-in/up. Wrap in Suspense when using. */
export function AuthPromptButtons({ className }: { className?: string }) {
  return (
    <Suspense fallback={<AuthPromptButtonsFallback className={className} />}>
      <AuthPromptButtonsInner className={className} />
    </Suspense>
  );
}
