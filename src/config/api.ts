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

  // Incident endpoints
  incidents: '/admin/incidents',
  incident: (id: string) => `/admin/incidents/${id}`,
  incidentUpdates: (id: string) => `/admin/incidents/${id}/updates`,

  // Health monitoring endpoints
  healthLambdas: '/admin/health/lambdas',
  healthApi: '/admin/health/api',
  healthDatabase: '/admin/health/database',
  healthAlerts: '/admin/health/alerts',

  // Audit log endpoints
  auditLogs: '/admin/audit-logs',

  // Maintenance endpoints
  maintenance: '/admin/maintenance',
  maintenanceItem: (id: string) => `/admin/maintenance/${id}`,

  // Broadcast endpoints
  broadcasts: '/admin/broadcasts',
  broadcast: (id: string) => `/admin/broadcasts/${id}`,

  // Feature flags endpoints
  featureFlags: '/admin/feature-flags',
  featureFlag: (id: string) => `/admin/feature-flags/${id}`,
  featureFlagOverrides: (flagId: string) => `/admin/feature-flags/${flagId}/overrides`,
  featureFlagOverride: (flagId: string, overrideId: string) => `/admin/feature-flags/${flagId}/overrides/${overrideId}`,

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
} as const;
