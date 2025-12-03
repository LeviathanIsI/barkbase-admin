export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
};

export const API_ENDPOINTS = {
  // Support endpoints
  search: '/admin/search',
  tenant: (id: string) => `/admin/tenants/${id}`,
  tenantUsers: (id: string) => `/admin/tenants/${id}/users`,

  // Tenant admin actions
  tenantSuspend: (id: string) => `/admin/tenants/${id}/suspend`,
  tenantUnsuspend: (id: string) => `/admin/tenants/${id}/unsuspend`,
  tenantExtendTrial: (id: string) => `/admin/tenants/${id}/extend-trial`,
  userResetPassword: (tenantId: string, userId: string) =>
    `/admin/tenants/${tenantId}/users/${userId}/reset-password`,

  // Impersonation endpoints
  impersonateStart: (tenantId: string) => `/admin/tenants/${tenantId}/impersonate/start`,
  impersonateEnd: (tenantId: string) => `/admin/tenants/${tenantId}/impersonate/end`,

  // Incident endpoints - Enhanced
  incidents: '/admin/incidents',
  incidentStats: '/admin/incidents/stats',
  incident: (id: string) => `/admin/incidents/${id}`,
  incidentUpdates: (id: string) => `/admin/incidents/${id}/updates`,
  incidentAffected: (id: string) => `/admin/incidents/${id}/affected`,
  incidentAffectedCustomer: (id: string, customerId: string) => `/admin/incidents/${id}/affected/${customerId}`,
  incidentNotify: (id: string) => `/admin/incidents/${id}/notify`,
  incidentPostmortem: (id: string) => `/admin/incidents/${id}/postmortem`,
  incidentPostmortemPublish: (id: string) => `/admin/incidents/${id}/postmortem/publish`,
  postmortemActions: (postmortemId: string) => `/admin/postmortems/${postmortemId}/actions`,
  postmortemAction: (postmortemId: string, actionId: string) => `/admin/postmortems/${postmortemId}/actions/${actionId}`,

  // Command Center endpoints
  commandCenterOverview: '/admin/command-center/overview',
  commandCenterServices: '/admin/command-center/services',
  commandCenterMetrics: '/admin/command-center/metrics',
  commandCenterLambdas: '/admin/command-center/lambdas',
  commandCenterLambdaMetrics: (name: string) => `/admin/command-center/lambdas/${name}/metrics`,
  commandCenterLambdaErrors: (name: string) => `/admin/command-center/lambdas/${name}/errors`,
  commandCenterDatabase: '/admin/command-center/database',
  commandCenterApiTraffic: '/admin/command-center/api-traffic',
  commandCenterErrors: '/admin/command-center/errors',
  commandCenterErrorDetails: (id: string) => `/admin/command-center/errors/${id}`,
  commandCenterTenantsActivity: '/admin/command-center/tenants-activity',

  // Legacy health monitoring endpoints
  healthLambdas: '/admin/health/lambdas',
  healthApi: '/admin/health/api',
  healthDatabase: '/admin/health/database',
  healthAlerts: '/admin/health/alerts',

  // Audit log endpoints
  auditLogs: '/admin/audit-logs',

  // Maintenance endpoints
  maintenance: '/admin/maintenance',
  maintenanceStats: '/admin/maintenance/stats',
  maintenanceItem: (id: string) => `/admin/maintenance/${id}`,
  maintenanceStart: (id: string) => `/admin/maintenance/${id}/start`,
  maintenanceComplete: (id: string) => `/admin/maintenance/${id}/complete`,
  maintenanceExtend: (id: string) => `/admin/maintenance/${id}/extend`,
  maintenanceCancel: (id: string) => `/admin/maintenance/${id}/cancel`,
  maintenanceUpdates: (id: string) => `/admin/maintenance/${id}/updates`,
  maintenanceNotify: (id: string) => `/admin/maintenance/${id}/notify`,
  maintenanceNotifications: (id: string) => `/admin/maintenance/${id}/notifications`,
  maintenanceAffected: (id: string) => `/admin/maintenance/${id}/affected`,
  maintenanceAffectedCustomer: (id: string, customerId: string) => `/admin/maintenance/${id}/affected/${customerId}`,
  maintenanceSkip: (id: string) => `/admin/maintenance/${id}/skip`,
  maintenanceDisable: (id: string) => `/admin/maintenance/${id}/disable`,

  // Broadcast endpoints - Enhanced Enterprise
  broadcasts: '/admin/broadcasts',
  broadcastStats: '/admin/broadcasts/stats',
  broadcast: (id: string) => `/admin/broadcasts/${id}`,
  broadcastSend: (id: string) => `/admin/broadcasts/${id}/send`,
  broadcastSchedule: (id: string) => `/admin/broadcasts/${id}/schedule`,
  broadcastCancel: (id: string) => `/admin/broadcasts/${id}/cancel`,
  broadcastEnd: (id: string) => `/admin/broadcasts/${id}/end`,
  broadcastAnalytics: (id: string) => `/admin/broadcasts/${id}/analytics`,
  broadcastRecipients: (id: string) => `/admin/broadcasts/${id}/recipients`,
  broadcastPreview: (id: string) => `/admin/broadcasts/${id}/preview`,
  broadcastPreviewBanner: (id: string) => `/admin/broadcasts/${id}/preview/banner`,
  broadcastAudienceEstimate: '/admin/broadcasts/audience/estimate',

  // Feature flags endpoints - Enterprise
  featureFlags: '/admin/feature-flags',
  featureFlagStats: '/admin/feature-flags/stats',
  featureFlag: (id: string) => `/admin/feature-flags/${id}`,
  featureFlagToggle: (id: string) => `/admin/feature-flags/${id}/toggle`,
  featureFlagRollout: (id: string) => `/admin/feature-flags/${id}/rollout`,
  featureFlagKill: (id: string) => `/admin/feature-flags/${id}/kill`,
  featureFlagArchive: (id: string) => `/admin/feature-flags/${id}/archive`,
  featureFlagTenants: (id: string) => `/admin/feature-flags/${id}/tenants`,
  featureFlagTenantOverride: (id: string, tenantId: string) => `/admin/feature-flags/${id}/tenants/${tenantId}`,
  featureFlagHistory: (id: string) => `/admin/feature-flags/${id}/history`,
  featureFlagEvaluate: (tenantId: string) => `/api/v1/feature-flags/${tenantId}`,
  featureFlagEvaluateOne: (tenantId: string, flagKey: string) => `/api/v1/feature-flags/${tenantId}/${flagKey}`,

  // Public status endpoints (no auth)
  status: '/status',
  statusBanner: '/status/banner',
  statusBroadcasts: '/status/broadcasts',
  statusMaintenance: '/status/maintenance',
  publicFeatures: '/api/features',

  // Analytics endpoints
  analytics: '/admin/analytics',

  // Settings endpoints
  settings: '/admin/settings',

  // API Keys endpoints
  apiKeys: '/admin/api-keys',
  apiKey: (id: string) => `/admin/api-keys/${id}`,

  // API Proxy endpoint
  apiProxy: '/admin/api-proxy',

  // Database explorer endpoints
  dbTables: '/admin/db/tables',
  dbSchema: (table: string) => `/admin/db/tables/${table}/schema`,
  dbQuery: '/admin/db/query',
  savedQueries: '/admin/db/queries',
  savedQuery: (id: string) => `/admin/db/queries/${id}`,

  // Tenants list (for selectors)
  tenants: '/admin/tenants',

  // Support ticket endpoints
  tickets: '/admin/tickets',
  ticket: (id: string) => `/admin/tickets/${id}`,
  ticketMessages: (id: string) => `/admin/tickets/${id}/messages`,
  ticketActivity: (id: string) => `/admin/tickets/${id}/activity`,
  ticketStats: '/admin/tickets/stats',
  portalLookup: (portalId: string) => `/admin/lookup/portal/${portalId}`,
  generateImpersonationToken: (portalId: string) => `/admin/impersonate/${portalId}`,

  // Customer 360 endpoints
  customer: (portalId: string) => `/admin/customers/${portalId}`,
  customerUsers: (portalId: string) => `/admin/customers/${portalId}/users`,
  customerActivity: (portalId: string) => `/admin/customers/${portalId}/activity`,
  customerBilling: (portalId: string) => `/admin/customers/${portalId}/billing`,
  customerTickets: (portalId: string) => `/admin/customers/${portalId}/tickets`,
  customerNotes: (portalId: string) => `/admin/customers/${portalId}/notes`,
  customerFlags: (portalId: string) => `/admin/customers/${portalId}/flags`,

  // White-label endpoints
  whiteLabel: '/admin/white-label',
  whiteLabelStats: '/admin/white-label/stats',
  whiteLabelBranding: (tenantId: string) => `/admin/white-label/${tenantId}`,
  whiteLabelHistory: (tenantId: string) => `/admin/white-label/${tenantId}/history`,
  whiteLabelVerifyDomain: (tenantId: string) => `/admin/white-label/${tenantId}/verify-domain`,
} as const;
