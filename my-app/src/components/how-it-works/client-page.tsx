"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

type FeatureTab = "study-rooms" | "peer-sessions" | "webya-coins" | "streaks";

const FEATURES = {
  "study-rooms": {
    label: "Study Rooms",
    title: "Collaborate in real-time with focused peers.",
    description: "Create or join study rooms to work together on shared goals. Whether you're preparing for an exam or learning a new language, find your focused space.",
    points: [
      "Create rooms instantly: Set your topic, duration, and participant limit.",
      "Join active sessions: Browse live rooms and jump in to start learning.",
      "Interactive tools: Use built-in chat, whiteboard, and screen sharing.",
      "Stay accountable: timers and goal tracking keep everyone on task."
    ],
    image: "https://placehold.co/800x500/e0f2fe/0369a1?text=Study+Rooms+Demo",
    cta: "Browse Rooms",
    href: "/browse?tab=studyRooms"
  },
  "peer-sessions": {
    label: "Peer Sessions",
    title: "One-on-one learning that fits your schedule.",
    description: "Connect with peers for direct knowledge exchange. Request help on specific topics or offer your expertise to others.",
    points: [
      "Request specific help: Post a request for the topic you're stuck on.",
      "Find experts: Browse profiles to find peers with the skills you need.",
      "Schedule flexibly: Coordinate times that work for both of you.",
      "Earn reputation: Get rated and reviewed for your helpful sessions."
    ],
    image: "https://placehold.co/800x500/f0fdf4/15803d?text=Peer+Sessions+Demo",
    cta: "Find Peers",
    href: "/browse?tab=peers"
  },
  "webya-coins": {
    label: "WEBYA",
    title: "Earn rewards for your learning journey.",
    description: "Our virtual currency system rewards you for being an active and helpful member of the community. Invest in your learning growth.",
    points: [
      "Earn by helping: Get WEBYA for hosting study rooms or teaching peers.",
      "Daily rewards: Login bonuses and streak milestones boost your wallet.",
      "Spend wisely: Use WEBYA to highlight your requests or join premium rooms.",
      "Transparent wallet: Track every earning and spending transaction easily."
    ],
    image: "https://placehold.co/800x500/fff7ed/ea580c?text=WEBYA+Demo",
    cta: "Check Wallet",
    href: "/profile?tab=wallet"
  },
  "streaks": {
    label: "Streaks & Growth",
    title: "Build consistent habits that last.",
    description: "Consistency is key to mastery. We help you track your progress and maintain your momentum day after day.",
    points: [
      "Daily check-ins: Mark your attendance and keep your streak alive.",
      "Freeze streaks: Use items to save your streak if you miss a day.",
      "Visual progress: See your activity graph light up as you commit.",
      "Unlock achievements: Badge rewards for long-term consistency."
    ],
    image: "https://placehold.co/800x500/faf5ff/7e22ce?text=Streaks+%26+Growth+Demo",
    cta: "View Progress",
    href: "/dashboard"
  }
};

export function HowItWorksClient() {
  const [activeTab, setActiveTab] = useState<FeatureTab>("study-rooms");

  return (
    <div className="flex flex-col items-center">
      {/* Tab Navigation */}
      <div className="w-full max-w-4xl mx-auto mb-12 overflow-x-auto pb-4 sm:pb-0">
        <div className="flex flex-nowrap sm:flex-wrap items-center justify-start sm:justify-center gap-2 sm:gap-4 px-4 min-w-max sm:min-w-0">
          {(Object.keys(FEATURES) as FeatureTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap",
                activeTab === key
                  ? "bg-sky-100 text-sky-700 border-sky-200 shadow-sm"
                  : "bg-background text-muted-foreground border-transparent hover:bg-muted"
              )}
            >
              {FEATURES[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Left Column: Text */}
            <div className="space-y-8 order-2 lg:order-1">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  {FEATURES[activeTab].title}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {FEATURES[activeTab].description}
                </p>
              </div>

              <ul className="space-y-4">
                {FEATURES[activeTab].points.map((point, index) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 text-muted-foreground"
                  >
                    <CheckCircle2 className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-base">{point}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="pt-4">
                <Button size="lg" className="rounded-full px-8 bg-sky-100 text-sky-700 hover:bg-sky-200" asChild>
                  <Link href={FEATURES[activeTab].href}>
                    {FEATURES[activeTab].cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Image */}
            <div className="relative order-1 lg:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-muted aspect-[4/3] group">
                 {/* Decorative background behind image */}
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 z-0" />
                 
                 <Image 
                   src={FEATURES[activeTab].image} 
                   alt={FEATURES[activeTab].title}
                   fill
                   unoptimized
                   className="object-cover transition-transform duration-700 group-hover:scale-105"
                 />
                 
                 {/* Overlay Gradient */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              
              {/* Optional Floating Badge/Element decoration */}
              <div className="absolute -bottom-6 -left-6 bg-background rounded-xl p-4 shadow-xl border hidden md:block animate-bounce-slow">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {activeTab === "webya-coins" ? "🪙" : "🚀"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Webyalaya</div>
                      <div className="text-xs text-muted-foreground">Level up your learning</div>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
