import { Controller, Post, Body } from '@nestjs/common';
import { SpamService } from './spam-guard.service';
import { CheckSpamDto } from './dto/check-spam.dto';
import { Req , Ip} from '@nestjs/common';

@Controller('api/spam')
export class SpamGuardController {
  constructor(private readonly service: SpamService) {}

    @Post('check')

    check(@Body() dto: { text: string; context?: string }, @Ip() ip) {
    //console.log('DTO Received:', dto, ip);
    return this.service.validateContent(dto.text, dto.context, ip);
    }
}