# Video Format Support for Amazon Rekognition

This guide explains how to handle the "Unsupported codec/format" error when using Amazon Rekognition Video with your uploaded videos.

## Problem

Amazon Rekognition Video has strict requirements for video formats:
- **Container**: Only MP4 and MOV formats are supported
- **Video Codec**: Must use H.264 codec
- **Audio Codec**: Must use AAC codec (if audio is present)
- **File Size**: Maximum 10GB
- **Duration**: Maximum 6 hours

## Solution

We've implemented an automatic video conversion system that:

1. **Validates** video format compatibility before processing
2. **Automatically converts** incompatible videos to the required format
3. **Provides diagnostics** for troubleshooting format issues

## Services Added

### RekognitionService

**Enhanced Methods:**
- `startVideoModerationWithConversion()` - Automatically converts and processes videos
- `validateVideoFormat()` - Checks format compatibility
- `diagnoseVideoCompatibility()` - Provides detailed diagnostic information
- `getVideoFormatRequirements()` - Lists Rekognition requirements

### VideoConversionService

**Key Features:**
- Downloads videos from S3 for processing
- Uses FFmpeg to convert videos to MP4 with H.264/AAC codecs
- Uploads converted videos back to S3
- Provides FFmpeg availability checking

### VideoDiagnosticsController

**API Endpoints:**
- `GET /video-diagnostics/compatibility-check` - Check video compatibility
- `GET /video-diagnostics/ffmpeg-status` - Check FFmpeg installation
- `GET /video-diagnostics/format-requirements` - Get format requirements

## Installation Requirements

### FFmpeg Installation

The video conversion service requires FFmpeg to be installed:

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**CentOS/RHEL:**
```bash
sudo yum install ffmpeg
```

**Docker:**
Add to your Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

**AWS Lambda:**
Use a Lambda layer with FFmpeg or include it in your deployment package.

## Usage Examples

### Basic Usage (Curation Service)

The `CurationService` has been updated to automatically use the new conversion method:

```typescript
// This now automatically handles format conversion
const result = await this.rekognitionService.startVideoModerationWithConversion(
  bucket, 
  storageKey, 
  userurn
);
```

### Manual Format Checking

```typescript
// Check if a video is compatible
const validation = this.rekognitionService.validateVideoFormat(objectKey);
if (!validation.isValid) {
  console.log('Issues:', validation.error);
  console.log('Suggestions:', validation.suggestions);
}

// Get detailed diagnostic
const diagnostic = await this.rekognitionService.diagnoseVideoCompatibility(bucket, key);
console.log('Compatibility:', diagnostic.isCompatible);
console.log('Issues:', diagnostic.issues);
console.log('Solutions:', diagnostic.solutions);
```

### API Usage

Check video compatibility via API:
```bash
curl "http://localhost:3001/video-diagnostics/compatibility-check?bucket=my-bucket&key=videos/sample.mov"
```

Check FFmpeg status:
```bash
curl "http://localhost:3001/video-diagnostics/ffmpeg-status"
```

## Troubleshooting

### Common Issues

1. **"FFmpeg not found"**
   - Install FFmpeg following the installation instructions above
   - Verify installation: `ffmpeg -version`

2. **"Video conversion failed"**
   - Check that the source video file is accessible
   - Verify S3 permissions for reading and writing
   - Check available disk space for temporary files

3. **"Unsupported codec/format" still occurs**
   - Check if you're using the new `startVideoModerationWithConversion()` method
   - Verify VideoConversionService is properly injected
   - Check the diagnostic endpoint for detailed information

### Supported Input Formats

The conversion service can handle most common video formats including:
- MP4, MOV, AVI, MKV, WebM, FLV
- Various codecs: H.264, H.265, VP8, VP9, etc.
- Audio: AAC, MP3, AC3, etc.

### Performance Considerations

- Video conversion is CPU-intensive and may take time for large files
- Temporary storage is used during conversion (ensure adequate disk space)
- Consider implementing job queues for large-scale video processing
- Monitor conversion costs in cloud environments

## Error Handling

The system provides detailed error messages and suggestions:

```json
{
  "isCompatible": false,
  "issues": ["Unsupported video format: webm"],
  "solutions": [
    "Convert your video to MP4 format with H.264 codec",
    "Supported formats: MP4, MOV, MPEG",
    "Required video codec: H.264"
  ],
  "conversionAvailable": true
}
```

## Configuration

Set these environment variables if needed:

```env
AWS_REGION=us-east-1
# S3 configuration is handled by S3Service
```

## Best Practices

1. **Validate early**: Check format compatibility before starting expensive operations
2. **Cache converted videos**: Store converted videos to avoid re-processing
3. **Monitor resources**: Video conversion uses CPU, memory, and temporary storage
4. **Handle errors gracefully**: Provide clear feedback when conversion fails
5. **Test with various formats**: Verify conversion works with your expected input formats
