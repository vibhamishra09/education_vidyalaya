import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const TABLE_NAME = process.env.FEEDBACK_TABLE_NAME || 'Feedback';
const BUCKET_NAME = process.env.ATTACHMENTS_BUCKET_NAME || 'webyalaya-feedback-attachments';
const PRESIGNED_URL_EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10);

interface QueryParams {
  feedbackId?: string;
  userId?: string;
  featureArea?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  lastEvaluatedKey?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Check if requesting specific feedback
    const feedbackId = event.pathParameters?.feedbackId;
    if (feedbackId) {
      return await getSingleFeedback(feedbackId);
    }

    // Parse query parameters
    const queryParams: QueryParams = {
      userId: event.queryStringParameters?.userId,
      featureArea: event.queryStringParameters?.featureArea,
      status: event.queryStringParameters?.status,
      startDate: event.queryStringParameters?.startDate,
      endDate: event.queryStringParameters?.endDate,
      limit: event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit, 10)
        : 20,
      lastEvaluatedKey: event.queryStringParameters?.lastEvaluatedKey,
    };

    return await getMultipleFeedback(queryParams);
  } catch (error) {
    console.error('Error retrieving feedback:', error);
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

async function getSingleFeedback(feedbackId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { feedbackId },
    })
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Feedback not found' }),
    };
  }

  // Generate pre-signed URLs for attachments
  const feedback = await enrichWithPresignedUrls(result.Item);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ feedback }),
  };
}

async function getMultipleFeedback(params: QueryParams): Promise<APIGatewayProxyResult> {
  let items: any[] = [];
  let lastEvaluatedKey: any = undefined;

  // Determine which index to use based on query parameters
  if (params.userId) {
    // Query by userId using GSI
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': params.userId,
        },
        ...(params.startDate && params.endDate
          ? {
              FilterExpression: 'submittedAt BETWEEN :startDate AND :endDate',
              ExpressionAttributeValues: {
                ':userId': params.userId,
                ':startDate': params.startDate,
                ':endDate': params.endDate,
              },
            }
          : {}),
        Limit: params.limit || 20,
        ScanIndexForward: false, // Most recent first
        ...(params.lastEvaluatedKey
          ? { ExclusiveStartKey: JSON.parse(decodeURIComponent(params.lastEvaluatedKey)) }
          : {}),
      })
    );
    items = result.Items || [];
    lastEvaluatedKey = result.LastEvaluatedKey;
  } else if (params.featureArea) {
    // Query by featureArea using GSI
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'featureArea-index',
        KeyConditionExpression: 'featureArea = :featureArea',
        ExpressionAttributeValues: {
          ':featureArea': params.featureArea,
        },
        ...(params.status
          ? {
              FilterExpression: '#status = :status',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':featureArea': params.featureArea,
                ':status': params.status,
              },
            }
          : {}),
        Limit: params.limit || 20,
        ScanIndexForward: false,
        ...(params.lastEvaluatedKey
          ? { ExclusiveStartKey: JSON.parse(decodeURIComponent(params.lastEvaluatedKey)) }
          : {}),
      })
    );
    items = result.Items || [];
    lastEvaluatedKey = result.LastEvaluatedKey;
  } else if (params.status) {
    // Query by status using GSI
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'status-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': params.status,
        },
        Limit: params.limit || 20,
        ScanIndexForward: false,
        ...(params.lastEvaluatedKey
          ? { ExclusiveStartKey: JSON.parse(decodeURIComponent(params.lastEvaluatedKey)) }
          : {}),
      })
    );
    items = result.Items || [];
    lastEvaluatedKey = result.LastEvaluatedKey;
  } else {
    // Scan table (less efficient, but needed for general queries)
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        Limit: params.limit || 20,
        ...(params.lastEvaluatedKey
          ? { ExclusiveStartKey: JSON.parse(decodeURIComponent(params.lastEvaluatedKey)) }
          : {}),
      })
    );
    items = result.Items || [];
    lastEvaluatedKey = result.LastEvaluatedKey;
  }

  // Enrich with pre-signed URLs
  const enrichedItems = await Promise.all(
    items.map((item) => enrichWithPresignedUrls(item))
  );

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      feedback: enrichedItems,
      pagination: {
        lastEvaluatedKey: lastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(lastEvaluatedKey))
          : null,
        hasMore: !!lastEvaluatedKey,
      },
    }),
  };
}

async function enrichWithPresignedUrls(item: any): Promise<any> {
  if (!item.attachments || item.attachments.length === 0) {
    return item;
  }

  const attachmentsWithUrls = await Promise.all(
    item.attachments.map(async (attachment: any) => {
      try {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: attachment.s3Key,
        });
        const url = await getSignedUrl(s3Client, command, {
          expiresIn: PRESIGNED_URL_EXPIRY,
        });
        return {
          ...attachment,
          presignedUrl: url,
        };
      } catch (error) {
        console.error('Error generating presigned URL:', error);
        return attachment;
      }
    })
  );

  return {
    ...item,
    attachments: attachmentsWithUrls,
  };
}

