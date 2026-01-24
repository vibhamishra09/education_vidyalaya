import { Footer } from "@/components/layout/footer";
import { Navigation } from "@/components/layout/navigation";
import { Suspense } from "react";

export default function TermsOfUsePage() {
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
              TERMS & CONDITIONS
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Effective Date: January 26, 2026
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <p>
              These Terms & Conditions govern your access to and use of It
              Webyalaya. By using the Platform, you agree to be bound by these
              Terms.
            </p>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                1. Platform Nature & Role
              </h3>
              <p>
                Webyalaya is a peer‑to‑peer learning facilitation platform. We
                are not a university, coaching institute, employer, or
                government‑recognized certification authority. We do not
                guarantee learning outcomes, employment, academic success, or
                career advancement.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                2. Eligibility & Account Responsibility
              </h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Users must provide accurate and complete information</li>
                <li>
                  Users are responsible for maintaining account confidentiality
                </li>
                <li>
                  Any activity conducted through a user account is the user’s
                  responsibility
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                3. Acceptable Use & Conduct
              </h3>
              <p>Users must:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Engage respectfully in all sessions and interactions</li>
                <li>
                  Refrain from abusive, misleading, harmful, or unlawful conduct
                </li>
                <li>Not impersonate others or misrepresent credentials</li>
              </ul>
              <p className="mt-2 text-destructive">
                Violation of these standards may result in suspension or
                termination.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                4. Live Sessions & Content Rights
              </h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Sessions may be recorded</li>
                <li>
                  Users retain ownership of original content they create or share
                </li>
                <li>
                  Webyalaya retains rights over platform infrastructure,
                  AI‑generated outputs, and aggregated, anonymized learning
                  insights
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                5. Payments, Refunds & Cancellations
              </h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  Certain features or sessions may require payment or Webya Coins
                </li>
                <li>Refund eligibility is governed by platform‑specific policies</li>
                <li>
                  No‑shows or late cancellations may result in forfeiture of
                  credits
                </li>
                <li>Webya Coins are non‑refundable and non‑redeemable</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                6. No Degree or Formal Certification Claim
              </h3>
              <p>
                Webyalaya does not award formal academic degrees. Certificates
                or recognitions issued are participation‑based or skill‑based
                acknowledgements and should not be interpreted as
                government‑recognized academic qualifications unless explicitly
                stated.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                7. AI Usage Disclaimer
              </h3>
              <p>
                AI tools are used for moderation, summaries, and recommendations.
                AI outputs are assistive and not authoritative. Webyalaya reserves
                the right to override AI‑based decisions.
              </p>
              <p className="mt-2">
                Debate Rooms may use AI-assisted tools for moderation, safety
                detection, and quality signals. AI systems operate under human
                oversight and do not make final disciplinary decisions
                independently.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                8. Suspension & Termination
              </h3>
              <p>Webyalaya may suspend or terminate access if:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>These Terms are violated</li>
                <li>Fraud, misuse, or abuse is detected</li>
                <li>Platform integrity or safety is compromised</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                9. Limitation of Liability
              </h3>
              <p>Webyalaya is not liable for:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Accuracy or reliability of peer‑shared content</li>
                <li>Learning outcomes or career impact</li>
                <li>
                  Interruptions due to technical issues or external factors.
                </li>
              </ul>
              <p className="mt-2">
                Webyalaya does not guarantee the factual accuracy of statements
                made in Debate Rooms. Users are encouraged to verify information
                independently. Repeated dissemination of knowingly false or
                misleading information may result in moderation or suspension.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                10. Indemnity
              </h3>
              <p>
                Users agree to indemnify and hold harmless Webyalaya and Humitra
                Private Limited from claims arising from misuse, violations of
                these Terms, or unlawful conduct.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                11. Force Majeure
              </h3>
              <p>
                Webyalaya shall not be liable for failure or delay in performance
                due to events beyond reasonable control, including natural
                disasters, government actions, network failures, or system
                outages.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                12. Governing Law & Jurisdiction
              </h3>
              <p>
                These Terms are governed by the laws of India. Jurisdiction lies
                exclusively with Indian courts.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                13. Updates to Terms
              </h3>
              <p>
                We may revise these Terms periodically. Continued use of the
                Platform constitutes acceptance of the updated Terms.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
