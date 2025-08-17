# Rockwell Infrastructure Configuration

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your specific values:

### Required Environment Variables

- `AWS_ACCOUNT_ID`: Your AWS Account ID (12-digit number)
- `AWS_REGION`: AWS region for deployment (default: us-east-1)
- `ENVIRONMENT`: Environment name (dev, staging, prod)

### Optional Configuration Variables

#### S3 Bucket Configuration
- `BUCKET_NAME_PREFIX`: Prefix for S3 bucket name (default: rockwell-assets)
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (default: *)
- `LIFECYCLE_ABORT_MULTIPART_DAYS`: Days to abort incomplete multipart uploads (default: 1)
- `LIFECYCLE_NONCURRENT_VERSION_DAYS`: Days to keep non-current versions (default: 30)

#### CloudFront Configuration
- `PRICE_CLASS`: CloudFront price class (default: PRICE_CLASS_100)
  - Options: PRICE_CLASS_100, PRICE_CLASS_200, PRICE_CLASS_ALL
- `IMAGES_CACHE_DEFAULT_TTL_DAYS`: Default cache TTL for images (default: 30)
- `IMAGES_CACHE_MAX_TTL_DAYS`: Maximum cache TTL for images (default: 365)
- `VIDEOS_CACHE_DEFAULT_TTL_DAYS`: Default cache TTL for videos (default: 7)
- `VIDEOS_CACHE_MAX_TTL_DAYS`: Maximum cache TTL for videos (default: 30)

#### Custom Domain Configuration (Optional)
- `CUSTOM_DOMAIN_NAME`: Custom domain name for the CloudFront distribution (e.g., assets.example.com)
- `ACM_CERTIFICATE_ARN`: ARN of the ACM certificate for the custom domain (must be in us-east-1 region for CloudFront)

#### Route53 DNS Configuration (Optional - for automatic CNAME creation)
- `ROUTE53_HOSTED_ZONE_ID`: ID of the Route53 hosted zone (e.g., Z1D633PJN98FT9)
- `ROUTE53_HOSTED_ZONE_NAME`: Domain name of the hosted zone (e.g., yourdomain.com)

> **Note**: For custom domain configuration:
> 1. The ACM certificate MUST be created in the `us-east-1` region (N. Virginia) regardless of where your stack is deployed
> 2. You need to validate the certificate through DNS or email validation
> 3. Both `CUSTOM_DOMAIN_NAME` and `ACM_CERTIFICATE_ARN` must be provided together
> 4. For automatic DNS record creation, provide either `ROUTE53_HOSTED_ZONE_ID` or `ROUTE53_HOSTED_ZONE_NAME`
> 5. If Route53 configuration is provided, the CNAME record will be created automatically
> 6. If Route53 configuration is not provided, you'll need to manually create the CNAME record

#### SNS Configuration
- `SNS_TOPIC_NAME_PREFIX`: Prefix for SNS topic name (default: rockwell-upload-notifications)

## Deployment

1. Build the TypeScript code:
   ```bash
   npm run build
   ```

2. Deploy the infrastructure:
   ```bash
   npm run deploy
   ```

   Or with specific environment:
   ```bash
   cdk deploy --context environment=prod
   ```

## Architecture

The infrastructure creates:

1. **S3 Bucket**: Stores assets with intelligent tiering, lifecycle rules, and CORS configuration
2. **CloudFront Distribution**: CDN with separate cache policies for images and videos
3. **Origin Access Control**: Secure access between CloudFront and S3
4. **SNS Topic**: Notifications for upload events
5. **S3 Event Notifications**: Triggers SNS when objects are created in images/ or videos/ prefixes

## Security Features

- S3 bucket blocks all public access
- CloudFront uses Origin Access Control (OAC) instead of deprecated Origin Access Identity
- HTTPS redirect enforced
- SSL/TLS certificate support for custom domains via ACM
- Minimum TLS version 1.2 when using custom domains
- SNI (Server Name Indication) support for SSL
- Configurable CORS origins
- Separate cache policies for different content types

## Monitoring

The stack outputs key resource identifiers for monitoring and integration:
- Bucket name and ARN
- CloudFront distribution domain and ID
- SNS topic ARN and name
- Custom domain name (if configured)
- ACM certificate ARN (if configured)
- Route53 hosted zone ID and name (if configured)

## Custom Domain Setup Example

1. Request an ACM certificate in us-east-1 region:
   ```bash
   aws acm request-certificate \
     --domain-name assets.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. Get your Route53 hosted zone information:
   ```bash
   # List hosted zones to find your zone ID
   aws route53 list-hosted-zones
   ```

3. Set environment variables:
   ```bash
   export CUSTOM_DOMAIN_NAME=assets.yourdomain.com
   export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
   # Option 1: Use hosted zone ID (recommended)
   export ROUTE53_HOSTED_ZONE_ID=Z1D633PJN98FT9
   # Option 2: Use hosted zone name (CDK will lookup the ID)
   export ROUTE53_HOSTED_ZONE_NAME=yourdomain.com
   ```

4. Deploy the stack:
   ```bash
   npm run deploy
   ```

5. DNS record is created automatically!
   If Route53 configuration is provided, the CNAME record will be created automatically.
   
   If Route53 configuration is NOT provided, manually create a CNAME record:
   ```
   assets.yourdomain.com CNAME d123456789.cloudfront.net
   ```
