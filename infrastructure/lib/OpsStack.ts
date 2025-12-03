/**
 * BarkBase Ops Center Stack
 *
 * Creates:
 * - Ops Database (PostgreSQL RDS for ops data: incidents, audit logs)
 * - Lambda functions for admin API
 * - API Gateway integration
 *
 * References existing BarkBase resources via CloudFormation exports:
 * - VPC from BarkBase network stack
 * - Cognito user pool from BarkBase auth stack
 * - BarkBase database (read-only access for tenant/user lookups)
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as path from 'path';
import { Construct } from 'constructs';
import { OpsConfig } from './shared/config';

export interface OpsStackProps extends cdk.StackProps {
  readonly config: OpsConfig;
}

export class OpsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OpsStackProps) {
    super(scope, id, props);

    const { config } = props;
    const isPublicDevDb = config.env === 'dev';

    // =========================================================================
    // Import Existing BarkBase Resources via CloudFormation Exports
    // =========================================================================

    // Import VPC ID and subnet IDs from BarkBase network stack
    const vpcId = cdk.Fn.importValue(`${config.barkbaseStackPrefix}-vpc-id`);
    const privateSubnetIds = cdk.Fn.split(',', cdk.Fn.importValue(`${config.barkbaseStackPrefix}-private-subnet-ids`));
    const publicSubnetIds = cdk.Fn.split(',', cdk.Fn.importValue(`${config.barkbaseStackPrefix}-public-subnet-ids`));

    // Import Lambda security group ID
    const lambdaSecurityGroupId = cdk.Fn.importValue(`${config.barkbaseStackPrefix}-lambda-sg-id`);

    // Create VPC reference from imported values
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'BarkbaseVpc', {
      vpcId: vpcId,
      availabilityZones: [`${config.region}a`, `${config.region}b`],
      privateSubnetIds: [cdk.Fn.select(0, privateSubnetIds), cdk.Fn.select(1, privateSubnetIds)],
      publicSubnetIds: [cdk.Fn.select(0, publicSubnetIds), cdk.Fn.select(1, publicSubnetIds)],
    });

    // Import Lambda security group
    const lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'LambdaSg',
      lambdaSecurityGroupId
    );

    // Import BarkBase DB secret ARN for read-only access
    const barkbaseDbSecretArn = cdk.Fn.importValue(`${config.barkbaseStackPrefix}-db-secret-arn`);

    // Import Cognito details
    const userPoolId = cdk.Fn.importValue(`${config.barkbaseStackPrefix}-user-pool-id`);
    const userPoolClientId = cdk.Fn.importValue(`${config.barkbaseStackPrefix}-client-id`);

    // =========================================================================
    // Ops Database (Separate from BarkBase)
    // =========================================================================

    // Create security group for Ops RDS
    const opsDbSecurityGroup = new ec2.SecurityGroup(this, 'OpsDbSecurityGroup', {
      vpc,
      securityGroupName: `${config.opsStackPrefix}-db-sg`,
      description: 'Security group for BarkBase Ops PostgreSQL RDS',
      allowAllOutbound: false,
    });

    // Allow inbound PostgreSQL from Lambda security group
    opsDbSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(lambdaSecurityGroupId),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Lambda functions'
    );

    // Create Secrets Manager secret for Ops DB credentials
    const opsDbSecret = new secretsmanager.Secret(this, 'OpsDbSecret', {
      secretName: `${config.opsStackPrefix}/db-credentials`,
      description: 'BarkBase Ops PostgreSQL database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'ops_admin',
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        excludeCharacters: '"@/\\\'',
        passwordLength: 32,
      },
    });

    // Map instance class to proper type
    const instanceType = this.getInstanceType(config.dbInstanceClass);

    // Select subnets - use public for dev (direct access), private for prod
    const dbSubnets = isPublicDevDb
      ? vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC })
      : vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS });

    // Create Ops RDS PostgreSQL instance
    const opsDbInstance = new rds.DatabaseInstance(this, 'OpsDb', {
      instanceIdentifier: `${config.opsStackPrefix}-postgres`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType,
      vpc,
      vpcSubnets: dbSubnets,
      securityGroups: [opsDbSecurityGroup],
      credentials: rds.Credentials.fromSecret(opsDbSecret),
      databaseName: 'barkbase_ops',
      multiAz: config.dbMultiAz,
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      deletionProtection: config.env === 'prod',
      backupRetention: cdk.Duration.days(config.env === 'prod' ? 14 : 7),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      autoMinorVersionUpgrade: true,
      publiclyAccessible: isPublicDevDb,
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      cloudwatchLogsExports: ['postgresql'],
      parameterGroup: new rds.ParameterGroup(this, 'OpsDbParameterGroup', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15,
        }),
        parameters: {
          'log_statement': 'all',
          'log_min_duration_statement': '1000',
        },
      }),
    });

    // =========================================================================
    // IAM Role for Lambda Functions
    // =========================================================================

    const lambdaRole = new iam.Role(this, 'OpsLambdaRole', {
      roleName: `${config.opsStackPrefix}-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for BarkBase Ops Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant access to Ops DB secret
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret',
      ],
      resources: [opsDbSecret.secretArn],
    }));

    // Grant access to BarkBase DB secret (for read-only queries)
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret',
      ],
      resources: [cdk.Stack.of(this).formatArn({
        service: 'secretsmanager',
        resource: 'secret',
        resourceName: `${config.barkbaseStackPrefix}/db-credentials*`,
        arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME,
      })],
    }));

    // =========================================================================
    // Lambda Layer
    // =========================================================================

    const opsLayer = new lambda.LayerVersion(this, 'OpsLayer', {
      layerVersionName: `${config.opsStackPrefix}-layer`,
      description: 'Database and auth utilities for Ops Center',
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/layer')),
    });

    // =========================================================================
    // Common Lambda Configuration
    // =========================================================================

    // Note: userPoolId is a Token, we need to use Fn.join for the URLs
    const jwksUrl = cdk.Fn.join('', [
      'https://cognito-idp.',
      config.region,
      '.amazonaws.com/',
      userPoolId,
      '/.well-known/jwks.json'
    ]);
    const issuerUrl = cdk.Fn.join('', [
      'https://cognito-idp.',
      config.region,
      '.amazonaws.com/',
      userPoolId
    ]);

    const commonEnvironment: Record<string, string> = {
      NODE_ENV: config.env === 'prod' ? 'production' : 'development',
      AWS_REGION_DEPLOY: config.region,
      OPS_DB_SECRET_ARN: opsDbSecret.secretArn,
      OPS_DB_NAME: 'barkbase_ops',
      BARKBASE_DB_SECRET_ARN: barkbaseDbSecretArn,
      BARKBASE_DB_NAME: 'barkbase',
      COGNITO_USER_POOL_ID: userPoolId,
      COGNITO_CLIENT_ID: userPoolClientId,
      COGNITO_JWKS_URL: jwksUrl,
      COGNITO_ISSUER_URL: issuerUrl,
    };

    // Select private subnets for Lambda
    const lambdaSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS });

    const commonLambdaConfig = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc,
      vpcSubnets: lambdaSubnets,
      securityGroups: [lambdaSecurityGroup],
      layers: [opsLayer],
      environment: commonEnvironment,
      tracing: lambda.Tracing.ACTIVE,
    };

    // =========================================================================
    // Lambda Functions
    // =========================================================================

    // Admin API Function (handles /admin/* routes)
    const adminApiFunction = new lambda.Function(this, 'AdminApiFunction', {
      ...commonLambdaConfig,
      functionName: `${config.opsStackPrefix}-admin-api`,
      description: 'BarkBase Ops Admin API - support, incidents management',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/admin-api')),
    });

    // Status API Function (handles /status/* routes - PUBLIC)
    const statusApiFunction = new lambda.Function(this, 'StatusApiFunction', {
      ...commonLambdaConfig,
      functionName: `${config.opsStackPrefix}-status-api`,
      description: 'BarkBase Public Status API - system status and banner',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/status-api')),
    });

    // =========================================================================
    // API Gateway (HTTP API)
    // =========================================================================

    const httpApi = new apigatewayv2.CfnApi(this, 'OpsHttpApi', {
      name: `${config.opsStackPrefix}-api`,
      protocolType: 'HTTP',
      corsConfiguration: {
        allowOrigins: config.corsOrigins,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
        allowCredentials: true,
        maxAge: 86400,
      },
    });

    // Default stage
    new apigatewayv2.CfnStage(this, 'OpsApiStage', {
      apiId: httpApi.ref,
      stageName: '$default',
      autoDeploy: true,
    });

    // Admin API Integration
    const adminIntegration = new apigatewayv2.CfnIntegration(this, 'AdminIntegration', {
      apiId: httpApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: adminApiFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    // Status API Integration
    const statusIntegration = new apigatewayv2.CfnIntegration(this, 'StatusIntegration', {
      apiId: httpApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: statusApiFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    // Routes
    new apigatewayv2.CfnRoute(this, 'AdminRoute', {
      apiId: httpApi.ref,
      routeKey: 'ANY /admin/{proxy+}',
      target: `integrations/${adminIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, 'StatusRoute', {
      apiId: httpApi.ref,
      routeKey: 'GET /status',
      target: `integrations/${statusIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, 'StatusBannerRoute', {
      apiId: httpApi.ref,
      routeKey: 'GET /status/banner',
      target: `integrations/${statusIntegration.ref}`,
    });

    // Lambda permissions for API Gateway
    new lambda.CfnPermission(this, 'AdminApiPermission', {
      action: 'lambda:InvokeFunction',
      functionName: adminApiFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `arn:aws:execute-api:${config.region}:${this.account}:${httpApi.ref}/*/*`,
    });

    new lambda.CfnPermission(this, 'StatusApiPermission', {
      action: 'lambda:InvokeFunction',
      functionName: statusApiFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `arn:aws:execute-api:${config.region}:${this.account}:${httpApi.ref}/*/*`,
    });

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'OpsDbEndpoint', {
      value: opsDbInstance.instanceEndpoint.hostname,
      description: 'Ops RDS PostgreSQL Endpoint',
      exportName: `${config.opsStackPrefix}-db-endpoint`,
    });

    new cdk.CfnOutput(this, 'OpsDbSecretArn', {
      value: opsDbSecret.secretArn,
      description: 'Ops Database credentials secret ARN',
      exportName: `${config.opsStackPrefix}-db-secret-arn`,
    });

    new cdk.CfnOutput(this, 'OpsApiUrl', {
      value: `https://${httpApi.ref}.execute-api.${config.region}.amazonaws.com`,
      description: 'Ops Center API URL',
      exportName: `${config.opsStackPrefix}-api-url`,
    });

    if (isPublicDevDb) {
      new cdk.CfnOutput(this, 'AddYourIpCommand', {
        value: `aws ec2 authorize-security-group-ingress --group-id ${opsDbSecurityGroup.securityGroupId} --protocol tcp --port 5432 --cidr YOUR_IP/32 --region ${config.region}`,
        description: 'Run this command (replace YOUR_IP) to allow your IP access to the ops database',
      });
    }
  }

  private getInstanceType(instanceClass: string): ec2.InstanceType {
    const [family, size] = instanceClass.split('.');

    const familyMap: Record<string, ec2.InstanceClass> = {
      't3': ec2.InstanceClass.T3,
      't4g': ec2.InstanceClass.T4G,
      'r5': ec2.InstanceClass.R5,
      'r6g': ec2.InstanceClass.R6G,
      'm5': ec2.InstanceClass.M5,
    };

    const sizeMap: Record<string, ec2.InstanceSize> = {
      'micro': ec2.InstanceSize.MICRO,
      'small': ec2.InstanceSize.SMALL,
      'medium': ec2.InstanceSize.MEDIUM,
      'large': ec2.InstanceSize.LARGE,
    };

    const instanceFamily = familyMap[family] || ec2.InstanceClass.T3;
    const instanceSize = sizeMap[size] || ec2.InstanceSize.MICRO;

    return ec2.InstanceType.of(instanceFamily, instanceSize);
  }
}
