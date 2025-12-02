import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const TABLE_NAME = process.env.FEEDBACK_TABLE_NAME || 'Feedback';
const BUCKET_NAME = process.env.ATTACHMENTS_BUCKET_NAME || 'webyalaya-feedback-attachments';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/png,image/jpeg,image/jpg,image/gif,text/plain,application/pdf').split(',');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const feedbackId = event.pathParameters?.feedbackId;
    if (!feedbackId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'feedbackId is required in path' }),
      };
    }

    // Check if feedback exists
    const getResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { feedbackId },
      })
    );

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Feedback not found' }),
      };
    }

    // Parse multipart form data or base64 encoded file
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'File data is required' }),
      };
    }

    // For simplicity, expecting JSON with base64 encoded file
    // In production, you might want to use API Gateway's multipart/form-data support
    const body = JSON.parse(event.body);
    const { fileName, fileType, fileData } = body;

    if (!fileName || !fileType || !fileData) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'fileName, fileType, and fileData are required' }),
      };
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: `File type ${fileType} not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
        }),
      };
    }

    // Decode base64 file data
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`,
        }),
      };
    }

    // Generate S3 key with organized structure
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `feedback-attachments/${year}/${month}/${feedbackId}/${timestamp}-${sanitizedFileName}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: fileType,
        ServerSideEncryption: 'AES256',
      })
    );

    // Update DynamoDB with attachment reference
    const attachmentInfo = {
      s3Key,
      fileName,
      fileType,
      fileSize: fileBuffer.length,
      uploadDate: now.toISOString(),
    };

    const currentAttachments = getResult.Item.attachments || [];
    const updatedAttachments = [...currentAttachments, attachmentInfo];

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { feedbackId },
        UpdateExpression: 'SET attachments = :attachments, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':attachments': updatedAttachments,
          ':updatedAt': now.toISOString(),
        },
      })
    );

    console.log('Attachment uploaded successfully:', s3Key);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        attachment: attachmentInfo,
        message: 'Attachment uploaded successfully',
      }),
    };
  } catch (error) {
    console.error('Error uploading attachment:', error);
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

