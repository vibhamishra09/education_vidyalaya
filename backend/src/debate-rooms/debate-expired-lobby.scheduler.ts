import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DebateRoomsService } from './debate-rooms.service';
import { LoggerService } from '../common/logger';

/**
 * Moves WAITING debates past their scheduled window to ENDED so filters and browse stay consistent.
 */
@Injectable()
export class DebateExpiredLobbySchedulerService {
  constructor(
    private readonly debateRoomsService: DebateRoomsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DebateExpiredLobbySchedulerService.name);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> {
    try {
      const n = await this.debateRoomsService.expirePastWaitingLobbies();
      if (n > 0) {
        this.logger.log(`Expired ${n} past-slot WAITING debate(s) → ENDED`);
      }
    } catch (e) {
      this.logger.error(
        'expirePastWaitingLobbies failed',
        e instanceof Error ? e.message : String(e),
      );
    }
  }
}
