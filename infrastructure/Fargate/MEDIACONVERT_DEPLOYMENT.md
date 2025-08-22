# MediaConvert Deployment Guide

## Prerequisites

1. **AWS CDK Setup**: Ensure you have AWS CDK installed and configured
2. **AWS Credentials**: Configure AWS credentials with appropriate permissions
3. **S3 Buckets**: Ensure your S3 buckets exist for source and output files

## Deployment Steps

### 1. Build and Deploy the Stack

```bash
cd infrastructure/Rockwell-Fargate
npm install
npm run build
cdk deploy
```

### 2. Verify MediaConvert Resources

After deployment, verify the resources were created:

```bash
# Check the MediaConvert role
aws iam get-role --role-name rockwell-mediaconvert-role-dev

# List MediaConvert queues
aws mediaconvert list-queues --region us-east-1

# Verify SSM parameters
aws ssm get-parameter --name "/rockwell/dev/aws-mediaconvert-role-arn"
aws ssm get-parameter --name "/rockwell/dev/aws-mediaconvert-queue-arn"
```

### 3. Test MediaConvert Endpoint Discovery

Your application will auto-discover the MediaConvert endpoint, but you can test it manually:

```bash
# Discover MediaConvert endpoint for your region
aws mediaconvert describe-endpoints --region us-east-1
```

### 4. Configure Your Application

The following environment variables will be automatically available in your ECS containers:

- `AWS_MEDIACONVERT_ROLE_ARN`
- `AWS_MEDIACONVERT_QUEUE_ARN`
- `AWS_MEDIACONVERT_ENDPOINT` (empty for auto-discovery)

### 5. Test Video Transcoding

Create a test video file and upload it to your S3 bucket, then test the transcoding:

```typescript
// Example test in your application
const mediaConvertService = new MediaConvertService(configService);

const testJob = await mediaConvertService.createHLSTranscodeJob({
  sourceAssetKey: 'test-video.mp4',
  sourceBucket: 'rockwell-source-bucket',
  outputBucket: 'rockwell-output-bucket',
  outputKeyPrefix: 'transcoded/test-video',
  config: {
    variants: [
      { name: '720p', bitrate: 2500, audioBitrate: 128 }
    ],
    segmentConfig: { duration: 10 },
    generateThumbnails: true,
    generateMp4Mezzanine: false
  },
  jobMetadata: {
    queueUrn: 'test-queue',
    sourceAsseturn: 'test-asset',
    userUrn: 'test-user'
  }
});

console.log('Job created:', testJob.jobId);
```

## Environment-Specific Deployment

### Development Environment
```bash
cdk deploy RockwellFargateStack-dev
```

### Staging Environment
```bash
cdk deploy RockwellFargateStack-staging
```

### Production Environment
```bash
cdk deploy RockwellFargateStack-prod
```

## Post-Deployment Configuration

### 1. S3 Bucket Permissions

Ensure your S3 buckets have appropriate policies. The MediaConvert role will need:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR-ACCOUNT:role/rockwell-mediaconvert-role-dev"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### 2. CloudWatch Monitoring Setup

Set up CloudWatch alarms for MediaConvert jobs:

```bash
# Create alarm for failed jobs
aws cloudwatch put-metric-alarm \
  --alarm-name "MediaConvert-Failed-Jobs" \
  --alarm-description "Alert on MediaConvert job failures" \
  --metric-name "JobsErrored" \
  --namespace "AWS/MediaConvert" \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold
```

### 3. Cost Monitoring

Set up billing alerts for MediaConvert usage:

```bash
# Create budget for MediaConvert costs
aws budgets create-budget \
  --account-id YOUR-ACCOUNT-ID \
  --budget '{
    "BudgetName": "MediaConvert-Monthly-Budget",
    "BudgetLimit": {"Amount": "100", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {"Service": ["Amazon Elastic Transcoder"]}
  }'
```

## Troubleshooting

### Common Deployment Issues

#### 1. IAM Permission Errors
```bash
# Verify your AWS credentials have the required permissions
aws sts get-caller-identity
aws iam list-attached-role-policies --role-name YOUR-DEPLOYMENT-ROLE
```

#### 2. MediaConvert Queue Creation Fails
```bash
# Check MediaConvert service availability in your region
aws mediaconvert describe-endpoints --region YOUR-REGION
```

#### 3. SSM Parameter Access Issues
```bash
# Verify SSM parameters were created
aws ssm describe-parameters --filters "Key=Name,Values=/rockwell/"
```

### Verification Commands

```bash
# Test MediaConvert API access
aws mediaconvert list-presets --region us-east-1

# Verify ECS task can access SSM parameters
aws ecs describe-task-definition --task-definition rockwell-api-dev

# Check CloudWatch logs for MediaConvert
aws logs describe-log-groups --log-group-name-prefix "/aws/mediaconvert"
```

## Cleanup

To remove all MediaConvert resources:

```bash
cd infrastructure/Rockwell-Fargate
cdk destroy

# Manually delete any remaining MediaConvert jobs if needed
aws mediaconvert list-jobs --status COMPLETE --region us-east-1
```

## Next Steps

1. **Configure your video processing pipeline** in your application
2. **Set up monitoring and alerting** for MediaConvert jobs
3. **Optimize transcoding settings** based on your video content
4. **Implement proper error handling** for failed transcoding jobs
5. **Consider implementing job queuing** for high-volume scenarios

## Support

For issues with MediaConvert setup:
1. Check AWS CloudWatch logs
2. Review the MEDIACONVERT_SETUP.md documentation
3. Verify IAM permissions and S3 bucket policies
4. Test with simple video files first before complex workflows
