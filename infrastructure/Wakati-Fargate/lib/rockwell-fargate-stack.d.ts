import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as elasticloadbalancingv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
export interface RockwellFargateStackProps extends cdk.StackProps {
    ecrStackName: string;
}
export declare class RockwellFargateStack extends cdk.Stack {
    readonly cluster: ecs.Cluster;
    readonly service: ecs.FargateService;
    readonly loadBalancer: elasticloadbalancingv2.ApplicationLoadBalancer;
    readonly apiGateway: apigateway.RestApi;
    constructor(scope: Construct, id: string, props: RockwellFargateStackProps);
}
