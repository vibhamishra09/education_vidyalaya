import type { Metadata } from "next";
import { BrowseClient } from "./browse-client";

export const metadata: Metadata = {
  title: "Community Feed",
  description: "Explore We's premium community feed with live study rooms, trending debates, cover-led posts, and personalized discovery.",
  keywords: [
    "community feed",
    "study rooms",
    "debate rooms",
    "peer learning",
    "live learning feed",
    "learning community",
    "personalized study feed",
  ],
  openGraph: {
    title: "Community Feed | We",
    description: "Discover live study rooms, trending debates, and premium post-style updates across We.",
    url: "/browse",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "We Community Feed",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Community Feed | We",
    description: "Discover live study rooms, trending debates, and premium post-style updates.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/browse",
  },
};

// Structured data for search results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "We Community Feed",
  "description": "Discover live study rooms, debates, and personalized learning updates on We",
  "url": "https://webyalaya.com/browse",
  "mainEntity": {
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Live Study Rooms",
        "description": "Discover cover-led posts for peer-led rooms and upcoming learning sessions",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Trending Debates",
        "description": "Follow the most active debate rooms and community-led discussions",
      },
    ],
  },
};

export default function BrowsePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BrowseClient />
    </>
  );
}
