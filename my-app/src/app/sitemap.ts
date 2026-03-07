import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Try to get the host from request headers first
  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Get the site URL from environment or default to production
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webyalaya.com';
  
  // Determine if this is a production domain
  const isProduction = 
    (host.includes('webyalaya.com') && 
     !host.includes('test.webyalaya.com') && 
     !host.includes('dev.webyalaya.com')) ||
    (siteUrl.includes('webyalaya.com') && 
     !siteUrl.includes('test.webyalaya.com') && 
     !siteUrl.includes('dev.webyalaya.com'));
  
  // Use the host from request if available, otherwise use siteUrl
  const baseUrl = host ? `https://${host}` : siteUrl;
  
  // Only generate sitemap for production
  if (!isProduction) {
    return [];
  }
  
  // Main public pages that should be indexed
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/updates`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ];
  
  // Note: WordPress sitemap is available separately at /wp-sitemap.xml
  // Search engines will discover it independently
  
  return routes;
}

