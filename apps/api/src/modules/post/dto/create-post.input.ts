import { Field, InputType } from '@nestjs/graphql';
import { PostType, PostStatus } from '../entities/post.entity';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreatePostInput {
  @Field({ nullable: true })
  posturn?: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  body?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  bodyJson?: any;

  @Field(() => PostType, { nullable: true, defaultValue: PostType.TEXT })
  postType?: PostType;

  @Field(() => PostStatus, { nullable: true, defaultValue: PostStatus.DRAFT })
  status?: PostStatus;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true, defaultValue: false })
  isNSFW?: boolean;

  @Field({ nullable: true, defaultValue: false })
  isSpoiler?: boolean;

  @Field({ nullable: true, defaultValue: false })
  isOC?: boolean;

  @Field({ nullable: true })
  flair?: string;

  @Field({ nullable: true, defaultValue: true })
  allowComments?: boolean;

  @Field({ nullable: true, defaultValue: true })
  isPublic?: boolean;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [String], { nullable: true })
  assetUrns?: string[];

  @Field({ nullable: true })
  parent_posturn?: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;
}
