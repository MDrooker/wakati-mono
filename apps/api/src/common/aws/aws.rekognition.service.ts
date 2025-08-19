import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RekognitionClient,
  StartContentModerationCommand,
  GetContentModerationCommand,
  ContentModerationDetection,
  GetContentModerationCommandOutput,
  DetectModerationLabelsCommand,
  DetectModerationLabelsCommandOutput,
  ModerationLabel,
  DetectLabelsCommand,
  DetectLabelsCommandOutput,
  Label,
} from '@aws-sdk/client-rekognition';

import * as path from 'path';

export interface VideoModerationResult {
  jobId: string;
  status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  moderationLabels?: ContentModerationDetection[];
  safetyScore: number;
  concerns: string[];
  suggestedTags: string[];
  description: string;
  confidence: number;
  timestamp: string;
  error?: string;
}

export interface ImageModerationResult {
  safetyScore: number;
  concerns: string[];
  suggestedTags: string[];
  contentTags: string[]; // New field for content-based tags
  description: string;
  confidence: number;
  timestamp: string;
  moderationLabels?: ModerationLabel[];
  contentLabels?: Label[]; // New field for content detection labels
  analysisType: string;
  error?: string;
}

export interface VideoValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

@Injectable()
export class RekognitionService {
  private readonly logger = new Logger(RekognitionService.name);
  private readonly rekognitionClient: RekognitionClient;
  private readonly region: string;

  constructor(
    private readonly configService: ConfigService,
    // private readonly mediaTypeValidationService: MediaTypeValidationService,
  ) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');

    this.rekognitionClient = new RekognitionClient({
      region: this.region,
    });
  }

  /**
   * Validate video format and codec compatibility with Rekognition
   */
  // validateVideoFormat(objectKey: string): VideoValidationResult {
  //   const fileExtension = path
  //     .extname(objectKey)
  //     .toLowerCase()
  //     .replace('.', '');

  //   return this.mediaTypeValidationService.validateVideoFormatForRekognition(
  //     fileExtension,
  //   );
  // }

  /**
   * Get detailed format requirements for video files
   */
  // getVideoFormatRequirements(): string[] {
  //   return this.mediaTypeValidationService.getRekognitionVideoFormatRequirements();
  // }

  /**
   * Start content moderation job for a video stored in S3 (original method)
   */
  async startVideoModeration(
    bucketName: string,
    objectKey: string,
  ): Promise<string> {
    try {
      // First validate the video format
      const validation = this.validateVideoFormat(objectKey);
      if (!validation.isValid) {
        this.logger.error(
          `Video format validation failed for ${objectKey}: ${validation.error}`,
        );
        throw new Error(validation.error);
      }
      try {
        const command = new StartContentModerationCommand({
          Video: {
            S3Object: {
              Bucket: bucketName,
              Name: objectKey,
            },
          },
          MinConfidence: 50, // Minimum confidence threshold for detected content
          NotificationChannel: undefined, // We'll poll for results instead of using SNS
        });

        const response = await this.rekognitionClient.send(command);

        if (!response.JobId) {
          throw new Error(
            'Failed to start content moderation job - no JobId returned',
          );
        }

        this.logger.log(
          `Started video content moderation job: ${response.JobId} for ${bucketName}/${objectKey}`,
        );
        return response.JobId;
      } catch (error) { }
    } catch (error) {
      this.logger.error('Failed to start video content moderation', error);

      // Provide helpful error messages for common format issues
      if (
        error.message.includes('UnsupportedMediaTypeException') ||
        error.message.includes('Unsupported codec') ||
        error.message.includes('Invalid media format')
      ) {
        const requirements = this.getVideoFormatRequirements();
        throw new Error(
          `Video format not supported by Amazon Rekognition. ${error.message}\n\nRequirements:\n${requirements.join('\n')}`,
        );
      }

      throw new Error(
        `Failed to start video content moderation: ${error.message}`,
      );
    }
  }

  /**
   * Diagnose video compatibility issues and provide solutions
   */
  async diagnoseVideoCompatibility(
    bucketName: string,
    objectKey: string,
  ): Promise<{
    isCompatible: boolean;
    issues: string[];
    solutions: string[];
    conversionAvailable: boolean;
    ffmpegAvailable?: { ffmpeg: boolean; ffprobe: boolean };
  }> {
    const validation = this.validateVideoFormat(objectKey);
    const issues: string[] = [];
    const solutions: string[] = [];

    if (!validation.isValid) {
      issues.push(validation.error);
      solutions.push(...(validation.suggestions || []));
    }

    // Note: FFmpeg availability checking is now handled by the VideoModule
    // This method provides basic compatibility information
    const conversionAvailable = false; // Will be determined by the VideoModule

    if (!validation.isValid) {
      solutions.push(
        'Video conversion service is available through the VideoModule',
      );
      solutions.push(
        'Use the video-diagnostics API endpoints to check FFmpeg availability',
      );
    }

    return {
      isCompatible: validation.isValid,
      issues,
      solutions,
      conversionAvailable,
    };
  }

  /**
   * Get the results of a content moderation job
   */
  async getVideoModerationResults(
    jobId: string,
  ): Promise<VideoModerationResult> {
    try {
      const command = new GetContentModerationCommand({
        JobId: jobId,
        MaxResults: 1000, // Get up to 1000 results
        SortBy: 'TIMESTAMP',
      });

      const response: GetContentModerationCommandOutput =
        await this.rekognitionClient.send(command);

      if (!response.JobStatus) {
        throw new Error('Invalid response from GetContentModeration');
      }

      const result: VideoModerationResult = {
        jobId,
        status: response.JobStatus as 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED',
        timestamp: new Date().toISOString(),
        safetyScore: 10, // Default to safe
        concerns: [],
        suggestedTags: [],
        description: 'Video content analysis',
        confidence: 0,
      };

      if (response.JobStatus === 'FAILED') {
        result.error =
          response.StatusMessage || 'Content moderation job failed';
        result.safetyScore = 0;
        result.confidence = 0;
        return result;
      }

      if (response.JobStatus === 'IN_PROGRESS') {
        result.description = 'Content moderation job is still in progress';
        result.confidence = 0;
        return result;
      }

      if (response.JobStatus === 'SUCCEEDED' && response.ModerationLabels) {
        result.moderationLabels = response.ModerationLabels;

        // Analyze the moderation labels to determine safety score
        const analysis = this.analyzeModerationLabels(
          response.ModerationLabels,
        );
        result.safetyScore = analysis.safetyScore;
        result.concerns = analysis.concerns;
        result.suggestedTags = analysis.suggestedTags;
        result.description = analysis.description;
        result.confidence = analysis.confidence;
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get video moderation results for job ${jobId}`,
        error,
      );
      return {
        jobId,
        status: 'FAILED',
        error: `Failed to get moderation results: ${error.message}`,
        safetyScore: 0,
        concerns: ['Analysis failed'],
        suggestedTags: [],
        description: 'Failed to analyze video content',
        confidence: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Poll for video moderation results with retries
   */
  async pollVideoModerationResults(
    jobId: string,
    maxRetries: number = 30,
    retryInterval: number = 10000, // 10 seconds
  ): Promise<VideoModerationResult> {
    let retryCount = 0;

    while (retryCount < maxRetries) {
      const result = await this.getVideoModerationResults(jobId);
      if (result.status === 'SUCCEEDED' || result.status === 'FAILED') {
        this.logger.log(
          `Video moderation job ${jobId} completed with status of: ${result.status}  `,
        );
        return result;
      }

      this.logger.log(
        `Video moderation job ${jobId} still in progress, retry ${retryCount + 1}/${maxRetries}`,
      );

      // Wait before next poll
      await this.delay(retryInterval);
      retryCount++;
    }

    // Timeout reached
    return {
      jobId,
      status: 'FAILED',
      error: 'Timeout waiting for content moderation results',
      safetyScore: 0,
      concerns: ['Analysis timeout'],
      suggestedTags: [],
      description: 'Video content analysis timed out',
      confidence: 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Analyze moderation labels to determine safety score and concerns
   */
  private analyzeModerationLabels(
    moderationLabels: ContentModerationDetection[],
  ): {
    safetyScore: number;
    concerns: string[];
    suggestedTags: string[];
    description: string;
    confidence: number;
  } {
    if (!moderationLabels || moderationLabels.length === 0) {
      return {
        safetyScore: 10,
        concerns: [],
        suggestedTags: ['safe-content'],
        description: 'No inappropriate content detected in video',
        confidence: 0.9,
      };
    }

    const concerns: string[] = [];
    const suggestedTags: string[] = [];
    let maxConfidence = 0;
    let minSafetyScore = 10;

    // Define severity levels for different types of content
    const severityMap: Record<string, number> = {
      'Explicit Nudity': 1,
      Suggestive: 7,
      Violence: 2,
      'Visually Disturbing': 4,
      'Hate Symbols': 1,
      Drugs: 3,
      Tobacco: 6,
      Alcohol: 7,
      Gambling: 5,
      'Rude Gestures': 6,
    };

    for (const detection of moderationLabels) {
      if (
        detection.ModerationLabel &&
        detection.ModerationLabel.Confidence !== undefined
      ) {
        const label = detection.ModerationLabel.Name || 'Unknown';
        const confidence = detection.ModerationLabel.Confidence;

        maxConfidence = Math.max(maxConfidence, confidence);

        // Only consider high-confidence detections
        if (confidence > 50) {
          concerns.push(`${label} (${confidence.toFixed(1)}% confidence)`);

          // Calculate safety score based on severity
          const severity = severityMap[label] || 5; // Default to moderate severity
          const adjustedScore = Math.max(1, severity - (confidence / 100) * 3);
          minSafetyScore = Math.min(minSafetyScore, adjustedScore);

          // Add tags based on content type
          if (label.includes('Nudity') || label.includes('Suggestive')) {
            suggestedTags.push('adult-content');
          } else if (
            label.includes('Violence') ||
            label.includes('Disturbing')
          ) {
            suggestedTags.push('violent-content');
          } else if (
            label.includes('Drugs') ||
            label.includes('Alcohol') ||
            label.includes('Tobacco')
          ) {
            suggestedTags.push('substance-use');
          } else {
            suggestedTags.push('flagged-content');
          }
        }
      }
    }

    // Remove duplicates from tags
    const uniqueTags = [...new Set(suggestedTags)];

    let description: string;
    if (concerns.length === 0) {
      description =
        'Video content appears appropriate with no significant concerns detected';
    } else {
      description = `Video contains potentially inappropriate content: ${concerns.slice(0, 3).join(', ')}`;
    }

    return {
      safetyScore: Math.max(1, Math.min(10, minSafetyScore)),
      concerns,
      suggestedTags: uniqueTags.length > 0 ? uniqueTags : ['content-reviewed'],
      description,
      confidence: maxConfidence / 100, // Convert to 0-1 scale
    };
  }

  /**
   * Analyze image content for moderation using Rekognition
   */
  async analyzeImage(
    bucket: string,
    objectKey: string,
  ): Promise<ImageModerationResult> {
    try {
      // First, detect moderation labels
      const moderationCommand = new DetectModerationLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: objectKey,
          },
        },
        MinConfidence: 50, // Minimum confidence threshold for detected content
      });

      // Second, detect content labels for tagging
      const labelsCommand = new DetectLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: objectKey,
          },
        },
        MaxLabels: 20, // Get up to 20 content labels
        MinConfidence: 70, // Higher confidence for content tags
      });

      this.logger.log(
        `Analyzing image content in ${bucket}/${objectKey} with Rekognition`,
      );

      // Execute both commands in parallel
      const [moderationResponse, labelsResponse] = await Promise.all([
        this.rekognitionClient.send(moderationCommand),
        this.rekognitionClient.send(labelsCommand),
      ]);

      const result: ImageModerationResult = {
        safetyScore: 10, // Default to safe
        concerns: [],
        suggestedTags: [],
        contentTags: [], // Initialize content tags
        description: 'Image content analysis',
        confidence: 0,
        timestamp: new Date().toISOString(),
        analysisType: 'amazon-rekognition-image',
      };

      // Process moderation labels
      if (
        moderationResponse.ModerationLabels &&
        moderationResponse.ModerationLabels.length > 0
      ) {
        result.moderationLabels = moderationResponse.ModerationLabels;

        // Analyze the moderation labels to determine safety score
        const moderationAnalysis = this.analyzeImageModerationLabels(
          moderationResponse.ModerationLabels,
        );
        result.safetyScore = moderationAnalysis.safetyScore;
        result.concerns = moderationAnalysis.concerns;
        result.suggestedTags = moderationAnalysis.suggestedTags;
        result.description = moderationAnalysis.description;
        result.confidence = moderationAnalysis.confidence;
      } else {
        result.description = 'No inappropriate content detected in image';
        result.confidence = 0.9;
        result.suggestedTags = ['safe-content'];
      }

      // Process content labels for tagging
      if (labelsResponse.Labels && labelsResponse.Labels.length > 0) {
        result.contentLabels = labelsResponse.Labels;
        result.contentTags = this.extractContentTags(labelsResponse.Labels);

        // If no moderation issues were found, enhance description with content
        if (result.concerns.length === 0) {
          const topTags = result.contentTags.slice(0, 3);
          if (topTags.length > 0) {
            result.description = `Safe image content detected featuring: ${topTags.join(', ')}`;
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to analyze image with Rekognition:', error);
      return {
        error: 'Failed to analyze image content',
        safetyScore: 0,
        concerns: ['Analysis failed'],
        suggestedTags: [],
        contentTags: [], // Include in error response
        description: 'Failed to analyze image content',
        confidence: 0,
        timestamp: new Date().toISOString(),
        analysisType: 'amazon-rekognition-image',
      };
    }
  }

  /**
   * Analyze image moderation labels to determine safety score and concerns
   */
  private analyzeImageModerationLabels(moderationLabels: ModerationLabel[]): {
    safetyScore: number;
    concerns: string[];
    suggestedTags: string[];
    description: string;
    confidence: number;
  } {
    if (!moderationLabels || moderationLabels.length === 0) {
      return {
        safetyScore: 10,
        concerns: [],
        suggestedTags: ['safe-content'],
        description: 'No inappropriate content detected in image',
        confidence: 0.9,
      };
    }

    const concerns: string[] = [];
    const suggestedTags: string[] = [];
    let maxConfidence = 0;
    let minSafetyScore = 10;

    // Define severity levels for different types of content (same as video)
    const severityMap: Record<string, number> = {
      'Explicit Nudity': 1,
      Suggestive: 7,
      Violence: 2,
      'Visually Disturbing': 4,
      'Hate Symbols': 1,
      Drugs: 3,
      Tobacco: 6,
      Alcohol: 7,
      Gambling: 5,
      'Rude Gestures': 6,
    };

    for (const label of moderationLabels) {
      if (label.Name && label.Confidence !== undefined) {
        const labelName = label.Name;
        const confidence = label.Confidence;
        maxConfidence = Math.max(maxConfidence, confidence);

        // Only consider high-confidence detections
        if (confidence > 50) {
          concerns.push(`${labelName}(${confidence.toFixed(1)} % confidence)`);

          // Calculate safety score based on severity
          const severity = severityMap[labelName] || 5; // Default to moderate severity
          const adjustedScore = Math.max(1, severity - (confidence / 100) * 3);
          minSafetyScore = Math.min(minSafetyScore, adjustedScore);

          // Add tags based on content type
          if (
            labelName.includes('Nudity') ||
            labelName.includes('Suggestive')
          ) {
            suggestedTags.push('adult-content');
          } else if (
            labelName.includes('Violence') ||
            labelName.includes('Disturbing')
          ) {
            suggestedTags.push('violent-content');
          } else if (
            labelName.includes('Drugs') ||
            labelName.includes('Alcohol') ||
            labelName.includes('Tobacco')
          ) {
            suggestedTags.push('substance-use');
          } else {
            suggestedTags.push('flagged-content');
          }
        }
      }
    }

    // Remove duplicates from tags
    const uniqueTags = [...new Set(suggestedTags)];

    let description: string;
    if (concerns.length === 0) {
      description =
        'Image content appears appropriate with no significant concerns detected';
    } else {
      description = `Image contains potentially inappropriate content: ${concerns.slice(0, 3).join(', ')}`;
    }

    return {
      safetyScore: Math.max(1, Math.min(10, minSafetyScore)),
      concerns,
      suggestedTags: uniqueTags.length > 0 ? uniqueTags : ['content-reviewed'],
      description,
      confidence: maxConfidence / 100, // Convert to 0-1 scale
    };
  }

  /**
   * Extract content-based tags from detected labels
   */
  private extractContentTags(labels: Label[]): string[] {
    const contentTags: string[] = [];
    const tagCategoryMap: Record<string, string[]> = {
      // People and Activities
      Person: ['people', 'portrait'],
      Human: ['people', 'portrait'],
      People: ['people', 'group'],
      Face: ['portrait', 'people'],
      Smile: ['people', 'portrait', 'happy'],
      Wedding: ['wedding', 'celebration', 'formal'],
      Party: ['party', 'celebration', 'social'],
      Dance: ['dance', 'activity', 'movement'],
      Sport: ['sports', 'activity', 'recreation'],
      Exercise: ['fitness', 'activity', 'health'],

      // Animals
      Animal: ['animals'],
      Pet: ['pets', 'animals'],
      Dog: ['dogs', 'pets', 'animals'],
      Cat: ['cats', 'pets', 'animals'],
      Bird: ['birds', 'animals', 'wildlife'],
      Horse: ['horses', 'animals'],
      Wildlife: ['wildlife', 'animals', 'nature'],

      // Nature and Outdoors
      Nature: ['nature', 'outdoors'],
      Outdoors: ['outdoors', 'nature'],
      Tree: ['trees', 'nature', 'outdoors'],
      Flower: ['flowers', 'nature', 'plants'],
      Plant: ['plants', 'nature'],
      Garden: ['garden', 'nature', 'plants'],
      Landscape: ['landscape', 'nature', 'scenery'],
      Mountain: ['mountains', 'nature', 'landscape'],
      Beach: ['beach', 'nature', 'ocean'],
      Ocean: ['ocean', 'water', 'nature'],
      Sky: ['sky', 'nature', 'weather'],
      Sunset: ['sunset', 'nature', 'sky'],
      Sunrise: ['sunrise', 'nature', 'sky'],

      // Architecture and Places
      Building: ['architecture', 'urban'],
      Architecture: ['architecture', 'building'],
      House: ['house', 'architecture', 'home'],
      City: ['city', 'urban', 'architecture'],
      Street: ['street', 'urban', 'city'],
      Bridge: ['bridge', 'architecture', 'engineering'],
      Church: ['church', 'architecture', 'religious'],
      Monument: ['monument', 'architecture', 'landmark'],

      // Transportation
      Vehicle: ['transportation', 'vehicles'],
      Car: ['cars', 'vehicles', 'transportation'],
      Truck: ['trucks', 'vehicles', 'transportation'],
      Bus: ['buses', 'vehicles', 'transportation'],
      Train: ['trains', 'transportation'],
      Airplane: ['aircraft', 'transportation', 'aviation'],
      Boat: ['boats', 'transportation', 'water'],
      Ship: ['ships', 'transportation', 'water'],
      Bicycle: ['bicycles', 'transportation', 'recreation'],

      // Food and Dining
      Food: ['food', 'cuisine'],
      Meal: ['food', 'dining', 'cuisine'],
      Dining: ['dining', 'food', 'restaurant'],
      Restaurant: ['restaurant', 'dining', 'food'],
      Fruit: ['fruit', 'food', 'healthy'],
      Vegetable: ['vegetables', 'food', 'healthy'],
      Bread: ['bread', 'food', 'baking'],
      Cake: ['cake', 'food', 'dessert'],
      Beverage: ['beverages', 'drinks'],

      // Technology and Objects
      Electronics: ['technology', 'electronics'],
      Computer: ['computers', 'technology'],
      Phone: ['phones', 'technology', 'mobile'],
      Camera: ['cameras', 'photography', 'technology'],
      Book: ['books', 'reading', 'literature'],
      Art: ['art', 'creative', 'artistic'],
      Painting: ['painting', 'art', 'creative'],
      Sculpture: ['sculpture', 'art', 'creative'],
      Music: ['music', 'entertainment', 'audio'],

      // Events and Occasions
      Birthday: ['birthday', 'celebration', 'party'],
      Christmas: ['christmas', 'holiday', 'celebration'],
      Halloween: ['halloween', 'holiday', 'celebration'],
      Festival: ['festival', 'celebration', 'event'],
      Concert: ['concert', 'music', 'entertainment'],
      Performance: ['performance', 'entertainment', 'show'],

      // Fashion and Clothing
      Clothing: ['fashion', 'clothing', 'style'],
      Fashion: ['fashion', 'style', 'clothing'],
      Jewelry: ['jewelry', 'accessories', 'fashion'],
      Shoe: ['shoes', 'footwear', 'fashion'],
      Hat: ['hats', 'accessories', 'fashion'],

      // Interior and Home
      Furniture: ['furniture', 'interior', 'home'],
      Room: ['interior', 'home', 'room'],
      Kitchen: ['kitchen', 'home', 'interior'],
      Bedroom: ['bedroom', 'home', 'interior'],
      'Living Room': ['living-room', 'home', 'interior'],
    };

    for (const label of labels) {
      if (label.Name && label.Confidence && label.Confidence > 70) {
        const labelName = label.Name;

        // Add the label itself as a tag (normalized)
        const normalizedLabel = labelName.toLowerCase().replace(/\s+/g, '-');
        contentTags.push(normalizedLabel);

        // Add category-based tags
        if (tagCategoryMap[labelName]) {
          contentTags.push(...tagCategoryMap[labelName]);
        }

        // Add parent categories if they exist
        if (label.Categories) {
          for (const category of label.Categories) {
            if (category.Name) {
              const normalizedCategory = category.Name.toLowerCase().replace(
                /\s+/g,
                '-',
              );
              contentTags.push(normalizedCategory);
            }
          }
        }

        // Add instances if they exist (for specific objects)
        if (label.Instances && label.Instances.length > 0) {
          contentTags.push(`multiple-${normalizedLabel}`);
        }
      }
    }

    // Remove duplicates and return top 15 tags
    const uniqueTags = [...new Set(contentTags)];
    return uniqueTags.slice(0, 15);
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
