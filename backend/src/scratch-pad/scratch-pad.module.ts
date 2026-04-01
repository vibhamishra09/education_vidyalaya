import { Module } from '@nestjs/common';
import { ScratchPadService } from './scratch-pad.service';
import { ScratchPadController } from './scratch-pad.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [ScratchPadController],
  providers: [ScratchPadService],
  exports: [ScratchPadService],
})
export class ScratchPadModule {}
