# Platform Feedback Logging System

A comprehensive serverless feedback collection system using AWS services (API Gateway, Lambda, DynamoDB, S3) for collecting platform-wide feedback from initial users.

## Architecture Overview

```
Frontend (Next.js)
    ↓
API Gateway (REST API)
    ↓
Lambda Functions
    ├── SubmitFeedbackLambda → DynamoDB
    ├── UploadAttachmentLambda → S3 + DynamoDB
    ├── GetFeedbackLambda → DynamoDB
    ├── FeedbackStatsLambda → DynamoDB
    └── ScheduledFeedbackLambda → (Optional)
```

## Components

### Backend (AWS)

1. **DynamoDB Table**: Stores feedback records with GSIs for efficient querying
2. **S3 Bucket**: Stores file attachments (screenshots, logs, documents)
3. **Lambda Functions**: Process feedback submissions, uploads, and queries
4. **API Gateway**: REST API endpoint for frontend integration
5. **CloudWatch**: Monitoring, logging, and alarms

### Frontend (Next.js)

1. **FeedbackWidget**: Floating button component for easy access
2. **FeedbackForm**: Comprehensive feedback form with all features
3. **API Client**: TypeScript client for feedback operations
4. **Hooks**: React hooks for programmatic feedback triggers

## Quick Start

### 1. AWS Infrastructure Setup

```bash
cd scripts/aws

# Set environment variables (optional)
export AWS_REGION=us-east-1
export FEEDBACK_TABLE_NAME=Feedback
export FEEDBACK_BUCKET_NAME=webyalaya-feedback-attachments

# Create infrastructure
./setup-feedback-system.sh

# Build and deploy Lambda functions
cd ../../lambdas/feedback-system
npm install
npm run build
cd ../../scripts/aws
./deploy-lambdas.sh

# Configure API Gateway
export FEEDBACK_API_ID=<api-id-from-setup>
./update-api-gateway.sh

# Set up monitoring (optional)
./setup-monitoring.sh
```

### 2. Frontend Integration

Add to your `.env.local`:

```bash
NEXT_PUBLIC_FEEDBACK_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/<stage>
NEXT_PUBLIC_ENABLE_FEEDBACK=true
```

Add to your `app/layout.tsx`:

```tsx
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NEXT_PUBLIC_ENABLE_FEEDBACK === "true" && (
          <FeedbackWidget position="bottom-right" />
        )}
      </body>
    </html>
  );
}
```

## Features

### Feedback Collection

- **Structured Forms**: Ratings, categories, multiple choice
- **Free-form Text**: Detailed feedback and suggestions
- **File Attachments**: Screenshots, logs, documents (up to 10MB)
- **Feature Area Selection**: Categorize feedback by platform feature
- **Metadata Capture**: Automatic device info, user context, timestamps

### Feedback Types

- **Structured**: Ratings, categories, structured data
- **Freeform**: Text-based feedback
- **Mixed**: Combination of structured and freeform

### Feature Areas

- Study Rooms
- Peer Sessions
- Dashboard
- Payments
- Reviews
- Notifications
- Browse & Search
- Chat
- Profile
- Skills
- Achievements
- Streaks
- Availability
- General
- Other

### Categories

- Bug
- Feature Request
- UI Issue
- Performance
- Accessibility
- Documentation
- Other

## API Endpoints

### POST /feedback
Submit new feedback

**Request:**
```json
{
  "userId": "user_123",
  "userEmail": "user@example.com",
  "featureArea": "studyRooms",
  "feedbackType": "mixed",
  "title": "Great feature!",
  "rating": 5,
  "categories": ["feature-request"],
  "freeformText": "Love the new study room feature!",
  "deviceInfo": {
    "browser": "Chrome",
    "os": "Windows",
    "device": "Desktop"
  },
  "metadata": {
    "studyRoomId": "room_123"
  },
  "tags": ["positive"],
  "priority": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "feedbackId": "uuid-here",
  "message": "Feedback submitted successfully"
}
```

### POST /feedback/{feedbackId}/attachments
Upload file attachment

**Request:**
```json
{
  "fileName": "screenshot.png",
  "fileType": "image/png",
  "fileData": "base64-encoded-data"
}
```

### GET /feedback
Get list of feedback with filtering

**Query Parameters:**
- `userId`: Filter by user ID
- `featureArea`: Filter by feature area
- `status`: Filter by status
- `startDate`, `endDate`: Date range
- `limit`: Number of results (default: 20)
- `lastEvaluatedKey`: Pagination token

### GET /feedback/{feedbackId}
Get specific feedback record

### GET /feedback/stats
Get feedback statistics

## Usage Examples

### Basic Usage

```tsx
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

<FeedbackWidget position="bottom-right" />
```

### Context-Specific Feedback

```tsx
import { useActionFeedback } from "@/hooks/use-feedback";

function MyComponent() {
  const { triggerFeedback } = useActionFeedback(
    "action-name",
    "studyRooms",
    { studyRoomId: "123" }
  );

  const handleAction = async () => {
    // Perform action
    await doSomething();
    // Trigger feedback
    triggerFeedback();
  };
}
```

### Programmatic Feedback

```tsx
import { useFeedback } from "@/hooks/use-feedback";

function MyComponent() {
  const { openFeedback } = useFeedback({
    featureArea: "dashboard",
    onSuccess: (feedbackId) => {
      console.log("Feedback submitted:", feedbackId);
    },
  });

  return <Button onClick={openFeedback}>Give Feedback</Button>;
}
```

## Data Model

### DynamoDB Schema

**Table: Feedback**
- **Partition Key**: `feedbackId` (String, UUID)
- **Attributes**:
  - `userId` (String, GSI)
  - `featureArea` (String, GSI)
  - `status` (String, GSI)
  - `rating`, `categories`, `freeformText`, etc.
  - `attachments` (List of S3 references)
  - `submittedAt`, `updatedAt` (ISO 8601)

**Global Secondary Indexes:**
1. `userId-index`: Query by user
2. `featureArea-index`: Query by feature
3. `status-index`: Query by status

### S3 Structure

```
feedback-attachments/
  {year}/
    {month}/
      {feedbackId}/
        {timestamp}-{filename}
```

## Monitoring

CloudWatch provides:
- Lambda invocation metrics
- Error rates and durations
- DynamoDB capacity and throttles
- S3 access metrics
- Custom dashboard for visualization

View dashboard:
```
https://console.aws.amazon.com/cloudwatch/home?region={region}#dashboards:name=FeedbackSystem
```

## Security

- **API Gateway**: CORS enabled, no authentication required (can be added)
- **Lambda**: IAM roles with least privilege
- **DynamoDB**: IAM policies restrict access
- **S3**: Pre-signed URLs for secure file access
- **Encryption**: S3 server-side encryption enabled

## Cost Optimization

- **DynamoDB**: Pay-per-request billing mode
- **Lambda**: Pay per invocation (first 1M requests free)
- **S3**: Lifecycle policies move old files to Glacier
- **API Gateway**: Pay per API call

## Troubleshooting

### Lambda deployment fails
- Ensure functions are built: `npm run build` in `lambdas/feedback-system/`
- Check IAM role exists and has permissions
- Verify environment variables

### API Gateway returns 500
- Check Lambda function logs in CloudWatch
- Verify Lambda permissions for DynamoDB/S3
- Check API Gateway integration configuration

### File upload fails
- Verify file size < 10MB
- Check file type is allowed
- Ensure S3 bucket CORS is configured
- Check Lambda has S3 write permissions

## Next Steps

1. **Add Authentication**: Integrate with Clerk or AWS Cognito
2. **Analytics Dashboard**: Build admin dashboard for feedback analysis
3. **Email Notifications**: Notify admins of critical feedback
4. **Feedback Workflow**: Add review/resolution workflow
5. **Export Functionality**: Export feedback data for analysis

## Documentation

- [Lambda Functions README](./lambdas/feedback-system/README.md)
- [AWS Setup Scripts README](./scripts/aws/README.md)
- [Frontend Components README](./my-app/src/components/feedback/README.md)

