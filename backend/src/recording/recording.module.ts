import { Module } from '@nestjs/common';
import { RecordingService } from './recording.service';
import { RecordingController } from './recording.controller';
import { LivekitModule } from '../livekit/livekit.module';
import { StudyRoomsModule } from '../study-rooms/study-rooms.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [LivekitModule, StudyRoomsModule, PrismaModule, UploadModule],
  controllers: [RecordingController],
  providers: [RecordingService],
  exports: [RecordingService],
})
export class RecordingModule {}
