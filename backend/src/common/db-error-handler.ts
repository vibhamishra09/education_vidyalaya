import { Prisma } from '@prisma/client';

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
    ];
    return connectionErrorMessages.some((msg) => error.message.includes(msg));
  }

  return false;
}
