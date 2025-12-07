import type { Metadata } from "next";
import { HomeClient } from "./home-client";

<<<<<<< HEAD
export const metadata: Metadata = {
  title: "Webyalaya - Peer to Peer Learning Platform | Learn & Teach Together",
  description: "Join Webyalaya, the collaborative learning platform where you can connect with peers, host study rooms, attend live sessions, and earn mAYA coins while learning and teaching skills.",
  keywords: [
    "peer learning platform",
    "online study rooms",
    "collaborative education",
    "skill sharing community",
    "peer tutoring",
    "group study sessions",
    "learn programming online",
    "teach skills online",
    "mAYA coins",
    "webyalaya",
  ],
  openGraph: {
    title: "Webyalaya - Peer to Peer Learning Platform",
    description: "Connect with peers to learn and teach. Join study rooms, host sessions, and grow together.",
    url: "/",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Webyalaya - Learn and Teach Together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Webyalaya - Peer to Peer Learning Platform",
    description: "Connect with peers to learn and teach. Join study rooms, host sessions, and grow together.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

// Structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Webyalaya",
  "description": "Peer to peer learning platform for collaborative education",
  "url": "https://webyalaya.com",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "All",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1000",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
