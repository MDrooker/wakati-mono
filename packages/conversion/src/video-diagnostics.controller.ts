import { Controller, Get, Query, BadRequestException, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { VideoConversionService } from './video-conversion.service';

export interface RekognitionService {
    diagnoseVideoCompatibility(bucket: string, key: string): Promise<{
        isCompatible: boolean;
        issues: string[];
        solutions: string[];
        conversionAvailable: boolean;
        ffmpegAvailable?: { ffmpeg: boolean; ffprobe: boolean };
    }>;
    getVideoFormatRequirements(): string[];
}

@ApiTags('video-diagnostics')
@Controller('video-diagnostics')
export class VideoDiagnosticsController {
    constructor(
        @Inject('REKOGNITION_SERVICE') private readonly rekognitionService: RekognitionService,
        private readonly videoConversionService: VideoConversionService,
    ) { }

    @Get('compatibility-check')
    @ApiOperation({
        summary: 'Check video compatibility with Amazon Rekognition',
        description: 'Diagnose video format issues and get solutions for Rekognition compatibility'
    })
    @ApiQuery({
        name: 'bucket',
        description: 'S3 bucket name',
        example: 'my-video-bucket'
    })
    @ApiQuery({
        name: 'key',
        description: 'S3 object key (video file path)',
        example: 'videos/user123/sample-video.mov'
    })
    @ApiResponse({
        status: 200,
        description: 'Video compatibility diagnostic results',
        schema: {
            type: 'object',
            properties: {
                isCompatible: { type: 'boolean' },
                issues: { type: 'array', items: { type: 'string' } },
                solutions: { type: 'array', items: { type: 'string' } },
                conversionAvailable: { type: 'boolean' },
                ffmpegAvailable: {
                    type: 'object',
                    properties: {
                        ffmpeg: { type: 'boolean' },
                        ffprobe: { type: 'boolean' }
                    }
                },
                rekognitionRequirements: { type: 'array', items: { type: 'string' } }
            }
        }
    })
    async checkCompatibility(
        @Query('bucket') bucket: string,
        @Query('key') key: string,
    ) {
        if (!bucket || !key) {
            throw new BadRequestException('Both bucket and key parameters are required');
        }

        const diagnostic = await this.rekognitionService.diagnoseVideoCompatibility(bucket, key);
        const requirements = this.rekognitionService.getVideoFormatRequirements();

        return {
            ...diagnostic,
            rekognitionRequirements: requirements
        };
    }

    @Get('ffmpeg-status')
    @ApiOperation({
        summary: 'Check FFmpeg availability',
        description: 'Check if FFmpeg and FFprobe are installed and available for video conversion'
    })
    @ApiResponse({
        status: 200,
        description: 'FFmpeg availability status',
        schema: {
            type: 'object',
            properties: {
                ffmpeg: { type: 'boolean' },
                ffprobe: { type: 'boolean' },
                conversionSupported: { type: 'boolean' },
                installationInstructions: { type: 'array', items: { type: 'string' } }
            }
        }
    })
    async checkFFmpegStatus() {
        const availability = await this.videoConversionService.checkFFmpegAvailability();
        const instructions = this.videoConversionService.getFFmpegInstallationInstructions();

        return {
            ...availability,
            conversionSupported: availability.ffmpeg && availability.ffprobe,
            installationInstructions: instructions
        };
    }

    @Get('format-requirements')
    @ApiOperation({
        summary: 'Get Amazon Rekognition video format requirements',
        description: 'Get detailed information about video format requirements for Amazon Rekognition'
    })
    @ApiResponse({
        status: 200,
        description: 'Rekognition video format requirements',
        schema: {
            type: 'object',
            properties: {
                requirements: { type: 'array', items: { type: 'string' } },
                supportedFormats: { type: 'array', items: { type: 'string' } },
                recommendedSettings: {
                    type: 'object',
                    properties: {
                        videoCodec: { type: 'string' },
                        audioCodec: { type: 'string' },
                        container: { type: 'string' },
                        maxFileSize: { type: 'string' },
                        maxDuration: { type: 'string' }
                    }
                }
            }
        }
    })
    getFormatRequirements() {
        const requirements = this.rekognitionService.getVideoFormatRequirements();

        return {
            requirements,
            supportedFormats: ['MP4', 'MOV', 'MPEG'],
            recommendedSettings: {
                videoCodec: 'H.264',
                audioCodec: 'AAC',
                container: 'MP4',
                maxFileSize: '10GB',
                maxDuration: '6 hours'
            }
        };
    }
}
