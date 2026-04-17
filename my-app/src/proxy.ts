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
  '/pricing',
  '/about',
  '/manifest.json',
  '/studyroom(.*)',
  '/rooms/studyroom(.*)',
  '/terms-of-use',
  '/privacy-policy',
  '/careers',
  '/offline',
  '/manifest.json',
  '/(.*).webmanifest',
  '/profile(.*)'
]);
const isApiRoute = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { isAuthenticated, redirectToSignIn } = await auth();

  // Allow all API routes to pass through without extra redirects
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
