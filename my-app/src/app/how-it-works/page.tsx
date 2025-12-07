import Link from "next/link";
import { Suspense } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";

const howItWorksSections = [
  {
    title: "Create a study room",
    description: "Launch a focused session in under a minute.",
    steps: [
      "Open Create Study Room from the navbar or dashboard.",
      "Describe the topic, pick the time, and set participant limits.",
      "Publish it. We instantly share the invite in Browse so peers can join.",
    ],
    cta: {
      label: "Host a room",
      href: "/create-study-room",
    },
  },
  {
    title: "Make a peer request",
    description: "Reach out when you find the perfect partner.",
    steps: [
      "Browse profiles or rooms and tap Request Session.",
      "Share what you need, preferred time, and goals—keep it short.",
      "The host accepts, declines, or suggests another slot. You get notified either way.",
    ],
    cta: {
      label: "Request a peer",
      href: "/browse",
    },
  },
  {
    title: "mAYA coins explained",
    description: "Earn, spend, and track everything from one wallet.",
    steps: [
      "Earn coins by hosting sessions, completing streaks, or finishing challenges.",
      "Spend coins to join premium rooms, send highlighted peer requests, or unlock add-ons.",
      "Every transaction is logged inside your wallet with status, source, and balance updates.",
    ],
    cta: {
      label: "Check your wallet",
      href: "/dashboard",
    },
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Suspense fallback={null}>
        <Navigation />
      </Suspense>
      <main className="flex-1">
        <section className="bg-background border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-4">
                <Sparkles className="h-4 w-4" />
                Built for quick collaboration
              </p>
              <h1 className="text-4xl font-semibold mb-4">How it works</h1>
              <p className="text-lg text-muted-foreground font-tagline">
                A simple playbook for starting a study room, sending peer requests, and keeping
                mAYA coin transfers clear and transparent.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {howItWorksSections.map((section) => (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <ul className="space-y-3 text-sm text-muted-foreground font-tagline">
                    {section.steps.map((step) => (
                      <li key={step} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    <Button variant="outline" asChild>
                      <Link href={section.cta.href}>{section.cta.label}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-primary text-primary-foreground border-none">
              <CardHeader className="gap-3">
                <CardTitle className="text-2xl">Ready to dive in?</CardTitle>
                <CardDescription className="text-primary-foreground/80 text-base">
                  Create your next study room, send a peer request, or just check your wallet—all from the navbar.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/create-study-room">Start a room</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-white/10 text-white border-white/40">
                  <Link href="/browse">Find peers</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


