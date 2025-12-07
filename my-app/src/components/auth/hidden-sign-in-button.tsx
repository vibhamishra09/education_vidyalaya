"use client";

import { SignInButton } from "@clerk/nextjs";
import { useRef, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { setGlobalSignInTrigger } from "@/hooks/use-require-auth";

/**
 * Hidden SignInButton component that can be triggered programmatically
 * This component should be rendered once in the layout to enable global sign-in modal triggering
 * 
 * After sign-in, users are redirected back to the page they were on when they triggered sign-in.
 */
export function HiddenSignInButton() {
  const signInButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Always keep the redirect URL in sync with the current URL
  const redirectUrl = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    // Set the global trigger function when component mounts
    const triggerSignIn = () => {
      signInButtonRef.current?.click();
    };
    
    setGlobalSignInTrigger(triggerSignIn);

    // Cleanup when component unmounts
    return () => {
      setGlobalSignInTrigger(() => {});
    };
  }, []);

  return (
    <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
      <button
        ref={signInButtonRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </SignInButton>
  );
}
