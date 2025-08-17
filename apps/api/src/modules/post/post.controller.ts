import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  Request,
  Query,
  Logger,
  BadRequestException,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { VotePostDto, PublishPostDto } from './dto/post-actions.dto';
import { JwtAuthGuard } from 'src/common/auth/guards/jwt.guard';
import { TenantInterceptor } from 'src/modules/tenant/intercepters/tenant.interceptor';

@ApiTags('Posts')
@UseInterceptors(TenantInterceptor)
@Controller('posts')
export class PostController {
  private readonly logger = new Logger(PostController.name);

  constructor(private readonly postService: PostService) {}

  /**
   * Gets user URN from request or defaults to 'public'
   */
  private getUserUrn(req: any): string {
    return req.user?.userurn ? req.user.userurn : 'public';
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async create(
    @Body() createPostDto: CreatePostDto,
    @Request() req,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const userurn = this.getUserUrn(req);
    const post = await this.postService.create({
      input: createPostDto,
      userurn: userurn,
      tenanturn: tenanturn,
    });

    return {
      success: true,
      data: post,
      message: 'Post created successfully and queued for content moderation',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get posts (public or user-specific if authenticated)',
  })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user URN',
  })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async findAll(
    @Request() req,
    @Query('userId') userurn?: string,
    @Query('tenanturn') tenanturn?: string,
  ) {
    // Use authenticated user's URN if available, otherwise show public posts
    const targetUserurn = req.user?.userurn || userurn;
    const posts = await this.postService.findAll(targetUserurn, tenanturn);

    return {
      success: true,
      data: posts,
    };
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all posts for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'User posts retrieved successfully',
  })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async findMyPosts(@Request() req, @Query('tenanturn') tenanturn?: string) {
    const posts = await this.postService.findByUserurn(
      req.user.userurn,
      tenanturn,
    );

    return {
      success: true,
      data: posts,
    };
  }

  @Get('by-tags')
  @ApiOperation({ summary: 'Get posts by tag names' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  @ApiQuery({
    name: 'tags',
    required: true,
    description: 'Comma-separated list of tag names',
    example: 'technology,ai,research',
  })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async findByTags(
    @Query('tags') tags: string,
    @Request() req,
    @Query('tenanturn') tenanturn?: string,
  ) {
    if (!tags) {
      throw new BadRequestException('Tags parameter is required');
    }

    const tagNames = tags.split(',').map((tag) => tag.trim());
    const targetUserurn = req.user?.userurn;

    const posts = await this.postService.findByTags(
      tagNames,
      targetUserurn,
      tenanturn,
    );

    return {
      success: true,
      data: posts,
    };
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all available tags' })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
  async findAllTags() {
    const tags = await this.postService.findAllTags();

    return {
      success: true,
      data: tags,
    };
  }

  @Get(':posturn')
  @ApiOperation({ summary: 'Get a specific post' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async findOne(
    @Param('posturn') posturn: string,
    @Request() req,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const userurn = req.user?.userurn;
    console.log(posturn);
    const post = await this.postService.findOne({
      posturn,
      userurn,
      tenanturn,
    });

    return {
      success: true,
      data: post,
    };
  }

  @Get(':posturn/replies')
  @ApiOperation({ summary: 'Get replies/comments for a post' })
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully' })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async findReplies(
    @Param('posturn') posturn: string,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const replies = await this.postService.findReplies(posturn, tenanturn);

    return {
      success: true,
      data: replies,
    };
  }

  @Patch(':posturn')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to update this post',
  })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async update(
    @Param('posturn') posturn: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const post = await this.postService.update(
      posturn,
      updatePostDto,
      req.user.userurn,
      tenanturn,
    );

    return {
      success: true,
      data: post,
      message: 'Post updated successfully',
    };
  }

  @Post(':posturn/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on a post (upvote/downvote)' })
  @ApiResponse({ status: 200, description: 'Vote recorded successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async vote(
    @Param('posturn') posturn: string,
    @Body() voteDto: VotePostDto,
    @Request() req,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const post = await this.postService.vote(
      posturn,
      voteDto,
      req.user.userurn,
      tenanturn,
    );

    return {
      success: true,
      data: post,
      message: 'Vote recorded successfully',
    };
  }

  @Post(':posturn/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a post (make it public)' })
  @ApiResponse({ status: 200, description: 'Post published successfully' })
  @ApiResponse({
    status: 400,
    description: 'Post cannot be published in its current state',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async publish(
    @Param('posturn') posturn: string,
    @Body() publishDto: PublishPostDto,
    @Request() req,
    @Query('tenanturn') tenanturn?: string,
  ) {
    const post = await this.postService.publish(
      posturn,
      req.user.userurn,
      tenanturn,
    );

    return {
      success: true,
      data: post,
      message: 'Post published successfully',
    };
  }

  @Delete(':posturn')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to delete this post',
  })
  @ApiQuery({
    name: 'tenanturn',
    required: false,
    description: 'Tenant URN for multi-tenancy',
  })
  async remove(
    @Param('posturn') posturn: string,
    @Request() req,
    @Query('tenanturn') tenanturn?: string,
  ) {
    await this.postService.remove(posturn, req.user.userurn, tenanturn);

    return {
      success: true,
      message: 'Post deleted successfully',
    };
  }
}
