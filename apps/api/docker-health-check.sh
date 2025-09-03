#!/bin/bash
# Docker health check script for conversion tools

echo "Checking conversion tool availability..."

# Check FFmpeg
if command -v ffmpeg >/dev/null 2>&1; then
    echo "✓ FFmpeg is installed"
    ffmpeg -version | head -1
else
    echo "✗ FFmpeg is NOT installed"
    exit 1
fi

# Check FFprobe
if command -v ffprobe >/dev/null 2>&1; then
    echo "✓ FFprobe is installed"
    ffprobe -version | head -1
else
    echo "✗ FFprobe is NOT installed"
    exit 1
fi

# Check ImageMagick
if command -v magick >/dev/null 2>&1; then
    echo "✓ ImageMagick is installed"
    magick -version | head -1
else
    echo "✗ ImageMagick is NOT installed"
    exit 1
fi

# Check ImageMagick identify
if command -v identify >/dev/null 2>&1; then
    echo "✓ ImageMagick identify is installed"
    identify -version | head -1
else
    echo "✗ ImageMagick identify is NOT installed"
    exit 1
fi

# Check HEIC support in ImageMagick
echo "Checking ImageMagick format support..."
if magick identify -list format | grep -i heic >/dev/null 2>&1; then
    echo "✓ HEIC format is supported"
else
    echo "⚠ HEIC format support may be limited"
fi

echo "All conversion tools are ready!"
exit 0
