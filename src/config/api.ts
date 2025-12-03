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

  // Incident endpoints
  incidents: '/admin/incidents',
  incident: (id: string) => `/admin/incidents/${id}`,
  incidentUpdates: (id: string) => `/admin/incidents/${id}/updates`,

  // Public status endpoints (no auth)
  status: '/status',
  statusBanner: '/status/banner',
} as const;
