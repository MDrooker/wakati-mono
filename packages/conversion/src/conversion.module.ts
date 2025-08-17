import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoConversionService } from './video-conversion.service';
import { VideoDiagnosticsController } from './video-diagnostics.controller';
import { ImageConversionService } from './image-conversion.service';
import { ImageDiagnosticsController } from './image-diagnostics.controller';

export interface ConversionModuleOptions {
    rekognitionService?: any;
    s3Service?: any;
    global?: boolean;
}

@Module({})
export class ConversionModule {
    static forRoot(options: ConversionModuleOptions = {}): DynamicModule {
        const providers = [VideoConversionService, ImageConversionService];

        if (options.rekognitionService) {
            providers.push({
                provide: 'REKOGNITION_SERVICE',
                useExisting: options.rekognitionService,
            });
        }

        if (options.s3Service) {
            providers.push({
                provide: 'S3_SERVICE',
                useExisting: options.s3Service,
            });
        }

        return {
            module: ConversionModule,
            imports: [ConfigModule],
            controllers: options.rekognitionService ? [VideoDiagnosticsController, ImageDiagnosticsController] : [],
            providers,
            exports: [VideoConversionService, ImageConversionService],
            global: options.global || false,
        };
    }

    static forFeature(): DynamicModule {
        return {
            module: ConversionModule,
            imports: [ConfigModule],
            providers: [VideoConversionService, ImageConversionService],
            exports: [VideoConversionService, ImageConversionService],
        };
    }
}
