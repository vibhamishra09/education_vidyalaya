import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.FEEDBACK_TABLE_NAME || 'Feedback';

interface FeedbackStats {
  total: number;
  byFeatureArea: Record<string, number>;
  byStatus: Record<string, number>;
  byRating: Record<string, number>;
  byCategory: Record<string, number>;
  averageRating: number;
  recentCount: number; // Last 7 days
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Scan all feedback (for stats, we need all data)
    // In production, consider using DynamoDB Streams + aggregation table for better performance
    const allItems: any[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
        })
      );
      allItems.push(...(result.Items || []));
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Calculate statistics
    const stats: FeedbackStats = {
      total: allItems.length,
      byFeatureArea: {},
      byStatus: {},
      byRating: {},
      byCategory: {},
      averageRating: 0,
      recentCount: 0,
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    let totalRating = 0;
    let ratingCount = 0;

    allItems.forEach((item) => {
      // Count by feature area
      const featureArea = item.featureArea || 'unknown';
      stats.byFeatureArea[featureArea] = (stats.byFeatureArea[featureArea] || 0) + 1;

      // Count by status
      const status = item.status || 'submitted';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by rating
      if (item.rating) {
        const rating = String(item.rating);
        stats.byRating[rating] = (stats.byRating[rating] || 0) + 1;
        totalRating += item.rating;
        ratingCount++;
      }

      // Count by category
      if (item.categories && Array.isArray(item.categories)) {
        item.categories.forEach((category: string) => {
          stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        });
      }

      // Count recent feedback (last 7 days)
      if (item.submittedAt && item.submittedAt >= sevenDaysAgoISO) {
        stats.recentCount++;
      }
    });

    // Calculate average rating
    if (ratingCount > 0) {
      stats.averageRating = totalRating / ratingCount;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ stats }),
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
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

