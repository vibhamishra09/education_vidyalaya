import { Controller, Get, Patch, Body, Param, UseGuards, Query, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/user.dto';

@Controller('api')
export class UsersController {
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
      console.error('Error in checkUsernameAvailability controller:', error);
      // Return false on error to be safe
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
  async completeOnboarding(@Body() body: any) {
    console.log('🔍 Complete onboarding called with body:', body);
    const { clerkId, name, email, avatar, bio, location, school, hourlyRate, skillsIHave, skillsIWant } = body;
    return this.usersService.completeOnboarding(clerkId, {
      name,
      email,
      avatar,
      bio,
      location,
      school,
      hourlyRate,
      skillsIHave: skillsIHave || [],
      skillsIWant: skillsIWant || [],
    });
  }
}
