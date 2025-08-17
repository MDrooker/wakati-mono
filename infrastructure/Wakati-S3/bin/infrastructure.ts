#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RockwellInfrastructureStack } from '../lib/rockwell-infrastructure-stack';
import * as dotenv from 'dotenv';

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

new RockwellInfrastructureStack(app, `RockwellInfrastructure-${environment}`, {
  env,
  stackName: `rockwell-infrastructure-${environment}`,
  description: `Rockwell application infrastructure for ${environment} environment`,
  tags: {
    Environment: environment,
    Application: 'Rockwell',
    ManagedBy: 'CDK',
  },
});