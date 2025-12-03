/**
 * BarkBase Public Status API
 *
 * Handles public status endpoints (NO AUTHENTICATION):
 * - GET /status - Current system status with components
 * - GET /status/banner - Banner info for BarkBase app
 */

const { opsQuery } = require('/opt/nodejs/index');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const path = event.requestContext?.http?.path || event.path;

  try {
    if (path === '/status/banner') {
      return await handleStatusBanner();
    }

    if (path === '/status') {
      return await handleStatus();
    }

    return response(404, { message: 'Not found' });
  } catch (error) {
    console.error('Status API error:', error);
    return response(500, { message: 'Internal server error' });
  }
};

async function handleStatus() {
  // Get all components
  const componentsResult = await opsQuery(
    `SELECT name, display_name, description, display_order FROM system_components ORDER BY display_order`
  );

  // Get active incidents
  const incidentsResult = await opsQuery(
    `SELECT i.*, array_agg(ic.component_name) FILTER (WHERE ic.component_name IS NOT NULL) as components
     FROM incidents i
     LEFT JOIN incident_components ic ON i.id = ic.incident_id
     WHERE i.status != 'resolved'
     GROUP BY i.id
     ORDER BY i.created_at DESC`
  );

  // Build component status map based on active incidents
  const componentStatusMap = {};
  for (const incident of incidentsResult.rows) {
    const incidentComponents = incident.components || [];
    for (const componentName of incidentComponents) {
      const currentStatus = componentStatusMap[componentName];
      const incidentSeverity = incident.severity;

      // Upgrade status if this incident is more severe
      if (!currentStatus || severityPriority(incidentSeverity) > severityPriority(currentStatus)) {
        componentStatusMap[componentName] = incidentSeverity;
      }
    }
  }

  // Build component list with status
  const components = componentsResult.rows.map(c => ({
    name: c.name,
    displayName: c.display_name,
    status: componentStatusMap[c.name] || 'operational',
  }));

  // Determine overall status (worst severity among all incidents)
  let overallStatus = 'operational';
  for (const incident of incidentsResult.rows) {
    if (severityPriority(incident.severity) > severityPriority(overallStatus)) {
      overallStatus = incident.severity;
    }
  }

  // Format active incidents for public display
  const activeIncidents = incidentsResult.rows.map(i => ({
    id: i.id,
    title: i.title,
    severity: i.severity,
    status: i.status,
    customerMessage: i.customer_message,
    components: i.components || [],
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  }));

  return response(200, {
    status: overallStatus,
    components,
    activeIncidents,
  });
}

async function handleStatusBanner() {
  // Get the most severe active incident for the banner
  const result = await opsQuery(
    `SELECT id, title, severity, customer_message
     FROM incidents
     WHERE status != 'resolved'
     ORDER BY
       CASE severity
         WHEN 'major_outage' THEN 3
         WHEN 'partial_outage' THEN 2
         WHEN 'degraded' THEN 1
         ELSE 0
       END DESC,
       created_at DESC
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    return response(200, { active: false });
  }

  const incident = result.rows[0];
  return response(200, {
    active: true,
    severity: incident.severity,
    message: incident.customer_message,
    url: `/status`, // Relative URL to status page
  });
}

function severityPriority(severity) {
  switch (severity) {
    case 'major_outage':
      return 3;
    case 'partial_outage':
      return 2;
    case 'degraded':
      return 1;
    default:
      return 0;
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60', // Cache for 1 minute
    },
    body: JSON.stringify(body),
  };
}
