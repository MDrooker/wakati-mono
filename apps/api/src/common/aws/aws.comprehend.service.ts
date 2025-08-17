import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ComprehendClient,
  DetectToxicContentCommand,
  DetectToxicContentCommandOutput,
  DetectSentimentCommand,
  DetectSentimentCommandOutput,
  DetectPiiEntitiesCommand,
  DetectPiiEntitiesCommandOutput,
  LanguageCode,
  ToxicContentType,
  SentimentType,
  PiiEntityType,
} from '@aws-sdk/client-comprehend';

export interface TextModerationResult {
  isApproved: boolean;
  confidence: number;
  detections: string[];
  reason?: string;
  categories?: string[];
  severity?: 'low' | 'medium' | 'high';
  sentiment?: {
    sentiment: SentimentType;
    confidenceScores: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
  };
  toxicContent?: {
    labels: Array<{
      name: ToxicContentType;
      score: number;
    }>;
  };
  piiEntities?: Array<{
    type: PiiEntityType;
    score: number;
    beginOffset: number;
    endOffset: number;
  }>;
  analysisTimestamp: string;
}

export interface ComprehendAnalysisOptions {
  /**
   * Language code for the text (defaults to 'en')
   */
  languageCode?: LanguageCode;

  /**
   * Whether to perform sentiment analysis
   */
  includeSentiment?: boolean;

  /**
   * Whether to detect PII entities
   */
  includePiiDetection?: boolean;

  /**
   * Whether to detect toxic content
   */
  includeToxicContent?: boolean;

  /**
   * Toxic content confidence threshold (0.0 - 1.0)
   * Content with scores above this threshold will be flagged
   */
  toxicContentThreshold?: number;

  /**
   * Overall approval threshold based on combined analysis
   * Higher values are more strict
   */
  approvalThreshold?: number;
}

@Injectable()
export class ComprehendService {
  private readonly logger = new Logger(ComprehendService.name);
  private comprehendClient: ComprehendClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize the Comprehend client with dynamic import
   */
  private async initializeComprehendClient(): Promise<ComprehendClient> {
    if (this.comprehendClient) {
      return this.comprehendClient;
    }

    try {
      const { ComprehendClient } = await import('@aws-sdk/client-comprehend');
      this.comprehendClient = new ComprehendClient({
        region: this.configService.get('AWS_REGION', 'us-east-1'),
      });
      return this.comprehendClient;
    } catch (error) {
      this.logger.error('Failed to initialize Comprehend client:', error);
      throw new Error(
        `Failed to initialize AWS Comprehend client: ${error.message}`,
      );
    }
  }

  /**
   * Perform comprehensive text moderation using AWS Comprehend
   */
  async moderateTextContent(
    text: string,
    options: ComprehendAnalysisOptions = {},
  ): Promise<TextModerationResult> {
    const {
      languageCode = 'en' as LanguageCode,
      includeSentiment = true,
      includePiiDetection = true,
      includeToxicContent = true,
      toxicContentThreshold = 0.7,
      approvalThreshold = 0.8,
    } = options;

    this.logger.log(
      `Starting text moderation analysis for ${text.length} characters`,
    );
    const analysisTimestamp = new Date().toISOString();
    const detections: string[] = [];
    const categories: string[] = [];
    let overallConfidence = 0;
    let isApproved = true;
    let severity: 'low' | 'medium' | 'high' = 'low';
    let reason = '';

    const result: TextModerationResult = {
      isApproved: true,
      confidence: 0,
      detections: [],
      categories: [],
      severity: 'low',
      analysisTimestamp,
    };

    try {
      // Initialize client if needed
      await this.initializeComprehendClient();

      // Parallel execution of all enabled analyses
      const analyses = await Promise.allSettled([
        includeToxicContent
          ? this.detectToxicContent(text, languageCode)
          : null,
        includeSentiment ? this.detectSentiment(text, languageCode) : null,
        includePiiDetection ? this.detectPiiEntities(text, languageCode) : null,
      ]);

      // Process toxic content results
      if (
        includeToxicContent &&
        analyses[0].status === 'fulfilled' &&
        analyses[0].value
      ) {
        const toxicResult = analyses[0].value;
        result.toxicContent = {
          labels:
            toxicResult.ResultList?.[0]?.Labels?.map((label) => ({
              name: label.Name,
              score: label.Score || 0,
            })) || [],
        };

        // Check for toxic content above threshold
        const highToxicityLabels = result.toxicContent.labels.filter(
          (label) => label.score >= toxicContentThreshold,
        );

        if (highToxicityLabels.length > 0) {
          isApproved = false;
          detections.push(...highToxicityLabels.map((label) => label.name));
          categories.push('toxic-content');

          const maxToxicScore = Math.max(
            ...highToxicityLabels.map((l) => l.score),
          );
          overallConfidence = Math.max(overallConfidence, maxToxicScore);

          severity =
            maxToxicScore > 0.9
              ? 'high'
              : maxToxicScore > 0.8
                ? 'medium'
                : 'low';
          reason = `Toxic content detected: ${highToxicityLabels.map((l) => l.name).join(', ')}`;
        }
      }

      // Process sentiment analysis results
      if (
        includeSentiment &&
        analyses[1].status === 'fulfilled' &&
        analyses[1].value
      ) {
        const sentimentResult = analyses[1].value;
        result.sentiment = {
          sentiment: sentimentResult.Sentiment,
          confidenceScores: {
            positive: sentimentResult.SentimentScore?.Positive || 0,
            negative: sentimentResult.SentimentScore?.Negative || 0,
            neutral: sentimentResult.SentimentScore?.Neutral || 0,
            mixed: sentimentResult.SentimentScore?.Mixed || 0,
          },
        };

        // Flag extremely negative sentiment
        if (
          sentimentResult.Sentiment === 'NEGATIVE' &&
          (sentimentResult.SentimentScore?.Negative || 0) > 0.9
        ) {
          detections.push('highly-negative-sentiment');
          categories.push('negative-sentiment');
          overallConfidence = Math.max(
            overallConfidence,
            sentimentResult.SentimentScore?.Negative || 0,
          );

          if (severity === 'low') {
            severity = 'medium';
          }
        }
      }

      // Process PII detection results
      if (
        includePiiDetection &&
        analyses[2].status === 'fulfilled' &&
        analyses[2].value
      ) {
        const piiResult = analyses[2].value;
        result.piiEntities =
          piiResult.Entities?.map((entity) => ({
            type: entity.Type,
            score: entity.Score || 0,
            beginOffset: entity.BeginOffset || 0,
            endOffset: entity.EndOffset || 0,
          })) || [];

        // Check for high-confidence PII
        const highConfidencePii = result.piiEntities.filter(
          (entity) => entity.score >= 0.8,
        );
        if (highConfidencePii.length > 0) {
          detections.push(
            ...highConfidencePii.map(
              (entity) => `pii-${entity.type.toLowerCase()}`,
            ),
          );
          categories.push('pii-detected');
          overallConfidence = Math.max(
            overallConfidence,
            Math.max(...highConfidencePii.map((p) => p.score)),
          );

          // PII detection usually means content should be flagged but not necessarily rejected
          if (
            highConfidencePii.some((p) =>
              ['CREDIT_DEBIT_NUMBER', 'SSN', 'PHONE', 'EMAIL'].includes(p.type),
            )
          ) {
            reason = reason
              ? `${reason}; PII detected`
              : 'Personally identifiable information detected';
          }
        }
      }

      // Set final approval status based on overall confidence
      if (overallConfidence >= approvalThreshold && detections.length > 0) {
        isApproved = false;
      }

      // If still approved but we have low-severity detections, keep approved but note the detections
      if (isApproved && detections.length === 0) {
        overallConfidence = 0.95; // High confidence for clean content
      } else if (isApproved) {
        overallConfidence = Math.max(0.6, 1 - overallConfidence); // Moderate confidence
      }

      result.isApproved = isApproved;
      result.confidence = overallConfidence;
      result.detections = detections;
      result.categories = categories;
      result.severity = severity;
      result.reason = reason;

      this.logger.log(
        `Text moderation completed: ${isApproved ? 'APPROVED' : 'REJECTED'} (confidence: ${overallConfidence.toFixed(2)})`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Failed to moderate text content with AWS Comprehend:',
        error,
      );

      // Return rejection on error to be safe
      return {
        isApproved: false,
        confidence: 0,
        detections: ['moderation-service-error'],
        reason: `AWS Comprehend analysis failed: ${error.message}`,
        categories: ['service-error'],
        severity: 'high',
        analysisTimestamp,
      };
    }
  }

  /**
   * Detect toxic content in text
   */
  private async detectToxicContent(
    text: string,
    languageCode: LanguageCode,
  ): Promise<DetectToxicContentCommandOutput> {
    const { DetectToxicContentCommand } = await import(
      '@aws-sdk/client-comprehend'
    );
    const command = new DetectToxicContentCommand({
      TextSegments: [{ Text: text }],
      LanguageCode: languageCode,
    });

    return await this.comprehendClient.send(command);
  }

  /**
   * Analyze sentiment of text
   */
  private async detectSentiment(
    text: string,
    languageCode: LanguageCode,
  ): Promise<DetectSentimentCommandOutput> {
    const { DetectSentimentCommand } = await import(
      '@aws-sdk/client-comprehend'
    );
    const command = new DetectSentimentCommand({
      Text: text,
      LanguageCode: languageCode,
    });

    return await this.comprehendClient.send(command);
  }

  /**
   * Detect personally identifiable information in text
   */
  private async detectPiiEntities(
    text: string,
    languageCode: LanguageCode,
  ): Promise<DetectPiiEntitiesCommandOutput> {
    const { DetectPiiEntitiesCommand } = await import(
      '@aws-sdk/client-comprehend'
    );
    const command = new DetectPiiEntitiesCommand({
      Text: text,
      LanguageCode: languageCode,
    });

    return await this.comprehendClient.send(command);
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details?: string;
  }> {
    try {
      // Test with a simple, safe text
      const testResult = await this.moderateTextContent('Hello world', {
        includeSentiment: true,
        includePiiDetection: false,
        includeToxicContent: false,
      });

      return {
        status: testResult ? 'healthy' : 'unhealthy',
        details: testResult
          ? 'Service responding normally'
          : 'Service not responding',
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        details: `Health check failed: ${error.message}`,
      };
    }
  }
}
