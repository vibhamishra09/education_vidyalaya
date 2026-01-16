import { Module } from '@nestjs/common';
import { SessionExtensionGateway } from './session-extension.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SessionExtensionGateway],
  exports: [SessionExtensionGateway],
})
export class SessionExtensionModule {}
