import type { Metadata } from "next";
import { Suspense } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { PricingClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Webyalaya plans: Basic free tier, Plus at ₹29/month with unlimited rooms, and free Student Access with your school or college code.",
  keywords: [
    "webyalaya pricing",
    "study room plans",
    "student access code",
    "plus subscription",
    "peer learning pricing",
  ],
  openGraph: {
    title: "Pricing | Webyalaya",
    description:
      "Learn together, grow together. Choose Basic, Plus, or unlock Student Access with your campus code.",
    url: "/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | Webyalaya",
    description: "Plans for study rooms, debate rooms, and campus-wide access.",
  },
  alternates: {
    canonical: "/pricing",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Webyalaya Pricing",
  description: "Pricing and plans for Webyalaya peer learning.",
  url: "https://webyalaya.com/pricing",
};

export default function PricingPage() {
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
        <PricingClient />
      </main>

      <Footer />
    </div>
  );
}
