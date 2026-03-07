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
  '/studyroom(.*)',
  '/rooms/studyroom(.*)',
  '/terms-of-use',
  '/privacy-policy',
  '/careers',
]);
const isApiRoute = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { isAuthenticated, sessionClaims, redirectToSignIn } = await auth();

  // Allow all API routes to pass through without onboarding checks
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  // Allow authenticated users to access /onboarding, but:
  // - If they have already completed onboarding, redirect them away (e.g., to home).
  // - Otherwise, let them proceed so they can finish onboarding.
  if (isAuthenticated && isOnboardingRoute(req)) {
    if (sessionClaims?.metadata?.onboardingComplete) {
      // If onboarding is complete, redirect away from onboarding page
      return NextResponse.redirect(new URL('/', req.url));
    }
    // Otherwise, let the user proceed to onboarding
    return NextResponse.next();
  }

  // If the user isn't signed in and the route is private, redirect to sign-in
  if (!isAuthenticated && !isPublicRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Allow public routes to be accessed without onboarding completion
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Catch users who do not have `onboardingComplete: true` in their publicMetadata
  // Redirect them to the /onboarding route to complete onboarding
  // (This only applies to protected routes, as public routes are handled above)
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
