import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

/**
 * Custom logger service that wraps Pino logger
 * Maintains compatibility with NestJS Logger interface
 * Provides structured logging with context
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly pinoLogger: PinoLogger) {}

  /**
   * Log a message at debug level
   */
  debug(message: any, context?: string): void {
    this.pinoLogger.debug({ context }, message);
  }

  /**
   * Log a message at log/info level
   */
  log(message: any, context?: string): void {
    this.pinoLogger.info({ context }, message);
  }

  /**
   * Log a message at warn level
   */
  warn(message: any, context?: string): void {
    this.pinoLogger.warn({ context }, message);
  }

  /**
   * Log a message at error level
   */
  error(message: any, trace?: string, context?: string): void {
    if (trace) {
      this.pinoLogger.error({ context, trace }, message);
    } else {
      this.pinoLogger.error({ context }, message);
    }
  }

  /**
   * Log a message at verbose level (maps to debug)
   */
  verbose(message: any, context?: string): void {
    this.pinoLogger.trace({ context }, message);
  }

  /**
   * Set context for subsequent log messages
   */
  setContext(context: string): void {
    // Pino handles context per log call, so we store it in the logger instance
    (this.pinoLogger as any).context = context;
  }
}
