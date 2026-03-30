import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatGateway } from './chat.gateway';
import { SessionModerationModule } from '../session-moderation/session-moderation.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule, forwardRef(() => SessionModerationModule)],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
