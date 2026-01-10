import type { Metadata } from "next";
import { Suspense } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { HowItWorksClient } from "@/components/how-it-works/client-page";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how Webyalaya works. Create study rooms, send peer requests, understand AYA coins, and start your collaborative learning journey in minutes.",
  keywords: [
    "how webyalaya works",
    "create study room",
    "peer request",
    "AYA coins explained",
    "peer learning guide",
    "online tutoring tutorial",
    "study room tutorial",
  ],
  openGraph: {
    title: "How It Works | Webyalaya",
    description: "A simple guide to creating study rooms, sending peer requests, and using AYA coins on Webyalaya.",
    url: "/how-it-works",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "How Webyalaya Works",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works | Webyalaya",
    description: "A simple guide to using Webyalaya for peer-to-peer learning.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/how-it-works",
  },
};

// Structured data for FAQ
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I create a study room on Webyalaya?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Open Create Study Room from the navbar or dashboard. Describe the topic, pick the time, and set participant limits. Publish it and we instantly share the invite in Browse so peers can join.",
      },
    },
    {
      "@type": "Question",
      "name": "How do I send a peer request?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Browse profiles or rooms and tap Request Session. Share what you need, preferred time, and goals. The host accepts, declines, or suggests another slot. You get notified either way.",
      },
    },
    {
      "@type": "Question",
      "name": "What are AYA coins?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AYA coins are the virtual currency on Webyalaya. Earn coins by hosting sessions, completing streaks, or finishing challenges. Spend coins to join premium rooms, send highlighted peer requests, or unlock add-ons.",
      },
    },
  ],
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Suspense fallback={null}>
          <Navigation />
        </Suspense>
        
        <main className="flex-1 pb-24">
          {/* Hero Header */}
          <section className="pt-24 pb-12 sm:pt-32 sm:pb-16 text-center px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                <span>Simple. Collaborative. Rewarding.</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                One platform. <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-blue-600 bg-clip-text text-transparent">Endless ways to learn together.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From focused study sessions to peer tutoring and streak tracking, 
                Webyalaya provides the tools you need to master your goals.
              </p>
            </div>
          </section>

          {/* Interactive Feature Section */}
          <HowItWorksClient />
        </main>

        <Footer />
    </div>
  );
}
