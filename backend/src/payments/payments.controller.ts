import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('payments/history')
  @UseGuards(ClerkAuthGuard)
  async getTransactionHistory(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    return this.paymentsService.getTransactionHistory(userId, pageNum, limitNum);
  }
}

