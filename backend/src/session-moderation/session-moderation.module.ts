import { Module, forwardRef } from '@nestjs/common';
import { SessionModerationGateway } from './session-moderation.gateway';
import { PermissionsService } from './permissions.service';
import { StudyRoomsModule } from '../study-rooms/study-rooms.module';
import { PeerSessionsModule } from '../peer-sessions/peer-sessions.module';

@Module({
  imports: [
    forwardRef(() => StudyRoomsModule),
    forwardRef(() => PeerSessionsModule),
  ],
  providers: [SessionModerationGateway, PermissionsService],
  exports: [SessionModerationGateway, PermissionsService],
})
export class SessionModerationModule {}
