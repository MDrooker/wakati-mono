#!/usr/bin/env node

/**
 * Script to upload .env file values to AWS Parameter Store
 * Usage: npm run upload-env [environment] [env-file-path]
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const environment = process.argv[2] || 'dev';
const envFilePath = process.argv[3] || path.resolve(__dirname, '../../../apps/api/.env');

// Configure AWS SDK
const ssm = new AWS.SSM({
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
});

const parameterPrefix = `/rockwell/${environment}`;

console.log(`Uploading environment variables to Parameter Store...`);
console.log(`Environment: ${environment}`);
console.log(`Env file: ${envFilePath}`);
console.log(`Parameter prefix: ${parameterPrefix}`);

async function uploadEnvToParameterStore() {
    try {
        // Check if .env file exists
        if (!fs.existsSync(envFilePath)) {
            throw new Error(`Environment file not found: ${envFilePath}`);
        }

        // Read and parse .env file
        const envContent = fs.readFileSync(envFilePath, 'utf8');
        const envVars = {};

        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    // Remove quotes if present
                    let value = valueParts.join('=');
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    envVars[key] = value;
                }
            }
        });

        console.log(`Found ${Object.keys(envVars).length} environment variables`);

        // Upload each environment variable to Parameter Store
        const uploadPromises = Object.entries(envVars).map(async ([key, value]) => {
            const parameterName = `${parameterPrefix}/${key}`;

            // Determine parameter type based on content
            const isSecret = key.toLowerCase().includes('secret') ||
                key.toLowerCase().includes('password') ||
                key.toLowerCase().includes('key') ||
                key.toLowerCase().includes('token');

            const parameterType = isSecret ? 'SecureString' : 'String';

            console.log(`📝 Uploading ${parameterName} (${parameterType})`);

            try {
                await ssm.putParameter({
                    Name: parameterName,
                    Value: value,
                    Type: parameterType,
                    Overwrite: true,
                    Description: `Environment variable for Rockwell API ${environment}`
                }).promise();

                return { key, status: 'success' };
            } catch (error) {
                console.error(`❌ Failed to upload ${parameterName}:`, error.message);
                return { key, status: 'error', error: error.message };
            }
        });

        const results = await Promise.all(uploadPromises);

        const successful = results.filter(r => r.status === 'success');
        const failed = results.filter(r => r.status === 'error');

        console.log(`\n✅ Successfully uploaded ${successful.length} parameters`);
        if (failed.length > 0) {
            console.log(`❌ Failed to upload ${failed.length} parameters:`);
            failed.forEach(result => {
                console.log(`  - ${result.key}: ${result.error}`);
            });
        }

        console.log('\n📋 Parameter Store structure:');
        successful.forEach(result => {
            console.log(`  ${parameterPrefix}/${result.key}`);
        });

    } catch (error) {
        console.error('❌ Error uploading environment variables:', error.message);
        process.exit(1);
    }
}

// Check if AWS SDK is available
if (typeof AWS === 'undefined') {
    console.error('❌ AWS SDK not found. Please install it: npm install aws-sdk');
    process.exit(1);
}

uploadEnvToParameterStore();
