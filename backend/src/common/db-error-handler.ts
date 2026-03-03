import { Prisma } from '../generated/prisma/client';

/**
 * Checks if an error is a database connection error that should trigger a fallback
 */
export function isConnectionError(error: unknown): boolean {
  // Check Prisma error codes
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const connectionErrorCodes = ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'];
    return connectionErrorCodes.includes(error.code);
  }

  // Check Prisma initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  // Check error messages for connection-related issues
  if (error instanceof Error) {
    const connectionErrorMessages = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'Connection terminated',
      'Connection closed',
      'socket hang up',
      'Client has encountered a connection error',
      'Engine is not yet connected',
      'Engine not started',
      'Query timeout',
      'Operation timed out',
      'timed out',
      'timeout',
    ];
    return connectionErrorMessages.some((msg) => error.message.includes(msg));
  }

  return false;
}

/**
 * Wraps a database query with a timeout to prevent hanging queries
 * @param queryPromise The database query promise
 * @param timeoutMs Timeout in milliseconds (default: 30 seconds)
 * @param operationName Name of the operation for error messages
 * @returns The query result or throws a timeout error
 */
export async function withQueryTimeout<T>(
  queryPromise: Promise<T>,
  timeoutMs: number = 30000,
  operationName: string = 'Database query',
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([queryPromise, timeoutPromise]);
}
