#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import * as dotenv from 'dotenv';
import { EcrStack } from '../lib/ecr-stack';

// Load environment variables
dotenv.config();

const app = new cdk.App();

// Get environment configuration
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
    environment: process.env.ENVIRONMENT || 'dev',
    system: process.env.SYSTEM || 'Wakati',
    product: process.env.PRODUCT || 'Wakati',
    stackName: process.env.STACK_NAME || 'WakatiEcrStack',
};

const stackName = env.stackName;
const environment = env.environment;

new EcrStack(app, stackName, {
    env,
    description: `EcrStack ECR Stack for ${environment} environment`,
    tags: {
        Project: 'EcrStack',
        Environment: environment,
        ManagedBy: 'CDK',
    },
});
