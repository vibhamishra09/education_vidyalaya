import { Module } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';
import { LivekitWebhooksController } from './livekit.webhooks.controller';

@Module({
  controllers: [LivekitController, LivekitWebhooksController],
  providers: [LivekitService],
  exports: [LivekitService],
})
export class LivekitModule {}
