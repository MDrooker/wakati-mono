import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { VotePostDto } from './dto/post-actions.dto';
import {
  PaginationArgs,
  SortArgs,
  applyCursorPagination,
  ConnectionResult,
} from '../../common/graphql/utils/pagination.util';
import {
  Post,
  PostType,
  PostStatus,
  ContentModerationStatus,
} from './entities/post.entity';
import { Tag } from '../asset/entities/tag.entity';
import { Asset } from '../asset/entities/asset.entity';
import { InngestService } from 'src/common/inngest/inngest.service';
import { TenantContextService } from '../tenant/services/tenant-context.service';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,

    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,

    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,

    private readonly inngestService: InngestService,
    private readonly tenantContextService: TenantContextService,
  ) { }

  /**
   * Find a post by criteria and throw NotFoundException if not found
   */
  private async findPostOrThrow(
    criteria: any,
    relations?: string[],
    errorMessage: string = 'Post not found',
  ): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: criteria,
      relations,
    });

    if (!post) {
      throw new NotFoundException(errorMessage);
    }

    return post;
  }

  // Static methods to generate URNs
  static generatePostUrn(): string {
    return Post.generatePostUrn();
  }

  /**
   * Process tags from input - find existing or create new ones
   */
  private async processTags(tagNames?: string[]): Promise<Tag[]> {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }
    return this.findOrCreateTags(tagNames);
  }

  /**
   * Process assets from input URNs
   */
  private async processAssets(assetUrns?: string[]): Promise<Asset[]> {
    if (!assetUrns || assetUrns.length === 0) {
      return [];
    }

    const assets = await this.assetRepository.find({
      where: { asseturn: In(assetUrns) },
    });

    if (assets.length !== assetUrns.length) {
      const foundUrns = assets.map((asset) => asset.asseturn);
      const notFoundUrns = assetUrns.filter((urn) => !foundUrns.includes(urn));
      throw new NotFoundException(
        `Assets not found: ${notFoundUrns.join(', ')}`,
      );
    }

    return assets;
  }

  /**
   * Find or create tags by name
   */
  private async findOrCreateTags(tagNames: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];

    for (const tagName of tagNames) {
      const normalizedName = tagName.toLowerCase().trim();
      let tag = await this.tagRepository.findOne({
        where: { name: normalizedName },
      });

      if (!tag) {
        tag = this.tagRepository.create({
          name: normalizedName,
          description: `Auto-generated tag for: ${normalizedName}`,
        });
        tag = await this.tagRepository.save(tag);
      }

      tags.push(tag);
    }

    return tags;
  }

  /**
   * Create base post data with common properties
   */
  private createBasePostData(
    input: CreatePostDto,
    userurn: string,
    tags: Tag[],
    assets: Asset[],
    tenanturn?: string,
    overrides?: Partial<Post>,
  ): Partial<Post> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    return {
      ...input,
      userurn,
      tags,
      assets,
      tenanturn: resolvedTenanturn,
      moderationStatus: ContentModerationStatus.PENDING,
      ...overrides,
    };
  }

  async create({
    input,
    userurn,
    tenanturn,
  }: {
    input: CreatePostDto;
    userurn: string;
    tenanturn?: string;
  }): Promise<Post> {
    const tags = await this.processTags(input.tags);
    const assets = await this.processAssets(input.assetUrns);
    // Validate post type and required fields
    if (input.postType === PostType.LINK && !input.url) {
      throw new BadRequestException('URL is required for link posts');
    }

    if (
      input.postType === PostType.TEXT &&
      (!input.body || input.body.trim() === '')
    ) {
      throw new BadRequestException('Body is required for text posts');
    }

    if (input.postType === PostType.JSON && !input.bodyJson) {
      throw new BadRequestException('bodyJson is required for JSON posts');
    }

    const basePostData = this.createBasePostData(
      input,
      userurn,
      tags,
      assets,
      tenanturn,
    );
    const post = this.postRepository.create(basePostData);
    const savedPost = await this.postRepository.save(post);

    // Trigger text content moderation workflow via Inngest if post has text content
    const hasTextContent =
      (savedPost.body && savedPost.body.trim() !== '') ||
      (savedPost.postType === PostType.JSON &&
        savedPost.bodyJson &&
        savedPost.bodyPlainText &&
        savedPost.bodyPlainText.trim() !== '');

    if (hasTextContent) {
      await this.inngestService.sendEvent('post.curation/start-content-moderation', {
        posturn: savedPost.posturn,
        content: savedPost.bodyPlainText || savedPost.body,
        userurn: userurn,
      });
    } else {
      // If no text content to moderate, auto-approve
      savedPost.moderationStatus = ContentModerationStatus.APPROVED;
      await this.postRepository.save(savedPost);
    }

    return savedPost;
  }

  async findAll(userurn?: string, tenanturn?: string): Promise<Post[]> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.tags', 'tag')
      .leftJoinAndSelect('post.assets', 'asset')
      .leftJoinAndSelect('post.user', 'user')
      .where('post.isActive = :isActive', { isActive: true })
      .andWhere('post.status = :status', { status: PostStatus.APPROVED })
      .andWhere('post.moderationStatus = :moderationStatus', {
        moderationStatus: ContentModerationStatus.APPROVED,
      })
      .orderBy('post.createdAt', 'DESC');

    // Apply tenant filtering
    if (resolvedTenanturn) {
      queryBuilder.andWhere('post.tenanturn = :tenanturn', {
        tenanturn: resolvedTenanturn,
      });
    }

    if (userurn) {
      queryBuilder.andWhere('post.userurn = :userurn', { userurn });
    } else {
      queryBuilder.andWhere('post.isPublic = :isPublic', { isPublic: true });
    }

    return queryBuilder.getMany();
  }

  async findOne({
    posturn,
    userurn,
    tenanturn,
  }: {
    posturn: string;
    userurn?: string;
    tenanturn?: string;
  }): Promise<Post> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    debugger;
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.tags', 'tag')
      .leftJoinAndSelect('post.assets', 'asset')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.replies', 'replies')
      .where('post.posturn = :posturn', { posturn })
      .andWhere('post.isActive = :isActive', { isActive: true });

    // Apply tenant filtering
    if (resolvedTenanturn) {
      queryBuilder.andWhere('post.tenanturn = :tenanturn', {
        tenanturn: resolvedTenanturn,
      });
    }

    // If no user provided, only show public approved posts
    if (!userurn) {
      queryBuilder
        .andWhere('post.isPublic = :isPublic', { isPublic: true })
        .andWhere('post.status IN (:...statuses)', {
          statuses: [PostStatus.APPROVED, PostStatus.PENDING, PostStatus.DRAFT],
        })
        .andWhere('post.moderationStatus = :moderationStatus', {
          moderationStatus: ContentModerationStatus.APPROVED,
        });
    } else {
      // If user provided, show their own posts regardless of status, or public approved posts
      queryBuilder.andWhere(
        '(post.userurn = :userurn OR (post.isPublic = :isPublic AND post.status = :status AND post.moderationStatus = :moderationStatus))',
        {
          userurn,
          isPublic: true,
          status: PostStatus.APPROVED,
          moderationStatus: ContentModerationStatus.APPROVED,
        },
      );
    }

    const post = await queryBuilder.getOne();

    if (!post) {
      throw new NotFoundException(`Post with URN ${posturn} not found`);
    }

    // Increment view count
    await this.postRepository.increment({ posturn }, 'viewCount', 1);

    return post;
  }

  async findByUserurn(userurn: string, tenanturn?: string): Promise<Post[]> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = {
      userurn,
      isActive: true,
    };

    // Apply tenant filtering
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    return this.postRepository.find({
      where: whereCondition,
      relations: ['tags', 'assets', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTags(
    tagNames: string[],
    userurn?: string,
    tenanturn?: string,
  ): Promise<Post[]> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.tags', 'tag')
      .leftJoinAndSelect('post.assets', 'asset')
      .leftJoinAndSelect('post.user', 'user')
      .where('post.isActive = :isActive', { isActive: true })
      .andWhere('post.status = :status', { status: PostStatus.APPROVED })
      .andWhere('post.moderationStatus = :moderationStatus', {
        moderationStatus: ContentModerationStatus.APPROVED,
      })
      .andWhere('tag.name IN (:...tagNames)', { tagNames })
      .orderBy('post.createdAt', 'DESC');

    // Apply tenant filtering
    if (resolvedTenanturn) {
      queryBuilder.andWhere('post.tenanturn = :tenanturn', {
        tenanturn: resolvedTenanturn,
      });
    }

    if (!userurn) {
      queryBuilder.andWhere('post.isPublic = :isPublic', { isPublic: true });
    }

    return queryBuilder.getMany();
  }

  async findReplies(posturn: string, tenanturn?: string): Promise<Post[]> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = {
      parent_posturn: posturn,
      isActive: true,
      status: PostStatus.APPROVED,
      moderationStatus: ContentModerationStatus.APPROVED,
    };

    // Apply tenant filtering
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    return this.postRepository.find({
      where: whereCondition,
      relations: ['tags', 'assets', 'user', 'replies'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(
    posturn: string,
    updatePostDto: UpdatePostDto,
    userurn: string,
    tenanturn?: string,
  ): Promise<Post> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = { posturn, userurn };
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    const post = await this.findPostOrThrow(
      whereCondition,
      ['tags', 'assets'],
      `Post with URN ${posturn} not found or not owned by user`,
    );

    // Check if post can be edited
    if (!post.canEdit()) {
      throw new ForbiddenException(
        'Post cannot be edited in its current state',
      );
    }

    // Process updated tags and assets if provided
    const tags = updatePostDto.tags
      ? await this.processTags(updatePostDto.tags)
      : post.tags;
    const assets = updatePostDto.assetUrns
      ? await this.processAssets(updatePostDto.assetUrns)
      : post.assets;

    // Update post data
    Object.assign(post, {
      ...updatePostDto,
      tags,
      assets,
      // Reset moderation if content changed
      ...(updatePostDto.body && updatePostDto.body !== post.body
        ? {
          moderationStatus: ContentModerationStatus.PENDING,
          moderatedAt: null,
        }
        : {}),
    });

    const updatedPost = await this.postRepository.save(post);

    // Re-trigger moderation if text content changed
    if (
      updatePostDto.body &&
      updatePostDto.body !== post.body &&
      updatedPost.body?.trim()
    ) {
      await this.inngestService.sendEvent('post.curation/start-content-moderation', {
        posturn: updatedPost.posturn,
        content: updatedPost.bodyPlainText || updatedPost.body,
        userurn: userurn,
      });
    }

    return updatedPost;
  }

  async vote(
    posturn: string,
    voteDto: VotePostDto,
    userurn: string,
    tenanturn?: string,
  ): Promise<Post> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = { posturn };
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    const post = await this.findPostOrThrow(whereCondition);

    // In a real implementation, you'd track user votes in a separate table
    // For now, we'll just update the vote counts directly
    // This is simplified - you should implement proper vote tracking

    switch (voteDto.vote) {
      case 1: // Upvote
        post.upvotes += 1;
        break;
      case -1: // Downvote
        post.downvotes += 1;
        break;
      case 0: // Remove vote - this would require tracking existing votes
        // Implementation depends on vote tracking system
        break;
    }

    return this.postRepository.save(post);
  }

  async publish(
    posturn: string,
    userurn: string,
    tenanturn?: string,
  ): Promise<Post> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = { posturn, userurn };
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    const post = await this.findPostOrThrow(
      whereCondition,
      [],
      `Post with URN ${posturn} not found or not owned by user`,
    );

    if (post.moderationStatus !== ContentModerationStatus.APPROVED) {
      throw new BadRequestException('Post must be approved before publishing');
    }

    post.status = PostStatus.APPROVED;
    post.publishedAt = new Date();

    return this.postRepository.save(post);
  }

  async remove(
    posturn: string,
    userurn: string,
    tenanturn?: string,
  ): Promise<void> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = { posturn, userurn };
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    const post = await this.findPostOrThrow(
      whereCondition,
      [],
      `Post with URN ${posturn} not found or not owned by user`,
    );

    post.isActive = false;
    post.status = PostStatus.DELETED;
    await this.postRepository.save(post);
  }

  // Content moderation methods
  async updateModerationStatusByPosturn(
    posturn: string,
    status: ContentModerationStatus,
    results?: any,
    failureReason?: string,
    tenanturn?: string,
  ): Promise<Post> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = { posturn };
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    const post = await this.findPostOrThrow(whereCondition);

    post.moderationStatus = status;
    post.moderatedAt = new Date();

    if (results) {
      post.moderationResults = results;
    }

    if (failureReason) {
      post.moderationFailureReason = failureReason;
    }

    return this.postRepository.save(post);
  }

  async findPendingPosts(tenanturn?: string): Promise<Post[]> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = {
      moderationStatus: ContentModerationStatus.PENDING,
      isActive: true,
    };

    // Apply tenant filtering
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    return this.postRepository.find({
      where: whereCondition,
      order: { createdAt: 'ASC' },
    });
  }

  async findByPosturn(posturn: string, tenanturn?: string): Promise<Post> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const whereCondition: any = { posturn };
    if (resolvedTenanturn) {
      whereCondition.tenanturn = resolvedTenanturn;
    }

    return this.findPostOrThrow(whereCondition, ['tags', 'assets']);
  }

  // Tag management methods (inherited from AssetService pattern)
  async findAllTags(): Promise<Tag[]> {
    return this.tagRepository.find({
      where: { isActive: true },
      order: { usageCount: 'DESC' },
    });
  }

  async findTagByName(name: string): Promise<Tag | null> {
    return this.tagRepository.findOne({
      where: { name: name.toLowerCase().trim() },
    });
  }

  async updateTagUsageCount(tagId: string): Promise<void> {
    const tag = await this.tagRepository.findOne({
      where: { id: parseInt(tagId) },
    });
    if (tag) {
      const count = await this.postRepository
        .createQueryBuilder('post')
        .leftJoin('post.tags', 'tag')
        .where('tag.id = :tagId', { tagId })
        .andWhere('post.isActive = :isActive', { isActive: true })
        .getCount();

      await this.tagRepository.update(tagId, { usageCount: count });
    }
  }

  // Pagination support
  async findPostsWithPagination(
    paginationArgs: PaginationArgs,
    sortArgs?: SortArgs,
    userurn?: string,
    tenanturn?: string,
  ): Promise<ConnectionResult<Post>> {
    const resolvedTenanturn =
      this.tenantContextService.resolveTenanturn(tenanturn);

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.tags', 'tag')
      .leftJoinAndSelect('post.assets', 'asset')
      .leftJoinAndSelect('post.user', 'user')
      .where('post.isActive = :isActive', { isActive: true })
      .andWhere('post.status = :status', { status: PostStatus.APPROVED })
      .andWhere('post.moderationStatus = :moderationStatus', {
        moderationStatus: ContentModerationStatus.APPROVED,
      });

    // Apply tenant filtering
    if (resolvedTenanturn) {
      queryBuilder.andWhere('post.tenanturn = :tenanturn', {
        tenanturn: resolvedTenanturn,
      });
    }

    if (!userurn) {
      queryBuilder.andWhere('post.isPublic = :isPublic', { isPublic: true });
    }

    return applyCursorPagination(
      queryBuilder,
      paginationArgs,
      sortArgs || { field: 'createdAt', direction: 'DESC' },
    );
  }
}
