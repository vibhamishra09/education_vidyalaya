"use client";

import { useState, useCallback } from "react";
import { FeatureArea } from "@/types/api.types";

interface UseFeedbackOptions {
  featureArea?: FeatureArea;
  metadata?: Record<string, unknown>;
  onSuccess?: (feedbackId: string) => void;
}

/**
 * Hook for triggering feedback collection
 * Can be used to programmatically open feedback forms
 */
export function useFeedback(options: UseFeedbackOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);

  const openFeedback = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeFeedback = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSuccess = useCallback(
    (feedbackId: string) => {
      setIsOpen(false);
      if (options.onSuccess) {
        options.onSuccess(feedbackId);
      }
    },
    [options]
  );

  return {
    isOpen,
    openFeedback,
    closeFeedback,
    handleSuccess,
    featureArea: options.featureArea,
    metadata: options.metadata,
  };
}

/**
 * Hook for triggering feedback after specific actions
 * Example: After completing a study room, after a payment, etc.
 */
export function useActionFeedback(
  action: string,
  featureArea: FeatureArea,
  metadata?: Record<string, unknown>
) {
  const { openFeedback } = useFeedback({
    featureArea,
    metadata: {
      ...metadata,
      triggerAction: action,
      triggerTime: new Date().toISOString(),
    },
  });

  const triggerFeedback = useCallback(() => {
    // Could add logic here to check if feedback should be prompted
    // For example, only prompt 10% of the time, or after certain conditions
    openFeedback();
  }, [openFeedback]);

  return { triggerFeedback };
}

