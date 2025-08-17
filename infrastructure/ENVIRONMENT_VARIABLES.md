# Rockwell CDK Environment Variables Configuration

This document outlines all environment variables configured in the Rockwell Fargate CDK stack and their Parameter Store mappings.

## Environment Variables

### System Configuration (Static)
These values are set directly in the CDK stack:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `{environment}` | Node.js environment (dev/staging/prod) |
| `PORT` | `3000` | Container port for the API |
| `SYSTEM` | `rockwell` | System identifier |
| `PRODUCT` | `api` | Product identifier |
| `ENVIRONMENT` | `{environment}` | Deployment environment |
| `SERVICE_VERSION` | `1.0.0` | Service version for monitoring |
| `CLUSTER_MODE` | `false` | Disable cluster mode in containers |
| `SUPABASE_BUCKETNAME` | `assets` | Default Supabase bucket name |
| `INNGEST_DEVMODE` | `true` (dev) / `false` (prod) | Inngest development mode |

## Secrets from Parameter Store

All sensitive configuration is loaded from AWS Systems Manager Parameter Store under the path `/rockwell/{environment}/`.

### Database Configuration
| Environment Variable | Parameter Store Path | Description |
|---------------------|---------------------|-------------|
| `DATABASE_URL` | `/rockwell/{env}/database_url` | PostgreSQL connection string |

### Supabase Configuration
| Environment Variable | Parameter Store Path | Description |
|---------------------|---------------------|-------------|
| `SUPABASE_URL` | `/rockwell/{env}/supabase_url` | Supabase project URL |
| `SUPABASE_ANON_KEY` | `/rockwell/{env}/supabase_anon_key` | Supabase anonymous key |
| `SUPABASE_JWT_SECRET` | `/rockwell/{env}/supabase_jwt_secret` | JWT secret for token verification |
| `SUPABASE_SERVICE_ROLE_KEY` | `/rockwell/{env}/supabase_service_role_key` | Service role key for admin operations |
| `SUPABASE_TOKEN_OVERRIDE` | `/rockwell/{env}/supabase_token_override` | Token override for testing |

### API Keys & External Services
| Environment Variable | Parameter Store Path | Description |
|---------------------|---------------------|-------------|
| `RESEND_APIKEY` | `/rockwell/{env}/resend_apikey` | Resend email service API key |
| `CRUD_API_TOKEN` | `/rockwell/{env}/crud_api_token` | CRUD API authentication token |
| `OPENAI_API_KEY` | `/rockwell/{env}/openai_api_key` | OpenAI API key for AI services |

### Inngest Workflow Configuration
| Environment Variable | Parameter Store Path | Description |
|---------------------|---------------------|-------------|
| `INNGEST_API_KEY` | `/rockwell/{env}/inngest_api_key` | Inngest API key |
| `INNGEST_EVENT_KEY` | `/rockwell/{env}/inngest_event_key` | Inngest event key |
| `INNGEST_SIGNING_KEY` | `/rockwell/{env}/inngest_signing_key` | Inngest webhook signing key |

### Monitoring & Observability
| Environment Variable | Parameter Store Path | Description |
|---------------------|---------------------|-------------|
| `NEW_RELIC_LICENSE_KEY` | `/rockwell/{env}/new_relic_license_key` | New Relic license key |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `/rockwell/{env}/otel_exporter_otlp_endpoint` | OpenTelemetry OTLP endpoint |
| `OTEL_EXPORTER_OTLP_HEADERS` | `/rockwell/{env}/otel_exporter_otlp_headers` | OTLP headers (typically API key) |

### AWS Infrastructure Configuration
| Environment Variable | Parameter Store Path | Description |
|---------------------|---------------------|-------------|
| `AWS_S3_BUCKET_NAME` | `/rockwell/{env}/aws_s3_bucket_name` | S3 bucket for asset storage |
| `AWS_CLOUDFRONT_DOMAIN` | `/rockwell/{env}/aws_cloudfront_domain` | CloudFront CDN domain |
| `AWS_ACCOUNT_ID` | `/rockwell/{env}/aws_account_id` | AWS account ID |
| `AWS_REGION` | `/rockwell/{env}/aws_region` | AWS region |
| `CDN_BASE_URL` | `/rockwell/{env}/aws_cloudfront_domain` | CDN base URL (alias for CloudFront) |

### Optional Services
| Environment Variable | Parameter Store Path | Description |
|---------------------|---------------------|-------------|
| `REDIS_URL` | `/rockwell/{env}/redis_url` | Redis connection string (optional) |

## IAM Permissions

The ECS execution role has the following permissions to access Parameter Store:

```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameter",
    "ssm:GetParameters"
  ],
  "Resource": [
    "arn:aws:ssm:{region}:{account}:parameter/rockwell/{environment}/*"
  ]
}
```

## Environment-Specific Configuration

### Development Environment
- Parameters under `/rockwell/dev/`
- `INNGEST_DEVMODE=true`
- Single task instance
- Shorter log retention

### Staging Environment
- Parameters under `/rockwell/staging/`
- `INNGEST_DEVMODE=false`
- Single task instance
- Production-like settings

### Production Environment
- Parameters under `/rockwell/prod/`
- `INNGEST_DEVMODE=false`
- Multiple task instances (2+)
- Auto-scaling enabled
- Longer log retention

## Usage in Code

The application accesses these environment variables using `process.env`:

```typescript
// Database connection
const dbUrl = process.env.DATABASE_URL;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// API keys
const resendKey = process.env.RESEND_APIKEY;
const openaiKey = process.env.OPENAI_API_KEY;

// Inngest configuration
const inngestConfig = {
  apiKey: process.env.INNGEST_API_KEY,
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
};

// CDN URLs
const cdnBaseUrl = process.env.CDN_BASE_URL;
```

## Parameter Upload Scripts

Use the provided scripts to manage Parameter Store values:

```bash
# Upload all parameters from .env file
./upload-env-to-ssm.sh -e dev

# List all parameters
./manage-ssm-params.sh list -e dev

# Get specific parameter
./manage-ssm-params.sh get database_url -e dev

# Export parameters back to .env format
./manage-ssm-params.sh export -e dev -o .env.backup
```

## Security Notes

1. **Encryption**: All secrets are stored as SecureString in Parameter Store
2. **Access Control**: Only the ECS execution role can access the parameters
3. **Environment Isolation**: Each environment has separate parameter paths
4. **Audit Trail**: Parameter Store provides access logging
5. **Rotation**: Parameters can be updated without redeploying infrastructure

## Validation

To verify all parameters are configured correctly:

1. **Check Parameter Store**:
   ```bash
   ./manage-ssm-params.sh list -e dev
   ```

2. **Validate CDK Stack**:
   ```bash
   cd Rockwell-Fargate && cdk synth
   ```

3. **Test Container**:
   ```bash
   # Deploy and check ECS service logs
   aws logs tail /ecs/rockwell-api-dev --follow
   ```

All 26 environment variables used by the Rockwell API are now properly configured in the CDK stack with appropriate security measures.
