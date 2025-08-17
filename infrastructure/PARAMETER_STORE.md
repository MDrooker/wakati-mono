# Environment Variable Management Scripts

This directory contains scripts to manage Rockwell environment variables in AWS Systems Manager Parameter Store.

## Scripts

### 1. `upload-env-to-ssm.sh`

Uploads environment variables from the API `.env` file to AWS Parameter Store.

**Features:**
- Automatically detects sensitive variables and encrypts them as SecureString
- Supports different environments (dev, staging, prod)
- Dry-run mode to preview changes
- Configurable parameter prefix and AWS region
- Handles existing parameter overwriting

**Usage:**
```bash
# Basic upload (reads from ../apps/api/.env)
./upload-env-to-ssm.sh

# Upload for specific environment
./upload-env-to-ssm.sh -e dev

# Upload production config
./upload-env-to-ssm.sh -f ../apps/api/.env.prod -e prod

# Dry run to see what would be uploaded
./upload-env-to-ssm.sh -d

# Overwrite existing parameters
./upload-env-to-ssm.sh -o

# Upload all as encrypted SecureString
./upload-env-to-ssm.sh --secure

# Upload all as unencrypted String
./upload-env-to-ssm.sh --string
```

**Parameter Naming:**
- Variables are converted to lowercase
- Default prefix: `/rockwell`
- With environment: `/rockwell/{environment}`
- Example: `DATABASE_URL` → `/rockwell/dev/database_url`

**Automatic Encryption:**
These variables are automatically encrypted as SecureString:
- Any variable containing: PASSWORD, SECRET, KEY, TOKEN, PRIVATE
- DATABASE_URL

### 2. `manage-ssm-params.sh`

Provides utilities to list, get, delete, and export parameters from AWS Parameter Store.

**Usage:**
```bash
# List all parameters
./manage-ssm-params.sh list

# List with decrypted values
./manage-ssm-params.sh list --decrypt

# List for specific environment
./manage-ssm-params.sh list -e dev

# List only parameter names
./manage-ssm-params.sh list-names

# Get specific parameter value
./manage-ssm-params.sh get database-url

# Delete specific parameter
./manage-ssm-params.sh delete supabase-anon-key

# Delete all parameters (with confirmation)
./manage-ssm-params.sh delete-all

# Export parameters to .env format
./manage-ssm-params.sh export

# Export to file
./manage-ssm-params.sh export -o .env.aws

# Sync current .env to Parameter Store
./manage-ssm-params.sh sync -e dev
```

## Setup Requirements

1. **AWS CLI installed and configured:**
   ```bash
   aws configure
   # or set environment variables:
   export AWS_ACCESS_KEY_ID=your-key
   export AWS_SECRET_ACCESS_KEY=your-secret
   export AWS_REGION=us-east-1
   ```

2. **Required AWS permissions:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ssm:GetParameter",
           "ssm:GetParameters",
           "ssm:GetParametersByPath",
           "ssm:PutParameter",
           "ssm:DeleteParameter"
         ],
         "Resource": "arn:aws:ssm:*:*:parameter/rockwell/*"
       }
     ]
   }
   ```

3. **API .env file exists:**
   ```bash
   # Create from example
   cp apps/api/.env.example apps/api/.env
   # Edit with your actual values
   nano apps/api/.env
   ```

## Workflow Examples

### Initial Setup for Development
```bash
# 1. Upload dev environment variables
./upload-env-to-ssm.sh -e dev

# 2. Verify upload
./manage-ssm-params.sh list -e dev

# 3. Deploy CDK stack (will read from Parameter Store)
cd Rockwell-Fargate && cdk deploy
```

### Production Deployment
```bash
# 1. Create production .env file
cp ../apps/api/.env ../apps/api/.env.prod
# Edit .env.prod with production values

# 2. Upload production config
./upload-env-to-ssm.sh -f ../apps/api/.env.prod -e prod -o

# 3. Deploy production stack
cd Rockwell-Fargate && cdk deploy RockwellFargateStackProd
```

### Backup and Restore
```bash
# Backup current parameters
./manage-ssm-params.sh export -e prod -o backup-prod.env

# Restore from backup
./upload-env-to-ssm.sh -f backup-prod.env -e prod -o
```

### Development Workflow
```bash
# Check what's currently in Parameter Store
./manage-ssm-params.sh list -e dev

# Update local .env and sync changes
./manage-ssm-params.sh sync -e dev

# Test individual parameter
./manage-ssm-params.sh get database-url -e dev
```

## Parameter Store Structure

The scripts organize parameters in AWS Parameter Store with this structure:
```
/rockwell/
├── dev/
│   ├── database_url (SecureString)
│   ├── supabase_url (String)
│   ├── supabase_anon_key (SecureString)
│   ├── jwt_secret (SecureString)
│   └── ...
├── staging/
│   └── ...
└── prod/
    └── ...
```

## Security Notes

- Sensitive variables (passwords, keys, tokens, secrets) are automatically encrypted
- Use `--decrypt` flag carefully in production environments
- Consider using AWS IAM roles instead of access keys where possible
- Never commit actual `.env` files to version control
- Regularly rotate sensitive credentials

## Troubleshooting

**AWS CLI not found:**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLI2.pkg" -o "AWSCLI2.pkg"
sudo installer -pkg AWSCLI2.pkg -target /
```

**Permission denied:**
```bash
# Make scripts executable
chmod +x *.sh
```

**Invalid AWS credentials:**
```bash
# Check current credentials
aws sts get-caller-identity

# Reconfigure
aws configure
```

**Parameter not found:**
```bash
# List all parameters to check naming
./manage-ssm-params.sh list-names -e dev
```
