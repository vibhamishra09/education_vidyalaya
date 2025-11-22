"use client";

import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users } from "lucide-react";
import { motion, useScroll } from "framer-motion";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/hooks/use-require-auth";

export function FloatingActionButtons() {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();
  const requireAuth = useRequireAuth();

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      // Show buttons when user scrolls down 300px or more
      setIsVisible(latest > 300);
    });

    return () => unsubscribe();
  }, [scrollY]);

  const buttons = [
    {
      icon: Plus,
      label: "Host Room",
      variant: "default" as const,
      onClick: () => {
        requireAuth(() => {
          // TODO: Navigate to host room page or open host room modal
          console.log("Opening host room...");
        });
      },
    },
    {
      icon: BookOpen,
      label: "Add Skill",
      variant: "secondary" as const,
      onClick: () => {
        requireAuth(() => {
          // TODO: Navigate to add skill page or open add skill modal
          console.log("Opening add skill...");
        });
      },
    },
    {
      icon: Users,
      label: "Find Peer",
      variant: "outline" as const,
      onClick: () => {
        requireAuth(() => {
          // TODO: Navigate to find peer page
          console.log("Opening find peer...");
        });
      },
    },
  ];

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 right-6 flex flex-col gap-3 z-40"
    >
      {buttons.map((button, index) => (
        <motion.div
          key={button.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant={button.variant}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-shadow min-w-[140px]"
            onClick={button.onClick}
          >
            <button.icon className="h-5 w-5 mr-2" />
            {button.label}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}
