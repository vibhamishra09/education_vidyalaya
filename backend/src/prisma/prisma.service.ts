import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Connection error codes that indicate a "zombie" or stale connection
 * These typically occur when Neon serverless Postgres scales to zero
 */
const RETRYABLE_ERROR_CODES = [
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1008', // Operations timed out
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a new connection from the pool
];

const RETRYABLE_ERROR_MESSAGES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'Connection terminated unexpectedly',
  'Connection closed',
  'socket hang up',
  'Client has encountered a connection error',
  'Engine is not yet connected',
  'Engine not started',
];

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 200;

/**
 * Determines if an error is retryable (connection/timeout related)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_ERROR_CODES.includes(error.code);
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    const message = error.message;
    return RETRYABLE_ERROR_MESSAGES.some(msg => message.includes(msg));
  }
  
  if (error instanceof Error) {
    const message = error.message;
    return RETRYABLE_ERROR_MESSAGES.some(msg => message.includes(msg));
  }
  
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Store connection state outside the class to avoid issues with extended client
let isConnected = false;
let connectionPromise: Promise<void> | null = null;
let baseClient: PrismaClient | null = null;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private connectionCheckInterval?: NodeJS.Timeout;

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['error'],
      errorFormat: 'minimal',
    });

    // Store reference to the base client for connection management
    baseClient = this;

    // Apply retry extension to handle zombie connections
    return this.withRetryExtension();
  }

  /**
   * Creates a Prisma client with automatic retry logic for connection errors
   */
  private withRetryExtension() {
    const logger = this.logger;

    return this.$extends({
      query: {
        $allOperations: async ({ operation, model, args, query }) => {
          // Ensure connection is established before executing any query
          await ensureConnected(logger);

          let lastError: unknown;
          
          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              lastError = error;
              
              if (!isRetryableError(error)) {
                throw error;
              }
              
              if (attempt === MAX_RETRIES) {
                logger.error(
                  `Query failed after ${MAX_RETRIES} retries: ${model}.${operation}`,
                  error instanceof Error ? error.stack : String(error),
                );
                throw error;
              }
              
              const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
              
              if (attempt === 1) {
                logger.warn(
                  `Connection error on ${model}.${operation}, retrying with backoff...`,
                );
              }
              
              // Force disconnect to clear any stale connections before retry
              try {
                if (baseClient) {
                  await baseClient.$disconnect();
                  isConnected = false;
                }
              } catch {
                // Ignore disconnect errors
              }
              
              await sleep(backoffMs);
              
              // Reconnect before retry
              try {
                if (baseClient) {
                  await baseClient.$connect();
                  isConnected = true;
                }
              } catch (connectError) {
                logger.warn(
                  `Reconnect failed on attempt ${attempt}: ${connectError instanceof Error ? connectError.message : String(connectError)}`,
                );
              }
            }
          }
          
          throw lastError;
        },
      },
    }) as unknown as this;
  }

  async onModuleInit() {
    const INIT_MAX_RETRIES = 5;
    const INIT_BACKOFF_MS = 2000;

    for (let attempt = 1; attempt <= INIT_MAX_RETRIES; attempt++) {
      try {
        this.logger.log(`Attempting database connection (${attempt}/${INIT_MAX_RETRIES})...`);
        
        if (baseClient) {
          await baseClient.$connect();
          isConnected = true;
        }
        
        this.logger.log('✅ Database connected successfully');
        
        this.startConnectionHealthCheck();
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Database connection attempt ${attempt}/${INIT_MAX_RETRIES} failed: ${errorMessage}`);

        if (attempt === INIT_MAX_RETRIES) {
          this.logger.error('❌ Database connection failed after all retries');
          this.logger.error('Please check:');
          this.logger.error('  1. Database server is running and accessible');
          this.logger.error('  2. DATABASE_URL is correct in .env file');
          this.logger.error('  3. Network connectivity to database server');
          this.logger.error('  4. For Neon: Check if project is active in dashboard');
          throw error;
        }

        const backoffMs = INIT_BACKOFF_MS * Math.pow(2, attempt - 1);
        this.logger.log(`Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
  }

  async onModuleDestroy() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    isConnected = false;
    if (baseClient) {
      await baseClient.$disconnect();
    }
  }

  private startConnectionHealthCheck() {
    const CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes

    this.connectionCheckInterval = setInterval(async () => {
      try {
        if (baseClient) {
          await baseClient.$queryRaw`SELECT 1`;
        }
      } catch (error) {
        this.logger.warn('Health check failed, reconnecting...');
        try {
          if (baseClient) {
            await baseClient.$disconnect();
            isConnected = false;
            await baseClient.$connect();
            isConnected = true;
          }
        } catch (reconnectError) {
          this.logger.warn('Health check reconnect failed', reconnectError);
        }
      }
    }, CHECK_INTERVAL);
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (baseClient) {
        await baseClient.$queryRaw`SELECT 1`;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

/**
 * Ensures the database connection is established before executing queries
 */
async function ensureConnected(logger: Logger): Promise<void> {
  if (isConnected) {
    return;
  }

  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  connectionPromise = doConnect(logger);
  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

async function doConnect(logger: Logger): Promise<void> {
  const MAX_CONNECT_RETRIES = 3;
  const CONNECT_BACKOFF_MS = 500;

  for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
    try {
      if (baseClient) {
        await baseClient.$connect();
        isConnected = true;
        logger.log('Database connection established on demand');
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`On-demand connection attempt ${attempt}/${MAX_CONNECT_RETRIES} failed: ${errorMessage}`);
      
      if (attempt === MAX_CONNECT_RETRIES) {
        throw error;
      }
      
      const backoffMs = CONNECT_BACKOFF_MS * Math.pow(2, attempt - 1);
      await sleep(backoffMs);
    }
  }
}
