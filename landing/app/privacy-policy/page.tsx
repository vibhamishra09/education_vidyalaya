import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read Webyalaya's Privacy Policy. Learn how we collect, use, and protect your personal information on our peer-to-peer learning platform.",
  keywords: [
    "privacy policy",
    "data protection",
    "user privacy",
    "webyalaya privacy",
    "personal information",
    "data security",
  ],
  openGraph: {
    title: "Privacy Policy | Webyalaya",
    description: "How Webyalaya collects, uses, and protects your personal information.",
    url: "/privacy-policy",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Webyalaya",
    description: "How Webyalaya protects your privacy.",
  },
  alternates: {
    canonical: "/privacy-policy",
  },
};

const sections = [
  {
    title: "1. Introduction",
    content: `Welcome to Webyalaya. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how Humitra Pvt Ltd ("we," "us," or "our") collects, uses, discloses, and safeguards your information when you use our peer-to-peer learning platform ("the Platform" or "Webyalaya").

By using Webyalaya, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.`,
  },
  {
    title: "2. Information We Collect",
    content: `We collect several types of information to provide and improve our services:

**Personal Information:**
- Name, email address, and profile information
- Authentication credentials (managed by Clerk)
- Profile photos and biographical information
- Skills you have and skills you want to learn
- Payment and billing information (processed securely through payment partners)

**Usage Information:**
- Session history and participation records
- Study room creation and participation
- Peer requests sent and received
- mAYA coin transactions and wallet activity
- Reviews and ratings you provide or receive
- Communication preferences and notification settings

**Technical Information:**
- Device information (type, operating system, browser)
- IP address and location data (general geographic area)
- Log data (access times, pages viewed, features used)
- Cookies and similar tracking technologies
- Video/audio session data (for quality and support purposes)`,
  },
  {
    title: "3. How We Use Your Information",
    content: `We use the information we collect for the following purposes:

**Service Provision:**
- Create and manage your account
- Facilitate peer-to-peer learning sessions
- Enable study room creation and participation
- Process payments and manage mAYA coin transactions
- Send session reminders and notifications
- Provide customer support

**Platform Improvement:**
- Analyze usage patterns to improve our services
- Develop new features and functionality
- Personalize your experience
- Conduct research and analytics

**Communication:**
- Send important updates about your account
- Respond to your inquiries and support requests
- Send marketing communications (with your consent)
- Notify you about platform changes

**Safety and Security:**
- Detect and prevent fraud, abuse, or illegal activity
- Enforce our Terms of Use
- Protect the rights and safety of users
- Comply with legal obligations`,
  },
  {
    title: "4. Information Sharing and Disclosure",
    content: `We do not sell your personal information. We may share your information in the following circumstances:

**Public Profile Information:**
- Your profile (name, photo, skills, bio, ratings) is visible to other users
- Study rooms you create are publicly listed
- Reviews and ratings you provide may be visible on relevant profiles

**Service Providers:**
- Third-party services that help us operate the Platform (e.g., authentication, payments, hosting, analytics)
- These providers are contractually obligated to protect your information

**Legal Requirements:**
- When required by law, court order, or government regulation
- To protect our rights, property, or safety, or that of our users
- In connection with legal proceedings or investigations

**Business Transfers:**
- In the event of a merger, acquisition, or sale of assets, your information may be transferred
- We will notify you of any such change in ownership

**With Your Consent:**
- We may share information for any other purpose with your explicit consent`,
  },
  {
    title: "5. Data Security",
    content: `We implement appropriate technical and organizational security measures to protect your personal information:

- Encryption of data in transit and at rest
- Secure authentication through Clerk
- Regular security assessments and updates
- Access controls and authentication requirements
- Secure payment processing through trusted partners

However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your personal information for as long as necessary to:
- Provide our services to you
- Comply with legal obligations
- Resolve disputes and enforce agreements
- Maintain security and prevent fraud

When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal purposes. Some information may remain in backup systems for a limited time.`,
  },
  {
    title: "7. Your Rights and Choices",
    content: `You have the following rights regarding your personal information:

**Access and Portability:**
- Access the personal information we hold about you
- Request a copy of your data in a portable format

**Correction and Updates:**
- Update or correct your account information through your profile settings
- Request correction of inaccurate information

**Deletion:**
- Delete your account and associated data (subject to legal retention requirements)
- Request deletion of specific information

**Opt-Out:**
- Unsubscribe from marketing communications
- Adjust notification preferences in your account settings
- Disable cookies through your browser settings (may affect functionality)

**Objection and Restriction:**
- Object to certain processing of your information
- Request restriction of processing in certain circumstances

To exercise these rights, please contact us at support@webyalaya.com.`,
  },
  {
    title: "8. Cookies and Tracking Technologies",
    content: `We use cookies and similar tracking technologies to:
- Remember your preferences and settings
- Analyze how you use the Platform
- Provide personalized content and features
- Improve security and prevent fraud

**Types of Cookies:**
- Essential cookies: Required for the Platform to function
- Functional cookies: Remember your preferences
- Analytics cookies: Help us understand usage patterns
- Marketing cookies: Used for advertising (with consent)

You can control cookies through your browser settings, but disabling certain cookies may affect Platform functionality.`,
  },
  {
    title: "9. Third-Party Services",
    content: `Our Platform integrates with third-party services that have their own privacy policies:

**Clerk (Authentication):**
- Handles user authentication and account management
- See Clerk's privacy policy for their data practices

**Payment Processors:**
- Process payments securely
- Subject to their respective privacy policies

**LiveKit (Video/Audio):**
- Provides real-time communication for sessions
- See LiveKit's privacy policy for their practices

**Analytics Services:**
- Help us understand Platform usage
- May use cookies and tracking technologies

We encourage you to review the privacy policies of these third-party services.`,
  },
  {
    title: "10. Children's Privacy",
    content: `Webyalaya is not intended for users under the age of 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete that information promptly.

If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.`,
  },
  {
    title: "11. International Data Transfers",
    content: `Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using Webyalaya, you consent to the transfer of your information to these countries.

We take appropriate safeguards to ensure your information receives adequate protection in accordance with this Privacy Policy, regardless of where it is processed.`,
  },
  {
    title: "12. Changes to This Privacy Policy",
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of material changes by:
- Posting the updated Privacy Policy on the Platform
- Updating the "Last Updated" date
- Sending an email notification (for significant changes)

Your continued use of the Platform after changes become effective constitutes acceptance of the updated Privacy Policy.`,
  },
  {
    title: "13. Your Consent",
    content: `By using Webyalaya, you consent to:
- The collection and use of your information as described in this Privacy Policy
- The transfer of your information to countries where we operate
- The use of cookies and tracking technologies as described

If you do not consent, please do not use our services.`,
  },
  {
    title: "14. Contact Us",
    content: `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

**Email:** support@webyalaya.com
**Company:** Humitra Pvt Ltd

We will respond to your inquiry within a reasonable timeframe.`,
  },
  {
    title: "15. Governing Law",
    content: `This Privacy Policy is governed by the laws of India. Any disputes arising from this Privacy Policy or our data practices shall be subject to the exclusive jurisdiction of the courts in India.`,
  },
];

export default function PrivacyPolicyPage() {
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
                <Shield className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-primary">Privacy & Data Protection</p>
              </div>
              <h1 className="text-4xl font-semibold mb-4">Privacy Policy</h1>
              <p className="text-muted-foreground font-tagline mb-2">
                Last Updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="text-lg text-muted-foreground font-tagline">
                Your privacy is important to us. This policy explains how we collect, use, and protect your personal information when you use Webyalaya.
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
                  <h2 className="text-2xl font-semibold mb-4">Have Privacy Questions?</h2>
                  <p className="text-primary-foreground/80 mb-6 font-tagline">
                    If you have questions about how we handle your data or want to exercise your privacy rights, we're here to help.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/terms-of-use"
                      className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm font-medium"
                    >
                      View Terms of Use
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
