import { Module } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { S3Service } from '../aws/aws.s3.service';

@Module({
  providers: [ElevenLabsService, S3Service],
  exports: [ElevenLabsService],
})
export class ElevenLabsModule {}
