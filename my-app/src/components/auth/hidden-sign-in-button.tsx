"use client";

import { SignInButton } from "@clerk/nextjs";
import { useRef, useEffect } from "react";
import { setGlobalSignInTrigger } from "@/hooks/use-require-auth";

/**
 * Hidden SignInButton component that can be triggered programmatically
 * This component should be rendered once in the layout to enable global sign-in modal triggering
 */
export function HiddenSignInButton() {
  const signInButtonRef = useRef<HTMLButtonElement>(null);

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
    <SignInButton mode="modal">
      <button
        ref={signInButtonRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </SignInButton>
  );
}
