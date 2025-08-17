#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RockwellFargateStack } from '../lib/rockwell-fargate-stack';

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = new cdk.App();

// Get environment configuration
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

const stackName = process.env.STACK_NAME || 'RockwellFargateStack';
const environment = process.env.ENVIRONMENT || 'dev';
const ecrStackName = process.env.ECR_STACK_NAME || 'RockwellEcrStack';

// Deploy full stack by default
new RockwellFargateStack(app, stackName, {
    env,
    description: `Rockwell Fargate Stack for ${environment} environment`,
    ecrStackName,
    tags: {
        Project: 'Rockwell',
        Environment: environment,
        ManagedBy: 'CDK',
    },
});

// Optional: Deploy minimal stack for debugging
// Uncomment this section to deploy the minimal stack instead

// new RockwellFargateMinimalStack(app, `${stackName}Minimal`, {
//     env,
//     description: `Minimal Rockwell Fargate Stack for debugging ${environment}`,
//     ecrStackName,
//     tags: {
//         Project: 'Rockwell',
//         Environment: environment,
//         Component: 'Minimal',
//         Purpose: 'Debugging',
//         ManagedBy: 'CDK',
//     },
// });

