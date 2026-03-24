import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Footer } from '../components/layout/footer';

export default function TermsOfUseScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Stack.Screen options={{ title: 'Terms of Use', headerBackTitleVisible: false }} />
      <ScrollView className="flex-1">
        <View className="px-4 py-8 md:py-12">
          <View className="mb-8 items-center">
             <Text className="text-3xl font-bold tracking-tight text-foreground text-center">
              WEBYALAYA
            </Text>
            <Text className="text-neutral-500 mt-2 text-center">
              (Operated by Humitra Private Limited)
            </Text>
            <Text className="text-2xl font-semibold mt-6 text-foreground text-center">
              TERMS & CONDITIONS
            </Text>
            <Text className="text-sm text-neutral-500 mt-1 text-center">
              Effective Date: January 26, 2026
            </Text>
          </View>

          <View className="space-y-6">
            <Text className="text-base text-foreground leading-6 mb-4">
              These Terms & Conditions govern your access to and use of It
              Webyalaya. By using the Platform, you agree to be bound by these
              Terms.
            </Text>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                1. Platform Nature & Role
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Webyalaya is a peer‑to‑peer learning facilitation platform. We
                are not a university, coaching institute, employer, or
                government‑recognized certification authority. We do not
                guarantee learning outcomes, employment, academic success, or
                career advancement.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                2. Eligibility & Account Responsibility
              </Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">• Users must provide accurate and complete information</Text>
                <Text className="text-base text-foreground leading-6">
                  • Users are responsible for maintaining account confidentiality
                </Text>
                <Text className="text-base text-foreground leading-6">
                  • Any activity conducted through a user account is the user’s
                  responsibility
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                3. Acceptable Use & Conduct
              </Text>
              <Text className="text-base text-foreground leading-6 mb-2">Users must:</Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">• Engage respectfully in all sessions and interactions</Text>
                <Text className="text-base text-foreground leading-6">
                  • Refrain from abusive, misleading, harmful, or unlawful conduct
                </Text>
                <Text className="text-base text-foreground leading-6">• Not impersonate others or misrepresent credentials</Text>
              </View>
              <Text className="text-base text-red-500 mt-2 leading-6">
                Violation of these standards may result in suspension or
                termination.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                4. Live Sessions & Content Rights
              </Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">• Sessions may be recorded</Text>
                <Text className="text-base text-foreground leading-6">
                  • Users retain ownership of original content they create or share
                </Text>
                <Text className="text-base text-foreground leading-6">
                  • Webyalaya retains rights over platform infrastructure,
                  AI‑generated outputs, and aggregated, anonymized learning
                  insights
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                5. Payments, Refunds & Cancellations
              </Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">
                  • Certain features or sessions may require payment or Webya Coins
                </Text>
                <Text className="text-base text-foreground leading-6">• Refund eligibility is governed by platform‑specific policies</Text>
                <Text className="text-base text-foreground leading-6">
                  • No‑shows or late cancellations may result in forfeiture of
                  credits
                </Text>
                <Text className="text-base text-foreground leading-6">• Webya Coins are non‑refundable and non‑redeemable</Text>
              </View>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                6. No Degree or Formal Certification Claim
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Webyalaya does not award formal academic degrees. Certificates
                or recognitions issued are participation‑based or skill‑based
                acknowledgements and should not be interpreted as
                government‑recognized academic qualifications unless explicitly
                stated.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                7. AI Usage Disclaimer
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                AI tools are used for moderation, summaries, and recommendations.
                AI outputs are assistive and not authoritative. Webyalaya reserves
                the right to override AI‑based decisions.
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Debate Rooms may use AI-assisted tools for moderation, safety
                detection, and quality signals. AI systems operate under human
                oversight and do not make final disciplinary decisions
                independently.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                8. Suspension & Termination
              </Text>
              <Text className="text-base text-foreground leading-6 mb-2">Webyalaya may suspend or terminate access if:</Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">• These Terms are violated</Text>
                <Text className="text-base text-foreground leading-6">• Fraud, misuse, or abuse is detected</Text>
                <Text className="text-base text-foreground leading-6">• Platform integrity or safety is compromised</Text>
              </View>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                9. Limitation of Liability
              </Text>
              <Text className="text-base text-foreground leading-6 mb-2">Webyalaya is not liable for:</Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">• Accuracy or reliability of peer‑shared content</Text>
                <Text className="text-base text-foreground leading-6">• Learning outcomes or career impact</Text>
                <Text className="text-base text-foreground leading-6">
                  • Interruptions due to technical issues or external factors.
                </Text>
              </View>
              <Text className="text-base text-foreground leading-6 mt-2 mb-4">
                Webyalaya does not guarantee the factual accuracy of statements
                made in Debate Rooms. Users are encouraged to verify information
                independently. Repeated dissemination of knowingly false or
                misleading information may result in moderation or suspension.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                10. Indemnity
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Users agree to indemnify and hold harmless Webyalaya and Humitra
                Private Limited from claims arising from misuse, violations of
                these Terms, or unlawful conduct.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                11. Force Majeure
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Webyalaya shall not be liable for failure or delay in performance
                due to events beyond reasonable control, including natural
                disasters, government actions, network failures, or system
                outages.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                12. Governing Law & Jurisdiction
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                These Terms are governed by the laws of India. Jurisdiction lies
                exclusively with Indian courts.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                13. Updates to Terms
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                We may revise these Terms periodically. Continued use of the
                Platform constitutes acceptance of the updated Terms.
              </Text>
            </View>
          </View>
        </View>
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}
