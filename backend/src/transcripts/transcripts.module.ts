import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranscriptsGateway } from './transcripts.gateway';
import { TranscriptsService } from './transcripts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [TranscriptsGateway, TranscriptsService],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
