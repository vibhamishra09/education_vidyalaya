import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Footer } from '../components/layout/footer';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Stack.Screen options={{ title: 'Privacy Policy', headerBackTitleVisible: false }} />
      <ScrollView className="flex-1">
        <View className="px-4 py-8 md:py-12">
          <View className="mb-8 items-center">
            <Text className="text-3xl font-bold tracking-tight text-foreground text-center">
              WEBYALAYA
            </Text>
            <Text className="text-muted-foreground mt-2 text-center">
              (Operated by Humitra Private Limited)
            </Text>
            <Text className="text-2xl font-semibold mt-6 text-foreground text-center">
              PRIVACY POLICY
            </Text>
            <Text className="text-sm text-muted-foreground mt-1 text-center">
              Effective Date: January 26, 2026
            </Text>
          </View>

          <View className="space-y-6">
            <Text className="text-base text-foreground leading-6 mb-4">
              Webyalaya (“Webyalaya”, “we”, “our”, “us”) is a Human + AI powered
              peer‑to‑peer learning platform operated by Humitra Private
              Limited, incorporated under the laws of India. This Privacy Policy
              explains how we collect, use, store, disclose, and safeguard
              information when you access or use the Webyalaya platform (the
              “Platform”).
            </Text>
            <Text className="text-base text-foreground leading-6 mb-4">
              By accessing or using the Platform, you acknowledge that you have
              read, understood, and agreed to the practices described in this
              Privacy Policy.
            </Text>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                1. Regulatory & Policy Alignment
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Webyalaya is designed and operated in alignment with applicable
                Indian laws and government frameworks, including but not limited
                to the Information Technology Act, 2000, applicable IT Rules,
                data‑protection best practices, Startup India and DPIIT
                guidelines, and the principles outlined under the National
                Education Policy (NEP) 2020.
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                The Platform follows ethical AI usage, data minimization,
                transparency, and user‑consent–driven practices consistent with
                Government of India advisories and emerging regulatory
                expectations.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                2. Information We Collect
              </Text>
              <View className="space-y-4">
                <View>
                  <Text className="font-semibold text-foreground mb-1">
                    2.1 Personal Information
                  </Text>
                  <Text className="text-base text-foreground leading-6 mb-2">We may collect personal information including but not limited to:</Text>
                  <View className="pl-5 space-y-1">
                    <Text className="text-base text-foreground leading-6">• Full name</Text>
                    <Text className="text-base text-foreground leading-6">• Email address and mobile number</Text>
                    <Text className="text-base text-foreground leading-6">
                      • Profile details such as skills, interests, learning goals,
                      and educational background
                    </Text>
                    <Text className="text-base text-foreground leading-6">• Login credentials and account preferences</Text>
                  </View>
                </View>
                <View>
                  <Text className="font-semibold text-foreground mb-1">
                    2.2 Learning & Platform Activity
                  </Text>
                  <View className="pl-5 space-y-1">
                    <Text className="text-base text-foreground leading-6">
                      • Sessions attended (one‑to‑one sessions, group sessions,
                      study rooms, debate rooms)
                    </Text>
                    <Text className="text-base text-foreground leading-6">
                      • Participation in discussions, forums, and community
                      activities
                    </Text>
                    <Text className="text-base text-foreground leading-6">• Peer ratings, feedback, and reputation indicators</Text>
                    <Text className="text-base text-foreground leading-6">• Certificates, achievements, and learning history</Text>
                  </View>
                </View>
                <View>
                  <Text className="font-semibold text-foreground mb-1">
                    2.3 Live Session & Content Data
                  </Text>
                  <Text className="text-base text-foreground leading-6 mb-2">
                    During live interactions, we may collect and process: -
                    Audio, video, chat messages, screen shares, and shared
                    materials from one‑to‑one sessions, group sessions, study
                    rooms, and debate rooms
                  </Text>
                </View>
                <View>
                  <Text className="font-semibold text-foreground mb-1">
                    2.4 Wallet & Digital Credit Data
                  </Text>
                  <View className="pl-5 space-y-1">
                    <Text className="text-base text-foreground leading-6">• Webya Coins wallet balance</Text>
                    <Text className="text-base text-foreground leading-6">• Transaction and usage history</Text>
                    <Text className="text-base text-foreground leading-6">• Credits earned, spent, or rewarded within the Platform</Text>
                  </View>
                </View>
                <View>
                  <Text className="font-semibold text-foreground mb-1">
                    2.5 AI‑Generated Data
                  </Text>
                  <View className="pl-5 space-y-1">
                    <Text className="text-base text-foreground leading-6">• Session summaries and learning notes</Text>
                    <Text className="text-base text-foreground leading-6">• Personalized recommendations and progress insights</Text>
                    <Text className="text-base text-foreground leading-6">• AI‑based moderation signals and quality indicators</Text>
                  </View>
                </View>
                <View>
                  <Text className="font-semibold text-foreground mb-1">
                    2.6 Technical & Usage Data
                  </Text>
                  <View className="pl-5 space-y-1">
                    <Text className="text-base text-foreground leading-6">• IP address and device identifiers</Text>
                    <Text className="text-base text-foreground leading-6">• Browser type, operating system, and usage logs</Text>
                    <Text className="text-base text-foreground leading-6">• Cookies, analytics data, and diagnostic information</Text>
                  </View>
                </View>
              </View>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                3. Lawful Processing & User Consent
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                All personal data collected by Webyalaya is processed lawfully,
                fairly, and transparently, with explicit user consent obtained
                at the time of registration and continued platform usage. Users
                are informed of the purpose, scope, and retention of their data
                in accordance with applicable Indian data‑protection norms and
                evolving regulatory requirements.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                4. How We Use Your Information
              </Text>
              <Text className="text-base text-foreground leading-6 mb-2">We use collected information to:</Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">
                  • Enable and facilitate peer‑to‑peer learning and collaboration
                </Text>
                <Text className="text-base text-foreground leading-6">• Match learners with relevant peers, mentors, and groups</Text>
                <Text className="text-base text-foreground leading-6">• Conduct live sessions, study rooms, and debates</Text>
                <Text className="text-base text-foreground leading-6">
                  • Generate AI‑assisted summaries, recommendations, and
                  moderation
                </Text>
                <Text className="text-base text-foreground leading-6">• Maintain platform safety, trust, and quality standards</Text>
                <Text className="text-base text-foreground leading-6">
                  • Issue participation certificates and learning acknowledgements
                </Text>
                <Text className="text-base text-foreground leading-6">• Improve features, performance, and user experience</Text>
                <Text className="text-base text-foreground leading-6">
                  • Communicate important updates, notices, and support messages
                </Text>
                <Text className="text-base text-foreground leading-6">• Comply with legal, regulatory, and audit obligations</Text>
              </View>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                5. Live Session Recording & Content Usage
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                By accessing or using Webyalaya, you acknowledge and agree that
                live sessions, study rooms, and debate rooms may be recorded.
                Recordings may include audio, video, chat messages, and shared
                content.
              </Text>
              <Text className="text-base text-foreground leading-6 mb-2">
                You grant Webyalaya a non‑exclusive, royalty‑free, worldwide,
                perpetual license to store, use, reproduce, modify, anonymize,
                distribute, and display such recordings or excerpts for:
              </Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">• Platform improvement and quality assurance</Text>
                <Text className="text-base text-foreground leading-6">• Educational and training purposes</Text>
                <Text className="text-base text-foreground leading-6">• Research, analytics, and insights</Text>
                <Text className="text-base text-foreground leading-6">• Marketing and promotional activities</Text>
              </View>
              <Text className="text-base text-foreground leading-6 mt-2 mb-4">
                Debate Rooms may be recorded for moderation, safety review,
                dispute resolution, and compliance purposes. Recordings may
                include audio, video, chat messages, and shared materials.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                6. Debate Rooms & Conduct
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Debate Rooms are structured discussion spaces intended for
                educational and skill-building purposes. Users must engage
                respectfully and refrain from abusive, defamatory, misleading,
                hateful, or unlawful speech.
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Webyalaya reserves the right to monitor, moderate, restrict, or
                remove content and participants in Debate Rooms to maintain
                safety, learning integrity, and compliance with applicable laws.
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Debate Rooms may not be used for political campaigning,
                electoral advocacy, extremist propaganda, or organized
                persuasion activities. Educational discussion of public policy
                or civics is permitted where conducted respectfully and
                factually.
              </Text>
            </View>

            <View>
              <Text className="text-xl font-semibold text-foreground mb-3">
                7. Webya Coins & Wallet System
              </Text>
              <Text className="text-base text-foreground leading-6 mb-4">
                Webya Coins are a closed‑loop, platform‑specific digital credit
                system intended solely to facilitate learning interactions
                within Webyalaya.
              </Text>
              <Text className="text-base text-foreground leading-6 mb-2">Webya Coins:</Text>
              <View className="pl-5 space-y-1">
                <Text className="text-base text-foreground leading-6">• Do not represent real currency or monetary value</Text>
                <Text className="text-base text-foreground leading-6">• Are not transferable, tradable, or redeemable for cash</Text>
                <Text className="text-base text-foreground leading-6">
                  • Do not constitute cryptocurrency, securities, or financial
                  instruments
                </Text>
                <Text className="text-base text-foreground leading-6">• Are usable only within the Webyalaya Platform</Text>
              </View>
              <Text className="text-base text-foreground leading-6 mt-2 mb-4">
                Webyalaya does not provide financial services, investment
                advice, or banking facilities.
              </Text>
            </View>
          </View>
        </View>
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}
