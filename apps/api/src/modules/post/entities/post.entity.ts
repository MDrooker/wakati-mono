import {
  Entity,
  Column,
  BeforeUpdate,
  BeforeInsert,
  Index,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  Relation,
} from 'typeorm';
import { customAlphabet } from 'nanoid';
import { BaseEntity } from 'src/common/database/entities/base.entity';
import { Asset } from '../../asset/entities/asset.entity';
import { Tag } from '../../asset/entities/tag.entity';

const nanoid = customAlphabet('1234567890abcdef', 5);

export enum PostType {
  TEXT = 'text',
  LINK = 'link',
  IMAGE = 'image',
  VIDEO = 'video',
  POLL = 'poll',
  JSON = 'json', // Editor.js structured content
}

export enum PostStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum ContentModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
}

@Entity('post', { schema: 'rockwell' })
export class Post extends BaseEntity {
  @Column()
  @Index({ unique: true })
  posturn: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string; // Rich text content

  @Column({ type: 'text', nullable: true })
  bodyPlainText: string; // Plain text version for search/moderation

  @Column({ type: 'jsonb', nullable: true })
  bodyJson: any; // Editor.js structured content for JSON post type

  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.TEXT,
  })
  postType: PostType;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  status: PostStatus;

  @Column({
    type: 'enum',
    enum: ContentModerationStatus,
    default: ContentModerationStatus.PENDING,
  })
  moderationStatus: ContentModerationStatus;

  @Column({ type: 'jsonb', nullable: true })
  moderationResults: any; // Store AI moderation results for text content

  @Column({ nullable: true })
  moderationFailureReason: string;

  // Reddit-like fields
  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  shareCount: number;

  @Column({ nullable: true })
  url: string; // For link posts

  @Column({ nullable: true })
  domain: string; // Extracted from URL

  @Column({ default: false })
  isNSFW: boolean;

  @Column({ default: false })
  isSpoiler: boolean;

  @Column({ default: false })
  isLocked: boolean; // Prevent new comments

  @Column({ default: false })
  isStickied: boolean; // Pin to top

  @Column({ default: false })
  isOC: boolean; // Original Content

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: true })
  allowComments: boolean;

  @Column({ nullable: true })
  flair: string; // Post flair/category

  @Column({ nullable: true })
  thumbnailUrl: string; // Thumbnail for link/media posts

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date; // When post was made public

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt: Date; // When moderation was completed

  // Relationships
  @ManyToOne('User', (user: any) => user.posts, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'userurn', referencedColumnName: 'userurn' })
  user: Relation<any>;

  @Column({ nullable: true })
  userurn: string;

  @ManyToOne('Tenant', (tenant: any) => tenant.posts, { nullable: true })
  @JoinColumn({ name: 'tenanturn', referencedColumnName: 'tenanturn' })
  tenant: any;

  // Many-to-many relationship with assets
  @ManyToMany(() => Asset, (asset) => asset.posts, { cascade: true })
  @JoinTable({
    name: 'post_assets',
    joinColumn: { name: 'posturn', referencedColumnName: 'posturn' },
    inverseJoinColumn: { name: 'asseturn', referencedColumnName: 'asseturn' },
  })
  assets: Asset[];

  // Many-to-many relationship with tags
  @ManyToMany(() => Tag, (tag) => tag.posts, { cascade: true })
  @JoinTable({
    name: 'post_tags',
    joinColumn: { name: 'posturn', referencedColumnName: 'posturn' },
    inverseJoinColumn: { name: 'tagurn', referencedColumnName: 'tagurn' },
  })
  tags: Tag[];

  // Self-referencing for replies/comments (if implementing comments as posts)
  @ManyToOne(() => Post, (post) => post.replies, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'parent_posturn', referencedColumnName: 'posturn' })
  parent: Relation<Post>;

  @Column({ nullable: true })
  parent_posturn: string;

  @OneToMany(() => Post, (post) => post.parent)
  replies: Relation<Post[]>;

  // Computed properties
  get score(): number {
    return this.upvotes - this.downvotes;
  }

  get hotScore(): number {
    // Simple hot score algorithm (can be made more sophisticated)
    const ageInHours =
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return Math.log10(Math.max(this.score, 1)) / Math.pow(ageInHours + 2, 1.8);
  }

  static generatePostUrn(): string {
    return `nesting:rockwell.post:${nanoid()}`;
  }

  // Helper methods
  isComment(): boolean {
    return !!this.parent_posturn;
  }

  hasReplies(): boolean {
    return !!(this.replies && this.replies.length > 0);
  }

  isModerated(): boolean {
    return (
      this.moderationStatus === ContentModerationStatus.APPROVED ||
      this.moderationStatus === ContentModerationStatus.REJECTED
    );
  }

  isPublished(): boolean {
    return (
      this.status === PostStatus.APPROVED &&
      this.moderationStatus === ContentModerationStatus.APPROVED &&
      !!this.publishedAt
    );
  }

  canEdit(): boolean {
    return (
      this.status === PostStatus.DRAFT ||
      (this.status === PostStatus.PENDING && !this.isModerated())
    );
  }

  /**
   * Extract plain text from Editor.js JSON structure for search and moderation
   */
  private extractPlainTextFromEditorJS(editorData: any): string {
    if (
      !editorData ||
      !editorData.blocks ||
      !Array.isArray(editorData.blocks)
    ) {
      return '';
    }

    return editorData.blocks
      .map((block: any) => {
        if (!block || !block.data) return '';

        switch (block.type) {
          case 'paragraph':
          case 'header':
            return block.data.text || '';
          case 'list':
            return block.data.items ? block.data.items.join(' ') : '';
          case 'quote':
            return block.data.text || '';
          case 'code':
            return block.data.code || '';
          case 'raw':
            return block.data.html || '';
          case 'table':
            if (block.data.content && Array.isArray(block.data.content)) {
              return block.data.content
                .map((row: string[]) => row.join(' '))
                .join(' ');
            }
            return '';
          case 'checklist':
            return block.data.items
              ? block.data.items.map((item: any) => item.text || '').join(' ')
              : '';
          default:
            // For unknown block types, try to extract text from common properties
            return block.data.text || block.data.caption || '';
        }
      })
      .filter((text: string) => text.trim() !== '')
      .join(' ')
      .trim();
  }

  @BeforeUpdate()
  @BeforeInsert()
  async persistHook(): Promise<void> {
    // Generate URN if not set
    if (
      this.posturn === undefined ||
      this.posturn === null ||
      this.posturn === ''
    ) {
      this.posturn = Post.generatePostUrn();
    }

    // Extract domain from URL for link posts
    if (this.postType === PostType.LINK && this.url) {
      try {
        const urlObj = new URL(this.url);
        this.domain = urlObj.hostname;
      } catch (error) {
        // Invalid URL, leave domain as null
      }
    }

    // Convert rich text body to plain text for search/moderation
    if (this.postType === PostType.JSON && this.bodyJson) {
      // Extract plain text from Editor.js JSON structure
      this.bodyPlainText = this.extractPlainTextFromEditorJS(this.bodyJson);
    } else if (this.body && this.body.trim() !== '') {
      // Simple HTML/markdown strip for plain text (can be enhanced)
      this.bodyPlainText = this.body
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
        .replace(/\*(.*?)\*/g, '$1') // Remove markdown italic
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove markdown links
        .trim();
    }

    // Set moderated timestamp
    if (
      this.moderationStatus !== ContentModerationStatus.PENDING &&
      this.moderationStatus !== ContentModerationStatus.PROCESSING &&
      !this.moderatedAt
    ) {
      this.moderatedAt = new Date();
    }

    // Set published timestamp when post becomes public
    if (
      this.status === PostStatus.APPROVED &&
      this.moderationStatus === ContentModerationStatus.APPROVED &&
      !this.publishedAt
    ) {
      this.publishedAt = new Date();
    }
  }
}
