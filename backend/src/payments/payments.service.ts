import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Prisma } from '../generated/prisma/client';
import { CacheService } from '../redis/cache.service';
import { LoggerService } from '../common/logger';

export interface TransactionHistoryItem {
  id: string;
  type: 'PAYMENT_MADE' | 'PAYMENT_RECEIVED' | 'REFUND_RECEIVED';
  amount: number;
  description: string;
  status: PaymentStatus;
  date: Date;
  relatedUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  relatedSession?: {
    id: string;
    title: string;
    type: 'PEER_SESSION' | 'STUDY_ROOM';
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PaymentsService.name);
  }

  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Create cache key - user-specific with pagination
    const cacheKey = this.cacheService.createKey('payments:history', {
      userId,
      page,
      limit,
    });

    // Cache for 30 seconds - payment history changes when new payments are made
    // Short TTL ensures users see new payments relatively quickly
    const cacheTTL = 30;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const skip = (page - 1) * limit;

          // Get payments made and received
          const [paymentsMade, paymentsReceived, totalMade, totalReceived] =
            await Promise.all([
              this.prisma.payment.findMany({
                where: { madeById: userId },
                skip,
                take: limit,
                include: {
                  receivedBy: {
                    select: { id: true, name: true, avatar: true },
                  },
                  peerSession: { select: { id: true, title: true } },
                  studyRoom: { select: { id: true, title: true } },
                },
                orderBy: { id: 'desc' },
              }),
              this.prisma.payment.findMany({
                where: { receivedById: userId },
                skip,
                take: limit,
                include: {
                  madeBy: { select: { id: true, name: true, avatar: true } },
                  peerSession: { select: { id: true, title: true } },
                  studyRoom: { select: { id: true, title: true } },
                },
                orderBy: { id: 'desc' },
              }),
              this.prisma.payment.count({ where: { madeById: userId } }),
              this.prisma.payment.count({ where: { receivedById: userId } }),
            ]);

          // Combine and format transactions
          const transactions: TransactionHistoryItem[] = [];

          // Add payments made
          paymentsMade.forEach((payment) => {
            let description = '';
            let sessionType: 'PEER_SESSION' | 'STUDY_ROOM' | undefined;
            let sessionTitle = '';

            if (payment.peerSession) {
              description = `Payment for peer session with ${payment.receivedBy.name}`;
              sessionType = 'PEER_SESSION';
              sessionTitle = payment.peerSession.title;
            } else if (payment.studyRoom) {
              description = `Payment for study room: ${payment.studyRoom.title}`;
              sessionType = 'STUDY_ROOM';
              sessionTitle = payment.studyRoom.title;
            }

            transactions.push({
              id: payment.id,
              type:
                payment.paymentStatus === PaymentStatus.REFUNDED
                  ? 'REFUND_RECEIVED'
                  : 'PAYMENT_MADE',
              amount: Number(payment.amountMade),
              description,
              status: payment.paymentStatus,
              date: (payment as any).createdAt || new Date(),
              relatedUser: {
                id: payment.receivedBy.id,
                name: payment.receivedBy.name,
                avatar: payment.receivedBy.avatar || undefined,
              },
              relatedSession: sessionType
                ? {
                    id: payment.peerSession?.id || payment.studyRoom?.id || '',
                    title: sessionTitle,
                    type: sessionType,
                  }
                : undefined,
            });
          });

          // Add payments received
          paymentsReceived.forEach((payment) => {
            let description = '';
            let sessionType: 'PEER_SESSION' | 'STUDY_ROOM' | undefined;
            let sessionTitle = '';

            if (payment.peerSession) {
              description = `Payment received for peer session with ${payment.madeBy.name}`;
              sessionType = 'PEER_SESSION';
              sessionTitle = payment.peerSession.title;
            } else if (payment.studyRoom) {
              description = `Payment received for study room: ${payment.studyRoom.title}`;
              sessionType = 'STUDY_ROOM';
              sessionTitle = payment.studyRoom.title;
            }

            transactions.push({
              id: payment.id,
              type: 'PAYMENT_RECEIVED',
              amount: Number(payment.amountReceived || payment.amountMade),
              description,
              status: payment.paymentStatus,
              date: (payment as any).createdAt || new Date(),
              relatedUser: {
                id: payment.madeBy.id,
                name: payment.madeBy.name,
                avatar: payment.madeBy.avatar || undefined,
              },
              relatedSession: sessionType
                ? {
                    id: payment.peerSession?.id || payment.studyRoom?.id || '',
                    title: sessionTitle,
                    type: sessionType,
                  }
                : undefined,
            });
          });

          // Sort by date (newest first)
          transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

          const total = totalMade + totalReceived;
          const totalPages = Math.ceil(total / limit);

          return {
            transactions: transactions.slice(0, limit),
            pagination: {
              total,
              page,
              limit,
              totalPages,
              hasMore: page < totalPages,
            },
          };
        } catch (error) {
          // Handle database connection errors
          const isConnectionError =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code);

          const isConnectionErrorMessage =
            error instanceof Error &&
            [
              'ETIMEDOUT',
              'ECONNRESET',
              'ECONNREFUSED',
              'Connection terminated',
              'Connection closed',
              'socket hang up',
            ].some((msg) => error.message.includes(msg));

          if (isConnectionError || isConnectionErrorMessage) {
            this.logger.error(
              `Database connection error in getTransactionHistory for user ${userId}:`,
              error instanceof Error ? error.message : String(error),
            );

            // Return empty result as fallback instead of failing the request
            // This allows the UI to still function, showing empty state
            return {
              transactions: [],
              pagination: {
                total: 0,
                page,
                limit,
                totalPages: 0,
                hasMore: false,
              },
            };
          }

          // Re-throw other errors (NotFoundException, validation errors, etc.)
          throw error;
        }
      },
      cacheTTL,
    );
  }
}
