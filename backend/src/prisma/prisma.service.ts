import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../common/logger';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly logger: LoggerService) {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['error'],
      errorFormat: 'minimal',
    });
    this.logger.setContext(PrismaService.name);
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
