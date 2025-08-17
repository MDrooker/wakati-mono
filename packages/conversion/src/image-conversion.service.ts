import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../../common/aws/s3.service';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';

export interface ImageConversionResult {
    success: boolean;
    convertedKey?: string;
    originalKey: string;
    error?: string;
    conversionTime?: number;
    originalFormat?: string;
    targetFormat?: string;
}

export interface ImageInfo {
    format: string;
    width: number;
    height: number;
    size: number;
    hasTransparency: boolean;
    colorSpace?: string;
    quality?: number;
    compression?: string;
}

export interface ImageConversionConfig {
    quality: {
        jpeg: number; // JPEG quality (1-100)
        png: number;  // PNG compression level (0-9)
        webp: number; // WebP quality (0-100)
        maxWidth?: number;
        maxHeight?: number;
    };
    timeout: {
        downloadTimeoutMs: number;
        conversionTimeoutMs: number;
        uploadTimeoutMs: number;
    };
    tempDir?: string;
}

@Injectable()
export class ImageConversionService {
    private readonly logger = new Logger(ImageConversionService.name);
    private readonly config: ImageConversionConfig;

    constructor(
        private readonly configService: ConfigService,
        private readonly s3Service: S3Service,
    ) {
        // Initialize conversion configuration with defaults
        this.config = {
            quality: {
                jpeg: this.configService.get<number>('IMAGE_JPEG_QUALITY', 85),
                png: this.configService.get<number>('IMAGE_PNG_COMPRESSION', 6),
                webp: this.configService.get<number>('IMAGE_WEBP_QUALITY', 80),
                maxWidth: this.configService.get<number>('IMAGE_MAX_WIDTH'),
                maxHeight: this.configService.get<number>('IMAGE_MAX_HEIGHT'),
            },
            timeout: {
                downloadTimeoutMs: this.configService.get<number>('IMAGE_DOWNLOAD_TIMEOUT_MS', 60000), // 1 minute
                conversionTimeoutMs: this.configService.get<number>('IMAGE_CONVERSION_TIMEOUT_MS', 300000), // 5 minutes
                uploadTimeoutMs: this.configService.get<number>('IMAGE_UPLOAD_TIMEOUT_MS', 60000), // 1 minute
            },
            tempDir: this.configService.get<string>('IMAGE_TEMP_DIR', os.tmpdir()),
        };
    }

    /**
     * Convert HEIC images to JPEG format for better compatibility
     */
    async convertHeicToJpeg(
        bucketName: string,
        objectKey: string,
        userurn: string
    ): Promise<ImageConversionResult> {
        // Input validation
        if (!bucketName?.trim()) {
            throw new Error('Bucket name is required and cannot be empty');
        }
        if (!objectKey?.trim()) {
            throw new Error('Object key is required and cannot be empty');
        }
        if (!userurn?.trim()) {
            throw new Error('User URN is required and cannot be empty');
        }

        const startTime = Date.now();
        const originalFormat = path.extname(objectKey).toLowerCase().slice(1);
        const targetFormat = 'jpeg';

        this.logger.log(`Starting HEIC to JPEG conversion for ${objectKey} in bucket ${bucketName}`);

        let tempInputPath: string | null = null;
        let tempOutputPath: string | null = null;

        try {
            // Validate input format
            if (!['heic', 'heif'].includes(originalFormat)) {
                throw new Error(`Unsupported input format: ${originalFormat}. Only HEIC/HEIF files are supported.`);
            }

            // Generate file paths
            const fileBaseName = path.basename(objectKey, path.extname(objectKey));
            const tempId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            tempInputPath = path.join(this.config.tempDir, `${tempId}-input.${originalFormat}`);
            tempOutputPath = path.join(this.config.tempDir, `${tempId}-output.${targetFormat}`);

            // Download from S3
            this.logger.log(`Downloading ${objectKey} from S3...`);
            const downloadStartTime = Date.now();
            const downloadUrl = await this.s3Service.generateDownloadUrl(objectKey);
            tempInputPath = await this.downloadImageToTemp(downloadUrl.downloadUrl, objectKey);

            const downloadTime = Date.now() - downloadStartTime;
            this.logger.log(`Downloaded ${objectKey} in ${downloadTime}ms`);

            // Convert HEIC to JPEG using ImageMagick
            this.logger.log(`Converting HEIC to JPEG...`);
            const conversionStartTime = Date.now();
            await this.runImageMagickConversion(tempInputPath, tempOutputPath);
            const conversionTime = Date.now() - conversionStartTime;
            this.logger.log(`Converted HEIC to JPEG in ${conversionTime}ms`);

            // Generate output key
            const outputKey = this.generateConvertedKey(objectKey, userurn, targetFormat);

            // Upload converted file to S3
            this.logger.log(`Uploading converted file to S3...`);
            const uploadStartTime = Date.now();
            await this.uploadConvertedFile(bucketName, outputKey, tempOutputPath, targetFormat);
            const uploadTime = Date.now() - uploadStartTime;
            this.logger.log(`Uploaded converted file in ${uploadTime}ms`);

            const totalTime = Date.now() - startTime;
            this.logger.log(`Successfully converted ${objectKey} to ${outputKey} in ${totalTime}ms`);

            return {
                success: true,
                convertedKey: outputKey,
                originalKey: objectKey,
                conversionTime: totalTime,
                originalFormat,
                targetFormat,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.logger.error(`Image conversion failed for ${objectKey}:`, error);

            return {
                success: false,
                originalKey: objectKey,
                error: errorMessage,
                originalFormat,
                targetFormat,
            };
        } finally {
            // Clean up temporary files
            await this.cleanupTempFiles([tempInputPath, tempOutputPath]);
        }
    }

    /**
     * Get image information using ImageMagick identify
     */
    async getImageInfo(bucketName: string, objectKey: string): Promise<ImageInfo> {
        this.logger.log(`Getting image info for ${objectKey} in bucket ${bucketName}`);

        let tempFilePath: string | null = null;

        try {
            // Download file to temporary location
            const downloadUrl = await this.s3Service.generateDownloadUrl(objectKey);
            tempFilePath = await this.downloadImageToTemp(downloadUrl.downloadUrl, objectKey);

            // Get image info using ImageMagick identify
            const imageInfo = await this.getImageInfoWithIdentify(tempFilePath);
            return imageInfo;

        } catch (error) {
            this.logger.error(`Failed to get image info for ${objectKey}:`, error);
            throw error;
        } finally {
            // Clean up temporary file
            if (tempFilePath) {
                await this.cleanupTempFiles([tempFilePath]);
            }
        }
    }

    /**
     * Run ImageMagick conversion
     */
    private async runImageMagickConversion(inputPath: string, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const args = [
                inputPath,
                '-quality', this.config.quality.jpeg.toString(),
                '-strip', // Remove metadata
                '-colorspace', 'sRGB',
                outputPath
            ];

            // Add resizing if configured
            if (this.config.quality.maxWidth || this.config.quality.maxHeight) {
                const maxWidth = this.config.quality.maxWidth || '';
                const maxHeight = this.config.quality.maxHeight || '';
                args.splice(-1, 0, '-resize', `${maxWidth}x${maxHeight}>`);
            }

            const magickProcess = spawn('magick', args);
            let stderr = '';

            const timeout = setTimeout(() => {
                magickProcess.kill();
                reject(new Error(`ImageMagick conversion timeout after ${this.config.timeout.conversionTimeoutMs}ms`));
            }, this.config.timeout.conversionTimeoutMs);

            magickProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            magickProcess.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ImageMagick conversion failed with code ${code}: ${stderr}`));
                }
            });

            magickProcess.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Failed to start ImageMagick: ${error.message}`));
            });
        });
    }

    /**
     * Get image information using ImageMagick identify
     */
    private async getImageInfoWithIdentify(filePath: string): Promise<ImageInfo> {
        return new Promise((resolve, reject) => {
            const identifyProcess = spawn('magick', [
                'identify',
                '-format',
                '%f|%m|%w|%h|%b|%[colorspace]|%Q|%C|%A',
                filePath
            ]);

            let stdout = '';
            let stderr = '';

            identifyProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            identifyProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            identifyProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const parts = stdout.trim().split('|');
                        const imageInfo: ImageInfo = {
                            format: parts[1] || 'unknown',
                            width: parseInt(parts[2]) || 0,
                            height: parseInt(parts[3]) || 0,
                            size: this.parseFileSize(parts[4]) || 0,
                            colorSpace: parts[5] || undefined,
                            quality: parseInt(parts[6]) || undefined,
                            compression: parts[7] || undefined,
                            hasTransparency: parts[8] === 'True',
                        };
                        resolve(imageInfo);
                    } catch (error) {
                        reject(new Error(`Failed to parse identify output: ${error.message}`));
                    }
                } else {
                    reject(new Error(`ImageMagick identify failed with code ${code}: ${stderr}`));
                }
            });

            identifyProcess.on('error', (error) => {
                reject(new Error(`Failed to start ImageMagick identify: ${error.message}`));
            });
        });
    }

    /**
     * Parse file size string (e.g., "2.5MB" -> bytes)
     */
    private parseFileSize(sizeStr: string): number {
        if (!sizeStr) return 0;
        
        const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
        const match = sizeStr.match(/^([\d.]+)([A-Z]+)$/);
        
        if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2] as keyof typeof units;
            return Math.round(value * (units[unit] || 1));
        }
        
        return parseInt(sizeStr) || 0;
    }

    /**
     * Upload converted file to S3
     */
    private async uploadConvertedFile(
        bucketName: string,
        objectKey: string,
        filePath: string,
        format: string
    ): Promise<void> {
        const buffer = await fs.promises.readFile(filePath);
        const contentType = this.getContentType(format);

        await this.s3Service.uploadFile({
            buffer,
            fileName: path.basename(objectKey),
            mimeType: contentType,
            userurn: 'system', // TODO: pass actual userurn if needed
            assetType: 'image',
            uniqueKey: objectKey,
        });
    }

    /**
     * Generate the S3 key for the converted file
     */
    private generateConvertedKey(originalKey: string, userurn: string, targetFormat: string): string {
        const parsedPath = path.parse(originalKey);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        return path.join(
            parsedPath.dir,
            'converted',
            `${parsedPath.name}-${timestamp}.${targetFormat}`
        ).replace(/\\/g, '/'); // Ensure forward slashes for S3
    }

    /**
     * Get appropriate content type for format
     */
    private getContentType(format: string): string {
        const contentTypes: Record<string, string> = {
            jpeg: 'image/jpeg',
            jpg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif',
            bmp: 'image/bmp',
            tiff: 'image/tiff',
        };

        return contentTypes[format.toLowerCase()] || 'application/octet-stream';
    }

    /**
     * Clean up temporary files
     */
    private async cleanupTempFiles(filePaths: (string | null)[]): Promise<void> {
        for (const filePath of filePaths) {
            if (filePath && fs.existsSync(filePath)) {
                try {
                    await fs.promises.unlink(filePath);
                    this.logger.debug(`Cleaned up temp file: ${filePath}`);
                } catch (error) {
                    this.logger.warn(`Failed to clean up temp file ${filePath}:`, error);
                }
            }
        }
    }

    /**
     * Download image from URL to temporary file with timeout and retry logic
     */
    private async downloadImageToTemp(url: string, originalKey: string): Promise<string> {
        const tempFilePath = path.join(
            this.config.tempDir,
            `download-${Date.now()}-${path.basename(originalKey)}`
        );

        const maxRetries = 3;
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.log(`Downloading image (attempt ${attempt}/${maxRetries}): ${originalKey}`);

                const response = await fetch(url, {
                    method: 'GET',
                    signal: AbortSignal.timeout(this.config.timeout.downloadTimeoutMs),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    const sizeInMB = parseInt(contentLength) / 1024 / 1024;
                    this.logger.log(`Downloading ${sizeInMB.toFixed(2)}MB image file`);
                }

                const buffer = await response.arrayBuffer();
                if (buffer.byteLength === 0) {
                    throw new Error('Downloaded file is empty');
                }

                await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));

                // Verify the file was written correctly
                const stats = await fs.promises.stat(tempFilePath);
                if (stats.size === 0) {
                    throw new Error('Downloaded file is empty after writing');
                }

                this.logger.log(`Successfully downloaded image: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
                return tempFilePath;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.logger.warn(`Download attempt ${attempt} failed: ${error.message}`);

                // Clean up failed attempt
                if (fs.existsSync(tempFilePath)) {
                    try {
                        await fs.promises.unlink(tempFilePath);
                    } catch (cleanupError) {
                        this.logger.warn(`Failed to cleanup temp file: ${cleanupError.message}`);
                    }
                }

                if (attempt < maxRetries) {
                    // Wait before retry with exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Failed to download image after ${maxRetries} attempts. Last error: ${lastError.message}`);
    }

    /**
     * Check if ImageMagick is available
     */
    async checkImageMagickAvailability(): Promise<{ magick: boolean; identify: boolean }> {
        const checkCommand = (command: string): Promise<boolean> => {
            return new Promise((resolve) => {
                const process = spawn(command, ['--version']);
                process.on('close', (code) => resolve(code === 0));
                process.on('error', () => resolve(false));
            });
        };

        const [magick, identify] = await Promise.all([
            checkCommand('magick'),
            checkCommand('magick identify --version'),
        ]);

        return { magick, identify };
    }
}
