import {
  Body,
  Controller,
  Delete,
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
import { OptionalClerkAuthGuard } from '../common/guards/optional-clerk-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto, OnboardingDto } from './dto/user.dto';

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
  @UseGuards(OptionalClerkAuthGuard)
  async getPublicUserProfile(
    @Param('userId') userId: string,
    @CurrentUser('dbUserId') dbUserId?: string,
    @CurrentUser('clerkId') clerkUserId?: string,
  ) {
    return this.usersService.getPublicUserProfile(
      userId,
      clerkUserId || dbUserId || undefined,
    );
  }

  @Get('users/:userId/skills')
  async getUserSkills(
    @Param('userId') userId: string,
    @Query('type') type?: 'HAS' | 'WANTS',
  ) {
    return this.usersService.getUserSkills(userId, type);
  }

  @Post('users/:userId/follow')
  @UseGuards(ClerkAuthGuard)
  async followUser(
    @Param('userId') userId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    return this.usersService.followUser(clerkUserId || dbUserId || '', userId);
  }

  @Delete('users/:userId/follow')
  @UseGuards(ClerkAuthGuard)
  async unfollowUser(
    @Param('userId') userId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    return this.usersService.unfollowUser(
      clerkUserId || dbUserId || '',
      userId,
    );
  }

  @Post('users/onboarding')
  @UseGuards(ClerkAuthGuard)
  async onboardUser(
    @CurrentUser('clerkId') clerkUserId: string,
    @Body() onboardingDto: OnboardingDto,
  ) {
    this.logger.log(`Onboarding user ${clerkUserId}`);
    return this.usersService.onboardUser(clerkUserId, onboardingDto);
  }

  @Get('users/recommendations')
  @UseGuards(ClerkAuthGuard)
  async getRecommendations(@CurrentUser('clerkId') clerkUserId: string, @Query('limit') limit?: string) {
    return this.usersService.getRecommendedPeers(clerkUserId, parseInt(limit || '6', 10));
  }

  @Get('users-search')
  @UseGuards(ClerkAuthGuard)
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    return this.usersService.searchUsers(
      query || '',
      parseInt(limit, 10) || 20,
      clerkUserId || dbUserId || '',
    );
  }
}
