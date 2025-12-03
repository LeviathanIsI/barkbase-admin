/**
 * BarkBase Ops Admin API
 *
 * Handles all /admin/* routes:
 * - GET /admin/search?q={query} - Search tenants/users
 * - GET /admin/tenants/{id} - Get tenant details
 * - GET /admin/tenants/{id}/users - Get tenant users
 * - GET /admin/incidents - List incidents
 * - POST /admin/incidents - Create incident
 * - GET /admin/incidents/{id} - Get incident details
 * - PUT /admin/incidents/{id} - Update incident
 * - POST /admin/incidents/{id}/updates - Add incident update
 */

const { opsQuery, barkbaseQuery, authenticateRequest, canWriteIncidents, getClientIp } = require('/opt/nodejs/index');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path;

  try {
    // Authenticate all admin requests
    const user = await authenticateRequest(event);

    // Route to appropriate handler
    if (path.startsWith('/admin/search')) {
      return await handleSearch(event, user);
    }

    if (path.match(/^\/admin\/tenants\/[^/]+\/users$/)) {
      return await handleTenantUsers(event, user);
    }

    if (path.match(/^\/admin\/tenants\/[^/]+$/)) {
      return await handleTenant(event, user);
    }

    if (path.match(/^\/admin\/incidents\/[^/]+\/updates$/)) {
      if (method === 'POST') {
        return await handleAddIncidentUpdate(event, user);
      }
    }

    if (path.match(/^\/admin\/incidents\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetIncident(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateIncident(event, user);
      }
    }

    if (path === '/admin/incidents') {
      if (method === 'GET') {
        return await handleListIncidents(event, user);
      }
      if (method === 'POST') {
        return await handleCreateIncident(event, user);
      }
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

async function handleSearch(event, user) {
  const query = event.queryStringParameters?.q;
  if (!query || query.length < 2) {
    return response(400, { message: 'Query must be at least 2 characters' });
  }

  const searchPattern = `%${query}%`;

  // Search tenants
  const tenantResult = await barkbaseQuery(
    `SELECT id, name, subdomain, status FROM "Tenant"
     WHERE name ILIKE $1 OR subdomain ILIKE $1
     LIMIT 10`,
    [searchPattern]
  );

  // Search users
  const userResult = await barkbaseQuery(
    `SELECT u.id, u.email, u.name, u.tenant_id, t.name as tenant_name
     FROM "User" u
     LEFT JOIN "Tenant" t ON u.tenant_id = t.id
     WHERE u.email ILIKE $1 OR u.name ILIKE $1
     LIMIT 10`,
    [searchPattern]
  );

  const results = [
    ...tenantResult.rows.map(row => ({
      type: 'tenant',
      id: row.id,
      name: row.name,
    })),
    ...userResult.rows.map(row => ({
      type: 'user',
      id: row.id,
      name: row.name,
      email: row.email,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
    })),
  ];

  await logAudit(user, 'search', 'search', null, { query });

  return response(200, { results });
}

async function handleTenant(event, user) {
  const tenantId = extractPathParam(event.path, '/admin/tenants/');

  const tenantResult = await barkbaseQuery(
    `SELECT id, name, subdomain, status, created_at, plan FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  const tenant = tenantResult.rows[0];

  // Get counts
  const [userCount, petCount, bookingCount] = await Promise.all([
    barkbaseQuery(`SELECT COUNT(*) FROM "User" WHERE tenant_id = $1`, [tenantId]),
    barkbaseQuery(`SELECT COUNT(*) FROM "Pet" WHERE tenant_id = $1`, [tenantId]),
    barkbaseQuery(`SELECT COUNT(*) FROM "Booking" WHERE tenant_id = $1`, [tenantId]),
  ]);

  // Get users
  const usersResult = await barkbaseQuery(
    `SELECT id, email, name, role, status, created_at, last_login_at
     FROM "User" WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [tenantId]
  );

  await logAudit(user, 'view_tenant', 'tenant', tenantId, null);

  return response(200, {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    status: tenant.status,
    createdAt: tenant.created_at,
    plan: tenant.plan,
    userCount: parseInt(userCount.rows[0].count),
    petCount: parseInt(petCount.rows[0].count),
    bookingCount: parseInt(bookingCount.rows[0].count),
    users: usersResult.rows.map(u => ({
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

async function handleCreateIncident(event, user) {
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

  await logAudit(user, 'create_incident', 'incident', incident.id, { title, severity, status });

  return response(201, formatIncident({ ...incident, components }));
}

async function handleUpdateIncident(event, user) {
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

  await logAudit(user, 'update_incident', 'incident', incidentId, body);

  return response(200, formatIncident(result.rows[0]));
}

async function handleAddIncidentUpdate(event, user) {
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

  await logAudit(user, 'add_incident_update', 'incident', incidentId, { message, status });

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

async function logAudit(user, action, targetType, targetId, details) {
  try {
    await opsQuery(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.email, action, targetType, targetId, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}
