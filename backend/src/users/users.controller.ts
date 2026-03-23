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
import { CompleteOnboardingDto, UpdateUserDto } from './dto/user.dto';

@Controller('api')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private usersService: UsersService) {}

  @Get('users/me')
  @UseGuards(ClerkAuthGuard)
  async getCurrentUser(@CurrentUser() userId: string) {
    return this.usersService.getCurrentUser(userId);
  }

  @Patch('users/me')
  @UseGuards(ClerkAuthGuard)
  async updateUserProfile(
    @CurrentUser() userId: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserProfile(userId, updateDto);
  }

  @Get('users/check-username')
  @UseGuards(ClerkAuthGuard)
  async checkUsernameAvailability(
    @Query('username') username: string,
    @CurrentUser() userId: string,
  ) {
    if (!username) {
      return { available: false };
    }

    try {
      return await this.usersService.checkUsernameAvailability(username, userId);
    } catch (error) {
      this.logger.debug('Error in checkUsernameAvailability controller:', error);
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

  @Post('users/onboarding')
  @UseGuards(ClerkAuthGuard)
  async completeOnboarding(
    @CurrentUser() clerkUserId: string,
    @Body() body: CompleteOnboardingDto,
  ) {
    if (!clerkUserId) {
      throw new UnauthorizedException(
        'Authenticated Clerk user could not be resolved for onboarding.',
      );
    }

    this.logger.debug('Completing onboarding for Clerk user:', clerkUserId);

    return this.usersService.completeOnboarding(clerkUserId, {
      name: body.name,
      email: body.email,
      avatar: body.avatar,
      bio: body.bio,
      location: body.location,
      school: body.school,
      hourlyRate: body.hourlyRate,
      skillsIHave: body.skillsIHave || [],
      skillsIWant: body.skillsIWant || [],
    });
  }
}
