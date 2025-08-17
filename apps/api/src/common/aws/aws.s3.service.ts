import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { customAlphabet } from 'nanoid';
import { AssetTypeValue } from 'src/modules/asset/entities/asset.entity';

const nanoid = customAlphabet('1234567890abcdef', 10);

export interface SignedUrlResponse {
  uploadUrl: string;
  key: string;
  bucket: string;
  cdnUrl: string;
  cdnRootUrl: string;
}

export interface SignedDownloadUrlResponse {
  downloadUrl: string;
  expiresIn: number;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly cloudFrontDomain: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.cloudFrontDomain = this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN');

    this.s3Client = new S3Client({
      region: this.region,
    });

    if (!this.bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME environment variable is required');
    }
  }
  public getS3Config() {
    return {
      region: this.region,
      bucketName: this.bucketName,
      cdnRootUrl: this.cloudFrontDomain
        ? `https://${this.cloudFrontDomain}`
        : undefined,
    };
  }
  /**
   * Generate a signed URL for uploading files to S3
   */
  async generateUploadUrl({
    uniqueurn,
    fileName,
    mimeType,
    userurn,
    assetType,
  }: {
    uniqueurn?: string;
    fileName: string;
    mimeType: string;
    userurn: string;
    assetType: AssetTypeValue;
  }): Promise<SignedUrlResponse> {
    const fileExtension = fileName.split('.').pop();
    let uniqueKey: string;
    if (uniqueurn) {
      // If a unique URN is provided, use it as the S3 key
      uniqueKey = `${userurn}/${assetType}/${uniqueurn}.${fileExtension}`;
    } else {
      // Otherwise, generate a new unique key
      uniqueKey = `${userurn}/${assetType}/${nanoid()}.${fileExtension}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uniqueKey,
      ContentType: mimeType,
      Metadata: {
        userurn,
        asseturn: uniqueurn,
        assetType,
        originalFileName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      const cdnUrl = this.getCloudFrontUrl(uniqueKey);

      return {
        uploadUrl,
        key: uniqueKey,
        bucket: this.bucketName,
        cdnUrl,
        cdnRootUrl: this.getS3Config().cdnRootUrl,
      };
    } catch (error) {
      this.logger.error('Failed to generate upload URL', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate a signed URL for downloading/viewing files from S3
   */
  async generateDownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<SignedDownloadUrlResponse> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return {
        downloadUrl,
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Failed to generate download URL', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Successfully deleted file: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get the CloudFront URL for a given S3 key
   */
  getCloudFrontUrl(key: string): string {
    if (this.cloudFrontDomain) {
      return `https://${this.cloudFrontDomain}/${key}`;
    } else {
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    }
  }

  /**
   * Extract S3 key from a full S3 or CloudFront URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // Handle CloudFront URLs
      if (this.cloudFrontDomain && urlObj.hostname === this.cloudFrontDomain) {
        return urlObj.pathname.substring(1); // Remove leading '/'
      }

      // Handle direct S3 URLs
      if (
        urlObj.hostname.includes('s3') &&
        urlObj.hostname.includes('amazonaws.com')
      ) {
        return urlObj.pathname.substring(1); // Remove leading '/'
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate that a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata for key: ${key}`, error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * Upload a file directly to S3 from buffer
   */
  async uploadFile({
    buffer,
    fileName,
    mimeType,
    userurn,
    assetType = 'image',
    uniqueKey,
    metadata,
  }: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    userurn: string;
    assetType?: AssetTypeValue;
    uniqueKey?: string;
    metadata: any;
  }): Promise<{ key: string; cdnUrl: string; region: string; bucket: string, cdnRootUrl: string }> {
    const fileExtension = fileName.split('.').pop();
    if (!uniqueKey) {
      uniqueKey = `${assetType}s/${userurn}/${nanoid()}.${fileExtension}`;
    }
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uniqueKey,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        // ...metadata,
        userurn,
        assetType,
        originalFileName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      await this.s3Client.send(command);

      const cdnUrl = this.cloudFrontDomain
        ? `https://${this.cloudFrontDomain}/${uniqueKey}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uniqueKey}`;

      const cdnRootUrl = this.getS3Config().cdnRootUrl;
      this.logger.log(`Successfully uploaded file: ${uniqueKey}`);

      return {
        key: uniqueKey,
        cdnUrl,
        cdnRootUrl: this.cloudFrontDomain,
        region: this.region,
        bucket: this.bucketName,
      };
    } catch (error) {
      this.logger.error('Failed to upload file to S3', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Safely get header value handling both string and array cases
   */
  private getHeaderValue(headers: any, headerName: string): string | null {
    const value = headers[headerName.toLowerCase()];
    if (!value) return null;

    // Handle array case (duplicate headers)
    if (Array.isArray(value)) {
      return value[0] || null;
    }

    // Handle string case
    return typeof value === 'string' ? value : null;
  }

  /**
   * Download file from S3 to a temporary location for metadata extraction
   */
  async downloadFileTemporarily(
    fileUrl: string,
    storageKey: string,
  ): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const https = await import('https');
    const http = await import('http');
    const { URL } = await import('url');

    // Create temp directory if it doesn't exist
    const tempDir = '/tmp/metadata-extraction';
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Generate temporary file path
    const fileExtension = path.extname(storageKey) || '';
    const tempFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Download file
    return new Promise((resolve, reject) => {
      const url = new URL(fileUrl);
      const protocol = url.protocol === 'https:' ? https : http;

      try {
        const request = protocol.get(fileUrl, {
          headers: {
            'User-Agent': 'Rockwell-API/1.0'
          }
        }, (response) => {
          try {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download file: ${response.statusCode}`));
              return;
            }

            const fileStream = require('fs').createWriteStream(tempFilePath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              resolve(tempFilePath);
            });

            fileStream.on('error', (error) => {
              this.logger.error('File stream error:', error);
              reject(error);
            });
          } catch (responseError) {
            this.logger.error('Response handling error:', responseError);
            reject(responseError);
          }
        });

        request.on('error', (error) => {
          this.logger.error('HTTP request error:', error);
          reject(error);
        });

        request.setTimeout(30000, () => {
          request.abort();
          reject(new Error('Download timeout'));
        });
      } catch (requestError) {
        this.logger.error('Request setup error:', requestError);
        reject(requestError);
      }
    });
  }

  /**
   * Clean up temporary file after metadata extraction
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
      this.logger.debug(`Cleaned up temporary file: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to clean up temporary file ${filePath}:`, error);
    }
  }
}
