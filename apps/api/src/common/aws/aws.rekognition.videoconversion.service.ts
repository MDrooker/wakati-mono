import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './aws.s3.service';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';

export interface VideoConversionResult {
  success: boolean;
  convertedKey?: string;
  originalKey: string;
  error?: string;
  conversionTime?: number;
  originalFormat?: string;
  targetFormat?: string;
}

export interface VideoInfo {
  format: string;
  codec: string;
  duration: number;
  size: number;
  resolution: { width: number; height: number };
  hasAudio: boolean;
  audioCodec?: string;
}

@Injectable()
export class VideoConversionService {
  private readonly logger = new Logger(VideoConversionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Convert video to Rekognition-compatible format (MP4 with H.264 codec)
   */
  async convertVideoForRekognition(
    bucketName: string,
    objectKey: string,
    userurn: string,
  ): Promise<VideoConversionResult> {
    const startTime = Date.now();
    let tempInputFile: string | null = null;
    let tempOutputFile: string | null = null;

    try {
      this.logger.log(
        `Starting video conversion for ${bucketName}/${objectKey}`,
      );

      // Step 1: Download the video from S3
      const downloadUrl = await this.s3Service.generateDownloadUrl(objectKey);
      tempInputFile = await this.downloadVideoToTemp(
        downloadUrl.downloadUrl,
        objectKey,
      );

      // Step 2: Get video information
      const videoInfo = await this.getVideoInfo(tempInputFile);
      this.logger.log(`Video info: ${JSON.stringify(videoInfo)}`);
      debugger;
      // Step 3: Check if conversion is needed
      if (this.isRekognitionCompatible(videoInfo)) {
        this.logger.log(
          `Video ${objectKey} is already compatible with Rekognition`,
        );
        return {
          success: true,
          originalKey: objectKey,
          convertedKey: objectKey, // Same file
          conversionTime: Date.now() - startTime,
          originalFormat: videoInfo.format,
          targetFormat: videoInfo.format,
        };
      }

      // Step 4: Convert the video
      tempOutputFile = await this.convertVideo(tempInputFile, videoInfo);

      // Step 5: Upload converted video back to S3
      const convertedKey = this.generateConvertedKey(objectKey);
      debugger;
      this.logger.log(
        `Uploading converted video to ${bucketName}/${convertedKey}`,
      );
      await this.uploadConvertedVideo(
        tempOutputFile,
        bucketName,
        convertedKey,
        userurn,
      );

      const conversionTime = Date.now() - startTime;
      this.logger.log(
        `Video conversion completed in ${conversionTime}ms: ${convertedKey}`,
      );

      return {
        success: true,
        originalKey: objectKey,
        convertedKey,
        conversionTime,
        originalFormat: videoInfo.format,
        targetFormat: 'mp4',
      };
    } catch (error) {
      this.logger.error(`Video conversion failed for ${objectKey}:`, error);
      return {
        success: false,
        originalKey: objectKey,
        error: error.message,
        conversionTime: Date.now() - startTime,
      };
    } finally {
      // Cleanup temporary files
      if (tempInputFile && fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
      if (tempOutputFile && fs.existsSync(tempOutputFile)) {
        fs.unlinkSync(tempOutputFile);
      }
    }
  }

  /**
   * Get video information using ffprobe
   */
  private async getVideoInfo(filePath: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      let output = '';
      let error = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe failed: ${error}`));
          return;
        }

        try {
          const probe = JSON.parse(output);
          const videoStream = probe.streams.find(
            (s) => s.codec_type === 'video',
          );
          const audioStream = probe.streams.find(
            (s) => s.codec_type === 'audio',
          );

          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          const videoInfo: VideoInfo = {
            format: probe.format.format_name.split(',')[0], // Get first format
            codec: videoStream.codec_name.toLowerCase(),
            duration: parseFloat(probe.format.duration) || 0,
            size: parseInt(probe.format.size) || 0,
            resolution: {
              width: videoStream.width || 0,
              height: videoStream.height || 0,
            },
            hasAudio: !!audioStream,
            audioCodec: audioStream?.codec_name?.toLowerCase(),
          };

          resolve(videoInfo);
        } catch (parseError) {
          reject(
            new Error(`Failed to parse ffprobe output: ${parseError.message}`),
          );
        }
      });
    });
  }

  /**
   * Check if video is compatible with Rekognition requirements
   */
  private isRekognitionCompatible(videoInfo: VideoInfo): boolean {
    // Rekognition requirements:
    // - Format: MP4 or MOV
    // - Video codec: H.264
    // - Audio codec: AAC (if audio present)

    const compatibleFormats = ['mp4', 'mov', 'quicktime'];
    const isFormatOk = compatibleFormats.some((format) =>
      videoInfo.format.toLowerCase().includes(format),
    );

    const isVideoCodecOk = videoInfo.codec === 'h264';
    const isAudioCodecOk =
      !videoInfo.hasAudio || videoInfo.audioCodec === 'aac';

    return isFormatOk && isVideoCodecOk && isAudioCodecOk;
  }

  /**
   * Convert video to Rekognition-compatible format using ffmpeg
   */
  private async convertVideo(
    inputPath: string,
    videoInfo: VideoInfo,
  ): Promise<string> {
    const outputPath = path.join(
      os.tmpdir(),
      `converted-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`,
    );

    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i',
        inputPath,
        '-c:v',
        'libx264', // H.264 video codec
        '-preset',
        'medium', // Balance between speed and quality
        '-crf',
        '23', // Constant rate factor (quality)
        '-movflags',
        '+faststart', // Optimize for web streaming
        '-f',
        'mp4', // MP4 format
      ];

      // Handle audio
      if (videoInfo.hasAudio) {
        if (videoInfo.audioCodec === 'aac') {
          ffmpegArgs.push('-c:a', 'copy'); // Copy if already AAC
        } else {
          ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k'); // Convert to AAC
        }
      } else {
        ffmpegArgs.push('-an'); // No audio
      }

      // Add output file
      ffmpegArgs.push(outputPath);

      this.logger.log(`Running ffmpeg with args: ${ffmpegArgs.join(' ')}`);

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
        // Log progress (optional)
        const progressMatch = data.toString().match(/time=(\d+:\d+:\d+\.\d+)/);
        if (progressMatch) {
          this.logger.debug(`Conversion progress: ${progressMatch[1]}`);
        }
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg failed with code ${code}: ${error}`));
          return;
        }

        if (!fs.existsSync(outputPath)) {
          reject(new Error('Converted file was not created'));
          return;
        }

        resolve(outputPath);
      });
    });
  }

  /**
   * Download video from URL to temporary file
   */
  private async downloadVideoToTemp(
    url: string,
    originalKey: string,
  ): Promise<string> {
    const tempPath = path.join(
      os.tmpdir(),
      `download-${Date.now()}-${path.basename(originalKey)}`,
    );

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));

    return tempPath;
  }

  /**
   * Upload converted video to S3
   */
  private async uploadConvertedVideo(
    filePath: string,
    bucketName: string,
    key: string,
    userurn: string,
  ): Promise<void> {
    const buffer = fs.readFileSync(filePath);
    debugger;
    await this.s3Service.uploadFile({
      buffer,
      uniqueKey: key,
      fileName: path.basename(key),
      mimeType: 'video/mp4',
      userurn,
      assetType: 'video',
      metadata: null,
    });
  }

  /**
   * Generate key for converted video
   */
  private generateConvertedKey(originalKey: string): string {
    const parsedPath = path.parse(originalKey);
    const directory = parsedPath.dir;
    const name = parsedPath.name;

    return path.posix.join(directory, `${name}-converted.mp4`);
  }
}
