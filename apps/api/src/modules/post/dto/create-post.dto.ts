import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUrl,
  IsJSON,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType, PostStatus } from '../entities/post.entity';

export class CreatePostDto {
  @ApiProperty({
    description: 'Post URN (auto-generated if not provided)',
    example: 'nesting:rockwell.post:abc12',
    required: false,
  })
  @IsOptional()
  @IsString()
  posturn?: string;

  @ApiProperty({
    description: 'Post title',
    example: 'Amazing discovery in AI research',
    minLength: 1,
    maxLength: 300,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @ApiProperty({
    description: 'Post content (supports rich text)',
    example:
      'This is the body of the post with **bold** text and *italic* text.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40000) // Reddit-like max length
  body?: string;

  @ApiProperty({
    description: 'Editor.js JSON structured content (for JSON post type)',
    example: {
      time: 1672531200000,
      blocks: [
        {
          id: 'abc123',
          type: 'paragraph',
          data: {
            text: 'Hello world! This is a paragraph created with Editor.js',
          },
        },
      ],
      version: '2.28.2',
    },
    required: false,
  })
  @IsOptional()
  bodyJson?: any;

  @ApiProperty({
    description: 'Type of post',
    enum: PostType,
    example: PostType.TEXT,
    default: PostType.TEXT,
  })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType = PostType.TEXT;

  @ApiProperty({
    description: 'Post status',
    enum: PostStatus,
    example: PostStatus.DRAFT,
    default: PostStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus = PostStatus.DRAFT;

  @ApiProperty({
    description: 'URL for link posts',
    example: 'https://example.com/article',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({
    description: 'Whether post is NSFW (Not Safe For Work)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isNSFW?: boolean = false;

  @ApiProperty({
    description: 'Whether post contains spoilers',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSpoiler?: boolean = false;

  @ApiProperty({
    description: 'Whether post is original content',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isOC?: boolean = false;

  @ApiProperty({
    description: 'Post flair/category',
    example: 'Discussion',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  flair?: string;

  @ApiProperty({
    description: 'Whether to allow comments on this post',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean = true;

  @ApiProperty({
    description: 'Whether post is public',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @ApiProperty({
    description: 'Array of tag names to associate with the post',
    example: ['technology', 'ai', 'research'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Array of asset URNs to associate with the post',
    example: ['nesting:rockwell.asset:abc12', 'nesting:rockwell.asset:def34'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetUrns?: string[];

  @ApiProperty({
    description: 'Additional metadata for the post (poll options, etc.)',
    example: { pollOptions: ['Option 1', 'Option 2'] },
    required: false,
  })
  @IsOptional()
  metadata?: any;

  @ApiProperty({
    description: 'Parent post URN for replies/comments',
    example: 'nesting:rockwell.post:parent123',
    required: false,
  })
  @IsOptional()
  @IsString()
  parent_posturn?: string;

  @ApiProperty({
    description: 'Thumbnail URL for link/media posts',
    example: 'https://example.com/thumbnail.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'Tenant URN for multi-tenancy',
    example: 'nesting:rockwell.tenant:abc12',
    required: false,
  })
  @IsOptional()
  @IsString()
  tenanturn?: string;
}
