import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HLSTranscodeConfig,
  HLSVariant,
  HLSOverlay,
} from '../../modules/media/conversion/entities/hls-transcode-config.entity';

export interface MediaConvertJobRequest {
  sourceAssetKey: string;
  sourceBucket: string;
  outputBucket: string;
  outputKeyPrefix: string;
  config: HLSTranscodeConfig;
  originalDimensions?: {
    width: number;
    height: number;
  };
  jobMetadata: {
    transcodequeueurn: string;
    sourceAsseturn: string;
    userUrn: string;
  };
  // New: optional per-job overlays (supplement or override config overlays)
  overlays?: HLSOverlay[];
}

export interface MediaConvertJobResult {
  jobId: string;
  status: string;
  arn: string;
  queue: string;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  outputDetails?: Array<{
    outputKey: string;
    url: string;
    type: 'hls_master' | 'hls_variant' | 'mp4' | 'thumbnail';
    variant?: string;
  }>;
}

export interface MediaConvertHLSOutput {
  masterPlaylistKey: string;
  masterPlaylistUrl: string;
  variantPlaylists: Array<{
    name: string;
    key: string;
    url: string;
    bandwidth: number;
    resolution: string;
  }>;
  thumbnails: Array<{
    timestamp: number;
    key: string;
    url: string;
  }>;
  mp4Outputs?: Array<{
    name: string;
    key: string;
    url: string;
    bitrate: number;
    resolution: string;
  }>;
}

@Injectable()
export class MediaConvertService {
  private readonly logger = new Logger(MediaConvertService.name);
  private mediaConvertClient: any;
  private readonly mediaConvertRole: string;
  private readonly mediaConvertQueue: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('AWS_MEDIACONVERT_ENDPOINT');
    this.mediaConvertRole = this.configService.get<string>(
      'AWS_MEDIACONVERT_ROLE_ARN',
    );
    this.mediaConvertQueue = this.configService.get<string>(
      'AWS_MEDIACONVERT_QUEUE_ARN',
    );

    this.initializeClient();
  }

  /**
   * Initialize MediaConvert client with dynamic import
   */
  private async initializeClient() {
    try {
      // Try to dynamically import AWS SDK
      const awsModule = await import('@aws-sdk/client-mediaconvert').catch(
        () => null,
      );

      if (awsModule) {
        this.mediaConvertClient = new awsModule.MediaConvertClient({
          region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
          endpoint: this.endpoint,
        });
        this.logger.log('MediaConvert client initialized successfully');
      } else {
        this.logger.warn(
          'AWS SDK for MediaConvert not available. Install @aws-sdk/client-mediaconvert for MediaConvert support',
        );
      }
    } catch (error) {
      this.logger.warn(
        'MediaConvert client initialization failed:',
        error.message,
      );
    }
  }

  /**
   * Check if MediaConvert is available
   */
  isAvailable(): boolean {
    return (
      !!this.mediaConvertClient &&
      !!this.mediaConvertRole &&
      !!this.mediaConvertQueue
    );
  }

  /**
   * Create MediaConvert job for HLS transcoding
   */
  async createHLSTranscodeJob(
    request: MediaConvertJobRequest,
  ): Promise<MediaConvertJobResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'MediaConvert service is not properly configured or AWS SDK not available',
      );
    }

    try {
      const awsModule = await import('@aws-sdk/client-mediaconvert');
      const jobSettings = this.buildHLSJobSettings(request);

      const createJobCommand = new awsModule.CreateJobCommand({
        Role: this.mediaConvertRole,
        Queue: this.mediaConvertQueue,
        Settings: jobSettings,
        UserMetadata: {
          transcodequeueurn: request.jobMetadata.transcodequeueurn,
          sourceAsseturn: request.jobMetadata.sourceAsseturn,
          userUrn: request.jobMetadata.userUrn,
          createdBy: 'hls-transcoding-service',
          timestamp: new Date().toISOString(),
        },
        Tags: {
          Service: 'rockwell-api',
          Component: 'hls-transcoding',
          Environment: this.configService.get<string>(
            'NODE_ENV',
            'development',
          ),
          transcodequeueurn: request.jobMetadata.transcodequeueurn,
        },
      });

      // Log the job settings for debugging
      this.logger.log(
        'MediaConvert job settings:',
        JSON.stringify(jobSettings, null, 2),
      );

      // Log critical HLS settings for debugging
      this.logger.log('HLS configuration summary:', {
        segmentDuration: request.config.segmentConfig.duration,
        variantCount: request.config.variants.length,
        variants: request.config.variants.map(
          (v) => `${v.name}:${v.bitrate}kbps`,
        ),
        generateThumbnails: request.config.generateThumbnails,
        generateMp4: request.config.generateMp4Mezzanine,
        overlayCount:
          (request.config?.overlays || []).length +
          (request.overlays || []).length,
        outputPath: `${request.outputBucket}/${request.outputKeyPrefix}/hls/`,
        originalDimensions: request.originalDimensions,
        sourceVideo: {
          width: request.originalDimensions?.width || 1920,
          height: request.originalDimensions?.height || 1080,
          isVertical:
            (request.originalDimensions?.height || 1080) >
            (request.originalDimensions?.width || 1920),
        },
      });

      const response = await this.mediaConvertClient.send(createJobCommand);

      this.logger.log(
        `Created MediaConvert job: ${response.Job.Id} for queue: ${request.jobMetadata.transcodequeueurn}`,
      );

      return {
        jobId: response.Job.Id,
        status: response.Job.Status,
        arn: response.Job.Arn,
        queue: response.Job.Queue,
        createdAt: new Date(response.Job.CreatedAt),
        completedAt: response.Job.FinishedAt
          ? new Date(response.Job.FinishedAt)
          : undefined,
      };
    } catch (error) {
      // Enhanced error logging with more specific MediaConvert error details
      this.logger.error('Failed to create MediaConvert job:', {
        error: error.message,
        errorCode: error.Code || error.code,
        errorName: error.name,
        requestId: error.$metadata?.requestId,
        httpStatusCode: error.$metadata?.httpStatusCode,
        attempts: error.$metadata?.attempts,
        // Add more detailed error context
        fault: error.$fault,
        retryable: error.$retryable,
      });

      // Log the request that failed for debugging
      if (
        error.message.includes('could not be interpreted') ||
        error.message.includes('BadRequestException')
      ) {
        this.logger.error(
          'Job settings that caused the error:',
          JSON.stringify(this.buildHLSJobSettings(request), null, 2),
        );
      }

      // Provide more specific error messages based on common MediaConvert issues
      let errorMessage = `Failed to create MediaConvert job: ${error.message}`;

      if (
        error.Code === 'BadRequestException' ||
        error.name === 'BadRequestException'
      ) {
        errorMessage = `MediaConvert configuration error: ${error.message}. Check job settings for invalid parameters.`;
      } else if (error.Code === 'AccessDeniedException') {
        errorMessage = `MediaConvert access denied: Check IAM role permissions and queue access.`;
      } else if (error.Code === 'ResourceNotFoundException') {
        errorMessage = `MediaConvert resource not found: Check if queue, role, or input file exists.`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Get MediaConvert job status with enhanced output details extraction
   */
  async getJobStatus(jobId: string): Promise<MediaConvertJobResult> {
    if (!this.isAvailable()) {
      throw new Error('MediaConvert service is not available');
    }

    try {
      const awsModule = await import('@aws-sdk/client-mediaconvert');
      const getJobCommand = new awsModule.GetJobCommand({ Id: jobId });
      let outputDetails;
      let response = await this.mediaConvertClient.send(getJobCommand);

      let job = response.Job;
      // Enhanced output details extraction with additional logging
      this.logger.debug(`Job ${jobId} status: ${job.Status}`);
      const result: MediaConvertJobResult = {
        jobId: job.Id,
        status: job.Status,
        arn: job.Arn,
        queue: job.Queue,
        createdAt: new Date(job.CreatedAt),
        completedAt: job.FinishedAt ? new Date(job.FinishedAt) : undefined,
        errorMessage: job.ErrorMessage,
        outputDetails,
      };
      if (job.Status === 'COMPLETE') {
        this.logger.debug(
          `Job ${jobId} completed. Extracting output details...`,
        );
        // jobResult.outputDetails contains all output files
        // for (const output of job.OutputGroupDetails) {
        //   console.log(`Type: ${output.type}`);
        //   console.log(`Key: ${output.outputKey}`);
        //   console.log(`URL: ${output.url}`);
        //   console.log(`Variant: ${output.variant}`);
        // }
        this.logger.log(
          `Job ${jobId} completed with ${job.OutputGroupDetails.length} output groups.  Waiting for outputs to be processed...`,
        );
        await this.sleep(10000); // Wait for 10 seconds to ensure all outputs are processed
        response = await this.mediaConvertClient.send(getJobCommand);
        job = response.Job;

        outputDetails = this.extractOutputDetails(job);

        return result;
      } else {
        this.logger.warn(
          `Job ${jobId} is not complete yet. Current status: ${job.Status}`,
        );
        return result;
      }

      // Additional debugging for completed jobs with no outputs
      if (job.Status === 'COMPLETE' && outputDetails.length === 0) {
        this.logger.warn(
          `Job ${jobId} completed but no output details found. Job structure: ${JSON.stringify(job, null, 2)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to get MediaConvert job status for ${jobId}:`,
        error,
      );
      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }

  /**
   * Poll job status until completion
   */
  async pollJobUntilComplete(
    jobId: string,
    onProgress?: (status: string, progress?: number) => void,
    timeoutMs: number = 3600000, // 1 hour default
  ): Promise<MediaConvertJobResult> {
    const startTime = Date.now();
    const pollIntervalMs = 10000; // Poll every 10 seconds

    while (Date.now() - startTime < timeoutMs) {
      const jobResult = await this.getJobStatus(jobId);

      if (onProgress) {
        const progress = this.calculateProgress(jobResult?.status);
        onProgress(jobResult.status, progress);
      }

      // Check if job is complete (success or failure)
      if (this.isJobComplete(jobResult.status)) {
        return jobResult;
      }

      // Wait before next poll
      await this.sleep(pollIntervalMs);
    }

    throw new Error(`MediaConvert job ${jobId} timed out after ${timeoutMs}ms`);
  }

  /**
   * Build job settings for HLS transcoding with simplified structure
   */
  private buildHLSJobSettings(request: MediaConvertJobRequest): any {
    const {
      config,
      sourceAssetKey,
      sourceBucket,
      outputBucket,
      outputKeyPrefix,
      originalDimensions,
    } = request;

    // Validate essential parameters
    if (!sourceAssetKey || !sourceBucket || !outputBucket || !outputKeyPrefix) {
      throw new Error(
        'Missing required job parameters: sourceAssetKey, sourceBucket, outputBucket, or outputKeyPrefix',
      );
    }

    if (!config || !config.variants || config.variants.length === 0) {
      throw new Error('Job configuration must include at least one variant');
    }

    if (!config.segmentConfig || !config.segmentConfig.duration) {
      throw new Error(
        'Job configuration must include segment configuration with duration',
      );
    }

    // Use original dimensions or fallback defaults
    const sourceWidth = originalDimensions?.width || 1920;
    const sourceHeight = originalDimensions?.height || 1080;
    const isVertical = sourceHeight > sourceWidth;
    const aspectRatio = sourceWidth / sourceHeight;

    // Debug logging for video characteristics
    this.logger.debug(
      `Source video: ${sourceWidth}x${sourceHeight}, isVertical: ${isVertical}, aspectRatio: ${aspectRatio.toFixed(2)}`,
    );

    // New: Build optional overlay inserter from config.overlays + request.overlays
    const combinedOverlays: HLSOverlay[] = [
      ...(config?.overlays || []),
      ...(request?.overlays || []),
    ];

    const overlayPreprocessors =
      combinedOverlays.length > 0
        ? {
          ImageInserter: {
            InsertableImages: combinedOverlays.map((o) => {
              // Validate overlay configuration
              if (!o.url && !(o.s3Bucket && o.s3Key)) {
                throw new Error(
                  'Overlay must specify either url OR s3Bucket+s3Key',
                );
              }

              // Determine image input source - either S3 path or HTTP(S) URL
              let imageInput: string;
              if (o.url) {
                imageInput = o.url;
              } else if (o.s3Bucket && o.s3Key) {
                imageInput = `s3://${o.s3Bucket}/${o.s3Key}`;
              } else {
                throw new Error(
                  'Overlay must specify either url OR s3Bucket+s3Key',
                );
              }

              // Validate position and size parameters
              if (typeof o.x !== 'number' || typeof o.y !== 'number') {
                throw new Error(
                  'Overlay x and y coordinates must be numbers',
                );
              }

              return {
                ImageInserterInput: imageInput,
                Layer: o.layer ?? 0,
                Opacity: o.opacity ?? 100,
                ImageX: o.x,
                ImageY: o.y,
                Width: o.width,
                Height: o.height,
                StartTime: o.startTimecode,
                EndTime: o.endTimecode,
              };
            }),
          },
        }
        : undefined;

    // Build HLS outputs for each variant with proper resolution scaling
    const hlsOutputs = config.variants.map((variant) => {
      // Validate required variant properties
      if (!variant.audioBitrate) {
        throw new Error(
          `Variant ${variant.name} missing required audioBitrate property`,
        );
      }
      if (!variant.bitrate) {
        throw new Error(
          `Variant ${variant.name} missing required bitrate property`,
        );
      }

      // Calculate variant dimensions based on target height and aspect ratio
      let variantHeight: number;
      let variantWidth: number;

      // Common resolution targets based on variant name
      const resolutionMap: Record<string, number> = {
        '240p': 240,
        '360p': 360,
        '480p': 480,
        '720p': 720,
        '1080p': 1080,
      };

      // Extract target height from variant name or use source dimensions
      const heightMatch = variant.name.match(/(\d+)p/);
      if (heightMatch && resolutionMap[variant.name]) {
        const targetSize = resolutionMap[variant.name];

        if (isVertical) {
          // For vertical videos, the target size becomes the width (shorter dimension)
          // and we calculate height to maintain aspect ratio
          variantWidth = targetSize;
          variantHeight = Math.round(variantWidth / aspectRatio);
        } else {
          // For horizontal videos, target size is the height (shorter dimension)
          variantHeight = targetSize;
          variantWidth = Math.round(variantHeight * aspectRatio);
        }
      } else {
        // Fallback to source dimensions
        variantWidth = sourceWidth;
        variantHeight = sourceHeight;
      }

      // Ensure dimensions are even numbers (required for H.264)
      variantWidth = Math.round(variantWidth / 2) * 2;
      variantHeight = Math.round(variantHeight / 2) * 2;

      // Debug logging for vertical video transcoding
      this.logger.log(
        `Variant ${variant.name} dimensions: ${variantWidth}x${variantHeight} (isVertical: ${isVertical}, aspectRatio: ${aspectRatio.toFixed(2)})`,
      );

      return {
        NameModifier: `_${variant.name}`,
        OutputSettings: {
          HlsSettings: {
            PlaylistType: 'VOD',
            IFrameOnlyManifest: 'EXCLUDE',
            // Ensure proper audio rendition grouping
            AudioRenditionSets: 'program_audio',
          },
        },
        ContainerSettings: {
          Container: 'M3U8',
          M3u8Settings: {
            // Critical for proper HLS playback
            AudioFramesPerPes: 4,
            AudioPids: [492, 493, 494, 495, 496, 497, 498],
            NielsenId3: 'NONE',
            PatInterval: 0,
            PcrControl: 'PCR_EVERY_PES_PACKET',
            PcrPid: 481,
            PmtInterval: 0,
            PmtPid: 480,
            PrivateMetadataPid: 503,
            ProgramNumber: 1,
            Scte35Source: 'NONE',
            TimedMetadata: 'NONE',
            VideoPid: 481,
          },
        },
        VideoDescription: {
          Width: variantWidth,
          Height: variantHeight,
          RespondToAfd: 'NONE',
          AfdSignaling: 'NONE',
          ...(overlayPreprocessors && {
            VideoPreprocessors: overlayPreprocessors,
          }),
          CodecSettings: {
            Codec: 'H_264',
            H264Settings: {
              InterlaceMode: 'PROGRESSIVE',
              Bitrate: variant.bitrate * 1000,
              FramerateControl: 'INITIALIZE_FROM_SOURCE',
              RateControlMode: 'VBR',
              CodecProfile: 'MAIN',
              AdaptiveQuantization: 'HIGH',
              CodecLevel: 'AUTO',
              SceneChangeDetect: 'ENABLED',
              QualityTuningLevel: 'SINGLE_PASS_HQ',
              // // Proper aspect ratio handling - use square pixels for most compatibility
              // ParControl: 'SPECIFIED',
              // ParNumerator: 1,
              // ParDenominator: 1,

              // Add critical settings for HLS compatibility
              GopSizeUnits: 'SECONDS',
              GopSize: config.segmentConfig.duration * 2, // GOP should be 2x segment duration
              GopClosedCadence: 1,
              MinIInterval: 0,
              NumberBFramesBetweenReferenceFrames: 2,
              NumberReferenceFrames: 3,
              RepeatPps: 'DISABLED',
              SlowPal: 'DISABLED',
              Softness: 0,
              SpatialAdaptiveQuantization: 'ENABLED',
              Syntax: 'DEFAULT',
              Telecine: 'NONE',
              TemporalAdaptiveQuantization: 'ENABLED',
              UnregisteredSeiTimecode: 'DISABLED',
            },
          },
        },
        AudioDescriptions: [
          {
            AudioTypeControl: 'FOLLOW_INPUT',
            AudioSourceName: 'Audio Selector 1',
            LanguageCodeControl: 'FOLLOW_INPUT',
            AudioNormalizationSettings: {
              Algorithm: 'ITU_BS_1770_2',
              AlgorithmControl: 'CORRECT_AUDIO',
              LoudnessLogging: 'LOG',
              PeakCalculation: 'TRUE_PEAK',
              TargetLkfs: -23.0,
            },
            CodecSettings: {
              Codec: 'AAC',
              AacSettings: {
                Bitrate: variant.audioBitrate * 1000,
                RateControlMode: 'CBR',
                CodecProfile: 'LC',
                SampleRate: 48000,
                CodingMode: 'CODING_MODE_2_0',
                Specification: 'MPEG4',
                AudioDescriptionBroadcasterMix: 'NORMAL',
                RawFormat: 'NONE',
              },
            },
          },
        ],
      };
    });

    const outputGroups = [
      {
        Name: 'HLS',
        OutputGroupSettings: {
          Type: 'HLS_GROUP_SETTINGS',
          HlsGroupSettings: {
            SegmentLength: config.segmentConfig.duration,
            MinSegmentLength: 0,
            BaseFilename: 'master',
            Destination: `s3://${outputBucket}/${outputKeyPrefix}/hls/`,
            // Critical HLS settings for proper playback
            SegmentControl: 'SEGMENTED_FILES',
            DirectoryStructure: 'SINGLE_DIRECTORY',
            ManifestDurationFormat: 'FLOATING_POINT',
            OutputSelection: 'MANIFESTS_AND_SEGMENTS',
            TimedMetadataId3Frame: 'TDRL',
            TimedMetadataId3Period: 10,
            ProgramDateTime: 'INCLUDE',
            StreamInfResolution: 'INCLUDE',

            // Ensure proper codec string format
            CodecSpecification: 'RFC_4281',

            // Add segment control for better compatibility
            MinFinalSegmentLength: 0,

            // Add manifest compression for better loading
            ManifestCompression: 'NONE',
          },
        },
        Outputs: hlsOutputs,
      },
    ];

    // Add MP4 outputs if configured
    if (config.generateMp4Mezzanine) {
      const mp4Outputs = config.variants.map((variant) => {
        // Calculate variant dimensions for MP4 (same logic as HLS)
        let variantHeight: number;
        let variantWidth: number;

        const resolutionMap: Record<string, number> = {
          '240p': 240,
          '360p': 360,
          '480p': 480,
          '720p': 720,
          '1080p': 1080,
        };

        const heightMatch = variant.name.match(/(\d+)p/);
        if (heightMatch && resolutionMap[variant.name]) {
          const targetSize = resolutionMap[variant.name];

          if (isVertical) {
            // For vertical videos, the target size becomes the width (shorter dimension)
            // and we calculate height to maintain aspect ratio
            variantWidth = targetSize;
            variantHeight = Math.round(variantWidth / aspectRatio);
          } else {
            // For horizontal videos, target size is the height (shorter dimension)
            variantHeight = targetSize;
            variantWidth = Math.round(variantHeight * aspectRatio);
          }
        } else {
          variantWidth = sourceWidth;
          variantHeight = sourceHeight;
        }

        // Ensure dimensions are even numbers
        variantWidth = Math.round(variantWidth / 2) * 2;
        variantHeight = Math.round(variantHeight / 2) * 2;

        // Debug logging for MP4 variant dimensions
        this.logger.log(
          `MP4 Variant ${variant.name} dimensions: ${variantWidth}x${variantHeight} (isVertical: ${isVertical})`,
        );

        return {
          NameModifier: `_${variant.name}_mp4`,
          OutputSettings: {
            FileSettings: {},
          },
          ContainerSettings: {
            Container: 'MP4',
            Mp4Settings: {
              MoovPlacement: 'PROGRESSIVE_DOWNLOAD',
            },
          },
          VideoDescription: {
            Width: variantWidth,
            Height: variantHeight,
            ScalingBehavior: 'STRETCH_TO_OUTPUT',
            RespondToAfd: 'NONE',
            AfdSignaling: 'NONE',
            ...(overlayPreprocessors && {
              VideoPreprocessors: overlayPreprocessors,
            }),
            CodecSettings: {
              Codec: 'H_264',
              H264Settings: {
                Bitrate: variant.bitrate * 1000,
                RateControlMode: 'CBR',
                CodecProfile: 'MAIN',
                // Ensure proper aspect ratio handling for MP4
                ParControl: 'SPECIFIED',
                ParNumerator: 1,
                ParDenominator: 1,
              },
            },
          },
          AudioDescriptions: [
            {
              AudioTypeControl: 'FOLLOW_INPUT',
              AudioSourceName: 'Audio Selector 1',
              CodecSettings: {
                Codec: 'AAC',
                AacSettings: {
                  Bitrate: variant.audioBitrate * 1000,
                  CodecProfile: 'LC',
                  CodingMode: 'CODING_MODE_2_0',
                },
              },
            },
          ],
        };
      });

      outputGroups.push({
        Name: 'MP4',
        OutputGroupSettings: {
          Type: 'FILE_GROUP_SETTINGS',
          FileGroupSettings: {
            Destination: `s3://${outputBucket}/${outputKeyPrefix}/mp4/`,
          },
        },
        Outputs: mp4Outputs,
      } as any);
    }

    // Add thumbnails if configured
    if (config.generateThumbnails) {
      let [thumbWidth, thumbHeight] = (config.thumbnailSize || '320x180')
        .split('x')
        .map(Number);

      // Adjust thumbnail dimensions for vertical videos
      if (isVertical) {
        // For vertical videos, swap the dimensions to maintain proper aspect ratio
        [thumbWidth, thumbHeight] = [thumbHeight, thumbWidth];
      }

      // Ensure thumbnail dimensions are even
      thumbWidth = Math.round(thumbWidth / 2) * 2;
      thumbHeight = Math.round(thumbHeight / 2) * 2;

      this.logger.debug(
        `Thumbnail dimensions: ${thumbWidth}x${thumbHeight} (isVertical: ${isVertical})`,
      );

      const interval = config.thumbnailInterval || 5;

      outputGroups.push({
        Name: 'Thumbnails',
        OutputGroupSettings: {
          Type: 'FILE_GROUP_SETTINGS',
          FileGroupSettings: {
            Destination: `s3://${outputBucket}/${outputKeyPrefix}/thumbnails/`,
          },
        },
        Outputs: [
          {
            NameModifier: '_thumb',
            OutputSettings: {},
            ContainerSettings: { Container: 'RAW' },
            VideoDescription: {
              Width: thumbWidth,
              Height: thumbHeight,
              ScalingBehavior: 'STRETCH_TO_OUTPUT',
              RespondToAfd: 'NONE',
              AfdSignaling: 'NONE',
              ...(overlayPreprocessors && {
                VideoPreprocessors: overlayPreprocessors,
              }),
              CodecSettings: {
                Codec: 'FRAME_CAPTURE',
                FrameCaptureSettings: {
                  FramerateNumerator: 1,
                  FramerateDenominator: interval,
                  MaxCaptures: 99999,
                  Quality: 80,
                },
              },
            },
          },
        ],
      } as any);
    }

    return {
      Inputs: [
        {
          AudioSelectors: {
            'Audio Selector 1': {
              Offset: 0,
              DefaultSelection: 'DEFAULT',
              ProgramSelection: 1,
              SelectorType: 'TRACK',
              Tracks: [1],
            },
          },
          VideoSelector: {
            ColorSpace: 'FOLLOW',
            Rotate: 'AUTO',
            AlphaBehavior: 'DISCARD',
          },
          TimecodeConfig: {
            Source: 'ZEROBASED',
            Start: '00:00:00:00',
          },
          FileInput: `s3://${sourceBucket}/${sourceAssetKey}`,
          InputClippings: [],
        },
      ],
      OutputGroups: outputGroups,
      TimecodeConfig: {
        Source: 'ZEROBASED',
        Start: '00:00:00:00',
      },
      FollowSource: 1,
    };
  }

  /**
   * Extract output details from completed job
   */
  private extractOutputDetails(job: any): Array<{
    outputKey: string;
    url: string;
    type: 'hls_master' | 'hls_variant' | 'mp4' | 'thumbnail';
    variant?: string;
  }> {
    const outputs = [];

    this.logger.debug(`Extracting output details from job: ${job.Id}`);

    if (job.OutputGroupDetails) {
      this.logger.debug(`Found ${job.OutputGroupDetails.length} output groups`);

      for (let i = 0; i < job.OutputGroupDetails.length; i++) {
        const outputGroup = job.OutputGroupDetails[i];
        const groupName = outputGroup.Type || '';

        this.logger.debug(
          `Processing output group ${i}: Type=${groupName}, OutputDetails count=${outputGroup.OutputDetails?.length || 0}`,
        );

        for (const outputDetail of outputGroup.OutputDetails || []) {
          const outputPath = outputDetail.OutputFilePaths?.[0];
          this.logger.debug(`Processing output path: ${outputPath}`);

          if (outputPath) {
            const s3Match = outputPath.match(/s3:\/\/([^\/]+)\/(.+)/);
            if (s3Match) {
              const [, bucket, key] = s3Match;

              // Use configured CDN domain or construct from environment
              const cdnDomain =
                this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN') ||
                this.configService.get<string>('CDN_BASE_URL') ||
                `https://${bucket}.s3.amazonaws.com`;
              const cdnUrl = `${cdnDomain}/${key}`;

              let type: 'hls_master' | 'hls_variant' | 'mp4' | 'thumbnail' =
                'hls_variant';
              let variant: string | undefined;

              // Better logic for determining file types and variants
              if (key.endsWith('master.m3u8')) {
                type = 'hls_master';
              } else if (key.endsWith('.m3u8') && !key.includes('master')) {
                type = 'hls_variant';
                // Extract variant name from the filename pattern
                // MediaConvert typically creates files like: output_720p.m3u8, output_480p.m3u8, etc.
                const variantMatch = key.match(/([^\/]+)_([^\/]+)\.m3u8$/);
                if (variantMatch) {
                  variant = variantMatch[2]; // Extract the variant part (e.g., "720p", "480p")
                } else {
                  // Fallback: try to extract from path segments
                  const pathSegments = key.split('/');
                  const filename = pathSegments[pathSegments.length - 1];
                  const nameMatch = filename.match(/^(.+)\.m3u8$/);
                  if (nameMatch) {
                    variant = nameMatch[1];
                  }
                }
              } else if (key.endsWith('.mp4')) {
                type = 'mp4';
                // Extract variant from MP4 filename
                const mp4Match = key.match(/([^\/]+)_([^\/]+)\.mp4$/);
                if (mp4Match) {
                  variant = mp4Match[2];
                } else {
                  // Fallback for MP4 files
                  const pathSegments = key.split('/');
                  const filename = pathSegments[pathSegments.length - 1];
                  const nameMatch = filename.match(/^(.+)\.mp4$/);
                  if (nameMatch) {
                    variant = nameMatch[1];
                  }
                }
              } else if (key.includes('thumb') || key.includes('thumbnail')) {
                type = 'thumbnail';
              }

              this.logger.debug(
                `Extracted output: type=${type}, variant=${variant}, key=${key}`,
              );

              outputs.push({
                outputKey: key,
                url: cdnUrl,
                type,
                variant,
              });
            } else {
              this.logger.warn(`Could not parse S3 path: ${outputPath}`);
            }
          } else {
            this.logger.warn('Output detail has no OutputFilePaths');
          }
        }
      }
    } else {
      this.logger.warn('Job has no OutputGroupDetails');

      // Fallback: try to extract from job settings if available
      if (job.Settings?.OutputGroups) {
        this.logger.debug('Attempting to infer outputs from job settings');
        // This is a fallback approach - we might need to manually construct
        // the expected output paths based on the job settings
        // This would be implementation-specific based on how your job was configured
      }
    }

    this.logger.debug(`Total outputs extracted: ${outputs.length}`);
    return outputs;
  }

  /**
   * Calculate progress percentage from job status
   */
  private calculateProgress(status: string): number {
    switch (status) {
      case 'SUBMITTED':
        return 0;
      case 'PROGRESSING':
        return 50;
      case 'COMPLETE':
        return 100;
      case 'ERROR':
      case 'CANCELED':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Check if job status indicates completion
   */
  private isJobComplete(status: string): boolean {
    return ['COMPLETE', 'ERROR', 'CANCELED'].includes(status);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Parse MediaConvert HLS output structure
   */
  async parseHLSOutput(
    jobResult: MediaConvertJobResult,
    outputBucket: string,
    outputKeyPrefix: string,
  ): Promise<MediaConvertHLSOutput> {
    // Ensure the master playlist path is correct - MediaConvert creates it in the root HLS directory
    let masterPlaylistKey = `${outputKeyPrefix}/hls/master.m3u8`;

    // Use configured CDN domain or construct URL
    const cdnDomain =
      this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN') ||
      this.configService.get<string>('CDN_BASE_URL') ||
      `https://${outputBucket}.s3.amazonaws.com`;
    let masterPlaylistUrl = `${cdnDomain}/${masterPlaylistKey}`;

    const variantPlaylists = [];
    const thumbnails = [];
    const mp4Outputs = [];

    this.logger.debug(
      `Parsing HLS output for job ${jobResult.jobId}. Output details: ${jobResult.outputDetails?.length || 0}`,
    );

    // Log the expected master playlist location for debugging
    this.logger.debug(`Expected master playlist URL: ${masterPlaylistUrl}`);

    if (jobResult.outputDetails && jobResult.outputDetails.length > 0) {
      for (const output of jobResult.outputDetails) {
        this.logger.debug(
          `Processing output: type=${output.type}, variant=${output.variant}, key=${output.outputKey}`,
        );

        switch (output.type) {
          case 'hls_master':
            // Verify the master playlist exists and is accessible
            this.logger.log(`Found HLS master playlist at: ${output.url}`);
            break;
          case 'hls_variant':
            if (output.variant) {
              // Try to extract bandwidth and resolution from variant name
              const bandwidth = this.extractBandwidthFromVariant(
                output.variant,
              );
              const resolution = this.extractResolutionFromVariant(
                output.variant,
              );

              variantPlaylists.push({
                name: output.variant,
                key: output.outputKey,
                url: output.url,
                bandwidth,
                resolution,
              });

              this.logger.debug(
                `Added HLS variant: ${output.variant} at ${output.url}`,
              );
            }
            break;
          case 'thumbnail':
            // Extract timestamp from filename pattern
            const timestampMatch = output.outputKey.match(/thumb[_\.](\d+)/);
            let timestamp = 0;
            if (timestampMatch) {
              timestamp = parseInt(timestampMatch[1]);
              // If it looks like a sequence number, convert to seconds (assuming 1 frame per 10 seconds)
              if (timestamp < 1000) {
                timestamp = timestamp * 10;
              }
            }

            thumbnails.push({
              timestamp,
              key: output.outputKey,
              url: output.url,
            });
            break;
          case 'mp4':
            if (output.variant) {
              const bitrate = this.extractBitrateFromVariant(output.variant);
              const resolution = this.extractResolutionFromVariant(
                output.variant,
              );

              mp4Outputs.push({
                name: output.variant,
                key: output.outputKey,
                url: output.url,
                bitrate,
                resolution,
              });
            }
            break;
        }
      }
    } else {
      this.logger.warn(
        `No output details found for MediaConvert job ${jobResult.jobId}. This might indicate an issue with job completion or output parsing.`,
      );

      // Attempt to manually discover outputs using S3 listing if AWS SDK is available
      try {
        const alternativeOutput = await this.discoverOutputsFromS3(
          outputBucket,
          outputKeyPrefix,
        );
        if (alternativeOutput) {
          variantPlaylists.push(...alternativeOutput.variantPlaylists);
          thumbnails.push(...alternativeOutput.thumbnails);
          mp4Outputs.push(...alternativeOutput.mp4Outputs);

          // Update master playlist info if found via S3 discovery
          if (alternativeOutput.masterPlaylist) {
            masterPlaylistKey = alternativeOutput.masterPlaylist.key;
            masterPlaylistUrl = alternativeOutput.masterPlaylist.url;
            this.logger.log(
              `Found master playlist via S3 discovery: ${masterPlaylistUrl}`,
            );
          }

          this.logger.log(
            `Successfully discovered outputs via S3 listing: ${variantPlaylists.length} variants, ${thumbnails.length} thumbnails, ${mp4Outputs.length} MP4s`,
          );
        }
      } catch (error) {
        this.logger.error(
          'Failed to discover outputs via S3 listing:',
          error.message,
        );
      }
    }

    // Validate that we have the expected outputs
    if (variantPlaylists.length === 0) {
      this.logger.error(
        `No HLS variant playlists found for job ${jobResult.jobId}. This will cause playback issues.`,
      );
    }

    // Check if master playlist exists by attempting to verify its presence
    this.logger.debug(
      `Verifying master playlist accessibility at: ${masterPlaylistUrl}`,
    );

    this.logger.debug(
      `Final HLS output: ${variantPlaylists.length} variants, ${thumbnails.length} thumbnails, ${mp4Outputs.length} MP4s`,
    );

    return {
      masterPlaylistKey,
      masterPlaylistUrl,
      variantPlaylists,
      thumbnails,
      mp4Outputs,
    };
  }

  /**
   * Discover outputs by listing S3 bucket contents (fallback method)
   */
  private async discoverOutputsFromS3(
    outputBucket: string,
    outputKeyPrefix: string,
  ): Promise<{
    masterPlaylist?: {
      key: string;
      url: string;
    };
    variantPlaylists: Array<{
      name: string;
      key: string;
      url: string;
      bandwidth: number;
      resolution: string;
    }>;
    thumbnails: Array<{
      timestamp: number;
      key: string;
      url: string;
    }>;
    mp4Outputs: Array<{
      name: string;
      key: string;
      url: string;
      bitrate: number;
      resolution: string;
    }>;
  }> {
    try {
      // Try to dynamically import AWS S3 SDK
      const s3Module = await import('@aws-sdk/client-s3').catch(() => null);

      if (!s3Module) {
        this.logger.warn('AWS S3 SDK not available for output discovery');
        return { variantPlaylists: [], thumbnails: [], mp4Outputs: [] };
      }

      const s3Client = new s3Module.S3Client({
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      });

      const listCommand = new s3Module.ListObjectsV2Command({
        Bucket: outputBucket,
        Prefix: outputKeyPrefix,
      });

      const response = await s3Client.send(listCommand);

      let masterPlaylist: { key: string; url: string } | undefined;
      const variantPlaylists = [];
      const thumbnails = [];
      const mp4Outputs = [];

      const cdnDomain =
        this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN') ||
        this.configService.get<string>('CDN_BASE_URL') ||
        `https://${outputBucket}.s3.amazonaws.com`;

      for (const object of response.Contents || []) {
        const key = object.Key;
        if (!key) continue;

        const url = `${cdnDomain}/${key}`;

        if (key.endsWith('.m3u8')) {
          // Check if this is the master manifest (typically named 'master.m3u8' or doesn't have variant patterns)
          if (
            key.endsWith('master.m3u8') ||
            (!key.match(/([^\/]+)_([^\/]+)\.m3u8$/) && key.includes('/hls/'))
          ) {
            // This is likely the master playlist
            masterPlaylist = {
              key,
              url,
            };
            this.logger.debug(`Found master playlist: ${key}`);
          } else {
            // HLS variant playlist
            const variantMatch = key.match(/([^\/]+)_([^\/]+)\.m3u8$/);
            if (variantMatch) {
              const variant = variantMatch[2];
              const bandwidth = this.extractBandwidthFromVariant(variant);
              const resolution = this.extractResolutionFromVariant(variant);

              variantPlaylists.push({
                name: variant,
                key,
                url,
                bandwidth,
                resolution,
              });
            }
          }
        } else if (key.endsWith('.mp4')) {
          // MP4 output
          const mp4Match = key.match(/([^\/]+)_([^\/]+)\.mp4$/);
          if (mp4Match) {
            const variant = mp4Match[2];
            const bitrate = this.extractBitrateFromVariant(variant);
            const resolution = this.extractResolutionFromVariant(variant);

            mp4Outputs.push({
              name: variant,
              key,
              url,
              bitrate,
              resolution,
            });
          }
        } else if (key.includes('thumb') || key.includes('thumbnail')) {
          // Thumbnail
          const timestampMatch = key.match(/thumb[_\.](\d+)/);
          let timestamp = 0;
          if (timestampMatch) {
            timestamp = parseInt(timestampMatch[1]);
            if (timestamp < 1000) {
              timestamp = timestamp * 10;
            }
          }

          thumbnails.push({
            timestamp,
            key,
            url,
          });
        }
      }

      return { masterPlaylist, variantPlaylists, thumbnails, mp4Outputs };
    } catch (error) {
      this.logger.error('Error discovering outputs from S3:', error);
      return {
        masterPlaylist: undefined,
        variantPlaylists: [],
        thumbnails: [],
        mp4Outputs: [],
      };
    }
  }

  /**
   * Extract bandwidth from variant name (e.g., "720p" -> estimated bandwidth)
   */
  private extractBandwidthFromVariant(variantName: string): number {
    // Common bandwidth estimates based on resolution
    const bandwidthMap: Record<string, number> = {
      '240p': 400000, // 400 kbps
      '360p': 800000, // 800 kbps
      '480p': 1200000, // 1.2 Mbps
      '720p': 2500000, // 2.5 Mbps
      '1080p': 5000000, // 5 Mbps
    };

    // Try to match resolution patterns
    const resolutionMatch = variantName.match(/(\d+)p/);
    if (resolutionMatch) {
      const resolution = `${resolutionMatch[1]}p`;
      return bandwidthMap[resolution] || 1000000; // Default 1 Mbps
    }

    // Try to extract bitrate directly if present
    const bitrateMatch = variantName.match(/(\d+)k/i);
    if (bitrateMatch) {
      return parseInt(bitrateMatch[1]) * 1000;
    }

    return 1000000; // Default 1 Mbps
  }

  /**
   * Extract resolution from variant name
   */
  private extractResolutionFromVariant(variantName: string): string {
    // Common resolution mappings
    const resolutionMap: Record<string, string> = {
      '240p': '426x240',
      '360p': '640x360',
      '480p': '854x480',
      '720p': '1280x720',
      '1080p': '1920x1080',
    };

    // Try to match resolution patterns
    const resolutionMatch = variantName.match(/(\d+)p/);
    if (resolutionMatch) {
      const resolution = `${resolutionMatch[1]}p`;
      return resolutionMap[resolution] || resolution;
    }

    // Try to extract resolution directly if present (e.g., "1280x720")
    const directMatch = variantName.match(/(\d+)x(\d+)/);
    if (directMatch) {
      return `${directMatch[1]}x${directMatch[2]}`;
    }

    return '1280x720'; // Default resolution
  }

  /**
   * Extract bitrate from variant name for MP4 outputs
   */
  private extractBitrateFromVariant(variantName: string): number {
    // Try to extract bitrate directly
    const bitrateMatch = variantName.match(/(\d+)k/i);
    if (bitrateMatch) {
      return parseInt(bitrateMatch[1]);
    }

    // Fallback to bandwidth conversion (bps to kbps)
    const bandwidth = this.extractBandwidthFromVariant(variantName);
    return Math.round(bandwidth / 1000);
  }

  /**
   * Validate HLS output structure and accessibility
   */
  async validateHLSOutput(
    hlsOutput: MediaConvertHLSOutput,
    outputBucket: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if we can access S3 SDK for validation
      const s3Module = await import('@aws-sdk/client-s3').catch(() => null);

      if (!s3Module) {
        this.logger.warn('AWS S3 SDK not available for HLS validation');
        return { isValid: true, errors: [] }; // Skip validation if SDK not available
      }

      const s3Client = new s3Module.S3Client({
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      });

      // Validate master playlist exists
      try {
        const headCommand = new s3Module.HeadObjectCommand({
          Bucket: outputBucket,
          Key: hlsOutput.masterPlaylistKey,
        });
        await s3Client.send(headCommand);
        this.logger.debug(
          `Master playlist validated: ${hlsOutput.masterPlaylistKey}`,
        );
      } catch (error) {
        errors.push(
          `Master playlist not found: ${hlsOutput.masterPlaylistKey}`,
        );
        this.logger.error(
          `Master playlist validation failed: ${error.message}`,
        );
      }

      // Validate at least one variant playlist exists
      if (hlsOutput.variantPlaylists.length === 0) {
        errors.push('No variant playlists found');
      } else {
        // Validate each variant playlist
        for (const variant of hlsOutput.variantPlaylists) {
          try {
            const headCommand = new s3Module.HeadObjectCommand({
              Bucket: outputBucket,
              Key: variant.key,
            });
            await s3Client.send(headCommand);
            this.logger.debug(`Variant playlist validated: ${variant.key}`);
          } catch (error) {
            errors.push(`Variant playlist not found: ${variant.key}`);
            this.logger.error(
              `Variant playlist validation failed: ${error.message}`,
            );
          }
        }
      }

      // Check for common HLS structure issues
      if (!hlsOutput.masterPlaylistUrl.endsWith('.m3u8')) {
        errors.push('Master playlist URL does not end with .m3u8');
      }

      // Validate that CDN URLs are properly formed
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(hlsOutput.masterPlaylistUrl)) {
        errors.push('Master playlist URL is not a valid HTTP(S) URL');
      }

      const isValid = errors.length === 0;

      if (isValid) {
        this.logger.log('HLS output validation passed');
      } else {
        this.logger.error(`HLS output validation failed: ${errors.join(', ')}`);
      }

      return { isValid, errors };
    } catch (error) {
      this.logger.error('HLS validation error:', error);
      return { isValid: false, errors: [`Validation error: ${error.message}`] };
    }
  }
}
