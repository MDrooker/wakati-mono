import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/common/auth/guards/jwt.guard';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const user = await this.userService.create(createUserDto, tenanturn);

    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query('tenanturn') tenanturn?: string) {
    const users = await this.userService.findAll(tenanturn);

    return {
      success: true,
      data: users,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getProfile(@Request() req) {
    const user = await this.userService.findOne(req.user.id);

    return {
      success: true,
      data: user,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific user' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id') id: string,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const user = await this.userService.findOne(id, tenanturn);

    return {
      success: true,
      data: user,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
    @Query('tenanturn') tenanturn?: string,
  ) {
    // Users can only update their own profile or admin can update any
    if (req.user.id !== id && !req.user.isAdmin) {
      return {
        success: false,
        message: 'Unauthorized to update this user',
      };
    }

    const user = await this.userService.update(id, updateUserDto, tenanturn);

    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Body() updateUserDto: UpdateUserDto, @Request() req) {
    const user = await this.userService.update(req.user.id, updateUserDto);

    return {
      success: true,
      data: user,
      message: 'Profile updated successfully',
    };
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a user' })
  @ApiResponse({ status: 200, description: 'User verified successfully' })
  async verifyUser(@Param('id') id: string) {
    const user = await this.userService.verifyUser(id);

    return {
      success: true,
      data: user,
      message: 'User verified successfully',
    };
  }

  @Delete(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unverify a user' })
  @ApiResponse({ status: 200, description: 'User unverified successfully' })
  async unverifyUser(@Param('id') id: string) {
    const user = await this.userService.unverifyUser(id);

    return {
      success: true,
      data: user,
      message: 'User unverified successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string, @Request() req) {
    // Users can only delete their own profile or admin can delete any
    if (req.user.id !== id && !req.user.isAdmin) {
      return {
        success: false,
        message: 'Unauthorized to delete this user',
      };
    }

    await this.userService.remove(id);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
