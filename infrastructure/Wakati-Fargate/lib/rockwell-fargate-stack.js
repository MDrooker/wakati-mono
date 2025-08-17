"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RockwellFargateStack = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const iam = require("aws-cdk-lib/aws-iam");
const logs = require("aws-cdk-lib/aws-logs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const servicediscovery = require("aws-cdk-lib/aws-servicediscovery");
const elasticloadbalancingv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const ssm = require("aws-cdk-lib/aws-ssm");
class RockwellFargateStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Get environment from stack name or default to 'dev'
        const environment = id.includes('prod') ? 'prod' :
            id.includes('staging') ? 'staging' : 'dev';
        // Import ECR repository ARN from the ECR stack
        const ecrRepositoryUri = cdk.Fn.importValue(`${props.ecrStackName}-RepositoryUri`);
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
        executionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
            ],
            resources: ['*'],
        }));
        // Grant CloudWatch Logs access
        executionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: [logGroup.logGroupArn],
        }));
        // Grant SSM Parameter Store access for secrets
        executionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ssm:GetParameter',
                'ssm:GetParameters',
            ],
            resources: [
                `arn:aws:ssm:${this.region}:${this.account}:parameter/rockwell/*`,
            ],
        }));
        // Add common AWS service permissions to task role
        taskRole.addToPolicy(new iam.PolicyStatement({
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
        }));
        // Create security group for Application Load Balancer
        const loadBalancerSecurityGroup = new ec2.SecurityGroup(this, 'LoadBalancerSecurityGroup', {
            vpc,
            securityGroupName: `rockwell-alb-sg-${environment}`,
            description: 'Security group for Rockwell Application Load Balancer',
            allowAllOutbound: true,
        });
        // Allow HTTP and HTTPS traffic to load balancer
        loadBalancerSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
        loadBalancerSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
        // Create Application Load Balancer
        this.loadBalancer = new elasticloadbalancingv2.ApplicationLoadBalancer(this, 'RockwellLoadBalancer', {
            loadBalancerName: `rockwell-alb-${environment}`,
            vpc,
            internetFacing: true,
        });
        // Add security group to load balancer
        this.loadBalancer.addSecurityGroup(loadBalancerSecurityGroup);
        // Create ECS Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'RockwellTaskDefinition', {
            family: `rockwell-api-${environment}`,
            cpu: 512,
            memoryLimitMiB: 1024,
            taskRole,
            executionRole,
        });
        // Add container to task definition
        const container = taskDefinition.addContainer('RockwellApiContainer', {
            containerName: 'rockwell-api',
            image: ecs.ContainerImage.fromRegistry(`${ecrRepositoryUri}:latest`),
            logging: ecs.LogDrivers.awsLogs({
                logGroup,
                streamPrefix: 'ecs',
            }),
            environment: {
                NODE_ENV: environment,
                PORT: '3000',
                // Add non-sensitive environment variables from Parameter Store
                SYSTEM: ssm.StringParameter.valueFromLookup(this, `/rockwell/${environment}/system`),
                PRODUCT: ssm.StringParameter.valueFromLookup(this, `/rockwell/${environment}/product`),
                ENVIRONMENT: ssm.StringParameter.valueFromLookup(this, `/rockwell/${environment}/environment`),
                SUPABASE_BUCKETNAME: ssm.StringParameter.valueFromLookup(this, `/rockwell/${environment}/supabase_bucketname`),
            },
            secrets: {
                // Add secrets from AWS Systems Manager Parameter Store
                DATABASE_URL: ecs.Secret.fromSsmParameter(ssm.StringParameter.fromStringParameterName(this, 'DatabaseUrlParam', `/rockwell/${environment}/database_url`)),
                SUPABASE_URL: ecs.Secret.fromSsmParameter(ssm.StringParameter.fromStringParameterName(this, 'SupabaseUrlParam', `/rockwell/${environment}/supabase_url`)),
                SUPABASE_ANON_KEY: ecs.Secret.fromSsmParameter(ssm.StringParameter.fromStringParameterName(this, 'SupabaseAnonKeyParam', `/rockwell/${environment}/supabase_anon_key`)),
                SUPABASE_JWT_SECRET: ecs.Secret.fromSsmParameter(ssm.StringParameter.fromStringParameterName(this, 'SupabaseJwtSecretParam', `/rockwell/${environment}/supabase_jwt_secret`)),
                SUPABASE_SERVICE_ROLE_KEY: ecs.Secret.fromSsmParameter(ssm.StringParameter.fromStringParameterName(this, 'SupabaseServiceRoleKeyParam', `/rockwell/${environment}/supabase_service_role_key`)),
                RESEND_APIKEY: ecs.Secret.fromSsmParameter(ssm.StringParameter.fromStringParameterName(this, 'ResendApiKeyParam', `/rockwell/${environment}/resend_apikey`)),
                CRUD_API_TOKEN: ecs.Secret.fromSsmParameter(ssm.StringParameter.fromStringParameterName(this, 'CrudApiTokenParam', `/rockwell/${environment}/crud_api_token`)),
            },
            healthCheck: {
                command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                retries: 3,
                startPeriod: cdk.Duration.seconds(60),
            },
        });
        // Add port mapping
        container.addPortMappings({
            containerPort: 3000,
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
        serviceSecurityGroup.addIngressRule(loadBalancerSecurityGroup, ec2.Port.tcp(3000), 'Allow traffic from load balancer');
        // Create ECS Fargate Service
        this.service = new ecs.FargateService(this, 'RockwellService', {
            serviceName: `rockwell-api-${environment}`,
            cluster: this.cluster,
            taskDefinition,
            desiredCount: environment === 'prod' ? 2 : 1,
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
        });
        // Create target group for load balancer
        const targetGroup = new elasticloadbalancingv2.ApplicationTargetGroup(this, 'RockwellTargetGroup', {
            targetGroupName: `rockwell-tg-${environment}`,
            vpc,
            port: 3000,
            protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
            targetType: elasticloadbalancingv2.TargetType.IP,
            healthCheck: {
                enabled: true,
                path: '/health',
                protocol: elasticloadbalancingv2.Protocol.HTTP,
                healthyHttpCodes: '200',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 5,
            },
        });
        // Attach service to target group
        this.service.attachToApplicationTargetGroup(targetGroup);
        // Create load balancer listener
        const listener = this.loadBalancer.addListener('RockwellListener', {
            port: 80,
            protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
            defaultTargetGroups: [targetGroup],
        });
        // Create API Gateway for external access
        this.apiGateway = new apigateway.RestApi(this, 'RockwellApiGateway', {
            restApiName: `rockwell-api-gateway-${environment}`,
            description: 'API Gateway for Rockwell API',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
            },
            binaryMediaTypes: ['*/*'],
        });
        // Create API Gateway integration (HTTP integration to public ALB)
        const integration = new apigateway.HttpIntegration(`http://${this.loadBalancer.loadBalancerDnsName}/{proxy}`, {
            httpMethod: 'ANY',
            options: {
                connectionType: apigateway.ConnectionType.INTERNET,
                requestParameters: {
                    'integration.request.path.proxy': 'method.request.path.proxy',
                },
            },
        });
        // Create root integration without proxy parameter
        const rootIntegration = new apigateway.HttpIntegration(`http://${this.loadBalancer.loadBalancerDnsName}`, {
            httpMethod: 'ANY',
            options: {
                connectionType: apigateway.ConnectionType.INTERNET,
            },
        });
        // Add proxy resource to API Gateway
        const proxyResource = this.apiGateway.root.addResource('{proxy+}');
        proxyResource.addMethod('ANY', integration, {
            requestParameters: {
                'method.request.path.proxy': true,
            },
        });
        // Add root method with different integration
        this.apiGateway.root.addMethod('ANY', rootIntegration);
        // Auto Scaling
        const scalableTarget = this.service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: environment === 'prod' ? 10 : 3,
        });
        // CPU-based scaling
        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(2),
        });
        // Memory-based scaling
        scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
            targetUtilizationPercent: 80,
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(2),
        });
        // Outputs
        new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
            value: this.loadBalancer.loadBalancerDnsName,
            description: 'DNS name of the Application Load Balancer',
            exportName: `${id}-LoadBalancerDnsName`,
        });
        new cdk.CfnOutput(this, 'ApiGatewayUrl', {
            value: this.apiGateway.url,
            description: 'URL of the API Gateway',
            exportName: `${id}-ApiGatewayUrl`,
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
        // Add tags to all resources
        cdk.Tags.of(this).add('Project', 'Rockwell');
        cdk.Tags.of(this).add('Environment', environment);
        cdk.Tags.of(this).add('Component', 'Fargate');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
    }
}
exports.RockwellFargateStack = RockwellFargateStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9ja3dlbGwtZmFyZ2F0ZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJvY2t3ZWxsLWZhcmdhdGUtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZDQUE2QztBQUM3Qyx5REFBeUQ7QUFDekQscUVBQXFFO0FBQ3JFLGlGQUFpRjtBQUdqRiwyQ0FBMkM7QUFPM0MsTUFBYSxvQkFBcUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQU0vQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHNEQUFzRDtRQUN0RCxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QyxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUUvQywrQ0FBK0M7UUFDL0MsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxZQUFZLGdCQUFnQixDQUFDLENBQUM7UUFFbkYsNkNBQTZDO1FBQzdDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsV0FBVyxFQUFFO1lBQ3RDLE1BQU0sRUFBRSxDQUFDO1lBQ1QsV0FBVyxFQUFFLENBQUMsRUFBRSx3Q0FBd0M7WUFDeEQsbUJBQW1CLEVBQUU7Z0JBQ2pCO29CQUNJLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1B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QVUsRUFBRSxHQUFHLEVBQUUsUUFBUTtTQUM1QixDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBQ0o7QUFsWUQsb0RBa1lDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBzZXJ2aWNlZGlzY292ZXJ5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZXJ2aWNlZGlzY292ZXJ5JztcbmltcG9ydCAqIGFzIGVsYXN0aWNsb2FkYmFsYW5jaW5ndjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyBjZXJ0aWZpY2F0ZW1hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBzc20gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBSb2Nrd2VsbEZhcmdhdGVTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICAgIGVjclN0YWNrTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUm9ja3dlbGxGYXJnYXRlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICAgIHB1YmxpYyByZWFkb25seSBjbHVzdGVyOiBlY3MuQ2x1c3RlcjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2VydmljZTogZWNzLkZhcmdhdGVTZXJ2aWNlO1xuICAgIHB1YmxpYyByZWFkb25seSBsb2FkQmFsYW5jZXI6IGVsYXN0aWNsb2FkYmFsYW5jaW5ndjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXI7XG4gICAgcHVibGljIHJlYWRvbmx5IGFwaUdhdGV3YXk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBSb2Nrd2VsbEZhcmdhdGVTdGFja1Byb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgICAgIC8vIEdldCBlbnZpcm9ubWVudCBmcm9tIHN0YWNrIG5hbWUgb3IgZGVmYXVsdCB0byAnZGV2J1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudCA9IGlkLmluY2x1ZGVzKCdwcm9kJykgPyAncHJvZCcgOlxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3N0YWdpbmcnKSA/ICdzdGFnaW5nJyA6ICdkZXYnO1xuXG4gICAgICAgIC8vIEltcG9ydCBFQ1IgcmVwb3NpdG9yeSBBUk4gZnJvbSB0aGUgRUNSIHN0YWNrXG4gICAgICAgIGNvbnN0IGVjclJlcG9zaXRvcnlVcmkgPSBjZGsuRm4uaW1wb3J0VmFsdWUoYCR7cHJvcHMuZWNyU3RhY2tOYW1lfS1SZXBvc2l0b3J5VXJpYCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIFZQQyB3aXRoIHB1YmxpYyBhbmQgcHJpdmF0ZSBzdWJuZXRzXG4gICAgICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdSb2Nrd2VsbFZwYycsIHtcbiAgICAgICAgICAgIHZwY05hbWU6IGByb2Nrd2VsbC12cGMtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgICAgICAgbWF4QXpzOiAyLFxuICAgICAgICAgICAgbmF0R2F0ZXdheXM6IDEsIC8vIENvc3Qgb3B0aW1pemF0aW9uIC0gdXNlIDEgTkFUIGdhdGV3YXlcbiAgICAgICAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdwdWJsaWMnLFxuICAgICAgICAgICAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgICAgICAgICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3ByaXZhdGUnLFxuICAgICAgICAgICAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgICAgICAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSBFQ1MgQ2x1c3RlclxuICAgICAgICB0aGlzLmNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIodGhpcywgJ1JvY2t3ZWxsQ2x1c3RlcicsIHtcbiAgICAgICAgICAgIGNsdXN0ZXJOYW1lOiBgcm9ja3dlbGwtY2x1c3Rlci0ke2Vudmlyb25tZW50fWAsXG4gICAgICAgICAgICB2cGMsXG4gICAgICAgICAgICBjb250YWluZXJJbnNpZ2h0czogdHJ1ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNlcnZpY2UgZGlzY292ZXJ5IG5hbWVzcGFjZVxuICAgICAgICBjb25zdCBuYW1lc3BhY2UgPSBuZXcgc2VydmljZWRpc2NvdmVyeS5Qcml2YXRlRG5zTmFtZXNwYWNlKHRoaXMsICdSb2Nrd2VsbE5hbWVzcGFjZScsIHtcbiAgICAgICAgICAgIG5hbWU6IGByb2Nrd2VsbC4ke2Vudmlyb25tZW50fS5sb2NhbGAsXG4gICAgICAgICAgICB2cGMsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NlcnZpY2UgZGlzY292ZXJ5IG5hbWVzcGFjZSBmb3IgUm9ja3dlbGwgc2VydmljZXMnLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBMb2cgR3JvdXBcbiAgICAgICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnUm9ja3dlbGxMb2dHcm91cCcsIHtcbiAgICAgICAgICAgIGxvZ0dyb3VwTmFtZTogYC9lY3Mvcm9ja3dlbGwtYXBpLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgICAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIElBTSByb2xlcyBmb3IgRUNTIHRhc2tzXG4gICAgICAgIGNvbnN0IHRhc2tSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdSb2Nrd2VsbFRhc2tSb2xlJywge1xuICAgICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyksXG4gICAgICAgICAgICByb2xlTmFtZTogYHJvY2t3ZWxsLXRhc2stcm9sZS0ke2Vudmlyb25tZW50fWAsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBSb2Nrd2VsbCBFQ1MgdGFza3MnLFxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBleGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdSb2Nrd2VsbEV4ZWN1dGlvblJvbGUnLCB7XG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgICAgICAgIHJvbGVOYW1lOiBgcm9ja3dlbGwtZXhlY3V0aW9uLXJvbGUtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgICAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQW1hem9uRUNTVGFza0V4ZWN1dGlvblJvbGVQb2xpY3knKSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBFQ1MgdGFzayBleGVjdXRpb24nLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBHcmFudCBFQ1IgYWNjZXNzIHRvIGV4ZWN1dGlvbiByb2xlXG4gICAgICAgIGV4ZWN1dGlvblJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ2VjcjpHZXRBdXRob3JpemF0aW9uVG9rZW4nLFxuICAgICAgICAgICAgICAgICAgICAnZWNyOkJhdGNoQ2hlY2tMYXllckF2YWlsYWJpbGl0eScsXG4gICAgICAgICAgICAgICAgICAgICdlY3I6R2V0RG93bmxvYWRVcmxGb3JMYXllcicsXG4gICAgICAgICAgICAgICAgICAgICdlY3I6QmF0Y2hHZXRJbWFnZScsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBHcmFudCBDbG91ZFdhdGNoIExvZ3MgYWNjZXNzXG4gICAgICAgIGV4ZWN1dGlvblJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW2xvZ0dyb3VwLmxvZ0dyb3VwQXJuXSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gR3JhbnQgU1NNIFBhcmFtZXRlciBTdG9yZSBhY2Nlc3MgZm9yIHNlY3JldHNcbiAgICAgICAgZXhlY3V0aW9uUm9sZS5hZGRUb1BvbGljeShcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAnc3NtOkdldFBhcmFtZXRlcicsXG4gICAgICAgICAgICAgICAgICAgICdzc206R2V0UGFyYW1ldGVycycsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgYGFybjphd3M6c3NtOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpwYXJhbWV0ZXIvcm9ja3dlbGwvKmAsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQWRkIGNvbW1vbiBBV1Mgc2VydmljZSBwZXJtaXNzaW9ucyB0byB0YXNrIHJvbGVcbiAgICAgICAgdGFza1JvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgICAgICdhcm46YXdzOnMzOjo6cm9ja3dlbGwtKicsXG4gICAgICAgICAgICAgICAgICAgICdhcm46YXdzOnMzOjo6cm9ja3dlbGwtKi8qJyxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgc2VjdXJpdHkgZ3JvdXAgZm9yIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXJcbiAgICAgICAgY29uc3QgbG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnTG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgICAgICAgIHZwYyxcbiAgICAgICAgICAgIHNlY3VyaXR5R3JvdXBOYW1lOiBgcm9ja3dlbGwtYWxiLXNnLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIFJvY2t3ZWxsIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXInLFxuICAgICAgICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWxsb3cgSFRUUCBhbmQgSFRUUFMgdHJhZmZpYyB0byBsb2FkIGJhbGFuY2VyXG4gICAgICAgIGxvYWRCYWxhbmNlclNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICAgICAgICBlYzIuUGVlci5hbnlJcHY0KCksXG4gICAgICAgICAgICBlYzIuUG9ydC50Y3AoODApLFxuICAgICAgICAgICAgJ0FsbG93IEhUVFAgdHJhZmZpYydcbiAgICAgICAgKTtcblxuICAgICAgICBsb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgICAgICAgZWMyLlBvcnQudGNwKDQ0MyksXG4gICAgICAgICAgICAnQWxsb3cgSFRUUFMgdHJhZmZpYydcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlclxuICAgICAgICB0aGlzLmxvYWRCYWxhbmNlciA9IG5ldyBlbGFzdGljbG9hZGJhbGFuY2luZ3YyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyKHRoaXMsICdSb2Nrd2VsbExvYWRCYWxhbmNlcicsIHtcbiAgICAgICAgICAgIGxvYWRCYWxhbmNlck5hbWU6IGByb2Nrd2VsbC1hbGItJHtlbnZpcm9ubWVudH1gLFxuICAgICAgICAgICAgdnBjLFxuICAgICAgICAgICAgaW50ZXJuZXRGYWNpbmc6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBzZWN1cml0eSBncm91cCB0byBsb2FkIGJhbGFuY2VyXG4gICAgICAgIHRoaXMubG9hZEJhbGFuY2VyLmFkZFNlY3VyaXR5R3JvdXAobG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIEVDUyBUYXNrIERlZmluaXRpb25cbiAgICAgICAgY29uc3QgdGFza0RlZmluaXRpb24gPSBuZXcgZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbih0aGlzLCAnUm9ja3dlbGxUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgICAgIGZhbWlseTogYHJvY2t3ZWxsLWFwaS0ke2Vudmlyb25tZW50fWAsXG4gICAgICAgICAgICBjcHU6IDUxMixcbiAgICAgICAgICAgIG1lbW9yeUxpbWl0TWlCOiAxMDI0LFxuICAgICAgICAgICAgdGFza1JvbGUsXG4gICAgICAgICAgICBleGVjdXRpb25Sb2xlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgY29udGFpbmVyIHRvIHRhc2sgZGVmaW5pdGlvblxuICAgICAgICBjb25zdCBjb250YWluZXIgPSB0YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoJ1JvY2t3ZWxsQXBpQ29udGFpbmVyJywge1xuICAgICAgICAgICAgY29udGFpbmVyTmFtZTogJ3JvY2t3ZWxsLWFwaScsXG4gICAgICAgICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeShgJHtlY3JSZXBvc2l0b3J5VXJpfTpsYXRlc3RgKSxcbiAgICAgICAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xuICAgICAgICAgICAgICAgIGxvZ0dyb3VwLFxuICAgICAgICAgICAgICAgIHN0cmVhbVByZWZpeDogJ2VjcycsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICAgICAgTk9ERV9FTlY6IGVudmlyb25tZW50LFxuICAgICAgICAgICAgICAgIFBPUlQ6ICczMDAwJyxcbiAgICAgICAgICAgICAgICAvLyBBZGQgbm9uLXNlbnNpdGl2ZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZnJvbSBQYXJhbWV0ZXIgU3RvcmVcbiAgICAgICAgICAgICAgICBTWVNURU06IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGcm9tTG9va3VwKHRoaXMsIGAvcm9ja3dlbGwvJHtlbnZpcm9ubWVudH0vc3lzdGVtYCksXG4gICAgICAgICAgICAgICAgUFJPRFVDVDogc3NtLlN0cmluZ1BhcmFtZXRlci52YWx1ZUZyb21Mb29rdXAodGhpcywgYC9yb2Nrd2VsbC8ke2Vudmlyb25tZW50fS9wcm9kdWN0YCksXG4gICAgICAgICAgICAgICAgRU5WSVJPTk1FTlQ6IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGcm9tTG9va3VwKHRoaXMsIGAvcm9ja3dlbGwvJHtlbnZpcm9ubWVudH0vZW52aXJvbm1lbnRgKSxcbiAgICAgICAgICAgICAgICBTVVBBQkFTRV9CVUNLRVROQU1FOiBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCh0aGlzLCBgL3JvY2t3ZWxsLyR7ZW52aXJvbm1lbnR9L3N1cGFiYXNlX2J1Y2tldG5hbWVgKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXRzOiB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIHNlY3JldHMgZnJvbSBBV1MgU3lzdGVtcyBNYW5hZ2VyIFBhcmFtZXRlciBTdG9yZVxuICAgICAgICAgICAgICAgIERBVEFCQVNFX1VSTDogZWNzLlNlY3JldC5mcm9tU3NtUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICAgICBzc20uU3RyaW5nUGFyYW1ldGVyLmZyb21TdHJpbmdQYXJhbWV0ZXJOYW1lKHRoaXMsICdEYXRhYmFzZVVybFBhcmFtJywgYC9yb2Nrd2VsbC8ke2Vudmlyb25tZW50fS9kYXRhYmFzZV91cmxgKVxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgU1VQQUJBU0VfVVJMOiBlY3MuU2VjcmV0LmZyb21Tc21QYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgIHNzbS5TdHJpbmdQYXJhbWV0ZXIuZnJvbVN0cmluZ1BhcmFtZXRlck5hbWUodGhpcywgJ1N1cGFiYXNlVXJsUGFyYW0nLCBgL3JvY2t3ZWxsLyR7ZW52aXJvbm1lbnR9L3N1cGFiYXNlX3VybGApXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBTVVBBQkFTRV9BTk9OX0tFWTogZWNzLlNlY3JldC5mcm9tU3NtUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICAgICBzc20uU3RyaW5nUGFyYW1ldGVyLmZyb21TdHJpbmdQYXJhbWV0ZXJOYW1lKHRoaXMsICdTdXBhYmFzZUFub25LZXlQYXJhbScsIGAvcm9ja3dlbGwvJHtlbnZpcm9ubWVudH0vc3VwYWJhc2VfYW5vbl9rZXlgKVxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgU1VQQUJBU0VfSldUX1NFQ1JFVDogZWNzLlNlY3JldC5mcm9tU3NtUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICAgICBzc20uU3RyaW5nUGFyYW1ldGVyLmZyb21TdHJpbmdQYXJhbWV0ZXJOYW1lKHRoaXMsICdTdXBhYmFzZUp3dFNlY3JldFBhcmFtJywgYC9yb2Nrd2VsbC8ke2Vudmlyb25tZW50fS9zdXBhYmFzZV9qd3Rfc2VjcmV0YClcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIFNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVk6IGVjcy5TZWNyZXQuZnJvbVNzbVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgc3NtLlN0cmluZ1BhcmFtZXRlci5mcm9tU3RyaW5nUGFyYW1ldGVyTmFtZSh0aGlzLCAnU3VwYWJhc2VTZXJ2aWNlUm9sZUtleVBhcmFtJywgYC9yb2Nrd2VsbC8ke2Vudmlyb25tZW50fS9zdXBhYmFzZV9zZXJ2aWNlX3JvbGVfa2V5YClcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIFJFU0VORF9BUElLRVk6IGVjcy5TZWNyZXQuZnJvbVNzbVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgc3NtLlN0cmluZ1BhcmFtZXRlci5mcm9tU3RyaW5nUGFyYW1ldGVyTmFtZSh0aGlzLCAnUmVzZW5kQXBpS2V5UGFyYW0nLCBgL3JvY2t3ZWxsLyR7ZW52aXJvbm1lbnR9L3Jlc2VuZF9hcGlrZXlgKVxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgQ1JVRF9BUElfVE9LRU46IGVjcy5TZWNyZXQuZnJvbVNzbVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgc3NtLlN0cmluZ1BhcmFtZXRlci5mcm9tU3RyaW5nUGFyYW1ldGVyTmFtZSh0aGlzLCAnQ3J1ZEFwaVRva2VuUGFyYW0nLCBgL3JvY2t3ZWxsLyR7ZW52aXJvbm1lbnR9L2NydWRfYXBpX3Rva2VuYClcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhlYWx0aENoZWNrOiB7XG4gICAgICAgICAgICAgICAgY29tbWFuZDogWydDTUQtU0hFTEwnLCAnY3VybCAtZiBodHRwOi8vbG9jYWxob3N0OjMwMDAvaGVhbHRoIHx8IGV4aXQgMSddLFxuICAgICAgICAgICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXG4gICAgICAgICAgICAgICAgcmV0cmllczogMyxcbiAgICAgICAgICAgICAgICBzdGFydFBlcmlvZDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIHBvcnQgbWFwcGluZ1xuICAgICAgICBjb250YWluZXIuYWRkUG9ydE1hcHBpbmdzKHtcbiAgICAgICAgICAgIGNvbnRhaW5lclBvcnQ6IDMwMDAsXG4gICAgICAgICAgICBwcm90b2NvbDogZWNzLlByb3RvY29sLlRDUCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNlY3VyaXR5IGdyb3VwIGZvciBFQ1Mgc2VydmljZVxuICAgICAgICBjb25zdCBzZXJ2aWNlU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnU2VydmljZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgICAgICB2cGMsXG4gICAgICAgICAgICBzZWN1cml0eUdyb3VwTmFtZTogYHJvY2t3ZWxsLXNlcnZpY2Utc2ctJHtlbnZpcm9ubWVudH1gLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgUm9ja3dlbGwgRUNTIHNlcnZpY2UnLFxuICAgICAgICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWxsb3cgdHJhZmZpYyBmcm9tIGxvYWQgYmFsYW5jZXIgdG8gc2VydmljZVxuICAgICAgICBzZXJ2aWNlU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgICAgICAgIGxvYWRCYWxhbmNlclNlY3VyaXR5R3JvdXAsXG4gICAgICAgICAgICBlYzIuUG9ydC50Y3AoMzAwMCksXG4gICAgICAgICAgICAnQWxsb3cgdHJhZmZpYyBmcm9tIGxvYWQgYmFsYW5jZXInXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIEVDUyBGYXJnYXRlIFNlcnZpY2VcbiAgICAgICAgdGhpcy5zZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCAnUm9ja3dlbGxTZXJ2aWNlJywge1xuICAgICAgICAgICAgc2VydmljZU5hbWU6IGByb2Nrd2VsbC1hcGktJHtlbnZpcm9ubWVudH1gLFxuICAgICAgICAgICAgY2x1c3RlcjogdGhpcy5jbHVzdGVyLFxuICAgICAgICAgICAgdGFza0RlZmluaXRpb24sXG4gICAgICAgICAgICBkZXNpcmVkQ291bnQ6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyAyIDogMSxcbiAgICAgICAgICAgIHNlY3VyaXR5R3JvdXBzOiBbc2VydmljZVNlY3VyaXR5R3JvdXBdLFxuICAgICAgICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2xvdWRNYXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2FwaScsXG4gICAgICAgICAgICAgICAgY2xvdWRNYXBOYW1lc3BhY2U6IG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgICBkbnNSZWNvcmRUeXBlOiBzZXJ2aWNlZGlzY292ZXJ5LkRuc1JlY29yZFR5cGUuQSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmFibGVFeGVjdXRlQ29tbWFuZDogdHJ1ZSwgLy8gRm9yIGRlYnVnZ2luZ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGFyZ2V0IGdyb3VwIGZvciBsb2FkIGJhbGFuY2VyXG4gICAgICAgIGNvbnN0IHRhcmdldEdyb3VwID0gbmV3IGVsYXN0aWNsb2FkYmFsYW5jaW5ndjIuQXBwbGljYXRpb25UYXJnZXRHcm91cCh0aGlzLCAnUm9ja3dlbGxUYXJnZXRHcm91cCcsIHtcbiAgICAgICAgICAgIHRhcmdldEdyb3VwTmFtZTogYHJvY2t3ZWxsLXRnLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgICAgICAgIHZwYyxcbiAgICAgICAgICAgIHBvcnQ6IDMwMDAsXG4gICAgICAgICAgICBwcm90b2NvbDogZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXG4gICAgICAgICAgICB0YXJnZXRUeXBlOiBlbGFzdGljbG9hZGJhbGFuY2luZ3YyLlRhcmdldFR5cGUuSVAsXG4gICAgICAgICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgcGF0aDogJy9oZWFsdGgnLFxuICAgICAgICAgICAgICAgIHByb3RvY29sOiBlbGFzdGljbG9hZGJhbGFuY2luZ3YyLlByb3RvY29sLkhUVFAsXG4gICAgICAgICAgICAgICAgaGVhbHRoeUh0dHBDb2RlczogJzIwMCcsXG4gICAgICAgICAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgICAgICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXG4gICAgICAgICAgICAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQ6IDUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBdHRhY2ggc2VydmljZSB0byB0YXJnZXQgZ3JvdXBcbiAgICAgICAgdGhpcy5zZXJ2aWNlLmF0dGFjaFRvQXBwbGljYXRpb25UYXJnZXRHcm91cCh0YXJnZXRHcm91cCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGxvYWQgYmFsYW5jZXIgbGlzdGVuZXJcbiAgICAgICAgY29uc3QgbGlzdGVuZXIgPSB0aGlzLmxvYWRCYWxhbmNlci5hZGRMaXN0ZW5lcignUm9ja3dlbGxMaXN0ZW5lcicsIHtcbiAgICAgICAgICAgIHBvcnQ6IDgwLFxuICAgICAgICAgICAgcHJvdG9jb2w6IGVsYXN0aWNsb2FkYmFsYW5jaW5ndjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxuICAgICAgICAgICAgZGVmYXVsdFRhcmdldEdyb3VwczogW3RhcmdldEdyb3VwXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIEFQSSBHYXRld2F5IGZvciBleHRlcm5hbCBhY2Nlc3NcbiAgICAgICAgdGhpcy5hcGlHYXRld2F5ID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnUm9ja3dlbGxBcGlHYXRld2F5Jywge1xuICAgICAgICAgICAgcmVzdEFwaU5hbWU6IGByb2Nrd2VsbC1hcGktZ2F0ZXdheS0ke2Vudmlyb25tZW50fWAsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGZvciBSb2Nrd2VsbCBBUEknLFxuICAgICAgICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgICAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgICAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdYLUFtei1EYXRlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1BcGktS2V5JywgJ1gtQW16LVNlY3VyaXR5LVRva2VuJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYmluYXJ5TWVkaWFUeXBlczogWycqLyonXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIEFQSSBHYXRld2F5IGludGVncmF0aW9uIChIVFRQIGludGVncmF0aW9uIHRvIHB1YmxpYyBBTEIpXG4gICAgICAgIGNvbnN0IGludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuSHR0cEludGVncmF0aW9uKGBodHRwOi8vJHt0aGlzLmxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJEbnNOYW1lfS97cHJveHl9YCwge1xuICAgICAgICAgICAgaHR0cE1ldGhvZDogJ0FOWScsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvblR5cGU6IGFwaWdhdGV3YXkuQ29ubmVjdGlvblR5cGUuSU5URVJORVQsXG4gICAgICAgICAgICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ2ludGVncmF0aW9uLnJlcXVlc3QucGF0aC5wcm94eSc6ICdtZXRob2QucmVxdWVzdC5wYXRoLnByb3h5JyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHJvb3QgaW50ZWdyYXRpb24gd2l0aG91dCBwcm94eSBwYXJhbWV0ZXJcbiAgICAgICAgY29uc3Qgcm9vdEludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuSHR0cEludGVncmF0aW9uKGBodHRwOi8vJHt0aGlzLmxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJEbnNOYW1lfWAsIHtcbiAgICAgICAgICAgIGh0dHBNZXRob2Q6ICdBTlknLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25UeXBlOiBhcGlnYXRld2F5LkNvbm5lY3Rpb25UeXBlLklOVEVSTkVULFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIHByb3h5IHJlc291cmNlIHRvIEFQSSBHYXRld2F5XG4gICAgICAgIGNvbnN0IHByb3h5UmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgne3Byb3h5K30nKTtcbiAgICAgICAgcHJveHlSZXNvdXJjZS5hZGRNZXRob2QoJ0FOWScsIGludGVncmF0aW9uLCB7XG4gICAgICAgICAgICByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICdtZXRob2QucmVxdWVzdC5wYXRoLnByb3h5JzogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCByb290IG1ldGhvZCB3aXRoIGRpZmZlcmVudCBpbnRlZ3JhdGlvblxuICAgICAgICB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRNZXRob2QoJ0FOWScsIHJvb3RJbnRlZ3JhdGlvbik7XG5cbiAgICAgICAgLy8gQXV0byBTY2FsaW5nXG4gICAgICAgIGNvbnN0IHNjYWxhYmxlVGFyZ2V0ID0gdGhpcy5zZXJ2aWNlLmF1dG9TY2FsZVRhc2tDb3VudCh7XG4gICAgICAgICAgICBtaW5DYXBhY2l0eTogMSxcbiAgICAgICAgICAgIG1heENhcGFjaXR5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gMTAgOiAzLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDUFUtYmFzZWQgc2NhbGluZ1xuICAgICAgICBzY2FsYWJsZVRhcmdldC5zY2FsZU9uQ3B1VXRpbGl6YXRpb24oJ0NwdVNjYWxpbmcnLCB7XG4gICAgICAgICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwLFxuICAgICAgICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNZW1vcnktYmFzZWQgc2NhbGluZ1xuICAgICAgICBzY2FsYWJsZVRhcmdldC5zY2FsZU9uTWVtb3J5VXRpbGl6YXRpb24oJ01lbW9yeVNjYWxpbmcnLCB7XG4gICAgICAgICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDgwLFxuICAgICAgICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBPdXRwdXRzXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2FkQmFsYW5jZXJEbnNOYW1lJywge1xuICAgICAgICAgICAgdmFsdWU6IHRoaXMubG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckRuc05hbWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ROUyBuYW1lIG9mIHRoZSBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyJyxcbiAgICAgICAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1Mb2FkQmFsYW5jZXJEbnNOYW1lYCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XG4gICAgICAgICAgICB2YWx1ZTogdGhpcy5hcGlHYXRld2F5LnVybCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVVJMIG9mIHRoZSBBUEkgR2F0ZXdheScsXG4gICAgICAgICAgICBleHBvcnROYW1lOiBgJHtpZH0tQXBpR2F0ZXdheVVybGAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbHVzdGVyTmFtZScsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLmNsdXN0ZXIuY2x1c3Rlck5hbWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIEVDUyBjbHVzdGVyJyxcbiAgICAgICAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1DbHVzdGVyTmFtZWAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZXJ2aWNlTmFtZScsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLnNlcnZpY2Uuc2VydmljZU5hbWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIEVDUyBzZXJ2aWNlJyxcbiAgICAgICAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1TZXJ2aWNlTmFtZWAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWcGNJZCcsIHtcbiAgICAgICAgICAgIHZhbHVlOiB2cGMudnBjSWQsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0lEIG9mIHRoZSBWUEMnLFxuICAgICAgICAgICAgZXhwb3J0TmFtZTogYCR7aWR9LVZwY0lkYCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIHRhZ3MgdG8gYWxsIHJlc291cmNlc1xuICAgICAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ1Byb2plY3QnLCAnUm9ja3dlbGwnKTtcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KTtcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdDb21wb25lbnQnLCAnRmFyZ2F0ZScpO1xuICAgICAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ01hbmFnZWRCeScsICdDREsnKTtcbiAgICB9XG59XG4iXX0=