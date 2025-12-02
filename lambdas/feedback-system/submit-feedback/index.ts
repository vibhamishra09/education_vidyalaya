import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.FEEDBACK_TABLE_NAME || 'Feedback';

interface FeedbackSubmission {
  userId?: string;
  userEmail?: string;
  featureArea: string;
  feedbackType: 'structured' | 'freeform' | 'mixed';
  title?: string;
  rating?: number;
  categories?: string[];
  structuredData?: Record<string, any>;
  freeformText?: string;
  deviceInfo: {
    browser?: string;
    os?: string;
    device?: string;
    screenResolution?: string;
  };
  metadata?: Record<string, any>;
  tags?: string[];
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body: FeedbackSubmission = JSON.parse(event.body);

    // Validate required fields
    if (!body.featureArea) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'featureArea is required' }),
      };
    }

    if (!body.feedbackType) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'feedbackType is required' }),
      };
    }

    // Validate rating if provided
    if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'rating must be between 1 and 5' }),
      };
    }

    // Generate unique feedback ID
    const feedbackId = uuidv4();
    const now = new Date().toISOString();

    // Prepare DynamoDB item
    const item = {
      feedbackId,
      userId: body.userId || 'anonymous',
      userEmail: body.userEmail,
      featureArea: body.featureArea,
      feedbackType: body.feedbackType,
      title: body.title,
      rating: body.rating,
      categories: body.categories || [],
      structuredData: body.structuredData || {},
      freeformText: body.freeformText,
      deviceInfo: body.deviceInfo || {},
      metadata: body.metadata || {},
      attachments: [],
      status: 'submitted',
      priority: body.priority || 'medium',
      tags: body.tags || [],
      submittedAt: now,
      updatedAt: now,
    };

    // Store in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    console.log('Feedback stored successfully:', feedbackId);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        feedbackId,
        message: 'Feedback submitted successfully',
      }),
    };
  } catch (error) {
    console.error('Error processing feedback:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

