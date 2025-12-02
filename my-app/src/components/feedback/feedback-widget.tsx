"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MessageSquare, X } from "lucide-react";
import { FeedbackForm } from "./feedback-form";
import { FeatureArea } from "@/types/api.types";

interface FeedbackWidgetProps {
  initialFeatureArea?: FeatureArea;
  initialMetadata?: Record<string, any>;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export function FeedbackWidget({
  initialFeatureArea,
  initialMetadata,
  position = "bottom-right",
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  const handleSuccess = (feedbackId: string) => {
    setIsOpen(false);
    // Could show a success message or trigger analytics
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`fixed ${positionClasses[position]} z-50`}
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            onClick={() => setIsOpen(true)}
            aria-label="Submit feedback"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </motion.div>
      </motion.div>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
            <DialogDescription>
              Help us improve by sharing your thoughts, reporting issues, or
              suggesting new features.
            </DialogDescription>
          </DialogHeader>
          <FeedbackForm
            initialFeatureArea={initialFeatureArea}
            initialMetadata={initialMetadata}
            onSuccess={handleSuccess}
            onCancel={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

