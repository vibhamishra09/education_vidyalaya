import { SessionStatus } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { StudyRoomsService } from './study-rooms.service';
import { StudyRoomEditScope } from './dto/study-room.dto';

describe('StudyRoomsService.cancelStudyRoom', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    studyRoom: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  } as any;

  const logger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  } as any;

  const service = new StudyRoomsService(
    prisma,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    logger,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels entire series when requested', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'host-1' });
    prisma.studyRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      createdById: 'host-1',
      seriesId: 'series-1',
      date: new Date('2026-03-01T10:00:00.000Z'),
    });
    prisma.studyRoom.updateMany.mockResolvedValue({ count: 5 });

    const result = await service.cancelStudyRoom(
      'room-1',
      'clerk-user',
      StudyRoomEditScope.ENTIRE_SERIES,
    );

    expect(prisma.studyRoom.updateMany).toHaveBeenCalledWith({
      where: {
        seriesId: 'series-1',
        sessionStatus: { in: [SessionStatus.UPCOMING, SessionStatus.ONGOING] },
      },
      data: { sessionStatus: SessionStatus.CANCELLED },
    });
    expect(result.updatedCount).toBe(5);
  });

  it('throws if user is not the creator', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'host-2' });
    prisma.studyRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      createdById: 'host-1',
      seriesId: 'series-1',
      date: new Date('2026-03-01T10:00:00.000Z'),
    });

    await expect(
      service.cancelStudyRoom('room-1', 'clerk-user', StudyRoomEditScope.SINGLE),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
