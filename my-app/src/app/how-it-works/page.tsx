import type { Metadata } from "next";
import { Suspense } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { HowItWorksClient } from "@/components/how-it-works/client-page";
import { Sparkles, Users, Zap, BookOpen } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how Webyalaya works. Create study rooms, send peer requests, understand WEBYA, and start your collaborative learning journey in minutes.",
  keywords: [
    "how webyalaya works",
    "create study room",
    "peer request",
    "WEBYA explained",
    "peer learning guide",
    "online tutoring tutorial",
    "study room tutorial",
  ],
  openGraph: {
    title: "How It Works | Webyalaya",
    description: "A simple guide to creating study rooms, sending peer requests, and using WEBYA on Webyalaya.",
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
      "name": "What is WEBYA?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "WEBYA is the virtual currency on Webyalaya. Earn WEBYA by hosting sessions, completing streaks, or finishing challenges. Spend WEBYA to join premium rooms, send highlighted peer requests, or unlock add-ons.",
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
                A trusted peer-to-peer learning experience{" "}
                <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-blue-600 bg-clip-text text-transparent">Teach, Learn, Grow — with peers.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                At Webyalaya, knowledge flows both ways - you’re a learner and a teacher
              </p>
            </div>
          </section>

          {/* About Webyalaya Section */}
          <section className="relative py-24 px-4 overflow-hidden bg-slate-50">
            <div className="container mx-auto max-w-5xl relative">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                
                {/* Left Column: The Story */}
                <div className="space-y-10">
                  <FadeIn>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
                        <span>Our Mission</span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                        Why We Built Webyalaya
                      </h2>
                      <p className="text-xl text-slate-600 font-medium">
                        In this hyper-connected world, <span className="text-slate-900">learning still feels lonely.</span>
                      </p>
                    </div>
                  </FadeIn>

                  <FadeIn delay={0.1}>
                    <div className="prose prose-slate text-slate-600 leading-relaxed">
                      <p className="mb-4">
                        We enroll in online courses with good intentions. But most of us never complete them. We save videos, tutorials, and links, but rarely go back to watch them.
                      </p>
                      <p>
                        Not because we don&apos;t want to learn, but because videos replaced conversations, courses replaced communities, and for millions of us, especially outside the metros, language became another invisible barrier.
                      </p>
                    </div>
                  </FadeIn>

                  <FadeIn delay={0.2}>
                   <div className="border-l-4 border-blue-500 pl-6 py-2">
                     <h3 className="text-xl font-bold text-slate-900 mb-2">Real learning needs people.</h3>
                       <p className="text-slate-600 leading-relaxed">
                         Someone to ask questions with. Someone to explain things again. 
                         Someone to discuss, practice, and grow with. 
                         That&apos;s the problem we felt personally. And that&apos;s why we built Webyalaya.
                       </p>
                   </div>
                  </FadeIn>
                </div>

                {/* Right Column: The Solution */}
                 <div className="relative">
                   <div className="absolute -inset-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-[2rem] opacity-50 blur-2xl -z-10"></div>
                   
                   <FadeIn delay={0.3}>
                    <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-xl border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl"></div>
                      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl"></div>

                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-600/20">
                          <Users className="w-6 h-6" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">
                          Making learning social again.
                        </h3>
                        <p className="text-slate-600 leading-relaxed mb-8">
                          Webyalaya is designed to bring the &apos;human&apos; back into learning. Instead of learning alone from a screen, you learn with peers.
                          You talk, ask, explain, debate, and practice together, often in the language you&apos;re most comfortable with.
                        </p>
                        
                        <ul className="space-y-4">
                           <li className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <BookOpen className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-medium text-slate-700">Learn by teaching</span>
                           </li>
                           <li className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Zap className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-medium text-slate-700">Peer-to-peer growth</span>
                           </li>
                        </ul>
                      </div>
                    </div>
                   </FadeIn>

                   <FadeIn delay={0.4}>
                    <div className="mt-8 text-center sm:text-left pl-2">
                       <p className="text-slate-500 font-medium italic mb-2">Because learning shouldn&apos;t feel like a task.</p>
                       <p className="text-lg font-bold text-slate-900">
                         Together, let&apos;s make learning a <span className="text-blue-600">passion project.</span>
                       </p>
                    </div>
                   </FadeIn>
                 </div>

              </div>
            </div>
          </section>

          {/* Interactive Feature Section */}
          <HowItWorksClient />
        </main>

        <Footer />
    </div>
  );
}
