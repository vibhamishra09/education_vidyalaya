# Feedback System Components

This directory contains React components for collecting platform-wide feedback from users.

## Components

### FeedbackWidget

A floating button that opens a feedback form dialog. Can be positioned in different corners of the screen.

**Props:**
- `initialFeatureArea?: FeatureArea` - Pre-select a feature area
- `initialMetadata?: Record<string, any>` - Additional metadata to include
- `position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"` - Widget position

**Usage:**
```tsx
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

// In your layout or page
<FeedbackWidget position="bottom-right" />
```

### FeedbackForm

A comprehensive feedback form with support for:
- Feature area selection
- Star ratings (1-5)
- Category tags (bug, feature-request, etc.)
- Free-form text
- File attachments
- Custom tags
- Priority selection

**Props:**
- `initialFeatureArea?: FeatureArea`
- `initialMetadata?: Record<string, any>`
- `onSuccess?: (feedbackId: string) => void`
- `onCancel?: () => void`

**Usage:**
```tsx
import { FeedbackForm } from "@/components/feedback/feedback-form";

<FeedbackForm
  initialFeatureArea="studyRooms"
  initialMetadata={{ studyRoomId: "123" }}
  onSuccess={(feedbackId) => console.log("Submitted:", feedbackId)}
  onCancel={() => console.log("Cancelled")}
/>
```

## Hooks

### useFeedback

Hook for programmatically opening feedback forms.

**Usage:**
```tsx
import { useFeedback } from "@/hooks/use-feedback";

const { openFeedback, closeFeedback, isOpen } = useFeedback({
  featureArea: "dashboard",
  metadata: { page: "dashboard" },
  onSuccess: (feedbackId) => {
    console.log("Feedback submitted:", feedbackId);
  },
});

// Open feedback form
<Button onClick={openFeedback}>Give Feedback</Button>
```

### useActionFeedback

Hook for triggering feedback after specific actions (e.g., after completing a study room).

**Usage:**
```tsx
import { useActionFeedback } from "@/hooks/use-feedback";

function StudyRoomCompletion() {
  const { triggerFeedback } = useActionFeedback(
    "study-room-completed",
    "studyRooms",
    { studyRoomId: "123" }
  );

  const handleComplete = async () => {
    // Complete study room logic...
    await completeStudyRoom();
    
    // Trigger feedback prompt
    triggerFeedback();
  };

  return <Button onClick={handleComplete}>Complete</Button>;
}
```

## Integration Examples

### 1. Global Feedback Widget

Add to your root layout (`app/layout.tsx`):

```tsx
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {/* Add feedback widget */}
        {process.env.NEXT_PUBLIC_ENABLE_FEEDBACK === "true" && (
          <FeedbackWidget position="bottom-right" />
        )}
      </body>
    </html>
  );
}
```

### 2. Context-Specific Feedback

After completing a study room:

```tsx
import { useActionFeedback } from "@/hooks/use-feedback";

function CompleteStudyRoomButton({ studyRoomId }) {
  const { triggerFeedback } = useActionFeedback(
    "study-room-completed",
    "studyRooms",
    { studyRoomId }
  );

  const handleComplete = async () => {
    try {
      await completeStudyRoom(studyRoomId);
      // Trigger feedback after successful completion
      setTimeout(() => triggerFeedback(), 1000);
    } catch (error) {
      // Handle error
    }
  };

  return <Button onClick={handleComplete}>Complete Session</Button>;
}
```

### 3. Feature-Specific Feedback

On a specific page:

```tsx
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Dashboard content */}
      
      <FeedbackWidget
        initialFeatureArea="dashboard"
        position="bottom-left"
      />
    </div>
  );
}
```

### 4. Scheduled Prompts

You can implement scheduled feedback prompts using browser storage:

```tsx
"use client";

import { useEffect } from "react";
import { useFeedback } from "@/hooks/use-feedback";

export function ScheduledFeedbackPrompt() {
  const { openFeedback } = useFeedback({
    featureArea: "general",
  });

  useEffect(() => {
    const lastPrompt = localStorage.getItem("lastFeedbackPrompt");
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (!lastPrompt || now - parseInt(lastPrompt) > oneWeek) {
      // Show prompt after 5 seconds
      const timer = setTimeout(() => {
        if (confirm("Would you like to share feedback about your experience?")) {
          openFeedback();
        }
        localStorage.setItem("lastFeedbackPrompt", now.toString());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [openFeedback]);

  return null;
}
```

## Environment Variables

Add to your `.env.local`:

```bash
# Feedback API endpoint (from AWS API Gateway)
NEXT_PUBLIC_FEEDBACK_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/<stage>

# Enable/disable feedback widget globally
NEXT_PUBLIC_ENABLE_FEEDBACK=true
```

## API Client

The feedback API client is available at `@/lib/api/feedback.api`:

```tsx
import { feedbackApi } from "@/lib/api";

// Submit feedback
const response = await feedbackApi.submitFeedback({
  featureArea: "studyRooms",
  feedbackType: "freeform",
  freeformText: "Great feature!",
  // ... other fields
});

// Upload attachment
await feedbackApi.uploadAttachment(feedbackId, {
  fileName: "screenshot.png",
  fileType: "image/png",
  fileData: base64Data,
});

// Get feedback
const feedback = await feedbackApi.getFeedback(feedbackId);

// Get feedback list
const list = await feedbackApi.getFeedbackList({
  featureArea: "studyRooms",
  limit: 20,
});

// Get statistics
const stats = await feedbackApi.getFeedbackStats();
```

## Feature Areas

Available feature areas for feedback:
- `studyRooms` - Study room features
- `peerSessions` - Peer session features
- `dashboard` - Dashboard
- `payments` - Payment system
- `reviews` - Review system
- `notifications` - Notifications
- `browse` - Browse & search
- `chat` - Chat functionality
- `profile` - User profiles
- `skills` - Skills management
- `achievements` - Achievements system
- `streaks` - Streaks
- `availability` - Availability calendar
- `general` - General platform feedback
- `other` - Other features

## Categories

Available feedback categories:
- `bug` - Bug report
- `feature-request` - Feature request
- `ui-issue` - UI/UX issue
- `performance` - Performance issue
- `accessibility` - Accessibility concern
- `documentation` - Documentation feedback
- `other` - Other

