import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './aws.s3.service';
import { RekognitionService } from './aws.rekognition.service';
import { ComprehendService } from './aws.comprehend.service';
import { CommonModule } from '../common.module';
import { MediaConvertService } from './aws.mediaconvert.service';
import { PollyService } from './aws.polly.service';

@Module({
  imports: [ConfigModule, CommonModule],
  providers: [
    S3Service,
    RekognitionService,
    ComprehendService,
    MediaConvertService,
    PollyService,
  ],
  exports: [
    S3Service,
    RekognitionService,
    ComprehendService,
    MediaConvertService,
    PollyService,
  ],
})
export class AwsModule {}
