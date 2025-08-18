
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum OptionTypeEnum {
    IMAGE = "IMAGE",
    TEXT = "TEXT",
    BUTTON = "BUTTON"
}

export enum UploadStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}

export enum AssetType {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    AUDIO = "AUDIO",
    DOCUMENT = "DOCUMENT"
}

export enum PackageStatus {
    DRAFT = "DRAFT",
    UPLOAD = "UPLOAD",
    REVIEW = "REVIEW",
    PUBLISHED = "PUBLISHED",
    ARCHIVED = "ARCHIVED"
}

export enum SortDirection {
    ASC = "ASC",
    DESC = "DESC"
}

export enum PostType {
    TEXT = "TEXT",
    LINK = "LINK",
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    POLL = "POLL",
    JSON = "JSON"
}

export enum ContentModerationStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    PROCESSING = "PROCESSING"
}

export class RichLanguageItemSchemaInput {
    default: string;
    translations?: Nullable<RichLanguageItemSchemaTranslationInput[]>;
}

export class RichLanguageItemSchemaTranslationInput {
    language: string;
    value: string;
}

export class MetadataInput {
    key?: Nullable<string>;
    value?: Nullable<string>;
}

export class LocationInput {
    type?: Nullable<string>;
    coordinates?: Nullable<Nullable<number>[]>;
}

export class RelatedMediaItemInput {
    name?: Nullable<string>;
    type?: Nullable<string>;
    aspectRatio?: Nullable<string>;
    height?: Nullable<number>;
    width?: Nullable<number>;
    url?: Nullable<string>;
}

export class RelatedMediaInput {
    name?: Nullable<string>;
    platform?: Nullable<string>;
    description?: Nullable<string>;
    media?: Nullable<RelatedMediaItemInput>;
}

export class MediaAssetInput {
    media?: Nullable<Nullable<RelatedMediaInput>[]>;
    thumbnail?: Nullable<RelatedMediaItemInput>;
    default?: Nullable<RelatedMediaItemInput>;
}

export class PaginationInput {
    first?: Nullable<number>;
    after?: Nullable<string>;
    last?: Nullable<number>;
    before?: Nullable<string>;
}

export class SortInput {
    field: string;
    direction?: Nullable<SortDirection>;
}

export class CreateOperationRequestInput {
    type?: Nullable<string>;
    payload?: Nullable<JSON>;
    value?: Nullable<string>;
}

export class CreatePostInput {
    title: string;
    body?: Nullable<string>;
    bodyJson?: Nullable<JSON>;
    postType: PostType;
    url?: Nullable<string>;
    thumbnailUrl?: Nullable<string>;
    isNsfw?: Nullable<boolean>;
    isSpoiler?: Nullable<boolean>;
    isPublic?: Nullable<boolean>;
    parentPostUrn?: Nullable<string>;
    assetUrns?: Nullable<string[]>;
    tags?: Nullable<string[]>;
    userurn: string;
}

export class UpdatePostInput {
    posturn: string;
    title?: Nullable<string>;
    body?: Nullable<string>;
    bodyJson?: Nullable<JSON>;
    url?: Nullable<string>;
    thumbnailUrl?: Nullable<string>;
    isNsfw?: Nullable<boolean>;
    isSpoiler?: Nullable<boolean>;
    isPublic?: Nullable<boolean>;
    tags?: Nullable<string[]>;
    userurn: string;
}

export class PostFilter {
    postType?: Nullable<PostType>;
    moderationStatus?: Nullable<ContentModerationStatus>;
    isPublic?: Nullable<boolean>;
    userurn?: Nullable<string>;
    parentPostUrn?: Nullable<string>;
    hasParent?: Nullable<boolean>;
    isDeleted?: Nullable<boolean>;
    search?: Nullable<string>;
}

export class VoteInput {
    vote: number;
}

export class CreateTenantInput {
    name: string;
    description?: Nullable<string>;
    domain?: Nullable<string>;
    logoUrl?: Nullable<string>;
    settings?: Nullable<JSON>;
}

export class UpdateTenantInput {
    id: number;
    name?: Nullable<string>;
    description?: Nullable<string>;
    domain?: Nullable<string>;
    logoUrl?: Nullable<string>;
    settings?: Nullable<JSON>;
    isActive?: Nullable<boolean>;
}

export class TenantFilter {
    search?: Nullable<string>;
}

export class CreateUserInput {
    email: string;
    firstName: string;
    lastName: string;
    displayName?: Nullable<string>;
    avatarUrl?: Nullable<string>;
    bio?: Nullable<string>;
    phoneNumber?: Nullable<string>;
    dateOfBirth?: Nullable<Date>;
    location?: Nullable<string>;
    website?: Nullable<string>;
    supabaseUserId?: Nullable<string>;
}

export class UpdateUserInput {
    id: number;
    email?: Nullable<string>;
    firstName?: Nullable<string>;
    lastName?: Nullable<string>;
    displayName?: Nullable<string>;
    avatarUrl?: Nullable<string>;
    bio?: Nullable<string>;
    phoneNumber?: Nullable<string>;
    dateOfBirth?: Nullable<Date>;
    location?: Nullable<string>;
    website?: Nullable<string>;
}

export class UserFilter {
    isVerified?: Nullable<boolean>;
    search?: Nullable<string>;
}

export interface Error {
    message: string;
    code: string;
}

export interface Edge {
    cursor: string;
}

export interface Connection {
    edges: Edge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export class FieldError {
    __typename?: 'FieldError';
    field: string;
    message: string;
}

export class RichLanguageItemSchemaTranslation {
    __typename?: 'RichLanguageItemSchemaTranslation';
    language?: Nullable<string>;
    value?: Nullable<string>;
}

export class RichLanguageItemSchema {
    __typename?: 'RichLanguageItemSchema';
    default?: Nullable<string>;
    translations?: Nullable<Nullable<RichLanguageItemSchemaTranslation>[]>;
}

export class Metadata {
    __typename?: 'Metadata';
    namespace?: Nullable<string>;
    key?: Nullable<string>;
    value?: Nullable<string>;
}

export class Location {
    __typename?: 'Location';
    type?: Nullable<string>;
    coordinates?: Nullable<Nullable<number>[]>;
}

export class RelatedMediaItem {
    __typename?: 'RelatedMediaItem';
    name?: Nullable<string>;
    type?: Nullable<string>;
    aspectRatio?: Nullable<string>;
    height?: Nullable<number>;
    width?: Nullable<number>;
    url?: Nullable<string>;
}

export class RelatedMedia {
    __typename?: 'RelatedMedia';
    name?: Nullable<string>;
    platform?: Nullable<string>;
    description?: Nullable<string>;
    media?: Nullable<RelatedMediaItem>;
}

export class MediaAsset {
    __typename?: 'MediaAsset';
    media?: Nullable<Nullable<RelatedMedia>[]>;
    thumbnail?: Nullable<RelatedMediaItem>;
    default?: Nullable<RelatedMediaItem>;
}

export class PageInfo {
    __typename?: 'PageInfo';
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: Nullable<string>;
    endCursor?: Nullable<string>;
}

export class AuthPayload {
    __typename?: 'AuthPayload';
    user: User;
    accessToken: string;
}

export abstract class IQuery {
    __typename?: 'IQuery';
    health: string;
    operation?: Nullable<Nullable<Operation>[]>;
    getServerTime?: Nullable<Operation>;
    post?: Nullable<Post>;
    postByUrn?: Nullable<Post>;
    posts?: PostConnection;
    postsByTags?: Post[];
    postsByUser?: Post[];
    postReplies?: Post[];
    tenant?: Nullable<Tenant>;
    tenantByTenanturn?: Nullable<Tenant>;
    tenantByDomain?: Nullable<Tenant>;
    tenants?: TenantConnection;
    user?: Nullable<User>;
    userByEmail?: Nullable<User>;
    userByUserurn?: Nullable<User>;
    users?: UserConnection;
}

export class Operation {
    __typename?: 'Operation';
    status?: Nullable<boolean>;
    name?: Nullable<string>;
    type?: Nullable<string>;
    message?: Nullable<JSON>;
}

export abstract class IMutation {
    __typename?: 'IMutation';
    createOperationRequest?: Nullable<Operation>;
    createPost?: Post;
    updatePost?: Post;
    deletePost?: boolean;
    votePost?: Post;
    publishPost?: Post;
    createTenant?: Tenant;
    updateTenant?: Tenant;
    removeTenant?: boolean;
    createUser?: User;
    updateUser?: User;
    removeUser?: boolean;
    verifyUser?: User;
    unverifyUser?: User;
}

export class Post {
    __typename?: 'Post';
    id: number;
    posturn: string;
    title: string;
    body?: Nullable<string>;
    bodyJson?: Nullable<JSON>;
    postType: PostType;
    url?: Nullable<string>;
    thumbnailUrl?: Nullable<string>;
    upvotes: number;
    downvotes: number;
    commentCount: number;
    shareCount: number;
    gilded: boolean;
    gildings?: Nullable<JSON>;
    isStickied: boolean;
    isLocked: boolean;
    isNsfw: boolean;
    isSpoiler: boolean;
    isArchived: boolean;
    moderationStatus: ContentModerationStatus;
    moderationResults?: Nullable<JSON>;
    moderationFailureReason?: Nullable<string>;
    isPublic: boolean;
    isDeleted: boolean;
    userurn: string;
    user: User;
    parentPostUrn?: Nullable<string>;
    parentPost?: Nullable<Post>;
    replies: Post[];
    score: number;
    hotScore: number;
    canEdit: boolean;
    isPublished: boolean;
    isComment: boolean;
    hasReplies: boolean;
    isModerated: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class PostEdge implements Edge {
    __typename?: 'PostEdge';
    cursor: string;
    node: Post;
}

export class PostConnection implements Connection {
    __typename?: 'PostConnection';
    edges: PostEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export class Tenant {
    __typename?: 'Tenant';
    id: number;
    tenanturn: string;
    name: string;
    description?: Nullable<string>;
    domain?: Nullable<string>;
    logoUrl?: Nullable<string>;
    settings?: Nullable<JSON>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class TenantEdge implements Edge {
    __typename?: 'TenantEdge';
    cursor: string;
    node: Tenant;
}

export class TenantConnection implements Connection {
    __typename?: 'TenantConnection';
    edges: TenantEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export class User {
    __typename?: 'User';
    id: number;
    userurn: string;
    tenanturn?: Nullable<string>;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: Nullable<string>;
    avatarUrl?: Nullable<string>;
    bio?: Nullable<string>;
    phoneNumber?: Nullable<string>;
    dateOfBirth?: Nullable<Date>;
    location?: Nullable<string>;
    website?: Nullable<string>;
    isVerified: boolean;
    isActive: boolean;
    lastLoginAt?: Nullable<Date>;
    supabaseUserId?: Nullable<string>;
    createdAt: Date;
    updatedAt: Date;
}

export class UserEdge implements Edge {
    __typename?: 'UserEdge';
    cursor: string;
    node: User;
}

export class UserConnection implements Connection {
    __typename?: 'UserConnection';
    edges: UserEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export type DateTime = any;
export type JSON = any;
type Nullable<T> = T | null;
