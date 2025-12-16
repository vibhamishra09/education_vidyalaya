"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";

/**
 * Component that handles redirecting authenticated users to app.webyalaya.com
 * This is needed because modal mode doesn't always redirect automatically
 */
export function AuthRedirectHandler() {
  const { isSignedIn, isLoaded } = useUser();
  const hasRedirected = useRef(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.webyalaya.com";

  useEffect(() => {
    // Only redirect if user is signed in, Clerk has loaded, and we haven't redirected yet
    if (isLoaded && isSignedIn && !hasRedirected.current) {
      // Check if we're already on the app domain to avoid redirect loops
      if (typeof window !== "undefined") {
        const currentHost = window.location.hostname;
        const appHost = new URL(appUrl).hostname;
        
        if (currentHost !== appHost) {
          hasRedirected.current = true;
          // Small delay to ensure authentication state is fully processed
          const timer = setTimeout(() => {
            window.location.href = appUrl;
          }, 1000);

          return () => clearTimeout(timer);
        }
      }
    }
  }, [isSignedIn, isLoaded, appUrl]);

  return null;
}
