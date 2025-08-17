#!/bin/bash

# Install AWS Polly SDK for Transcribe Module
echo "Installing AWS Polly SDK for the Transcribe module..."

# Navigate to the API directory
cd "$(dirname "$0")/../apps/api"

# Install the required AWS SDK for Polly
npm install @aws-sdk/client-polly

echo "AWS Polly SDK installed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)"
echo "2. Set AWS_REGION in your environment variables"
echo "3. Configure S3 bucket name (AWS_S3_BUCKET_NAME)"
echo "4. Add the TranscribeModule to your app.module.ts imports"
echo ""
echo "Example environment variables:"
echo "AWS_REGION=us-east-1"
echo "AWS_ACCESS_KEY_ID=your_access_key_here"
echo "AWS_SECRET_ACCESS_KEY=your_secret_key_here"
echo "AWS_S3_BUCKET_NAME=your_bucket_name"
echo "AWS_CLOUDFRONT_DOMAIN=your_cloudfront_domain.cloudfront.net (optional)"
