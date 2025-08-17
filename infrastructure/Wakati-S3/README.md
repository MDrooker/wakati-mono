# Rockwell Infrastructure

This CDK project deploys the AWS infrastructure for the Rockwell application's asset management system.

## Architecture

- **S3 Bucket**: Stores uploaded assets (images and videos)
- **CloudFront Distribution**: CDN for fast asset delivery worldwide
- **SNS Topic**: Receives notifications when files are uploaded to S3
- **IAM Roles**: Proper permissions for S3, CloudFront, and SNS integration

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+ 
- AWS CDK CLI installed (`npm install -g aws-cdk`)

## Setup

1. Install dependencies:
```bash
cd infrastructure
npm install
```

2. Set required environment variables:
```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
export ENVIRONMENT=dev  # or staging, prod
```

3. Bootstrap CDK (first time only):
```bash
cdk bootstrap
```

## Deployment

### Development Environment
```bash
cdk deploy --context environment=dev
```

### Staging Environment
```bash
cdk deploy --context environment=staging
```

### Production Environment
```bash
cdk deploy --context environment=prod
```

## Stack Outputs

After deployment, the stack provides these outputs:

- `BucketName`: S3 bucket name for storing assets
- `CloudFrontDomainName`: CDN domain for serving assets
- `UploadNotificationTopicArn`: SNS topic ARN for upload notifications

## Environment Variables for API

After deployment, configure these environment variables in your API:

```bash
# From CDK outputs
AWS_S3_BUCKET_NAME=rockwell-assets-dev-123456789012
AWS_CLOUDFRONT_DOMAIN=d1234567890123.cloudfront.net
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:rockwell-upload-notifications-dev

# AWS Credentials (use IAM role in production)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

## SNS Webhook Integration

To receive upload notifications, you need to subscribe your API webhook to the SNS topic:

```bash
aws sns subscribe \\
  --topic-arn arn:aws:sns:us-east-1:123456789012:rockwell-upload-notifications-dev \\
  --protocol https \\
  --notification-endpoint https://your-api-domain.com/assets/webhook/s3-upload
```

## Asset Upload Flow

1. Client requests signed URL: `POST /assets/generate-upload-url`
2. Client uploads file directly to S3 using signed URL
3. S3 triggers SNS notification on successful upload
4. SNS calls webhook: `POST /assets/webhook/s3-upload`
5. API updates asset record and triggers content moderation

## CDK Commands

- `npm run build`: Compile TypeScript
- `npm run watch`: Watch for changes and compile
- `npm run test`: Run unit tests
- `cdk diff`: Compare deployed stack with current state
- `cdk synth`: Emit the synthesized CloudFormation template
- `cdk deploy`: Deploy stack to AWS
- `cdk destroy`: Remove stack from AWS

## Security

### S3 Bucket Security
- Block all public access by default
- CloudFront Origin Access Control (OAC) for secure access
- CORS configured for web uploads
- Lifecycle rules for cost optimization

### CloudFront Security
- HTTPS redirect enforced
- Origin Access Control prevents direct S3 access
- Separate cache policies for images and videos
- Geographic restrictions can be added if needed

### IAM Security
- Minimal permissions principle
- Separate roles for different services
- Cross-account protection with conditions

## Cost Optimization

- **S3 Intelligent Tiering**: Automatically moves objects to cost-effective storage classes
- **CloudFront Price Class 100**: Uses only US, Canada, and Europe edge locations
- **Lifecycle Rules**: Deletes incomplete multipart uploads and old versions
- **Compression**: Enabled for images, disabled for videos

## Monitoring

Consider adding these monitoring resources:

- CloudWatch alarms for high error rates
- CloudWatch logs for detailed access logs
- AWS Config for compliance monitoring
- Cost anomaly detection

## Multi-Environment Support

The stack supports multiple environments through context variables:

- **dev**: Development environment with aggressive cleanup policies
- **staging**: Staging environment for testing
- **prod**: Production environment with data retention policies