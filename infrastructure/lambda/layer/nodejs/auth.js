/**
 * Authentication and authorization utilities for BarkBase Ops
 * Validates Cognito JWT tokens and checks admin roles
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Admin roles that can access the ops center
const ADMIN_ROLES = ['super_admin', 'engineer', 'support_lead', 'support'];

// Roles that can create/modify incidents
const INCIDENT_WRITE_ROLES = ['super_admin', 'engineer', 'support_lead'];

// JWKS client with caching
let client = null;

function getJwksClient() {
  if (!client) {
    const jwksUrl = process.env.COGNITO_JWKS_URL;
    if (!jwksUrl) {
      throw new Error('COGNITO_JWKS_URL environment variable not set');
    }
    client = jwksClient({
      jwksUri: jwksUrl,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
    });
  }
  return client;
}

/**
 * Get signing key from JWKS
 */
function getKey(header, callback) {
  getJwksClient().getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Validate JWT token and return payload
 */
async function validateToken(token) {
  return new Promise((resolve, reject) => {
    const options = {
      issuer: process.env.COGNITO_ISSUER_URL,
      algorithms: ['RS256'],
    };

    jwt.verify(token, getKey, options, (err, decoded) => {
      if (err) {
        reject(new Error(`Token validation failed: ${err.message}`));
        return;
      }

      // Check token_use
      if (decoded.token_use !== 'id' && decoded.token_use !== 'access') {
        reject(new Error('Invalid token type'));
        return;
      }

      resolve(decoded);
    });
  });
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
  if (!authHeader) {
    return null;
  }
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return authHeader;
}

/**
 * Authenticate request and return user info
 * Throws error if authentication fails
 */
async function authenticateRequest(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const token = extractToken(authHeader);

  if (!token) {
    throw new Error('No authorization token provided');
  }

  const payload = await validateToken(token);

  // Extract user info
  const user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    role: payload['custom:role'],
  };

  // Check if user has admin role
  if (!user.role || !ADMIN_ROLES.includes(user.role)) {
    throw new Error('Access denied. Admin role required.');
  }

  return user;
}

/**
 * Check if user can write incidents
 */
function canWriteIncidents(role) {
  return INCIDENT_WRITE_ROLES.includes(role);
}

/**
 * Get client IP from event
 */
function getClientIp(event) {
  return event.requestContext?.http?.sourceIp ||
    event.requestContext?.identity?.sourceIp ||
    'unknown';
}

module.exports = {
  authenticateRequest,
  canWriteIncidents,
  getClientIp,
  ADMIN_ROLES,
  INCIDENT_WRITE_ROLES,
};
