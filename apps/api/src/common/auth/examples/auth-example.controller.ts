import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../guards/bearer.guard';
import { JwtPayload } from '../strategy/jwt.strategy';
import { JwtService, UserTokenData } from '../service/jwt.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Public login endpoint - generates JWT token
   */
  @Public()
  @Post('login')
  async login(@Body() loginData: { username: string; password: string }) {
    // In a real application, you would validate credentials against a database
    // This is just an example
    if (loginData.username === 'admin' && loginData.password === 'password') {
      const userData: UserTokenData = {
        sub: '1',
        userurn: 'admin',
        roles: ['admin', 'user'],
      };

      const token = await this.jwtService.generateToken(userData);
      return {
        message: 'Login successful',
        ...token,
      };
    }

    return { message: 'Invalid credentials' };
  }

  /**
   * Protected endpoint - requires valid JWT token
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return {
      message: 'This is your profile',
      user,
    };
  }

  /**
   * Admin-only endpoint - requires JWT token and admin role
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  getAdminData(@CurrentUser() user: JwtPayload) {
    return {
      message: 'This is admin-only data',
      user,
    };
  }

  /**
   * Multi-role endpoint - requires JWT token and either admin or moderator role
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Get('moderation')
  getModerationData(@CurrentUser() user: JwtPayload) {
    return {
      message: 'This is moderation data',
      user,
    };
  }

  /**
   * Public endpoint - no authentication required
   */
  @Public()
  @Get('public')
  getPublicData() {
    return {
      message: 'This is public data, no authentication required',
    };
  }
}
