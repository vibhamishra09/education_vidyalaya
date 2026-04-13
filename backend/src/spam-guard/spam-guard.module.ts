import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SpamService } from './spam-guard.service';
import { SpamGuardController } from './spam-guard.controller';

@Global()  
@Module({
  imports:     [HttpModule],
  controllers: [SpamGuardController],
  providers:   [SpamService],
  exports:     [SpamService ],
})
export class SpamGuardModule {}