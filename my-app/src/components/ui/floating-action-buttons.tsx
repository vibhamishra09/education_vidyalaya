"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";

export function FloatingActionButtons() {
  const router = useRouter();
  const requireAuth = useRequireAuth();

  const handleCreateRoom = () => {
    requireAuth(() => {
      router.push("/create-study-room");
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-20 right-6 md:bottom-10 z-40"
    >
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
