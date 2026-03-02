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
    this.logger.log('Debate transcript streaming scheduler initialized (DISABLED)');
  }

  /**
   * Stream transcripts every 30 seconds
   * This keeps Redis memory usage low by committing transcripts to database frequently
   * DISABLED: Transcript feature is turned off
   */
  @Cron('*/30 * * * * *') // Every 30 seconds
  async streamTranscripts() {
    // Feature disabled - return early
    return;
  }

  /**
   * Periodic memory check and cleanup (every 5 minutes)
   * Evicts old debate transcripts if memory is high
   * DISABLED: Transcript feature is turned off
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkMemoryAndCleanup() {
    // Feature disabled - return early
    return;
  }
}
