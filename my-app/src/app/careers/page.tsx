import { Footer } from "@/components/layout/footer";
import { Navigation } from "@/components/layout/navigation";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Careers | We",
  description: "Join the We team and help us revolutionize peer-to-peer learning. Explore open positions and opportunities to make learning social again.",
  keywords: [
    "careers",
    "jobs",
    "we careers",
    "work at we",
    "job opportunities",
    "hiring",
    "join our team",
  ],
  openGraph: {
    title: "Careers | We",
    description: "Join the We team and help us revolutionize peer-to-peer learning.",
    url: "/careers",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Careers at We",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Careers | We",
    description: "Join the We team and help us revolutionize peer-to-peer learning.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/careers",
  },
};

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={null}>
        <Navigation />
      </Suspense>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-foreground">
              Careers at We
            </h1>
            <p className="text-muted-foreground mt-2">
              Join us in making learning social again
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <p>
              At We, we&apos;re building a platform that makes learning collaborative, 
              accessible, and engaging. We believe that real learning happens when people 
              come together to share knowledge, ask questions, and grow together.
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Why Join We?
              </h2>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Work on a mission-driven product that impacts millions of learners</li>
                <li>Be part of a collaborative, innovative team</li>
                <li>Help shape the future of peer-to-peer learning</li>
                <li>Work with cutting-edge technology and AI</li>
                <li>Join a fast-growing startup with exciting opportunities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Open Positions
              </h2>
              <p className="text-muted-foreground">
                We&apos;re always looking for talented individuals to join our team. 
                Currently, we don&apos;t have any open positions listed, but we&apos;re always 
                interested in hearing from passionate people who want to make a difference 
                in education.
              </p>
              <p className="mt-4">
                If you&apos;re interested in working with us, please reach out to us at{" "}
                <a 
                  href="mailto:namaste@webyalaya.com" 
                  className="text-primary hover:underline"
                >
                  namaste@webyalaya.com
                </a>
                {" "}with your resume and a brief note about why you&apos;d like to join We.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Contact Us
              </h2>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  <a 
                    href="mailto:namaste@webyalaya.com" 
                    className="text-primary hover:underline"
                  >
                    namaste@webyalaya.com
                  </a>
                </p>
                <p>
                  <span className="font-semibold">Registered Address:</span> D56, 2nd
                  Floor, SLF Ved Vihar, Loni, Ghaziabad, UP - 201102
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
