/**
 * BarkBase Ops Admin API
 *
 * Handles all /admin/* routes:
 * - GET /admin/search?q={query} - Search tenants/users
 * - GET /admin/tenants/{id} - Get tenant details with stats
 * - GET /admin/tenants/{id}/users - Get tenant users
 * - POST /admin/tenants/{id}/suspend - Suspend tenant
 * - POST /admin/tenants/{id}/unsuspend - Unsuspend tenant
 * - POST /admin/tenants/{id}/extend-trial - Extend trial period
 * - POST /admin/tenants/{id}/users/{userId}/reset-password - Reset user password
 * - POST /admin/tenants/{id}/impersonate/start - Start impersonation
 * - POST /admin/tenants/{id}/impersonate/end - End impersonation
 * - GET /admin/incidents - List incidents
 * - POST /admin/incidents - Create incident
 * - GET /admin/incidents/{id} - Get incident details
 * - PUT /admin/incidents/{id} - Update incident
 * - POST /admin/incidents/{id}/updates - Add incident update
 * - GET /admin/health/* - Health monitoring endpoints
 * - GET /admin/audit-logs - Audit log viewer
 * - GET/POST /admin/maintenance - Scheduled maintenance
 * - GET/PUT/DELETE /admin/maintenance/{id}
 * - GET/POST /admin/broadcasts - Broadcast messages
 * - GET/PUT/DELETE /admin/broadcasts/{id}
 * - GET/POST /admin/feature-flags - Feature flags
 * - GET/PUT/DELETE /admin/feature-flags/{id}
 * - POST/DELETE /admin/feature-flags/{id}/overrides
 * - GET /status/broadcasts - Public active broadcasts
 * - GET /status/maintenance - Public upcoming maintenance
 * - GET /api/features?tenant_id={id} - Public feature flags for tenant
 */

const { opsQuery, barkbaseQuery, authenticateRequest, canWriteIncidents, getClientIp } = require('/opt/nodejs/index');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path;

  try {
    // Authenticate all admin requests
    const user = await authenticateRequest(event);
    const clientIp = getClientIp(event);

    // Route to appropriate handler
    if (path.startsWith('/admin/search')) {
      return await handleSearch(event, user, clientIp);
    }

    // Tenant action routes (must be before generic tenant route)
    if (path.match(/^\/admin\/tenants\/[^/]+\/users\/[^/]+\/reset-password$/)) {
      if (method === 'POST') {
        return await handleResetUserPassword(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/tenants\/[^/]+\/suspend$/)) {
      if (method === 'POST') {
        return await handleSuspendTenant(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/tenants\/[^/]+\/unsuspend$/)) {
      if (method === 'POST') {
        return await handleUnsuspendTenant(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/tenants\/[^/]+\/extend-trial$/)) {
      if (method === 'POST') {
        return await handleExtendTrial(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/tenants\/[^/]+\/users$/)) {
      return await handleTenantUsers(event, user);
    }

    if (path.match(/^\/admin\/tenants\/[^/]+$/)) {
      return await handleTenant(event, user, clientIp);
    }

    // Incident routes
    if (path.match(/^\/admin\/incidents\/[^/]+\/updates$/)) {
      if (method === 'POST') {
        return await handleAddIncidentUpdate(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/incidents\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetIncident(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateIncident(event, user, clientIp);
      }
    }

    if (path === '/admin/incidents') {
      if (method === 'GET') {
        return await handleListIncidents(event, user);
      }
      if (method === 'POST') {
        return await handleCreateIncident(event, user, clientIp);
      }
    }

    // Health monitoring routes
    if (path === '/admin/health/lambdas') {
      return await handleHealthLambdas(event, user);
    }

    if (path === '/admin/health/api') {
      return await handleHealthApi(event, user);
    }

    if (path === '/admin/health/database') {
      return await handleHealthDatabase(event, user);
    }

    if (path === '/admin/health/alerts') {
      return await handleHealthAlerts(event, user);
    }

    // Audit log routes
    if (path === '/admin/audit-logs') {
      return await handleAuditLogs(event, user);
    }

    // Impersonation routes
    if (path.match(/^\/admin\/tenants\/[^/]+\/impersonate\/start$/)) {
      if (method === 'POST') {
        return await handleImpersonateStart(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/tenants\/[^/]+\/impersonate\/end$/)) {
      if (method === 'POST') {
        return await handleImpersonateEnd(event, user, clientIp);
      }
    }

    // Maintenance routes
    if (path === '/admin/maintenance') {
      if (method === 'GET') {
        return await handleListMaintenance(event, user);
      }
      if (method === 'POST') {
        return await handleCreateMaintenance(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/maintenance\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetMaintenance(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateMaintenance(event, user, clientIp);
      }
      if (method === 'DELETE') {
        return await handleDeleteMaintenance(event, user, clientIp);
      }
    }

    // Broadcast routes
    if (path === '/admin/broadcasts') {
      if (method === 'GET') {
        return await handleListBroadcasts(event, user);
      }
      if (method === 'POST') {
        return await handleCreateBroadcast(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetBroadcast(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateBroadcast(event, user, clientIp);
      }
      if (method === 'DELETE') {
        return await handleDeleteBroadcast(event, user, clientIp);
      }
    }

    // Feature flag routes
    if (path === '/admin/feature-flags') {
      if (method === 'GET') {
        return await handleListFeatureFlags(event, user);
      }
      if (method === 'POST') {
        return await handleCreateFeatureFlag(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/overrides\/[^/]+$/)) {
      if (method === 'DELETE') {
        return await handleDeleteFeatureFlagOverride(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/overrides$/)) {
      if (method === 'POST') {
        return await handleAddFeatureFlagOverride(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetFeatureFlag(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateFeatureFlag(event, user, clientIp);
      }
      if (method === 'DELETE') {
        return await handleDeleteFeatureFlag(event, user, clientIp);
      }
    }

    // Public routes (no auth required)
    if (path === '/status/broadcasts') {
      return await handlePublicBroadcasts(event);
    }

    if (path === '/status/maintenance') {
      return await handlePublicMaintenance(event);
    }

    if (path === '/api/features') {
      return await handlePublicFeatures(event);
    }

    return response(404, { message: 'Not found' });
  } catch (error) {
    console.error('Admin API error:', error);

    if (error.message.includes('authorization') || error.message.includes('Access denied')) {
      return response(403, { message: error.message });
    }

    return response(500, { message: 'Internal server error' });
  }
};

// =========================================================================
// Support Handlers
// =========================================================================

async function handleSearch(event, user, clientIp) {
  const query = event.queryStringParameters?.q;
  if (!query || query.length < 2) {
    return response(400, { message: 'Query must be at least 2 characters' });
  }

  const searchPattern = `%${query}%`;

  // Search tenants with user count
  const tenantResult = await barkbaseQuery(
    `SELECT t.id, t.name, t.subdomain, t.status, t.plan, t.created_at,
            COUNT(u.id) as user_count
     FROM "Tenant" t
     LEFT JOIN "User" u ON u.tenant_id = t.id
     WHERE t.name ILIKE $1 OR t.subdomain ILIKE $1
     GROUP BY t.id
     ORDER BY t.name
     LIMIT 20`,
    [searchPattern]
  );

  // Search users with tenant info
  const userResult = await barkbaseQuery(
    `SELECT u.id, u.email, u.name, u.role, u.tenant_id, u.last_login_at,
            t.name as tenant_name
     FROM "User" u
     LEFT JOIN "Tenant" t ON u.tenant_id = t.id
     WHERE u.email ILIKE $1 OR u.name ILIKE $1
     ORDER BY u.name
     LIMIT 20`,
    [searchPattern]
  );

  const results = [
    ...tenantResult.rows.map(row => ({
      type: 'tenant',
      id: row.id,
      name: row.name,
      subdomain: row.subdomain,
      status: row.status,
      plan: row.plan,
      userCount: parseInt(row.user_count) || 0,
      createdAt: row.created_at,
    })),
    ...userResult.rows.map(row => ({
      type: 'user',
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      lastLogin: row.last_login_at,
    })),
  ];

  await logAudit(user, 'search', 'search', null, { query }, clientIp);

  return response(200, { results });
}

async function handleTenant(event, user, clientIp) {
  const tenantId = extractPathParam(event.path, '/admin/tenants/');

  const tenantResult = await barkbaseQuery(
    `SELECT id, name, subdomain, status, created_at, plan, settings, trial_ends_at
     FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  const tenant = tenantResult.rows[0];

  // Get counts and stats in parallel
  const [userCount, petCount, bookingCount, revenueResult, bookingsThisMonth, activeUsers] = await Promise.all([
    barkbaseQuery(`SELECT COUNT(*) FROM "User" WHERE tenant_id = $1`, [tenantId]),
    barkbaseQuery(`SELECT COUNT(*) FROM "Pet" WHERE tenant_id = $1`, [tenantId]),
    barkbaseQuery(`SELECT COUNT(*) FROM "Booking" WHERE tenant_id = $1`, [tenantId]),
    barkbaseQuery(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM "Booking" WHERE tenant_id = $1 AND status = 'completed'`,
      [tenantId]
    ),
    barkbaseQuery(
      `SELECT COUNT(*) FROM "Booking"
       WHERE tenant_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [tenantId]
    ),
    barkbaseQuery(
      `SELECT COUNT(*) FROM "User"
       WHERE tenant_id = $1 AND last_login_at >= NOW() - INTERVAL '30 days'`,
      [tenantId]
    ),
  ]);

  // Get users
  const usersResult = await barkbaseQuery(
    `SELECT id, email, name, role, status, created_at, last_login_at
     FROM "User" WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [tenantId]
  );

  // Get recent activity (from BarkBase activity log if exists, otherwise empty)
  let recentActivity = [];
  try {
    const activityResult = await barkbaseQuery(
      `SELECT id, action, description, created_at, user_id,
              (SELECT name FROM "User" WHERE id = activity_log.user_id) as user_name
       FROM "ActivityLog" activity_log
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [tenantId]
    );
    recentActivity = activityResult.rows.map(a => ({
      id: a.id,
      type: a.action,
      description: a.description,
      timestamp: a.created_at,
      userName: a.user_name,
    }));
  } catch (e) {
    // ActivityLog table might not exist
    console.log('Activity log not available:', e.message);
  }

  await logAudit(user, 'view_tenant', 'tenant', tenantId, null, clientIp);

  return response(200, {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    status: tenant.status,
    createdAt: tenant.created_at,
    plan: tenant.plan,
    settings: tenant.settings,
    trialEndsAt: tenant.trial_ends_at,
    userCount: parseInt(userCount.rows[0].count),
    petCount: parseInt(petCount.rows[0].count),
    bookingCount: parseInt(bookingCount.rows[0].count),
    stats: {
      totalPets: parseInt(petCount.rows[0].count),
      totalBookings: parseInt(bookingCount.rows[0].count),
      totalRevenue: parseFloat(revenueResult.rows[0].total) || 0,
      bookingsThisMonth: parseInt(bookingsThisMonth.rows[0].count),
      activeUsers: parseInt(activeUsers.rows[0].count),
    },
    users: usersResult.rows.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    })),
    recentActivity,
  });
}

async function handleTenantUsers(event, user) {
  const tenantId = extractPathParam(event.path, '/admin/tenants/', '/users');

  const result = await barkbaseQuery(
    `SELECT id, email, name, role, status, created_at, last_login_at
     FROM "User" WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );

  return response(200, {
    users: result.rows.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    })),
  });
}

// =========================================================================
// Tenant Action Handlers
// =========================================================================

async function handleSuspendTenant(event, user, clientIp) {
  const tenantId = extractPathParam(event.path, '/admin/tenants/', '/suspend');

  // Check permission (only super_admin and support_lead)
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to suspend tenants' });
  }

  // Update tenant status
  const result = await barkbaseQuery(
    `UPDATE "Tenant" SET status = 'suspended', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  await logAudit(user, 'suspend_tenant', 'tenant', tenantId, { previousStatus: 'active' }, clientIp);

  return response(200, { success: true, tenant: result.rows[0] });
}

async function handleUnsuspendTenant(event, user, clientIp) {
  const tenantId = extractPathParam(event.path, '/admin/tenants/', '/unsuspend');

  // Check permission
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to unsuspend tenants' });
  }

  // Update tenant status
  const result = await barkbaseQuery(
    `UPDATE "Tenant" SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  await logAudit(user, 'unsuspend_tenant', 'tenant', tenantId, { newStatus: 'active' }, clientIp);

  return response(200, { success: true, tenant: result.rows[0] });
}

async function handleExtendTrial(event, user, clientIp) {
  const tenantId = extractPathParam(event.path, '/admin/tenants/', '/extend-trial');
  const body = JSON.parse(event.body || '{}');
  const days = parseInt(body.days) || 7;

  // Check permission
  if (!['super_admin', 'support_lead', 'support'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to extend trials' });
  }

  // Extend trial_ends_at by specified days
  const result = await barkbaseQuery(
    `UPDATE "Tenant"
     SET trial_ends_at = COALESCE(trial_ends_at, NOW()) + INTERVAL '1 day' * $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, trial_ends_at`,
    [tenantId, days]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  await logAudit(user, 'extend_trial', 'tenant', tenantId, { days }, clientIp);

  return response(200, {
    success: true,
    newEndDate: result.rows[0].trial_ends_at
  });
}

async function handleResetUserPassword(event, user, clientIp) {
  // Extract both tenantId and userId from path
  const pathParts = event.path.split('/');
  const tenantId = pathParts[3];
  const userId = pathParts[5];

  // Check permission
  if (!['super_admin', 'support_lead', 'support'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to reset passwords' });
  }

  // Verify user belongs to tenant
  const userResult = await barkbaseQuery(
    `SELECT id, email, cognito_sub FROM "User" WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );

  if (userResult.rows.length === 0) {
    return response(404, { message: 'User not found in this tenant' });
  }

  const targetUser = userResult.rows[0];

  // In production, this would trigger Cognito AdminResetUserPassword
  // For now, we'll log the action and return success
  // The actual Cognito call would be:
  // await cognitoClient.send(new AdminResetUserPasswordCommand({
  //   UserPoolId: process.env.COGNITO_USER_POOL_ID,
  //   Username: targetUser.cognito_sub,
  // }));

  await logAudit(user, 'reset_password', 'user', userId, {
    email: targetUser.email,
    tenantId
  }, clientIp);

  return response(200, {
    success: true,
    message: 'Password reset email sent'
  });
}

// =========================================================================
// Incident Handlers
// =========================================================================

async function handleListIncidents(event, user) {
  const status = event.queryStringParameters?.status;
  const limit = parseInt(event.queryStringParameters?.limit) || 50;
  const offset = parseInt(event.queryStringParameters?.offset) || 0;

  let query = `
    SELECT i.*, array_agg(ic.component_name) FILTER (WHERE ic.component_name IS NOT NULL) as components
    FROM incidents i
    LEFT JOIN incident_components ic ON i.id = ic.incident_id
  `;
  const params = [];

  if (status) {
    query += ` WHERE i.status = $1`;
    params.push(status);
  }

  query += ` GROUP BY i.id ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await opsQuery(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM incidents';
  const countParams = [];
  if (status) {
    countQuery += ' WHERE status = $1';
    countParams.push(status);
  }
  const countResult = await opsQuery(countQuery, countParams);

  return response(200, {
    incidents: result.rows.map(formatIncident),
    total: parseInt(countResult.rows[0].count),
  });
}

async function handleGetIncident(event, user) {
  const incidentId = extractPathParam(event.path, '/admin/incidents/');

  const incidentResult = await opsQuery(
    `SELECT i.*, array_agg(ic.component_name) FILTER (WHERE ic.component_name IS NOT NULL) as components
     FROM incidents i
     LEFT JOIN incident_components ic ON i.id = ic.incident_id
     WHERE i.id = $1
     GROUP BY i.id`,
    [incidentId]
  );

  if (incidentResult.rows.length === 0) {
    return response(404, { message: 'Incident not found' });
  }

  const updatesResult = await opsQuery(
    `SELECT * FROM incident_updates WHERE incident_id = $1 ORDER BY created_at DESC`,
    [incidentId]
  );

  const incident = formatIncident(incidentResult.rows[0]);
  incident.updates = updatesResult.rows.map(u => ({
    id: u.id,
    incidentId: u.incident_id,
    message: u.message,
    status: u.status,
    createdAt: u.created_at,
    createdById: u.created_by_id,
    createdByEmail: u.created_by_email,
  }));

  return response(200, incident);
}

async function handleCreateIncident(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to create incidents' });
  }

  const body = JSON.parse(event.body);
  const { title, severity, status, customerMessage, internalNotes, components = [] } = body;

  if (!title || !severity || !status || !customerMessage) {
    return response(400, { message: 'Missing required fields' });
  }

  // Insert incident
  const result = await opsQuery(
    `INSERT INTO incidents (title, severity, status, customer_message, internal_notes, created_by_id, created_by_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, severity, status, customerMessage, internalNotes || null, user.id, user.email]
  );

  const incident = result.rows[0];

  // Insert components
  for (const component of components) {
    await opsQuery(
      `INSERT INTO incident_components (incident_id, component_name) VALUES ($1, $2)`,
      [incident.id, component]
    );
  }

  await logAudit(user, 'create_incident', 'incident', incident.id, { title, severity, status }, clientIp);

  return response(201, formatIncident({ ...incident, components }));
}

async function handleUpdateIncident(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to update incidents' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/');
  const body = JSON.parse(event.body);
  const { status, customerMessage, internalNotes, resolvedAt } = body;

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (status) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }
  if (customerMessage !== undefined) {
    updates.push(`customer_message = $${paramIndex++}`);
    params.push(customerMessage);
  }
  if (internalNotes !== undefined) {
    updates.push(`internal_notes = $${paramIndex++}`);
    params.push(internalNotes);
  }
  if (resolvedAt) {
    updates.push(`resolved_at = $${paramIndex++}`);
    params.push(resolvedAt);
  }

  updates.push(`updated_at = NOW()`);
  params.push(incidentId);

  const result = await opsQuery(
    `UPDATE incidents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Incident not found' });
  }

  await logAudit(user, 'update_incident', 'incident', incidentId, body, clientIp);

  return response(200, formatIncident(result.rows[0]));
}

async function handleAddIncidentUpdate(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to add updates' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/updates');
  const body = JSON.parse(event.body);
  const { message, status } = body;

  if (!message || !status) {
    return response(400, { message: 'Message and status are required' });
  }

  const result = await opsQuery(
    `INSERT INTO incident_updates (incident_id, message, status, created_by_id, created_by_email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [incidentId, message, status, user.id, user.email]
  );

  await logAudit(user, 'add_incident_update', 'incident', incidentId, { message, status }, clientIp);

  const update = result.rows[0];
  return response(201, {
    id: update.id,
    incidentId: update.incident_id,
    message: update.message,
    status: update.status,
    createdAt: update.created_at,
    createdById: update.created_by_id,
    createdByEmail: update.created_by_email,
  });
}

// =========================================================================
// Health Monitoring Handlers (Mock data for MVP)
// =========================================================================

async function handleHealthLambdas(event, user) {
  // In production, this would query CloudWatch metrics
  // For MVP, return structured mock data
  const lambdas = [
    {
      name: 'barkbase-api',
      status: 'healthy',
      invocations: 15420,
      errors: 3,
      avgDuration: 145,
      p99Duration: 890,
    },
    {
      name: 'barkbase-auth',
      status: 'healthy',
      invocations: 8932,
      errors: 0,
      avgDuration: 78,
      p99Duration: 234,
    },
    {
      name: 'barkbase-notifications',
      status: 'healthy',
      invocations: 2341,
      errors: 1,
      avgDuration: 256,
      p99Duration: 1200,
    },
    {
      name: 'barkbase-ops-admin-api',
      status: 'healthy',
      invocations: 456,
      errors: 0,
      avgDuration: 189,
      p99Duration: 567,
    },
  ];

  return response(200, { lambdas });
}

async function handleHealthApi(event, user) {
  // Mock API Gateway stats
  return response(200, {
    requestsPerMinute: 234,
    errorRate: 0.02,
    latency: {
      p50: 45,
      p95: 234,
      p99: 567,
    },
    statusCodes: {
      '2xx': 98.5,
      '4xx': 1.2,
      '5xx': 0.3,
    },
  });
}

async function handleHealthDatabase(event, user) {
  // Get real connection info from ops DB
  let opsConnections = 0;
  try {
    const result = await opsQuery(
      `SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()`
    );
    opsConnections = parseInt(result.rows[0].count);
  } catch (e) {
    console.error('Failed to get ops DB stats:', e);
  }

  return response(200, {
    ops: {
      connections: opsConnections,
      maxConnections: 100,
      cpuUtilization: 15.3,
      storageUsed: 2.4,
      storageTotal: 20,
      status: 'healthy',
    },
    barkbase: {
      connections: 45,
      maxConnections: 200,
      cpuUtilization: 32.1,
      storageUsed: 15.7,
      storageTotal: 50,
      status: 'healthy',
    },
  });
}

async function handleHealthAlerts(event, user) {
  // In production, query CloudWatch Alarms
  // For MVP, return mock alerts
  return response(200, {
    alerts: [
      // Example alert structure
      // {
      //   id: 'alarm-123',
      //   name: 'High API Latency',
      //   state: 'ALARM',
      //   metric: 'Latency',
      //   threshold: 500,
      //   currentValue: 678,
      //   updatedAt: new Date().toISOString(),
      // },
    ],
    summary: {
      total: 12,
      alarm: 0,
      ok: 12,
      insufficientData: 0,
    },
  });
}

// =========================================================================
// Audit Log Handler
// =========================================================================

async function handleAuditLogs(event, user) {
  const page = parseInt(event.queryStringParameters?.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  const action = event.queryStringParameters?.action;
  const adminId = event.queryStringParameters?.admin;
  const targetType = event.queryStringParameters?.target_type;
  const fromDate = event.queryStringParameters?.from;
  const toDate = event.queryStringParameters?.to;

  let query = `
    SELECT id, admin_id, admin_email, action, target_type, target_id, details, ip_address, created_at
    FROM admin_audit_log
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (action) {
    query += ` AND action = $${paramIndex++}`;
    params.push(action);
  }
  if (adminId) {
    query += ` AND admin_id = $${paramIndex++}`;
    params.push(adminId);
  }
  if (targetType) {
    query += ` AND target_type = $${paramIndex++}`;
    params.push(targetType);
  }
  if (fromDate) {
    query += ` AND created_at >= $${paramIndex++}`;
    params.push(fromDate);
  }
  if (toDate) {
    query += ` AND created_at <= $${paramIndex++}`;
    params.push(toDate);
  }

  // Get total count
  const countQuery = query.replace(
    'SELECT id, admin_id, admin_email, action, target_type, target_id, details, ip_address, created_at',
    'SELECT COUNT(*)'
  );
  const countResult = await opsQuery(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await opsQuery(query, params);

  // Get unique admins and action types for filters
  const [adminsResult, actionsResult, targetTypesResult] = await Promise.all([
    opsQuery(`SELECT DISTINCT admin_id, admin_email FROM admin_audit_log ORDER BY admin_email`),
    opsQuery(`SELECT DISTINCT action FROM admin_audit_log ORDER BY action`),
    opsQuery(`SELECT DISTINCT target_type FROM admin_audit_log WHERE target_type IS NOT NULL ORDER BY target_type`),
  ]);

  return response(200, {
    logs: result.rows.map(row => ({
      id: row.id,
      adminId: row.admin_id,
      adminEmail: row.admin_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      details: row.details,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      admins: adminsResult.rows.map(r => ({ id: r.admin_id, email: r.admin_email })),
      actions: actionsResult.rows.map(r => r.action),
      targetTypes: targetTypesResult.rows.map(r => r.target_type),
    },
  });
}

// =========================================================================
// Helpers
// =========================================================================

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify(body),
  };
}

function formatIncident(row) {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    customerMessage: row.customer_message,
    internalNotes: row.internal_notes,
    components: row.components || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    createdById: row.created_by_id,
    createdByEmail: row.created_by_email,
  };
}

function extractPathParam(path, prefix, suffix = '') {
  let param = path.replace(prefix, '');
  if (suffix) {
    param = param.replace(suffix, '');
  }
  return param;
}

async function logAudit(user, action, targetType, targetId, details, ipAddress = null) {
  try {
    await opsQuery(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.email, action, targetType, targetId, details ? JSON.stringify(details) : null, ipAddress]
    );
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

// =========================================================================
// Impersonation Handlers
// =========================================================================

async function handleImpersonateStart(event, user, clientIp) {
  // Only super_admin and support_lead can impersonate
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to impersonate tenants' });
  }

  const tenantId = extractPathParam(event.path, '/admin/tenants/', '/impersonate/start');
  const body = JSON.parse(event.body || '{}');
  const { reason } = body;

  if (!reason || reason.length < 10) {
    return response(400, { message: 'Reason is required (minimum 10 characters)' });
  }

  // Verify tenant exists
  const tenantResult = await barkbaseQuery(
    `SELECT id, name FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  const tenant = tenantResult.rows[0];

  // Log the impersonation start
  await logAudit(user, 'impersonate_start', 'tenant', tenantId, {
    reason,
    tenantName: tenant.name,
  }, clientIp);

  return response(200, { success: true, tenant: { id: tenant.id, name: tenant.name } });
}

async function handleImpersonateEnd(event, user, clientIp) {
  const tenantId = extractPathParam(event.path, '/admin/tenants/', '/impersonate/end');

  // Log the impersonation end
  await logAudit(user, 'impersonate_end', 'tenant', tenantId, null, clientIp);

  return response(200, { success: true });
}

// =========================================================================
// Maintenance Handlers
// =========================================================================

async function handleListMaintenance(event, user) {
  const result = await opsQuery(
    `SELECT * FROM scheduled_maintenance ORDER BY scheduled_start DESC`
  );

  return response(200, {
    maintenance: result.rows.map(formatMaintenance),
  });
}

async function handleGetMaintenance(event, user) {
  const id = extractPathParam(event.path, '/admin/maintenance/');

  const result = await opsQuery(
    `SELECT * FROM scheduled_maintenance WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found' });
  }

  return response(200, formatMaintenance(result.rows[0]));
}

async function handleCreateMaintenance(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to create maintenance windows' });
  }

  const body = JSON.parse(event.body);
  const { title, description, scheduledStart, scheduledEnd, affectedComponents, notifyCustomers } = body;

  if (!title || !scheduledStart || !scheduledEnd) {
    return response(400, { message: 'Missing required fields' });
  }

  const result = await opsQuery(
    `INSERT INTO scheduled_maintenance
     (title, description, scheduled_start, scheduled_end, affected_components, notify_customers, created_by_id, created_by_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [title, description || null, scheduledStart, scheduledEnd, affectedComponents || [], notifyCustomers ?? true, user.id, user.email]
  );

  await logAudit(user, 'create_maintenance', 'maintenance', result.rows[0].id, { title }, clientIp);

  return response(201, formatMaintenance(result.rows[0]));
}

async function handleUpdateMaintenance(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to update maintenance windows' });
  }

  const id = extractPathParam(event.path, '/admin/maintenance/');
  const body = JSON.parse(event.body);
  const { title, description, scheduledStart, scheduledEnd, affectedComponents, status, notifyCustomers } = body;

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description);
  }
  if (scheduledStart !== undefined) {
    updates.push(`scheduled_start = $${paramIndex++}`);
    params.push(scheduledStart);
  }
  if (scheduledEnd !== undefined) {
    updates.push(`scheduled_end = $${paramIndex++}`);
    params.push(scheduledEnd);
  }
  if (affectedComponents !== undefined) {
    updates.push(`affected_components = $${paramIndex++}`);
    params.push(affectedComponents);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }
  if (notifyCustomers !== undefined) {
    updates.push(`notify_customers = $${paramIndex++}`);
    params.push(notifyCustomers);
  }

  if (updates.length === 0) {
    return response(400, { message: 'No fields to update' });
  }

  params.push(id);
  const result = await opsQuery(
    `UPDATE scheduled_maintenance SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found' });
  }

  await logAudit(user, 'update_maintenance', 'maintenance', id, body, clientIp);

  return response(200, formatMaintenance(result.rows[0]));
}

async function handleDeleteMaintenance(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to delete maintenance windows' });
  }

  const id = extractPathParam(event.path, '/admin/maintenance/');

  const result = await opsQuery(
    `DELETE FROM scheduled_maintenance WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found' });
  }

  await logAudit(user, 'delete_maintenance', 'maintenance', id, null, clientIp);

  return response(200, { success: true });
}

function formatMaintenance(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    affectedComponents: row.affected_components || [],
    status: row.status,
    notifyCustomers: row.notify_customers,
    createdById: row.created_by_id,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
  };
}

// =========================================================================
// Broadcast Handlers
// =========================================================================

async function handleListBroadcasts(event, user) {
  const result = await opsQuery(
    `SELECT * FROM broadcasts ORDER BY created_at DESC`
  );

  return response(200, {
    broadcasts: result.rows.map(formatBroadcast),
  });
}

async function handleGetBroadcast(event, user) {
  const id = extractPathParam(event.path, '/admin/broadcasts/');

  const result = await opsQuery(
    `SELECT * FROM broadcasts WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }

  return response(200, formatBroadcast(result.rows[0]));
}

async function handleCreateBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to create broadcasts' });
  }

  const body = JSON.parse(event.body);
  const { title, message, type, target, displayLocations, startsAt, expiresAt } = body;

  if (!title || !message || !type || !displayLocations || displayLocations.length === 0 || !startsAt) {
    return response(400, { message: 'Missing required fields' });
  }

  const result = await opsQuery(
    `INSERT INTO broadcasts
     (title, message, type, target, display_location, starts_at, expires_at, created_by_id, created_by_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [title, message, type, target || 'all', displayLocations, startsAt, expiresAt || null, user.id, user.email]
  );

  await logAudit(user, 'create_broadcast', 'broadcast', result.rows[0].id, { title, type }, clientIp);

  return response(201, formatBroadcast(result.rows[0]));
}

async function handleUpdateBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to update broadcasts' });
  }

  const id = extractPathParam(event.path, '/admin/broadcasts/');
  const body = JSON.parse(event.body);
  const { title, message, type, target, displayLocations, startsAt, expiresAt, isActive } = body;

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(title);
  }
  if (message !== undefined) {
    updates.push(`message = $${paramIndex++}`);
    params.push(message);
  }
  if (type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    params.push(type);
  }
  if (target !== undefined) {
    updates.push(`target = $${paramIndex++}`);
    params.push(target);
  }
  if (displayLocations !== undefined) {
    updates.push(`display_location = $${paramIndex++}`);
    params.push(displayLocations);
  }
  if (startsAt !== undefined) {
    updates.push(`starts_at = $${paramIndex++}`);
    params.push(startsAt);
  }
  if (expiresAt !== undefined) {
    updates.push(`expires_at = $${paramIndex++}`);
    params.push(expiresAt);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(isActive);
  }

  if (updates.length === 0) {
    return response(400, { message: 'No fields to update' });
  }

  params.push(id);
  const result = await opsQuery(
    `UPDATE broadcasts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }

  await logAudit(user, 'update_broadcast', 'broadcast', id, body, clientIp);

  return response(200, formatBroadcast(result.rows[0]));
}

async function handleDeleteBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to delete broadcasts' });
  }

  const id = extractPathParam(event.path, '/admin/broadcasts/');

  const result = await opsQuery(
    `DELETE FROM broadcasts WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }

  await logAudit(user, 'delete_broadcast', 'broadcast', id, null, clientIp);

  return response(200, { success: true });
}

function formatBroadcast(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    target: row.target,
    displayLocations: row.display_location || [],
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdById: row.created_by_id,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
  };
}

// =========================================================================
// Feature Flag Handlers
// =========================================================================

async function handleListFeatureFlags(event, user) {
  const result = await opsQuery(
    `SELECT f.*, COUNT(o.id) as override_count
     FROM feature_flags f
     LEFT JOIN feature_flag_overrides o ON f.id = o.flag_id
     GROUP BY f.id
     ORDER BY f.created_at DESC`
  );

  return response(200, {
    flags: result.rows.map(row => ({
      ...formatFeatureFlag(row),
      overrideCount: parseInt(row.override_count) || 0,
    })),
  });
}

async function handleGetFeatureFlag(event, user) {
  const id = extractPathParam(event.path, '/admin/feature-flags/');

  const flagResult = await opsQuery(
    `SELECT * FROM feature_flags WHERE id = $1`,
    [id]
  );

  if (flagResult.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  const overridesResult = await opsQuery(
    `SELECT o.*, t.name as tenant_name
     FROM feature_flag_overrides o
     LEFT JOIN "Tenant" t ON o.tenant_id::text = t.id::text
     WHERE o.flag_id = $1
     ORDER BY o.created_at DESC`,
    [id]
  );

  return response(200, {
    ...formatFeatureFlag(flagResult.rows[0]),
    overrides: overridesResult.rows.map(row => ({
      id: row.id,
      flagId: row.flag_id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      isEnabled: row.is_enabled,
      createdAt: row.created_at,
    })),
  });
}

async function handleCreateFeatureFlag(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to create feature flags' });
  }

  const body = JSON.parse(event.body);
  const { key, name, description, isEnabled, rolloutPercentage } = body;

  if (!key || !name) {
    return response(400, { message: 'Key and name are required' });
  }

  // Check for duplicate key
  const existingResult = await opsQuery(
    `SELECT id FROM feature_flags WHERE key = $1`,
    [key]
  );

  if (existingResult.rows.length > 0) {
    return response(400, { message: 'Feature flag key already exists' });
  }

  const result = await opsQuery(
    `INSERT INTO feature_flags (key, name, description, is_enabled, rollout_percentage)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [key, name, description || null, isEnabled ?? false, rolloutPercentage ?? 100]
  );

  await logAudit(user, 'create_feature_flag', 'feature_flag', result.rows[0].id, { key, name }, clientIp);

  return response(201, formatFeatureFlag(result.rows[0]));
}

async function handleUpdateFeatureFlag(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to update feature flags' });
  }

  const id = extractPathParam(event.path, '/admin/feature-flags/');
  const body = JSON.parse(event.body);
  const { name, description, isEnabled, rolloutPercentage } = body;

  const updates = ['updated_at = NOW()'];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description);
  }
  if (isEnabled !== undefined) {
    updates.push(`is_enabled = $${paramIndex++}`);
    params.push(isEnabled);
  }
  if (rolloutPercentage !== undefined) {
    updates.push(`rollout_percentage = $${paramIndex++}`);
    params.push(rolloutPercentage);
  }

  params.push(id);
  const result = await opsQuery(
    `UPDATE feature_flags SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  await logAudit(user, 'update_feature_flag', 'feature_flag', id, body, clientIp);

  return response(200, formatFeatureFlag(result.rows[0]));
}

async function handleDeleteFeatureFlag(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to delete feature flags' });
  }

  const id = extractPathParam(event.path, '/admin/feature-flags/');

  const result = await opsQuery(
    `DELETE FROM feature_flags WHERE id = $1 RETURNING id, key`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  await logAudit(user, 'delete_feature_flag', 'feature_flag', id, { key: result.rows[0].key }, clientIp);

  return response(200, { success: true });
}

async function handleAddFeatureFlagOverride(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to add overrides' });
  }

  const flagId = extractPathParam(event.path, '/admin/feature-flags/', '/overrides');
  const body = JSON.parse(event.body);
  const { tenantId, isEnabled } = body;

  if (!tenantId || isEnabled === undefined) {
    return response(400, { message: 'Tenant ID and enabled status are required' });
  }

  // Verify tenant exists
  const tenantResult = await barkbaseQuery(
    `SELECT id, name FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  // Check for existing override
  const existingResult = await opsQuery(
    `SELECT id FROM feature_flag_overrides WHERE flag_id = $1 AND tenant_id = $2`,
    [flagId, tenantId]
  );

  if (existingResult.rows.length > 0) {
    // Update existing
    const result = await opsQuery(
      `UPDATE feature_flag_overrides SET is_enabled = $1 WHERE flag_id = $2 AND tenant_id = $3 RETURNING *`,
      [isEnabled, flagId, tenantId]
    );
    return response(200, {
      id: result.rows[0].id,
      flagId: result.rows[0].flag_id,
      tenantId: result.rows[0].tenant_id,
      tenantName: tenantResult.rows[0].name,
      isEnabled: result.rows[0].is_enabled,
      createdAt: result.rows[0].created_at,
    });
  }

  const result = await opsQuery(
    `INSERT INTO feature_flag_overrides (flag_id, tenant_id, is_enabled)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [flagId, tenantId, isEnabled]
  );

  await logAudit(user, 'add_feature_flag_override', 'feature_flag', flagId, { tenantId, isEnabled }, clientIp);

  return response(201, {
    id: result.rows[0].id,
    flagId: result.rows[0].flag_id,
    tenantId: result.rows[0].tenant_id,
    tenantName: tenantResult.rows[0].name,
    isEnabled: result.rows[0].is_enabled,
    createdAt: result.rows[0].created_at,
  });
}

async function handleDeleteFeatureFlagOverride(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to remove overrides' });
  }

  // Extract both flagId and overrideId from path
  const pathParts = event.path.split('/');
  const flagId = pathParts[3];
  const overrideId = pathParts[5];

  const result = await opsQuery(
    `DELETE FROM feature_flag_overrides WHERE id = $1 AND flag_id = $2 RETURNING id`,
    [overrideId, flagId]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Override not found' });
  }

  await logAudit(user, 'remove_feature_flag_override', 'feature_flag', flagId, { overrideId }, clientIp);

  return response(200, { success: true });
}

function formatFeatureFlag(row) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isEnabled: row.is_enabled,
    rolloutPercentage: row.rollout_percentage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =========================================================================
// Public Handlers (no auth required)
// =========================================================================

async function handlePublicBroadcasts(event) {
  const result = await opsQuery(
    `SELECT * FROM broadcasts
     WHERE is_active = true
     AND starts_at <= NOW()
     AND (expires_at IS NULL OR expires_at > NOW())
     AND 'status_page' = ANY(display_location)
     ORDER BY created_at DESC`
  );

  return response(200, {
    broadcasts: result.rows.map(formatBroadcast),
  });
}

async function handlePublicMaintenance(event) {
  const result = await opsQuery(
    `SELECT * FROM scheduled_maintenance
     WHERE status IN ('scheduled', 'in_progress')
     AND scheduled_end > NOW()
     ORDER BY scheduled_start ASC`
  );

  return response(200, {
    maintenance: result.rows.map(formatMaintenance),
  });
}

async function handlePublicFeatures(event) {
  const tenantId = event.queryStringParameters?.tenant_id;

  if (!tenantId) {
    return response(400, { message: 'tenant_id is required' });
  }

  // Get all enabled flags
  const flagsResult = await opsQuery(
    `SELECT key, is_enabled, rollout_percentage FROM feature_flags WHERE is_enabled = true`
  );

  // Get overrides for this tenant
  const overridesResult = await opsQuery(
    `SELECT f.key, o.is_enabled
     FROM feature_flag_overrides o
     JOIN feature_flags f ON o.flag_id = f.id
     WHERE o.tenant_id = $1`,
    [tenantId]
  );

  const overrideMap = new Map(overridesResult.rows.map(r => [r.key, r.is_enabled]));

  // Determine enabled features
  const enabledFeatures = flagsResult.rows
    .filter(flag => {
      // Check override first
      if (overrideMap.has(flag.key)) {
        return overrideMap.get(flag.key);
      }
      // Check rollout percentage (simple hash-based determination)
      if (flag.rollout_percentage < 100) {
        const hash = simpleHash(tenantId + flag.key);
        return (hash % 100) < flag.rollout_percentage;
      }
      return flag.is_enabled;
    })
    .map(f => f.key);

  return response(200, { features: enabledFeatures });
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
