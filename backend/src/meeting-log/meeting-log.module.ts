import { Module } from '@nestjs/common';
import { MeetingLogService } from './meeting-log.service';
import { MeetingLogController } from './meeting-log.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MeetingLogController],
  providers: [MeetingLogService],
  exports: [MeetingLogService],
})
export class MeetingLogModule {}
