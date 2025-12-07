import type { Metadata } from "next";
import { BrowseClient } from "./browse-client";

export const metadata: Metadata = {
  title: "Browse Peers & Study Rooms",
  description: "Discover and connect with peers who share your interests. Find study rooms on topics like programming, design, languages, and more. Join the learning community today.",
  keywords: [
    "find tutors",
    "study rooms",
    "peer learning",
    "online tutors",
    "skill sharing",
    "find study partner",
    "learning community",
    "programming tutors",
    "language exchange",
    "design mentors",
  ],
  openGraph: {
    title: "Browse Peers & Study Rooms | Webyalaya",
    description: "Discover and connect with peers who share your interests. Find study rooms and learning partners.",
    url: "/browse",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Browse Peers and Study Rooms on Webyalaya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Peers & Study Rooms | Webyalaya",
    description: "Discover and connect with peers who share your interests.",
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
  "name": "Browse Peers and Study Rooms",
  "description": "Find tutors, mentors, and study rooms on Webyalaya",
  "url": "https://webyalaya.com/browse",
  "mainEntity": {
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Find Peer Tutors",
        "description": "Connect with knowledgeable peers who can help you learn new skills",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Join Study Rooms",
        "description": "Participate in collaborative study sessions on various topics",
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
