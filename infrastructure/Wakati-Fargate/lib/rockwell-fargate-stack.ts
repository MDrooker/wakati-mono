import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as elasticloadbalancingv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as mediaconvert from 'aws-cdk-lib/aws-mediaconvert';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface RockwellFargateStackProps extends cdk.StackProps {
    ecrStackName: string;
}

export class RockwellFargateStack extends cdk.Stack {
    public readonly cluster: ecs.Cluster;
    public readonly service: ecs.FargateService;
    public readonly loadBalancer: elasticloadbalancingv2.ApplicationLoadBalancer;

    constructor(scope: Construct, id: string, props: RockwellFargateStackProps) {
        super(scope, id, props);

        // Get environment from stack name or default to 'dev'
        const environment = id.includes('prod') ? 'prod' :
            id.includes('staging') ? 'staging' : 'dev';

        // Import ECR repository ARN from the ECR stack
        const ecrRepositoryUri = cdk.Fn.importValue(`${props.ecrStackName}-RepositoryUri`);

        // Add a parameter for image tag to make deployments more flexible
        const imageTag = new cdk.CfnParameter(this, 'ImageTag', {
            type: 'String',
            default: 'latest',
            description: 'Docker image tag to deploy',
        });        // Add a parameter for container port to make it configurable
        const containerPort = new cdk.CfnParameter(this, 'ContainerPort', {
            type: 'Number',
            default: 8080,
            description: 'Port that the container application listens on',
            minValue: 1024,
            maxValue: 65535,
        });

        // Add parameters for HTTPS configuration
        const domainName = new cdk.CfnParameter(this, 'DomainName', {
            type: 'String',
            default: '',
            description: 'Domain name for HTTPS endpoint (e.g., api.yourdomain.com). Leave empty to use load balancer DNS name only.',
        });

        const hostedZoneId = new cdk.CfnParameter(this, 'HostedZoneId', {
            type: 'String',
            default: '',
            description: 'Route53 Hosted Zone ID for the domain. Required if DomainName is provided.',
        });

        const certificateArn = new cdk.CfnParameter(this, 'CertificateArn', {
            type: 'String',
            default: '',
            description: 'ACM Certificate ARN for HTTPS. Leave empty to create a new certificate.',
        });

        const enableHttpsRedirect = new cdk.CfnParameter(this, 'EnableHttpsRedirect', {
            type: 'String',
            default: 'true',
            allowedValues: ['true', 'false'],
            description: 'Whether to redirect HTTP traffic to HTTPS',
        });

        // Create VPC with public and private subnets
        const vpc = new ec2.Vpc(this, 'RockwellVpc', {
            vpcName: `rockwell-vpc-${environment}`,
            maxAzs: 2,
            natGateways: 1, // Cost optimization - use 1 NAT gateway
            subnetConfiguration: [
                {
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24,
                },
            ],
        });

        // Create ECS Cluster
        this.cluster = new ecs.Cluster(this, 'RockwellCluster', {
            clusterName: `rockwell-cluster-${environment}`,
            vpc,
            containerInsights: true,
        });

        // Create service discovery namespace
        const namespace = new servicediscovery.PrivateDnsNamespace(this, 'RockwellNamespace', {
            name: `rockwell.${environment}.local`,
            vpc,
            description: 'Service discovery namespace for Rockwell services',
        });

        // Create CloudWatch Log Group
        const logGroup = new logs.LogGroup(this, 'RockwellLogGroup', {
            logGroupName: `/ecs/rockwell-api-${environment}`,
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Create IAM roles for ECS tasks
        const taskRole = new iam.Role(this, 'RockwellTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            roleName: `rockwell-task-role-${environment}`,
            description: 'IAM role for Rockwell ECS tasks',
        });

        const executionRole = new iam.Role(this, 'RockwellExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            roleName: `rockwell-execution-role-${environment}`,
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
            ],
            description: 'IAM role for ECS task execution',
        });

        // Grant ECR access to execution role
        executionRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ecr:GetAuthorizationToken',
                    'ecr:BatchCheckLayerAvailability',
                    'ecr:GetDownloadUrlForLayer',
                    'ecr:BatchGetImage',
                ],
                resources: ['*'],
            })
        );

        // Grant CloudWatch Logs access
        executionRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                ],
                resources: [logGroup.logGroupArn],
            })
        );

        // Grant SSM Parameter Store access for secrets
        executionRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ssm:GetParameter',
                    'ssm:GetParameters',
                ],
                resources: [
                    `arn:aws:ssm:${this.region}:${this.account}:parameter/rockwell/${environment}/*`,
                ],
            })
        );

        // Add common AWS service permissions to task role
        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    's3:GetObject',
                    's3:PutObject',
                    's3:DeleteObject',
                    's3:ListBucket',
                ],
                resources: [
                    'arn:aws:s3:::rockwell-*',
                    'arn:aws:s3:::rockwell-*/*',
                ],
            })
        );

        // Add AWS Rekognition permissions for content moderation
        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    // Image analysis
                    'rekognition:DetectLabels',
                    'rekognition:DetectModerationLabels',
                    'rekognition:DetectFaces',
                    'rekognition:DetectText',
                    // Video analysis
                    'rekognition:StartLabelDetection',
                    'rekognition:StartContentModeration',
                    'rekognition:StartFaceDetection',
                    'rekognition:StartTextDetection',
                    'rekognition:GetLabelDetection',
                    'rekognition:GetContentModeration',
                    'rekognition:GetFaceDetection',
                    'rekognition:GetTextDetection',
                    // Custom models (if used)
                    'rekognition:DetectCustomLabels',
                    'rekognition:StartCustomModelDetection',
                    'rekognition:GetCustomModelDetection',
                ],
                resources: ['*'], // Rekognition doesn't support resource-level permissions
            })
        );

        // Add SNS permissions for Rekognition video analysis notifications
        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'sns:Publish',
                    'sns:CreateTopic',
                    'sns:GetTopicAttributes',
                    'sns:SetTopicAttributes',
                    'sns:Subscribe',
                    'sns:Unsubscribe',
                ],
                resources: [
                    `arn:aws:sns:${this.region}:${this.account}:rockwell-*`,
                ],
            })
        );

        // Add SQS permissions for processing Rekognition notifications
        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'sqs:ReceiveMessage',
                    'sqs:DeleteMessage',
                    'sqs:SendMessage',
                    'sqs:GetQueueAttributes',
                    'sqs:ChangeMessageVisibility',
                ],
                resources: [
                    `arn:aws:sqs:${this.region}:${this.account}:rockwell-*`,
                ],
            })
        );

        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'polly:SynthesizeSpeech',
                ],
                resources: ['*'],
            })
        );

        // Add AWS Comprehend permissions for text analysis and moderation
        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    // Text analysis
                    'comprehend:DetectSentiment',
                    'comprehend:DetectEntities',
                    'comprehend:DetectKeyPhrases',
                    'comprehend:DetectLanguage',
                    'comprehend:DetectSyntax',
                    // Content moderation
                    'comprehend:DetectToxicContent',
                    'comprehend:DetectPiiEntities',
                    // Classification and custom models
                    'comprehend:ClassifyDocument',
                    'comprehend:StartDocumentClassificationJob',
                    'comprehend:DescribeDocumentClassificationJob',
                ],
                resources: ['*'], // Comprehend doesn't support resource-level permissions
            })
        );

        // Add AWS MediaConvert permissions for video transcoding
        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    // Job management
                    'mediaconvert:CreateJob',
                    'mediaconvert:GetJob',
                    'mediaconvert:ListJobs',
                    'mediaconvert:CancelJob',
                    // Queue management
                    'mediaconvert:DescribeQueues',
                    'mediaconvert:ListQueues',
                    // Preset and template management
                    'mediaconvert:DescribePresets',
                    'mediaconvert:ListPresets',
                    'mediaconvert:DescribeJobTemplates',
                    'mediaconvert:ListJobTemplates',
                    // Endpoint discovery
                    'mediaconvert:DescribeEndpoints',
                ],
                resources: [
                    `arn:aws:mediaconvert:${this.region}:${this.account}:*`,
                ],
            })
        );

        // Add CloudFront permissions for CDN cache invalidation
        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cloudfront:CreateInvalidation',
                    'cloudfront:GetInvalidation',
                    'cloudfront:ListInvalidations',
                ],
                resources: [
                    `arn:aws:cloudfront::${this.account}:distribution/*`,
                ],
            })
        );

        // Create MediaConvert service role for video transcoding
        const mediaConvertRole = new iam.Role(this, 'MediaConvertRole', {
            assumedBy: new iam.ServicePrincipal('mediaconvert.amazonaws.com'),
            roleName: `rockwell-mediaconvert-role-${environment}`,
            description: 'IAM role for AWS MediaConvert to access S3 and other resources',
        });

        // Grant MediaConvert role access to S3 buckets
        mediaConvertRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    's3:GetObject',
                    's3:GetObjectVersion',
                    's3:PutObject',
                    's3:PutObjectAcl',
                    's3:GetBucketLocation',
                    's3:ListBucket',
                ],
                resources: [
                    'arn:aws:s3:::rockwell-*',
                    'arn:aws:s3:::rockwell-*/*',
                ],
            })
        );

        // Grant MediaConvert role CloudWatch Logs access
        mediaConvertRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                    'logs:DescribeLogGroups',
                    'logs:DescribeLogStreams',
                ],
                resources: [
                    `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/mediaconvert/*`,
                ],
            })
        );

        // Grant MediaConvert role API Gateway access (for progress callbacks if needed)
        mediaConvertRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'execute-api:Invoke',
                ],
                resources: [
                    `arn:aws:execute-api:${this.region}:${this.account}:*/*/POST/webhooks/mediaconvert`,
                ],
            })
        );

        // Create MediaConvert queue for job processing
        const mediaConvertQueue = new mediaconvert.CfnQueue(this, 'MediaConvertQueue', {
            name: `rockwell-hls-queue-${environment}`,
            description: 'MediaConvert queue for Rockwell HLS transcoding jobs',
            status: 'ACTIVE',
            pricingPlan: 'ON_DEMAND', // Can be changed to 'RESERVED' for consistent workloads
            tags: {
                Project: 'Rockwell',
                Environment: environment,
                Component: 'MediaConvert',
                Purpose: 'HLS-Transcoding',
                ManagedBy: 'CDK',
            },
        });

        // Allow ECS task role to pass the MediaConvert role
        taskRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'iam:PassRole',
                ],
                resources: [
                    mediaConvertRole.roleArn,
                ],
                conditions: {
                    StringEquals: {
                        'iam:PassedToService': 'mediaconvert.amazonaws.com',
                    },
                },
            })
        );

        // Store MediaConvert role and queue ARNs in SSM Parameter Store
        new ssm.StringParameter(this, 'MediaConvertRoleArnParameter', {
            parameterName: `/rockwell/${environment}/aws-mediaconvert-role-arn`,
            stringValue: mediaConvertRole.roleArn,
            description: 'ARN of the IAM role for AWS MediaConvert service',
            tier: ssm.ParameterTier.STANDARD,
        });

        new ssm.StringParameter(this, 'MediaConvertQueueArnParameter', {
            parameterName: `/rockwell/${environment}/aws-mediaconvert-queue-arn`,
            stringValue: mediaConvertQueue.attrArn,
            description: 'ARN of the MediaConvert queue for HLS transcoding',
            tier: ssm.ParameterTier.STANDARD,
        });

        // Create security group for Application Load Balancer
        const loadBalancerSecurityGroup = new ec2.SecurityGroup(this, 'LoadBalancerSecurityGroup', {
            vpc,
            securityGroupName: `rockwell-alb-sg-${environment}`,
            description: 'Security group for Rockwell Application Load Balancer',
            allowAllOutbound: true,
        });

        // Allow HTTP and HTTPS traffic to load balancer
        loadBalancerSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
            'Allow HTTP traffic'
        );

        loadBalancerSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            'Allow HTTPS traffic'
        );

        // Create Application Load Balancer
        this.loadBalancer = new elasticloadbalancingv2.ApplicationLoadBalancer(this, 'RockwellLoadBalancer', {
            loadBalancerName: `rockwell-alb-${environment}`,
            vpc,
            internetFacing: true,
        });

        // Add security group to load balancer
        this.loadBalancer.addSecurityGroup(loadBalancerSecurityGroup);

        // Configure load balancer attributes for better performance under load
        this.loadBalancer.setAttribute('idle_timeout.timeout_seconds', '60'); // Increase from default 60s
        this.loadBalancer.setAttribute('routing.http2.enabled', 'true'); // Enable HTTP/2
        this.loadBalancer.setAttribute('routing.http.preserve_host_header.enabled', 'true');
        this.loadBalancer.setAttribute('routing.http.xff_client_port.enabled', 'true');
        this.loadBalancer.setAttribute('deletion_protection.enabled', environment === 'prod' ? 'true' : 'false');
        // Additional performance optimizations for high load
        this.loadBalancer.setAttribute('routing.http.drop_invalid_header_fields.enabled', 'true');
        this.loadBalancer.setAttribute('routing.http.x_amzn_tls_version_and_cipher_suite.enabled', 'true');

        // HTTPS Configuration - Certificate and DNS Setup
        let certificate: certificatemanager.ICertificate | undefined;
        let hostedZone: route53.IHostedZone | undefined;

        // Create or import certificate if domain is provided
        if (domainName.valueAsString && domainName.valueAsString !== '') {
            if (certificateArn.valueAsString && certificateArn.valueAsString !== '') {
                // Use existing certificate
                certificate = certificatemanager.Certificate.fromCertificateArn(
                    this,
                    'ImportedCertificate',
                    certificateArn.valueAsString
                );
            } else if (hostedZoneId.valueAsString && hostedZoneId.valueAsString !== '') {
                // Create new certificate with DNS validation for custom domain
                hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
                    hostedZoneId: hostedZoneId.valueAsString,
                    zoneName: domainName.valueAsString.split('.').slice(-2).join('.'), // Extract root domain
                });

                certificate = new certificatemanager.Certificate(this, 'Certificate', {
                    domainName: domainName.valueAsString,
                    validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
                });
            }
        }
        // Note: HTTPS is only supported with custom domains or existing certificates
        // Load balancer DNS names cannot have SSL certificates issued directly

        // Create ECS Task Definition with optimized resources for load handling
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'RockwellTaskDefinition', {
            family: `rockwell-api-${environment}`,
            cpu: environment === 'prod' ? 1024 : 512, // Increase CPU for production
            memoryLimitMiB: environment === 'prod' ? 2048 : 1024, // Increase memory for production
            taskRole,
            executionRole,
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture: ecs.CpuArchitecture.ARM64, // Use ARM if needed for cost optimization
            },
        });

        // Add container to task definition
        const container = taskDefinition.addContainer('RockwellApiContainer', {
            containerName: 'rockwell-api',
            image: ecs.ContainerImage.fromRegistry(`${ecrRepositoryUri}:${imageTag.valueAsString}`),
            logging: ecs.LogDrivers.awsLogs({
                logGroup,
                streamPrefix: 'ecs',
            }),
            // Add health check to prevent hanging during deployment
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    `wget --no-verbose --tries=1 --spider http://localhost:${containerPort.valueAsNumber}/healthz || ` +
                    `wget --no-verbose --tries=1 --spider http://localhost:${containerPort.valueAsNumber}/health || ` +
                    `nc -z localhost ${containerPort.valueAsNumber} || exit 1`
                ],
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(10),
                retries: 3,
                startPeriod: cdk.Duration.seconds(90),
            },
            environment: {
                NODE_ENV: environment,
                PORT: containerPort.valueAsString,


                // System Configuration
                SYSTEM: 'rockwell',
                PRODUCT: 'api',
                ENVIRONMENT: environment,

                // Service Configuration
                SERVICE_VERSION: '1.0.0',
                CLUSTER_MODE: 'false',
                // Non-sensitive configuration values
                SUPABASE_BUCKETNAME: 'assets',
                INNGEST_DEVMODE: environment === 'dev' ? 'true' : 'false',
                INNGEST_BASE_URL: "http://inngest:8288"

            },
            secrets: {
                // Database Configuration
                DATABASE_URL: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'DatabaseUrlParam', {
                        parameterName: `/rockwell/${environment}/database_url`,
                        version: 1
                    })
                ),

                // Supabase Configuration
                SUPABASE_URL: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'SupabaseUrlParam', {
                        parameterName: `/rockwell/${environment}/supabase_url`,
                        version: 1
                    })
                ),
                SUPABASE_ANON_KEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'SupabaseAnonKeyParam', {
                        parameterName: `/rockwell/${environment}/supabase_anon_key`,
                        version: 1
                    })
                ),
                SUPABASE_JWT_SECRET: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'SupabaseJwtSecretParam', {
                        parameterName: `/rockwell/${environment}/supabase_jwt_secret`,
                        version: 1
                    })
                ),
                SUPABASE_SERVICE_ROLE_KEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'SupabaseServiceRoleKeyParam', {
                        parameterName: `/rockwell/${environment}/supabase_service_role_key`,
                        version: 1
                    })
                ),
                SUPABASE_TOKEN_OVERRIDE: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'SupabaseTokenOverrideParam', {
                        parameterName: `/rockwell/${environment}/supabase_token_override`,
                        version: 1
                    })
                ),

                // API Keys
                RESEND_APIKEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'ResendApiKeyParam', {
                        parameterName: `/rockwell/${environment}/resend_apikey`,
                        version: 1
                    })
                ),
                CRUD_API_TOKEN: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'CrudApiTokenParam', {
                        parameterName: `/rockwell/${environment}/crud_api_token`,
                        version: 1
                    })
                ),

                // Inngest Configuration
                INNGEST_API_KEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'InngestApiKeyParam', {
                        parameterName: `/rockwell/${environment}/inngest_api_key`,
                        version: 1
                    })
                ),
                INNGEST_EVENT_KEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'InngestEventKeyParam', {
                        parameterName: `/rockwell/${environment}/inngest_event_key`,
                        version: 1
                    })
                ),
                INNGEST_SIGNING_KEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'InngestSigningKeyParam', {
                        parameterName: `/rockwell/${environment}/inngest_signing_key`,
                        version: 1
                    })
                ),


                // Media Processing
                HLS_TRANSCODE_METHOD: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'HlsTranscodeMethodParam', {
                        parameterName: `/rockwell/${environment}/hls_transcode_method`,
                        version: 1
                    })
                ),
                AWS_MEDIACONVERT_ROLE_ARN: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'AwsMediaConvertRoleArnParam', {
                        parameterName: `/rockwell/${environment}/aws_mediaconvert_role_arn`,
                        version: 1
                    })
                ),
                AWS_MEDIACONVERT_QUEUE_ARN: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'AwsMediaConvertQueueArnParam', {
                        parameterName: `/rockwell/${environment}/aws_mediaconvert_queue_arn`,
                        version: 1
                    })
                ),

                // Monitoring & Observability
                NEW_RELIC_LICENSE_KEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'NewRelicLicenseKeyParam', {
                        parameterName: `/rockwell/${environment}/new_relic_license_key`,
                        version: 1
                    })
                ),
                OTEL_EXPORTER_OTLP_ENDPOINT: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'OtelExporterOtlpEndpointParam', {
                        parameterName: `/rockwell/${environment}/otel_exporter_otlp_endpoint`,
                        version: 1
                    })
                ),
                OTEL_EXPORTER_OTLP_HEADERS: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'OtelExporterOtlpHeadersParam', {
                        parameterName: `/rockwell/${environment}/otel_exporter_otlp_headers`,
                        version: 1
                    })
                ),

                // AI/ML Services
                OPENAI_API_KEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'OpenAiApiKeyParam', {
                        parameterName: `/rockwell/${environment}/openai_api_key`,
                        version: 1
                    })
                ),
                ELEVENLABS_API_KEY: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'ElevenLabsApiKeyParam', {
                        parameterName: `/rockwell/${environment}/elevenlabs_api_key`,
                        version: 1
                    })
                ),

                // Optional: Redis Configuration
                REDIS_URL: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'RedisUrlParam', {
                        parameterName: `/rockwell/${environment}/redis_url`,
                        version: 1
                    })
                ),

                // AWS Configuration
                AWS_S3_BUCKET_NAME: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'AwsS3BucketNameParam', {
                        parameterName: `/rockwell/${environment}/aws_s3_bucket_name`,
                        version: 1
                    })
                ),
                AWS_CLOUDFRONT_DOMAIN: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'AwsCloudfrontDomainParam', {
                        parameterName: `/rockwell/${environment}/aws_cloudfront_domain`,
                        version: 1
                    })
                ),
                AWS_ACCOUNT_ID: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'AwsAccountIdParam', {
                        parameterName: `/rockwell/${environment}/aws_account_id`,
                        version: 1
                    })
                ),
                AWS_REGION: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'AwsRegionParam', {
                        parameterName: `/rockwell/${environment}/aws_region`,
                        version: 1
                    })
                ),
                // URL Configuration for CDN and API access
                CDN_BASE_URL: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromStringParameterAttributes(this, 'CdnBaseUrlParam', {
                        parameterName: `/rockwell/${environment}/aws_cloudfront_domain`,
                        version: 1
                    })
                ),
            },
        });

        // Add port mapping
        container.addPortMappings({
            containerPort: containerPort.valueAsNumber,
            protocol: ecs.Protocol.TCP,
        });

        // Create security group for ECS service
        const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
            vpc,
            securityGroupName: `rockwell-service-sg-${environment}`,
            description: 'Security group for Rockwell ECS service',
            allowAllOutbound: true,
        });

        // Allow traffic from load balancer to service
        serviceSecurityGroup.addIngressRule(
            loadBalancerSecurityGroup,
            ec2.Port.tcp(containerPort.valueAsNumber),
            'Allow traffic from load balancer'
        );

        // Create ECS Fargate Service with optimized configuration for load handling
        this.service = new ecs.FargateService(this, 'RockwellService', {
            serviceName: `rockwell-api-${environment}`,
            cluster: this.cluster,
            taskDefinition,
            desiredCount: environment === 'prod' ? 3 : 1, // Start with more tasks in production
            securityGroups: [serviceSecurityGroup],
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            cloudMapOptions: {
                name: 'api',
                cloudMapNamespace: namespace,
                dnsRecordType: servicediscovery.DnsRecordType.A,
            },
            enableExecuteCommand: true, // For debugging
            // Add deployment circuit breaker for faster failure detection
            circuitBreaker: { rollback: true },
            // Add deployment timeout
            platformVersion: ecs.FargatePlatformVersion.LATEST,
        });

        // Create target group for load balancer with optimized settings for load handling
        const targetGroup = new elasticloadbalancingv2.ApplicationTargetGroup(this, 'RockwellTargetGroup', {
            targetGroupName: `rockwell-tg-${environment}`,
            vpc,
            port: containerPort.valueAsNumber,
            protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
            targetType: elasticloadbalancingv2.TargetType.IP,
            healthCheck: {
                enabled: true,
                path: '/healthz',
                protocol: elasticloadbalancingv2.Protocol.HTTP,
                port: containerPort.valueAsString,
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3, // Reduced for faster detection
                timeout: cdk.Duration.seconds(5), // Reduced timeout
                interval: cdk.Duration.seconds(15), // More frequent checks
                healthyHttpCodes: '200',
            },
            deregistrationDelay: cdk.Duration.seconds(15), // Faster deployments and scaling
            // Add connection draining and load balancer attributes
            stickinessCookieDuration: cdk.Duration.minutes(1), // Optional: session affinity
        });

        // Attach service to target group
        this.service.attachToApplicationTargetGroup(targetGroup);

        // Create load balancer listeners with timeout optimizations
        // HTTP Listener (always created for health checks and optional redirect)
        const httpListener = this.loadBalancer.addListener('HttpListener', {
            port: 80,
            protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
            defaultTargetGroups: certificate && enableHttpsRedirect.valueAsString === 'true' ? [] : [targetGroup],
        });

        // HTTPS Listener (created if certificate is available)
        let httpsListener: elasticloadbalancingv2.ApplicationListener | undefined;
        if (certificate) {
            httpsListener = this.loadBalancer.addListener('HttpsListener', {
                port: 443,
                protocol: elasticloadbalancingv2.ApplicationProtocol.HTTPS,
                certificates: [certificate],
                defaultTargetGroups: [targetGroup],
            });

            // Redirect HTTP to HTTPS if enabled
            if (enableHttpsRedirect.valueAsString === 'true') {
                httpListener.addAction('HttpsRedirect', {
                    action: elasticloadbalancingv2.ListenerAction.redirect({
                        protocol: 'HTTPS',
                        port: '443',
                        permanent: true,
                    }),
                });
            }
        }

        // Create Route53 alias record if domain and hosted zone are provided
        if (domainName.valueAsString && domainName.valueAsString !== '' && hostedZone) {
            new route53.ARecord(this, 'AliasRecord', {
                zone: hostedZone,
                recordName: domainName.valueAsString,
                target: route53.RecordTarget.fromAlias(
                    new route53targets.LoadBalancerTarget(this.loadBalancer)
                ),
            });
        }

        // Auto Scaling optimized for load handling
        const scalableTarget = this.service.autoScaleTaskCount({
            minCapacity: environment === 'prod' ? 2 : 1, // Ensure minimum capacity for production
            maxCapacity: environment === 'prod' ? 10 : 3,
        });

        // CPU-based scaling with faster response
        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 60, // Scale earlier to prevent overload
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(1), // Scale up faster
        });

        // Memory-based scaling with optimized thresholds
        scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
            targetUtilizationPercent: 75, // Scale earlier to prevent memory pressure
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(1), // Scale up faster
        });

        // Request-based scaling to prevent 504 timeouts
        scalableTarget.scaleOnRequestCount('RequestScaling', {
            requestsPerTarget: 100, // Scale when requests per task exceed 100
            targetGroup: targetGroup,
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(1), // Scale up quickly on high request volume
        });

        // Add debugging outputs to help identify hanging resources
        new cdk.CfnOutput(this, 'DebugEcrRepositoryUri', {
            value: ecrRepositoryUri,
            description: 'ECR Repository URI being used (debug)',
        });

        new cdk.CfnOutput(this, 'DebugTaskRoleArn', {
            value: taskRole.roleArn,
            description: 'Task Role ARN (debug)',
        });

        new cdk.CfnOutput(this, 'DebugExecutionRoleArn', {
            value: executionRole.roleArn,
            description: 'Execution Role ARN (debug)',
        });

        new cdk.CfnOutput(this, 'DebugTaskDefinitionArn', {
            value: taskDefinition.taskDefinitionArn,
            description: 'Task Definition ARN (debug)',
        });

        new cdk.CfnOutput(this, 'DebugLogGroupArn', {
            value: logGroup.logGroupArn,
            description: 'CloudWatch Log Group ARN (debug)',
        });

        new cdk.CfnOutput(this, 'DebugNamespaceId', {
            value: namespace.namespaceId,
            description: 'Service Discovery Namespace ID (debug)',
        });

        new cdk.CfnOutput(this, 'DebugContainerPort', {
            value: containerPort.valueAsString,
            description: 'Container Port being used (debug)',
        });

        // Outputs
        new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
            value: this.loadBalancer.loadBalancerDnsName,
            description: 'DNS name of the Application Load Balancer - use this as your API endpoint',
            exportName: `${id}-LoadBalancerDnsName`,
        });

        new cdk.CfnOutput(this, 'HttpUrl', {
            value: `http://${this.loadBalancer.loadBalancerDnsName}`,
            description: 'HTTP URL to access your API',
        });

        new cdk.CfnOutput(this, 'HttpsUrl', {
            value: certificate ? `https://${this.loadBalancer.loadBalancerDnsName}` : 'HTTPS not configured',
            description: 'HTTPS URL to access your API (if certificate is configured)',
        });

        new cdk.CfnOutput(this, 'CustomDomainUrl', {
            value: domainName.valueAsString && domainName.valueAsString !== ''
                ? (certificate ? `https://${domainName.valueAsString}` : `http://${domainName.valueAsString}`)
                : 'Custom domain not configured',
            description: 'Custom domain URL (if configured)',
        });

        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: domainName.valueAsString && domainName.valueAsString !== '' && certificate
                ? `https://${domainName.valueAsString}`
                : certificate
                    ? `https://${this.loadBalancer.loadBalancerDnsName}`
                    : `http://${this.loadBalancer.loadBalancerDnsName}`,
            description: 'Primary API endpoint URL (HTTPS preferred if available)',
            exportName: `${id}-ApiEndpoint`,
        });

        new cdk.CfnOutput(this, 'SslCertificateArn', {
            value: certificate ? certificate.certificateArn : 'No certificate configured',
            description: 'SSL/TLS Certificate ARN (if configured)',
        });

        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'Name of the ECS cluster',
            exportName: `${id}-ClusterName`,
        });

        new cdk.CfnOutput(this, 'ServiceName', {
            value: this.service.serviceName,
            description: 'Name of the ECS service',
            exportName: `${id}-ServiceName`,
        });

        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'ID of the VPC',
            exportName: `${id}-VpcId`,
        });

        // MediaConvert configuration outputs
        new cdk.CfnOutput(this, 'MediaConvertRoleArn', {
            value: mediaConvertRole.roleArn,
            description: 'ARN of the MediaConvert IAM role',
            exportName: `${id}-MediaConvertRoleArn`,
        });

        new cdk.CfnOutput(this, 'MediaConvertQueueArn', {
            value: mediaConvertQueue.attrArn,
            description: 'ARN of the MediaConvert queue for HLS transcoding',
            exportName: `${id}-MediaConvertQueueArn`,
        });

        // Add tags to all resources
        cdk.Tags.of(this).add('Project', 'Rockwell');
        cdk.Tags.of(this).add('Environment', environment);
        cdk.Tags.of(this).add('Component', 'Fargate');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
    }
}
