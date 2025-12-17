"use client";

import { ReactNode } from "react";
import { ClerkProvider } from "@clerk/clerk-react";

// ClerkProviderWrapper using @clerk/clerk-react (standalone React SDK)
// This is compatible with static exports unlike @clerk/nextjs which has Server Actions
export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.webyalaya.com";
  
  // If no publishable key, return children without ClerkProvider
  if (!publishableKey || publishableKey === "your_clerk_publishable_key_here") {
    return <>{children}</>;
  }

  // For modal popups, signInUrl and signUpUrl should point to current domain
  // but afterSignInUrl/afterSignUpUrl redirect to app.webyalaya.com
  const siteUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://webyalaya.com';

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={`${siteUrl}/sign-in`}
      signUpUrl={`${siteUrl}/sign-up`}
      afterSignInUrl={appUrl}
      afterSignUpUrl={appUrl}
    >
      {children}
    </ClerkProvider>
  );
}
