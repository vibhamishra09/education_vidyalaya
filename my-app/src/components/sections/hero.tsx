"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { SkillSearch } from "@/components/ui/skill-search";
import { Plus, ArrowRight, Users, Zap, Trophy } from "lucide-react";

export function HeroSection() {
  const requireAuth = useRequireAuth();
  const router = useRouter();

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center py-12 sm:py-16 overflow-hidden">

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* 2. Modern Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-[10px] sm:text-xs font-semibold mb-4 sm:mb-5"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="whitespace-nowrap">Join 2,000+ students learning today</span>
          </motion.div>

          {/* 3. Typography Upgrade */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white px-2">
              Peer-to-Peer Learning{" "}
              <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-blue-600 bg-clip-text text-transparent">
                Community
              </span>
            </h1>
            
            <div className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed space-y-4 sm:space-y-6 px-2">
              <p className="font-medium">
                Welcome to a community-led learning platform where you don&apos;t just watch content, you <span className="text-slate-900 dark:text-slate-200 font-semibold">talk, practice, debate,</span> and <span className="text-slate-900 dark:text-slate-200 font-semibold">grow</span> through real conversations.
              </p>
              
              <p className="text-sm sm:text-base italic opacity-90">
                Because real learning and growth happens, when we do it together.
              </p>
            
              <div className="pt-2 sm:pt-4 space-y-2 sm:space-y-3">
                <p className="font-bold text-slate-900 dark:text-white text-lg sm:text-xl">
                  Teach what you know. Learn what you want.
                </p>
                
                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base font-medium text-slate-700 dark:text-slate-300">
                  <span className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">Join study rooms</span>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                  <span className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">Host live sessions</span>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                  <span className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">Participate in Debates</span>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                  <span className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">Learn with each other</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 4. Functional Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto mt-6 relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative">
              <SkillSearch placeholder="Search skills, topics, or peers..." />
            </div>
          </motion.div>

          {/* 5. Clean Action Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 max-w-2xl mx-auto"
          >
            <div 
              onClick={() => requireAuth(() => router.push("/create-study-room"))}
              className="group cursor-pointer relative p-[1px] rounded-2xl overflow-hidden transition-all hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.3)]"
            >
              {/* Border Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-slate-200 dark:from-slate-800 dark:to-slate-800 group-hover:from-green-500 group-hover:to-blue-500 transition-all duration-500" />
              
              <div className="relative bg-white dark:bg-slate-950 p-4 sm:p-6 rounded-[15px] flex flex-col md:flex-row items-center gap-4 sm:gap-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-green-500/20 shrink-0">
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                
                <div className="flex-1 text-center md:text-left min-w-0">
                  <h3 className="text-base sm:text-lg font-bold flex items-center justify-center md:justify-start gap-2">
                    <span className="truncate">Create a Study Room</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0" />
                  </h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-4 mt-2">
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-medium">
                      <Users className="w-3 h-3 text-blue-500 shrink-0" /> <span className="whitespace-nowrap">Multi-peer</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-medium">
                      <Zap className="w-3 h-3 text-yellow-500 shrink-0" /> <span className="whitespace-nowrap">Live Interaction</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-medium">
                      <Trophy className="w-3 h-3 text-green-500 shrink-0" /> <span className="whitespace-nowrap">Reward Points</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}