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

export enum ContentModerationStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    PROCESSING = "PROCESSING"
}

export enum CommentStatus {
    ACTIVE = "ACTIVE",
    HIDDEN = "HIDDEN",
    DELETED = "DELETED",
    PENDING_MODERATION = "PENDING_MODERATION"
}

export enum LiveStreamStatus {
    IDLE = "IDLE",
    CONNECTED = "CONNECTED",
    RECORDING = "RECORDING",
    ACTIVE = "ACTIVE",
    DISCONNECTED = "DISCONNECTED",
    DISABLED = "DISABLED"
}

export enum LiveStreamLatencyMode {
    STANDARD = "STANDARD",
    REDUCED = "REDUCED",
    LOW = "LOW"
}

export enum LiveStreamProtocol {
    RTMP = "RTMP",
    RTMPS = "RTMPS",
    SRT = "SRT"
}

export enum PostType {
    TEXT = "TEXT",
    LINK = "LINK",
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    POLL = "POLL",
    JSON = "JSON"
}

export enum TranscribeStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}

export enum TranscribeLanguage {
    EN_US = "EN_US",
    EN_GB = "EN_GB",
    ES_ES = "ES_ES",
    ES_US = "ES_US",
    FR_FR = "FR_FR",
    DE_DE = "DE_DE",
    IT_IT = "IT_IT",
    PT_BR = "PT_BR",
    JA_JP = "JA_JP",
    KO_KR = "KO_KR",
    ZH_CN = "ZH_CN"
}

export enum PollyVoiceId {
    JOANNA = "JOANNA",
    MATTHEW = "MATTHEW",
    IVY = "IVY",
    JUSTIN = "JUSTIN",
    KENDRA = "KENDRA",
    KIMBERLY = "KIMBERLY",
    SALLI = "SALLI",
    JOEY = "JOEY",
    AMY = "AMY",
    BRIAN = "BRIAN",
    EMMA = "EMMA"
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

export class CreatePackageInput {
    name: string;
    description?: Nullable<string>;
    tags?: Nullable<string[]>;
    metadata?: Nullable<JSON>;
    status?: Nullable<PackageStatus>;
}

export class UpdatePackageInput {
    name?: Nullable<string>;
    description?: Nullable<string>;
    tags?: Nullable<string[]>;
    metadata?: Nullable<JSON>;
    status?: Nullable<PackageStatus>;
    isActive?: Nullable<boolean>;
}

export class PackageFilter {
    status?: Nullable<PackageStatus>;
    isActive?: Nullable<boolean>;
    tags?: Nullable<string[]>;
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

export class CreateUserUploadInput {
    filename: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
    bucket: string;
    assetType: AssetType;
    tags?: Nullable<string[]>;
    metadata?: Nullable<JSON>;
    description?: Nullable<string>;
    packageId?: Nullable<string>;
}

export class UpdateUserUploadInput {
    tags?: Nullable<string[]>;
    metadata?: Nullable<JSON>;
    description?: Nullable<string>;
    packageId?: Nullable<string>;
}

export class UserUploadFilter {
    status?: Nullable<UploadStatus>;
    assetType?: Nullable<AssetType>;
    packageId?: Nullable<string>;
    tags?: Nullable<string[]>;
}

export class CreateAssetInput {
    title?: Nullable<string>;
    description?: Nullable<string>;
    assetType: AssetType;
    originalFileName: string;
    fileSize?: Nullable<number>;
    mimeType?: Nullable<string>;
    storageKey?: Nullable<string>;
    bucket?: Nullable<string>;
    region?: Nullable<string>;
    isPublic?: Nullable<boolean>;
    tags?: Nullable<string[]>;
    userurn: string;
}

export class UpdateAssetInput {
    id: number;
    title?: Nullable<string>;
    description?: Nullable<string>;
    isPublic?: Nullable<boolean>;
    tags?: Nullable<string[]>;
    userurn: string;
}

export class AssetFilter {
    assetType?: Nullable<AssetType>;
    moderationStatus?: Nullable<ContentModerationStatus>;
    isPublic?: Nullable<boolean>;
    userurn?: Nullable<string>;
    search?: Nullable<string>;
}

export class CreateCollectionInput {
    name: string;
    description?: Nullable<string>;
    isPublic?: Nullable<boolean>;
}

export class UpdateCollectionInput {
    name?: Nullable<string>;
    description?: Nullable<string>;
    isPublic?: Nullable<boolean>;
}

export class CollectionFilter {
    isPublic?: Nullable<boolean>;
    userId?: Nullable<string>;
}

export class CreateCommentInput {
    content: string;
    asseturn: string;
    userurn: string;
    status?: Nullable<CommentStatus>;
}

export class UpdateCommentInput {
    content?: Nullable<string>;
    status?: Nullable<CommentStatus>;
}

export class CreateLiveStreamInput {
    name: string;
    description?: Nullable<string>;
    location?: Nullable<string>;
    scheduledTime?: Nullable<Date>;
    latencyMode?: Nullable<LiveStreamLatencyMode>;
    audioOnly?: Nullable<boolean>;
    isRecordingEnabled?: Nullable<boolean>;
    isPublic?: Nullable<boolean>;
    userId: number;
}

export class UpdateLiveStreamInput {
    name?: Nullable<string>;
    description?: Nullable<string>;
    location?: Nullable<string>;
    scheduledTime?: Nullable<Date>;
    status?: Nullable<LiveStreamStatus>;
    latencyMode?: Nullable<LiveStreamLatencyMode>;
    audioOnly?: Nullable<boolean>;
    isRecordingEnabled?: Nullable<boolean>;
    isPublic?: Nullable<boolean>;
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

export class CreateTranscribeInput {
    textBlocks: string[];
    language?: Nullable<TranscribeLanguage>;
    voiceId?: Nullable<PollyVoiceId>;
    userurn?: Nullable<string>;
}

export class UpdateTranscribeInput {
    textBlocks?: Nullable<string[]>;
    language?: Nullable<TranscribeLanguage>;
    voiceId?: Nullable<PollyVoiceId>;
    status?: Nullable<TranscribeStatus>;
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

export class Package {
    __typename?: 'Package';
    id: number;
    packageurn: string;
    name: string;
    description?: Nullable<string>;
    tags: string[];
    metadata?: Nullable<JSON>;
    status: PackageStatus;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: User;
    uploads: UserUpload[];
    collections: Collection[];
}

export class PackageEdge implements Edge {
    __typename?: 'PackageEdge';
    cursor: string;
    node: Package;
}

export class PackageConnection implements Connection {
    __typename?: 'PackageConnection';
    edges: PackageEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export abstract class IQuery {
    __typename?: 'IQuery';
    package?: Nullable<Package>;
    packages?: PackageConnection;
    myPackages?: PackageConnection;
    health: string;
    userUpload?: Nullable<UserUpload>;
    userUploads?: UserUploadConnection;
    myUploads?: UserUploadConnection;
    approvedUploads?: UserUploadConnection;
    pendingUploads?: UserUploadConnection;
    generateUploadUrl?: UploadUrlResponse;
    getDownloadUrl?: string;
    asset?: Nullable<Asset>;
    assetByUrn?: Nullable<Asset>;
    assets?: AssetConnection;
    assetsByTags?: Asset[];
    assetsByUser?: Asset[];
    tags: Tag[];
    tag?: Nullable<Tag>;
    collection?: Nullable<Collection>;
    collections?: CollectionConnection;
    myCollections?: CollectionConnection;
    comments?: Comment[];
    comment?: Nullable<Comment>;
    commentsByAsset?: Comment[];
    commentCount?: number;
    commentsPaginated?: CommentConnection;
    commentsByModerationStatus?: Comment[];
    commentsPendingModeration?: Comment[];
    commentsRejected?: Comment[];
    liveStreams: LiveStream[];
    liveStream?: Nullable<LiveStream>;
    liveStreamByUrn?: Nullable<LiveStream>;
    liveStreamByMuxId?: Nullable<LiveStream>;
    liveStreamsByUser?: LiveStream[];
    activeLiveStreams: LiveStream[];
    scheduledLiveStreams: LiveStream[];
    liveStreamUrls?: Nullable<LiveStreamUrls>;
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
    transcribe?: Transcribe;
    transcribeStatistics?: TranscribeStatistics;
    user?: Nullable<User>;
    userByEmail?: Nullable<User>;
    userByUserurn?: Nullable<User>;
    users?: UserConnection;
}

export abstract class IMutation {
    __typename?: 'IMutation';
    createPackage?: Package;
    updatePackage?: Package;
    deletePackage?: boolean;
    createUserUpload?: UserUpload;
    updateUserUpload?: UserUpload;
    deleteUserUpload?: boolean;
    updateUploadStatus?: UserUpload;
    updateAiAnalysis?: UserUpload;
    approveUpload?: UserUpload;
    rejectUpload?: UserUpload;
    bulkUpdateUploadStatus?: UserUpload[];
    createAsset?: Asset;
    updateAsset?: Asset;
    removeAsset?: boolean;
    createCollection?: Collection;
    updateCollection?: Collection;
    deleteCollection?: boolean;
    addPackageToCollection?: Collection;
    removePackageFromCollection?: Collection;
    createComment?: Comment;
    updateComment?: Comment;
    removeComment?: boolean;
    triggerCommentModeration?: boolean;
    updateCommentModerationStatus?: Comment;
    createLiveStream?: LiveStream;
    updateLiveStream?: LiveStream;
    updateLiveStreamStatus?: LiveStream;
    updateLiveStreamViewerStats?: LiveStream;
    deleteLiveStream?: boolean;
    createOperationRequest?: Nullable<Operation>;
    createPost?: Post;
    updatePost?: Post;
    deletePost?: boolean;
    votePost?: Post;
    publishPost?: Post;
    createTenant?: Tenant;
    updateTenant?: Tenant;
    removeTenant?: boolean;
    createTranscribe?: Transcribe;
    updateTranscribe?: Transcribe;
    removeTranscribe?: boolean;
    retryTranscribe?: boolean;
    createUser?: User;
    updateUser?: User;
    removeUser?: boolean;
    verifyUser?: User;
    unverifyUser?: User;
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

export class UploadUrlResponse {
    __typename?: 'UploadUrlResponse';
    uploadUrl: string;
    downloadUrl: string;
    s3Key: string;
}

export abstract class ISubscription {
    __typename?: 'ISubscription';
    uploadStatusChanged?: UserUpload;
    packageStatusChanged?: Package;
    newUploadInCollection?: UserUpload;
    curationCompleted?: UserUpload;
}

export class UserUpload {
    __typename?: 'UserUpload';
    id: number;
    uploadurn: string;
    filename: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
    bucket: string;
    assetType: AssetType;
    status: UploadStatus;
    tags: string[];
    metadata?: Nullable<JSON>;
    aiAnalysis?: Nullable<JSON>;
    description?: Nullable<string>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userurn: string;
    packageId?: Nullable<string>;
    user: User;
    package?: Nullable<Package>;
    downloadUrl?: Nullable<string>;
}

export class UserUploadEdge implements Edge {
    __typename?: 'UserUploadEdge';
    cursor: string;
    node: UserUpload;
}

export class UserUploadConnection implements Connection {
    __typename?: 'UserUploadConnection';
    edges: UserUploadEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export class Tag {
    __typename?: 'Tag';
    id: number;
    tagurn: string;
    name: string;
    description?: Nullable<string>;
    color?: Nullable<string>;
    usageCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class Asset {
    __typename?: 'Asset';
    id: number;
    asseturn: string;
    title?: Nullable<string>;
    description?: Nullable<string>;
    assetType: AssetType;
    originalFileName: string;
    fileSize?: Nullable<number>;
    mimeType?: Nullable<string>;
    storageKey?: Nullable<string>;
    bucket?: Nullable<string>;
    region?: Nullable<string>;
    moderationStatus: ContentModerationStatus;
    moderationResults?: Nullable<JSON>;
    moderationFailureReason?: Nullable<string>;
    metadata?: Nullable<JSON>;
    isPublic: boolean;
    cdnRootUrl?: Nullable<string>;
    cdnUrl?: Nullable<string>;
    isUploaded: boolean;
    uploadedAt?: Nullable<Date>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    userurn?: Nullable<string>;
    tags: Tag[];
    fileUrl: string;
    thumbnailUrl?: Nullable<string>;
    isModerated: boolean;
    isApproved: boolean;
}

export class AssetEdge implements Edge {
    __typename?: 'AssetEdge';
    cursor: string;
    node: Asset;
}

export class AssetConnection implements Connection {
    __typename?: 'AssetConnection';
    edges: AssetEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export class TagEdge implements Edge {
    __typename?: 'TagEdge';
    cursor: string;
    node: Tag;
}

export class TagConnection implements Connection {
    __typename?: 'TagConnection';
    edges: TagEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export class Collection {
    __typename?: 'Collection';
    id: number;
    collectionurn: string;
    name: string;
    description?: Nullable<string>;
    isPublic: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: User;
    packages: Package[];
}

export class CollectionEdge implements Edge {
    __typename?: 'CollectionEdge';
    cursor: string;
    node: Collection;
}

export class CollectionConnection implements Connection {
    __typename?: 'CollectionConnection';
    edges: CollectionEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export class Comment {
    __typename?: 'Comment';
    id: number;
    commenturn: string;
    tenanturn?: Nullable<string>;
    content: string;
    status: CommentStatus;
    isEdited: boolean;
    editedAt?: Nullable<Date>;
    asseturn: string;
    userurn: string;
    user: User;
    asset: Asset;
    moderationStatus: ContentModerationStatus;
    moderationResults?: Nullable<JSON>;
    moderationFailureReason?: Nullable<string>;
    moderatedAt?: Nullable<Date>;
    createdAt: Date;
    updatedAt: Date;
}

export class CommentEdge {
    __typename?: 'CommentEdge';
    cursor: string;
    node: Comment;
}

export class CommentConnection {
    __typename?: 'CommentConnection';
    edges: CommentEdge[];
    pageInfo: PageInfo;
}

export class LiveStream {
    __typename?: 'LiveStream';
    id: number;
    livestreamurn: string;
    name: string;
    description?: Nullable<string>;
    location?: Nullable<string>;
    scheduledTime?: Nullable<Date>;
    status: LiveStreamStatus;
    muxLiveStreamId?: Nullable<string>;
    streamKey?: Nullable<string>;
    srtPassphrase?: Nullable<string>;
    playbackId?: Nullable<string>;
    latencyMode: LiveStreamLatencyMode;
    audioOnly: boolean;
    isRecordingEnabled: boolean;
    isPublic: boolean;
    rtmpIngestUrl: string;
    rtmpsIngestUrl: string;
    srtIngestUrl: string;
    srt?: Nullable<string>;
    srtStreamId?: Nullable<string>;
    metadata?: Nullable<JSON>;
    lastConnectedAt?: Nullable<Date>;
    lastDisconnectedAt?: Nullable<Date>;
    recordingStartedAt?: Nullable<Date>;
    recordingEndedAt?: Nullable<Date>;
    totalViewers: number;
    maxConcurrentViewers: number;
    durationMinutes: number;
    userId: number;
    user: User;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class LiveStreamUrls {
    __typename?: 'LiveStreamUrls';
    rtmp?: Nullable<string>;
    rtmps?: Nullable<string>;
    srt?: Nullable<string>;
    playback?: Nullable<string>;
}

export class Operation {
    __typename?: 'Operation';
    status?: Nullable<boolean>;
    name?: Nullable<string>;
    type?: Nullable<string>;
    message?: Nullable<JSON>;
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
    assets: Asset[];
    tags: Tag[];
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

export class Transcribe {
    __typename?: 'Transcribe';
    id: number;
    transcribeurn: string;
    textBlocks: string[];
    status: TranscribeStatus;
    language: TranscribeLanguage;
    voiceId: PollyVoiceId;
    storageKey?: Nullable<string>;
    bucket?: Nullable<string>;
    cdnRootUrl?: Nullable<string>;
    duration?: Nullable<number>;
    pollyMetadata?: Nullable<JSON>;
    errorMessage?: Nullable<string>;
    userurn?: Nullable<string>;
    user?: Nullable<User>;
    tenanturn?: Nullable<string>;
    isActive?: Nullable<boolean>;
    createdAt: DateTime;
    updatedAt: DateTime;
}

export class TranscribeStatistics {
    __typename?: 'TranscribeStatistics';
    total: number;
    byStatus: TranscribeStatusStats;
}

export class TranscribeStatusStats {
    __typename?: 'TranscribeStatusStats';
    pending: number;
    processing: number;
    completed: number;
    failed: number;
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
