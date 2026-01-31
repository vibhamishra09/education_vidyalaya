import { Module } from '@nestjs/common';
import { DebateChatService } from './debate-chat.service';
import { DebateChatController } from './debate-chat.controller';
import { DebateChatGateway } from './debate-chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DebateChatController],
  providers: [DebateChatService, DebateChatGateway],
  exports: [DebateChatService],
})
export class DebateChatModule {}
