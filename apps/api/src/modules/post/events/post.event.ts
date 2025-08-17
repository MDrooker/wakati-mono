import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InngestService } from 'src/common/inngest/inngest.service';
import { GlobalInngestFunctionsRegistry } from 'src/common/inngest/inngest.functions.registry';
import {
  ComprehendService,
  type TextModerationResult,
} from 'src/common/aws/aws.comprehend.service';
import { PostService } from '../post.service';
import { ContentModerationStatus, Post } from '../entities/post.entity';
import { ServiceLocator } from 'src/common/service-locator/service-locator';
import { log } from 'console';

// Event data interface for post content moderation
interface PostContentModerationEvent {
  data: {
    posturn: string;
    userurn: string;
  };
}

@Injectable()
export class PostEventsService implements OnModuleInit {
  private readonly logger = new Logger(PostEventsService.name);

  constructor(
    private readonly inngestService: InngestService,
    private readonly postService: PostService,
  ) { }

  async onModuleInit() {
    // Register Inngest functions
    this.logger.log(
      'PostEventsService Module initialized - registering functions',
    );
    await this.registerPostContentModerationFunction();
  }

  // Inngest function registrations
  private async registerPostContentModerationFunction() {
    this.logger.log('Registering post content moderation function');
    const inngest = this.inngestService.getInngestClient();
    const registeredFunction = inngest.createFunction(
      { id: 'post.curation/start-content-moderation' },
      { event: 'post.curation/start-content-moderation' },
      async ({ event, step, logger }) => {
        // Create a custom logger wrapper that enhances the Inngest logger with NestJS context
        const customLogger = {
          info: (message: string, extra?: any) => {
            this.logger.log(`[Inngest] ${message}`);
          },
          warn: (message: string, extra?: any) => {
            this.logger.warn(`[Inngest] ${message}`);
          },
          error: (message: string, extra?: any) => {
            this.logger.error(`[Inngest] ${message}`);
          },
          debug: (message: string, extra?: any) => {
            this.logger.debug(`[Inngest] ${message}`);
          },
        };

        const { posturn, userurn } =
          event.data as PostContentModerationEvent['data'];

        customLogger.info(`Processing post: ${posturn} for ${userurn}`);
        if (!posturn) {
          customLogger.error('posturn is required for content moderation');
          throw new Error('posturn is required for content moderation');
        }
        // Step 1: Update post status to processing

        await step.run('update-status-processing', async () => {
          customLogger.info(
            `Starting content moderation for post: ${posturn} `,
          );
          try {
            // Get PostService instance using the service locator
            const postService = ServiceLocator.getService(PostService);

            await postService.updateModerationStatusByPosturn(
              posturn,
              ContentModerationStatus.PROCESSING,
            );

            customLogger.info('Post status updated to processing');
          } catch (error) {
            customLogger.error(
              'Failed to update post status to processing:',
              error,
            );
            throw error;
          }
        });

        // Step 2: Fetch post details
        customLogger.info(`Fetching post details for: ${posturn} `);
        const post: Post = await step.run(
          'fetch-post',
          async (): Promise<Post> => {
            customLogger.info(`Fetching post details for: ${posturn} `);
            try {
              // Get PostService instance using the service locator
              const postService = ServiceLocator.getService(PostService);
              const post: Post = await postService.findByPosturn(posturn);
              customLogger.info(
                `Post details fetched successfully for: ${posturn} `,
              );
              if (!post) {
                customLogger.error(`Post not found: ${posturn} `);
                throw new Error(`Post with posturn ${posturn} not found`);
              }
              return post;
            } catch (error) {
              customLogger.error('Failed to fetch post details:', error);
              throw error;
            }
          },
        );

        // Step 3: Moderate text content using AWS Comprehend
        const moderationResult: TextModerationResult = await step.run(
          'moderate-text-content',
          async (): Promise<TextModerationResult> => {
            customLogger.info(`Moderating text content for post: ${posturn} `, {
              contentLength: post.bodyPlainText.length,
            });
            try {
              // Get ComprehendService instance using the service locator
              const comprehendService =
                ServiceLocator.getService(ComprehendService);
              // Call AWS Comprehend text moderation service

              return await comprehendService.moderateTextContent(
                post.bodyPlainText,
                {
                  includeSentiment: true,
                  includePiiDetection: false,
                  includeToxicContent: true,
                  toxicContentThreshold: 0.7,
                  approvalThreshold: 0.8,
                },
              );
            } catch (error) {
              customLogger.error('Failed to moderate text content:', error);
              // Return rejection result on error
              return {
                isApproved: false,
                confidence: 0,
                detections: ['moderation-service-error'],
                reason: `Content moderation failed: ${error.message} `,
                severity: 'high',
                categories: [],
                sentiment: undefined,
                toxicContent: undefined,
                piiEntities: [],
                analysisTimestamp: new Date().toISOString(),
              };
            }
          },
        );

        // Step 4: Update post with moderation results
        await step.run('update-moderation-results', async () => {
          customLogger.info(
            `Updating moderation results for post: ${posturn} `,
            {
              isApproved: moderationResult.isApproved,
              confidence: moderationResult.confidence,
            },
          );

          const status = moderationResult.isApproved
            ? ContentModerationStatus.APPROVED
            : ContentModerationStatus.REJECTED;

          try {
            // Get PostService instance using the service locator
            const postService = ServiceLocator.getService(PostService);

            await postService.updateModerationStatusByPosturn(
              posturn,
              status,
              moderationResult,
              moderationResult.reason,
            );

            customLogger.info('Post moderation results updated');
          } catch (error) {
            logger.error('Failed to update post moderation results:', error);
            throw error;
          }
        });

        // Step 4: Send notification if content was rejected
        if (!moderationResult.isApproved) {
          await step.run('notify-user-rejection', async () => {
            customLogger.info(
              `Sending rejection notification for post: ${posturn} `,
            );

            try {
              await inngest.send({
                name: 'user/post-rejected',
                data: {
                  userurn,
                  posturn,
                  reason:
                    moderationResult.reason ||
                    'Content policy violation detected',
                  categories: moderationResult.categories || [],
                  severity: moderationResult.severity || 'medium',
                },
              });
            } catch (error) {
              customLogger.warn(
                'Failed to send rejection notification:',
                error,
              );
              // Don't fail the entire process for notification errors
            }
          });
        }

        return {
          posturn,
          status: moderationResult.isApproved ? 'approved' : 'rejected',
          confidence: moderationResult.confidence,
          detections: moderationResult.detections,
          processed: true,
        };
      },
    );

    // Register with both the InngestService instance and global registry
    GlobalInngestFunctionsRegistry.registerFunction(registeredFunction);

    this.logger.log('Post content moderation function registered successfully');
  }
}
