import { Injectable } from '@nestjs/common';
// import { AssetType } from '../../../modules/asset/entities/asset.entity';
import mime from 'mime-types';

/**
 * Validation result for media types
 */
export interface MediaTypeValidationResult {
  isValid: boolean;
  assetType?: AssetType;
  format?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Supported image formats
 */
export enum ImageFormat {
  JPEG = 'JPEG',
  JPG = 'JPG',
  PNG = 'PNG',
  GIF = 'GIF',
  WEBP = 'WEBP',
  BMP = 'BMP',
  TIFF = 'TIFF',
  HEIC = 'HEIC',
  HEIF = 'HEIF',
}

/**
 * Supported video formats
 */
export enum VideoFormat {
  MP4 = 'MP4',
  MOV = 'MOV',
  MPEG = 'MPEG',
  WEBM = 'WEBM',
  AVI = 'AVI',
  FLV = 'FLV',
  WMV = 'WMV',
  QUICKTIME = 'QUICKTIME',
}

/**
 * Video codecs
 */
export enum VideoCodec {
  H264 = 'H.264',
  H265 = 'H.265',
  VP9 = 'VP9',
  AV1 = 'AV1',
}

/**
 * Audio codecs
 */
export enum AudioCodec {
  AAC = 'AAC',
  MP3 = 'MP3',
  OPUS = 'OPUS',
  VORBIS = 'VORBIS',
}

/**
 * Service for media type validation and format mapping
 */
@Injectable()
export class MediaTypeValidationService {
  /**
   * Allowed MIME types for upload
   */
  private readonly allowedMimeTypes: string[] = [
    // Image formats
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/heic',
    // Video formats
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm',
  ];

  /**
   * Image MIME type to format mapping
   */
  private readonly imageFormatMap: Record<string, string> = {
    'image/jpeg': ImageFormat.JPEG,
    'image/jpg': ImageFormat.JPG,
    'image/png': ImageFormat.PNG,
    'image/gif': ImageFormat.GIF,
    'image/webp': ImageFormat.WEBP,
    'image/bmp': ImageFormat.BMP,
    'image/tiff': ImageFormat.TIFF,
    'image/heic': ImageFormat.HEIC,
    'image/heif': ImageFormat.HEIF,
  };

  /**
   * Image format to MIME type mapping (reverse of imageFormatMap)
   */
  private readonly formatToMimeMap: Record<string, string> = {
    [ImageFormat.JPEG]: 'image/jpeg',
    [ImageFormat.JPG]: 'image/jpeg',
    [ImageFormat.PNG]: 'image/png',
    [ImageFormat.GIF]: 'image/gif',
    [ImageFormat.WEBP]: 'image/webp',
    [ImageFormat.BMP]: 'image/bmp',
    [ImageFormat.TIFF]: 'image/tiff',
    [ImageFormat.HEIC]: 'image/heic',
    [ImageFormat.HEIF]: 'image/heif',
  };

  /**
   * Video format to MIME type mapping based on FFprobe format names
   */
  private readonly videoFormatToMimeMap: Record<string, string> = {
    'mov,mp4,m4a,3gp,3g2,mj2': 'video/mp4',
    'matroska,webm': 'video/webm',
    avi: 'video/avi',
    flv: 'video/x-flv',
    asf: 'video/x-ms-asf',
    wmv: 'video/x-ms-wmv',
    mpeg: 'video/mpeg',
    quicktime: 'video/quicktime',
  };

  /**
   * Supported video formats for AWS Rekognition
   */
  private readonly rekognitionSupportedFormats: string[] = [
    'mp4',
    'mov',
    'mpeg',
  ];

  /**
   * Supported video codecs for AWS Rekognition
   */
  private readonly rekognitionSupportedVideoCodecs: string[] = [
    'h264',
    'h.264',
  ];

  /**
   * Supported audio codecs for AWS Rekognition
   */
  private readonly rekognitionSupportedAudioCodecs: string[] = ['aac'];

  /**
   * HEIC/HEIF formats that need conversion
   */
  private readonly heicFormats: string[] = ['heic', 'heif'];

  /**
   * Supported image formats for processing
   */
  private readonly supportedImageFormats: string[] = [
    'HEIC',
    'HEIF',
    'JPEG',
    'PNG',
    'WebP',
    'GIF',
    'BMP',
    'TIFF',
  ];

  /**
   * Validate if a MIME type is allowed for upload
   */
  validateMimeType(mimeType: string): MediaTypeValidationResult {
    if (!mimeType) {
      return {
        isValid: false,
        error: 'MIME type is required',
        suggestions: ['Provide a valid MIME type'],
      };
    }

    const normalizedMimeType = mimeType.toLowerCase();

    if (!this.allowedMimeTypes.includes(normalizedMimeType)) {
      return {
        isValid: false,
        error: `Unsupported MIME type: ${mimeType}. Only images and videos are allowed.`,
        suggestions: [
          'Supported image formats: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC',
          'Supported video formats: MP4, MPEG, QuickTime, WebM',
        ],
      };
    }

    const format = this.getFormatFromMimeType(normalizedMimeType);
    return {
      isValid: true,
      format,
    };
  }

  /**
   * Determine MIME type from filename
   */
  determineMimeTypeFromFilename(filename: string): string | null {
    if (!filename) {
      return null;
    }

    const detectedMimeType = mime.lookup(filename);
    return detectedMimeType || null;
  }


  /**
   * Get format from MIME type
   */
  getFormatFromMimeType(mimeType: string): string {
    const normalizedMimeType = mimeType.toLowerCase();

    if (normalizedMimeType.startsWith('image/')) {
      return this.imageFormatMap[normalizedMimeType] || 'UNKNOWN';
    }

    // For video, we'll return the extension part
    if (normalizedMimeType.startsWith('video/')) {
      const formatPart = normalizedMimeType.split('/')[1];
      switch (formatPart) {
        case 'mp4':
          return VideoFormat.MP4;
        case 'mpeg':
          return VideoFormat.MPEG;
        case 'quicktime':
          return VideoFormat.QUICKTIME;
        case 'webm':
          return VideoFormat.WEBM;
        default:
          return formatPart.toUpperCase();
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Get MIME type from format
   */
  getMimeTypeFromFormat(format: string): string {
    const normalizedFormat = format.toLowerCase();

    // Check image formats first
    const imageFormat = Object.keys(this.formatToMimeMap).find(
      (key) => key.toLowerCase() === normalizedFormat,
    );
    if (imageFormat) {
      return this.formatToMimeMap[imageFormat];
    }

    // Check video formats
    switch (normalizedFormat) {
      case 'mp4':
        return 'video/mp4';
      case 'mov':
      case 'quicktime':
        return 'video/quicktime';
      case 'mpeg':
        return 'video/mpeg';
      case 'webm':
        return 'video/webm';
      case 'avi':
        return 'video/avi';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Determine MIME type from FFprobe format name
   */
  determineMimeTypeFromFFprobeFormat(formatName: string): string {
    return this.videoFormatToMimeMap[formatName] || 'video/unknown';
  }

  /**
   * Check if format is HEIC/HEIF and needs conversion
   */
  isHeicFormat(format: string): boolean {
    return this.heicFormats.includes(format.toLowerCase());
  }

  /**
   * Validate video format for AWS Rekognition compatibility
   */
  validateVideoFormatForRekognition(
    fileExtension: string,
  ): MediaTypeValidationResult {
    const normalizedExtension = fileExtension.toLowerCase().replace('.', '');

    if (!this.rekognitionSupportedFormats.includes(normalizedExtension)) {
      return {
        isValid: false,
        error: `Unsupported video format: ${fileExtension}. Amazon Rekognition only supports MPEG-4 (.mp4) and MOV (.mov) formats.`,
        suggestions: [
          'Convert your video to MP4 format with H.264 codec',
          'Supported formats: MP4, MOV, MPEG',
          'Required video codec: H.264',
          'Required audio codec: AAC (if audio is present)',
        ],
      };
    }

    return {
      isValid: true,
      format: normalizedExtension.toUpperCase(),
    };
  }

  /**
   * Get all allowed MIME types
   */
  getAllowedMimeTypes(): string[] {
    return [...this.allowedMimeTypes];
  }

  /**
   * Get supported image formats
   */
  getSupportedImageFormats(): string[] {
    return [...this.supportedImageFormats];
  }

  /**
   * Get supported video formats for Rekognition
   */
  getRekognitionSupportedVideoFormats(): string[] {
    return [...this.rekognitionSupportedFormats];
  }

  /**
   * Get Rekognition video format requirements
   */
  getRekognitionVideoFormatRequirements(): string[] {
    return [
      'Video Format: MPEG-4 (.mp4) or MOV (.mov)',
      'Video Codec: H.264 (required)',
      'Audio Codec: AAC (if audio is present)',
      'Maximum file size: 10GB',
      'Maximum duration: 6 hours',
      'Maximum concurrent jobs: 20 per account',
    ];
  }

  /**
   * Get recommended video settings for Rekognition
   */
  getRekognitionRecommendedSettings() {
    return {
      videoCodec: VideoCodec.H264,
      audioCodec: AudioCodec.AAC,
      container: VideoFormat.MP4,
      maxFileSize: '10GB',
      maxDuration: '6 hours',
    };
  }

  /**
   * Get supported video codecs for Rekognition
   */
  getRekognitionSupportedVideoCodecs(): string[] {
    return [...this.rekognitionSupportedVideoCodecs];
  }

  /**
   * Get supported audio codecs for Rekognition
   */
  getRekognitionSupportedAudioCodecs(): string[] {
    return [...this.rekognitionSupportedAudioCodecs];
  }
}
