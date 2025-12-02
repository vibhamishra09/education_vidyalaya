# Feedback System Lambda Functions

This directory contains AWS Lambda functions for the platform feedback logging system.

## Structure

```
lambdas/feedback-system/
├── submit-feedback/        # Submit feedback to DynamoDB
├── upload-attachment/      # Upload files to S3
├── get-feedback/           # Retrieve feedback records
├── feedback-stats/         # Calculate feedback statistics
├── scheduled-feedback/      # Scheduled feedback collection (optional)
├── package.json           # Shared dependencies
└── tsconfig.json          # TypeScript configuration
```

## Setup

1. Install dependencies:
```bash
cd lambdas/feedback-system
npm install
```

2. Build TypeScript:
```bash
npm run build
```

3. Deploy using the deployment script:
```bash
cd ../../scripts/aws
./deploy-lambdas.sh
```

## Environment Variables

Each Lambda function requires the following environment variables:

- `FEEDBACK_TABLE_NAME`: DynamoDB table name (default: "Feedback")
- `ATTACHMENTS_BUCKET_NAME`: S3 bucket name for attachments
- `PRESIGNED_URL_EXPIRY`: URL expiration time in seconds (default: 3600)
- `ALLOWED_FILE_TYPES`: Comma-separated list of allowed MIME types
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 10485760 = 10MB)

## Functions

### SubmitFeedbackLambda

Handles feedback submission and stores it in DynamoDB.

**Input**: Feedback submission JSON
**Output**: Feedback ID and success message

### UploadAttachmentLambda

Uploads file attachments to S3 and updates DynamoDB record.

**Input**: Feedback ID, file data (base64 encoded)
**Output**: Attachment information

### GetFeedbackLambda

Retrieves feedback records with filtering and pagination support.

**Query Parameters**:
- `userId`: Filter by user ID
- `featureArea`: Filter by feature area
- `status`: Filter by status
- `startDate`, `endDate`: Date range filter
- `limit`: Number of results (default: 20)
- `lastEvaluatedKey`: Pagination token

### FeedbackStatsLambda

Calculates aggregate statistics for feedback.

**Output**: Statistics including:
- Total feedback count
- Counts by feature area, status, rating, category
- Average rating
- Recent feedback count (last 7 days)

### ScheduledFeedbackLambda

Optional function for scheduled feedback collection (placeholder implementation).

## Development

To test locally, you can use AWS SAM or the AWS Lambda runtime interface emulator. For production deployment, use the provided deployment scripts in `scripts/aws/`.

