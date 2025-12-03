#!/usr/bin/env node
/**
 * BarkBase Ops Center CDK App
 *
 * This creates the infrastructure for the internal operations center:
 * - Ops Database (separate from BarkBase main DB)
 * - Lambda functions for admin API
 * - API Gateway routes under /admin and /status
 *
 * IMPORTANT: This stack depends on the existing BarkBase infrastructure.
 * The VPC, Cognito, and main database are imported, not created.
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfig, getCdkEnv } from '../lib/shared/config';
import { OpsStack } from '../lib/OpsStack';

const app = new cdk.App();
const config = getConfig(app);
const cdkEnv = getCdkEnv(config);

// Single consolidated stack for the Ops Center
// In a larger app, you might split this into multiple stacks
new OpsStack(app, `${config.opsStackPrefix}-stack`, {
  config,
  env: cdkEnv,
  description: 'BarkBase Ops Center - Admin tools for support, incidents, and status',
  tags: {
    Application: 'BarkBase-Ops',
    Environment: config.env,
  },
});

app.synth();
