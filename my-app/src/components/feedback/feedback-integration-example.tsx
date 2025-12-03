"use client";

/**
 * Example integration of FeedbackWidget in your app
 * 
 * This file demonstrates different ways to integrate the feedback system:
 * 1. Global floating button (always visible)
 * 2. Context-specific feedback (after actions)
 * 3. Scheduled prompts
 */

import { FeedbackWidget } from "./feedback-widget";
import { useActionFeedback } from "@/hooks/use-feedback";
import { FeatureArea } from "@/types/api.types";

// Example 1: Global feedback widget (add to your root layout)
export function GlobalFeedbackWidget() {
  return <FeedbackWidget position="bottom-right" />;
}

// Example 2: Context-specific feedback after study room completion
export function StudyRoomFeedbackTrigger({ studyRoomId }: { studyRoomId: string }) {
  const { triggerFeedback } = useActionFeedback(
    "study-room-completed",
    "studyRooms",
    { studyRoomId }
  );

  // Call triggerFeedback() after study room completion
  // This could be in a useEffect or after an async operation
  // Expose for external use
  if (typeof window !== 'undefined') {
    (window as { __studyRoomFeedback?: () => void }).__studyRoomFeedback = triggerFeedback;
  }
  return null; // This is just for demonstration
}

// Example 3: Payment feedback trigger
export function PaymentFeedbackTrigger({ paymentId }: { paymentId: string }) {
  const { triggerFeedback } = useActionFeedback(
    "payment-completed",
    "payments",
    { paymentId }
  );

  // Expose for external use
  if (typeof window !== 'undefined') {
    (window as { __paymentFeedback?: () => void }).__paymentFeedback = triggerFeedback;
  }
  return null;
}

// Example 4: Feature-specific feedback widget
export function FeatureSpecificFeedback({ featureArea }: { featureArea: FeatureArea }) {
  return (
    <FeedbackWidget
      initialFeatureArea={featureArea}
      position="bottom-left"
    />
  );
}

/**
 * Usage in your components:
 * 
 * 1. Add to layout.tsx for global access:
 *    <GlobalFeedbackWidget />
 * 
 * 2. Trigger after actions:
 *    const { triggerFeedback } = useActionFeedback("action-name", "featureArea", { metadata });
 *    // After successful operation:
 *    triggerFeedback();
 * 
 * 3. Add to specific pages:
 *    <FeatureSpecificFeedback featureArea="dashboard" />
 */

