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
   * Supports both string messages and structured objects
   */
  debug(message: any, context?: any): void {
    if (typeof message === 'object' && message !== null) {
      // Structured logging with object
      this.pinoLogger.debug({
        ...message,
        context: context || message.context,
      });
    } else {
      // Simple string message
      this.pinoLogger.debug({ context }, message);
    }
  }

  /**
   * Log a message at log/info level
   * Supports both string messages and structured objects
   */
  log(message: any, context?: any): void {
    if (typeof message === 'object' && message !== null) {
      // Structured logging with object
      this.pinoLogger.info({ ...message, context: context || message.context });
    } else {
      // Simple string message
      this.pinoLogger.info({ context }, message);
    }
  }

  /**
   * Log a message at warn level
   * Supports both string messages and structured objects
   */
  warn(message: any, context?: any): void {
    if (typeof message === 'object' && message !== null) {
      // Structured logging with object
      this.pinoLogger.warn({ ...message, context: context || message.context });
    } else {
      // Simple string message
      this.pinoLogger.warn({ context }, message);
    }
  }

  /**
   * Log a message at error level
   * Supports both string messages and structured objects
   */
  error(message: any, trace?: any, context?: any): void {
    if (typeof message === 'object' && message !== null) {
      // Structured logging with object
      const errorObj = { ...message, context: context || message.context };
      if (trace) {
        errorObj.trace = trace;
      }
      this.pinoLogger.error(errorObj);
    } else {
      // Simple string message
      if (trace) {
        this.pinoLogger.error({ context, trace }, message);
      } else {
        this.pinoLogger.error({ context }, message);
      }
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
