import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StreaksModule } from '../streaks/streaks.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [StreaksModule, AchievementsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
