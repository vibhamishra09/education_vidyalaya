import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Try to get the host from request headers first (more accurate)
  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Get the site URL from environment or default to production
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webyalaya.com';
  
  // Determine if this is a production domain
  // Check both the host header and the environment variable
  const isProduction = 
    (host.includes('webyalaya.com') && 
     !host.includes('test.webyalaya.com') && 
     !host.includes('dev.webyalaya.com')) ||
    (siteUrl.includes('webyalaya.com') && 
     !siteUrl.includes('test.webyalaya.com') && 
     !siteUrl.includes('dev.webyalaya.com'));
  
  // For production, allow indexing with sitemap
  if (isProduction) {
    // Use the host from request if available, otherwise use siteUrl
    const baseUrl = host ? `https://${host}` : siteUrl;
    
    return {
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: [
            '/api/',
            '/dashboard',
            '/profile',
            '/create-study-room',
            '/onboarding',
            '/notifications',
            '/chat/',
            '/sessions/',
            '/request-session/',
            '/submit-review/',
            '/rooms/',
            '/studyroom/',
            '/offline',
            '/sign-in',
            '/sign-up',
          ],
        },
        {
          userAgent: 'Googlebot',
          allow: '/',
          disallow: [
            '/api/',
            '/dashboard',
            '/profile',
            '/create-study-room',
            '/onboarding',
            '/notifications',
            '/chat/',
            '/sessions/',
            '/request-session/',
            '/submit-review/',
            '/rooms/',
            '/studyroom/',
            '/offline',
            '/sign-in',
            '/sign-up',
          ],
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }
  
  // For test/dev environments, disallow all indexing
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  };
}

