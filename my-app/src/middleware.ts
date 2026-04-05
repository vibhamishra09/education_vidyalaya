import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isWebinarAttendeeRoute = createRouteMatcher([
  '/webinar/register(.*)',
  '/webinar/join(.*)',
  '/webinar/waiting(.*)',
]);
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/browse',
  '/how-it-works',
  '/about',
  '/manifest.json',
  '/studyroom(.*)',
  '/rooms/studyroom(.*)',
  '/terms-of-use',
  '/privacy-policy',
  '/careers',
  '/offline',
  '/manifest.json',
  '/(.*).webmanifest'
]);
const isApiRoute = createRouteMatcher(['/api(.*)']);

/**
 * Next.js Server Actions POST with this header. Redirecting those requests (e.g. to /onboarding)
 * breaks the action response and surfaces as fetchServerAction → "Failed to fetch".
 * Clerk also uses server actions for App Router session flows.
 */
function isNextServerActionRequest(req: NextRequest): boolean {
  if (req.method !== 'POST') return false;
  return req.headers.has('next-action') || req.headers.has('Next-Action');
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { isAuthenticated, sessionClaims, redirectToSignIn } = await auth();

  // Allow all API routes to pass through without onboarding checks
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  // If the user isn't signed in and the route is private, redirect to sign-in
  if (!isAuthenticated && !isPublicRoute(req) && !isWebinarAttendeeRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Allow all other requests through
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    // Exclude: static assets, metadata routes (sitemap.xml, robots.txt, manifest.json), and Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
