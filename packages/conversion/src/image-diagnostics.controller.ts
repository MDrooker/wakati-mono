import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ImageConversionService } from './image-conversion.service';

@ApiTags('image-diagnostics')
@Controller('image-diagnostics')
export class ImageDiagnosticsController {
    constructor(
        private readonly imageConversionService: ImageConversionService,
    ) { }

    @Get('compatibility-check')
    @ApiOperation({
        summary: 'Check image compatibility and format information',
        description: 'Diagnose image format issues and get information about HEIC conversion capabilities'
    })
    @ApiQuery({
        name: 'bucket',
        description: 'S3 bucket name',
        example: 'my-image-bucket'
    })
    @ApiQuery({
        name: 'key',
        description: 'S3 object key (image file path)',
        example: 'images/user123/sample-image.heic'
    })
    @ApiResponse({
        status: 200,
        description: 'Image compatibility diagnostic results',
        schema: {
            type: 'object',
            properties: {
                isHeic: { type: 'boolean' },
                needsConversion: { type: 'boolean' },
                supportedFormats: { type: 'array', items: { type: 'string' } },
                conversionAvailable: { type: 'boolean' },
                imageMagickAvailable: {
                    type: 'object',
                    properties: {
                        magick: { type: 'boolean' },
                        identify: { type: 'boolean' }
                    }
                },
                imageInfo: {
                    type: 'object',
                    properties: {
                        format: { type: 'string' },
                        width: { type: 'number' },
                        height: { type: 'number' },
                        size: { type: 'number' },
                        hasTransparency: { type: 'boolean' },
                        colorSpace: { type: 'string' },
                        quality: { type: 'number' },
                        compression: { type: 'string' }
                    }
                }
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

        try {
            // Check if ImageMagick tools are available
            const imageMagickAvailable = await this.imageConversionService.checkImageMagickAvailability();

            // Get image information
            let imageInfo;
            try {
                imageInfo = await this.imageConversionService.getImageInfo(bucket, key);
            } catch (error) {
                // If we can't get image info, we might still provide some diagnostics
                imageInfo = null;
            }

            const format = imageInfo?.format?.toLowerCase() || '';
            const isHeic = ['heic', 'heif'].includes(format);
            const needsConversion = isHeic;

            return {
                isHeic,
                needsConversion,
                supportedFormats: ['HEIC', 'HEIF', 'JPEG', 'PNG', 'WebP', 'GIF', 'BMP', 'TIFF'],
                conversionAvailable: imageMagickAvailable.magick && imageMagickAvailable.identify,
                imageMagickAvailable,
                imageInfo,
                recommendations: this.getRecommendations(isHeic, imageMagickAvailable)
            };

        } catch (error) {
            throw new BadRequestException(`Failed to check image compatibility: ${error.message}`);
        }
    }

    @Get('tools-check')
    @ApiOperation({
        summary: 'Check availability of image processing tools',
        description: 'Verify that ImageMagick and other required tools are available for image conversion'
    })
    @ApiResponse({
        status: 200,
        description: 'Tools availability status',
        schema: {
            type: 'object',
            properties: {
                imageMagick: {
                    type: 'object',
                    properties: {
                        magick: { type: 'boolean' },
                        identify: { type: 'boolean' }
                    }
                },
                allToolsAvailable: { type: 'boolean' },
                missingTools: { type: 'array', items: { type: 'string' } },
                installationInstructions: { type: 'array', items: { type: 'string' } }
            }
        }
    })
    async checkTools() {
        try {
            const imageMagickAvailable = await this.imageConversionService.checkImageMagickAvailability();
            
            const missingTools = [];
            if (!imageMagickAvailable.magick) missingTools.push('ImageMagick');
            if (!imageMagickAvailable.identify) missingTools.push('ImageMagick identify');

            const allToolsAvailable = missingTools.length === 0;

            return {
                imageMagick: imageMagickAvailable,
                allToolsAvailable,
                missingTools,
                installationInstructions: this.getInstallationInstructions(missingTools)
            };

        } catch (error) {
            throw new BadRequestException(`Failed to check tools availability: ${error.message}`);
        }
    }

    private getRecommendations(isHeic: boolean, imageMagickAvailable: { magick: boolean; identify: boolean }): string[] {
        const recommendations = [];

        if (isHeic && !imageMagickAvailable.magick) {
            recommendations.push('Install ImageMagick to enable HEIC to JPEG conversion');
        }

        if (isHeic && imageMagickAvailable.magick) {
            recommendations.push('Image can be converted from HEIC to JPEG format');
        }

        if (!isHeic) {
            recommendations.push('Image is already in a compatible format, no conversion needed');
        }

        return recommendations;
    }

    private getInstallationInstructions(missingTools: string[]): string[] {
        const instructions = [];

        if (missingTools.includes('ImageMagick')) {
            instructions.push('Install ImageMagick:');
            instructions.push('  macOS: brew install imagemagick');
            instructions.push('  Ubuntu/Debian: apt-get install imagemagick');
            instructions.push('  CentOS/RHEL: yum install ImageMagick');
            instructions.push('  Windows: Download from https://imagemagick.org/script/download.php#windows');
        }

        return instructions;
    }
}
