import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DebateRoomsService } from './debate-rooms.service';
import { LoggerService } from '../common/logger';
import { CacheService } from '../redis/cache.service';

/**
 * Scheduler service to periodically stream debate transcripts from Redis to database
 * This prevents Redis cache exhaustion by keeping only recent chunks in memory
 * 
 * Runs every 30 seconds to commit pending transcripts
 */
@Injectable()
export class DebateTranscriptSchedulerService implements OnModuleInit {
  private isProcessing = false;

  constructor(
    private readonly debateRoomsService: DebateRoomsService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DebateTranscriptSchedulerService.name);
  }

  onModuleInit() {
    this.logger.log('Debate transcript streaming scheduler initialized');
  }

  /**
   * Stream transcripts every 30 seconds
   * This keeps Redis memory usage low by committing transcripts to database frequently
   */
  @Cron('*/30 * * * * *') // Every 30 seconds
  async streamTranscripts() {
    // Prevent concurrent executions
    if (this.isProcessing) {
      this.logger.debug('Transcript streaming already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      // Check memory status first
      const memoryStatus = await this.cacheService.checkMemoryStatus();
      
      if (memoryStatus.status === 'critical') {
        this.logger.warn(
          `Redis memory is critical (${memoryStatus.usageMB.toFixed(2)} MB). Streaming transcripts immediately...`,
        );
      }

      // Get all active debate rooms with transcripts
      const roomIds = await this.debateRoomsService.getActiveDebateRoomsWithTranscripts();

      if (roomIds.length === 0) {
        this.logger.debug('No active debate rooms with transcripts to stream');
        return;
      }

      this.logger.debug(`Streaming transcripts for ${roomIds.length} active debate room(s)`);

      // Stream transcripts for each room
      let totalCommitted = 0;
      for (const roomId of roomIds) {
        try {
          const committed = await this.debateRoomsService.streamTranscriptsToDatabase(roomId);
          totalCommitted += committed;
        } catch (error) {
          this.logger.error(
            `Failed to stream transcripts for room ${roomId}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      const duration = Date.now() - startTime;
      
      if (totalCommitted > 0) {
        this.logger.log(
          `Streamed ${totalCommitted} transcript entries to database for ${roomIds.length} room(s) in ${duration}ms`,
        );
      }

      // Log memory status after streaming
      const newMemoryStatus = await this.cacheService.checkMemoryStatus();
      if (newMemoryStatus.status !== 'ok') {
        this.logger.warn(
          `Redis memory after streaming: ${newMemoryStatus.usageMB.toFixed(2)} MB (${newMemoryStatus.percentage.toFixed(1)}%)`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error in transcript streaming scheduler:',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Periodic memory check and cleanup (every 5 minutes)
   * Evicts old debate transcripts if memory is high
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkMemoryAndCleanup() {
    try {
      const memoryStatus = await this.cacheService.checkMemoryStatus();

      if (memoryStatus.status === 'warning' || memoryStatus.status === 'critical') {
        this.logger.warn(
          `Redis memory usage is ${memoryStatus.status}: ${memoryStatus.usageMB.toFixed(2)} MB (${memoryStatus.percentage.toFixed(1)}%)`,
        );

        // Evict old debate transcripts
        const evicted = await this.cacheService.evictDebateTranscripts(
          memoryStatus.status === 'critical' ? 20 : 10,
        );

        if (evicted > 0) {
          const newStatus = await this.cacheService.checkMemoryStatus();
          this.logger.log(
            `Evicted ${evicted} debate transcript keys. Memory now: ${newStatus.usageMB.toFixed(2)} MB (${newStatus.percentage.toFixed(1)}%)`,
          );
        }
      } else {
        this.logger.debug(
          `Redis memory usage is healthy: ${memoryStatus.usageMB.toFixed(2)} MB (${memoryStatus.percentage.toFixed(1)}%)`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error in memory check and cleanup:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
