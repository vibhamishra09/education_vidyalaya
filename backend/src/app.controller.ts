import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { LoggerService } from './common/logger';

@Controller()
export class AppController {

  constructor(private readonly appService: AppService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AppController.name);}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/stats/platform')
  async getPlatformStats() {
    const startTime = Date.now();
    this.logger.log('📊 [HomePage] Platform stats API called');

    try {
      const stats = await this.appService.getPlatformStats();
      const duration = Date.now() - startTime;

      this.logger.log({
        message: '✅ [HomePage] Platform stats API completed successfully',
        endpoint: '/api/stats/platform',
        duration: `${duration}ms`,
        stats: {
          usersOnboarded: stats.usersOnboarded,
          studyRoomsHosted: stats.studyRoomsHosted,
          sessionsCompleted: stats.sessionsCompleted,
          learningHours: stats.learningHours,
          reviewsGiven: stats.reviewsGiven,
        },
      });

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        message: '❌ [HomePage] Platform stats API failed',
        endpoint: '/api/stats/platform',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
