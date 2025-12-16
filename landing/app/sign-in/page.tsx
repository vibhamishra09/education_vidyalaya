"use client";

import { useEffect, useRef } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";

// Page that triggers sign-in modal popup
export default function SignInPage() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.webyalaya.com";

  useEffect(() => {
    // Automatically trigger the sign-in modal when page loads
    if (buttonRef.current) {
      // Small delay to ensure button is mounted
      setTimeout(() => {
        buttonRef.current?.click();
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
        <div className="text-center">
          <SignInButton mode="modal" forceRedirectUrl={appUrl}>
            <Button ref={buttonRef} className="hidden">
              Sign In
            </Button>
          </SignInButton>
          <p className="text-muted-foreground mt-4">
            Opening sign-in modal...
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
