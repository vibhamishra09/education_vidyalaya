import { NotifType } from '../../generated/prisma/client';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class NotificationDto {
  id: string;
  notifType: NotifType;
  message: string;
  createdAt: Date;
  viewed: boolean;
}

export class MarkNotificationsReadDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  notificationIds: string[];
}
