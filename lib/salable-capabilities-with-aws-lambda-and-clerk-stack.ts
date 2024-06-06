import * as cdk from 'aws-cdk-lib';
import {CfnResource} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {AuthorizationType, CfnAuthorizer, Cors, LambdaIntegration, Resource, RestApi} from "aws-cdk-lib/aws-apigateway";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {commonLambdaProps} from "./constants";
import envs from "../environment";
import {PolicyDocument, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";

export class SalableCapabilitiesWithAwsLambdaAndClerkStack extends cdk.Stack {
    private readonly authoriserLogicalId: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const api = new RestApi(this, 'SalableDemo', {
            defaultCorsPreflightOptions: {
                allowHeaders: Cors.DEFAULT_HEADERS,
                allowMethods: Cors.ALL_METHODS,
                allowOrigins: envs.DOMAIN_NAMES.split(','),
            }
        });

        const authorizerHandler = new NodejsFunction(this, 'SalableDemo_CustomAuthorizer', {
            ...commonLambdaProps,
            entry: 'lambda/auth/authoriser.ts',
            environment: {
                ISSUER: envs.ISSUER,
                AUDIENCE: envs.AUDIENCE,
                REGION: envs.REGION,
                ACCOUNT: envs.ACCOUNT,

            }
        });

        const role = new Role(this, 'SalableDemo_Role', {
            roleName: 'salable-role',
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
            inlinePolicies: {
                allowLambdaInvocation: PolicyDocument.fromJson({
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Action: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
                            Resource: `arn:aws:lambda:${envs.REGION}:${envs.ACCOUNT}:function:*`,
                        },
                    ],
                }),
            },
        });

        const authorizer = new CfnAuthorizer(this, 'SalableDemo_Authoriser', {
            restApiId: api.restApiId,
            type: 'TOKEN',
            name: 'salable-authoriser',
            identitySource: 'method.request.header.Authorization',
            authorizerUri: `arn:aws:apigateway:${envs.REGION}:lambda:path/2015-03-31/functions/${authorizerHandler.functionArn}/invocations`,
            authorizerCredentials: role.roleArn
        });

        this.authoriserLogicalId = authorizer.logicalId;

        const getCapabilitiesFromJwtHandler = new NodejsFunction(this, 'SalableDemo_GetCapabilitiesFromJwtLambda', {
            ...commonLambdaProps,
            entry: 'lambda/handler/get-capabilities-from-jwt.ts',
        });

        const thingResource = api.root.addResource('capabilities-from-jwt');
        this.addAuthMethod('get', thingResource, getCapabilitiesFromJwtHandler);

        const licenseCheckHandler = new NodejsFunction(this, 'SalableDemo_LicenseCheckLambda', {
            ...commonLambdaProps,
            entry: 'lambda/handler/license-check.ts',
            environment: {
                CLERK_SECRET_KEY: envs.CLERK_SECRET_KEY,
                CLERK_PUBLISHABLE_KEY: envs.CLERK_PUBLISHABLE_KEY,
                SALABLE_PRODUCT_UUID: envs.SALABLE_PRODUCT_UUID,
                SALABLE_READ_LICENSE: envs.SALABLE_READ_LICENSE,
            }
        });
        const licenseCheckResource = api.root.addResource('license-check');
        this.addAuthMethod('get', licenseCheckResource, licenseCheckHandler);

        const postSignUpHandler = new NodejsFunction(this, 'SalableDemo_PostSignUpLambda', {
            ...commonLambdaProps,
            entry: 'lambda/handler/post-sign-up.ts',
            environment: {
                CLERK_SECRET_KEY: envs.CLERK_SECRET_KEY,
                CLERK_PUBLISHABLE_KEY: envs.CLERK_PUBLISHABLE_KEY,
                SALABLE_PRODUCT_UUID: envs.SALABLE_PRODUCT_UUID,
                SALABLE_READ_LICENSE: envs.SALABLE_READ_LICENSE,
                SALABLE_PRO_PLAN_UUID: envs.SALABLE_PRO_PLAN_UUID,
                SALABLE_WRITE_LICENSE: envs.SALABLE_WRITE_LICENSE,
            }
        });
        const postSignUpResource = api.root.addResource('post-sign-up');
        this.addAuthMethod('get', postSignUpResource, postSignUpHandler);
    }

    private addAuthMethod(method: string, resource: Resource, handler: NodejsFunction) {
        const route = resource.addMethod(
            method,
            new LambdaIntegration(handler),
            {authorizationType: AuthorizationType.CUSTOM}
        );

        const childResource = route.node.findChild('Resource');

        (childResource as CfnResource).addPropertyOverride('AuthorizationType', AuthorizationType.CUSTOM);
        (childResource as CfnResource).addPropertyOverride('AuthorizerId', {Ref: this.authoriserLogicalId});
    }
}
