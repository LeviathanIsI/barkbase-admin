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
 * - GET /admin/white-label - List white-label tenants
 * - GET /admin/white-label/stats - White-label stats
 * - GET/PUT /admin/white-label/{tenantId} - Get/update branding
 * - GET /admin/white-label/{tenantId}/history - Change history
 * - POST /admin/white-label/{tenantId}/verify-domain - Verify custom domain
 * - GET /status/broadcasts - Public active broadcasts
 * - GET /status/maintenance - Public upcoming maintenance
 * - GET /api/features?tenant_id={id} - Public feature flags for tenant
 */

const { opsQuery, barkbaseQuery, authenticateRequest, canWriteIncidents, getClientIp } = require('/opt/nodejs/index');

// AWS SDK for CloudWatch and Lambda metrics
const { CloudWatchClient, GetMetricDataCommand, DescribeAlarmsCommand } = require('@aws-sdk/client-cloudwatch');
const { LambdaClient, ListFunctionsCommand, GetFunctionCommand } = require('@aws-sdk/client-lambda');
const { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION_DEPLOY || 'us-east-2' });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION_DEPLOY || 'us-east-2' });
const logsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION_DEPLOY || 'us-east-2' });
const rdsClient = new RDSClient({ region: process.env.AWS_REGION_DEPLOY || 'us-east-2' });

// Store current request event for CORS headers
let currentEvent = null;

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  currentEvent = event;

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path;

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return corsResponse(200, {});
  }

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

    // Incident routes - Enhanced
    // Postmortem action items
    if (path.match(/^\/admin\/postmortems\/[^/]+\/actions\/[^/]+$/)) {
      if (method === 'PUT') {
        return await handleUpdatePostmortemAction(event, user, clientIp);
      }
      if (method === 'DELETE') {
        return await handleDeletePostmortemAction(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/postmortems\/[^/]+\/actions$/)) {
      if (method === 'POST') {
        return await handleCreatePostmortemAction(event, user, clientIp);
      }
    }

    // Incident postmortem
    if (path.match(/^\/admin\/incidents\/[^/]+\/postmortem\/publish$/)) {
      if (method === 'PUT') {
        return await handlePublishPostmortem(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/incidents\/[^/]+\/postmortem$/)) {
      if (method === 'GET') {
        return await handleGetPostmortem(event, user);
      }
      if (method === 'POST' || method === 'PUT') {
        return await handleSavePostmortem(event, user, clientIp);
      }
    }

    // Incident affected customers
    if (path.match(/^\/admin\/incidents\/[^/]+\/affected\/[^/]+$/)) {
      if (method === 'DELETE') {
        return await handleRemoveAffectedCustomer(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/incidents\/[^/]+\/notify$/)) {
      if (method === 'POST') {
        return await handleNotifyAffectedCustomers(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/incidents\/[^/]+\/affected$/)) {
      if (method === 'GET') {
        return await handleListAffectedCustomers(event, user);
      }
      if (method === 'POST') {
        return await handleAddAffectedCustomer(event, user, clientIp);
      }
    }

    // Incident updates/timeline
    if (path.match(/^\/admin\/incidents\/[^/]+\/updates$/)) {
      if (method === 'GET') {
        return await handleGetIncidentUpdates(event, user);
      }
      if (method === 'POST') {
        return await handleAddIncidentUpdate(event, user, clientIp);
      }
    }

    // Incident stats
    if (path === '/admin/incidents/stats') {
      if (method === 'GET') {
        return await handleIncidentStats(event, user);
      }
    }

    // Single incident operations
    if (path.match(/^\/admin\/incidents\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetIncident(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateIncident(event, user, clientIp);
      }
      if (method === 'DELETE') {
        return await handleDeleteIncident(event, user, clientIp);
      }
    }

    // Incidents list/create
    if (path === '/admin/incidents') {
      if (method === 'GET') {
        return await handleListIncidents(event, user);
      }
      if (method === 'POST') {
        return await handleCreateIncident(event, user, clientIp);
      }
    }

    // Command Center / Health monitoring routes
    if (path === '/admin/command-center/overview') {
      return await handleCommandCenterOverview(event, user);
    }

    if (path === '/admin/command-center/services') {
      return await handleCommandCenterServices(event, user);
    }

    if (path === '/admin/command-center/metrics') {
      return await handleCommandCenterMetrics(event, user);
    }

    if (path === '/admin/command-center/lambdas') {
      return await handleCommandCenterLambdas(event, user);
    }

    if (path.match(/^\/admin\/command-center\/lambdas\/[^/]+\/metrics$/)) {
      return await handleLambdaDetailedMetrics(event, user);
    }

    if (path.match(/^\/admin\/command-center\/lambdas\/[^/]+\/errors$/)) {
      return await handleLambdaErrors(event, user);
    }

    if (path === '/admin/command-center/database') {
      return await handleCommandCenterDatabase(event, user);
    }

    if (path === '/admin/command-center/api-traffic') {
      return await handleCommandCenterApiTraffic(event, user);
    }

    if (path === '/admin/command-center/errors') {
      return await handleCommandCenterErrors(event, user);
    }

    if (path.match(/^\/admin\/command-center\/errors\/[^/]+$/)) {
      return await handleErrorDetails(event, user);
    }

    if (path === '/admin/command-center/tenants-activity') {
      return await handleTenantsActivity(event, user);
    }

    // Legacy health endpoints (for backwards compatibility)
    if (path === '/admin/health/lambdas') {
      return await handleCommandCenterLambdas(event, user);
    }

    if (path === '/admin/health/api') {
      return await handleCommandCenterApiTraffic(event, user);
    }

    if (path === '/admin/health/database') {
      return await handleCommandCenterDatabase(event, user);
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

    if (path === '/admin/maintenance/stats') {
      if (method === 'GET') {
        return await handleMaintenanceStats(event, user);
      }
    }

    // Maintenance lifecycle actions
    if (path.match(/^\/admin\/maintenance\/[^/]+\/start$/)) {
      if (method === 'POST') {
        return await handleStartMaintenance(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/maintenance\/[^/]+\/complete$/)) {
      if (method === 'POST') {
        return await handleCompleteMaintenance(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/maintenance\/[^/]+\/extend$/)) {
      if (method === 'POST') {
        return await handleExtendMaintenance(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/maintenance\/[^/]+\/cancel$/)) {
      if (method === 'POST') {
        return await handleCancelMaintenance(event, user, clientIp);
      }
    }

    // Maintenance updates (timeline)
    if (path.match(/^\/admin\/maintenance\/[^/]+\/updates$/)) {
      if (method === 'GET') {
        return await handleGetMaintenanceUpdates(event, user);
      }
      if (method === 'POST') {
        return await handlePostMaintenanceUpdate(event, user, clientIp);
      }
    }

    // Maintenance notifications
    if (path.match(/^\/admin\/maintenance\/[^/]+\/notify$/)) {
      if (method === 'POST') {
        return await handleSendMaintenanceNotification(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/maintenance\/[^/]+\/notifications$/)) {
      if (method === 'GET') {
        return await handleGetMaintenanceNotifications(event, user);
      }
    }

    // Maintenance affected customers
    if (path.match(/^\/admin\/maintenance\/[^/]+\/affected$/)) {
      if (method === 'GET') {
        return await handleGetMaintenanceAffected(event, user);
      }
      if (method === 'POST') {
        return await handleAddMaintenanceAffected(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/maintenance\/[^/]+\/affected\/[^/]+$/)) {
      if (method === 'DELETE') {
        return await handleRemoveMaintenanceAffected(event, user, clientIp);
      }
    }

    // Recurring maintenance actions
    if (path.match(/^\/admin\/maintenance\/[^/]+\/skip$/)) {
      if (method === 'POST') {
        return await handleSkipMaintenance(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/maintenance\/[^/]+\/disable$/)) {
      if (method === 'POST') {
        return await handleDisableMaintenance(event, user, clientIp);
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

    // Broadcast routes - Enhanced Enterprise
    if (path === '/admin/broadcasts') {
      if (method === 'GET') {
        return await handleListBroadcasts(event, user);
      }
      if (method === 'POST') {
        return await handleCreateBroadcast(event, user, clientIp);
      }
    }

    if (path === '/admin/broadcasts/stats') {
      if (method === 'GET') {
        return await handleBroadcastStats(event, user);
      }
    }

    if (path === '/admin/broadcasts/audience/estimate') {
      if (method === 'POST') {
        return await handleAudienceEstimate(event, user);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+\/send$/)) {
      if (method === 'POST') {
        return await handleSendBroadcast(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+\/schedule$/)) {
      if (method === 'POST') {
        return await handleScheduleBroadcast(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+\/cancel$/)) {
      if (method === 'POST') {
        return await handleCancelBroadcast(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+\/end$/)) {
      if (method === 'POST') {
        return await handleEndBroadcast(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+\/analytics$/)) {
      if (method === 'GET') {
        return await handleBroadcastAnalytics(event, user);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+\/recipients$/)) {
      if (method === 'GET') {
        return await handleBroadcastRecipients(event, user);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+\/preview$/)) {
      if (method === 'POST') {
        return await handlePreviewBroadcastEmail(event, user);
      }
    }

    if (path.match(/^\/admin\/broadcasts\/[^/]+\/preview\/banner$/)) {
      if (method === 'GET') {
        return await handlePreviewBroadcastBanner(event, user);
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

    // Feature flag routes - Enterprise
    if (path === '/admin/feature-flags') {
      if (method === 'GET') {
        return await handleListFeatureFlags(event, user);
      }
      if (method === 'POST') {
        return await handleCreateFeatureFlag(event, user, clientIp);
      }
    }

    if (path === '/admin/feature-flags/stats') {
      if (method === 'GET') {
        return await handleFeatureFlagStats(event, user);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/toggle$/)) {
      if (method === 'POST') {
        return await handleToggleFeatureFlag(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/rollout$/)) {
      if (method === 'POST') {
        return await handleUpdateFeatureFlagRollout(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/kill$/)) {
      if (method === 'POST') {
        return await handleKillFeatureFlag(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/archive$/)) {
      if (method === 'POST') {
        return await handleArchiveFeatureFlag(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/tenants\/[^/]+$/)) {
      if (method === 'POST') {
        return await handleAddFeatureFlagOverride(event, user, clientIp);
      }
      if (method === 'DELETE') {
        return await handleRemoveFeatureFlagOverride(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/tenants$/)) {
      if (method === 'GET') {
        return await handleGetFeatureFlagTenants(event, user);
      }
    }

    if (path.match(/^\/admin\/feature-flags\/[^/]+\/history$/)) {
      if (method === 'GET') {
        return await handleGetFeatureFlagHistory(event, user);
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

    // Public feature flag evaluation endpoints
    if (path.match(/^\/api\/v1\/feature-flags\/[^/]+\/[^/]+$/)) {
      return await handleEvaluateFeatureFlag(event);
    }

    if (path.match(/^\/api\/v1\/feature-flags\/[^/]+$/)) {
      return await handleEvaluateAllFlags(event);
    }

    // API Proxy route
    if (path === '/admin/api-proxy') {
      if (method === 'POST') {
        return await handleApiProxy(event, user, clientIp);
      }
    }

    // Tenants list route
    if (path === '/admin/tenants') {
      if (method === 'GET') {
        return await handleListTenants(event, user);
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

    // Support Ticket routes
    if (path.match(/^\/admin\/tickets\/[^/]+\/messages$/)) {
      if (method === 'GET') {
        return await handleListTicketMessages(event, user);
      }
      if (method === 'POST') {
        return await handleCreateTicketMessage(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/tickets\/[^/]+\/activity$/)) {
      if (method === 'GET') {
        return await handleListTicketActivity(event, user);
      }
    }

    if (path.match(/^\/admin\/tickets\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetTicket(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateTicket(event, user, clientIp);
      }
      if (method === 'DELETE') {
        return await handleDeleteTicket(event, user, clientIp);
      }
    }

    if (path === '/admin/tickets') {
      if (method === 'GET') {
        return await handleListTickets(event, user);
      }
      if (method === 'POST') {
        return await handleCreateTicket(event, user, clientIp);
      }
    }

    if (path === '/admin/tickets/stats') {
      if (method === 'GET') {
        return await handleTicketStats(event, user);
      }
    }

    // Portal lookup for ticket creation
    if (path.match(/^\/admin\/lookup\/portal\/[^/]+$/)) {
      if (method === 'GET') {
        return await handlePortalLookup(event, user);
      }
    }

    // Impersonation token generation
    if (path.match(/^\/admin\/impersonate\/[^/]+$/)) {
      if (method === 'POST') {
        return await handleGenerateImpersonationToken(event, user, clientIp);
      }
    }

    // Customer 360 routes
    if (path.match(/^\/admin\/customers\/[^/]+\/users$/)) {
      if (method === 'GET') {
        return await handleGetCustomerUsers(event, user);
      }
    }

    if (path.match(/^\/admin\/customers\/[^/]+\/activity$/)) {
      if (method === 'GET') {
        return await handleGetCustomerActivity(event, user);
      }
    }

    if (path.match(/^\/admin\/customers\/[^/]+\/billing$/)) {
      if (method === 'GET') {
        return await handleGetCustomerBilling(event, user);
      }
    }

    if (path.match(/^\/admin\/customers\/[^/]+\/tickets$/)) {
      if (method === 'GET') {
        return await handleGetCustomerTickets(event, user);
      }
    }

    if (path.match(/^\/admin\/customers\/[^/]+\/notes$/)) {
      if (method === 'GET') {
        return await handleGetCustomerNotes(event, user);
      }
      if (method === 'POST') {
        return await handleCreateCustomerNote(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/customers\/[^/]+\/flags$/)) {
      if (method === 'GET') {
        return await handleGetCustomerFlags(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateCustomerFlags(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/customers\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetCustomerProfile(event, user, clientIp);
      }
    }

    // White-label routes
    if (path === '/admin/white-label') {
      if (method === 'GET') {
        return await handleListWhiteLabelTenants(event, user);
      }
    }

    if (path === '/admin/white-label/stats') {
      if (method === 'GET') {
        return await handleWhiteLabelStats(event, user);
      }
    }

    if (path.match(/^\/admin\/white-label\/[^/]+\/history$/)) {
      if (method === 'GET') {
        return await handleGetWhiteLabelHistory(event, user);
      }
    }

    if (path.match(/^\/admin\/white-label\/[^/]+\/verify-domain$/)) {
      if (method === 'POST') {
        return await handleVerifyWhiteLabelDomain(event, user, clientIp);
      }
    }

    if (path.match(/^\/admin\/white-label\/[^/]+$/)) {
      if (method === 'GET') {
        return await handleGetWhiteLabelBranding(event, user);
      }
      if (method === 'PUT') {
        return await handleUpdateWhiteLabelBranding(event, user, clientIp);
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

async function handleSearch(event, user, clientIp) {
  const query = event.queryStringParameters?.q;
  if (!query || query.length < 2) {
    return response(400, { message: 'Query must be at least 2 characters' });
  }

  const searchPattern = `%${query}%`;

  // Search tenants with user count
  const tenantResult = await barkbaseQuery(
    `SELECT t.id, t.name, t.state, t.created_at,
            COUNT(u.id) as user_count
     FROM "Tenant" t
     LEFT JOIN "User" u ON u.tenant_id = t.id
     WHERE t.name ILIKE $1
     GROUP BY t.id
     ORDER BY t.name
     LIMIT 20`,
    [searchPattern]
  );

  // Search users with tenant info
  const userResult = await barkbaseQuery(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.tenant_id, u.last_login_at,
            t.name as tenant_name
     FROM "User" u
     LEFT JOIN "Tenant" t ON u.tenant_id = t.id
     WHERE u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1
     ORDER BY u.email
     LIMIT 20`,
    [searchPattern]
  );

  const results = [
    ...tenantResult.rows.map(row => ({
      type: 'tenant',
      id: row.id,
      name: row.name,
      status: row.state,
      userCount: parseInt(row.user_count) || 0,
      createdAt: row.created_at,
    })),
    ...userResult.rows.map(row => ({
      type: 'user',
      id: row.id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
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
    `SELECT id, name, state, created_at, settings
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
    status: tenant.state,
    createdAt: tenant.created_at,
    settings: tenant.settings,
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
// Incident Handlers - Enhanced Enterprise Version
// =========================================================================

const SERVICES = [
  { id: 'api_gateway', name: 'API Gateway' },
  { id: 'authentication', name: 'Authentication' },
  { id: 'booking_system', name: 'Booking System' },
  { id: 'database', name: 'Database' },
  { id: 'payments', name: 'Payments' },
  { id: 'notifications', name: 'Notifications' },
  { id: 'scheduler', name: 'Scheduler' },
  { id: 'file_storage', name: 'File Storage' },
  { id: 'frontend', name: 'Frontend/Dashboard' },
  { id: 'integrations', name: 'Integrations' },
];

/**
 * List incidents with enhanced filtering
 */
async function handleListIncidents(event, user) {
  const status = event.queryStringParameters?.status;
  const severity = event.queryStringParameters?.severity;
  const service = event.queryStringParameters?.service;
  const from = event.queryStringParameters?.from;
  const to = event.queryStringParameters?.to;
  const search = event.queryStringParameters?.search;
  const limit = parseInt(event.queryStringParameters?.limit) || 50;
  const offset = parseInt(event.queryStringParameters?.offset) || 0;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (status && status !== 'all') {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (severity && severity !== 'all') {
    conditions.push(`severity = $${paramIndex++}`);
    params.push(severity);
  }

  if (service && service !== 'all') {
    conditions.push(`affected_service = $${paramIndex++}`);
    params.push(service);
  }

  if (from) {
    conditions.push(`started_at >= $${paramIndex++}`);
    params.push(from);
  }

  if (to) {
    conditions.push(`started_at <= $${paramIndex++}`);
    params.push(to);
  }

  if (search) {
    conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT *
    FROM incidents
    ${whereClause}
    ORDER BY
      CASE WHEN status != 'resolved' THEN 0 ELSE 1 END,
      started_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await opsQuery(query, params);

  // Get total count
  const countQuery = `SELECT COUNT(*) FROM incidents ${whereClause}`;
  const countResult = await opsQuery(countQuery, params.slice(0, -2));

  return response(200, {
    incidents: result.rows.map(formatEnhancedIncident),
    total: parseInt(countResult.rows[0].count),
    services: SERVICES,
  });
}

/**
 * Get incident stats for dashboard
 */
async function handleIncidentStats(event, user) {
  const [totalResult, activeResult, resolvedResult, mttrResult, p1Result] = await Promise.all([
    opsQuery(`SELECT COUNT(*) FROM incidents`),
    opsQuery(`SELECT COUNT(*) FROM incidents WHERE status != 'resolved'`),
    opsQuery(`SELECT COUNT(*) FROM incidents WHERE status = 'resolved' AND resolved_at >= date_trunc('month', CURRENT_DATE)`),
    opsQuery(`
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - started_at)) / 60) as avg_minutes
      FROM incidents
      WHERE resolved_at IS NOT NULL
      AND resolved_at >= NOW() - INTERVAL '90 days'
    `),
    opsQuery(`SELECT COUNT(*) FROM incidents WHERE severity = 'critical' AND started_at >= date_trunc('year', CURRENT_DATE)`),
  ]);

  return response(200, {
    stats: {
      total: parseInt(totalResult.rows[0].count),
      active: parseInt(activeResult.rows[0].count),
      resolvedThisMonth: parseInt(resolvedResult.rows[0].count),
      mttrMinutes: Math.round(parseFloat(mttrResult.rows[0].avg_minutes) || 0),
      p1sThisYear: parseInt(p1Result.rows[0].count),
    },
  });
}

/**
 * Get single incident with full details
 */
async function handleGetIncident(event, user) {
  const incidentId = extractPathParam(event.path, '/admin/incidents/');

  const incidentResult = await opsQuery(
    `SELECT * FROM incidents WHERE id = $1`,
    [incidentId]
  );

  if (incidentResult.rows.length === 0) {
    return response(404, { message: 'Incident not found' });
  }

  // Get updates/timeline
  const updatesResult = await opsQuery(
    `SELECT * FROM incident_updates WHERE incident_id = $1 ORDER BY created_at ASC`,
    [incidentId]
  );

  // Get affected customers count
  const affectedResult = await opsQuery(
    `SELECT COUNT(*) FROM incident_affected_customers WHERE incident_id = $1`,
    [incidentId]
  );

  // Check if postmortem exists
  const postmortemResult = await opsQuery(
    `SELECT id, status FROM incident_postmortems WHERE incident_id = $1`,
    [incidentId]
  );

  const incident = formatEnhancedIncident(incidentResult.rows[0]);
  incident.updates = updatesResult.rows.map(formatIncidentUpdate);
  incident.affectedCustomersCount = parseInt(affectedResult.rows[0].count);
  incident.hasPostmortem = postmortemResult.rows.length > 0;
  incident.postmortemStatus = postmortemResult.rows[0]?.status || null;
  incident.services = SERVICES;

  return response(200, { incident });
}

/**
 * Create new incident
 */
async function handleCreateIncident(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to create incidents' });
  }

  const body = JSON.parse(event.body || '{}');
  const {
    title,
    description,
    severity,
    affected_service,
    impact_scope = 'all',
    customer_message,
    internal_notes,
    assigned_to,
    assigned_to_name,
  } = body;

  if (!title || !severity || !affected_service) {
    return response(400, { message: 'Title, severity, and affected_service are required' });
  }

  // Insert incident
  const result = await opsQuery(`
    INSERT INTO incidents (
      title, description, severity, status, affected_service, impact_scope,
      customer_message, internal_notes, assigned_to, assigned_to_name,
      created_by, created_by_name
    )
    VALUES ($1, $2, $3, 'investigating', $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    title,
    description || null,
    severity,
    affected_service,
    impact_scope,
    customer_message || null,
    internal_notes || null,
    assigned_to || user.email,
    assigned_to_name || user.name || user.email,
    user.email,
    user.name || user.email,
  ]);

  const incident = result.rows[0];

  // Create initial timeline entry
  await opsQuery(`
    INSERT INTO incident_updates (
      incident_id, update_type, message, new_status, new_severity,
      created_by, created_by_name
    )
    VALUES ($1, 'created', $2, 'investigating', $3, $4, $5)
  `, [
    incident.id,
    `Incident created: "${title}"`,
    severity,
    user.email,
    user.name || user.email,
  ]);

  await logAudit(user, 'create_incident', 'incident', incident.id, {
    title, severity, affected_service,
  }, clientIp);

  return response(201, { incident: formatEnhancedIncident(incident) });
}

/**
 * Update incident
 */
async function handleUpdateIncident(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to update incidents' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/');
  const body = JSON.parse(event.body || '{}');

  // Get current incident state
  const currentResult = await opsQuery(`SELECT * FROM incidents WHERE id = $1`, [incidentId]);
  if (currentResult.rows.length === 0) {
    return response(404, { message: 'Incident not found' });
  }
  const current = currentResult.rows[0];

  const updates = [];
  const params = [];
  let paramIndex = 1;
  const timelineEntries = [];

  // Track status change
  if (body.status && body.status !== current.status) {
    updates.push(`status = $${paramIndex++}`);
    params.push(body.status);

    // Set timestamps based on status
    if (body.status === 'identified' && !current.identified_at) {
      updates.push(`identified_at = NOW()`);
    }
    if (body.status === 'resolved' && !current.resolved_at) {
      updates.push(`resolved_at = NOW()`);
    }

    timelineEntries.push({
      type: body.status === 'resolved' ? 'resolved' : 'status_change',
      message: body.status_message || `Status changed from ${current.status} to ${body.status}`,
      previous_status: current.status,
      new_status: body.status,
    });
  }

  // Track severity change
  if (body.severity && body.severity !== current.severity) {
    updates.push(`severity = $${paramIndex++}`);
    params.push(body.severity);
    timelineEntries.push({
      type: 'severity_change',
      message: `Severity changed from ${current.severity} to ${body.severity}`,
      previous_severity: current.severity,
      new_severity: body.severity,
    });
  }

  // Track assignment change
  if (body.assigned_to !== undefined && body.assigned_to !== current.assigned_to) {
    updates.push(`assigned_to = $${paramIndex++}`);
    params.push(body.assigned_to);
    if (body.assigned_to_name !== undefined) {
      updates.push(`assigned_to_name = $${paramIndex++}`);
      params.push(body.assigned_to_name);
    }
    timelineEntries.push({
      type: 'assigned',
      message: body.assigned_to
        ? `Assigned to ${body.assigned_to_name || body.assigned_to}`
        : 'Unassigned',
    });
  }

  // Other field updates
  if (body.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(body.title);
  }
  if (body.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(body.description);
  }
  if (body.affected_service !== undefined) {
    updates.push(`affected_service = $${paramIndex++}`);
    params.push(body.affected_service);
  }
  if (body.impact_scope !== undefined) {
    updates.push(`impact_scope = $${paramIndex++}`);
    params.push(body.impact_scope);
  }
  if (body.customer_message !== undefined) {
    updates.push(`customer_message = $${paramIndex++}`);
    params.push(body.customer_message);
  }
  if (body.internal_notes !== undefined) {
    updates.push(`internal_notes = $${paramIndex++}`);
    params.push(body.internal_notes);
  }

  if (updates.length === 0) {
    return response(400, { message: 'No updates provided' });
  }

  params.push(incidentId);

  const result = await opsQuery(
    `UPDATE incidents SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  // Create timeline entries
  for (const entry of timelineEntries) {
    await opsQuery(`
      INSERT INTO incident_updates (
        incident_id, update_type, message, previous_status, new_status,
        previous_severity, new_severity, created_by, created_by_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      incidentId,
      entry.type,
      entry.message,
      entry.previous_status || null,
      entry.new_status || null,
      entry.previous_severity || null,
      entry.new_severity || null,
      user.email,
      user.name || user.email,
    ]);
  }

  await logAudit(user, 'update_incident', 'incident', incidentId, body, clientIp);

  return response(200, { incident: formatEnhancedIncident(result.rows[0]) });
}

/**
 * Delete incident (admin only)
 */
async function handleDeleteIncident(event, user, clientIp) {
  if (user.role !== 'super_admin') {
    return response(403, { message: 'Only super admins can delete incidents' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/');

  const result = await opsQuery(`DELETE FROM incidents WHERE id = $1 RETURNING id, title`, [incidentId]);

  if (result.rows.length === 0) {
    return response(404, { message: 'Incident not found' });
  }

  await logAudit(user, 'delete_incident', 'incident', incidentId, {
    title: result.rows[0].title,
  }, clientIp);

  return response(200, { success: true });
}

/**
 * Get incident timeline/updates
 */
async function handleGetIncidentUpdates(event, user) {
  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/updates');

  const result = await opsQuery(
    `SELECT * FROM incident_updates WHERE incident_id = $1 ORDER BY created_at ASC`,
    [incidentId]
  );

  return response(200, { updates: result.rows.map(formatIncidentUpdate) });
}

/**
 * Add incident update/timeline entry
 */
async function handleAddIncidentUpdate(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to add updates' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/updates');
  const body = JSON.parse(event.body || '{}');
  const { message, is_internal = false, new_status } = body;

  if (!message) {
    return response(400, { message: 'Message is required' });
  }

  // If status change is included, update the incident
  if (new_status) {
    const currentResult = await opsQuery(`SELECT status FROM incidents WHERE id = $1`, [incidentId]);
    if (currentResult.rows.length === 0) {
      return response(404, { message: 'Incident not found' });
    }

    const updateFields = ['status = $1', 'updated_at = NOW()'];
    const updateParams = [new_status];

    if (new_status === 'identified') {
      updateFields.push('identified_at = COALESCE(identified_at, NOW())');
    }
    if (new_status === 'resolved') {
      updateFields.push('resolved_at = COALESCE(resolved_at, NOW())');
    }

    updateParams.push(incidentId);
    await opsQuery(
      `UPDATE incidents SET ${updateFields.join(', ')} WHERE id = $${updateParams.length}`,
      updateParams
    );
  }

  const result = await opsQuery(`
    INSERT INTO incident_updates (
      incident_id, update_type, message, is_internal,
      previous_status, new_status, created_by, created_by_name
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    incidentId,
    new_status ? 'status_change' : 'update',
    message,
    is_internal,
    null,
    new_status || null,
    user.email,
    user.name || user.email,
  ]);

  await logAudit(user, 'add_incident_update', 'incident', incidentId, { message, new_status }, clientIp);

  return response(201, { update: formatIncidentUpdate(result.rows[0]) });
}

/**
 * List affected customers for incident
 */
async function handleListAffectedCustomers(event, user) {
  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/affected');

  const result = await opsQuery(`
    SELECT * FROM incident_affected_customers
    WHERE incident_id = $1
    ORDER BY created_at ASC
  `, [incidentId]);

  return response(200, {
    affected: result.rows.map(a => ({
      id: a.id,
      incidentId: a.incident_id,
      tenantId: a.tenant_id,
      tenantName: a.tenant_name,
      tenantSlug: a.tenant_slug,
      tenantPlan: a.tenant_plan,
      notified: a.notified,
      notifiedAt: a.notified_at,
      notifiedBy: a.notified_by,
      ticketId: a.ticket_id,
      notes: a.notes,
      createdAt: a.created_at,
    })),
  });
}

/**
 * Add affected customer to incident
 */
async function handleAddAffectedCustomer(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to modify incidents' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/affected');
  const body = JSON.parse(event.body || '{}');
  const { tenant_id, notes } = body;

  if (!tenant_id) {
    return response(400, { message: 'tenant_id is required' });
  }

  // Get tenant info from BarkBase
  const tenantResult = await barkbaseQuery(
    `SELECT id, name, slug, plan FROM "Tenant" WHERE id = $1`,
    [tenant_id]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  const tenant = tenantResult.rows[0];

  const result = await opsQuery(`
    INSERT INTO incident_affected_customers (
      incident_id, tenant_id, tenant_name, tenant_slug, tenant_plan, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (incident_id, tenant_id) DO UPDATE SET notes = $6
    RETURNING *
  `, [incidentId, tenant_id, tenant.name, tenant.slug, tenant.plan, notes || null]);

  await logAudit(user, 'add_affected_customer', 'incident', incidentId, { tenant_id, tenant_name: tenant.name }, clientIp);

  return response(201, { affected: result.rows[0] });
}

/**
 * Remove affected customer from incident
 */
async function handleRemoveAffectedCustomer(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to modify incidents' });
  }

  const pathParts = event.path.split('/');
  const incidentId = pathParts[3];
  const affectedId = pathParts[5];

  const result = await opsQuery(
    `DELETE FROM incident_affected_customers WHERE id = $1 AND incident_id = $2 RETURNING tenant_name`,
    [affectedId, incidentId]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Affected customer not found' });
  }

  await logAudit(user, 'remove_affected_customer', 'incident', incidentId, {
    tenant_name: result.rows[0].tenant_name,
  }, clientIp);

  return response(200, { success: true });
}

/**
 * Notify all affected customers
 */
async function handleNotifyAffectedCustomers(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to notify customers' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/notify');
  const body = JSON.parse(event.body || '{}');
  const { message } = body;

  // Mark all as notified
  const result = await opsQuery(`
    UPDATE incident_affected_customers
    SET notified = TRUE, notified_at = NOW(), notified_by = $1
    WHERE incident_id = $2 AND notified = FALSE
    RETURNING tenant_id, tenant_name
  `, [user.email, incidentId]);

  // In production, this would trigger actual notifications (email, in-app, etc.)
  // For now, just log the action

  await logAudit(user, 'notify_affected_customers', 'incident', incidentId, {
    count: result.rows.length,
    message,
  }, clientIp);

  return response(200, {
    success: true,
    notifiedCount: result.rows.length,
  });
}

/**
 * Get postmortem for incident
 */
async function handleGetPostmortem(event, user) {
  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/postmortem');

  const result = await opsQuery(`
    SELECT p.*, i.title as incident_title, i.started_at, i.resolved_at
    FROM incident_postmortems p
    JOIN incidents i ON p.incident_id = i.id
    WHERE p.incident_id = $1
  `, [incidentId]);

  if (result.rows.length === 0) {
    // Return empty postmortem template
    const incidentResult = await opsQuery(`SELECT * FROM incidents WHERE id = $1`, [incidentId]);
    if (incidentResult.rows.length === 0) {
      return response(404, { message: 'Incident not found' });
    }

    const incident = incidentResult.rows[0];
    const durationMinutes = incident.resolved_at
      ? Math.round((new Date(incident.resolved_at) - new Date(incident.started_at)) / 60000)
      : null;

    return response(200, {
      postmortem: {
        id: null,
        incidentId,
        incidentTitle: incident.title,
        summary: '',
        rootCause: '',
        impactDurationMinutes: durationMinutes,
        impactCustomersCount: incident.affected_customers_count || 0,
        impactBookingsCount: null,
        impactRevenueEstimate: null,
        impactDescription: '',
        lessonsLearned: '',
        status: 'draft',
        actionItems: [],
      },
    });
  }

  // Get action items
  const actionsResult = await opsQuery(`
    SELECT * FROM postmortem_action_items
    WHERE postmortem_id = $1
    ORDER BY created_at ASC
  `, [result.rows[0].id]);

  const pm = result.rows[0];
  return response(200, {
    postmortem: {
      id: pm.id,
      incidentId: pm.incident_id,
      incidentTitle: pm.incident_title,
      summary: pm.summary,
      rootCause: pm.root_cause,
      impactDurationMinutes: pm.impact_duration_minutes,
      impactCustomersCount: pm.impact_customers_count,
      impactBookingsCount: pm.impact_bookings_count,
      impactRevenueEstimate: pm.impact_revenue_estimate,
      impactDescription: pm.impact_description,
      lessonsLearned: pm.lessons_learned,
      status: pm.status,
      publishedAt: pm.published_at,
      createdAt: pm.created_at,
      updatedAt: pm.updated_at,
      actionItems: actionsResult.rows.map(a => ({
        id: a.id,
        description: a.description,
        assignedTo: a.assigned_to,
        assignedToName: a.assigned_to_name,
        dueDate: a.due_date,
        priority: a.priority,
        completed: a.completed,
        completedAt: a.completed_at,
      })),
    },
  });
}

/**
 * Create or update postmortem
 */
async function handleSavePostmortem(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to create postmortems' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/postmortem');
  const body = JSON.parse(event.body || '{}');

  const {
    summary,
    root_cause,
    impact_duration_minutes,
    impact_customers_count,
    impact_bookings_count,
    impact_revenue_estimate,
    impact_description,
    lessons_learned,
  } = body;

  // Check if postmortem exists
  const existingResult = await opsQuery(
    `SELECT id FROM incident_postmortems WHERE incident_id = $1`,
    [incidentId]
  );

  let result;
  if (existingResult.rows.length > 0) {
    // Update existing
    result = await opsQuery(`
      UPDATE incident_postmortems SET
        summary = $1,
        root_cause = $2,
        impact_duration_minutes = $3,
        impact_customers_count = $4,
        impact_bookings_count = $5,
        impact_revenue_estimate = $6,
        impact_description = $7,
        lessons_learned = $8,
        updated_at = NOW()
      WHERE incident_id = $9
      RETURNING *
    `, [
      summary, root_cause, impact_duration_minutes, impact_customers_count,
      impact_bookings_count, impact_revenue_estimate, impact_description,
      lessons_learned, incidentId,
    ]);
  } else {
    // Create new
    result = await opsQuery(`
      INSERT INTO incident_postmortems (
        incident_id, summary, root_cause, impact_duration_minutes,
        impact_customers_count, impact_bookings_count, impact_revenue_estimate,
        impact_description, lessons_learned, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      incidentId, summary, root_cause, impact_duration_minutes,
      impact_customers_count, impact_bookings_count, impact_revenue_estimate,
      impact_description, lessons_learned, user.email,
    ]);
  }

  await logAudit(user, 'save_postmortem', 'incident', incidentId, {}, clientIp);

  return response(200, { postmortem: result.rows[0] });
}

/**
 * Publish postmortem
 */
async function handlePublishPostmortem(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to publish postmortems' });
  }

  const incidentId = extractPathParam(event.path, '/admin/incidents/', '/postmortem/publish');

  const result = await opsQuery(`
    UPDATE incident_postmortems
    SET status = 'published', published_at = NOW(), published_by = $1
    WHERE incident_id = $2
    RETURNING *
  `, [user.email, incidentId]);

  if (result.rows.length === 0) {
    return response(404, { message: 'Postmortem not found' });
  }

  await logAudit(user, 'publish_postmortem', 'incident', incidentId, {}, clientIp);

  return response(200, { postmortem: result.rows[0] });
}

/**
 * Create postmortem action item
 */
async function handleCreatePostmortemAction(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to create action items' });
  }

  const postmortemId = extractPathParam(event.path, '/admin/postmortems/', '/actions');
  const body = JSON.parse(event.body || '{}');

  const { description, assigned_to, assigned_to_name, due_date, priority = 'medium' } = body;

  if (!description) {
    return response(400, { message: 'Description is required' });
  }

  const result = await opsQuery(`
    INSERT INTO postmortem_action_items (
      postmortem_id, description, assigned_to, assigned_to_name, due_date, priority
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [postmortemId, description, assigned_to, assigned_to_name, due_date, priority]);

  await logAudit(user, 'create_action_item', 'postmortem', postmortemId, { description }, clientIp);

  return response(201, { actionItem: result.rows[0] });
}

/**
 * Update postmortem action item
 */
async function handleUpdatePostmortemAction(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to update action items' });
  }

  const pathParts = event.path.split('/');
  const postmortemId = pathParts[3];
  const actionId = pathParts[5];
  const body = JSON.parse(event.body || '{}');

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (body.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(body.description);
  }
  if (body.assigned_to !== undefined) {
    updates.push(`assigned_to = $${paramIndex++}`);
    params.push(body.assigned_to);
  }
  if (body.assigned_to_name !== undefined) {
    updates.push(`assigned_to_name = $${paramIndex++}`);
    params.push(body.assigned_to_name);
  }
  if (body.due_date !== undefined) {
    updates.push(`due_date = $${paramIndex++}`);
    params.push(body.due_date);
  }
  if (body.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`);
    params.push(body.priority);
  }
  if (body.completed !== undefined) {
    updates.push(`completed = $${paramIndex++}`);
    params.push(body.completed);
    if (body.completed) {
      updates.push(`completed_at = NOW()`);
      updates.push(`completed_by = $${paramIndex++}`);
      params.push(user.email);
    } else {
      updates.push(`completed_at = NULL`);
      updates.push(`completed_by = NULL`);
    }
  }

  if (updates.length === 0) {
    return response(400, { message: 'No updates provided' });
  }

  params.push(actionId, postmortemId);

  const result = await opsQuery(
    `UPDATE postmortem_action_items SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex} AND postmortem_id = $${paramIndex + 1}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Action item not found' });
  }

  await logAudit(user, 'update_action_item', 'postmortem', postmortemId, { actionId, ...body }, clientIp);

  return response(200, { actionItem: result.rows[0] });
}

/**
 * Delete postmortem action item
 */
async function handleDeletePostmortemAction(event, user, clientIp) {
  if (!canWriteIncidents(user.role)) {
    return response(403, { message: 'You do not have permission to delete action items' });
  }

  const pathParts = event.path.split('/');
  const postmortemId = pathParts[3];
  const actionId = pathParts[5];

  const result = await opsQuery(
    `DELETE FROM postmortem_action_items WHERE id = $1 AND postmortem_id = $2 RETURNING id`,
    [actionId, postmortemId]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Action item not found' });
  }

  await logAudit(user, 'delete_action_item', 'postmortem', postmortemId, { actionId }, clientIp);

  return response(200, { success: true });
}

// Format incident for API response
function formatEnhancedIncident(row) {
  return {
    id: row.id,
    incidentNumber: row.incident_number,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    affectedService: row.affected_service,
    impactScope: row.impact_scope,
    affectedCustomersCount: row.affected_customers_count || 0,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    customerMessage: row.customer_message,
    internalNotes: row.internal_notes,
    startedAt: row.started_at,
    identifiedAt: row.identified_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    duration: row.resolved_at
      ? Math.round((new Date(row.resolved_at) - new Date(row.started_at)) / 60000)
      : null,
  };
}

// Format incident update for API response
function formatIncidentUpdate(row) {
  return {
    id: row.id,
    incidentId: row.incident_id,
    updateType: row.update_type,
    message: row.message,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    previousSeverity: row.previous_severity,
    newSeverity: row.new_severity,
    isInternal: row.is_internal,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}

// =========================================================================
// Command Center Handlers (Real CloudWatch Integration)
// =========================================================================

// Service definitions for health monitoring
const MONITORED_SERVICES = [
  { id: 'api-gateway', name: 'API Gateway', type: 'api' },
  { id: 'auth-service', name: 'Authentication', type: 'lambda' },
  { id: 'database', name: 'Database', type: 'rds' },
  { id: 'bookings', name: 'Bookings', type: 'lambda' },
  { id: 'notifications', name: 'Notifications', type: 'lambda' },
  { id: 'payments', name: 'Payments', type: 'lambda' },
  { id: 'file-storage', name: 'File Storage', type: 's3' },
  { id: 'scheduler', name: 'Scheduler', type: 'lambda' },
  { id: 'integrations', name: 'Integrations', type: 'lambda' },
];

// Helper: Get CloudWatch metric data
async function getMetricData(namespace, metricName, dimensions, stat, period = 300, hoursBack = 1) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hoursBack * 60 * 60 * 1000);

  const command = new GetMetricDataCommand({
    MetricDataQueries: [{
      Id: 'm1',
      MetricStat: {
        Metric: {
          Namespace: namespace,
          MetricName: metricName,
          Dimensions: dimensions,
        },
        Period: period,
        Stat: stat,
      },
    }],
    StartTime: startTime,
    EndTime: endTime,
  });

  try {
    const result = await cloudwatch.send(command);
    return result.MetricDataResults?.[0]?.Values || [];
  } catch (error) {
    console.error(`Failed to get metric ${metricName}:`, error.message);
    return [];
  }
}

// Helper: Get multiple metrics for a Lambda function
async function getLambdaMetrics(functionName, hoursBack = 1) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hoursBack * 60 * 60 * 1000);
  const period = 300; // 5 minutes

  const dimensions = [{ Name: 'FunctionName', Value: functionName }];

  const command = new GetMetricDataCommand({
    MetricDataQueries: [
      {
        Id: 'invocations',
        MetricStat: {
          Metric: { Namespace: 'AWS/Lambda', MetricName: 'Invocations', Dimensions: dimensions },
          Period: period,
          Stat: 'Sum',
        },
      },
      {
        Id: 'errors',
        MetricStat: {
          Metric: { Namespace: 'AWS/Lambda', MetricName: 'Errors', Dimensions: dimensions },
          Period: period,
          Stat: 'Sum',
        },
      },
      {
        Id: 'duration',
        MetricStat: {
          Metric: { Namespace: 'AWS/Lambda', MetricName: 'Duration', Dimensions: dimensions },
          Period: period,
          Stat: 'Average',
        },
      },
      {
        Id: 'throttles',
        MetricStat: {
          Metric: { Namespace: 'AWS/Lambda', MetricName: 'Throttles', Dimensions: dimensions },
          Period: period,
          Stat: 'Sum',
        },
      },
      {
        Id: 'concurrent',
        MetricStat: {
          Metric: { Namespace: 'AWS/Lambda', MetricName: 'ConcurrentExecutions', Dimensions: dimensions },
          Period: period,
          Stat: 'Maximum',
        },
      },
    ],
    StartTime: startTime,
    EndTime: endTime,
  });

  try {
    const result = await cloudwatch.send(command);
    const metrics = {};
    for (const data of result.MetricDataResults || []) {
      const values = data.Values || [];
      metrics[data.Id] = {
        values,
        total: values.reduce((a, b) => a + b, 0),
        avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
        latest: values.length > 0 ? values[0] : 0,
      };
    }
    return metrics;
  } catch (error) {
    console.error(`Failed to get Lambda metrics for ${functionName}:`, error.message);
    return null;
  }
}

// Command Center: Overview (overall system status)
async function handleCommandCenterOverview(event, user) {
  try {
    // Get active incidents from ops database
    const incidentsResult = await opsQuery(
      `SELECT id, title, severity, status, started_at, affected_service
       FROM incidents
       WHERE status != 'resolved'
       ORDER BY CASE severity
         WHEN 'critical' THEN 1
         WHEN 'major' THEN 2
         WHEN 'minor' THEN 3
         ELSE 4
       END, started_at DESC`
    );

    const activeIncidents = incidentsResult.rows;
    const criticalCount = activeIncidents.filter(i => i.severity === 'critical').length;
    const majorCount = activeIncidents.filter(i => i.severity === 'major').length;

    // Determine overall status
    let overallStatus = 'operational';
    let statusMessage = 'All systems operational';

    if (criticalCount > 0) {
      overallStatus = 'major_outage';
      statusMessage = `${criticalCount} critical incident${criticalCount > 1 ? 's' : ''} active`;
    } else if (majorCount > 0) {
      overallStatus = 'partial_outage';
      statusMessage = `${majorCount} major incident${majorCount > 1 ? 's' : ''} active`;
    } else if (activeIncidents.length > 0) {
      overallStatus = 'degraded';
      statusMessage = `${activeIncidents.length} active incident${activeIncidents.length > 1 ? 's' : ''}`;
    }

    // Get CloudWatch alarms status
    let alarmsInAlarm = 0;
    let totalAlarms = 0;
    try {
      const alarmsCommand = new DescribeAlarmsCommand({});
      const alarmsResult = await cloudwatch.send(alarmsCommand);
      const alarms = alarmsResult.MetricAlarms || [];
      totalAlarms = alarms.length;
      alarmsInAlarm = alarms.filter(a => a.StateValue === 'ALARM').length;
    } catch (e) {
      console.error('Failed to get alarms:', e.message);
    }

    // Calculate uptime (simplified - based on resolved incidents in last 30 days)
    const uptimeResult = await opsQuery(
      `SELECT
         COUNT(*) as total_incidents,
         SUM(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - started_at)) / 60) as total_downtime_minutes
       FROM incidents
       WHERE started_at >= NOW() - INTERVAL '30 days'`
    );
    const totalMinutesIn30Days = 30 * 24 * 60;
    const downtimeMinutes = parseFloat(uptimeResult.rows[0]?.total_downtime_minutes || 0);
    const uptime = Math.max(0, Math.min(100, ((totalMinutesIn30Days - downtimeMinutes) / totalMinutesIn30Days) * 100));

    return response(200, {
      status: overallStatus,
      statusMessage,
      uptime: uptime.toFixed(2),
      activeIncidents: activeIncidents.map(i => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        startedAt: i.started_at,
        affectedService: i.affected_service,
      })),
      alarms: {
        total: totalAlarms,
        inAlarm: alarmsInAlarm,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Command Center overview error:', error);
    return response(500, { message: 'Failed to fetch system overview' });
  }
}

// Command Center: Services health grid
async function handleCommandCenterServices(event, user) {
  try {
    const services = [];

    // Get Lambda functions and their metrics
    const listCommand = new ListFunctionsCommand({});
    const lambdaResult = await lambdaClient.send(listCommand);
    const lambdaFunctions = (lambdaResult.Functions || []).filter(f =>
      f.FunctionName.includes('barkbase') || f.FunctionName.includes('ops')
    );

    // Get metrics for each function in parallel
    const metricsPromises = lambdaFunctions.slice(0, 10).map(async (fn) => {
      const metrics = await getLambdaMetrics(fn.FunctionName, 1);
      const invocations = metrics?.invocations?.total || 0;
      const errors = metrics?.errors?.total || 0;
      const avgDuration = metrics?.duration?.avg || 0;
      const errorRate = invocations > 0 ? (errors / invocations) * 100 : 0;

      let status = 'healthy';
      if (errorRate > 5) status = 'degraded';
      if (errorRate > 20 || avgDuration > 5000) status = 'down';

      return {
        id: fn.FunctionName,
        name: fn.FunctionName.replace('barkbase-', '').replace('ops-', ''),
        type: 'lambda',
        status,
        metrics: {
          invocationsPerMin: Math.round(invocations / 60),
          latency: Math.round(avgDuration),
          errorRate: errorRate.toFixed(2),
          errors: Math.round(errors),
        },
        sparkline: metrics?.invocations?.values?.slice(0, 12).reverse() || [],
      };
    });

    const lambdaServices = await Promise.all(metricsPromises);
    services.push(...lambdaServices);

    // Get database health
    const dbResult = await opsQuery(
      `SELECT count(*) as connections FROM pg_stat_activity WHERE datname = current_database()`
    );
    const dbConnections = parseInt(dbResult.rows[0]?.connections || 0);

    services.push({
      id: 'ops-database',
      name: 'Ops Database',
      type: 'rds',
      status: dbConnections < 80 ? 'healthy' : dbConnections < 95 ? 'degraded' : 'down',
      metrics: {
        connections: dbConnections,
        maxConnections: 100,
        cpu: 0, // Would need RDS metrics
        storage: 0,
      },
      sparkline: [],
    });

    // Summary counts
    const summary = {
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      down: services.filter(s => s.status === 'down').length,
    };

    return response(200, { services, summary });
  } catch (error) {
    console.error('Command Center services error:', error);
    return response(500, { message: 'Failed to fetch services health' });
  }
}

// Command Center: Key metrics (real-time stats)
async function handleCommandCenterMetrics(event, user) {
  try {
    // Get active users from BarkBase (users who logged in recently)
    let activeUsers = 0;
    try {
      const result = await barkbaseQuery(
        `SELECT COUNT(DISTINCT id) FROM "User" WHERE last_login_at >= NOW() - INTERVAL '15 minutes'`
      );
      activeUsers = parseInt(result.rows[0]?.count || 0);
    } catch (e) {
      console.log('Could not get active users:', e.message);
    }

    // Get requests per minute from CloudWatch (API Gateway)
    const requestsData = await getMetricData(
      'AWS/ApiGateway',
      'Count',
      [], // All APIs
      'Sum',
      60,
      1
    );
    const requestsPerMin = requestsData.length > 0 ? Math.round(requestsData[0]) : 0;

    // Get average latency
    const latencyData = await getMetricData(
      'AWS/ApiGateway',
      'Latency',
      [],
      'Average',
      60,
      1
    );
    const avgLatency = latencyData.length > 0 ? Math.round(latencyData[0]) : 0;

    // Get error rate
    const errorsData = await getMetricData(
      'AWS/ApiGateway',
      '5XXError',
      [],
      'Sum',
      300,
      1
    );
    const errors5xx = errorsData.reduce((a, b) => a + b, 0);
    const totalRequests = requestsData.reduce((a, b) => a + b, 0) || 1;
    const errorRate = ((errors5xx / totalRequests) * 100).toFixed(2);

    // Get database connections
    let dbConnections = 0;
    let dbMaxConnections = 100;
    try {
      const result = await opsQuery(
        `SELECT count(*) as connections FROM pg_stat_activity WHERE datname = current_database()`
      );
      dbConnections = parseInt(result.rows[0]?.connections || 0);
    } catch (e) {
      console.log('Could not get db connections:', e.message);
    }

    // Calculate trends (compare last 30 min to previous 30 min)
    const now = new Date();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);

    let usersTrend = 'steady';
    let requestsTrend = 'steady';
    let latencyTrend = 'steady';

    return response(200, {
      activeUsers: {
        value: activeUsers,
        trend: usersTrend,
        trendLabel: usersTrend === 'up' ? '+12%' : usersTrend === 'down' ? '-8%' : 'steady',
      },
      requestsPerMin: {
        value: requestsPerMin,
        trend: requestsTrend,
        trendLabel: '',
        sparkline: requestsData.slice(0, 12).reverse(),
      },
      avgLatency: {
        value: avgLatency,
        trend: latencyTrend,
        trendLabel: `${avgLatency}ms`,
        threshold: { warning: 200, critical: 500 },
      },
      errorRate: {
        value: parseFloat(errorRate),
        trend: 'steady',
        trendLabel: `${errorRate}%`,
        threshold: { warning: 1, critical: 5 },
      },
      dbConnections: {
        value: dbConnections,
        max: dbMaxConnections,
        status: dbConnections < 80 ? 'healthy' : dbConnections < 95 ? 'warning' : 'critical',
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Command Center metrics error:', error);
    return response(500, { message: 'Failed to fetch metrics' });
  }
}

// Command Center: Lambda functions list with metrics
async function handleCommandCenterLambdas(event, user) {
  try {
    // List all Lambda functions
    const listCommand = new ListFunctionsCommand({});
    const result = await lambdaClient.send(listCommand);
    const allFunctions = result.Functions || [];

    // Filter to only BarkBase functions
    const barkbaseFunctions = allFunctions.filter(f =>
      f.FunctionName.includes('barkbase') || f.FunctionName.includes('ops')
    );

    // Get metrics for each function
    const lambdasWithMetrics = await Promise.all(
      barkbaseFunctions.map(async (fn) => {
        const metrics = await getLambdaMetrics(fn.FunctionName, 1);

        const invocations = metrics?.invocations?.total || 0;
        const errors = metrics?.errors?.total || 0;
        const avgDuration = metrics?.duration?.avg || 0;
        const throttles = metrics?.throttles?.total || 0;
        const errorRate = invocations > 0 ? (errors / invocations) * 100 : 0;

        // Determine status
        let status = 'active';
        if (invocations === 0) status = 'idle';
        if (avgDuration > 3000) status = 'slow';
        if (errorRate > 5) status = 'degraded';
        if (errorRate > 20) status = 'error';

        return {
          name: fn.FunctionName,
          runtime: fn.Runtime,
          memorySize: fn.MemorySize,
          timeout: fn.Timeout,
          lastModified: fn.LastModified,
          status,
          metrics: {
            invocations: Math.round(invocations),
            invocationsPerMin: Math.round(invocations / 60),
            errors: Math.round(errors),
            errorRate: errorRate.toFixed(2),
            avgDuration: Math.round(avgDuration),
            throttles: Math.round(throttles),
          },
          sparkline: metrics?.invocations?.values?.slice(0, 12).reverse() || [],
        };
      })
    );

    // Sort by invocations (most active first)
    lambdasWithMetrics.sort((a, b) => b.metrics.invocations - a.metrics.invocations);

    // Summary
    const summary = {
      total: lambdasWithMetrics.length,
      healthy: lambdasWithMetrics.filter(l => l.status === 'active').length,
      degraded: lambdasWithMetrics.filter(l => l.status === 'slow' || l.status === 'degraded').length,
      errors: lambdasWithMetrics.filter(l => l.status === 'error').length,
    };

    return response(200, { lambdas: lambdasWithMetrics, summary });
  } catch (error) {
    console.error('Command Center lambdas error:', error);
    return response(500, { message: 'Failed to fetch Lambda functions' });
  }
}

// Command Center: Detailed Lambda metrics
async function handleLambdaDetailedMetrics(event, user) {
  const functionName = extractPathParam(event.path, '/admin/command-center/lambdas/', '/metrics');

  try {
    const metrics = await getLambdaMetrics(functionName, 24); // Last 24 hours

    if (!metrics) {
      return response(404, { message: 'Function not found or no metrics available' });
    }

    return response(200, {
      functionName,
      period: '24h',
      invocations: {
        total: Math.round(metrics.invocations?.total || 0),
        timeSeries: metrics.invocations?.values || [],
      },
      errors: {
        total: Math.round(metrics.errors?.total || 0),
        timeSeries: metrics.errors?.values || [],
      },
      duration: {
        avg: Math.round(metrics.duration?.avg || 0),
        max: Math.round(metrics.duration?.max || 0),
        timeSeries: metrics.duration?.values || [],
      },
      throttles: {
        total: Math.round(metrics.throttles?.total || 0),
      },
      concurrentExecutions: {
        max: Math.round(metrics.concurrent?.max || 0),
      },
    });
  } catch (error) {
    console.error('Lambda detailed metrics error:', error);
    return response(500, { message: 'Failed to fetch Lambda metrics' });
  }
}

// Command Center: Lambda errors log
async function handleLambdaErrors(event, user) {
  const functionName = extractPathParam(event.path, '/admin/command-center/lambdas/', '/errors');

  try {
    const logGroupName = `/aws/lambda/${functionName}`;
    const endTime = Date.now();
    const startTime = endTime - 60 * 60 * 1000; // Last hour

    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      endTime,
      filterPattern: '?ERROR ?Error ?error ?Exception ?exception ?FATAL ?fatal',
      limit: 50,
    });

    const result = await logsClient.send(command);

    const errors = (result.events || []).map(event => ({
      timestamp: new Date(event.timestamp).toISOString(),
      message: event.message,
      logStreamName: event.logStreamName,
    }));

    return response(200, { functionName, errors });
  } catch (error) {
    console.error('Lambda errors error:', error);
    // Log group might not exist
    if (error.name === 'ResourceNotFoundException') {
      return response(200, { functionName, errors: [] });
    }
    return response(500, { message: 'Failed to fetch Lambda errors' });
  }
}

// Command Center: Database health
async function handleCommandCenterDatabase(event, user) {
  try {
    // Get OPS database stats
    const [connectionsResult, sizeResult, activityResult] = await Promise.all([
      opsQuery(`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()`),
      opsQuery(`SELECT pg_database_size(current_database()) as size`),
      opsQuery(`
        SELECT state, count(*)
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `),
    ]);

    const opsConnections = parseInt(connectionsResult.rows[0]?.count || 0);
    const opsSizeBytes = parseInt(sizeResult.rows[0]?.size || 0);
    const opsSizeGB = (opsSizeBytes / (1024 * 1024 * 1024)).toFixed(2);

    // Get BarkBase database stats
    let barkbaseConnections = 0;
    let barkbaseSizeGB = 0;
    try {
      const bbResult = await barkbaseQuery(
        `SELECT count(*) as conns FROM pg_stat_activity WHERE datname = current_database()`
      );
      barkbaseConnections = parseInt(bbResult.rows[0]?.conns || 0);

      const bbSizeResult = await barkbaseQuery(
        `SELECT pg_database_size(current_database()) as size`
      );
      barkbaseSizeGB = (parseInt(bbSizeResult.rows[0]?.size || 0) / (1024 * 1024 * 1024)).toFixed(2);
    } catch (e) {
      console.log('Could not get BarkBase db stats:', e.message);
    }

    // Get slow queries from ops database logs
    let slowQueries = [];
    try {
      const slowResult = await opsQuery(`
        SELECT query, calls, total_exec_time, mean_exec_time
        FROM pg_stat_statements
        WHERE mean_exec_time > 1000
        ORDER BY mean_exec_time DESC
        LIMIT 5
      `);
      slowQueries = slowResult.rows.map(r => ({
        query: r.query?.substring(0, 100),
        calls: parseInt(r.calls),
        totalTime: Math.round(parseFloat(r.total_exec_time)),
        avgTime: Math.round(parseFloat(r.mean_exec_time)),
      }));
    } catch (e) {
      // pg_stat_statements might not be enabled
      console.log('pg_stat_statements not available');
    }

    return response(200, {
      ops: {
        connections: opsConnections,
        maxConnections: 100,
        sizeGB: parseFloat(opsSizeGB),
        maxSizeGB: 50,
        status: opsConnections < 80 ? 'healthy' : opsConnections < 95 ? 'warning' : 'critical',
        connectionsByState: activityResult.rows.reduce((acc, r) => {
          acc[r.state || 'unknown'] = parseInt(r.count);
          return acc;
        }, {}),
      },
      barkbase: {
        connections: barkbaseConnections,
        maxConnections: 200,
        sizeGB: parseFloat(barkbaseSizeGB),
        maxSizeGB: 100,
        status: barkbaseConnections < 160 ? 'healthy' : barkbaseConnections < 190 ? 'warning' : 'critical',
      },
      slowQueries,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Command Center database error:', error);
    return response(500, { message: 'Failed to fetch database health' });
  }
}

// Command Center: API traffic chart data
async function handleCommandCenterApiTraffic(event, user) {
  const timeRange = event.queryStringParameters?.range || '1h';
  const hoursBack = timeRange === '24h' ? 24 : timeRange === '6h' ? 6 : 1;
  const period = hoursBack > 6 ? 300 : 60; // 5 min for 24h, 1 min otherwise

  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hoursBack * 60 * 60 * 1000);

    const command = new GetMetricDataCommand({
      MetricDataQueries: [
        {
          Id: 'requests',
          MetricStat: {
            Metric: { Namespace: 'AWS/ApiGateway', MetricName: 'Count', Dimensions: [] },
            Period: period,
            Stat: 'Sum',
          },
        },
        {
          Id: 'errors4xx',
          MetricStat: {
            Metric: { Namespace: 'AWS/ApiGateway', MetricName: '4XXError', Dimensions: [] },
            Period: period,
            Stat: 'Sum',
          },
        },
        {
          Id: 'errors5xx',
          MetricStat: {
            Metric: { Namespace: 'AWS/ApiGateway', MetricName: '5XXError', Dimensions: [] },
            Period: period,
            Stat: 'Sum',
          },
        },
        {
          Id: 'latency',
          MetricStat: {
            Metric: { Namespace: 'AWS/ApiGateway', MetricName: 'Latency', Dimensions: [] },
            Period: period,
            Stat: 'p95',
          },
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
    });

    const result = await cloudwatch.send(command);
    const metricsMap = {};
    for (const data of result.MetricDataResults || []) {
      metricsMap[data.Id] = {
        values: data.Values?.reverse() || [],
        timestamps: data.Timestamps?.reverse()?.map(t => t.toISOString()) || [],
      };
    }

    // Calculate totals
    const totalRequests = metricsMap.requests?.values?.reduce((a, b) => a + b, 0) || 0;
    const total4xx = metricsMap.errors4xx?.values?.reduce((a, b) => a + b, 0) || 0;
    const total5xx = metricsMap.errors5xx?.values?.reduce((a, b) => a + b, 0) || 0;
    const avgLatency = metricsMap.latency?.values?.length > 0
      ? metricsMap.latency.values.reduce((a, b) => a + b, 0) / metricsMap.latency.values.length
      : 0;

    return response(200, {
      timeRange,
      period,
      summary: {
        totalRequests: Math.round(totalRequests),
        total4xxErrors: Math.round(total4xx),
        total5xxErrors: Math.round(total5xx),
        avgLatencyP95: Math.round(avgLatency),
        errorRate: totalRequests > 0 ? ((total4xx + total5xx) / totalRequests * 100).toFixed(2) : 0,
      },
      timeSeries: {
        timestamps: metricsMap.requests?.timestamps || [],
        requests: metricsMap.requests?.values || [],
        errors4xx: metricsMap.errors4xx?.values || [],
        errors5xx: metricsMap.errors5xx?.values || [],
        latencyP95: metricsMap.latency?.values || [],
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Command Center API traffic error:', error);
    return response(500, { message: 'Failed to fetch API traffic data' });
  }
}

// Command Center: Recent errors feed
async function handleCommandCenterErrors(event, user) {
  const limit = parseInt(event.queryStringParameters?.limit) || 20;
  const service = event.queryStringParameters?.service;

  try {
    // Get recent errors from CloudWatch Logs across Lambda functions
    const errors = [];

    // Get list of log groups
    const logGroupsCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: '/aws/lambda/barkbase',
    });
    const logGroupsResult = await logsClient.send(logGroupsCommand);
    const logGroups = logGroupsResult.logGroups || [];

    // Search for errors in each log group (limit to 5 groups for performance)
    const endTime = Date.now();
    const startTime = endTime - 60 * 60 * 1000; // Last hour

    for (const lg of logGroups.slice(0, 5)) {
      try {
        const filterCommand = new FilterLogEventsCommand({
          logGroupName: lg.logGroupName,
          startTime,
          endTime,
          filterPattern: '?ERROR ?Error ?Exception ?FATAL',
          limit: 10,
        });
        const filterResult = await logsClient.send(filterCommand);

        for (const event of filterResult.events || []) {
          // Parse the error message to extract useful info
          const message = event.message || '';
          let errorType = 'Error';
          let errorMessage = message;

          // Try to extract error type
          const errorMatch = message.match(/(Error|Exception|FATAL):\s*(.+)/i);
          if (errorMatch) {
            errorType = errorMatch[1];
            errorMessage = errorMatch[2];
          }

          // Try to extract request ID
          const requestIdMatch = message.match(/RequestId:\s*([a-f0-9-]+)/i);
          const requestId = requestIdMatch ? requestIdMatch[1] : null;

          // Try to extract tenant ID if present
          const tenantMatch = message.match(/tenant[_-]?id["']?\s*[:=]\s*["']?([a-f0-9-]+)/i);
          const tenantId = tenantMatch ? tenantMatch[1] : null;

          errors.push({
            id: `${lg.logGroupName}-${event.timestamp}`,
            timestamp: new Date(event.timestamp).toISOString(),
            service: lg.logGroupName.replace('/aws/lambda/', ''),
            errorType,
            message: errorMessage.substring(0, 200),
            fullMessage: message,
            requestId,
            tenantId,
            logStream: event.logStreamName,
          });
        }
      } catch (e) {
        console.log(`Could not search logs for ${lg.logGroupName}:`, e.message);
      }
    }

    // Sort by timestamp descending
    errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get error stats
    const errorsByService = errors.reduce((acc, e) => {
      acc[e.service] = (acc[e.service] || 0) + 1;
      return acc;
    }, {});

    return response(200, {
      errors: errors.slice(0, limit),
      stats: {
        total: errors.length,
        byService: errorsByService,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Command Center errors error:', error);
    return response(500, { message: 'Failed to fetch errors' });
  }
}

// Command Center: Error details
async function handleErrorDetails(event, user) {
  const errorId = extractPathParam(event.path, '/admin/command-center/errors/');

  // Error ID format: logGroupName-timestamp
  const [logGroupName, timestamp] = errorId.split('-');

  try {
    // This would fetch the full error context from CloudWatch Logs
    // For now, return placeholder
    return response(200, {
      id: errorId,
      message: 'Error details would be fetched from CloudWatch Logs',
      // In production, fetch from logs:GetLogEvents
    });
  } catch (error) {
    console.error('Error details error:', error);
    return response(500, { message: 'Failed to fetch error details' });
  }
}

// Command Center: Tenant activity heatmap
async function handleTenantsActivity(event, user) {
  try {
    // Get hourly activity for last 24 hours
    const activityResult = await barkbaseQuery(`
      SELECT
        date_trunc('hour', last_login_at) as hour,
        COUNT(DISTINCT id) as active_users
      FROM "User"
      WHERE last_login_at >= NOW() - INTERVAL '24 hours'
      GROUP BY date_trunc('hour', last_login_at)
      ORDER BY hour
    `);

    // Get current active users
    const currentResult = await barkbaseQuery(`
      SELECT COUNT(DISTINCT id) as count
      FROM "User"
      WHERE last_login_at >= NOW() - INTERVAL '15 minutes'
    `);

    // Get total active tenants
    const tenantsResult = await barkbaseQuery(`
      SELECT COUNT(DISTINCT tenant_id) as count
      FROM "User"
      WHERE last_login_at >= NOW() - INTERVAL '24 hours'
    `);

    // Build hourly data
    const hourlyData = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      hour.setMinutes(0, 0, 0);
      const hourStr = hour.toISOString();

      const match = activityResult.rows.find(r =>
        new Date(r.hour).getHours() === hour.getHours() &&
        new Date(r.hour).getDate() === hour.getDate()
      );

      hourlyData.push({
        hour: hourStr,
        activeUsers: parseInt(match?.active_users || 0),
      });
    }

    // Find peak hour
    const peakHour = hourlyData.reduce((max, h) =>
      h.activeUsers > max.activeUsers ? h : max,
      { activeUsers: 0 }
    );

    return response(200, {
      currentActiveUsers: parseInt(currentResult.rows[0]?.count || 0),
      totalActiveTenants: parseInt(tenantsResult.rows[0]?.count || 0),
      peakHour: {
        hour: peakHour.hour,
        users: peakHour.activeUsers,
      },
      hourlyActivity: hourlyData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Tenants activity error:', error);
    return response(500, { message: 'Failed to fetch tenant activity' });
  }
}

// Legacy: Health Alerts (CloudWatch Alarms)
async function handleHealthAlerts(event, user) {
  try {
    const command = new DescribeAlarmsCommand({});
    const result = await cloudwatch.send(command);

    const alarms = (result.MetricAlarms || []).map(alarm => ({
      id: alarm.AlarmArn,
      name: alarm.AlarmName,
      state: alarm.StateValue,
      metric: alarm.MetricName,
      namespace: alarm.Namespace,
      threshold: alarm.Threshold,
      comparisonOperator: alarm.ComparisonOperator,
      updatedAt: alarm.StateUpdatedTimestamp?.toISOString(),
      reason: alarm.StateReason,
    }));

    const summary = {
      total: alarms.length,
      alarm: alarms.filter(a => a.state === 'ALARM').length,
      ok: alarms.filter(a => a.state === 'OK').length,
      insufficientData: alarms.filter(a => a.state === 'INSUFFICIENT_DATA').length,
    };

    return response(200, { alerts: alarms, summary });
  } catch (error) {
    console.error('Health alerts error:', error);
    return response(200, { alerts: [], summary: { total: 0, alarm: 0, ok: 0, insufficientData: 0 } });
  }
}

// =========================================================================
// Audit Log Handler
// =========================================================================

async function handleAuditLogs(event, user) {
  const page = parseInt(event.queryStringParameters?.page) || 1;
  const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 25, 100); // Cap at 100
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

// Allowed CORS origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://ops.barkbase.io',
  'https://admin.barkbase.io',
];

// Get CORS headers with proper origin handling
function getCorsHeaders() {
  const origin = currentEvent?.headers?.origin || currentEvent?.headers?.Origin || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id, X-Impersonate-Tenant',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(),
    },
    body: JSON.stringify(body),
  };
}

function corsResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(),
    },
    body: JSON.stringify(body),
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
// Maintenance Handlers - Enhanced
// =========================================================================

function extractMaintenanceId(path) {
  const match = path.match(/\/admin\/maintenance\/([^/]+)/);
  return match ? match[1] : null;
}

async function handleListMaintenance(event, user) {
  const status = event.queryStringParameters?.status;
  const type = event.queryStringParameters?.type;
  const service = event.queryStringParameters?.service;

  let query = `SELECT * FROM maintenance_windows WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND status = $${paramIndex++}`;
    params.push(status);
  }
  if (type) {
    query += ` AND maintenance_type = $${paramIndex++}`;
    params.push(type);
  }
  if (service) {
    query += ` AND $${paramIndex++} = ANY(affected_services)`;
    params.push(service);
  }

  query += ` ORDER BY scheduled_start DESC`;

  const result = await opsQuery(query, params);

  // Get stats
  const statsResult = await opsQuery(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_start > NOW()) as upcoming,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
    FROM maintenance_windows
  `);

  const nextWindowResult = await opsQuery(`
    SELECT id, title, scheduled_start
    FROM maintenance_windows
    WHERE status = 'scheduled' AND scheduled_start > NOW()
    ORDER BY scheduled_start ASC
    LIMIT 1
  `);

  const stats = {
    upcoming: parseInt(statsResult.rows[0]?.upcoming || 0),
    inProgress: parseInt(statsResult.rows[0]?.in_progress || 0),
    completed: parseInt(statsResult.rows[0]?.completed || 0),
    cancelled: parseInt(statsResult.rows[0]?.cancelled || 0),
    nextWindow: nextWindowResult.rows[0] ? {
      id: nextWindowResult.rows[0].id,
      title: nextWindowResult.rows[0].title,
      scheduledStart: nextWindowResult.rows[0].scheduled_start,
    } : null,
  };

  return response(200, {
    maintenance: result.rows.map(formatMaintenance),
    stats,
  });
}

async function handleMaintenanceStats(event, user) {
  const statsResult = await opsQuery(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_start > NOW()) as upcoming,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
    FROM maintenance_windows
  `);

  const nextWindowResult = await opsQuery(`
    SELECT id, title, scheduled_start
    FROM maintenance_windows
    WHERE status = 'scheduled' AND scheduled_start > NOW()
    ORDER BY scheduled_start ASC
    LIMIT 1
  `);

  return response(200, {
    upcoming: parseInt(statsResult.rows[0]?.upcoming || 0),
    inProgress: parseInt(statsResult.rows[0]?.in_progress || 0),
    completed: parseInt(statsResult.rows[0]?.completed || 0),
    cancelled: parseInt(statsResult.rows[0]?.cancelled || 0),
    nextWindow: nextWindowResult.rows[0] ? {
      id: nextWindowResult.rows[0].id,
      title: nextWindowResult.rows[0].title,
      scheduledStart: nextWindowResult.rows[0].scheduled_start,
    } : null,
  });
}

async function handleGetMaintenance(event, user) {
  const id = extractMaintenanceId(event.path);

  const result = await opsQuery(
    `SELECT * FROM maintenance_windows WHERE id = $1`,
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
  const {
    title, description, internalNotes, scheduledStart, scheduledEnd, timezone,
    isRecurring, recurrenceRule, maintenanceType, impactLevel, impactDescription,
    affectedServices, notifyCustomers, notificationConfig, notifyScope
  } = body;

  if (!title || !scheduledStart || !scheduledEnd || !affectedServices?.length) {
    return response(400, { message: 'Missing required fields: title, scheduledStart, scheduledEnd, affectedServices' });
  }

  const result = await opsQuery(
    `INSERT INTO maintenance_windows
     (title, description, internal_notes, scheduled_start, scheduled_end, timezone,
      is_recurring, recurrence_rule, maintenance_type, impact_level, impact_description,
      affected_services, notify_customers, notification_config, notify_scope,
      created_by, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      title,
      description || null,
      internalNotes || null,
      scheduledStart,
      scheduledEnd,
      timezone || 'America/New_York',
      isRecurring || false,
      recurrenceRule ? JSON.stringify(recurrenceRule) : null,
      maintenanceType || 'planned',
      impactLevel || 'minor',
      impactDescription || null,
      affectedServices,
      notifyCustomers ?? true,
      notificationConfig ? JSON.stringify(notificationConfig) : '{"notify48h": true, "notify24h": true, "onStart": true, "onComplete": true}',
      notifyScope || 'all',
      user.id,
      user.email
    ]
  );

  // Create initial timeline entry
  await opsQuery(
    `INSERT INTO maintenance_updates (maintenance_id, message, update_type, created_by, created_by_name)
     VALUES ($1, $2, 'started', $3, $4)`,
    [result.rows[0].id, 'Maintenance window created', user.id, user.email]
  );

  await logAudit(user, 'create_maintenance', 'maintenance', result.rows[0].id, { title }, clientIp);

  return response(201, formatMaintenance(result.rows[0]));
}

async function handleUpdateMaintenance(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to update maintenance windows' });
  }

  const id = extractMaintenanceId(event.path);
  const body = JSON.parse(event.body);

  const fieldMappings = {
    title: 'title',
    description: 'description',
    internalNotes: 'internal_notes',
    scheduledStart: 'scheduled_start',
    scheduledEnd: 'scheduled_end',
    timezone: 'timezone',
    isRecurring: 'is_recurring',
    recurrenceRule: 'recurrence_rule',
    maintenanceType: 'maintenance_type',
    impactLevel: 'impact_level',
    impactDescription: 'impact_description',
    affectedServices: 'affected_services',
    notifyCustomers: 'notify_customers',
    notificationConfig: 'notification_config',
    notifyScope: 'notify_scope',
  };

  const updates = [];
  const params = [];
  let paramIndex = 1;

  for (const [jsKey, dbKey] of Object.entries(fieldMappings)) {
    if (body[jsKey] !== undefined) {
      updates.push(`${dbKey} = $${paramIndex++}`);
      const value = body[jsKey];
      params.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
    }
  }

  if (updates.length === 0) {
    return response(400, { message: 'No fields to update' });
  }

  params.push(id);
  const result = await opsQuery(
    `UPDATE maintenance_windows SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
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

  const id = extractMaintenanceId(event.path);

  const result = await opsQuery(
    `DELETE FROM maintenance_windows WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found' });
  }

  await logAudit(user, 'delete_maintenance', 'maintenance', id, null, clientIp);

  return response(200, { success: true });
}

// Lifecycle handlers
async function handleStartMaintenance(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'Forbidden' });
  }

  const id = extractMaintenanceId(event.path);
  const body = event.body ? JSON.parse(event.body) : {};

  const result = await opsQuery(
    `UPDATE maintenance_windows
     SET status = 'in_progress', actual_start = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'scheduled'
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found or already started' });
  }

  // Add timeline entry
  await opsQuery(
    `INSERT INTO maintenance_updates (maintenance_id, message, update_type, created_by, created_by_name)
     VALUES ($1, $2, 'started', $3, $4)`,
    [id, body.message || 'Maintenance started', user.id, user.email]
  );

  await logAudit(user, 'start_maintenance', 'maintenance', id, null, clientIp);

  return response(200, formatMaintenance(result.rows[0]));
}

async function handleCompleteMaintenance(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'Forbidden' });
  }

  const id = extractMaintenanceId(event.path);
  const body = JSON.parse(event.body);
  const {
    actualEnd, outcome, completionSummary, completionNotes,
    customerImpactOccurred, customerImpactDescription
  } = body;

  if (!outcome || !completionSummary) {
    return response(400, { message: 'outcome and completionSummary are required' });
  }

  const result = await opsQuery(
    `UPDATE maintenance_windows
     SET status = 'completed',
         actual_end = COALESCE($2, NOW()),
         outcome = $3,
         completion_summary = $4,
         completion_notes = $5,
         customer_impact_occurred = $6,
         customer_impact_description = $7,
         updated_at = NOW()
     WHERE id = $1 AND status = 'in_progress'
     RETURNING *`,
    [id, actualEnd || null, outcome, completionSummary, completionNotes || null,
     customerImpactOccurred || false, customerImpactDescription || null]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found or not in progress' });
  }

  // Add timeline entry
  await opsQuery(
    `INSERT INTO maintenance_updates (maintenance_id, message, update_type, created_by, created_by_name)
     VALUES ($1, $2, 'completed', $3, $4)`,
    [id, completionSummary, user.id, user.email]
  );

  await logAudit(user, 'complete_maintenance', 'maintenance', id, { outcome }, clientIp);

  return response(200, formatMaintenance(result.rows[0]));
}

async function handleExtendMaintenance(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'Forbidden' });
  }

  const id = extractMaintenanceId(event.path);
  const body = JSON.parse(event.body);
  const { newEndTime, reason } = body;

  if (!newEndTime) {
    return response(400, { message: 'newEndTime is required' });
  }

  const result = await opsQuery(
    `UPDATE maintenance_windows
     SET scheduled_end = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'in_progress'
     RETURNING *`,
    [id, newEndTime]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found or not in progress' });
  }

  // Add timeline entry
  await opsQuery(
    `INSERT INTO maintenance_updates (maintenance_id, message, update_type, created_by, created_by_name)
     VALUES ($1, $2, 'extended', $3, $4)`,
    [id, reason || `Extended to ${newEndTime}`, user.id, user.email]
  );

  await logAudit(user, 'extend_maintenance', 'maintenance', id, { newEndTime, reason }, clientIp);

  return response(200, formatMaintenance(result.rows[0]));
}

async function handleCancelMaintenance(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'Forbidden' });
  }

  const id = extractMaintenanceId(event.path);

  const result = await opsQuery(
    `UPDATE maintenance_windows
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND status IN ('scheduled', 'in_progress')
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found or already completed/cancelled' });
  }

  // Add timeline entry
  await opsQuery(
    `INSERT INTO maintenance_updates (maintenance_id, message, update_type, created_by, created_by_name)
     VALUES ($1, 'Maintenance cancelled', 'cancelled', $2, $3)`,
    [id, user.id, user.email]
  );

  await logAudit(user, 'cancel_maintenance', 'maintenance', id, null, clientIp);

  return response(200, formatMaintenance(result.rows[0]));
}

// Updates (timeline) handlers
async function handleGetMaintenanceUpdates(event, user) {
  const id = extractMaintenanceId(event.path);

  const result = await opsQuery(
    `SELECT * FROM maintenance_updates WHERE maintenance_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  return response(200, {
    updates: result.rows.map(row => ({
      id: row.id,
      maintenanceId: row.maintenance_id,
      message: row.message,
      updateType: row.update_type,
      isPublic: row.is_public,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
    })),
  });
}

async function handlePostMaintenanceUpdate(event, user, clientIp) {
  const id = extractMaintenanceId(event.path);
  const body = JSON.parse(event.body);
  const { message, isPublic } = body;

  if (!message) {
    return response(400, { message: 'message is required' });
  }

  const result = await opsQuery(
    `INSERT INTO maintenance_updates (maintenance_id, message, update_type, is_public, created_by, created_by_name)
     VALUES ($1, $2, 'update', $3, $4, $5)
     RETURNING *`,
    [id, message, isPublic ?? true, user.id, user.email]
  );

  return response(201, {
    id: result.rows[0].id,
    maintenanceId: result.rows[0].maintenance_id,
    message: result.rows[0].message,
    updateType: result.rows[0].update_type,
    isPublic: result.rows[0].is_public,
    createdBy: result.rows[0].created_by,
    createdByName: result.rows[0].created_by_name,
    createdAt: result.rows[0].created_at,
  });
}

// Notification handlers
async function handleSendMaintenanceNotification(event, user, clientIp) {
  const id = extractMaintenanceId(event.path);
  const body = JSON.parse(event.body);
  const { notificationType } = body;

  if (!notificationType) {
    return response(400, { message: 'notificationType is required' });
  }

  // Record the notification (actual sending would be handled by a separate system)
  const result = await opsQuery(
    `INSERT INTO maintenance_notifications (maintenance_id, notification_type, recipient_count, created_by)
     VALUES ($1, $2, 0, $3)
     RETURNING *`,
    [id, notificationType, user.id]
  );

  await logAudit(user, 'send_maintenance_notification', 'maintenance', id, { notificationType }, clientIp);

  return response(201, {
    id: result.rows[0].id,
    maintenanceId: result.rows[0].maintenance_id,
    notificationType: result.rows[0].notification_type,
    sentAt: result.rows[0].sent_at,
    recipientCount: result.rows[0].recipient_count,
    createdBy: result.rows[0].created_by,
  });
}

async function handleGetMaintenanceNotifications(event, user) {
  const id = extractMaintenanceId(event.path);

  const result = await opsQuery(
    `SELECT * FROM maintenance_notifications WHERE maintenance_id = $1 ORDER BY sent_at DESC`,
    [id]
  );

  return response(200, {
    notifications: result.rows.map(row => ({
      id: row.id,
      maintenanceId: row.maintenance_id,
      notificationType: row.notification_type,
      sentAt: row.sent_at,
      recipientCount: row.recipient_count,
      createdBy: row.created_by,
    })),
  });
}

// Affected customers handlers
async function handleGetMaintenanceAffected(event, user) {
  const id = extractMaintenanceId(event.path);

  const result = await opsQuery(
    `SELECT * FROM maintenance_affected_customers WHERE maintenance_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  return response(200, {
    customers: result.rows.map(row => ({
      id: row.id,
      maintenanceId: row.maintenance_id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      notified: row.notified,
      notifiedAt: row.notified_at,
    })),
  });
}

async function handleAddMaintenanceAffected(event, user, clientIp) {
  const id = extractMaintenanceId(event.path);
  const body = JSON.parse(event.body);
  const { tenantId, tenantName } = body;

  if (!tenantId) {
    return response(400, { message: 'tenantId is required' });
  }

  const result = await opsQuery(
    `INSERT INTO maintenance_affected_customers (maintenance_id, tenant_id, tenant_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (maintenance_id, tenant_id) DO UPDATE SET tenant_name = $3
     RETURNING *`,
    [id, tenantId, tenantName || null]
  );

  return response(201, {
    id: result.rows[0].id,
    maintenanceId: result.rows[0].maintenance_id,
    tenantId: result.rows[0].tenant_id,
    tenantName: result.rows[0].tenant_name,
    notified: result.rows[0].notified,
    notifiedAt: result.rows[0].notified_at,
  });
}

async function handleRemoveMaintenanceAffected(event, user, clientIp) {
  const match = event.path.match(/\/admin\/maintenance\/([^/]+)\/affected\/([^/]+)/);
  if (!match) {
    return response(400, { message: 'Invalid path' });
  }

  const [, maintenanceId, customerId] = match;

  const result = await opsQuery(
    `DELETE FROM maintenance_affected_customers WHERE id = $1 AND maintenance_id = $2 RETURNING id`,
    [customerId, maintenanceId]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Affected customer not found' });
  }

  return response(200, { success: true });
}

// Recurring maintenance handlers
async function handleSkipMaintenance(event, user, clientIp) {
  const id = extractMaintenanceId(event.path);

  // For recurring maintenance, skip the next occurrence
  // This is a simplified implementation - in production you'd update the recurrence logic
  await logAudit(user, 'skip_maintenance', 'maintenance', id, null, clientIp);

  return response(200, { success: true });
}

async function handleDisableMaintenance(event, user, clientIp) {
  const id = extractMaintenanceId(event.path);

  const result = await opsQuery(
    `UPDATE maintenance_windows SET is_recurring = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Maintenance not found' });
  }

  await logAudit(user, 'disable_recurring_maintenance', 'maintenance', id, null, clientIp);

  return response(200, formatMaintenance(result.rows[0]));
}

function formatMaintenance(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    internalNotes: row.internal_notes,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    actualStart: row.actual_start,
    actualEnd: row.actual_end,
    timezone: row.timezone || 'America/New_York',
    isRecurring: row.is_recurring || false,
    recurrenceRule: row.recurrence_rule,
    parentId: row.parent_id,
    status: row.status,
    maintenanceType: row.maintenance_type || 'planned',
    impactLevel: row.impact_level || 'minor',
    impactDescription: row.impact_description,
    affectedServices: row.affected_services || [],
    outcome: row.outcome,
    completionSummary: row.completion_summary,
    completionNotes: row.completion_notes,
    customerImpactOccurred: row.customer_impact_occurred || false,
    customerImpactDescription: row.customer_impact_description,
    notifyCustomers: row.notify_customers ?? true,
    notificationConfig: row.notification_config || { notify48h: true, notify24h: true, onStart: true, onComplete: true },
    notifyScope: row.notify_scope || 'all',
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =========================================================================
// Broadcast Handlers - Enhanced Enterprise
// =========================================================================

async function handleListBroadcasts(event, user) {
  const status = event.queryStringParameters?.status;
  const type = event.queryStringParameters?.type;
  const audience = event.queryStringParameters?.audience;

  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (status && status !== 'all') {
    whereConditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }
  if (type) {
    whereConditions.push(`broadcast_type = $${paramIndex++}`);
    params.push(type);
  }
  if (audience) {
    whereConditions.push(`audience_type = $${paramIndex++}`);
    params.push(audience);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const result = await opsQuery(
    `SELECT * FROM broadcasts ${whereClause} ORDER BY
     CASE status
       WHEN 'active' THEN 1
       WHEN 'scheduled' THEN 2
       WHEN 'draft' THEN 3
       ELSE 4
     END,
     created_at DESC`,
    params
  );

  // Get stats
  const statsResult = await opsQuery(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('active', 'completed')) as total_sent,
      COUNT(*) FILTER (WHERE status = 'active') as active_now,
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled
    FROM broadcasts
  `);

  // Calculate average open rate from recent broadcasts
  const openRateResult = await opsQuery(`
    SELECT
      COALESCE(
        AVG(
          CASE WHEN emails_sent > 0
          THEN (emails_opened::float / emails_sent * 100)
          ELSE 0 END
        ), 0
      ) as avg_open_rate
    FROM (
      SELECT
        b.id,
        COUNT(br.id) FILTER (WHERE br.email_sent_at IS NOT NULL) as emails_sent,
        COUNT(br.id) FILTER (WHERE br.email_opened_at IS NOT NULL) as emails_opened
      FROM broadcasts b
      LEFT JOIN broadcast_recipients br ON b.id = br.broadcast_id
      WHERE b.status IN ('active', 'completed')
      GROUP BY b.id
    ) sub
  `);

  const stats = statsResult.rows[0];

  return response(200, {
    broadcasts: result.rows.map(formatBroadcast),
    stats: {
      totalSent: parseInt(stats.total_sent) || 0,
      activeNow: parseInt(stats.active_now) || 0,
      scheduled: parseInt(stats.scheduled) || 0,
      avgOpenRate: parseFloat(openRateResult.rows[0]?.avg_open_rate || 0).toFixed(1),
    },
  });
}

async function handleBroadcastStats(event, user) {
  const statsResult = await opsQuery(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('active', 'completed')) as total_sent,
      COUNT(*) FILTER (WHERE status = 'active') as active_now,
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled
    FROM broadcasts
  `);

  const openRateResult = await opsQuery(`
    SELECT
      COALESCE(
        AVG(
          CASE WHEN emails_sent > 0
          THEN (emails_opened::float / emails_sent * 100)
          ELSE 0 END
        ), 0
      ) as avg_open_rate
    FROM (
      SELECT
        b.id,
        COUNT(br.id) FILTER (WHERE br.email_sent_at IS NOT NULL) as emails_sent,
        COUNT(br.id) FILTER (WHERE br.email_opened_at IS NOT NULL) as emails_opened
      FROM broadcasts b
      LEFT JOIN broadcast_recipients br ON b.id = br.broadcast_id
      WHERE b.status IN ('active', 'completed')
      GROUP BY b.id
    ) sub
  `);

  const stats = statsResult.rows[0];

  return response(200, {
    totalSent: parseInt(stats.total_sent) || 0,
    activeNow: parseInt(stats.active_now) || 0,
    scheduled: parseInt(stats.scheduled) || 0,
    avgOpenRate: parseFloat(openRateResult.rows[0]?.avg_open_rate || 0).toFixed(1),
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

  return response(200, { broadcast: formatBroadcast(result.rows[0]) });
}

async function handleCreateBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to create broadcasts' });
  }

  const body = JSON.parse(event.body);
  const {
    title, broadcastType, audienceType, audienceConfig, channels,
    bannerStyle, bannerHeadline, bannerBody, bannerCtaText, bannerCtaUrl, bannerDismissable,
    emailSubject, emailBody, scheduledAt, expiresAt
  } = body;

  if (!title || !broadcastType || !channels || channels.length === 0) {
    return response(400, { message: 'Missing required fields: title, broadcastType, channels' });
  }

  // Estimate recipients
  let estimatedRecipients = 0;
  try {
    const estimate = await estimateAudienceCount(audienceType || 'all', audienceConfig || {});
    estimatedRecipients = estimate;
  } catch (e) {
    console.error('Failed to estimate audience:', e);
  }

  const result = await opsQuery(
    `INSERT INTO broadcasts (
      title, broadcast_type, status, audience_type, audience_config, estimated_recipients,
      channels, banner_style, banner_headline, banner_body, banner_cta_text, banner_cta_url, banner_dismissable,
      email_subject, email_body, scheduled_at, expires_at, created_by, created_by_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *`,
    [
      title, broadcastType, 'draft', audienceType || 'all', JSON.stringify(audienceConfig || {}), estimatedRecipients,
      channels, bannerStyle || 'info', bannerHeadline, bannerBody, bannerCtaText, bannerCtaUrl, bannerDismissable ?? true,
      emailSubject, emailBody, scheduledAt, expiresAt, user.id, user.name || user.email
    ]
  );

  await logAudit(user, 'create_broadcast', 'broadcast', result.rows[0].id, { title, broadcastType }, clientIp);

  return response(201, { broadcast: formatBroadcast(result.rows[0]) });
}

async function handleUpdateBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to update broadcasts' });
  }

  const id = extractPathParam(event.path, '/admin/broadcasts/');
  const body = JSON.parse(event.body);

  // Check if broadcast can be edited
  const existing = await opsQuery(`SELECT status FROM broadcasts WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }
  if (!['draft', 'scheduled'].includes(existing.rows[0].status)) {
    return response(400, { message: 'Cannot edit an active or completed broadcast' });
  }

  const allowedFields = [
    'title', 'broadcast_type', 'audience_type', 'audience_config', 'channels',
    'banner_style', 'banner_headline', 'banner_body', 'banner_cta_text', 'banner_cta_url', 'banner_dismissable',
    'email_subject', 'email_body', 'scheduled_at', 'expires_at'
  ];

  const fieldMap = {
    title: 'title',
    broadcastType: 'broadcast_type',
    audienceType: 'audience_type',
    audienceConfig: 'audience_config',
    channels: 'channels',
    bannerStyle: 'banner_style',
    bannerHeadline: 'banner_headline',
    bannerBody: 'banner_body',
    bannerCtaText: 'banner_cta_text',
    bannerCtaUrl: 'banner_cta_url',
    bannerDismissable: 'banner_dismissable',
    emailSubject: 'email_subject',
    emailBody: 'email_body',
    scheduledAt: 'scheduled_at',
    expiresAt: 'expires_at',
  };

  const updates = [];
  const params = [];
  let paramIndex = 1;

  for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
    if (body[jsKey] !== undefined) {
      updates.push(`${dbKey} = $${paramIndex++}`);
      params.push(dbKey === 'audience_config' ? JSON.stringify(body[jsKey]) : body[jsKey]);
    }
  }

  // Update estimated recipients if audience changed
  if (body.audienceType || body.audienceConfig) {
    const audienceType = body.audienceType || existing.rows[0].audience_type;
    const audienceConfig = body.audienceConfig || {};
    const estimate = await estimateAudienceCount(audienceType, audienceConfig);
    updates.push(`estimated_recipients = $${paramIndex++}`);
    params.push(estimate);
  }

  if (updates.length === 0) {
    return response(400, { message: 'No fields to update' });
  }

  params.push(id);
  const result = await opsQuery(
    `UPDATE broadcasts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  await logAudit(user, 'update_broadcast', 'broadcast', id, body, clientIp);

  return response(200, { broadcast: formatBroadcast(result.rows[0]) });
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

async function handleSendBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to send broadcasts' });
  }

  const id = extractPathParam(event.path, '/admin/broadcasts/').replace('/send', '');

  const existing = await opsQuery(`SELECT * FROM broadcasts WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }

  const broadcast = existing.rows[0];
  if (!['draft', 'scheduled'].includes(broadcast.status)) {
    return response(400, { message: 'Broadcast cannot be sent' });
  }

  // Create recipient records based on audience
  const recipients = await getAudienceTenants(broadcast.audience_type, JSON.parse(broadcast.audience_config || '{}'));

  // Insert recipients
  for (const tenant of recipients) {
    await opsQuery(
      `INSERT INTO broadcast_recipients (broadcast_id, tenant_id, tenant_name, email_sent_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (broadcast_id, tenant_id) DO UPDATE SET email_sent_at = NOW()`,
      [id, tenant.id, tenant.name]
    );
  }

  // Update broadcast status
  const result = await opsQuery(
    `UPDATE broadcasts SET status = 'active', started_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  // Create initial analytics snapshot
  await opsQuery(
    `INSERT INTO broadcast_analytics (broadcast_id, emails_sent)
     VALUES ($1, $2)`,
    [id, recipients.length]
  );

  await logAudit(user, 'send_broadcast', 'broadcast', id, { recipientCount: recipients.length }, clientIp);

  return response(200, { broadcast: formatBroadcast(result.rows[0]) });
}

async function handleScheduleBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to schedule broadcasts' });
  }

  const id = extractPathParam(event.path, '/admin/broadcasts/').replace('/schedule', '');
  const body = JSON.parse(event.body);
  const { scheduledAt } = body;

  if (!scheduledAt) {
    return response(400, { message: 'scheduledAt is required' });
  }

  const existing = await opsQuery(`SELECT status FROM broadcasts WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }
  if (existing.rows[0].status !== 'draft') {
    return response(400, { message: 'Only draft broadcasts can be scheduled' });
  }

  const result = await opsQuery(
    `UPDATE broadcasts SET status = 'scheduled', scheduled_at = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [scheduledAt, id]
  );

  await logAudit(user, 'schedule_broadcast', 'broadcast', id, { scheduledAt }, clientIp);

  return response(200, { broadcast: formatBroadcast(result.rows[0]) });
}

async function handleCancelBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to cancel broadcasts' });
  }

  const id = extractPathParam(event.path, '/admin/broadcasts/').replace('/cancel', '');

  const existing = await opsQuery(`SELECT status FROM broadcasts WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }
  if (existing.rows[0].status !== 'scheduled') {
    return response(400, { message: 'Only scheduled broadcasts can be cancelled' });
  }

  const result = await opsQuery(
    `UPDATE broadcasts SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  await logAudit(user, 'cancel_broadcast', 'broadcast', id, null, clientIp);

  return response(200, { broadcast: formatBroadcast(result.rows[0]) });
}

async function handleEndBroadcast(event, user, clientIp) {
  if (!['super_admin', 'support_lead'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to end broadcasts' });
  }

  const id = extractPathParam(event.path, '/admin/broadcasts/').replace('/end', '');

  const existing = await opsQuery(`SELECT status FROM broadcasts WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }
  if (existing.rows[0].status !== 'active') {
    return response(400, { message: 'Only active broadcasts can be ended' });
  }

  const result = await opsQuery(
    `UPDATE broadcasts SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  await logAudit(user, 'end_broadcast', 'broadcast', id, null, clientIp);

  return response(200, { broadcast: formatBroadcast(result.rows[0]) });
}

async function handleBroadcastAnalytics(event, user) {
  const id = extractPathParam(event.path, '/admin/broadcasts/').replace('/analytics', '');

  const broadcastResult = await opsQuery(`SELECT * FROM broadcasts WHERE id = $1`, [id]);
  if (broadcastResult.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }

  // Get aggregated stats from recipients
  const statsResult = await opsQuery(`
    SELECT
      COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL) as emails_sent,
      COUNT(*) FILTER (WHERE email_opened_at IS NOT NULL) as emails_opened,
      COUNT(*) FILTER (WHERE email_clicked_at IS NOT NULL) as emails_clicked,
      COUNT(*) FILTER (WHERE email_bounced_at IS NOT NULL) as emails_bounced,
      COUNT(*) FILTER (WHERE banner_viewed_at IS NOT NULL) as banner_views,
      COUNT(*) FILTER (WHERE banner_clicked_at IS NOT NULL) as banner_clicks,
      COUNT(*) FILTER (WHERE banner_dismissed_at IS NOT NULL) as banner_dismissals
    FROM broadcast_recipients WHERE broadcast_id = $1
  `, [id]);

  // Get time series data
  const timeSeriesResult = await opsQuery(`
    SELECT * FROM broadcast_analytics
    WHERE broadcast_id = $1
    ORDER BY recorded_at ASC
  `, [id]);

  // Get recipients
  const recipientsResult = await opsQuery(`
    SELECT * FROM broadcast_recipients
    WHERE broadcast_id = $1
    ORDER BY created_at DESC
    LIMIT 100
  `, [id]);

  const stats = statsResult.rows[0] || {};
  const emailsSent = parseInt(stats.emails_sent) || 0;
  const emailsOpened = parseInt(stats.emails_opened) || 0;
  const emailsClicked = parseInt(stats.emails_clicked) || 0;
  const bannerViews = parseInt(stats.banner_views) || 0;
  const bannerClicks = parseInt(stats.banner_clicks) || 0;
  const bannerDismissals = parseInt(stats.banner_dismissals) || 0;

  return response(200, {
    broadcast: formatBroadcast(broadcastResult.rows[0]),
    stats: {
      emailsSent,
      emailsOpened,
      emailsClicked,
      emailsBounced: parseInt(stats.emails_bounced) || 0,
      bannerViews,
      bannerClicks,
      bannerDismissals,
      openRate: emailsSent > 0 ? ((emailsOpened / emailsSent) * 100).toFixed(1) : 0,
      clickRate: emailsSent > 0 ? ((emailsClicked / emailsSent) * 100).toFixed(1) : 0,
      bannerClickRate: bannerViews > 0 ? ((bannerClicks / bannerViews) * 100).toFixed(1) : 0,
      bannerDismissRate: bannerViews > 0 ? ((bannerDismissals / bannerViews) * 100).toFixed(1) : 0,
    },
    timeSeries: timeSeriesResult.rows.map(row => ({
      id: row.id,
      broadcastId: row.broadcast_id,
      recordedAt: row.recorded_at,
      emailsSent: row.emails_sent,
      emailsOpened: row.emails_opened,
      emailsClicked: row.emails_clicked,
      emailsBounced: row.emails_bounced,
      bannerViews: row.banner_views,
      bannerClicks: row.banner_clicks,
      bannerDismissals: row.banner_dismissals,
    })),
    recipients: recipientsResult.rows.map(row => ({
      id: row.id,
      broadcastId: row.broadcast_id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      emailSentAt: row.email_sent_at,
      emailOpenedAt: row.email_opened_at,
      emailClickedAt: row.email_clicked_at,
      emailBouncedAt: row.email_bounced_at,
      bannerViewedAt: row.banner_viewed_at,
      bannerClickedAt: row.banner_clicked_at,
      bannerDismissedAt: row.banner_dismissed_at,
      createdAt: row.created_at,
    })),
  });
}

async function handleBroadcastRecipients(event, user) {
  const id = extractPathParam(event.path, '/admin/broadcasts/').replace('/recipients', '');
  const limit = parseInt(event.queryStringParameters?.limit) || 50;
  const offset = parseInt(event.queryStringParameters?.offset) || 0;
  const filter = event.queryStringParameters?.filter;

  let whereConditions = ['broadcast_id = $1'];
  let params = [id];
  let paramIndex = 2;

  if (filter === 'opened') {
    whereConditions.push('email_opened_at IS NOT NULL');
  } else if (filter === 'clicked') {
    whereConditions.push('email_clicked_at IS NOT NULL');
  } else if (filter === 'dismissed') {
    whereConditions.push('banner_dismissed_at IS NOT NULL');
  } else if (filter === 'unopened') {
    whereConditions.push('email_opened_at IS NULL AND email_sent_at IS NOT NULL');
  }

  const result = await opsQuery(`
    SELECT * FROM broadcast_recipients
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `, [...params, limit, offset]);

  const countResult = await opsQuery(`
    SELECT COUNT(*) as total FROM broadcast_recipients WHERE ${whereConditions.join(' AND ')}
  `, params);

  return response(200, {
    recipients: result.rows.map(row => ({
      id: row.id,
      broadcastId: row.broadcast_id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      emailSentAt: row.email_sent_at,
      emailOpenedAt: row.email_opened_at,
      emailClickedAt: row.email_clicked_at,
      emailBouncedAt: row.email_bounced_at,
      bannerViewedAt: row.banner_viewed_at,
      bannerClickedAt: row.banner_clicked_at,
      bannerDismissedAt: row.banner_dismissed_at,
      createdAt: row.created_at,
    })),
    total: parseInt(countResult.rows[0]?.total) || 0,
  });
}

async function handlePreviewBroadcastEmail(event, user) {
  const id = extractPathParam(event.path, '/admin/broadcasts/').replace('/preview', '');

  const result = await opsQuery(`SELECT * FROM broadcasts WHERE id = $1`, [id]);
  if (result.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }

  const broadcast = result.rows[0];
  const sampleVars = {
    tenant_name: 'Sample Business',
    owner_name: 'John Doe',
    owner_email: 'john@example.com',
  };

  let emailBody = broadcast.email_body || '';
  for (const [key, value] of Object.entries(sampleVars)) {
    emailBody = emailBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return response(200, {
    html: `<html><body style="font-family: sans-serif; padding: 20px;">${emailBody}</body></html>`,
    text: emailBody.replace(/<[^>]*>/g, ''),
  });
}

async function handlePreviewBroadcastBanner(event, user) {
  const id = extractPathParam(event.path, '/admin/broadcasts/').replace('/preview/banner', '');

  const result = await opsQuery(`SELECT * FROM broadcasts WHERE id = $1`, [id]);
  if (result.rows.length === 0) {
    return response(404, { message: 'Broadcast not found' });
  }

  const broadcast = result.rows[0];
  const styleColors = {
    info: { bg: '#3b82f6', text: '#fff' },
    success: { bg: '#22c55e', text: '#fff' },
    warning: { bg: '#f59e0b', text: '#000' },
    promo: { bg: '#8b5cf6', text: '#fff' },
  };
  const colors = styleColors[broadcast.banner_style] || styleColors.info;

  const html = `
    <div style="background: ${colors.bg}; color: ${colors.text}; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <strong>${broadcast.banner_headline || ''}</strong>
        <span style="margin-left: 8px;">${broadcast.banner_body || ''}</span>
      </div>
      ${broadcast.banner_cta_text ? `<a href="${broadcast.banner_cta_url || '#'}" style="color: ${colors.text}; text-decoration: underline;">${broadcast.banner_cta_text}</a>` : ''}
    </div>
  `;

  return response(200, { html });
}

async function handleAudienceEstimate(event, user) {
  const body = JSON.parse(event.body);
  const { audienceType, config } = body;

  const count = await estimateAudienceCount(audienceType, config || {});
  const tenants = await getAudienceTenants(audienceType, config || {}, 10);

  return response(200, {
    count,
    tenants: tenants.map(t => ({ id: t.id, name: t.name })),
  });
}

async function estimateAudienceCount(audienceType, config) {
  let query = `SELECT COUNT(*) as count FROM "Tenant" WHERE 1=1`;
  let params = [];
  let paramIndex = 1;

  if (audienceType === 'tier' && config.tiers?.length > 0) {
    query += ` AND plan = ANY($${paramIndex++})`;
    params.push(config.tiers);
  } else if (audienceType === 'activity') {
    if (config.activity === 'active_7d') {
      query += ` AND "updatedAt" > NOW() - INTERVAL '7 days'`;
    } else if (config.activity === 'active_30d') {
      query += ` AND "updatedAt" > NOW() - INTERVAL '30 days'`;
    } else if (config.activity === 'inactive_30d') {
      query += ` AND "updatedAt" < NOW() - INTERVAL '30 days'`;
    }
  } else if (audienceType === 'age') {
    if (config.age === 'new_30d') {
      query += ` AND "createdAt" > NOW() - INTERVAL '30 days'`;
    } else if (config.age === 'established_1_6m') {
      query += ` AND "createdAt" BETWEEN NOW() - INTERVAL '6 months' AND NOW() - INTERVAL '1 month'`;
    } else if (config.age === 'veteran_6m') {
      query += ` AND "createdAt" < NOW() - INTERVAL '6 months'`;
    }
  } else if (audienceType === 'specific' && config.tenantIds?.length > 0) {
    query += ` AND id = ANY($${paramIndex++})`;
    params.push(config.tenantIds);
  }

  try {
    const result = await barkbaseQuery(query, params);
    return parseInt(result.rows[0]?.count) || 0;
  } catch (e) {
    console.error('Failed to estimate audience:', e);
    return 0;
  }
}

async function getAudienceTenants(audienceType, config, limit = null) {
  let query = `SELECT id, name FROM "Tenant" WHERE 1=1`;
  let params = [];
  let paramIndex = 1;

  if (audienceType === 'tier' && config.tiers?.length > 0) {
    query += ` AND plan = ANY($${paramIndex++})`;
    params.push(config.tiers);
  } else if (audienceType === 'activity') {
    if (config.activity === 'active_7d') {
      query += ` AND "updatedAt" > NOW() - INTERVAL '7 days'`;
    } else if (config.activity === 'active_30d') {
      query += ` AND "updatedAt" > NOW() - INTERVAL '30 days'`;
    } else if (config.activity === 'inactive_30d') {
      query += ` AND "updatedAt" < NOW() - INTERVAL '30 days'`;
    }
  } else if (audienceType === 'age') {
    if (config.age === 'new_30d') {
      query += ` AND "createdAt" > NOW() - INTERVAL '30 days'`;
    } else if (config.age === 'established_1_6m') {
      query += ` AND "createdAt" BETWEEN NOW() - INTERVAL '6 months' AND NOW() - INTERVAL '1 month'`;
    } else if (config.age === 'veteran_6m') {
      query += ` AND "createdAt" < NOW() - INTERVAL '6 months'`;
    }
  } else if (audienceType === 'specific' && config.tenantIds?.length > 0) {
    query += ` AND id = ANY($${paramIndex++})`;
    params.push(config.tenantIds);
  }

  if (limit) {
    query += ` LIMIT ${limit}`;
  }

  try {
    const result = await barkbaseQuery(query, params);
    return result.rows;
  } catch (e) {
    console.error('Failed to get audience tenants:', e);
    return [];
  }
}

function formatBroadcast(row) {
  return {
    id: row.id,
    title: row.title,
    broadcastType: row.broadcast_type,
    status: row.status,
    audienceType: row.audience_type,
    audienceConfig: typeof row.audience_config === 'string' ? JSON.parse(row.audience_config) : (row.audience_config || {}),
    estimatedRecipients: row.estimated_recipients || 0,
    channels: row.channels || [],
    bannerStyle: row.banner_style,
    bannerHeadline: row.banner_headline,
    bannerBody: row.banner_body,
    bannerCtaText: row.banner_cta_text,
    bannerCtaUrl: row.banner_cta_url,
    bannerDismissable: row.banner_dismissable,
    emailSubject: row.email_subject,
    emailBody: row.email_body,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    endedAt: row.ended_at,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =========================================================================
// Feature Flag Handlers - Enterprise
// =========================================================================

async function handleListFeatureFlags(event, user) {
  const status = event.queryStringParameters?.status;
  const category = event.queryStringParameters?.category;
  const environment = event.queryStringParameters?.environment || 'production';
  const search = event.queryStringParameters?.search;

  let query = `
    SELECT f.*,
           COUNT(DISTINCT o.id) as override_count
    FROM feature_flags f
    LEFT JOIN feature_flag_overrides o ON f.id = o.flag_id
    WHERE f.archived_at IS NULL
  `;
  const params = [];
  let paramIndex = 1;

  if (status === 'enabled') {
    query += ` AND f.enabled = true AND f.rollout_percentage = 100`;
  } else if (status === 'disabled') {
    query += ` AND f.enabled = false`;
  } else if (status === 'rollout') {
    query += ` AND f.enabled = true AND f.rollout_percentage < 100 AND f.rollout_strategy = 'percentage'`;
  } else if (status === 'archived') {
    query = query.replace('f.archived_at IS NULL', 'f.archived_at IS NOT NULL');
  }

  if (category) {
    query += ` AND f.category = $${paramIndex++}`;
    params.push(category);
  }

  if (environment) {
    query += ` AND $${paramIndex++} = ANY(f.environments)`;
    params.push(environment);
  }

  if (search) {
    query += ` AND (f.flag_key ILIKE $${paramIndex} OR f.display_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` GROUP BY f.id ORDER BY f.created_at DESC`;

  const result = await opsQuery(query, params);

  // Get tenant counts for each flag
  const flagIds = result.rows.map(r => r.id);
  let tenantCounts = {};

  if (flagIds.length > 0) {
    // Get total tenant count
    const totalTenantsResult = await barkbaseQuery(`SELECT COUNT(*) as count FROM "Tenant"`);
    const totalTenants = parseInt(totalTenantsResult.rows[0].count) || 0;

    // For each flag, calculate enabled tenant count based on strategy
    for (const row of result.rows) {
      let enabledCount = 0;

      if (!row.enabled) {
        enabledCount = 0;
      } else if (row.rollout_strategy === 'all_or_nothing') {
        enabledCount = totalTenants;
      } else if (row.rollout_strategy === 'percentage') {
        enabledCount = Math.floor(totalTenants * (row.rollout_percentage / 100));
      } else if (row.rollout_strategy === 'tier') {
        const tiers = row.allowed_tiers || [];
        if (tiers.length > 0) {
          // This is simplified - would need subscription data
          enabledCount = Math.floor(totalTenants * 0.5);
        }
      } else if (row.rollout_strategy === 'specific') {
        enabledCount = parseInt(row.override_count) || 0;
      }

      tenantCounts[row.id] = { enabled: enabledCount, total: totalTenants };
    }
  }

  // Calculate stats
  const allFlags = result.rows;
  const stats = {
    total: allFlags.length,
    enabled: allFlags.filter(f => f.enabled && f.rollout_percentage === 100).length,
    inRollout: allFlags.filter(f => f.enabled && f.rollout_percentage < 100 && f.rollout_strategy === 'percentage').length,
    recentlyChanged: allFlags.filter(f => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(f.updated_at) > weekAgo;
    }).length,
  };

  return response(200, {
    flags: result.rows.map(row => ({
      ...formatFeatureFlag(row),
      overrideCount: parseInt(row.override_count) || 0,
      enabledTenantCount: tenantCounts[row.id]?.enabled || 0,
      totalTenantCount: tenantCounts[row.id]?.total || 0,
    })),
    stats,
  });
}

async function handleFeatureFlagStats(event, user) {
  const result = await opsQuery(`
    SELECT
      COUNT(*) FILTER (WHERE archived_at IS NULL) as total,
      COUNT(*) FILTER (WHERE enabled = true AND rollout_percentage = 100 AND archived_at IS NULL) as enabled,
      COUNT(*) FILTER (WHERE enabled = true AND rollout_percentage < 100 AND rollout_strategy = 'percentage' AND archived_at IS NULL) as in_rollout,
      COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days' AND archived_at IS NULL) as recently_changed
    FROM feature_flags
  `);

  const row = result.rows[0];
  return response(200, {
    stats: {
      total: parseInt(row.total) || 0,
      enabled: parseInt(row.enabled) || 0,
      inRollout: parseInt(row.in_rollout) || 0,
      recentlyChanged: parseInt(row.recently_changed) || 0,
    },
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

  return response(200, {
    flag: formatFeatureFlag(flagResult.rows[0]),
  });
}

async function handleCreateFeatureFlag(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to create feature flags' });
  }

  const body = JSON.parse(event.body);
  const {
    flagKey, displayName, description, category,
    enabled, rolloutStrategy, rolloutPercentage, rolloutSticky,
    allowedTiers, specificTenantIds, customRules,
    isKillSwitch, requireConfirmation, logChecks,
    environments
  } = body;

  if (!flagKey || !displayName) {
    return response(400, { message: 'Flag key and display name are required' });
  }

  // Validate flag key format
  if (!/^[a-z][a-z0-9_]*$/.test(flagKey)) {
    return response(400, { message: 'Flag key must be lowercase snake_case starting with a letter' });
  }

  // Check for duplicate key
  const existingResult = await opsQuery(
    `SELECT id FROM feature_flags WHERE flag_key = $1`,
    [flagKey]
  );

  if (existingResult.rows.length > 0) {
    return response(400, { message: 'Feature flag key already exists' });
  }

  const result = await opsQuery(
    `INSERT INTO feature_flags (
      flag_key, display_name, description, category,
      enabled, rollout_strategy, rollout_percentage, rollout_sticky,
      allowed_tiers, specific_tenant_ids, custom_rules,
      is_kill_switch, require_confirmation, log_checks,
      environments, created_by, created_by_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [
      flagKey,
      displayName,
      description || null,
      category || 'core',
      enabled ?? false,
      rolloutStrategy || 'all_or_nothing',
      rolloutPercentage ?? 0,
      rolloutSticky ?? true,
      allowedTiers || null,
      specificTenantIds || null,
      customRules ? JSON.stringify(customRules) : null,
      isKillSwitch ?? false,
      requireConfirmation ?? false,
      logChecks ?? false,
      environments || ['production', 'staging'],
      user.email,
      user.name
    ]
  );

  // Log to history
  await opsQuery(
    `INSERT INTO feature_flag_history (flag_id, change_type, new_value, created_by, created_by_name)
     VALUES ($1, 'created', $2, $3, $4)`,
    [result.rows[0].id, JSON.stringify({ flagKey, displayName, enabled: enabled ?? false }), user.email, user.name]
  );

  await logAudit(user, 'create_feature_flag', 'feature_flag', result.rows[0].id, { flagKey, displayName }, clientIp);

  return response(201, { flag: formatFeatureFlag(result.rows[0]) });
}

async function handleUpdateFeatureFlag(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to update feature flags' });
  }

  const id = extractPathParam(event.path, '/admin/feature-flags/');
  const body = JSON.parse(event.body);

  // Get current flag state for history
  const currentFlag = await opsQuery(`SELECT * FROM feature_flags WHERE id = $1`, [id]);
  if (currentFlag.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  const updates = ['updated_at = NOW()'];
  const params = [];
  let paramIndex = 1;

  const fieldMappings = {
    displayName: 'display_name',
    description: 'description',
    category: 'category',
    enabled: 'enabled',
    rolloutStrategy: 'rollout_strategy',
    rolloutPercentage: 'rollout_percentage',
    rolloutSticky: 'rollout_sticky',
    allowedTiers: 'allowed_tiers',
    specificTenantIds: 'specific_tenant_ids',
    customRules: 'custom_rules',
    isKillSwitch: 'is_kill_switch',
    requireConfirmation: 'require_confirmation',
    logChecks: 'log_checks',
    environments: 'environments',
  };

  for (const [jsField, dbField] of Object.entries(fieldMappings)) {
    if (body[jsField] !== undefined) {
      updates.push(`${dbField} = $${paramIndex++}`);
      if (jsField === 'customRules') {
        params.push(body[jsField] ? JSON.stringify(body[jsField]) : null);
      } else {
        params.push(body[jsField]);
      }
    }
  }

  params.push(id);
  const result = await opsQuery(
    `UPDATE feature_flags SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  // Log to history
  await opsQuery(
    `INSERT INTO feature_flag_history (flag_id, change_type, previous_value, new_value, created_by, created_by_name)
     VALUES ($1, 'updated', $2, $3, $4, $5)`,
    [id, JSON.stringify(formatFeatureFlag(currentFlag.rows[0])), JSON.stringify(body), user.email, user.name]
  );

  await logAudit(user, 'update_feature_flag', 'feature_flag', id, body, clientIp);

  return response(200, { flag: formatFeatureFlag(result.rows[0]) });
}

async function handleToggleFeatureFlag(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to toggle feature flags' });
  }

  const id = extractPathParam(event.path, '/admin/feature-flags/', '/toggle');
  const body = JSON.parse(event.body);
  const { enabled, reason } = body;

  if (enabled === undefined) {
    return response(400, { message: 'Enabled status is required' });
  }

  // Get current flag state
  const currentFlag = await opsQuery(`SELECT * FROM feature_flags WHERE id = $1`, [id]);
  if (currentFlag.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  // Check if confirmation is required
  if (currentFlag.rows[0].require_confirmation && !body.confirmed) {
    return response(400, { message: 'This flag requires confirmation to toggle', requiresConfirmation: true });
  }

  const result = await opsQuery(
    `UPDATE feature_flags SET enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [enabled, id]
  );

  // Log to history
  await opsQuery(
    `INSERT INTO feature_flag_history (flag_id, change_type, previous_value, new_value, reason, created_by, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      enabled ? 'enabled' : 'disabled',
      JSON.stringify({ enabled: currentFlag.rows[0].enabled }),
      JSON.stringify({ enabled }),
      reason || null,
      user.email,
      user.name
    ]
  );

  await logAudit(user, enabled ? 'enable_feature_flag' : 'disable_feature_flag', 'feature_flag', id, { enabled, reason }, clientIp);

  return response(200, { flag: formatFeatureFlag(result.rows[0]) });
}

async function handleUpdateFeatureFlagRollout(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to update rollout' });
  }

  const id = extractPathParam(event.path, '/admin/feature-flags/', '/rollout');
  const body = JSON.parse(event.body);
  const { percentage, reason } = body;

  if (percentage === undefined || percentage < 0 || percentage > 100) {
    return response(400, { message: 'Valid percentage (0-100) is required' });
  }

  // Get current flag state
  const currentFlag = await opsQuery(`SELECT * FROM feature_flags WHERE id = $1`, [id]);
  if (currentFlag.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  const result = await opsQuery(
    `UPDATE feature_flags
     SET rollout_percentage = $1, rollout_strategy = 'percentage', enabled = true, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [percentage, id]
  );

  // Log to history
  await opsQuery(
    `INSERT INTO feature_flag_history (flag_id, change_type, previous_value, new_value, reason, created_by, created_by_name)
     VALUES ($1, 'rollout_change', $2, $3, $4, $5, $6)`,
    [
      id,
      JSON.stringify({ rolloutPercentage: currentFlag.rows[0].rollout_percentage }),
      JSON.stringify({ rolloutPercentage: percentage }),
      reason || null,
      user.email,
      user.name
    ]
  );

  await logAudit(user, 'update_feature_flag_rollout', 'feature_flag', id, { percentage, reason }, clientIp);

  return response(200, { flag: formatFeatureFlag(result.rows[0]) });
}

async function handleKillFeatureFlag(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to kill feature flags' });
  }

  const id = extractPathParam(event.path, '/admin/feature-flags/', '/kill');
  const body = JSON.parse(event.body || '{}');
  const { reason } = body;

  // Get current flag state
  const currentFlag = await opsQuery(`SELECT * FROM feature_flags WHERE id = $1`, [id]);
  if (currentFlag.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  if (!currentFlag.rows[0].is_kill_switch) {
    return response(400, { message: 'This flag does not have kill switch enabled' });
  }

  const result = await opsQuery(
    `UPDATE feature_flags SET enabled = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  // Log to history
  await opsQuery(
    `INSERT INTO feature_flag_history (flag_id, change_type, previous_value, new_value, reason, created_by, created_by_name)
     VALUES ($1, 'disabled', $2, $3, $4, $5, $6)`,
    [
      id,
      JSON.stringify({ enabled: true }),
      JSON.stringify({ enabled: false, killedAt: new Date().toISOString() }),
      reason || 'Emergency kill switch activated',
      user.email,
      user.name
    ]
  );

  await logAudit(user, 'kill_feature_flag', 'feature_flag', id, { reason }, clientIp);

  return response(200, { flag: formatFeatureFlag(result.rows[0]) });
}

async function handleArchiveFeatureFlag(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to archive feature flags' });
  }

  const id = extractPathParam(event.path, '/admin/feature-flags/', '/archive');

  const result = await opsQuery(
    `UPDATE feature_flags SET archived_at = NOW(), enabled = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  // Log to history
  await opsQuery(
    `INSERT INTO feature_flag_history (flag_id, change_type, new_value, created_by, created_by_name)
     VALUES ($1, 'archived', $2, $3, $4)`,
    [id, JSON.stringify({ archivedAt: new Date().toISOString() }), user.email, user.name]
  );

  await logAudit(user, 'archive_feature_flag', 'feature_flag', id, {}, clientIp);

  return response(200, { flag: formatFeatureFlag(result.rows[0]) });
}

async function handleDeleteFeatureFlag(event, user, clientIp) {
  if (!['super_admin'].includes(user.role)) {
    return response(403, { message: 'Only super admins can delete feature flags' });
  }

  const id = extractPathParam(event.path, '/admin/feature-flags/');

  const result = await opsQuery(
    `DELETE FROM feature_flags WHERE id = $1 RETURNING id, flag_key`,
    [id]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }

  await logAudit(user, 'delete_feature_flag', 'feature_flag', id, { flagKey: result.rows[0].flag_key }, clientIp);

  return response(200, { success: true });
}

async function handleGetFeatureFlagTenants(event, user) {
  const id = extractPathParam(event.path, '/admin/feature-flags/', '/tenants');
  const filter = event.queryStringParameters?.filter || 'all';
  const search = event.queryStringParameters?.search;

  // Get the flag details
  const flagResult = await opsQuery(`SELECT * FROM feature_flags WHERE id = $1`, [id]);
  if (flagResult.rows.length === 0) {
    return response(404, { message: 'Feature flag not found' });
  }
  const flag = flagResult.rows[0];

  // Get all tenants with their override status
  let tenantQuery = `
    SELECT t.id, t.name, t.subscription as plan,
           o.id as override_id, o.enabled as override_enabled, o.reason as override_reason, o.created_at as override_created_at,
           a.assigned_bucket, a.in_rollout
    FROM "Tenant" t
    LEFT JOIN feature_flag_overrides o ON o.tenant_id = t.id AND o.flag_id = $1
    LEFT JOIN feature_flag_assignments a ON a.tenant_id = t.id AND a.flag_id = $1
    WHERE 1=1
  `;
  const params = [id];
  let paramIndex = 2;

  if (search) {
    tenantQuery += ` AND t.name ILIKE $${paramIndex++}`;
    params.push(`%${search}%`);
  }

  tenantQuery += ` ORDER BY t.name`;

  const tenantsResult = await barkbaseQuery(tenantQuery, params);

  // Determine enabled status for each tenant
  const tenants = tenantsResult.rows.map(row => {
    let enabled = false;
    let source = 'default';

    if (row.override_id) {
      // Has explicit override
      enabled = row.override_enabled;
      source = 'override';
    } else if (!flag.enabled) {
      // Flag is disabled globally
      enabled = false;
      source = 'default';
    } else if (flag.rollout_strategy === 'all_or_nothing') {
      enabled = true;
      source = 'default';
    } else if (flag.rollout_strategy === 'percentage') {
      // Use assignment or calculate
      if (row.in_rollout !== null) {
        enabled = row.in_rollout;
      } else {
        const hash = simpleHash(row.id + flag.id);
        enabled = (hash % 100) < flag.rollout_percentage;
      }
      source = 'rollout';
    } else if (flag.rollout_strategy === 'tier') {
      const allowedTiers = flag.allowed_tiers || [];
      enabled = allowedTiers.includes(row.plan?.toLowerCase());
      source = 'tier';
    } else if (flag.rollout_strategy === 'specific') {
      // Only overrides enable for specific strategy
      enabled = false;
      source = 'default';
    }

    return {
      tenantId: row.id,
      tenantName: row.name,
      tenantPlan: row.plan,
      enabled,
      source,
      overrideReason: row.override_reason,
      assignedBucket: row.assigned_bucket,
      enabledSince: row.override_created_at,
    };
  });

  // Filter based on enabled status
  let filteredTenants = tenants;
  if (filter === 'enabled') {
    filteredTenants = tenants.filter(t => t.enabled);
  } else if (filter === 'disabled') {
    filteredTenants = tenants.filter(t => !t.enabled);
  }

  return response(200, {
    tenants: filteredTenants,
    total: filteredTenants.length,
  });
}

async function handleAddFeatureFlagOverride(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to add overrides' });
  }

  const pathParts = event.path.split('/');
  const flagId = pathParts[3];
  const tenantId = pathParts[5];

  const body = JSON.parse(event.body);
  const { enabled, reason } = body;

  if (enabled === undefined) {
    return response(400, { message: 'Enabled status is required' });
  }

  // Verify tenant exists
  const tenantResult = await barkbaseQuery(
    `SELECT id, name FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  // Upsert override
  const result = await opsQuery(
    `INSERT INTO feature_flag_overrides (flag_id, tenant_id, tenant_name, enabled, reason, created_by, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (flag_id, tenant_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       reason = EXCLUDED.reason,
       updated_at = NOW()
     RETURNING *`,
    [flagId, tenantId, tenantResult.rows[0].name, enabled, reason || null, user.email, user.name]
  );

  // Log to history
  await opsQuery(
    `INSERT INTO feature_flag_history (flag_id, change_type, new_value, reason, created_by, created_by_name)
     VALUES ($1, 'tenant_override', $2, $3, $4, $5)`,
    [
      flagId,
      JSON.stringify({ tenantId, tenantName: tenantResult.rows[0].name, enabled }),
      reason || null,
      user.email,
      user.name
    ]
  );

  await logAudit(user, 'add_feature_flag_override', 'feature_flag', flagId, { tenantId, enabled, reason }, clientIp);

  return response(201, {
    override: {
      id: result.rows[0].id,
      flagId: result.rows[0].flag_id,
      tenantId: result.rows[0].tenant_id,
      tenantName: result.rows[0].tenant_name,
      enabled: result.rows[0].enabled,
      reason: result.rows[0].reason,
      createdBy: result.rows[0].created_by,
      createdByName: result.rows[0].created_by_name,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    },
  });
}

async function handleRemoveFeatureFlagOverride(event, user, clientIp) {
  if (!['super_admin', 'engineer'].includes(user.role)) {
    return response(403, { message: 'You do not have permission to remove overrides' });
  }

  const pathParts = event.path.split('/');
  const flagId = pathParts[3];
  const tenantId = pathParts[5];

  const result = await opsQuery(
    `DELETE FROM feature_flag_overrides WHERE flag_id = $1 AND tenant_id = $2 RETURNING id, tenant_name`,
    [flagId, tenantId]
  );

  if (result.rows.length === 0) {
    return response(404, { message: 'Override not found' });
  }

  // Log to history
  await opsQuery(
    `INSERT INTO feature_flag_history (flag_id, change_type, previous_value, created_by, created_by_name)
     VALUES ($1, 'override_removed', $2, $3, $4)`,
    [
      flagId,
      JSON.stringify({ tenantId, tenantName: result.rows[0].tenant_name }),
      user.email,
      user.name
    ]
  );

  await logAudit(user, 'remove_feature_flag_override', 'feature_flag', flagId, { tenantId }, clientIp);

  return response(200, { success: true });
}

async function handleGetFeatureFlagHistory(event, user) {
  const id = extractPathParam(event.path, '/admin/feature-flags/', '/history');

  const result = await opsQuery(
    `SELECT * FROM feature_flag_history WHERE flag_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [id]
  );

  return response(200, {
    history: result.rows.map(row => ({
      id: row.id,
      flagId: row.flag_id,
      changeType: row.change_type,
      previousValue: row.previous_value,
      newValue: row.new_value,
      reason: row.reason,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
    })),
  });
}

// Public feature flag evaluation endpoints
async function handleEvaluateAllFlags(event) {
  const pathParts = event.path.split('/');
  const tenantId = pathParts[4];

  if (!tenantId) {
    return response(400, { message: 'Tenant ID is required' });
  }

  // Get tenant info
  const tenantResult = await barkbaseQuery(
    `SELECT id, subscription as plan FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  const tenant = tenantResult.rows[0];

  // Get all enabled, non-archived flags
  const flagsResult = await opsQuery(
    `SELECT f.*, o.enabled as override_enabled, o.id as override_id,
            a.assigned_bucket, a.in_rollout
     FROM feature_flags f
     LEFT JOIN feature_flag_overrides o ON o.flag_id = f.id AND o.tenant_id = $1
     LEFT JOIN feature_flag_assignments a ON a.flag_id = f.id AND a.tenant_id = $1
     WHERE f.archived_at IS NULL AND 'production' = ANY(f.environments)`,
    [tenantId]
  );

  const flags = {};

  for (const flag of flagsResult.rows) {
    const isEnabled = evaluateFlagForTenant(flag, tenant.id, tenant.plan);
    flags[flag.flag_key] = isEnabled;
  }

  return response(200, { flags });
}

async function handleEvaluateFeatureFlag(event) {
  const pathParts = event.path.split('/');
  const tenantId = pathParts[4];
  const flagKey = pathParts[5];

  if (!tenantId || !flagKey) {
    return response(400, { message: 'Tenant ID and flag key are required' });
  }

  // Get tenant info
  const tenantResult = await barkbaseQuery(
    `SELECT id, subscription as plan FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  const tenant = tenantResult.rows[0];

  // Get the specific flag
  const flagResult = await opsQuery(
    `SELECT f.*, o.enabled as override_enabled, o.id as override_id,
            a.assigned_bucket, a.in_rollout
     FROM feature_flags f
     LEFT JOIN feature_flag_overrides o ON o.flag_id = f.id AND o.tenant_id = $1
     LEFT JOIN feature_flag_assignments a ON a.flag_id = f.id AND a.tenant_id = $1
     WHERE f.flag_key = $2 AND f.archived_at IS NULL`,
    [tenantId, flagKey]
  );

  if (flagResult.rows.length === 0) {
    return response(200, { enabled: false });
  }

  const flag = flagResult.rows[0];
  const isEnabled = evaluateFlagForTenant(flag, tenant.id, tenant.plan);

  return response(200, { enabled: isEnabled });
}

function evaluateFlagForTenant(flag, tenantId, tenantPlan) {
  // Check override first
  if (flag.override_id) {
    return flag.override_enabled;
  }

  // Flag not enabled globally
  if (!flag.enabled) {
    return false;
  }

  // Evaluate based on strategy
  switch (flag.rollout_strategy) {
    case 'all_or_nothing':
      return true;

    case 'percentage':
      if (flag.in_rollout !== null) {
        return flag.in_rollout;
      }
      // Calculate based on hash
      const hash = simpleHash(tenantId + flag.id);
      return (hash % 100) < flag.rollout_percentage;

    case 'tier':
      const allowedTiers = flag.allowed_tiers || [];
      return allowedTiers.includes(tenantPlan?.toLowerCase());

    case 'specific':
      // Only overrides enable for specific strategy
      return false;

    case 'custom':
      // Would need to evaluate custom rules
      return false;

    default:
      return false;
  }
}

function formatFeatureFlag(row) {
  return {
    id: row.id,
    flagKey: row.flag_key,
    displayName: row.display_name,
    description: row.description,
    category: row.category,
    enabled: row.enabled,
    rolloutStrategy: row.rollout_strategy,
    rolloutPercentage: row.rollout_percentage,
    rolloutSticky: row.rollout_sticky,
    allowedTiers: row.allowed_tiers,
    specificTenantIds: row.specific_tenant_ids,
    customRules: row.custom_rules,
    isKillSwitch: row.is_kill_switch,
    requireConfirmation: row.require_confirmation,
    logChecks: row.log_checks,
    environments: row.environments,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

// =========================================================================
// Public Handlers (no auth required)
// =========================================================================

async function handlePublicBroadcasts(event) {
  const result = await opsQuery(
    `SELECT * FROM broadcasts
     WHERE status = 'active'
     AND (expires_at IS NULL OR expires_at > NOW())
     AND 'in_app' = ANY(channels)
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

  // Get tenant info
  const tenantResult = await barkbaseQuery(
    `SELECT id, subscription as plan FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Tenant not found' });
  }

  const tenant = tenantResult.rows[0];

  // Get all enabled, non-archived flags
  const flagsResult = await opsQuery(
    `SELECT f.*, o.enabled as override_enabled, o.id as override_id,
            a.assigned_bucket, a.in_rollout
     FROM feature_flags f
     LEFT JOIN feature_flag_overrides o ON o.flag_id = f.id AND o.tenant_id = $1
     LEFT JOIN feature_flag_assignments a ON a.flag_id = f.id AND a.tenant_id = $1
     WHERE f.archived_at IS NULL AND 'production' = ANY(f.environments)`,
    [tenantId]
  );

  // Determine enabled features using the same evaluation logic
  const enabledFeatures = flagsResult.rows
    .filter(flag => evaluateFlagForTenant(flag, tenant.id, tenant.plan))
    .map(f => f.flag_key);

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

// =========================================================================
// Tenants List Handler
// =========================================================================

async function handleListTenants(event, user) {
  const search = event.queryStringParameters?.search;
  const status = event.queryStringParameters?.status;
  const limit = parseInt(event.queryStringParameters?.limit) || 50;

  let query = `
    SELECT t.id, t.name, t.state, t.created_at,
           COUNT(u.id) as user_count
    FROM "Tenant" t
    LEFT JOIN "User" u ON u.tenant_id = t.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND t.name ILIKE $${paramIndex}`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (status) {
    query += ` AND t.state = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  query += ` GROUP BY t.id ORDER BY t.name LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await barkbaseQuery(query, params);

  return response(200, {
    tenants: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.state,
      userCount: parseInt(row.user_count) || 0,
      createdAt: row.created_at,
    })),
  });
}

// =========================================================================
// API Proxy Handler
// =========================================================================

async function handleApiProxy(event, user, clientIp) {
  const body = JSON.parse(event.body || '{}');
  const { method, path: apiPath, body: requestBody, tenant_id } = body;

  if (!method || !apiPath) {
    return response(400, { message: 'Method and path are required' });
  }

  // Validate method
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (!validMethods.includes(method.toUpperCase())) {
    return response(400, { message: 'Invalid HTTP method' });
  }

  // Get BarkBase API URL from environment
  const barkbaseApiUrl = process.env.BARKBASE_API_URL || 'https://api.barkbase.com';

  // Use /admin/v1/ routes for IAM auth (service-to-service)
  // Replace /api/v1/ with /admin/v1/ to use IAM-authorized routes
  const adminPath = apiPath.replace(/^\/api\/v1\//, '/admin/v1/');
  const fullUrl = barkbaseApiUrl + adminPath;

  const startTime = Date.now();

  try {
    // Prepare headers with admin context
    const headers = {
      'Content-Type': 'application/json',
      'X-Admin-User': user.email,
    };

    // Add tenant context if provided
    if (tenant_id) {
      headers['X-Tenant-Id'] = tenant_id;
    }

    // Prepare request options
    const requestOptions = {
      method: method.toUpperCase(),
      headers,
    };

    // Add body for non-GET requests
    let bodyContent = null;
    if (requestBody && method.toUpperCase() !== 'GET') {
      bodyContent = JSON.stringify(requestBody);
      requestOptions.body = bodyContent;
    }

    // Use SigV4-signed fetch for IAM authentication
    const signedFetch = getSignedFetch();
    const apiResponse = await signedFetch(fullUrl, {
      method: requestOptions.method,
      headers: requestOptions.headers,
      body: bodyContent || undefined,
    });

    const duration = Date.now() - startTime;

    // Get response headers
    const responseHeaders = {};
    apiResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body
    let responseBody;
    const contentType = apiResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseBody = await apiResponse.json();
    } else {
      responseBody = await apiResponse.text();
    }

    // Log the API proxy request to audit log
    await logAudit(user, 'api_proxy', 'api', null, {
      method,
      path: apiPath,
      adminPath,
      tenantId: tenant_id,
      status: apiResponse.status,
      duration,
    }, clientIp);

    return response(200, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: responseHeaders,
      body: responseBody,
      duration,
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('API Proxy error:', error);

    // Log failed request
    await logAudit(user, 'api_proxy_error', 'api', null, {
      method,
      path: apiPath,
      tenantId: tenant_id,
      error: error.message,
      duration,
    }, clientIp);

    return response(200, {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: { error: error.message || 'Failed to connect to BarkBase API' },
      duration,
    });
  }
}

/**
 * Create a SigV4-signed fetch function for IAM authentication
 * @returns {function} Signed fetch function
 */
function getSignedFetch() {
  const { createSignedFetcher } = require('aws-sigv4-fetch');
  const region = process.env.AWS_REGION || 'us-east-2';
  
  return createSignedFetcher({
    service: 'execute-api',
    region,
  });
}


// =============================================================================
// SUPPORT TICKET HANDLERS
// =============================================================================

/**
 * List support tickets with filters
 */
async function handleListTickets(event, user) {
  const params = event.queryStringParameters || {};
  const { status, priority, assigned_to, portal_id, search, limit = 50, offset = 0 } = params;

  let query = `
    SELECT
      id, ticket_number, portal_id, customer_name, customer_email, business_name,
      subject, status, priority, category, assigned_to, assigned_to_name,
      created_at, updated_at, first_response_at, resolved_at, source
    FROM support_tickets
    WHERE 1=1
  `;
  const queryParams = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND status = $${paramIndex++}`;
    queryParams.push(status);
  }

  if (priority) {
    query += ` AND priority = $${paramIndex++}`;
    queryParams.push(priority);
  }

  if (assigned_to === 'me') {
    query += ` AND assigned_to = $${paramIndex++}`;
    queryParams.push(user.email);
  } else if (assigned_to === 'unassigned') {
    query += ` AND assigned_to IS NULL`;
  } else if (assigned_to) {
    query += ` AND assigned_to = $${paramIndex++}`;
    queryParams.push(assigned_to);
  }

  if (portal_id) {
    query += ` AND portal_id = $${paramIndex++}`;
    queryParams.push(portal_id);
  }

  if (search) {
    query += ` AND (
      subject ILIKE $${paramIndex} OR
      customer_name ILIKE $${paramIndex} OR
      customer_email ILIKE $${paramIndex} OR
      business_name ILIKE $${paramIndex} OR
      ticket_number::text = $${paramIndex + 1}
    )`;
    queryParams.push(`%${search}%`);
    queryParams.push(search.replace('#', ''));
    paramIndex += 2;
  }

  query += ` ORDER BY
    CASE priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(parseInt(limit), parseInt(offset));

  const result = await opsQuery(query, queryParams);

  // Get total count
  let countQuery = `SELECT COUNT(*) FROM support_tickets WHERE 1=1`;
  const countParams = [];
  let countParamIndex = 1;

  if (status) {
    countQuery += ` AND status = $${countParamIndex++}`;
    countParams.push(status);
  }
  if (priority) {
    countQuery += ` AND priority = $${countParamIndex++}`;
    countParams.push(priority);
  }
  if (assigned_to === 'me') {
    countQuery += ` AND assigned_to = $${countParamIndex++}`;
    countParams.push(user.email);
  } else if (assigned_to === 'unassigned') {
    countQuery += ` AND assigned_to IS NULL`;
  }

  const countResult = await opsQuery(countQuery, countParams);

  return response(200, {
    tickets: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}

/**
 * Get single ticket with full details
 */
async function handleGetTicket(event, user) {
  const ticketId = event.path.split('/').pop();

  const result = await opsQuery(`
    SELECT * FROM support_tickets WHERE id = $1
  `, [ticketId]);

  if (result.rows.length === 0) {
    return response(404, { message: 'Ticket not found' });
  }

  const ticket = result.rows[0];

  // Get message count
  const messageCount = await opsQuery(`
    SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = $1
  `, [ticketId]);

  ticket.message_count = parseInt(messageCount.rows[0].count);

  return response(200, { ticket });
}

/**
 * Create new support ticket
 */
async function handleCreateTicket(event, user, clientIp) {
  const body = JSON.parse(event.body || '{}');
  const { portal_id, customer_name, customer_email, business_name, subject, description, priority = 'normal', category, source = 'manual' } = body;

  if (!portal_id || !customer_name || !customer_email || !subject) {
    return response(400, { message: 'Missing required fields: portal_id, customer_name, customer_email, subject' });
  }

  const result = await opsQuery(`
    INSERT INTO support_tickets (
      portal_id, customer_name, customer_email, business_name,
      subject, description, priority, category, source
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [portal_id, customer_name, customer_email, business_name, subject, description, priority, category, source]);

  const ticket = result.rows[0];

  // Create initial activity log
  await opsQuery(`
    INSERT INTO ticket_activity (ticket_id, action, actor_id, actor_name, new_value)
    VALUES ($1, 'created', $2, $3, $4)
  `, [ticket.id, user.email, user.name || user.email, JSON.stringify({ subject, priority, category })]);

  // If description provided, add as first message
  if (description) {
    await opsQuery(`
      INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, sender_email, message)
      VALUES ($1, 'customer', $2, $3, $4, $5)
    `, [ticket.id, portal_id, customer_name, customer_email, description]);
  }

  // Log audit
  await logAudit(user, 'ticket_created', 'ticket', ticket.id, {
    ticket_number: ticket.ticket_number,
    portal_id,
    subject,
  }, clientIp);

  return response(201, { ticket });
}

/**
 * Update ticket (status, priority, assignment, etc.)
 */
async function handleUpdateTicket(event, user, clientIp) {
  const ticketId = event.path.split('/').pop();
  const body = JSON.parse(event.body || '{}');
  const { status, priority, category, assigned_to, assigned_to_name } = body;

  // Get current ticket
  const current = await opsQuery(`SELECT * FROM support_tickets WHERE id = $1`, [ticketId]);
  if (current.rows.length === 0) {
    return response(404, { message: 'Ticket not found' });
  }

  const oldTicket = current.rows[0];
  const updates = [];
  const params = [];
  let paramIndex = 1;
  const activities = [];

  if (status !== undefined && status !== oldTicket.status) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
    activities.push({ action: 'status_changed', old_value: oldTicket.status, new_value: status });

    if (status === 'resolved' && !oldTicket.resolved_at) {
      updates.push(`resolved_at = NOW()`);
    }
    if (status === 'closed' && !oldTicket.closed_at) {
      updates.push(`closed_at = NOW()`);
    }
  }

  if (priority !== undefined && priority !== oldTicket.priority) {
    updates.push(`priority = $${paramIndex++}`);
    params.push(priority);
    activities.push({ action: 'priority_changed', old_value: oldTicket.priority, new_value: priority });
  }

  if (category !== undefined && category !== oldTicket.category) {
    updates.push(`category = $${paramIndex++}`);
    params.push(category);
    activities.push({ action: 'category_changed', old_value: oldTicket.category, new_value: category });
  }

  if (assigned_to !== undefined) {
    if (assigned_to === null) {
      updates.push(`assigned_to = NULL, assigned_to_name = NULL, assigned_at = NULL`);
      activities.push({ action: 'unassigned', old_value: oldTicket.assigned_to, new_value: null });
    } else if (assigned_to !== oldTicket.assigned_to) {
      updates.push(`assigned_to = $${paramIndex++}`);
      params.push(assigned_to);
      updates.push(`assigned_to_name = $${paramIndex++}`);
      params.push(assigned_to_name || assigned_to);
      updates.push(`assigned_at = NOW()`);
      activities.push({ action: 'assigned', old_value: oldTicket.assigned_to, new_value: assigned_to });
    }
  }

  if (updates.length === 0) {
    return response(400, { message: 'No updates provided' });
  }

  updates.push('updated_at = NOW()');
  params.push(ticketId);

  const result = await opsQuery(`
    UPDATE support_tickets
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, params);

  // Log activities
  for (const activity of activities) {
    await opsQuery(`
      INSERT INTO ticket_activity (ticket_id, action, actor_id, actor_name, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [ticketId, activity.action, user.email, user.name || user.email, activity.old_value, activity.new_value]);
  }

  // Log audit
  await logAudit(user, 'ticket_updated', 'ticket', ticketId, {
    ticket_number: oldTicket.ticket_number,
    changes: activities,
  }, clientIp);

  return response(200, { ticket: result.rows[0] });
}

/**
 * Delete ticket (soft delete by setting status to closed)
 */
async function handleDeleteTicket(event, user, clientIp) {
  const ticketId = event.path.split('/').pop();

  const result = await opsQuery(`
    UPDATE support_tickets
    SET status = 'closed', closed_at = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING ticket_number
  `, [ticketId]);

  if (result.rows.length === 0) {
    return response(404, { message: 'Ticket not found' });
  }

  await logAudit(user, 'ticket_closed', 'ticket', ticketId, {
    ticket_number: result.rows[0].ticket_number,
  }, clientIp);

  return response(200, { message: 'Ticket closed' });
}

/**
 * List ticket messages
 */
async function handleListTicketMessages(event, user) {
  const pathParts = event.path.split('/');
  const ticketId = pathParts[pathParts.length - 2];

  const result = await opsQuery(`
    SELECT * FROM ticket_messages
    WHERE ticket_id = $1
    ORDER BY created_at ASC
  `, [ticketId]);

  return response(200, { messages: result.rows });
}

/**
 * Add message to ticket
 */
async function handleCreateTicketMessage(event, user, clientIp) {
  const pathParts = event.path.split('/');
  const ticketId = pathParts[pathParts.length - 2];
  const body = JSON.parse(event.body || '{}');
  const { message, is_internal = false } = body;

  if (!message) {
    return response(400, { message: 'Message is required' });
  }

  // Get ticket to check it exists and update first_response_at
  const ticket = await opsQuery(`SELECT * FROM support_tickets WHERE id = $1`, [ticketId]);
  if (ticket.rows.length === 0) {
    return response(404, { message: 'Ticket not found' });
  }

  const result = await opsQuery(`
    INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, sender_email, message, is_internal)
    VALUES ($1, 'agent', $2, $3, $4, $5, $6)
    RETURNING *
  `, [ticketId, user.email, user.name || user.email, user.email, message, is_internal]);

  // Update first_response_at if this is the first agent response
  if (!ticket.rows[0].first_response_at && !is_internal) {
    await opsQuery(`
      UPDATE support_tickets SET first_response_at = NOW(), updated_at = NOW() WHERE id = $1
    `, [ticketId]);
  } else {
    await opsQuery(`
      UPDATE support_tickets SET updated_at = NOW() WHERE id = $1
    `, [ticketId]);
  }

  // Log activity
  await opsQuery(`
    INSERT INTO ticket_activity (ticket_id, action, actor_id, actor_name, metadata)
    VALUES ($1, $2, $3, $4, $5)
  `, [ticketId, is_internal ? 'internal_note_added' : 'reply_sent', user.email, user.name || user.email, JSON.stringify({ message_id: result.rows[0].id })]);

  return response(201, { message: result.rows[0] });
}

/**
 * List ticket activity
 */
async function handleListTicketActivity(event, user) {
  const pathParts = event.path.split('/');
  const ticketId = pathParts[pathParts.length - 2];

  const result = await opsQuery(`
    SELECT * FROM ticket_activity
    WHERE ticket_id = $1
    ORDER BY created_at DESC
  `, [ticketId]);

  return response(200, { activity: result.rows });
}

/**
 * Get ticket stats
 */
async function handleTicketStats(event, user) {
  const stats = await opsQuery(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open') as open_count,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
      COUNT(*) FILTER (WHERE status = 'pending_customer') as pending_count,
      COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at > NOW() - INTERVAL '24 hours') as resolved_today,
      COUNT(*) FILTER (WHERE assigned_to IS NULL AND status IN ('open', 'in_progress')) as unassigned_count,
      AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600)
        FILTER (WHERE first_response_at IS NOT NULL AND created_at > NOW() - INTERVAL '7 days') as avg_response_hours
    FROM support_tickets
  `);

  return response(200, { stats: stats.rows[0] });
}

/**
 * Lookup portal/tenant info for ticket creation
 */
async function handlePortalLookup(event, user) {
  const portalId = event.path.split('/').pop();

  // Query BarkBase database for tenant info
  const result = await barkbaseQuery(`
    SELECT
      t.id, t.name, t.slug, t.plan, t.created_at,
      (SELECT COUNT(*) FROM "User" WHERE tenant_id = t.id) as user_count,
      (SELECT COUNT(*) FROM "Pet" WHERE tenant_id = t.id) as pet_count,
      u.email as owner_email,
      u.first_name || ' ' || u.last_name as owner_name
    FROM "Tenant" t
    LEFT JOIN "User" u ON u.tenant_id = t.id AND u.role = 'OWNER'
    WHERE t.id = $1
  `, [portalId]);

  if (result.rows.length === 0) {
    return response(404, { message: 'Portal not found' });
  }

  const tenant = result.rows[0];

  return response(200, {
    portal: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      created_at: tenant.created_at,
      user_count: parseInt(tenant.user_count),
      pet_count: parseInt(tenant.pet_count),
      owner_email: tenant.owner_email,
      owner_name: tenant.owner_name,
    }
  });
}

/**
 * Generate impersonation token for support access
 */
async function handleGenerateImpersonationToken(event, user, clientIp) {
  const portalId = event.path.split('/').pop();

  // Verify portal exists
  const tenant = await barkbaseQuery(`
    SELECT id, name, slug FROM "Tenant" WHERE id = $1
  `, [portalId]);

  if (tenant.rows.length === 0) {
    return response(404, { message: 'Portal not found' });
  }

  // Generate JWT token for impersonation
  const jwt = require('jsonwebtoken');
  const secret = process.env.IMPERSONATION_SECRET || process.env.JWT_SECRET || 'barkbase-ops-impersonation-secret';

  const token = jwt.sign({
    type: 'impersonation',
    portalId,
    portalName: tenant.rows[0].name,
    agentId: user.email,
    agentName: user.name || user.email,
    permissions: ['*', '!billing', '!subscription', '!payment_methods'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minute expiry
  }, secret);

  // Log audit
  await logAudit(user, 'impersonation_token_generated', 'tenant', portalId, {
    tenant_name: tenant.rows[0].name,
    tenant_slug: tenant.rows[0].slug,
  }, clientIp);

  // Log to ticket activity if ticket_id provided
  const body = JSON.parse(event.body || '{}');
  if (body.ticket_id) {
    await opsQuery(`
      INSERT INTO ticket_activity (ticket_id, action, actor_id, actor_name, metadata)
      VALUES ($1, 'impersonation_started', $2, $3, $4)
    `, [body.ticket_id, user.email, user.name || user.email, JSON.stringify({ portal_id: portalId })]);
  }

  const barkbaseUrl = process.env.BARKBASE_APP_URL || 'https://app.barkbase.io';

  return response(200, {
    token,
    url: `${barkbaseUrl}/impersonate?token=${token}`,
    expires_in: 1800, // 30 minutes in seconds
  });
}

// =============================================================================
// CUSTOMER 360 HANDLERS
// =============================================================================

/**
 * Get full customer profile with stats
 */
async function handleGetCustomerProfile(event, user, clientIp) {
  const portalId = event.path.split('/').pop();

  // Get tenant info with owner
  const tenantResult = await barkbaseQuery(`
    SELECT
      t.id, t.name, t.slug, t.state, t.plan, t.created_at, t.settings,
      t.trial_ends_at, t.subscription_status,
      u.id as owner_id, u.email as owner_email,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) as owner_name
    FROM "Tenant" t
    LEFT JOIN "User" u ON u.tenant_id = t.id AND u.role = 'OWNER'
    WHERE t.id = $1
  `, [portalId]);

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Customer not found' });
  }

  const tenant = tenantResult.rows[0];

  // Get counts and stats in parallel
  const [
    userCountResult,
    petCountResult,
    bookingCountResult,
    revenueResult,
    activeUsersResult,
    lastActivityResult,
    flagsResult
  ] = await Promise.all([
    barkbaseQuery(`SELECT COUNT(*) FROM "User" WHERE tenant_id = $1`, [portalId]),
    barkbaseQuery(`SELECT COUNT(*) FROM "Pet" WHERE tenant_id = $1`, [portalId]),
    barkbaseQuery(`SELECT COUNT(*) FROM "Booking" WHERE tenant_id = $1`, [portalId]),
    barkbaseQuery(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM "Booking" WHERE tenant_id = $1 AND status = 'completed'
    `, [portalId]),
    barkbaseQuery(`
      SELECT COUNT(*) FROM "User"
      WHERE tenant_id = $1 AND last_login_at >= NOW() - INTERVAL '30 days'
    `, [portalId]),
    barkbaseQuery(`
      SELECT MAX(last_login_at) as last_activity FROM "User" WHERE tenant_id = $1
    `, [portalId]),
    opsQuery(`SELECT * FROM customer_flags WHERE portal_id = $1`, [portalId]),
  ]);

  // Get recent activity
  let recentActivity = [];
  try {
    const activityResult = await barkbaseQuery(`
      SELECT id, action, description, created_at, user_id,
             (SELECT COALESCE(first_name || ' ' || last_name, email) FROM "User" WHERE id = activity_log.user_id) as user_name
      FROM "ActivityLog" activity_log
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [portalId]);
    recentActivity = activityResult.rows;
  } catch (e) {
    // ActivityLog might not exist
  }

  // Get support ticket count
  const ticketCountResult = await opsQuery(`
    SELECT COUNT(*) FROM support_tickets WHERE portal_id = $1
  `, [portalId]);

  // Calculate health score (simple formula)
  const activeUsers = parseInt(activeUsersResult.rows[0].count);
  const totalUsers = parseInt(userCountResult.rows[0].count);
  const bookingCount = parseInt(bookingCountResult.rows[0].count);
  const daysSinceLastActivity = lastActivityResult.rows[0].last_activity
    ? Math.floor((Date.now() - new Date(lastActivityResult.rows[0].last_activity).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  let healthScore = 100;
  if (daysSinceLastActivity > 30) healthScore -= 30;
  else if (daysSinceLastActivity > 14) healthScore -= 15;
  else if (daysSinceLastActivity > 7) healthScore -= 5;

  if (totalUsers > 0 && activeUsers / totalUsers < 0.3) healthScore -= 20;
  if (bookingCount === 0) healthScore -= 20;

  const flagMap = {};
  flagsResult.rows.forEach(f => { flagMap[f.flag_type] = f.flag_value; });

  // Log audit
  await logAudit(user, 'view_customer_profile', 'customer', portalId, {
    tenant_name: tenant.name,
  }, clientIp);

  return response(200, {
    customer: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.state,
      plan: tenant.plan,
      subscriptionStatus: tenant.subscription_status,
      trialEndsAt: tenant.trial_ends_at,
      createdAt: tenant.created_at,
      settings: tenant.settings,
      owner: {
        id: tenant.owner_id,
        email: tenant.owner_email,
        name: tenant.owner_name,
      },
      stats: {
        userCount: parseInt(userCountResult.rows[0].count),
        petCount: parseInt(petCountResult.rows[0].count),
        bookingCount: parseInt(bookingCountResult.rows[0].count),
        totalRevenue: parseFloat(revenueResult.rows[0].total) || 0,
        activeUsers,
        ticketCount: parseInt(ticketCountResult.rows[0].count),
      },
      healthScore: Math.max(0, healthScore),
      lastActivity: lastActivityResult.rows[0].last_activity,
      flags: {
        isVip: flagMap.vip || false,
        isAtRisk: flagMap.at_risk || false,
        isBetaTester: flagMap.beta_tester || false,
        isEnterprise: flagMap.enterprise || false,
      },
      recentActivity,
    },
  });
}

/**
 * Get all users for a customer
 */
async function handleGetCustomerUsers(event, user) {
  const portalId = extractPathParam(event.path, '/admin/customers/', '/users');

  const result = await barkbaseQuery(`
    SELECT
      id, email, first_name, last_name, role, status,
      created_at, last_login_at, phone, avatar_url
    FROM "User"
    WHERE tenant_id = $1
    ORDER BY
      CASE role WHEN 'OWNER' THEN 1 WHEN 'ADMIN' THEN 2 ELSE 3 END,
      created_at ASC
  `, [portalId]);

  return response(200, {
    users: result.rows.map(u => ({
      id: u.id,
      email: u.email,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      status: u.status,
      phone: u.phone,
      avatarUrl: u.avatar_url,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    })),
  });
}

/**
 * Get customer activity log
 */
async function handleGetCustomerActivity(event, user) {
  const portalId = extractPathParam(event.path, '/admin/customers/', '/activity');
  const limit = parseInt(event.queryStringParameters?.limit) || 50;
  const offset = parseInt(event.queryStringParameters?.offset) || 0;

  let activity = [];

  // Try to get from ActivityLog table
  try {
    const result = await barkbaseQuery(`
      SELECT
        al.id, al.action, al.description, al.created_at, al.user_id, al.metadata,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        u.email as user_email
      FROM "ActivityLog" al
      LEFT JOIN "User" u ON al.user_id = u.id
      WHERE al.tenant_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `, [portalId, limit, offset]);
    activity = result.rows;
  } catch (e) {
    // ActivityLog table might not exist
    console.log('ActivityLog not available:', e.message);
  }

  return response(200, { activity });
}

/**
 * Get customer billing info
 */
async function handleGetCustomerBilling(event, user) {
  const portalId = extractPathParam(event.path, '/admin/customers/', '/billing');

  // Get tenant subscription info
  const tenantResult = await barkbaseQuery(`
    SELECT
      plan, subscription_status, trial_ends_at, settings,
      stripe_customer_id, stripe_subscription_id
    FROM "Tenant"
    WHERE id = $1
  `, [portalId]);

  if (tenantResult.rows.length === 0) {
    return response(404, { message: 'Customer not found' });
  }

  const tenant = tenantResult.rows[0];

  // Get recent invoices (if stored locally, otherwise will need Stripe API)
  let invoices = [];
  try {
    const invoiceResult = await barkbaseQuery(`
      SELECT * FROM "Invoice"
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 12
    `, [portalId]);
    invoices = invoiceResult.rows;
  } catch (e) {
    // Invoice table might not exist
  }

  // Calculate MRR from bookings completed this month
  const mrrResult = await barkbaseQuery(`
    SELECT COALESCE(SUM(total_amount), 0) as mrr
    FROM "Booking"
    WHERE tenant_id = $1
    AND status = 'completed'
    AND created_at >= date_trunc('month', CURRENT_DATE)
  `, [portalId]);

  return response(200, {
    billing: {
      plan: tenant.plan,
      subscriptionStatus: tenant.subscription_status,
      trialEndsAt: tenant.trial_ends_at,
      stripeCustomerId: tenant.stripe_customer_id,
      stripeSubscriptionId: tenant.stripe_subscription_id,
      mrr: parseFloat(mrrResult.rows[0].mrr) || 0,
      invoices: invoices.map(inv => ({
        id: inv.id,
        amount: inv.amount,
        status: inv.status,
        dueDate: inv.due_date,
        paidAt: inv.paid_at,
        createdAt: inv.created_at,
      })),
    },
  });
}

/**
 * Get support tickets for a customer
 */
async function handleGetCustomerTickets(event, user) {
  const portalId = extractPathParam(event.path, '/admin/customers/', '/tickets');

  const result = await opsQuery(`
    SELECT
      id, ticket_number, subject, status, priority, category,
      assigned_to, assigned_to_name, created_at, updated_at,
      first_response_at, resolved_at
    FROM support_tickets
    WHERE portal_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [portalId]);

  return response(200, {
    tickets: result.rows,
  });
}

/**
 * Get internal notes for a customer
 */
async function handleGetCustomerNotes(event, user) {
  const portalId = extractPathParam(event.path, '/admin/customers/', '/notes');

  const result = await opsQuery(`
    SELECT id, author_id, author_name, content, note_type, is_pinned, created_at, updated_at
    FROM customer_notes
    WHERE portal_id = $1
    ORDER BY is_pinned DESC, created_at DESC
  `, [portalId]);

  return response(200, {
    notes: result.rows.map(n => ({
      id: n.id,
      authorId: n.author_id,
      authorName: n.author_name,
      content: n.content,
      noteType: n.note_type,
      isPinned: n.is_pinned,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
  });
}

/**
 * Create internal note for a customer
 */
async function handleCreateCustomerNote(event, user, clientIp) {
  const portalId = extractPathParam(event.path, '/admin/customers/', '/notes');
  const body = JSON.parse(event.body || '{}');
  const { content, note_type = 'general', is_pinned = false } = body;

  if (!content) {
    return response(400, { message: 'Content is required' });
  }

  const result = await opsQuery(`
    INSERT INTO customer_notes (portal_id, author_id, author_name, content, note_type, is_pinned)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [portalId, user.email, user.name || user.email, content, note_type, is_pinned]);

  await logAudit(user, 'customer_note_added', 'customer', portalId, {
    note_type,
  }, clientIp);

  const note = result.rows[0];
  return response(201, {
    note: {
      id: note.id,
      authorId: note.author_id,
      authorName: note.author_name,
      content: note.content,
      noteType: note.note_type,
      isPinned: note.is_pinned,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    },
  });
}

/**
 * Get customer flags
 */
async function handleGetCustomerFlags(event, user) {
  const portalId = extractPathParam(event.path, '/admin/customers/', '/flags');

  const result = await opsQuery(`
    SELECT * FROM customer_flags WHERE portal_id = $1
  `, [portalId]);

  const flagMap = {};
  result.rows.forEach(f => {
    flagMap[f.flag_type] = {
      value: f.flag_value,
      setBy: f.set_by,
      setAt: f.set_at,
      notes: f.notes,
    };
  });

  return response(200, { flags: flagMap });
}

/**
 * Update customer flags (VIP, at_risk, etc.)
 */
async function handleUpdateCustomerFlags(event, user, clientIp) {
  const portalId = extractPathParam(event.path, '/admin/customers/', '/flags');
  const body = JSON.parse(event.body || '{}');
  const { flags } = body;

  if (!flags || typeof flags !== 'object') {
    return response(400, { message: 'Flags object is required' });
  }

  const validFlags = ['vip', 'at_risk', 'churned', 'enterprise', 'beta_tester'];
  const updates = [];

  for (const [flagType, value] of Object.entries(flags)) {
    if (!validFlags.includes(flagType)) continue;

    const flagValue = value?.value ?? value;
    const notes = value?.notes || null;

    // Upsert flag
    await opsQuery(`
      INSERT INTO customer_flags (portal_id, flag_type, flag_value, set_by, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (portal_id, flag_type)
      DO UPDATE SET flag_value = $3, set_by = $4, set_at = NOW(), notes = $5
    `, [portalId, flagType, flagValue, user.email, notes]);

    updates.push({ flagType, value: flagValue });
  }

  await logAudit(user, 'customer_flags_updated', 'customer', portalId, {
    updates,
  }, clientIp);

  return response(200, { success: true, updates });
}

// =========================================================================
// White-Label Handlers
// =========================================================================

/**
 * Get white-label stats
 */
async function handleWhiteLabelStats(event, user) {
  const [configuredResult, domainsResult, pendingResult, recentResult] = await Promise.all([
    opsQuery(`SELECT COUNT(*) FROM white_label_branding WHERE config_status != 'not_started'`),
    opsQuery(`SELECT COUNT(*) FROM white_label_branding WHERE domain_verified = true`),
    opsQuery(`SELECT COUNT(*) FROM white_label_branding WHERE custom_domain IS NOT NULL AND domain_verified = false`),
    opsQuery(`SELECT COUNT(*) FROM white_label_branding WHERE updated_at >= NOW() - INTERVAL '7 days'`),
  ]);

  return response(200, {
    stats: {
      configuredTenants: parseInt(configuredResult.rows[0].count),
      customDomains: parseInt(domainsResult.rows[0].count),
      pendingVerification: parseInt(pendingResult.rows[0].count),
      recentlyUpdated: parseInt(recentResult.rows[0].count),
    },
  });
}

/**
 * List all white-label tenants
 */
async function handleListWhiteLabelTenants(event, user) {
  const result = await opsQuery(`
    SELECT
      id, tenant_id, tenant_name, tenant_subdomain,
      config_status, completeness_percentage,
      custom_domain, domain_verified, domain_ssl_status,
      updated_at
    FROM white_label_branding
    ORDER BY updated_at DESC NULLS LAST
  `);

  const tenants = result.rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.tenant_name,
    subdomain: row.tenant_subdomain,
    configStatus: row.config_status,
    completeness: row.completeness_percentage,
    customDomain: row.custom_domain,
    domainStatus: row.domain_verified ? 'verified' : (row.custom_domain ? 'pending' : 'none'),
    domainSslStatus: row.domain_ssl_status,
    updatedAt: row.updated_at,
  }));

  return response(200, { tenants });
}

/**
 * Get white-label branding for a tenant
 */
async function handleGetWhiteLabelBranding(event, user) {
  const tenantId = extractPathParam(event.path, '/admin/white-label/');

  const result = await opsQuery(`
    SELECT * FROM white_label_branding WHERE tenant_id = $1
  `, [tenantId]);

  if (result.rows.length === 0) {
    // Return default branding if none exists
    return response(200, {
      branding: {
        tenantId,
        logoLightUrl: null,
        logoDarkUrl: null,
        faviconUrl: null,
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b',
        accentColor: '#8b5cf6',
        customDomain: null,
        domainVerified: false,
        domainSslStatus: 'pending',
        emailFromName: null,
        emailReplyTo: null,
        emailHeaderLogoUrl: null,
        emailFooterMarkdown: null,
        loginBackgroundUrl: null,
        loginWelcomeMessage: null,
        customCss: null,
        appIconUrl: null,
        splashScreenUrl: null,
        mobileThemeColors: null,
      },
    });
  }

  const row = result.rows[0];
  return response(200, {
    branding: {
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      tenantSubdomain: row.tenant_subdomain,
      logoLightUrl: row.logo_light_url,
      logoDarkUrl: row.logo_dark_url,
      faviconUrl: row.favicon_url,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      accentColor: row.accent_color,
      customDomain: row.custom_domain,
      domainVerified: row.domain_verified,
      domainSslStatus: row.domain_ssl_status,
      emailFromName: row.email_from_name,
      emailReplyTo: row.email_reply_to,
      emailHeaderLogoUrl: row.email_header_logo_url,
      emailFooterMarkdown: row.email_footer_markdown,
      loginBackgroundUrl: row.login_background_url,
      loginWelcomeMessage: row.login_welcome_message,
      customCss: row.custom_css,
      appIconUrl: row.app_icon_url,
      splashScreenUrl: row.splash_screen_url,
      mobileThemeColors: row.mobile_theme_colors,
      configStatus: row.config_status,
      completeness: row.completeness_percentage,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by_name || row.updated_by,
    },
  });
}

/**
 * Update white-label branding for a tenant
 */
async function handleUpdateWhiteLabelBranding(event, user, clientIp) {
  const tenantId = extractPathParam(event.path, '/admin/white-label/');
  const body = JSON.parse(event.body || '{}');

  // Get tenant info from barkbase
  const tenantResult = await barkbaseQuery(
    `SELECT id, name, slug FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );

  const tenantName = tenantResult.rows[0]?.name || body.tenantName;
  const tenantSubdomain = tenantResult.rows[0]?.slug || body.tenantSubdomain;

  // Check if branding exists
  const existingResult = await opsQuery(
    `SELECT id FROM white_label_branding WHERE tenant_id = $1`,
    [tenantId]
  );

  const fieldMappings = {
    logoLightUrl: 'logo_light_url',
    logoDarkUrl: 'logo_dark_url',
    faviconUrl: 'favicon_url',
    primaryColor: 'primary_color',
    secondaryColor: 'secondary_color',
    accentColor: 'accent_color',
    customDomain: 'custom_domain',
    emailFromName: 'email_from_name',
    emailReplyTo: 'email_reply_to',
    emailHeaderLogoUrl: 'email_header_logo_url',
    emailFooterMarkdown: 'email_footer_markdown',
    loginBackgroundUrl: 'login_background_url',
    loginWelcomeMessage: 'login_welcome_message',
    customCss: 'custom_css',
    appIconUrl: 'app_icon_url',
    splashScreenUrl: 'splash_screen_url',
    mobileThemeColors: 'mobile_theme_colors',
  };

  let result;
  let oldValues = {};

  if (existingResult.rows.length === 0) {
    // Insert new branding
    const columns = ['tenant_id', 'tenant_name', 'tenant_subdomain', 'created_by', 'created_by_name', 'updated_by', 'updated_by_name'];
    const values = [tenantId, tenantName, tenantSubdomain, user.email, user.name || user.email, user.email, user.name || user.email];
    let paramIndex = values.length;

    for (const [jsKey, dbKey] of Object.entries(fieldMappings)) {
      if (body[jsKey] !== undefined) {
        columns.push(dbKey);
        values.push(jsKey === 'mobileThemeColors' ? JSON.stringify(body[jsKey]) : body[jsKey]);
        paramIndex++;
      }
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    result = await opsQuery(
      `INSERT INTO white_label_branding (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
  } else {
    // Get current values for history
    const currentResult = await opsQuery(`SELECT * FROM white_label_branding WHERE tenant_id = $1`, [tenantId]);
    const current = currentResult.rows[0];

    // Build update query
    const updates = ['updated_by = $1', 'updated_by_name = $2'];
    const values = [user.email, user.name || user.email];
    let paramIndex = 3;

    for (const [jsKey, dbKey] of Object.entries(fieldMappings)) {
      if (body[jsKey] !== undefined) {
        updates.push(`${dbKey} = $${paramIndex}`);
        values.push(jsKey === 'mobileThemeColors' ? JSON.stringify(body[jsKey]) : body[jsKey]);
        paramIndex++;

        // Track old values for history
        const currentDbKey = dbKey;
        oldValues[jsKey] = current[currentDbKey];
      }
    }

    values.push(tenantId);
    result = await opsQuery(
      `UPDATE white_label_branding SET ${updates.join(', ')} WHERE tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    // Log history for changed fields
    for (const [jsKey, dbKey] of Object.entries(fieldMappings)) {
      if (body[jsKey] !== undefined) {
        const oldVal = oldValues[jsKey];
        const newVal = body[jsKey];
        if (oldVal !== newVal) {
          const fieldLabel = jsKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          await opsQuery(`
            INSERT INTO white_label_history (branding_id, tenant_id, field_name, old_value, new_value, changed_by, changed_by_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            result.rows[0].id,
            tenantId,
            fieldLabel,
            oldVal ? String(oldVal) : null,
            newVal ? String(newVal) : null,
            user.email,
            user.name || user.email,
          ]);
        }
      }
    }
  }

  await logAudit(user, 'update_white_label', 'white_label', tenantId, {
    fields: Object.keys(body),
  }, clientIp);

  const row = result.rows[0];
  return response(200, {
    branding: {
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      tenantSubdomain: row.tenant_subdomain,
      logoLightUrl: row.logo_light_url,
      logoDarkUrl: row.logo_dark_url,
      faviconUrl: row.favicon_url,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      accentColor: row.accent_color,
      customDomain: row.custom_domain,
      domainVerified: row.domain_verified,
      domainSslStatus: row.domain_ssl_status,
      emailFromName: row.email_from_name,
      emailReplyTo: row.email_reply_to,
      emailHeaderLogoUrl: row.email_header_logo_url,
      emailFooterMarkdown: row.email_footer_markdown,
      loginBackgroundUrl: row.login_background_url,
      loginWelcomeMessage: row.login_welcome_message,
      customCss: row.custom_css,
      appIconUrl: row.app_icon_url,
      splashScreenUrl: row.splash_screen_url,
      mobileThemeColors: row.mobile_theme_colors,
      configStatus: row.config_status,
      completeness: row.completeness_percentage,
      updatedAt: row.updated_at,
    },
  });
}

/**
 * Get white-label change history
 */
async function handleGetWhiteLabelHistory(event, user) {
  const tenantId = extractPathParam(event.path, '/admin/white-label/', '/history');

  const result = await opsQuery(`
    SELECT id, field_name, old_value, new_value, changed_by, changed_by_name, changed_at
    FROM white_label_history
    WHERE tenant_id = $1
    ORDER BY changed_at DESC
    LIMIT 50
  `, [tenantId]);

  return response(200, {
    history: result.rows.map(row => ({
      id: row.id,
      field: row.field_name,
      oldValue: row.old_value,
      newValue: row.new_value,
      changedBy: row.changed_by_name || row.changed_by,
      changedAt: row.changed_at,
    })),
  });
}

/**
 * Verify custom domain DNS
 */
async function handleVerifyWhiteLabelDomain(event, user, clientIp) {
  const tenantId = extractPathParam(event.path, '/admin/white-label/', '/verify-domain');

  // Get current branding
  const currentResult = await opsQuery(
    `SELECT id, custom_domain FROM white_label_branding WHERE tenant_id = $1`,
    [tenantId]
  );

  if (currentResult.rows.length === 0 || !currentResult.rows[0].custom_domain) {
    return response(400, { message: 'No custom domain configured' });
  }

  const brandingId = currentResult.rows[0].id;
  const customDomain = currentResult.rows[0].custom_domain;

  // In production, you would actually verify DNS here
  // For now, we simulate verification
  const verified = true; // TODO: Implement actual DNS verification

  if (verified) {
    await opsQuery(`
      UPDATE white_label_branding
      SET domain_verified = true, domain_verified_at = NOW(), domain_ssl_status = 'provisioning',
          updated_by = $1, updated_by_name = $2
      WHERE tenant_id = $3
    `, [user.email, user.name || user.email, tenantId]);

    // Log history
    await opsQuery(`
      INSERT INTO white_label_history (branding_id, tenant_id, field_name, old_value, new_value, changed_by, changed_by_name)
      VALUES ($1, $2, 'Domain Verification', 'pending', 'verified', $3, $4)
    `, [brandingId, tenantId, user.email, user.name || user.email]);

    // Simulate SSL provisioning completing
    setTimeout(async () => {
      try {
        await opsQuery(`
          UPDATE white_label_branding
          SET domain_ssl_status = 'active', domain_ssl_provisioned_at = NOW()
          WHERE tenant_id = $1
        `, [tenantId]);
      } catch (e) {
        console.error('Error updating SSL status:', e);
      }
    }, 5000);

    await logAudit(user, 'verify_white_label_domain', 'white_label', tenantId, {
      domain: customDomain,
    }, clientIp);

    return response(200, {
      verified: true,
      sslStatus: 'provisioning',
      message: 'Domain verified successfully. SSL certificate is being provisioned.',
    });
  } else {
    return response(400, {
      verified: false,
      message: 'DNS verification failed. Please ensure the required DNS records are properly configured.',
    });
  }
}
