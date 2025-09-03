#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Stack } from '../lib/fargate-stack';

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = new cdk.App();

// Get environment configuration
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

const productName = process.env.PRODUCT || 'API';
const systemName = process.env.SYSTEM || 'Rockwell';
const stackName = process.env.STACK_NAME || `${systemName}FargateStack`;
const environment = process.env.ENVIRONMENT || 'dev';
const ecrStackName = process.env.ECR_STACK_NAME || `${systemName}EcrStack`;

// Deploy full stack by default
new Stack(app, stackName, {
    env,
    description: `${stackName} Fargate Stack for ${environment} environment`,
    ecrStackName,
    tags: {
        Project: `${systemName}`,
        Environment: environment,
        ManagedBy: 'CDK',
    },
});

