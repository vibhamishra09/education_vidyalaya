import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Read Webyalaya's Terms of Use. Understand your rights and responsibilities when using our peer-to-peer learning platform.",
  keywords: [
    "terms of use",
    "terms and conditions",
    "user agreement",
    "webyalaya terms",
    "platform terms",
    "legal agreement",
  ],
  openGraph: {
    title: "Terms of Use | Webyalaya",
    description: "Terms and conditions for using Webyalaya's peer-to-peer learning platform.",
    url: "/terms-of-use",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Terms of Use | Webyalaya",
    description: "Terms and conditions for using Webyalaya.",
  },
  alternates: {
    canonical: "/terms-of-use",
  },
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing and using Webyalaya ("the Platform"), you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services. Webyalaya is operated by Humitra Pvt Ltd ("we," "us," or "our").`,
  },
  {
    title: "2. Description of Service",
    content: `Webyalaya is a peer-to-peer learning platform that connects learners with peers who can teach specific skills. Our services include:
- Creating and joining study rooms for collaborative learning
- Requesting and hosting peer-to-peer tutoring sessions
- Earning and spending mAYA coins (virtual currency)
- Browsing profiles, skills, and study rooms
- Real-time video/audio communication for sessions
- Review and rating systems`,
  },
  {
    title: "3. User Accounts",
    content: `To use certain features of the Platform, you must create an account. You agree to:
- Provide accurate, current, and complete information during registration
- Maintain and promptly update your account information
- Maintain the security of your account credentials
- Accept responsibility for all activities under your account
- Notify us immediately of any unauthorized use of your account
- Complete the onboarding process before accessing protected features`,
  },
  {
    title: "4. User Conduct",
    content: `You agree to use the Platform only for lawful purposes and in accordance with these Terms. You agree NOT to:
- Violate any applicable laws or regulations
- Infringe upon the rights of others, including intellectual property rights
- Harass, abuse, or harm other users
- Post false, misleading, or fraudulent information
- Spam or send unsolicited communications
- Interfere with or disrupt the Platform's operation
- Attempt to gain unauthorized access to any part of the Platform
- Use automated systems to access the Platform without permission
- Impersonate any person or entity
- Engage in any activity that could damage the Platform's reputation`,
  },
  {
    title: "5. Content and Intellectual Property",
    content: `You retain ownership of content you post on the Platform. However, by posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content for the purpose of operating and promoting the Platform.

All Platform content, including but not limited to logos, designs, text, graphics, and software, is the property of Humitra Pvt Ltd or its licensors and is protected by copyright and other intellectual property laws.`,
  },
  {
    title: "6. mAYA Coins and Virtual Currency",
    content: `mAYA coins are virtual currency used within the Platform. Important terms:
- mAYA coins have no real-world monetary value and cannot be exchanged for cash
- Coins are earned through hosting sessions, completing challenges, and other platform activities
- Coins can be spent on premium features, study room access, and highlighted requests
- All coin transactions are final and non-refundable unless required by law
- We reserve the right to modify coin earning rates, spending costs, or remove coins for violations
- Coins may expire or be forfeited if your account is terminated`,
  },
  {
    title: "7. Sessions and Study Rooms",
    content: `When participating in sessions or study rooms:
- You are responsible for your conduct during sessions
- We are not responsible for the quality, accuracy, or outcomes of peer-to-peer sessions
- Session hosts set their own availability and may accept or decline requests at their discretion
- Cancellation policies apply as specified in the Platform
- Refunds for paid sessions are subject to our refund policy
- We reserve the right to remove or cancel sessions that violate these Terms`,
  },
  {
    title: "8. Payments and Refunds",
    content: `If you make payments through the Platform:
- All payments are processed securely through our payment partners
- Prices are displayed in the applicable currency
- Refunds are subject to our refund policy and applicable laws
- We reserve the right to change pricing with reasonable notice
- Disputes regarding payments should be reported to us within 30 days`,
  },
  {
    title: "9. Privacy",
    content: `Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Platform, to understand our practices regarding your personal information.`,
  },
  {
    title: "10. Termination",
    content: `We may terminate or suspend your account and access to the Platform immediately, without prior notice, for any reason, including if you breach these Terms. Upon termination:
- Your right to use the Platform will cease immediately
- We may delete your account and associated data
- Any mAYA coins or other virtual assets may be forfeited
- You remain liable for all obligations incurred before termination`,
  },
  {
    title: "11. Disclaimers",
    content: `THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
- MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT
- Accuracy, reliability, or completeness of content
- Uninterrupted or error-free operation
- Security of data transmission
- Results from using the Platform

We do not guarantee that the Platform will meet your requirements or be available at all times.`,
  },
  {
    title: "12. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING:
- Loss of profits, data, or other intangible losses
- Damages resulting from your use or inability to use the Platform
- Damages resulting from unauthorized access to your account
- Damages resulting from interactions with other users

Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    title: "13. Indemnification",
    content: `You agree to indemnify, defend, and hold harmless Humitra Pvt Ltd, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
- Your use of the Platform
- Your violation of these Terms
- Your violation of any rights of another
- Your content posted on the Platform`,
  },
  {
    title: "14. Governing Law",
    content: `These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts in India.`,
  },
  {
    title: "15. Changes to Terms",
    content: `We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on the Platform and updating the "Last Updated" date. Your continued use of the Platform after changes become effective constitutes acceptance of the modified Terms.`,
  },
  {
    title: "16. Contact Information",
    content: `If you have questions about these Terms, please contact us at:
- Email: support@webyalaya.com
- Company: Humitra Pvt Ltd`,
  },
  {
    title: "17. Severability",
    content: `If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.`,
  },
  {
    title: "18. Entire Agreement",
    content: `These Terms, together with our Privacy Policy, constitute the entire agreement between you and Humitra Pvt Ltd regarding your use of the Platform and supersede all prior agreements and understandings.`,
  },
];

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Suspense fallback={null}>
        <Navigation />
      </Suspense>
      <main className="flex-1">
        <section className="bg-background border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-primary">Legal Document</p>
              </div>
              <h1 className="text-4xl font-semibold mb-4">Terms of Use</h1>
              <p className="text-muted-foreground font-tagline mb-2">
                Last Updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="text-lg text-muted-foreground font-tagline">
                Please read these Terms of Use carefully before using Webyalaya. By using our platform, you agree to be bound by these terms.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {sections.map((section, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                    <p className="text-muted-foreground font-tagline leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-primary text-primary-foreground border-none">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4">Questions About These Terms?</h2>
                  <p className="text-primary-foreground/80 mb-6 font-tagline">
                    If you have any questions or concerns about these Terms of Use, please don't hesitate to contact us.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/privacy-policy"
                      className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm font-medium"
                    >
                      View Privacy Policy
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm font-medium"
                    >
                      Return to Home
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
