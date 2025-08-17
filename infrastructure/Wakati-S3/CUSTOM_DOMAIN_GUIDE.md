# Custom Domain Configuration for CloudFront Distribution

## Overview

This guide explains how to configure a custom domain for your Rockwell CloudFront distribution with SSL/TLS support using AWS Certificate Manager (ACM).

## Implementation Details

The CloudFront distribution now supports custom domains with the following features:

- **Custom Domain Names**: CNAME support for your own domain
- **SSL/TLS Security**: ACM certificate integration
- **TLS 1.2 Minimum**: Modern security standards
- **SNI Support**: Server Name Indication for efficient SSL handling

## Required Environment Variables

```bash
# Both variables must be provided together
CUSTOM_DOMAIN_NAME=assets.yourdomain.com
ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

## Step-by-Step Setup

### 1. Create ACM Certificate

**Important**: The certificate MUST be in the `us-east-1` region for CloudFront, regardless of where your stack is deployed.

```bash
# Request a new certificate
aws acm request-certificate \
  --domain-name assets.yourdomain.com \
  --subject-alternative-names "*.assets.yourdomain.com" \
  --validation-method DNS \
  --region us-east-1

# Note the CertificateArn from the response
```

### 2. Validate the Certificate

1. Go to the AWS ACM console in us-east-1 region
2. Find your certificate and click on it
3. Create the DNS validation records in your domain's DNS
4. Wait for the certificate status to become "Issued"

### 3. Get Route53 Hosted Zone Information (Optional)

```bash
# List hosted zones to find your zone ID and name
aws route53 list-hosted-zones

# Note the HostedZone Id and Name for your domain
```

### 4. Configure Environment Variables

```bash
# Set the environment variables
export CUSTOM_DOMAIN_NAME=assets.yourdomain.com
export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/your-cert-id

# For automatic DNS record creation (choose one):
# Option 1: Use hosted zone ID (recommended)
export ROUTE53_HOSTED_ZONE_ID=Z1D633PJN98FT9
# Option 2: Use hosted zone name (CDK will lookup the ID)
export ROUTE53_HOSTED_ZONE_NAME=yourdomain.com
```

Or add them to your `.env` file:
```bash
CUSTOM_DOMAIN_NAME=assets.yourdomain.com
ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/your-cert-id
ROUTE53_HOSTED_ZONE_ID=Z1D633PJN98FT9
# OR
ROUTE53_HOSTED_ZONE_NAME=yourdomain.com
```

### 5. Deploy the Stack

```bash
npm run build
npm run deploy
```

### 6. DNS Configuration

**Automatic (Recommended)**: If you provided Route53 hosted zone information, the CNAME record is created automatically during deployment!

**Manual**: If you didn't provide Route53 configuration, create a CNAME record manually:

```
assets.yourdomain.com CNAME d1234567890123.cloudfront.net
```

You can find the CloudFront domain in the stack outputs or AWS console.

## Stack Outputs

When custom domain is configured, the stack will output:

- `CustomDomainName`: Your configured custom domain
- `CertificateArn`: The ACM certificate ARN being used
- `CloudFrontDomainName`: The CloudFront distribution domain (for CNAME)
- `HostedZoneId`: Route53 hosted zone ID (if configured)
- `HostedZoneName`: Route53 hosted zone name (if configured)

## Security Features

- **TLS 1.2 Minimum**: Ensures modern encryption standards
- **SNI Support**: Efficient SSL handling
- **HTTPS Redirect**: All HTTP traffic is redirected to HTTPS
- **Origin Access Control**: Secure access between CloudFront and S3

## Troubleshooting

### Certificate Issues
- Ensure the certificate is in `us-east-1` region
- Verify the certificate status is "Issued"
- Check that the domain name matches exactly

### DNS Issues
- Verify the CNAME record is correctly configured (automatic if Route53 is configured)
- Allow time for DNS propagation (up to 48 hours)
- Use tools like `dig` or `nslookup` to verify DNS resolution

### Route53 Issues
- Ensure the hosted zone ID or name is correct
- Verify you have permissions to modify the hosted zone
- Check that the hosted zone is in the same AWS account
- For hosted zone lookup by name, ensure the domain name exactly matches

### Deployment Issues
- Both `CUSTOM_DOMAIN_NAME` and `ACM_CERTIFICATE_ARN` must be provided together
- Check that the certificate ARN is valid and accessible
- For automatic DNS, provide either `ROUTE53_HOSTED_ZONE_ID` or `ROUTE53_HOSTED_ZONE_NAME`

## Example Configuration

```bash
# .env file
CUSTOM_DOMAIN_NAME=assets.example.com
ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-ef56-7890-abcd-123456789012
ROUTE53_HOSTED_ZONE_ID=Z1D633PJN98FT9
ENVIRONMENT=prod
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-west-2
```

## Testing

After setup, test your configuration:

```bash
# Test HTTPS access
curl -I https://assets.yourdomain.com/

# Check SSL certificate
openssl s_client -connect assets.yourdomain.com:443 -servername assets.yourdomain.com
```
