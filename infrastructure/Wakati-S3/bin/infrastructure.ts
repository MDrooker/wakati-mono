#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import * as dotenv from 'dotenv';
import { S3Stack } from '../lib/s3-stack';

// Load environment variables
dotenv.config();

const app = new cdk.App();

// Get environment from CDK context or environment variables
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const region = app.node.tryGetContext('region') || process.env.AWS_REGION || 'us-east-1';
const account = app.node.tryGetContext('account') || process.env.AWS_ACCOUNT_ID;

if (!account) {
  throw new Error('AWS_ACCOUNT_ID environment variable or account context must be provided');
}

const env = {
  account,
  region,
};

new S3Stack(app, `S3Stack-${environment}`, {
  env,
  stackName: `S3Stack-infrastructure-${environment}`,
  description: `S3Stack application infrastructure for ${environment} environment`,
  tags: {
    Environment: environment,
    Application: 'S3',
    ManagedBy: 'CDK',
  },
});