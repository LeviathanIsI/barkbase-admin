/**
 * BarkBase Ops Center CDK Configuration
 *
 * Centralized configuration for all CDK stacks.
 * Uses the EXISTING BarkBase VPC and Cognito resources.
 */

import * as cdk from 'aws-cdk-lib';

export type Environment = 'dev' | 'prod';

export interface OpsConfig {
  readonly env: Environment;
  readonly account: string;
  readonly region: string;
  readonly stackPrefix: string;
  readonly opsStackPrefix: string;
  readonly dbInstanceClass: string;
  readonly dbMultiAz: boolean;
  readonly corsOrigins: string[];
  // Existing BarkBase resources to reference
  readonly barkbaseStackPrefix: string;
}

/**
 * Get configuration for the specified environment
 */
export function getConfig(app: cdk.App): OpsConfig {
  const env = (app.node.tryGetContext('env') as Environment) || 'dev';
  const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID || '';
  const region = 'us-east-2';

  const barkbaseStackPrefix = `barkbase-${env}`;

  const baseConfig = {
    account,
    region,
    env,
    stackPrefix: `barkbase-${env}`,
    opsStackPrefix: `barkbase-ops-${env}`,
    barkbaseStackPrefix,
  };

  if (env === 'prod') {
    return {
      ...baseConfig,
      dbInstanceClass: 't3.micro', // Ops DB is small, doesn't need big instance
      dbMultiAz: true,
      corsOrigins: [
        'https://ops.barkbase.io',
        'https://admin.barkbase.io',
      ],
    };
  }

  // Dev environment
  const cloudfrontUrl = app.node.tryGetContext('cloudfrontUrl') as string | undefined;
  const devCorsOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
  ];

  if (cloudfrontUrl) {
    devCorsOrigins.push(cloudfrontUrl);
  }

  return {
    ...baseConfig,
    dbInstanceClass: 't3.micro',
    dbMultiAz: false,
    corsOrigins: devCorsOrigins,
  };
}

/**
 * Get CDK environment for stack deployment
 */
export function getCdkEnv(config: OpsConfig): cdk.Environment | undefined {
  if (!config.account) {
    return undefined;
  }

  return {
    account: config.account,
    region: config.region,
  };
}
