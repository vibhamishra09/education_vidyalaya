import { NotifType } from '@prisma/client';

export class NotificationDto {
  id: string;
  notifType: NotifType;
  message: string;
  createdAt: Date;
  viewed: boolean;
}
