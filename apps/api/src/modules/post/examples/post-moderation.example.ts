import { Injectable } from '@nestjs/common';
import { PostEventsService } from '../events/post.event';
import { PostService } from '../post.service';
import { InngestService } from 'src/common/inngest/inngest.service';
import { ContentModerationStatus } from '../entities/post.entity';

@Injectable()
export class PostModerationExample {
  constructor(
    private readonly postService: PostService,
    private readonly inngestService: InngestService,
  ) {}

  /**
   * Example: Trigger post content moderation manually
   */
  async triggerPostContentModeration(posturn: string) {
    try {
      // Get the post to extract content and user information
      const post = await this.postService.findByPosturn(posturn);

      // Extract text content from different post types
      let content = '';
      if (post.body) {
        content = post.body;
      } else if (post.bodyPlainText) {
        content = post.bodyPlainText;
      } else if (post.title) {
        content = post.title;
      }

      if (!content || content.trim() === '') {
        console.log('No text content found for moderation');
        return;
      }

      // Send the content moderation event
      await this.inngestService.sendEvent('post.curation/start-content-moderation', {
        posturn: post.posturn,
        content: content,
        userurn: post.userurn,
      });

      console.log(`Content moderation triggered for post: ${posturn}`);
      return { success: true, message: 'Content moderation initiated' };
    } catch (error) {
      console.error('Failed to trigger post content moderation:', error);
      throw error;
    }
  }

  /**
   * Example: Batch moderate multiple posts
   */
  async batchModeratePostsByUser(userurn: string) {
    try {
      // Get all pending posts by user
      const posts = await this.postService.findByUserurn(userurn);
      const pendingPosts = posts.filter(
        (post) =>
          post.moderationStatus === ContentModerationStatus.PENDING &&
          (post.body || post.bodyPlainText || post.title),
      );

      console.log(
        `Found ${pendingPosts.length} posts pending moderation for user: ${userurn}`,
      );

      // Trigger moderation for each post
      const results = [];
      for (const post of pendingPosts) {
        try {
          const result = await this.triggerPostContentModeration(post.posturn);
          results.push({ posturn: post.posturn, ...result });
        } catch (error) {
          results.push({
            posturn: post.posturn,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        totalProcessed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      console.error('Failed to batch moderate posts:', error);
      throw error;
    }
  }

  /**
   * Example: Re-moderate a previously rejected post
   */
  async reModeratePost(posturn: string) {
    try {
      // First, reset the moderation status to pending
      await this.postService.updateModerationStatusByPosturn(
        posturn,
        'PENDING' as any,
        null, // Clear previous results
        null, // Clear previous failure reason
      );

      // Then trigger moderation again
      const result = await this.triggerPostContentModeration(posturn);

      console.log(`Re-moderation triggered for post: ${posturn}`);
      return result;
    } catch (error) {
      console.error('Failed to re-moderate post:', error);
      throw error;
    }
  }

  /**
   * Example: Get moderation status and results for a post
   */
  async getModerationStatus(posturn: string) {
    try {
      const post = await this.postService.findByPosturn(posturn);

      return {
        posturn: post.posturn,
        moderationStatus: post.moderationStatus,
        moderationResults: post.moderationResults,
        moderationFailureReason: post.moderationFailureReason,
        moderatedAt: post.moderatedAt,
        canEdit: post.canEdit(),
        isModerated: post.isModerated(),
      };
    } catch (error) {
      console.error('Failed to get moderation status:', error);
      throw error;
    }
  }

  /**
   * Example: Send a custom rejection notification
   */
  async sendCustomRejectionNotification(
    userurn: string,
    posturn: string,
    customReason: string,
  ) {
    try {
      await this.inngestService.sendEvent('user/post-rejected', {
        userurn,
        posturn,
        reason: customReason,
        categories: ['manual-review'],
        severity: 'medium',
      });

      console.log(`Custom rejection notification sent for post: ${posturn}`);
      return { success: true, message: 'Notification sent' };
    } catch (error) {
      console.error('Failed to send rejection notification:', error);
      throw error;
    }
  }

  /**
   * Example: Get statistics on post moderation
   */
  async getModerationStatistics() {
    try {
      // This would require additional methods in PostService
      // For now, this is a placeholder showing what could be implemented

      console.log('Moderation statistics would be calculated here');

      return {
        totalPosts: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        processing: 0,
        avgProcessingTime: 0,
        topRejectionReasons: [],
      };
    } catch (error) {
      console.error('Failed to get moderation statistics:', error);
      throw error;
    }
  }
}
