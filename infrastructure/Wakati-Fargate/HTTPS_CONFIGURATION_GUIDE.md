# HTTPS Configuration Guide for Rockwell Fargate

This guide explains how to configure HTTPS/SSL for your Rockwell Fargate deployment.

## 🔐 HTTPS Configuration Options

Your stack supports multiple HTTPS configuration scenarios:

### Option 1: HTTP Only (Default)
- Uses AWS Application Load Balancer's default DNS name
- No SSL certificate required
- Suitable for development and internal testing

### Option 2: Custom Domain with Auto-Generated Certificate
- Uses your custom domain (e.g., `api.yourdomain.com`)
- Automatically creates SSL certificate with DNS validation
- Requires Route53 hosted zone

### Option 3: Custom Domain with Existing Certificate
- Uses your custom domain with pre-existing ACM certificate
- Useful when you already have certificates or use external DNS

**Important Note:** HTTPS is only supported with custom domains. AWS Load Balancer DNS names (e.g., `example-123456789.us-east-1.elb.amazonaws.com`) cannot have SSL certificates issued for them directly because AWS doesn't control those domain names for certificate validation.

## 📋 Prerequisites

### For Custom Domain (Options 2 & 3):
1. **Domain Name**: A domain you own (e.g., `yourdomain.com`)
2. **Route53 Hosted Zone**: Your domain must be managed by Route53
3. **ACM Certificate** (Option 3 only): Pre-existing certificate in ACM

### Getting Your Hosted Zone ID:
```bash
# List your hosted zones
aws route53 list-hosted-zones --query 'HostedZones[].{Name:Name,Id:Id}' --output table

# Get specific hosted zone ID
aws route53 list-hosted-zones --query 'HostedZones[?Name==`yourdomain.com.`].Id' --output text
```

## 🚀 Deployment Examples

### Option 1: HTTP Only (Development)
```bash
# Deploy with HTTP only - no HTTPS configuration needed
cdk deploy RockwellFargateStack-dev

# Result: 
# - HTTP: http://rockwell-alb-dev-1234567890.us-east-1.elb.amazonaws.com
```

### Option 2: Custom Domain with Auto Certificate (Production)
```bash
# Deploy with custom domain and auto-generated certificate
cdk deploy RockwellFargateStack-prod \
  --parameters DomainName=api.yourdomain.com \
  --parameters HostedZoneId=Z1234567890ABCDEF \
  --parameters EnableHttpsRedirect=true

# Result:
# - HTTP: http://api.yourdomain.com (redirects to HTTPS)
# - HTTPS: https://api.yourdomain.com
# - Also available via load balancer DNS (HTTP only)
```

### Option 3: Custom Domain with Existing Certificate
```bash
# Deploy with existing ACM certificate
cdk deploy RockwellFargateStack-prod \
  --parameters DomainName=api.yourdomain.com \
  --parameters CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abcd-1234-efgh-5678 \
  --parameters EnableHttpsRedirect=true

# Result: Same as Option 2 but uses your existing certificate
```

## 🔧 Parameters Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `DomainName` | String | `""` | Custom domain name (e.g., `api.yourdomain.com`) |
| `HostedZoneId` | String | `""` | Route53 hosted zone ID for the domain |
| `CertificateArn` | String | `""` | Existing ACM certificate ARN |
| `EnableHttpsRedirect` | String | `"true"` | Redirect HTTP to HTTPS (`true`/`false`) |

## 📊 Stack Outputs

After deployment, check these outputs:

```bash
# Get all stack outputs
aws cloudformation describe-stacks \
  --stack-name RockwellFargateStack-prod \
  --query 'Stacks[0].Outputs[].[OutputKey,OutputValue,Description]' \
  --output table

# Get primary API endpoint
aws cloudformation describe-stacks \
  --stack-name RockwellFargateStack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

### Key Outputs:
- **`ApiEndpoint`**: Primary API URL (HTTPS preferred)
- **`HttpUrl`**: HTTP load balancer URL
- **`HttpsUrl`**: HTTPS load balancer URL
- **`CustomDomainUrl`**: Custom domain URL (if configured)
- **`SslCertificateArn`**: SSL certificate ARN

## 🔍 Testing HTTPS Configuration

### Test Health Endpoints
```bash
# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name RockwellFargateStack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# Test HTTPS health check
curl -v "$API_ENDPOINT/healthz"

# Test SSL certificate
curl -vI "$API_ENDPOINT" 2>&1 | grep -E "SSL|TLS|subject:|issuer:"
```

### Test HTTP to HTTPS Redirect
```bash
# Should redirect to HTTPS if EnableHttpsRedirect=true
curl -v "http://api.yourdomain.com/healthz"
```

### Test Certificate Validation
```bash
# Check certificate details
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com </dev/null 2>/dev/null | openssl x509 -noout -text
```

## 🛠️ Troubleshooting HTTPS Issues

### Issue 1: Certificate Validation Timeout
**Symptoms:** Deployment hangs during certificate creation
**Cause:** DNS validation records not created in Route53

**Solution:**
1. Verify hosted zone ID is correct
2. Ensure domain is managed by Route53
3. Check DNS propagation:
   ```bash
   dig _acme-challenge.api.yourdomain.com TXT
   ```

### Issue 2: Custom Domain Not Resolving
**Symptoms:** Domain doesn't resolve to load balancer
**Cause:** Route53 A record not created

**Solution:**
1. Verify hosted zone contains the A record:
   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id Z1234567890ABCDEF \
     --query 'ResourceRecordSets[?Name==`api.yourdomain.com.`]'
   ```
2. Check DNS propagation:
   ```bash
   dig api.yourdomain.com A
   ```

### Issue 3: HTTPS Not Working But HTTP Works
**Symptoms:** HTTP works but HTTPS times out or fails
**Causes:**
- Security group not allowing port 443
- Certificate not properly attached
- Load balancer listener not configured

**Solution:**
1. Check load balancer listeners:
   ```bash
   aws elbv2 describe-listeners --load-balancer-arn YOUR_LB_ARN
   ```
2. Verify certificate is attached:
   ```bash
   aws elbv2 describe-listener-certificates --listener-arn YOUR_HTTPS_LISTENER_ARN
   ```

### Issue 4: Certificate Exists But Not Working
**Symptoms:** Certificate shows in ACM but HTTPS fails
**Cause:** Certificate might be in wrong region

**Solution:**
- Ensure certificate is in the same region as your load balancer
- ACM certificates must be in the same region as the resources using them

## 📈 Production Best Practices

### 1. Certificate Management
- **Use DNS validation**: More reliable than email validation
- **Wildcard certificates**: Consider `*.yourdomain.com` for multiple subdomains
- **Certificate renewal**: ACM auto-renews DNS-validated certificates

### 2. Security Headers
Add security headers to your application:
```typescript
// In your NestJS app
app.use((req, res, next) => {
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});
```

### 3. SSL/TLS Configuration
- **TLS 1.2+ only**: Disable older versions
- **Strong cipher suites**: Use modern encryption
- **HSTS**: Enable HTTP Strict Transport Security

### 4. Monitoring
Set up CloudWatch alarms for:
- **Certificate expiration**: 30 days before expiry
- **HTTPS error rates**: 4xx/5xx responses
- **SSL handshake failures**: Connection issues

## 🔄 Certificate Renewal

ACM certificates with DNS validation auto-renew, but monitor:

```bash
# Check certificate status
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN \
  --query 'Certificate.{Status:Status,NotAfter:NotAfter,RenewalEligibility:RenewalEligibility}'

# List expiring certificates (next 30 days)
aws acm list-certificates --query 'CertificateSummaryList[?NotAfter<=`$(date -d "+30 days" -u +%Y-%m-%dT%H:%M:%S.%3NZ)`]'
```

## 📚 Additional Resources

- [AWS ACM Documentation](https://docs.aws.amazon.com/acm/)
- [Route53 Documentation](https://docs.aws.amazon.com/route53/)
- [Application Load Balancer HTTPS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html)
- [SSL Labs Testing](https://www.ssllabs.com/ssltest/) - Test your HTTPS configuration
