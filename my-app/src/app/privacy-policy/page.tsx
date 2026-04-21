import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Navigation } from "@/components/layout/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy | We",
  description: "Read We's Privacy Policy. Learn how we collect, use, store, and protect your personal information on our peer-to-peer learning platform. Compliant with Indian data protection laws.",
  keywords: [
    "privacy policy",
    "data protection",
    "user privacy",
    "data security",
    "personal information",
    "we privacy",
    "Indian data protection",
    "IT Act compliance",
  ],
  openGraph: {
    title: "Privacy Policy | We",
    description: "Learn how We protects your privacy and handles your personal information.",
    url: "/privacy-policy",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "We Privacy Policy",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | We",
    description: "Learn how We protects your privacy and handles your personal information.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={null}>
        <Navigation />
      </Suspense>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-foreground">
              WEBYALAYA
            </h1>
            <p className="text-muted-foreground mt-2">
              (Operated by Humitra Private Limited)
            </p>
            <h2 className="text-2xl font-semibold mt-6 text-foreground">
              PRIVACY POLICY
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Effective Date: January 26, 2026
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <p>
              We (“We”, “we”, “our”, “us”) is a Human + AI powered
              peer‑to‑peer learning platform operated by Humitra Private
              Limited, incorporated under the laws of India. This Privacy Policy
              explains how we collect, use, store, disclose, and safeguard
              information when you access or use the We platform (the
              “Platform”).
            </p>
            <p>
              By accessing or using the Platform, you acknowledge that you have
              read, understood, and agreed to the practices described in this
              Privacy Policy.
            </p>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                1. Regulatory & Policy Alignment
              </h3>
              <p>
                We is designed and operated in alignment with applicable
                Indian laws and government frameworks, including but not limited
                to the Information Technology Act, 2000, applicable IT Rules,
                data‑protection best practices, Startup India and DPIIT
                guidelines, and the principles outlined under the National
                Education Policy (NEP) 2020.
              </p>
              <p>
                The Platform follows ethical AI usage, data minimization,
                transparency, and user‑consent–driven practices consistent with
                Government of India advisories and emerging regulatory
                expectations.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                2. Information We Collect
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground">
                    2.1 Personal Information
                  </h4>
                  <p>We may collect personal information including but not limited to:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Full name</li>
                    <li>Email address and mobile number</li>
                    <li>
                      Profile details such as skills, interests, learning goals,
                      and educational background
                    </li>
                    <li>Login credentials and account preferences</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    2.2 Learning & Platform Activity
                  </h4>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      Sessions attended (one‑to‑one sessions, group sessions,
                      study rooms, debate rooms)
                    </li>
                    <li>
                      Participation in discussions, forums, and community
                      activities
                    </li>
                    <li>Peer ratings, feedback, and reputation indicators</li>
                    <li>Certificates, achievements, and learning history</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    2.3 Live Session & Content Data
                  </h4>
                  <p>
                    During live interactions, we may collect and process: -
                    Audio, video, chat messages, screen shares, and shared
                    materials from one‑to‑one sessions, group sessions, study
                    rooms, and debate rooms
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    2.4 Wallet & Digital Credit Data
                  </h4>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>We Coins wallet balance</li>
                    <li>Transaction and usage history</li>
                    <li>Credits earned, spent, or rewarded within the Platform</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    2.5 AI‑Generated Data
                  </h4>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Session summaries and learning notes</li>
                    <li>Personalized recommendations and progress insights</li>
                    <li>AI‑based moderation signals and quality indicators</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    2.6 Technical & Usage Data
                  </h4>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>IP address and device identifiers</li>
                    <li>Browser type, operating system, and usage logs</li>
                    <li>Cookies, analytics data, and diagnostic information</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                3. Lawful Processing & User Consent
              </h3>
              <p>
                All personal data collected by We is processed lawfully,
                fairly, and transparently, with explicit user consent obtained
                at the time of registration and continued platform usage. Users
                are informed of the purpose, scope, and retention of their data
                in accordance with applicable Indian data‑protection norms and
                evolving regulatory requirements.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                4. How We Use Your Information
              </h3>
              <p>We use collected information to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  Enable and facilitate peer‑to‑peer learning and collaboration
                </li>
                <li>Match learners with relevant peers, mentors, and groups</li>
                <li>Conduct live sessions, study rooms, and debates</li>
                <li>
                  Generate AI‑assisted summaries, recommendations, and
                  moderation
                </li>
                <li>Maintain platform safety, trust, and quality standards</li>
                <li>
                  Issue participation certificates and learning acknowledgements
                </li>
                <li>Improve features, performance, and user experience</li>
                <li>
                  Communicate important updates, notices, and support messages
                </li>
                <li>Comply with legal, regulatory, and audit obligations</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                5. Live Session Recording & Content Usage
              </h3>
              <p>
                By accessing or using We, you acknowledge and agree that
                live sessions, study rooms, and debate rooms may be recorded.
                Recordings may include audio, video, chat messages, and shared
                content.
              </p>
              <p className="mt-2">
                You grant We a non‑exclusive, royalty‑free, worldwide,
                perpetual license to store, use, reproduce, modify, anonymize,
                distribute, and display such recordings or excerpts for:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Platform improvement and quality assurance</li>
                <li>Educational and training purposes</li>
                <li>Research, analytics, and insights</li>
                <li>Marketing and promotional activities</li>
              </ul>
              <p className="mt-2">
                Debate Rooms may be recorded for moderation, safety review,
                dispute resolution, and compliance purposes. Recordings may
                include audio, video, chat messages, and shared materials.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                6. Debate Rooms & Conduct
              </h3>
              <p>
                Debate Rooms are structured discussion spaces intended for
                educational and skill-building purposes. Users must engage
                respectfully and refrain from abusive, defamatory, misleading,
                hateful, or unlawful speech.
              </p>
              <p className="mt-2">
                We reserves the right to monitor, moderate, restrict, or
                remove content and participants in Debate Rooms to maintain
                safety, learning integrity, and compliance with applicable laws.
              </p>
              <p className="mt-2">
                Debate Rooms may not be used for political campaigning,
                electoral advocacy, extremist propaganda, or organized
                persuasion activities. Educational discussion of public policy
                or civics is permitted where conducted respectfully and
                factually.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                7. We Coins & Wallet System
              </h3>
              <p>
                We Coins are a closed‑loop, platform‑specific digital credit
                system intended solely to facilitate learning interactions
                within We.
              </p>
              <p className="mt-2">We Coins:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Do not represent real currency or monetary value</li>
                <li>Are not transferable, tradable, or redeemable for cash</li>
                <li>
                  Do not constitute cryptocurrency, securities, or financial
                  instruments
                </li>
                <li>Are usable only within the We Platform</li>
              </ul>
              <p className="mt-2">
                We does not provide financial services, investment
                products, or payment guarantees of any kind.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                8. Data Sharing & Disclosure
              </h3>
              <p>
                We does not sell personal data. Information may be shared
                only:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  With trusted service providers (such as cloud hosting, analytics,
                  or AI services) strictly for operational purposes
                </li>
                <li>
                  To comply with legal obligations, court orders, or lawful
                  government requests
                </li>
                <li>
                  To protect the rights, safety, integrity, or security of
                  We and its users
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                9. Data Security, Localization & Retention
              </h3>
              <p>
                We implement industry‑standard administrative, technical, and
                organizational safeguards to protect user data.
              </p>
              <p className="mt-2">
                User data is securely stored on cloud infrastructure hosted with
                reputable service providers following recognized security
                certifications. Where applicable, data is stored and processed
                in compliance with Indian data localization requirements and
                Government of India regulations.
              </p>
              <p className="mt-2">
                Data is retained only for as long as necessary to fulfill
                operational, legal, regulatory, or audit requirements.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                10. User Rights
              </h3>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Access and update your personal information</li>
                <li>
                  Request correction or deletion of data, subject to legal
                  obligations
                </li>
                <li>Withdraw consent where applicable</li>
                <li>Contact us regarding concerns about data usage or privacy</li>
              </ul>
            </section>

            {/* Section 11 (Children & Minors) removed as requested */}

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                11. Content Neutrality Disclaimer
              </h3>
              <p>
                We acts as a neutral technology platform facilitating
                peer‑to‑peer learning. The views, opinions, and content shared
                by users do not represent the views of We or Humitra
                Private Limited.
              </p>
              <p className="mt-2">
                The views, opinions, and arguments expressed by participants in
                Debate Rooms are solely those of the users and do not represent
                the views of We or Humitra Private Limited. We
                does not endorse any position discussed in Debate Rooms.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                12. AI Ethics & Transparency
              </h3>
              <p>
                We uses AI responsibly to assist learning through
                moderation, summaries, and recommendations. AI systems are
                designed to augment human learning and decision‑making, not
                replace them.
              </p>
              <p className="mt-2">
                AI‑generated outputs are advisory in nature and subject to human
                oversight. We follows principles of transparency,
                fairness, and non‑discrimination in AI usage.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                13. Changes to This Policy
              </h3>
              <p>
                We may update this Privacy Policy periodically. Continued use of
                the Platform constitutes acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                14. Grievance Redressal
              </h3>
              <p>
                In accordance with the Information Technology Act and applicable
                rules, We has appointed a Grievance Officer.
              </p>
              <div className="mt-2 bg-muted p-4 rounded-lg">
                <p>
                  <span className="font-semibold">Grievance Officer:</span> Aakash
                  Mishra
                </p>
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  namaste@webyalaya.com
                </p>
                <p>
                  <span className="font-semibold">Response Time:</span> Within 15
                  working days
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                15. Contact Information
              </h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                 <p>
                  <span className="font-semibold">Email:</span>{" "}
                  namaste@webyalaya.com
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
