#!/usr/bin/env node

/**
 * Script to build and push the Rockwell API Docker image to ECR
 * Usage: npm run build-and-push [environment]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const environment = process.argv[2] || 'dev';
const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
const account = process.env.CDK_DEFAULT_ACCOUNT;

if (!account) {
    console.error('CDK_DEFAULT_ACCOUNT environment variable is required');
    process.exit(1);
}

const repositoryUri = `${account}.dkr.ecr.${region}.amazonaws.com/rockwell-api-${environment}`;
const apiDir = path.resolve(__dirname, '../../../apps/api');

console.log(`Building and pushing Rockwell API Docker image...`);
console.log(`Repository URI: ${repositoryUri}`);
console.log(`API Directory: ${apiDir}`);

try {
    // Check if API directory exists
    if (!fs.existsSync(apiDir)) {
        throw new Error(`API directory not found: ${apiDir}`);
    }

    // Get ECR login token
    console.log('🔐 Getting ECR login token...');
    const loginCommand = `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${account}.dkr.ecr.${region}.amazonaws.com`;
    execSync(loginCommand, { stdio: 'inherit' });

    // Build Docker image
    console.log('🏗️  Building Docker image...');
    const buildCommand = `docker build --platform linux/amd64 -t rockwell-api:${environment} ${apiDir}`;
    execSync(buildCommand, { stdio: 'inherit', cwd: apiDir });

    // Tag image for ECR
    console.log('🏷️  Tagging image for ECR...');
    const tagCommand = `docker tag rockwell-api:${environment} ${repositoryUri}:latest`;
    execSync(tagCommand, { stdio: 'inherit' });

    const tagWithVersionCommand = `docker tag rockwell-api:${environment} ${repositoryUri}:${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    execSync(tagWithVersionCommand, { stdio: 'inherit' });

    // Push to ECR
    console.log('🚀 Pushing image to ECR...');
    const pushLatestCommand = `docker push ${repositoryUri}:latest`;
    execSync(pushLatestCommand, { stdio: 'inherit' });

    const pushVersionCommand = `docker push ${repositoryUri}:${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    execSync(pushVersionCommand, { stdio: 'inherit' });

    console.log('✅ Docker image built and pushed successfully!');
    console.log(`📍 Image URI: ${repositoryUri}:latest`);

} catch (error) {
    console.error('❌ Error building and pushing Docker image:', error.message);
    process.exit(1);
}
