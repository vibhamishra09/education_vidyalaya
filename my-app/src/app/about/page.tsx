import { Footer } from "@/components/layout/footer";
import { Navigation } from "@/components/layout/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About We | Peer-to-Peer Learning Platform",
  description: "We is designed to make learning social again. Instead of learning alone, you learn with peers. Join a community where knowledge flows both ways. Learn about our mission to make education collaborative, accessible, and engaging.",
  keywords: [
    "about we",
    "peer learning platform",
    "collaborative learning",
    "social learning",
    "education mission",
    "learning community",
    "knowledge sharing",
    "peer education",
  ],
  openGraph: {
    title: "About We | Peer-to-Peer Learning Platform",
    description: "We is designed to make learning social again. Instead of learning alone, you learn with peers. Join a community where knowledge flows both ways.",
    url: "/about",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "About We - Peer-to-Peer Learning Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About We | Peer-to-Peer Learning Platform",
    description: "We is designed to make learning social again. Instead of learning alone, you learn with peers.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold mb-8 text-foreground">
            About We
          </h1>
          
          <div className="space-y-6 text-base text-muted-foreground leading-relaxed">
            <p>
              In this hyper-connected world, learning still feels lonely.
              We enroll in online courses with good intentions.
              But most of us never complete them.
              We save videos, tutorials, and links, but rarely go back to watch them.
            </p>

            <p>
              Not because we don’t want to learn,
              but because videos replaced conversations, courses replaced communities, 
              and for millions of us, especially outside the metros, language became another invisible barrier.
            </p>

            <p>
              Real learning needs people.<br/>
              Someone to ask questions with.<br/>
              Someone to explain things again.<br/>
              Someone to discuss, practice, and grow with.
            </p>

            <p>
              That’s the problem we felt personally.
              And that’s why we built We.
            </p>

            <p>
              We is designed to make learning social again.
              Instead of learning alone from a screen, you learn with peers.
              You talk, ask, explain, debate, and practice together, often in the language you’re most comfortable with.
            </p>

            <p>
              Here, learning flows both ways.
              You’re not just a learner.
              You also teach what you know.
            </p>

            <p>
              Because learning shouldn’t feel like a task.
              It should feel like something you want to come back to.
            </p>

            <p>
              Together, let’s make learning a passion project.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
