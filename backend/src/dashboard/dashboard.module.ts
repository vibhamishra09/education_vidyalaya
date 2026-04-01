import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StreaksModule } from '../streaks/streaks.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { EngagementModule } from '../engagement/engagement.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [StreaksModule, AchievementsModule, EngagementModule, UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
