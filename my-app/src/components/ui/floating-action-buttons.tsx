"use client";

import { Button } from "@/components/ui/button";
import { Plus, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";

export function FloatingActionButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const requireAuth = useRequireAuth();

  // Avoid hydration-pathname flicker on initial mount.
  if (!pathname) {
    return null;
  }

  // Hide on video/webinar routes
  const isVideoCallRoute = pathname?.includes('/rooms/') || 
                          pathname?.includes('/sessions/') || 
                          pathname?.includes('/studyroom/') ||
                          pathname?.startsWith('/webinar/');

  if (isVideoCallRoute) {
    return null;
  }

  const handleCreateRoom = () => {
    requireAuth(() => {
      router.push("/create-study-room");
    });
  };

  const handleOpenChat = () => {
    requireAuth(() => {
      router.push("/chat");
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-20 right-6 md:bottom-10 z-50 flex flex-col gap-4 items-center"
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50/80"
          onClick={handleOpenChat}
          aria-label="Messages"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </motion.div>
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          onClick={handleCreateRoom}
          aria-label="Create study room"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
