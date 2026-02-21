import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isOnboardingRoute = createRouteMatcher(['/onboarding']);
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/browse',
  '/how-it-works',
  '/about',
]);
const isApiRoute = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { isAuthenticated, sessionClaims, redirectToSignIn, getToken, userId } = await auth();

  // Allow all API routes to pass through without onboarding checks
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  // Allow authenticated users to access /onboarding, but:
  // - If they have already completed onboarding, redirect them away (e.g., to home).
  // - Otherwise, let them proceed so they can finish onboarding.
  if (isAuthenticated && isOnboardingRoute(req)) {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.info(
      `[OnboardingRoute] Running backend onboarding-status check for userId=${userId ?? 'unknown'}`,
    );

    try {
      const token = await getToken();
      if (token) {
        const response = await fetch(`${backendUrl}/api/users/onboarding-status`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (response.ok) {
          const data = (await response.json()) as { onboardingComplete?: boolean };
          console.info(
            `[OnboardingRoute] Backend onboarding-status result for userId=${userId ?? 'unknown'}: onboardingComplete=${data.onboardingComplete === true}`,
          );
          if (data.onboardingComplete === true) {
            // If onboarding is complete, redirect away from onboarding page
            return NextResponse.redirect(new URL('/', req.url));
          }
          return NextResponse.next();
        }

        console.warn(
          `[OnboardingRoute] Backend onboarding-status check failed for userId=${userId ?? 'unknown'} with status=${response.status}. Falling back to session claims.`,
        );
      }
    } catch {
      // Fallback to Clerk session claims below when backend check is unavailable.
      console.warn(
        `[OnboardingRoute] Backend onboarding-status check threw for userId=${userId ?? 'unknown'}. Falling back to session claims.`,
      );
    }

    // Fallback for transient backend failures while preserving current behavior.
    if (sessionClaims?.metadata?.onboardingComplete) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  }

  // If the user isn't signed in and the route is private, redirect to sign-in
  if (!isAuthenticated && !isPublicRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Catch users who do not have `onboardingComplete: true` in their publicMetadata
  // Redirect them to the /onboarding route to complete onboarding
  if (isAuthenticated && !sessionClaims?.metadata?.onboardingComplete) {
    const onboardingUrl = new URL('/onboarding', req.url);
    // Preserve the original URL as a redirect parameter
    onboardingUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  // If the user is logged in and the route is protected, let them view.
  if (isAuthenticated && !isPublicRoute(req)) {
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
