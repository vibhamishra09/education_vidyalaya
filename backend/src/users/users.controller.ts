import {
  Body,
  Controller,
  Get,
  Logger,
  UnauthorizedException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';

@Controller('api')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private usersService: UsersService) { }

  @Get('users/me')
  @UseGuards(ClerkAuthGuard)
  async getCurrentUser(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    return this.usersService.getCurrentUser(clerkUserId || dbUserId || '');
  }

  @Patch('users/me')
  @UseGuards(ClerkAuthGuard)
  async updateUserProfile(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserProfile(
      clerkUserId || dbUserId || '',
      updateDto,
    );
  }

  @Get('users/check-username')
  @UseGuards(ClerkAuthGuard)
  async checkUsernameAvailability(
    @Query('username') username: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    if (!username) {
      return { available: false };
    }

    try {
      return await this.usersService.checkUsernameAvailability(
        username,
        clerkUserId || dbUserId,
      );
    } catch (error) {
      this.logger.debug(
        'Error in checkUsernameAvailability controller:',
        error,
      );
      return { available: false };
    }
  }

  @Get('users/:userId')
  async getPublicUserProfile(@Param('userId') userId: string) {
    return this.usersService.getPublicUserProfile(userId);
  }

  @Get('users/:userId/skills')
  async getUserSkills(
    @Param('userId') userId: string,
    @Query('type') type?: 'HAS' | 'WANTS',
  ) {
    return this.usersService.getUserSkills(userId, type);
  }
}
