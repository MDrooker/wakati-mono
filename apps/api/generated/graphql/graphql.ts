/* eslint-disable */
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

export type Asset = {
  __typename?: 'Asset';
  assetType: AssetType;
  asseturn: Scalars['String']['output'];
  bucket?: Maybe<Scalars['String']['output']>;
  cdnRootUrl?: Maybe<Scalars['String']['output']>;
  cdnUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fileSize?: Maybe<Scalars['Int']['output']>;
  fileUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isApproved: Scalars['Boolean']['output'];
  isModerated: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  isUploaded: Scalars['Boolean']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  mimeType?: Maybe<Scalars['String']['output']>;
  moderationFailureReason?: Maybe<Scalars['String']['output']>;
  moderationResults?: Maybe<Scalars['JSON']['output']>;
  moderationStatus: ContentModerationStatus;
  originalFileName: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
  storageKey?: Maybe<Scalars['String']['output']>;
  tags: Array<Tag>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  uploadedAt?: Maybe<Scalars['Date']['output']>;
  user: User;
  userurn?: Maybe<Scalars['String']['output']>;
};

export type AssetConnection = Connection & {
  __typename?: 'AssetConnection';
  edges: Array<AssetEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type AssetEdge = Edge & {
  __typename?: 'AssetEdge';
  cursor: Scalars['String']['output'];
  node: Asset;
};

export type AssetFilter = {
  assetType?: InputMaybe<AssetType>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  moderationStatus?: InputMaybe<ContentModerationStatus>;
  search?: InputMaybe<Scalars['String']['input']>;
  userurn?: InputMaybe<Scalars['String']['input']>;
};

export enum AssetType {
  Audio = 'AUDIO',
  Document = 'DOCUMENT',
  Image = 'IMAGE',
  Video = 'VIDEO'
}

export type AuthPayload = {
  __typename?: 'AuthPayload';
  accessToken: Scalars['String']['output'];
  user: User;
};

export type Collection = {
  __typename?: 'Collection';
  collectionurn: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  packages: Array<Package>;
  updatedAt: Scalars['Date']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type CollectionConnection = Connection & {
  __typename?: 'CollectionConnection';
  edges: Array<CollectionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CollectionEdge = Edge & {
  __typename?: 'CollectionEdge';
  cursor: Scalars['String']['output'];
  node: Collection;
};

export type CollectionFilter = {
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type Connection = {
  edges: Array<Edge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum ContentModerationStatus {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Rejected = 'REJECTED'
}

export type CreateAssetInput = {
  assetType: AssetType;
  bucket?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['Int']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
  originalFileName: Scalars['String']['input'];
  region?: InputMaybe<Scalars['String']['input']>;
  storageKey?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  userurn: Scalars['String']['input'];
};

export type CreateCollectionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type CreateHuntInput = {
  agreementText?: InputMaybe<Scalars['String']['input']>;
  allowMultipleDispatchedWaypoints?: InputMaybe<Scalars['Boolean']['input']>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  description?: InputMaybe<RichLanguageItemSchemaInput>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  hashtags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  huntcd?: InputMaybe<Scalars['String']['input']>;
  hunturn?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  isGuided?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<LocationInput>;
  maxPlayers?: InputMaybe<Scalars['Int']['input']>;
  maxRewards?: InputMaybe<Scalars['Int']['input']>;
  mediaAssets?: InputMaybe<MediaAssetInput>;
  name: Scalars['String']['input'];
  ordinal?: InputMaybe<Scalars['Int']['input']>;
  perPlayerHuntDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  redemptionWindowDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  requireStrictLocationCheckin?: InputMaybe<Scalars['Boolean']['input']>;
  responseText?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<HuntType>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  validLocationRadius?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateHuntWaypointInput = {
  availableDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  availablePoints?: InputMaybe<Scalars['Int']['input']>;
  beaconuuid?: InputMaybe<Scalars['String']['input']>;
  checkinImageurl?: InputMaybe<Scalars['String']['input']>;
  checkinurl?: InputMaybe<Scalars['String']['input']>;
  clues?: InputMaybe<Array<InputMaybe<HuntWaypointClueItemInput>>>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  description?: InputMaybe<RichLanguageItemSchemaInput>;
  hunturn?: InputMaybe<Scalars['String']['input']>;
  huntwaypointurn?: InputMaybe<Scalars['String']['input']>;
  isOptional?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<LocationInput>;
  maxDispatchedConcurrently?: InputMaybe<Scalars['Int']['input']>;
  mediaAssets?: InputMaybe<MediaAssetInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  ordinal?: InputMaybe<Scalars['Int']['input']>;
  question?: InputMaybe<Scalars['String']['input']>;
  redemption?: InputMaybe<HuntWaypointRedemptionInput>;
  reward?: InputMaybe<HuntWaypointRewardInput>;
  type?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  validLocationRadius?: InputMaybe<Scalars['Int']['input']>;
  visibility?: InputMaybe<HuntWaypointVisibility>;
  waypointShortcd?: InputMaybe<Scalars['String']['input']>;
};

export type CreateOperationRequestInput = {
  payload?: InputMaybe<Scalars['JSON']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePackageInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  status?: InputMaybe<PackageStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateUserInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  supabaseUserId?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CreateUserUploadInput = {
  assetType: AssetType;
  bucket: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  fileSize: Scalars['Int']['input'];
  filename: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  mimeType: Scalars['String']['input'];
  originalFileName: Scalars['String']['input'];
  packageId?: InputMaybe<Scalars['String']['input']>;
  storageKey: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type Edge = {
  cursor: Scalars['String']['output'];
};

export type Error = {
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type FieldError = {
  __typename?: 'FieldError';
  field: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type Hunt = {
  __typename?: 'Hunt';
  agreementText?: Maybe<Scalars['String']['output']>;
  allowMultipleDispatchedWaypoints?: Maybe<Scalars['Boolean']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  currentPlayerCount?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<RichLanguageItemSchema>;
  endDate?: Maybe<Scalars['DateTime']['output']>;
  hashtags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  huntcd?: Maybe<Scalars['String']['output']>;
  hunturn?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  isGuided?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Location>;
  maxPlayers?: Maybe<Scalars['Int']['output']>;
  maxRewards?: Maybe<Scalars['Int']['output']>;
  mediaAssets?: Maybe<MediaAsset>;
  name?: Maybe<Scalars['String']['output']>;
  ordinal?: Maybe<Scalars['Int']['output']>;
  perPlayerHuntDurationInSeconds?: Maybe<Scalars['Int']['output']>;
  redemptionWindowDurationInSeconds?: Maybe<Scalars['Int']['output']>;
  requireStrictLocationCheckin?: Maybe<Scalars['Boolean']['output']>;
  responseText?: Maybe<Scalars['String']['output']>;
  startDate?: Maybe<Scalars['DateTime']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<HuntType>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  validLocationRadius?: Maybe<Scalars['Int']['output']>;
  waypoints?: Maybe<Array<Maybe<HuntWaypoint>>>;
};

export enum HuntType {
  Challenge = 'CHALLENGE',
  Default = 'DEFAULT',
  Photo = 'PHOTO',
  Quiz = 'QUIZ',
  Scavenger = 'SCAVENGER',
  Treasure = 'TREASURE'
}

export type HuntWaypoint = {
  __typename?: 'HuntWaypoint';
  availablePoints?: Maybe<Scalars['Int']['output']>;
  beaconuuid?: Maybe<Scalars['String']['output']>;
  checkinImageurl?: Maybe<Scalars['String']['output']>;
  checkinurl?: Maybe<Scalars['String']['output']>;
  clues?: Maybe<Array<Maybe<HuntWaypointClueItem>>>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<RichLanguageItemSchema>;
  hunturn?: Maybe<Scalars['String']['output']>;
  huntwaypointurn?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isOptional?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Location>;
  maxDispatchedConcurrently?: Maybe<Scalars['Int']['output']>;
  mediaAssets?: Maybe<MediaAsset>;
  name?: Maybe<Scalars['String']['output']>;
  ordinal?: Maybe<Scalars['Int']['output']>;
  question?: Maybe<Scalars['String']['output']>;
  redemption?: Maybe<HuntWaypointRedemption>;
  reward?: Maybe<HuntWaypointReward>;
  type?: Maybe<HuntWaypointType>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  validLocationRadius?: Maybe<Scalars['Int']['output']>;
  visibility?: Maybe<HuntWaypointVisibility>;
  waypointShortcd?: Maybe<Scalars['String']['output']>;
};

export type HuntWaypointClueItem = {
  __typename?: 'HuntWaypointClueItem';
  clue?: Maybe<RichLanguageItemSchema>;
  isDefault?: Maybe<Scalars['Boolean']['output']>;
  ordinal?: Maybe<Scalars['Int']['output']>;
};

export type HuntWaypointClueItemInput = {
  clue?: InputMaybe<RichLanguageItemSchemaInput>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  ordinal?: InputMaybe<Scalars['Int']['input']>;
};

export type HuntWaypointRedemption = {
  __typename?: 'HuntWaypointRedemption';
  mediaAssets?: Maybe<MediaAsset>;
  redeemcd?: Maybe<Scalars['String']['output']>;
};

export type HuntWaypointRedemptionInput = {
  mediaAssets?: InputMaybe<MediaAssetInput>;
  redeemcd?: InputMaybe<Scalars['String']['input']>;
};

export type HuntWaypointReward = {
  __typename?: 'HuntWaypointReward';
  availableDurationInSeconds?: Maybe<Scalars['Int']['output']>;
  availablePoints?: Maybe<Scalars['Int']['output']>;
  isActive?: Maybe<Scalars['Boolean']['output']>;
  redemptionMessage?: Maybe<RichLanguageItemSchema>;
};

export type HuntWaypointRewardInput = {
  availableDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  availablePoints?: InputMaybe<Scalars['Int']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  redemptionMessage?: InputMaybe<RichLanguageItemSchemaInput>;
};

export enum HuntWaypointType {
  Beacon = 'BEACON',
  Default = 'DEFAULT',
  Image = 'IMAGE',
  Location = 'LOCATION',
  Nfc = 'NFC',
  Qr = 'QR',
  Question = 'QUESTION',
  Scan = 'SCAN'
}

export enum HuntWaypointVisibility {
  Hidden = 'HIDDEN',
  Private = 'PRIVATE',
  Public = 'PUBLIC'
}

export type Location = {
  __typename?: 'Location';
  coordinates?: Maybe<Array<Maybe<Scalars['Float']['output']>>>;
  type?: Maybe<Scalars['String']['output']>;
};

export type LocationInput = {
  coordinates?: InputMaybe<Array<InputMaybe<Scalars['Float']['input']>>>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type MediaAsset = {
  __typename?: 'MediaAsset';
  default?: Maybe<RelatedMediaItem>;
  media?: Maybe<Array<Maybe<RelatedMedia>>>;
  thumbnail?: Maybe<RelatedMediaItem>;
};

export type MediaAssetInput = {
  default?: InputMaybe<RelatedMediaItemInput>;
  media?: InputMaybe<Array<InputMaybe<RelatedMediaInput>>>;
  thumbnail?: InputMaybe<RelatedMediaItemInput>;
};

export type Metadata = {
  __typename?: 'Metadata';
  key?: Maybe<Scalars['String']['output']>;
  namespace?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type MetadataInput = {
  key?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addPackageToCollection: Collection;
  approveUpload: UserUpload;
  bulkUpdateUploadStatus: Array<UserUpload>;
  createAsset: Asset;
  createCollection: Collection;
  createHunt: Hunt;
  createHuntWaypoint: HuntWaypoint;
  createOperationRequest?: Maybe<Operation>;
  createPackage: Package;
  createUser: User;
  createUserUpload: UserUpload;
  deleteCollection: Scalars['Boolean']['output'];
  deletePackage: Scalars['Boolean']['output'];
  deleteUserUpload: Scalars['Boolean']['output'];
  rejectUpload: UserUpload;
  removeAsset: Scalars['Boolean']['output'];
  removeHunt?: Maybe<Hunt>;
  removeHuntWaypoint?: Maybe<HuntWaypoint>;
  removePackageFromCollection: Collection;
  removeUser: Scalars['Boolean']['output'];
  unverifyUser: User;
  updateAiAnalysis: UserUpload;
  updateAsset: Asset;
  updateCollection: Collection;
  updateHunt: Hunt;
  updateHuntWaypoint: HuntWaypoint;
  updatePackage: Package;
  updateUploadStatus: UserUpload;
  updateUser: User;
  updateUserUpload: UserUpload;
  verifyUser: User;
};


export type MutationAddPackageToCollectionArgs = {
  collectionId: Scalars['ID']['input'];
  packageId: Scalars['ID']['input'];
};


export type MutationApproveUploadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationBulkUpdateUploadStatusArgs = {
  ids: Array<Scalars['ID']['input']>;
  status: UploadStatus;
};


export type MutationCreateAssetArgs = {
  createAssetInput: CreateAssetInput;
};


export type MutationCreateCollectionArgs = {
  input: CreateCollectionInput;
};


export type MutationCreateHuntArgs = {
  createHuntInput: CreateHuntInput;
};


export type MutationCreateHuntWaypointArgs = {
  createHuntWaypointInput: CreateHuntWaypointInput;
};


export type MutationCreateOperationRequestArgs = {
  createOperationRequestInput?: InputMaybe<CreateOperationRequestInput>;
};


export type MutationCreatePackageArgs = {
  input: CreatePackageInput;
};


export type MutationCreateUserArgs = {
  createUserInput: CreateUserInput;
};


export type MutationCreateUserUploadArgs = {
  input: CreateUserUploadInput;
};


export type MutationDeleteCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePackageArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserUploadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRejectUploadArgs = {
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRemoveAssetArgs = {
  id: Scalars['ID']['input'];
  userId: Scalars['String']['input'];
};


export type MutationRemoveHuntArgs = {
  hunturn: Scalars['String']['input'];
};


export type MutationRemoveHuntWaypointArgs = {
  huntwaypointurn: Scalars['String']['input'];
};


export type MutationRemovePackageFromCollectionArgs = {
  collectionId: Scalars['ID']['input'];
  packageId: Scalars['ID']['input'];
};


export type MutationRemoveUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnverifyUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateAiAnalysisArgs = {
  aiAnalysis: Scalars['JSON']['input'];
  id: Scalars['ID']['input'];
};


export type MutationUpdateAssetArgs = {
  updateAssetInput: UpdateAssetInput;
};


export type MutationUpdateCollectionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCollectionInput;
};


export type MutationUpdateHuntArgs = {
  updateHuntInput: UpdateHuntInput;
};


export type MutationUpdateHuntWaypointArgs = {
  updateHuntWaypointInput: UpdateHuntWaypointInput;
};


export type MutationUpdatePackageArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePackageInput;
};


export type MutationUpdateUploadStatusArgs = {
  id: Scalars['ID']['input'];
  status: UploadStatus;
};


export type MutationUpdateUserArgs = {
  updateUserInput: UpdateUserInput;
};


export type MutationUpdateUserUploadArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserUploadInput;
};


export type MutationVerifyUserArgs = {
  id: Scalars['ID']['input'];
};

export type Operation = {
  __typename?: 'Operation';
  message?: Maybe<Scalars['JSON']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['Boolean']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export enum OptionTypeEnum {
  Button = 'BUTTON',
  Image = 'IMAGE',
  Text = 'TEXT'
}

export type Package = {
  __typename?: 'Package';
  collections: Array<Collection>;
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
  packageurn: Scalars['String']['output'];
  status: PackageStatus;
  tags: Array<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  uploads: Array<UserUpload>;
  user: User;
  userId: Scalars['String']['output'];
};

export type PackageConnection = Connection & {
  __typename?: 'PackageConnection';
  edges: Array<PackageEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type PackageEdge = Edge & {
  __typename?: 'PackageEdge';
  cursor: Scalars['String']['output'];
  node: Package;
};

export type PackageFilter = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<PackageStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum PackageStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Review = 'REVIEW',
  Upload = 'UPLOAD'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginationInput = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type Query = {
  __typename?: 'Query';
  allHuntWaypoints?: Maybe<Array<Maybe<HuntWaypoint>>>;
  approvedUploads: UserUploadConnection;
  asset?: Maybe<Asset>;
  assetByUrn?: Maybe<Asset>;
  assets: AssetConnection;
  assetsByTags: Array<Asset>;
  assetsByUser: Array<Asset>;
  collection?: Maybe<Collection>;
  collections: CollectionConnection;
  generateUploadUrl: UploadUrlResponse;
  getDownloadUrl: Scalars['String']['output'];
  getServerTime?: Maybe<Operation>;
  health: Scalars['String']['output'];
  hunt?: Maybe<Hunt>;
  huntWaypoint?: Maybe<HuntWaypoint>;
  huntWaypoints?: Maybe<Array<Maybe<HuntWaypoint>>>;
  hunts?: Maybe<Array<Maybe<Hunt>>>;
  myCollections: CollectionConnection;
  myPackages: PackageConnection;
  myUploads: UserUploadConnection;
  operation?: Maybe<Array<Maybe<Operation>>>;
  package?: Maybe<Package>;
  packages: PackageConnection;
  pendingUploads: UserUploadConnection;
  tag?: Maybe<Tag>;
  tags: Array<Tag>;
  user?: Maybe<User>;
  userByEmail?: Maybe<User>;
  userByUserurn?: Maybe<User>;
  userUpload?: Maybe<UserUpload>;
  userUploads: UserUploadConnection;
  users: UserConnection;
};


export type QueryApprovedUploadsArgs = {
  packageId?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryAssetArgs = {
  id: Scalars['ID']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAssetByUrnArgs = {
  asseturn: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAssetsArgs = {
  filter?: InputMaybe<AssetFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAssetsByTagsArgs = {
  tags: Array<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAssetsByUserArgs = {
  userId: Scalars['String']['input'];
};


export type QueryCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCollectionsArgs = {
  filter?: InputMaybe<CollectionFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryGenerateUploadUrlArgs = {
  fileSize: Scalars['Int']['input'];
  filename: Scalars['String']['input'];
  mimeType: Scalars['String']['input'];
};


export type QueryGetDownloadUrlArgs = {
  s3Key: Scalars['String']['input'];
};


export type QueryHuntArgs = {
  hunturn: Scalars['String']['input'];
};


export type QueryHuntWaypointArgs = {
  hunturn: Scalars['String']['input'];
  huntwaypointurn: Scalars['String']['input'];
};


export type QueryHuntWaypointsArgs = {
  hunturn: Scalars['String']['input'];
};


export type QueryMyCollectionsArgs = {
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryMyPackagesArgs = {
  filter?: InputMaybe<PackageFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryMyUploadsArgs = {
  filter?: InputMaybe<UserUploadFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryPackageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPackagesArgs = {
  filter?: InputMaybe<PackageFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryPendingUploadsArgs = {
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryTagArgs = {
  name: Scalars['String']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserByEmailArgs = {
  email: Scalars['String']['input'];
};


export type QueryUserByUserurnArgs = {
  userurn: Scalars['String']['input'];
};


export type QueryUserUploadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserUploadsArgs = {
  filter?: InputMaybe<UserUploadFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryUsersArgs = {
  filter?: InputMaybe<UserFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};

export type RelatedMedia = {
  __typename?: 'RelatedMedia';
  description?: Maybe<Scalars['String']['output']>;
  media?: Maybe<RelatedMediaItem>;
  name?: Maybe<Scalars['String']['output']>;
  platform?: Maybe<Scalars['String']['output']>;
};

export type RelatedMediaInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  media?: InputMaybe<RelatedMediaItemInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
};

export type RelatedMediaItem = {
  __typename?: 'RelatedMediaItem';
  aspectRatio?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

export type RelatedMediaItemInput = {
  aspectRatio?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type RichLanguageItemSchema = {
  __typename?: 'RichLanguageItemSchema';
  default?: Maybe<Scalars['String']['output']>;
  translations?: Maybe<Array<Maybe<RichLanguageItemSchemaTranslation>>>;
};

export type RichLanguageItemSchemaInput = {
  default: Scalars['String']['input'];
  translations?: InputMaybe<Array<RichLanguageItemSchemaTranslationInput>>;
};

export type RichLanguageItemSchemaTranslation = {
  __typename?: 'RichLanguageItemSchemaTranslation';
  language?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type RichLanguageItemSchemaTranslationInput = {
  language: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type SortInput = {
  direction?: InputMaybe<SortDirection>;
  field: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  curationCompleted: UserUpload;
  newUploadInCollection: UserUpload;
  packageStatusChanged: Package;
  uploadStatusChanged: UserUpload;
};


export type SubscriptionCurationCompletedArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionNewUploadInCollectionArgs = {
  collectionId: Scalars['ID']['input'];
};


export type SubscriptionPackageStatusChangedArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionUploadStatusChangedArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Tag = {
  __typename?: 'Tag';
  color?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  tagurn: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
  usageCount: Scalars['Int']['output'];
};

export type TagConnection = Connection & {
  __typename?: 'TagConnection';
  edges: Array<TagEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TagEdge = Edge & {
  __typename?: 'TagEdge';
  cursor: Scalars['String']['output'];
  node: Tag;
};

export type UpdateAssetInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  userurn: Scalars['String']['input'];
};

export type UpdateCollectionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateHuntInput = {
  hunturn: Scalars['String']['input'];
};

export type UpdateHuntWaypointInput = {
  hunturn?: InputMaybe<Scalars['String']['input']>;
  huntwaypointurn?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<LocationInput>;
  validLocationRadius?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdatePackageInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PackageStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateUserInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  lastName?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserUploadInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  packageId?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum UploadStatus {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Rejected = 'REJECTED'
}

export type UploadUrlResponse = {
  __typename?: 'UploadUrlResponse';
  downloadUrl: Scalars['String']['output'];
  s3Key: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Date']['output'];
  dateOfBirth?: Maybe<Scalars['Date']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastLoginAt?: Maybe<Scalars['Date']['output']>;
  lastName: Scalars['String']['output'];
  location?: Maybe<Scalars['String']['output']>;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  supabaseUserId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  userurn: Scalars['String']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

export type UserConnection = Connection & {
  __typename?: 'UserConnection';
  edges: Array<UserEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UserEdge = Edge & {
  __typename?: 'UserEdge';
  cursor: Scalars['String']['output'];
  node: User;
};

export type UserFilter = {
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type UserUpload = {
  __typename?: 'UserUpload';
  aiAnalysis?: Maybe<Scalars['JSON']['output']>;
  assetType: AssetType;
  bucket: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  downloadUrl?: Maybe<Scalars['String']['output']>;
  fileSize: Scalars['Int']['output'];
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  mimeType: Scalars['String']['output'];
  originalFileName: Scalars['String']['output'];
  package?: Maybe<Package>;
  packageId?: Maybe<Scalars['String']['output']>;
  status: UploadStatus;
  storageKey: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  uploadurn: Scalars['String']['output'];
  user: User;
  userurn: Scalars['String']['output'];
};

export type UserUploadConnection = Connection & {
  __typename?: 'UserUploadConnection';
  edges: Array<UserUploadEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UserUploadEdge = Edge & {
  __typename?: 'UserUploadEdge';
  cursor: Scalars['String']['output'];
  node: UserUpload;
};

export type UserUploadFilter = {
  assetType?: InputMaybe<AssetType>;
  packageId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UploadStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

export type Asset = {
  __typename?: 'Asset';
  assetType: AssetType;
  asseturn: Scalars['String']['output'];
  bucket?: Maybe<Scalars['String']['output']>;
  cdnRootUrl?: Maybe<Scalars['String']['output']>;
  cdnUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fileSize?: Maybe<Scalars['Int']['output']>;
  fileUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isApproved: Scalars['Boolean']['output'];
  isModerated: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  isUploaded: Scalars['Boolean']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  mimeType?: Maybe<Scalars['String']['output']>;
  moderationFailureReason?: Maybe<Scalars['String']['output']>;
  moderationResults?: Maybe<Scalars['JSON']['output']>;
  moderationStatus: ContentModerationStatus;
  originalFileName: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
  storageKey?: Maybe<Scalars['String']['output']>;
  tags: Array<Tag>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  uploadedAt?: Maybe<Scalars['Date']['output']>;
  user: User;
  userurn?: Maybe<Scalars['String']['output']>;
};

export type AssetConnection = Connection & {
  __typename?: 'AssetConnection';
  edges: Array<AssetEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type AssetEdge = Edge & {
  __typename?: 'AssetEdge';
  cursor: Scalars['String']['output'];
  node: Asset;
};

export type AssetFilter = {
  assetType?: InputMaybe<AssetType>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  moderationStatus?: InputMaybe<ContentModerationStatus>;
  search?: InputMaybe<Scalars['String']['input']>;
  userurn?: InputMaybe<Scalars['String']['input']>;
};

export enum AssetType {
  Audio = 'AUDIO',
  Document = 'DOCUMENT',
  Image = 'IMAGE',
  Video = 'VIDEO'
}

export type AuthPayload = {
  __typename?: 'AuthPayload';
  accessToken: Scalars['String']['output'];
  user: User;
};

export type Collection = {
  __typename?: 'Collection';
  collectionurn: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  packages: Array<Package>;
  updatedAt: Scalars['Date']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type CollectionConnection = Connection & {
  __typename?: 'CollectionConnection';
  edges: Array<CollectionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CollectionEdge = Edge & {
  __typename?: 'CollectionEdge';
  cursor: Scalars['String']['output'];
  node: Collection;
};

export type CollectionFilter = {
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type Connection = {
  edges: Array<Edge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum ContentModerationStatus {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Rejected = 'REJECTED'
}

export type CreateAssetInput = {
  assetType: AssetType;
  bucket?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['Int']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
  originalFileName: Scalars['String']['input'];
  region?: InputMaybe<Scalars['String']['input']>;
  storageKey?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  userurn: Scalars['String']['input'];
};

export type CreateCollectionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type CreateHuntInput = {
  agreementText?: InputMaybe<Scalars['String']['input']>;
  allowMultipleDispatchedWaypoints?: InputMaybe<Scalars['Boolean']['input']>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  description?: InputMaybe<RichLanguageItemSchemaInput>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  hashtags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  huntcd?: InputMaybe<Scalars['String']['input']>;
  hunturn?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  isGuided?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<LocationInput>;
  maxPlayers?: InputMaybe<Scalars['Int']['input']>;
  maxRewards?: InputMaybe<Scalars['Int']['input']>;
  mediaAssets?: InputMaybe<MediaAssetInput>;
  name: Scalars['String']['input'];
  ordinal?: InputMaybe<Scalars['Int']['input']>;
  perPlayerHuntDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  redemptionWindowDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  requireStrictLocationCheckin?: InputMaybe<Scalars['Boolean']['input']>;
  responseText?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<HuntType>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  validLocationRadius?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateHuntWaypointInput = {
  availableDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  availablePoints?: InputMaybe<Scalars['Int']['input']>;
  beaconuuid?: InputMaybe<Scalars['String']['input']>;
  checkinImageurl?: InputMaybe<Scalars['String']['input']>;
  checkinurl?: InputMaybe<Scalars['String']['input']>;
  clues?: InputMaybe<Array<InputMaybe<HuntWaypointClueItemInput>>>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  description?: InputMaybe<RichLanguageItemSchemaInput>;
  hunturn?: InputMaybe<Scalars['String']['input']>;
  huntwaypointurn?: InputMaybe<Scalars['String']['input']>;
  isOptional?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<LocationInput>;
  maxDispatchedConcurrently?: InputMaybe<Scalars['Int']['input']>;
  mediaAssets?: InputMaybe<MediaAssetInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  ordinal?: InputMaybe<Scalars['Int']['input']>;
  question?: InputMaybe<Scalars['String']['input']>;
  redemption?: InputMaybe<HuntWaypointRedemptionInput>;
  reward?: InputMaybe<HuntWaypointRewardInput>;
  type?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  validLocationRadius?: InputMaybe<Scalars['Int']['input']>;
  visibility?: InputMaybe<HuntWaypointVisibility>;
  waypointShortcd?: InputMaybe<Scalars['String']['input']>;
};

export type CreateOperationRequestInput = {
  payload?: InputMaybe<Scalars['JSON']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePackageInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  status?: InputMaybe<PackageStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateUserInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  supabaseUserId?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CreateUserUploadInput = {
  assetType: AssetType;
  bucket: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  fileSize: Scalars['Int']['input'];
  filename: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  mimeType: Scalars['String']['input'];
  originalFileName: Scalars['String']['input'];
  packageId?: InputMaybe<Scalars['String']['input']>;
  storageKey: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type Edge = {
  cursor: Scalars['String']['output'];
};

export type Error = {
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type FieldError = {
  __typename?: 'FieldError';
  field: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type Hunt = {
  __typename?: 'Hunt';
  agreementText?: Maybe<Scalars['String']['output']>;
  allowMultipleDispatchedWaypoints?: Maybe<Scalars['Boolean']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  currentPlayerCount?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<RichLanguageItemSchema>;
  endDate?: Maybe<Scalars['DateTime']['output']>;
  hashtags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  huntcd?: Maybe<Scalars['String']['output']>;
  hunturn?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  isGuided?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Location>;
  maxPlayers?: Maybe<Scalars['Int']['output']>;
  maxRewards?: Maybe<Scalars['Int']['output']>;
  mediaAssets?: Maybe<MediaAsset>;
  name?: Maybe<Scalars['String']['output']>;
  ordinal?: Maybe<Scalars['Int']['output']>;
  perPlayerHuntDurationInSeconds?: Maybe<Scalars['Int']['output']>;
  redemptionWindowDurationInSeconds?: Maybe<Scalars['Int']['output']>;
  requireStrictLocationCheckin?: Maybe<Scalars['Boolean']['output']>;
  responseText?: Maybe<Scalars['String']['output']>;
  startDate?: Maybe<Scalars['DateTime']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<HuntType>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  validLocationRadius?: Maybe<Scalars['Int']['output']>;
  waypoints?: Maybe<Array<Maybe<HuntWaypoint>>>;
};

export enum HuntType {
  Challenge = 'CHALLENGE',
  Default = 'DEFAULT',
  Photo = 'PHOTO',
  Quiz = 'QUIZ',
  Scavenger = 'SCAVENGER',
  Treasure = 'TREASURE'
}

export type HuntWaypoint = {
  __typename?: 'HuntWaypoint';
  availablePoints?: Maybe<Scalars['Int']['output']>;
  beaconuuid?: Maybe<Scalars['String']['output']>;
  checkinImageurl?: Maybe<Scalars['String']['output']>;
  checkinurl?: Maybe<Scalars['String']['output']>;
  clues?: Maybe<Array<Maybe<HuntWaypointClueItem>>>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<RichLanguageItemSchema>;
  hunturn?: Maybe<Scalars['String']['output']>;
  huntwaypointurn?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isOptional?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Location>;
  maxDispatchedConcurrently?: Maybe<Scalars['Int']['output']>;
  mediaAssets?: Maybe<MediaAsset>;
  name?: Maybe<Scalars['String']['output']>;
  ordinal?: Maybe<Scalars['Int']['output']>;
  question?: Maybe<Scalars['String']['output']>;
  redemption?: Maybe<HuntWaypointRedemption>;
  reward?: Maybe<HuntWaypointReward>;
  type?: Maybe<HuntWaypointType>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  validLocationRadius?: Maybe<Scalars['Int']['output']>;
  visibility?: Maybe<HuntWaypointVisibility>;
  waypointShortcd?: Maybe<Scalars['String']['output']>;
};

export type HuntWaypointClueItem = {
  __typename?: 'HuntWaypointClueItem';
  clue?: Maybe<RichLanguageItemSchema>;
  isDefault?: Maybe<Scalars['Boolean']['output']>;
  ordinal?: Maybe<Scalars['Int']['output']>;
};

export type HuntWaypointClueItemInput = {
  clue?: InputMaybe<RichLanguageItemSchemaInput>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  ordinal?: InputMaybe<Scalars['Int']['input']>;
};

export type HuntWaypointRedemption = {
  __typename?: 'HuntWaypointRedemption';
  mediaAssets?: Maybe<MediaAsset>;
  redeemcd?: Maybe<Scalars['String']['output']>;
};

export type HuntWaypointRedemptionInput = {
  mediaAssets?: InputMaybe<MediaAssetInput>;
  redeemcd?: InputMaybe<Scalars['String']['input']>;
};

export type HuntWaypointReward = {
  __typename?: 'HuntWaypointReward';
  availableDurationInSeconds?: Maybe<Scalars['Int']['output']>;
  availablePoints?: Maybe<Scalars['Int']['output']>;
  isActive?: Maybe<Scalars['Boolean']['output']>;
  redemptionMessage?: Maybe<RichLanguageItemSchema>;
};

export type HuntWaypointRewardInput = {
  availableDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  availablePoints?: InputMaybe<Scalars['Int']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  redemptionMessage?: InputMaybe<RichLanguageItemSchemaInput>;
};

export enum HuntWaypointType {
  Beacon = 'BEACON',
  Default = 'DEFAULT',
  Image = 'IMAGE',
  Location = 'LOCATION',
  Nfc = 'NFC',
  Qr = 'QR',
  Question = 'QUESTION',
  Scan = 'SCAN'
}

export enum HuntWaypointVisibility {
  Hidden = 'HIDDEN',
  Private = 'PRIVATE',
  Public = 'PUBLIC'
}

export type Location = {
  __typename?: 'Location';
  coordinates?: Maybe<Array<Maybe<Scalars['Float']['output']>>>;
  type?: Maybe<Scalars['String']['output']>;
};

export type LocationInput = {
  coordinates?: InputMaybe<Array<InputMaybe<Scalars['Float']['input']>>>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type MediaAsset = {
  __typename?: 'MediaAsset';
  default?: Maybe<RelatedMediaItem>;
  media?: Maybe<Array<Maybe<RelatedMedia>>>;
  thumbnail?: Maybe<RelatedMediaItem>;
};

export type MediaAssetInput = {
  default?: InputMaybe<RelatedMediaItemInput>;
  media?: InputMaybe<Array<InputMaybe<RelatedMediaInput>>>;
  thumbnail?: InputMaybe<RelatedMediaItemInput>;
};

export type Metadata = {
  __typename?: 'Metadata';
  key?: Maybe<Scalars['String']['output']>;
  namespace?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type MetadataInput = {
  key?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addPackageToCollection: Collection;
  approveUpload: UserUpload;
  bulkUpdateUploadStatus: Array<UserUpload>;
  createAsset: Asset;
  createCollection: Collection;
  createHunt: Hunt;
  createHuntWaypoint: HuntWaypoint;
  createOperationRequest?: Maybe<Operation>;
  createPackage: Package;
  createUser: User;
  createUserUpload: UserUpload;
  deleteCollection: Scalars['Boolean']['output'];
  deletePackage: Scalars['Boolean']['output'];
  deleteUserUpload: Scalars['Boolean']['output'];
  rejectUpload: UserUpload;
  removeAsset: Scalars['Boolean']['output'];
  removeHunt?: Maybe<Hunt>;
  removeHuntWaypoint?: Maybe<HuntWaypoint>;
  removePackageFromCollection: Collection;
  removeUser: Scalars['Boolean']['output'];
  unverifyUser: User;
  updateAiAnalysis: UserUpload;
  updateAsset: Asset;
  updateCollection: Collection;
  updateHunt: Hunt;
  updateHuntWaypoint: HuntWaypoint;
  updatePackage: Package;
  updateUploadStatus: UserUpload;
  updateUser: User;
  updateUserUpload: UserUpload;
  verifyUser: User;
};


export type MutationAddPackageToCollectionArgs = {
  collectionId: Scalars['ID']['input'];
  packageId: Scalars['ID']['input'];
};


export type MutationApproveUploadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationBulkUpdateUploadStatusArgs = {
  ids: Array<Scalars['ID']['input']>;
  status: UploadStatus;
};


export type MutationCreateAssetArgs = {
  createAssetInput: CreateAssetInput;
};


export type MutationCreateCollectionArgs = {
  input: CreateCollectionInput;
};


export type MutationCreateHuntArgs = {
  createHuntInput: CreateHuntInput;
};


export type MutationCreateHuntWaypointArgs = {
  createHuntWaypointInput: CreateHuntWaypointInput;
};


export type MutationCreateOperationRequestArgs = {
  createOperationRequestInput?: InputMaybe<CreateOperationRequestInput>;
};


export type MutationCreatePackageArgs = {
  input: CreatePackageInput;
};


export type MutationCreateUserArgs = {
  createUserInput: CreateUserInput;
};


export type MutationCreateUserUploadArgs = {
  input: CreateUserUploadInput;
};


export type MutationDeleteCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePackageArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserUploadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRejectUploadArgs = {
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRemoveAssetArgs = {
  id: Scalars['ID']['input'];
  userId: Scalars['String']['input'];
};


export type MutationRemoveHuntArgs = {
  hunturn: Scalars['String']['input'];
};


export type MutationRemoveHuntWaypointArgs = {
  huntwaypointurn: Scalars['String']['input'];
};


export type MutationRemovePackageFromCollectionArgs = {
  collectionId: Scalars['ID']['input'];
  packageId: Scalars['ID']['input'];
};


export type MutationRemoveUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnverifyUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateAiAnalysisArgs = {
  aiAnalysis: Scalars['JSON']['input'];
  id: Scalars['ID']['input'];
};


export type MutationUpdateAssetArgs = {
  updateAssetInput: UpdateAssetInput;
};


export type MutationUpdateCollectionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCollectionInput;
};


export type MutationUpdateHuntArgs = {
  updateHuntInput: UpdateHuntInput;
};


export type MutationUpdateHuntWaypointArgs = {
  updateHuntWaypointInput: UpdateHuntWaypointInput;
};


export type MutationUpdatePackageArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePackageInput;
};


export type MutationUpdateUploadStatusArgs = {
  id: Scalars['ID']['input'];
  status: UploadStatus;
};


export type MutationUpdateUserArgs = {
  updateUserInput: UpdateUserInput;
};


export type MutationUpdateUserUploadArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserUploadInput;
};


export type MutationVerifyUserArgs = {
  id: Scalars['ID']['input'];
};

export type Operation = {
  __typename?: 'Operation';
  message?: Maybe<Scalars['JSON']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['Boolean']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export enum OptionTypeEnum {
  Button = 'BUTTON',
  Image = 'IMAGE',
  Text = 'TEXT'
}

export type Package = {
  __typename?: 'Package';
  collections: Array<Collection>;
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
  packageurn: Scalars['String']['output'];
  status: PackageStatus;
  tags: Array<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  uploads: Array<UserUpload>;
  user: User;
  userId: Scalars['String']['output'];
};

export type PackageConnection = Connection & {
  __typename?: 'PackageConnection';
  edges: Array<PackageEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type PackageEdge = Edge & {
  __typename?: 'PackageEdge';
  cursor: Scalars['String']['output'];
  node: Package;
};

export type PackageFilter = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<PackageStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum PackageStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Review = 'REVIEW',
  Upload = 'UPLOAD'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginationInput = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type Query = {
  __typename?: 'Query';
  allHuntWaypoints?: Maybe<Array<Maybe<HuntWaypoint>>>;
  approvedUploads: UserUploadConnection;
  asset?: Maybe<Asset>;
  assetByUrn?: Maybe<Asset>;
  assets: AssetConnection;
  assetsByTags: Array<Asset>;
  assetsByUser: Array<Asset>;
  collection?: Maybe<Collection>;
  collections: CollectionConnection;
  generateUploadUrl: UploadUrlResponse;
  getDownloadUrl: Scalars['String']['output'];
  getServerTime?: Maybe<Operation>;
  health: Scalars['String']['output'];
  hunt?: Maybe<Hunt>;
  huntWaypoint?: Maybe<HuntWaypoint>;
  huntWaypoints?: Maybe<Array<Maybe<HuntWaypoint>>>;
  hunts?: Maybe<Array<Maybe<Hunt>>>;
  myCollections: CollectionConnection;
  myPackages: PackageConnection;
  myUploads: UserUploadConnection;
  operation?: Maybe<Array<Maybe<Operation>>>;
  package?: Maybe<Package>;
  packages: PackageConnection;
  pendingUploads: UserUploadConnection;
  tag?: Maybe<Tag>;
  tags: Array<Tag>;
  user?: Maybe<User>;
  userByEmail?: Maybe<User>;
  userByUserurn?: Maybe<User>;
  userUpload?: Maybe<UserUpload>;
  userUploads: UserUploadConnection;
  users: UserConnection;
};


export type QueryApprovedUploadsArgs = {
  packageId?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryAssetArgs = {
  id: Scalars['ID']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAssetByUrnArgs = {
  asseturn: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAssetsArgs = {
  filter?: InputMaybe<AssetFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAssetsByTagsArgs = {
  tags: Array<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAssetsByUserArgs = {
  userId: Scalars['String']['input'];
};


export type QueryCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCollectionsArgs = {
  filter?: InputMaybe<CollectionFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryGenerateUploadUrlArgs = {
  fileSize: Scalars['Int']['input'];
  filename: Scalars['String']['input'];
  mimeType: Scalars['String']['input'];
};


export type QueryGetDownloadUrlArgs = {
  s3Key: Scalars['String']['input'];
};


export type QueryHuntArgs = {
  hunturn: Scalars['String']['input'];
};


export type QueryHuntWaypointArgs = {
  hunturn: Scalars['String']['input'];
  huntwaypointurn: Scalars['String']['input'];
};


export type QueryHuntWaypointsArgs = {
  hunturn: Scalars['String']['input'];
};


export type QueryMyCollectionsArgs = {
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryMyPackagesArgs = {
  filter?: InputMaybe<PackageFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryMyUploadsArgs = {
  filter?: InputMaybe<UserUploadFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryPackageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPackagesArgs = {
  filter?: InputMaybe<PackageFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryPendingUploadsArgs = {
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryTagArgs = {
  name: Scalars['String']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserByEmailArgs = {
  email: Scalars['String']['input'];
};


export type QueryUserByUserurnArgs = {
  userurn: Scalars['String']['input'];
};


export type QueryUserUploadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserUploadsArgs = {
  filter?: InputMaybe<UserUploadFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};


export type QueryUsersArgs = {
  filter?: InputMaybe<UserFilter>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};

export type RelatedMedia = {
  __typename?: 'RelatedMedia';
  description?: Maybe<Scalars['String']['output']>;
  media?: Maybe<RelatedMediaItem>;
  name?: Maybe<Scalars['String']['output']>;
  platform?: Maybe<Scalars['String']['output']>;
};

export type RelatedMediaInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  media?: InputMaybe<RelatedMediaItemInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
};

export type RelatedMediaItem = {
  __typename?: 'RelatedMediaItem';
  aspectRatio?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

export type RelatedMediaItemInput = {
  aspectRatio?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type RichLanguageItemSchema = {
  __typename?: 'RichLanguageItemSchema';
  default?: Maybe<Scalars['String']['output']>;
  translations?: Maybe<Array<Maybe<RichLanguageItemSchemaTranslation>>>;
};

export type RichLanguageItemSchemaInput = {
  default: Scalars['String']['input'];
  translations?: InputMaybe<Array<RichLanguageItemSchemaTranslationInput>>;
};

export type RichLanguageItemSchemaTranslation = {
  __typename?: 'RichLanguageItemSchemaTranslation';
  language?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type RichLanguageItemSchemaTranslationInput = {
  language: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type SortInput = {
  direction?: InputMaybe<SortDirection>;
  field: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  curationCompleted: UserUpload;
  newUploadInCollection: UserUpload;
  packageStatusChanged: Package;
  uploadStatusChanged: UserUpload;
};


export type SubscriptionCurationCompletedArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionNewUploadInCollectionArgs = {
  collectionId: Scalars['ID']['input'];
};


export type SubscriptionPackageStatusChangedArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionUploadStatusChangedArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Tag = {
  __typename?: 'Tag';
  color?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  tagurn: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
  usageCount: Scalars['Int']['output'];
};

export type TagConnection = Connection & {
  __typename?: 'TagConnection';
  edges: Array<TagEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TagEdge = Edge & {
  __typename?: 'TagEdge';
  cursor: Scalars['String']['output'];
  node: Tag;
};

export type UpdateAssetInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  userurn: Scalars['String']['input'];
};

export type UpdateCollectionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateHuntInput = {
  hunturn: Scalars['String']['input'];
};

export type UpdateHuntWaypointInput = {
  hunturn?: InputMaybe<Scalars['String']['input']>;
  huntwaypointurn?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<LocationInput>;
  validLocationRadius?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdatePackageInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PackageStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateUserInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  lastName?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserUploadInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  packageId?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum UploadStatus {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Rejected = 'REJECTED'
}

export type UploadUrlResponse = {
  __typename?: 'UploadUrlResponse';
  downloadUrl: Scalars['String']['output'];
  s3Key: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Date']['output'];
  dateOfBirth?: Maybe<Scalars['Date']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastLoginAt?: Maybe<Scalars['Date']['output']>;
  lastName: Scalars['String']['output'];
  location?: Maybe<Scalars['String']['output']>;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  supabaseUserId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  userurn: Scalars['String']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

export type UserConnection = Connection & {
  __typename?: 'UserConnection';
  edges: Array<UserEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UserEdge = Edge & {
  __typename?: 'UserEdge';
  cursor: Scalars['String']['output'];
  node: User;
};

export type UserFilter = {
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type UserUpload = {
  __typename?: 'UserUpload';
  aiAnalysis?: Maybe<Scalars['JSON']['output']>;
  assetType: AssetType;
  bucket: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  downloadUrl?: Maybe<Scalars['String']['output']>;
  fileSize: Scalars['Int']['output'];
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  mimeType: Scalars['String']['output'];
  originalFileName: Scalars['String']['output'];
  package?: Maybe<Package>;
  packageId?: Maybe<Scalars['String']['output']>;
  status: UploadStatus;
  storageKey: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  uploadurn: Scalars['String']['output'];
  user: User;
  userurn: Scalars['String']['output'];
};

export type UserUploadConnection = Connection & {
  __typename?: 'UserUploadConnection';
  edges: Array<UserUploadEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UserUploadEdge = Edge & {
  __typename?: 'UserUploadEdge';
  cursor: Scalars['String']['output'];
  node: UserUpload;
};

export type UserUploadFilter = {
  assetType?: InputMaybe<AssetType>;
  packageId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UploadStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};
