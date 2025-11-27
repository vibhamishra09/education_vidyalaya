import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StudyRoomsService } from './study-rooms.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../common/guards/optional-clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStudyRoomDto, UpdateStudyRoomDto } from './dto/study-room.dto';
import { StudyRoomQueryDto } from './dto/study-room-query.dto';

@Controller('api/study-rooms')
export class StudyRoomsController {
  constructor(private studyRoomsService: StudyRoomsService) {}

  @Get()
  async getStudyRooms(@Query() query: StudyRoomQueryDto) {
    return this.studyRoomsService.getStudyRooms(
      query.search,
      query.skills,
      query.status,
      query.dateFrom,
      query.dateTo,
      query.page || 1,
      query.limit || 10,
      query.trending,
    );
  }

  @Get(':studyRoomId')
  @UseGuards(OptionalClerkAuthGuard)
  async getStudyRoomDetails(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId?: string,
  ) {
    return this.studyRoomsService.getStudyRoomDetails(studyRoomId, userId);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async createStudyRoom(
    @CurrentUser() userId: string,
    @Body() createDto: CreateStudyRoomDto,
  ) {
    console.log('createDto', createDto);
    return this.studyRoomsService.createStudyRoom(userId, createDto);
  }

  @Patch(':studyRoomId')
  @UseGuards(ClerkAuthGuard)
  async updateStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
    @Body() updateDto: UpdateStudyRoomDto,
  ) {
    return this.studyRoomsService.updateStudyRoom(studyRoomId, userId, updateDto);
  }

  @Post(':studyRoomId/join')
  @UseGuards(ClerkAuthGuard)
  async joinStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
  ) {
    return this.studyRoomsService.joinStudyRoom(studyRoomId, userId);
  }

  @Post(':studyRoomId/complete')
  @UseGuards(ClerkAuthGuard)
  async completeStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
  ) {
    console.log('🎯 [StudyRoomsController.completeStudyRoom] Endpoint called:', { studyRoomId, userId });
    const result = await this.studyRoomsService.completeStudyRoom(studyRoomId, userId);
    console.log('✅ [StudyRoomsController.completeStudyRoom] Completed successfully');
    return result;
  }

  @Get(':studyRoomId/is-host')
  @UseGuards(ClerkAuthGuard)
  async checkIsHost(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
  ) {
    return this.studyRoomsService.checkIsHost(studyRoomId, userId);
  }
}
