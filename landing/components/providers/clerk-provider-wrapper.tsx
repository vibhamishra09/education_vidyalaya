"use client";

import { ReactNode } from "react";

// ClerkProviderWrapper for static builds
// Since authentication redirects to app.webyalaya.com, we don't need ClerkProvider
// on the landing page. This avoids Server Actions detection during static export.
export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  // For static builds, we don't use ClerkProvider since:
  // 1. Authentication happens on app.webyalaya.com (different domain)
  // 2. No Clerk hooks are used in the landing pages
  // 3. API calls work without ClerkProvider (they check window.Clerk at runtime)
  return <>{children}</>;
}
