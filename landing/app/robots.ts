import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  // Get the site URL from environment or default to production
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webyalaya.com';
  
  // Determine if this is a production domain
  const isProduction = 
    siteUrl.includes('webyalaya.com') && 
    !siteUrl.includes('test.webyalaya.com') && 
    !siteUrl.includes('dev.webyalaya.com');
  
  // For production, allow indexing with sitemap
  if (isProduction) {
    const baseUrl = siteUrl;
    
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

