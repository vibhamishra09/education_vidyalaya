"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { SkillSearch } from "@/components/ui/skill-search";

export function HeroSection() {
  const requireAuth = useRequireAuth();
  const router = useRouter();

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-50/50 via-background to-background dark:from-green-950/20" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Peer-to-Peer Learning{" "}
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Community
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-tagline">
              Connect, learn, and grow together. Share knowledge, join study
              rooms, and engage in meaningful debates with peers worldwide.
            </p>
          </div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <SkillSearch
              placeholder="What do you want to learn today?"
            />
          </motion.div>

          {/* Start Study Room Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-md mx-auto"
          >
            <div
              className="flex flex-col items-center justify-center space-y-4 border-2 border-green-500 rounded-lg p-6 hover:border-green-600 transition-colors cursor-pointer group"
              onClick={() =>
                requireAuth(() => {
                  router.push("/create-study-room");
                })
              }
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Start Study Room</h3>
              <p className="text-sm text-muted-foreground text-center font-tagline">
                Create a room to teach and share knowledge
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
