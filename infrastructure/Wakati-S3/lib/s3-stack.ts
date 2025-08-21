import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class S3Stack extends cdk.Stack {
  public readonly assetsBucket: s3.Bucket;
  public readonly cloudfrontDistribution: cloudfront.Distribution;
  public readonly uploadNotificationTopic: sns.Topic;
  public readonly webhookNotificationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
    const bucketNamePrefix = process.env.BUCKET_NAME_PREFIX || 'rockwell-assets';
    const corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'];
    const lifecycleAbortMultipartDays = parseInt(process.env.LIFECYCLE_ABORT_MULTIPART_DAYS || '1');
    const lifecycleNoncurrentVersionDays = parseInt(process.env.LIFECYCLE_NONCURRENT_VERSION_DAYS || '30');
    const priceClass = process.env.PRICE_CLASS || 'PRICE_CLASS_100';
    const imagesCacheDefaultTtlDays = parseInt(process.env.IMAGES_CACHE_DEFAULT_TTL_DAYS || '30');
    const imagesCacheMaxTtlDays = parseInt(process.env.IMAGES_CACHE_MAX_TTL_DAYS || '365');
    const videosCacheDefaultTtlDays = parseInt(process.env.VIDEOS_CACHE_DEFAULT_TTL_DAYS || '7');
    const videosCacheMaxTtlDays = parseInt(process.env.VIDEOS_CACHE_MAX_TTL_DAYS || '30');
    const snsTopicNamePrefix = process.env.SNS_TOPIC_NAME_PREFIX || 'rockwell-upload-notifications';
    const webhookUrl = process.env.WEBHOOK_URL || 'https://api.weatherfx.dev/asset/webhook/upload-complete';
    const inngestWebhookUrl = process.env.INNGEST_WEBHOOK_URL || 'https://inn.gs/e/XynSO2o81FgXMOLnSWHC5ZGmCYj1QCFsgH7futPJBJoOma6SS7-lsBTpTk0Hq-ejLsxUhdwP8YVG8dZkJ1j-fQ';

    // Custom domain configuration
    const customDomainName = process.env.CUSTOM_DOMAIN_NAME || "cdn.weatherfx.dev";
    const certificateArn = process.env.ACM_CERTIFICATE_ARN || "arn:aws:acm:us-east-1:474036849014:certificate/88a150f0-1934-4109-82c9-d2a68adb7ff5";
    const hostedZoneId = process.env.ROUTE53_HOSTED_ZONE_ID;
    const hostedZoneName = process.env.ROUTE53_HOSTED_ZONE_NAME || "weatherfx.dev"; // Root domain for hosted zone

    // S3 Bucket for Assets
    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `${bucketNamePrefix}-${environment}-${this.account}`,
      versioned: false,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: corsAllowedOrigins,
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        // {
        //   id: 'AbortIncompleteMultipartUploads',
        //   abortIncompleteMultipartUploadAfter: cdk.Duration.days(lifecycleAbortMultipartDays),
        // },
        // {
        //   id: 'DeleteOldVersions',
        //   noncurrentVersionExpiration: cdk.Duration.days(lifecycleNoncurrentVersionDays),
        // },
        {
          id: 'DeleteAssetsAfter1Day',
          expiration: cdk.Duration.days(1),
        },
      ],
      // intelligentTieringConfigurations: [
      //   {
      //     name: 'EntireBucket',
      //   },
      // ],
    });

    // CloudFront Origin Access Control
    const originAccessControl = new cloudfront.CfnOriginAccessControl(this, 'AssetsBucketOAC', {
      originAccessControlConfig: {
        name: `${this.assetsBucket.bucketName}-oac`,
        description: `OAC for ${this.assetsBucket.bucketName}`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    // ACM Certificate (if custom domain is configured)
    let certificate: certificatemanager.ICertificate | undefined;
    if (customDomainName && certificateArn) {
      certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'CloudFrontCertificate',
        certificateArn
      );
    }

    // CloudFront Distribution
    this.cloudfrontDistribution = new cloudfront.Distribution(this, 'AssetsDistribution', {
      comment: `Rockwell Assets CDN - ${environment}`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass[priceClass as keyof typeof cloudfront.PriceClass] || cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
      // Custom domain configuration (if provided)
      ...(customDomainName && certificate ? {
        domainNames: [customDomainName],
        certificate: certificate,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        sslSupportMethod: cloudfront.SSLMethod.SNI,
      } : {}),
      defaultBehavior: {
        origin: new origins.S3Origin(this.assetsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
      },
      additionalBehaviors: {
        '/images/*': {
          origin: new origins.S3Origin(this.assetsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'ImagesCachePolicy', {
            cachePolicyName: `rockwell-images-cache-${environment}`,
            comment: 'Cache policy for images with long TTL',
            defaultTtl: cdk.Duration.days(imagesCacheDefaultTtlDays),
            maxTtl: cdk.Duration.days(imagesCacheMaxTtlDays),
            minTtl: cdk.Duration.seconds(0),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Accept'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
          }),
          compress: true,
        },
        '/videos/*': {
          origin: new origins.S3Origin(this.assetsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'VideosCachePolicy', {
            cachePolicyName: `rockwell-videos-cache-${environment}`,
            comment: 'Cache policy for videos with medium TTL',
            defaultTtl: cdk.Duration.days(videosCacheDefaultTtlDays),
            maxTtl: cdk.Duration.days(videosCacheMaxTtlDays),
            minTtl: cdk.Duration.seconds(0),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Accept', 'Range'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
          }),
          compress: false, // Don't compress videos
        },
      },
    });

    // Update S3 bucket policy to allow CloudFront OAC
    this.assetsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [this.assetsBucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${this.cloudfrontDistribution.distributionId}`,
          },
        },
      })
    );

    // Route53 DNS Record (if custom domain is configured)
    if (customDomainName && certificate && (hostedZoneId || hostedZoneName)) {
      let hostedZone: route53.IHostedZone;

      if (hostedZoneId) {
        // Use existing hosted zone by ID
        hostedZone = route53.HostedZone.fromHostedZoneId(this, 'HostedZone', hostedZoneId);
      } else if (hostedZoneName) {
        // Lookup hosted zone by domain name
        console.log(`Looking up hosted zone for domain: ${hostedZoneName}`);

        hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
          domainName: hostedZoneName,
        });
      } else {
        throw new Error('Either ROUTE53_HOSTED_ZONE_ID or ROUTE53_HOSTED_ZONE_NAME must be provided');
      }

      // Create CNAME record pointing to CloudFront distribution
      // Extract just the subdomain part for the record name if customDomainName is a subdomain
      const recordName = customDomainName.replace(`.${hostedZoneName}`, ''); // Remove the hosted zone part

      new route53.CnameRecord(this, 'CloudFrontCnameRecord', {
        zone: hostedZone,
        recordName: recordName, // e.g., 'cdn' for 'cdn.weatherfx.dev'
        domainName: this.cloudfrontDistribution.distributionDomainName,
        ttl: cdk.Duration.minutes(5), // 5 minute TTL for faster updates during deployment
        comment: `CNAME record for Rockwell CloudFront distribution - ${environment}`,
      });
    }

    // SNS Topic for Upload Notifications
    this.uploadNotificationTopic = new sns.Topic(this, 'UploadNotificationTopic', {
      topicName: `${snsTopicNamePrefix}-${environment}`,
      displayName: `Rockwell Upload Notifications - ${environment}`,
      fifo: false,
    });

    // S3 Event Notifications to SNS
    this.assetsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.SnsDestination(this.uploadNotificationTopic)
    );


    // Lambda function to send webhook notifications
    this.webhookNotificationFunction = new lambda.Function(this, 'WebhookNotificationFunction', {
      functionName: `rockwell-webhook-notifications-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        WEBHOOK_URL: webhookUrl,
      },
      code: lambda.Code.fromInline(`
const https = require('https');
const url = require('url');

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('WEBHOOK_URL environment variable not set');
        return;
    }
    
    try {
        for (const record of event.Records) {
            console.log('Processing record:', JSON.stringify(record, null, 2));
            if (record.EventSource === 'aws:sns' || record.EventSource==='aws:s3') {
                let message;
                if (record.EventSource==='aws:sns'){
                    console.log('SNS event');
                    message = JSON.parse(record.Sns.Message);
                } else {
                    console.log(record.s3)
                    console.log('S3 event');
                    message = record.s3
                }
                console.log('message:', JSON.stringify(message, null, 2));
                
                // Extract S3 event details
                for (const s3Record of message.Records) {
                    const bucketName = s3Record.s3.bucket.name;
                    const objectKey = decodeURIComponent(s3Record.s3.object.key.replace(/\\+/g, ' '));
                    const eventName = s3Record.eventName;
                    const eventTime = s3Record.eventTime;
                    
                    const payload = {
                        event: 'file_uploaded',
                        bucket: bucketName,
                        key: objectKey,
                        eventName: eventName,
                        eventTime: eventTime,
                        size: s3Record.s3.object.size,
                        eTag: s3Record.s3.object.eTag
                    };
                    
                    console.log('Sending webhook payload:', JSON.stringify(payload, null, 2));
                    
                    await sendWebhook(webhookUrl, payload);
                }
            } else {
                console.error('Unsupported event source:', record.EventSource);
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhooks sent successfully' })
        };
    } catch (error) {
        console.error('Error processing webhook:', error);
        throw error;
    }
};

function sendWebhook(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(webhookUrl);
        const postData = JSON.stringify(payload);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Rockwell-S3-Webhook/1.0'
            }
        };
        
        const client = parsedUrl.protocol === 'https:' ? https : require('http');
        
        const req = client.request(options, (res) => {
            console.log(\`Webhook response status: \${ res.statusCode }\`);
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('Webhook response body:', data);
                resolve(data);
            });
        });
        
        req.on('error', (error) => {
            console.error('Webhook request error:', error);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}
      `),
    });

    // Subscribe the Lambda function to the SNS topic
    this.uploadNotificationTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(this.webhookNotificationFunction)
    );

    // Add HTTP subscription to send notifications directly to webhook.com
    this.uploadNotificationTopic.addSubscription(
      new snsSubscriptions.UrlSubscription(inngestWebhookUrl)
    );

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.assetsBucket.bucketName,
      description: 'Name of the S3 bucket for assets',
      exportName: `${this.stackName}-BucketName`,
    });

    new cdk.CfnOutput(this, 'BucketArn', {
      value: this.assetsBucket.bucketArn,
      description: 'ARN of the S3 bucket for assets',
      exportName: `${this.stackName}-BucketArn`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.cloudfrontDistribution.distributionDomainName,
      description: 'Domain name of the CloudFront distribution',
      exportName: `${this.stackName}-CloudFrontDomain`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.cloudfrontDistribution.distributionId,
      description: 'ID of the CloudFront distribution',
      exportName: `${this.stackName}-CloudFrontDistributionId`,
    });

    new cdk.CfnOutput(this, 'UploadNotificationTopicArn', {
      value: this.uploadNotificationTopic.topicArn,
      description: 'ARN of the SNS topic for upload notifications',
      exportName: `${this.stackName}-UploadNotificationTopicArn`,
    });

    new cdk.CfnOutput(this, 'UploadNotificationTopicName', {
      value: this.uploadNotificationTopic.topicName,
      description: 'Name of the SNS topic for upload notifications',
      exportName: `${this.stackName}-UploadNotificationTopicName`,
    });

    new cdk.CfnOutput(this, 'WebhookNotificationFunctionArn', {
      value: this.webhookNotificationFunction.functionArn,
      description: 'ARN of the Lambda function for webhook notifications',
      exportName: `${this.stackName}-WebhookNotificationFunctionArn`,
    });

    new cdk.CfnOutput(this, 'WebhookUrl', {
      value: webhookUrl,
      description: 'Webhook URL for upload notifications',
      exportName: `${this.stackName}-WebhookUrl`,
    });

    // Custom domain outputs (if configured)
    if (customDomainName) {
      new cdk.CfnOutput(this, 'CustomDomainName', {
        value: customDomainName,
        description: 'Custom domain name for the CloudFront distribution',
        exportName: `${this.stackName}-CustomDomainName`,
      });
    }

    if (certificateArn) {
      new cdk.CfnOutput(this, 'CertificateArn', {
        value: certificateArn,
        description: 'ARN of the ACM certificate used for the custom domain',
        exportName: `${this.stackName}-CertificateArn`,
      });
    }

    if (hostedZoneId) {
      new cdk.CfnOutput(this, 'HostedZoneId', {
        value: hostedZoneId,
        description: 'Route53 Hosted Zone ID used for DNS record',
        exportName: `${this.stackName}-HostedZoneId`,
      });
    }

    if (hostedZoneName) {
      new cdk.CfnOutput(this, 'HostedZoneName', {
        value: hostedZoneName,
        description: 'Route53 Hosted Zone Name used for DNS lookup',
        exportName: `${this.stackName}-HostedZoneName`,
      });
    }

    // Tags
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Application', 'Rockwell');
    cdk.Tags.of(this).add('Component', 'Assets');
  }
}