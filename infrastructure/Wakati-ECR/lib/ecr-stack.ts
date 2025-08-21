import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class EcrStack extends cdk.Stack {
    public readonly repository: ecr.Repository;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        let env = (props?.env || {}) as { product?: string, system?: string };
        // Get environment from stack name or default to 'dev'
        const environment = id.includes('prod') ? 'prod' :
            id.includes('staging') ? 'staging' : 'dev';        // Create ECR repository for Wakati API
        const productName = env.product || 'wakati';
        const systemName = env.system || 'api';
        console.log(env);
        this.repository = new ecr.Repository(this, 'WakatiApiRepository', {
            repositoryName: `${productName}-${systemName}-${environment}`,
            imageScanOnPush: true,
            imageTagMutability: ecr.TagMutability.MUTABLE,
            lifecycleRules: [
                {
                    description: 'Keep last 10 production images',
                    tagStatus: ecr.TagStatus.TAGGED,
                    tagPrefixList: ['prod', 'release'],
                    maxImageCount: 10,
                },
                {
                    description: 'Keep last 5 staging images',
                    tagStatus: ecr.TagStatus.TAGGED,
                    tagPrefixList: ['staging', 'stage'],
                    maxImageCount: 5,
                },
                {
                    description: 'Keep last 3 dev images',
                    tagStatus: ecr.TagStatus.TAGGED,
                    tagPrefixList: ['dev', 'latest'],
                    maxImageCount: 3,
                },
                {
                    description: 'Delete untagged images after 1 day',
                    tagStatus: ecr.TagStatus.UNTAGGED,
                    maxImageAge: cdk.Duration.days(1),
                },
            ],
        });

        // Create IAM role for Fargate tasks to pull from ECR
        const fargateTaskRole = new iam.Role(this, 'FargateTaskEcrRole', {
            roleName: `wakati-fargate-ecr-${environment}`,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: 'Role for Fargate tasks to pull Docker images from ECR',
        });

        // Grant Fargate task role permissions to pull from ECR
        this.repository.grantPull(fargateTaskRole);

        // Output the repository URI
        new cdk.CfnOutput(this, 'RepositoryUri', {
            value: this.repository.repositoryUri,
            description: 'ECR Repository URI for Wakati API',
            exportName: `${id}-RepositoryUri`,
        });

        // Output the repository ARN
        new cdk.CfnOutput(this, 'RepositoryArn', {
            value: this.repository.repositoryArn,
            description: 'ECR Repository ARN for Wakati API',
            exportName: `${id}-RepositoryArn`,
        });

        // Output Fargate task role ARN
        new cdk.CfnOutput(this, 'FargateTaskRoleArn', {
            value: fargateTaskRole.roleArn,
            description: 'Fargate Task Role ARN for ECR access',
            exportName: `${id}-FargateTaskRoleArn`,
        });

        // Add tags to all resources
        cdk.Tags.of(this).add('Project', 'Wakati');
        cdk.Tags.of(this).add('Environment', environment);
        cdk.Tags.of(this).add('Component', 'ECR');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
    }
}
