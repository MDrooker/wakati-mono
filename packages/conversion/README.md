# @rockwell/conversion

Video and image conversion services for the Rockwell platform.

## Features

- **Video Conversion**: Convert videos to Rekognition-compatible formats using FFmpeg
- **Image Conversion**: Convert HEIC/HEIF images to JPEG using ImageMagick  
- **Diagnostics**: Built-in tools to check compatibility and diagnose issues
- **TypeScript Support**: Full type definitions included

## Installation

```bash
npm install @rockwell/conversion
```

## Usage

### Import the Module

```typescript
import { ConversionModule } from '@rockwell/conversion';

@Module({
  imports: [
    ConversionModule.forRoot({
      global: true, // Optional: make services globally available
    }),
  ],
})
export class AppModule {}
```

### Use the Services

```typescript
import { VideoConversionService, ImageConversionService } from '@rockwell/conversion';

@Injectable()
export class MyService {
  constructor(
    private readonly videoConversionService: VideoConversionService,
    private readonly imageConversionService: ImageConversionService,
  ) {}

  async processMedia(bucket: string, key: string, userurn: string) {
    // Convert HEIC image
    if (key.endsWith('.heic')) {
      return await this.imageConversionService.convertHeicToJpeg(bucket, key, userurn);
    }
    
    // Convert video for Rekognition
    if (key.endsWith('.mov')) {
      return await this.videoConversionService.convertVideoForRekognition(bucket, key, userurn);
    }
  }
}
```

## Dependencies

This package requires external tools to be installed:

- **FFmpeg** - For video conversion
- **ImageMagick** - For image conversion

See the main documentation for installation instructions.

## API Reference

### VideoConversionService

- `convertVideoForRekognition(bucket, key, userurn)` - Convert video to MP4/H.264
- `getVideoInfo(bucket, key)` - Extract video metadata
- `checkFfmpegAvailability()` - Check if FFmpeg is installed

### ImageConversionService  

- `convertHeicToJpeg(bucket, key, userurn)` - Convert HEIC to JPEG
- `getImageInfo(bucket, key)` - Extract image metadata
- `checkImageMagickAvailability()` - Check if ImageMagick is installed

## License

MIT
