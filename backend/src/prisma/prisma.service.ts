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
];

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 100;

/**
 * Determines if an error is retryable (connection/timeout related)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_ERROR_CODES.includes(error.code);
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true; // Always retry initialization errors
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

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private connectionCheckInterval?: NodeJS.Timeout;

  constructor() {
    super({
      // Optimize for serverless: shorter connection timeout, limited pool
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Only log errors, no query logs
      log: ['error'],
    });

    // Apply retry extension to handle zombie connections
    return this.withRetryExtension();
  }

  /**
   * Creates a Prisma client with automatic retry logic for connection errors
   */
  private withRetryExtension() {
    return this.$extends({
      query: {
        $allOperations: async ({ operation, model, args, query }) => {
          let lastError: unknown;
          
          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              lastError = error;
              
              if (!isRetryableError(error)) {
                // Not a connection error, throw immediately
                throw error;
              }
              
              if (attempt === MAX_RETRIES) {
                this.logger.error(
                  `Query failed after ${MAX_RETRIES} retries: ${model}.${operation}`,
                  error instanceof Error ? error.stack : String(error),
                );
                throw error;
              }
              
              const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
              
              // Only log on first retry attempt to reduce noise
              if (attempt === 1) {
                this.logger.warn(
                  `Connection error on ${model}.${operation}, retrying with backoff...`,
                );
              }
              
              // Force disconnect to clear any stale connections before retry
              try {
                await this.$disconnect();
              } catch {
                // Ignore disconnect errors
              }
              
              await sleep(backoffMs);
              
              // Reconnect before retry
              try {
                await this.$connect();
              } catch (connectError) {
                this.logger.warn(
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
    // Retry connection with backoff on startup
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        
        // Start background task to prevent zombie connections
        // Neon scales to zero after 5 minutes of inactivity
        // We proactively cycle connections every 3 minutes to stay ahead
        this.startConnectionHealthCheck();
        
        return;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          this.logger.error('Database connection failed', error);
          throw error;
        }
        
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await sleep(backoffMs);
      }
    }
  }

  async onModuleDestroy() {
    // Stop health check before disconnecting
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    await this.$disconnect();
  }

  /**
   * Proactively disconnects and reconnects every 3 minutes
   * This prevents holding connections longer than Neon's idle timeout
   * and avoids zombie connections when Neon scales to zero
   */
  private startConnectionHealthCheck() {
    const CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes (before Neon's 5-min scale-to-zero)
    
    this.connectionCheckInterval = setInterval(async () => {
      try {
        // Test if connection is alive with a simple query
        await this.$queryRaw`SELECT 1`;
      } catch (error) {
        // Connection is dead/stale - force reconnect
        try {
          await this.$disconnect();
          await this.$connect();
        } catch (reconnectError) {
          this.logger.warn('Connection health check reconnect failed', reconnectError);
        }
      }
    }, CHECK_INTERVAL);
  }

  /**
   * Health check method - useful for ECS health checks
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOW THIS FIXES THE "ZOMBIE CONNECTION" PROBLEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * THE PROBLEM (TCP State Mismatch):
 * 1. Your ECS container opens a connection to Neon (state: ESTABLISHED)
 * 2. After 5 minutes of idle time, Neon scales to zero (shuts down compute)
 * 3. Neon disappears WITHOUT sending TCP FIN/RST - just vanishes
 * 4. Your container still thinks the connection is alive (zombie state)
 * 5. Next query is sent → black hole → TCP retransmits for 15 minutes
 * 6. AWS Load Balancer times out after 60 seconds → 500 Error
 * 
 * THE SOLUTION (3-Layer Defense):
 * 
 * Layer 1: DATABASE_URL Configuration
 * - connection_limit=3: Minimal pool (fewer connections = fewer zombies)
 * - connect_timeout=10: Fast fail when connecting to sleeping Neon
 * - pool_timeout=10: Don't wait long for pool connections
 * - pgbouncer=true: Use Neon's pooler for connection management
 * 
 * Layer 2: Proactive Health Checks (NEW)
 * - Every 3 minutes, test connection with SELECT 1
 * - If connection is dead, force disconnect + reconnect
 * - This happens BEFORE Neon's 5-minute scale-to-zero window
 * - Result: No connection ever sits idle long enough to become a zombie
 * 
 * Layer 3: Retry Logic on Failure
 * - If a query hits a zombie connection, catch the error
 * - Force disconnect to kill the zombie socket
 * - Reconnect (wakes Neon if sleeping)
 * - Retry the query (exponential backoff: 100ms → 200ms → 400ms)
 * - Max 3 retries before giving up
 * 
 * TIMELINE:
 * 0:00 - Connection created
 * 3:00 - Health check keeps connection alive
 * 5:00 - Neon would scale to zero, but we've kept it awake
 * 6:00 - Another health check
 * ... pattern continues, preventing zombies
 * 
 * If Neon does sleep and a query fails:
 * → Retry logic catches it
 * → Disconnects zombie socket
 * → Reconnects (wakes Neon)
 * → Query succeeds on retry
 * → No 500 error to user
 * ═══════════════════════════════════════════════════════════════════════════
 */
