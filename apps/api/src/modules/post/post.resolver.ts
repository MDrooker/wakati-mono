import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { PostService } from './post.service';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { PostType } from './entities/post.entity';
import { trace } from '@opentelemetry/api';
import { Span } from 'nestjs-otel';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/auth/guards/jwt.guard';

@Resolver('Post')
export class PostResolver {
  constructor(private readonly postService: PostService) {}

  @Mutation('createPost')
  @UseGuards(JwtAuthGuard)
  createPost(
    @Args('createPostInput') createPostInput: CreatePostInput,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.create({
      input: createPostInput,
      userurn: 'test-user', // TODO: Get from auth context
      tenanturn: tenanturn,
    });
  }

  @Span('posts.findAll')
  @Query('posts')
  findAll(
    @Args('userId') userId?: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.findAll(userId, tenanturn);
  }

  @Query('post')
  findOne(
    @Args('posturn') posturn: string,
    @Args('userurn') userurn?: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.findOne({ posturn, userurn, tenanturn });
  }

  @Query('postByUrn')
  findByUrn(
    @Args('posturn') posturn: string,
    @Args('userId') userId?: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.findOne({ posturn, userurn: userId, tenanturn });
  }

  @Query('postsByTags')
  findByTags(
    @Args('tags') tags: string[],
    @Args('userId') userId?: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.findByTags(tags, userId, tenanturn);
  }

  @Query('postsByUser')
  findByUser(
    @Args('userurn') userurn: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.findByUserurn(userurn, tenanturn);
  }

  @Query('postReplies')
  findReplies(
    @Args('posturn') posturn: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.findReplies(posturn, tenanturn);
  }

  @Mutation('updatePost')
  @UseGuards(JwtAuthGuard)
  updatePost(
    @Args('updatePostInput') updatePostInput: UpdatePostInput,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.update(
      updatePostInput.posturn,
      updatePostInput,
      'test-user', // TODO: Get from auth context
      tenanturn,
    );
  }

  @Mutation('deletePost')
  @UseGuards(JwtAuthGuard)
  removePost(
    @Args('posturn') posturn: string,
    @Args('userurn') userurn: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.remove(posturn, userurn, tenanturn);
  }

  @Mutation('votePost')
  @UseGuards(JwtAuthGuard)
  votePost(
    @Args('posturn') posturn: string,
    @Args('vote') vote: number,
    @Args('userurn') userurn: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.vote(
      posturn,
      { vote: vote as -1 | 0 | 1 },
      userurn,
      tenanturn,
    );
  }

  @Mutation('publishPost')
  @UseGuards(JwtAuthGuard)
  publishPost(
    @Args('posturn') posturn: string,
    @Args('userurn') userurn: string,
    @Args('tenanturn') tenanturn?: string,
  ) {
    return this.postService.publish(posturn, userurn, tenanturn);
  }

  // Field resolvers for computed properties
  @ResolveField('score')
  getScore(@Parent() post: any) {
    return post.upvotes - post.downvotes;
  }

  @ResolveField('hotScore')
  getHotScore(@Parent() post: any) {
    const ageInHours =
      (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    const score = post.upvotes - post.downvotes;
    return Math.log10(Math.max(score, 1)) / Math.pow(ageInHours + 2, 1.8);
  }

  @ResolveField('canEdit')
  getCanEdit(@Parent() post: any) {
    return post.canEdit();
  }

  @ResolveField('isPublished')
  getIsPublished(@Parent() post: any) {
    return post.isPublished();
  }

  @ResolveField('isComment')
  getIsComment(@Parent() post: any) {
    return post.isComment();
  }

  @ResolveField('hasReplies')
  getHasReplies(@Parent() post: any) {
    return post.hasReplies();
  }

  @ResolveField('isModerated')
  getIsModerated(@Parent() post: any) {
    return post.isModerated();
  }
}
