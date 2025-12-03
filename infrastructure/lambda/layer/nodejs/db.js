/**
 * Database connection utilities for BarkBase Ops
 * Supports two database connections:
 * - Ops DB: For incidents, audit logs, etc. (read-write)
 * - BarkBase DB: For tenant/user lookups (read-only)
 */

const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION_DEPLOY || 'us-east-2' });

// Cache for database credentials
let opsCredentialsCache = null;
let barkbaseCredentialsCache = null;
let credentialsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Connection pools
let opsPool = null;
let barkbasePool = null;

/**
 * Get database credentials from Secrets Manager with caching
 */
async function getCredentials(secretArn, cacheKey) {
  const now = Date.now();
  const cache = cacheKey === 'ops' ? opsCredentialsCache : barkbaseCredentialsCache;

  if (cache && now - credentialsCacheTime < CACHE_TTL) {
    return cache;
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await secretsClient.send(command);
    const credentials = JSON.parse(response.SecretString);

    if (cacheKey === 'ops') {
      opsCredentialsCache = credentials;
    } else {
      barkbaseCredentialsCache = credentials;
    }
    credentialsCacheTime = now;

    return credentials;
  } catch (error) {
    console.error(`Failed to get credentials from ${secretArn}:`, error);
    throw error;
  }
}

/**
 * Get or create the Ops database pool
 */
async function getOpsPool() {
  if (opsPool) return opsPool;

  const secretArn = process.env.OPS_DB_SECRET_ARN;
  if (!secretArn) {
    throw new Error('OPS_DB_SECRET_ARN environment variable not set');
  }

  const credentials = await getCredentials(secretArn, 'ops');

  opsPool = new Pool({
    host: credentials.host,
    port: credentials.port || 5432,
    database: process.env.OPS_DB_NAME || 'barkbase_ops',
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  opsPool.on('error', (err) => {
    console.error('Ops pool error:', err);
    opsPool = null;
  });

  return opsPool;
}

/**
 * Get or create the BarkBase database pool (read-only)
 */
async function getBarkbasePool() {
  if (barkbasePool) return barkbasePool;

  const secretArn = process.env.BARKBASE_DB_SECRET_ARN;
  if (!secretArn) {
    throw new Error('BARKBASE_DB_SECRET_ARN environment variable not set');
  }

  const credentials = await getCredentials(secretArn, 'barkbase');

  barkbasePool = new Pool({
    host: credentials.host,
    port: credentials.port || 5432,
    database: process.env.BARKBASE_DB_NAME || 'barkbase',
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false },
    max: 5, // Fewer connections since we only read
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  barkbasePool.on('error', (err) => {
    console.error('BarkBase pool error:', err);
    barkbasePool = null;
  });

  return barkbasePool;
}

/**
 * Execute query on Ops database
 */
async function opsQuery(text, params = []) {
  const pool = await getOpsPool();
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow ops query (${duration}ms):`, text.substring(0, 100));
    }
    return result;
  } catch (error) {
    console.error('Ops query error:', error.message);
    throw error;
  }
}

/**
 * Execute query on BarkBase database (read-only operations)
 */
async function barkbaseQuery(text, params = []) {
  const pool = await getBarkbasePool();
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow barkbase query (${duration}ms):`, text.substring(0, 100));
    }
    return result;
  } catch (error) {
    console.error('BarkBase query error:', error.message);
    throw error;
  }
}

module.exports = {
  getOpsPool,
  getBarkbasePool,
  opsQuery,
  barkbaseQuery,
};
