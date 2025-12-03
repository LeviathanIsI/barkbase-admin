import { apiConfig, API_ENDPOINTS } from '@/config/api';
import { getIdToken } from './auth';
import type {
  SearchResult,
  TenantDetail,
  TenantUser,
  Incident,
  IncidentWithUpdates,
  IncidentUpdate,
  CreateIncidentInput,
  UpdateIncidentInput,
  CreateIncidentUpdateInput,
  StatusResponse,
  StatusBanner,
  LambdaHealth,
  ApiHealth,
  DatabaseHealth,
  HealthAlert,
  HealthAlertsSummary,
  AuditLogResponse,
  ScheduledMaintenance,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  Broadcast,
  CreateBroadcastInput,
  UpdateBroadcastInput,
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  FeatureFlagOverride,
} from '@/types';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = apiConfig.baseUrl;
  }

  private getImpersonationTenantId(): string | null {
    try {
      const stored = localStorage.getItem('impersonation');
      if (stored) {
        const { tenant, expiresAt } = JSON.parse(stored);
        if (new Date(expiresAt) > new Date()) {
          return tenant.id;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async getHeaders(requireAuth = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      const token = await getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add impersonation header if active
      const impersonatedTenantId = this.getImpersonationTenantId();
      if (impersonatedTenantId) {
        headers['X-Impersonate-Tenant'] = impersonatedTenantId;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true
  ): Promise<T> {
    const headers = await this.getHeaders(requireAuth);
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Support endpoints
  async search(query: string): Promise<{ results: SearchResult[] }> {
    return this.request(`${API_ENDPOINTS.search}?q=${encodeURIComponent(query)}`);
  }

  async getTenant(tenantId: string): Promise<TenantDetail> {
    return this.request(API_ENDPOINTS.tenant(tenantId));
  }

  async getTenantUsers(tenantId: string): Promise<{ users: TenantUser[] }> {
    return this.request(API_ENDPOINTS.tenantUsers(tenantId));
  }

  async suspendTenant(tenantId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.tenantSuspend(tenantId), {
      method: 'POST',
    });
  }

  async unsuspendTenant(tenantId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.tenantUnsuspend(tenantId), {
      method: 'POST',
    });
  }

  async extendTrial(tenantId: string, days: number): Promise<{ success: boolean; newEndDate: string }> {
    return this.request(API_ENDPOINTS.tenantExtendTrial(tenantId), {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  }

  async resetUserPassword(tenantId: string, userId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.userResetPassword(tenantId, userId), {
      method: 'POST',
    });
  }

  // Incident endpoints
  async getIncidents(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ incidents: Incident[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.incidents}?${query}` : API_ENDPOINTS.incidents;
    return this.request(endpoint);
  }

  async getIncident(id: string): Promise<IncidentWithUpdates> {
    return this.request(API_ENDPOINTS.incident(id));
  }

  async createIncident(data: CreateIncidentInput): Promise<Incident> {
    return this.request(API_ENDPOINTS.incidents, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIncident(id: string, data: UpdateIncidentInput): Promise<Incident> {
    return this.request(API_ENDPOINTS.incident(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addIncidentUpdate(
    incidentId: string,
    data: CreateIncidentUpdateInput
  ): Promise<IncidentUpdate> {
    return this.request(API_ENDPOINTS.incidentUpdates(incidentId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health monitoring endpoints
  async getHealthLambdas(): Promise<{ lambdas: LambdaHealth[] }> {
    return this.request(API_ENDPOINTS.healthLambdas);
  }

  async getHealthApi(): Promise<ApiHealth> {
    return this.request(API_ENDPOINTS.healthApi);
  }

  async getHealthDatabase(): Promise<{ ops: DatabaseHealth; barkbase: DatabaseHealth }> {
    return this.request(API_ENDPOINTS.healthDatabase);
  }

  async getHealthAlerts(): Promise<{ alerts: HealthAlert[]; summary: HealthAlertsSummary }> {
    return this.request(API_ENDPOINTS.healthAlerts);
  }

  // Audit log endpoints
  async getAuditLogs(params?: {
    page?: number;
    action?: string;
    admin?: string;
    targetType?: string;
    from?: string;
    to?: string;
  }): Promise<AuditLogResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.action) searchParams.set('action', params.action);
    if (params?.admin) searchParams.set('admin', params.admin);
    if (params?.targetType) searchParams.set('target_type', params.targetType);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);

    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.auditLogs}?${query}` : API_ENDPOINTS.auditLogs;
    return this.request(endpoint);
  }

  // Public status endpoints (no auth)
  async getStatus(): Promise<StatusResponse> {
    return this.request(API_ENDPOINTS.status, {}, false);
  }

  async getStatusBanner(): Promise<StatusBanner> {
    return this.request(API_ENDPOINTS.statusBanner, {}, false);
  }

  // Impersonation endpoints
  async startImpersonation(tenantId: string, reason: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.impersonateStart(tenantId), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async endImpersonation(tenantId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.impersonateEnd(tenantId), {
      method: 'POST',
    });
  }

  // Maintenance endpoints
  async getMaintenanceList(): Promise<{ maintenance: ScheduledMaintenance[] }> {
    return this.request(API_ENDPOINTS.maintenance);
  }

  async getMaintenance(id: string): Promise<ScheduledMaintenance> {
    return this.request(API_ENDPOINTS.maintenanceItem(id));
  }

  async createMaintenance(data: CreateMaintenanceInput): Promise<ScheduledMaintenance> {
    return this.request(API_ENDPOINTS.maintenance, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaintenance(id: string, data: UpdateMaintenanceInput): Promise<ScheduledMaintenance> {
    return this.request(API_ENDPOINTS.maintenanceItem(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMaintenance(id: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.maintenanceItem(id), {
      method: 'DELETE',
    });
  }

  // Broadcast endpoints
  async getBroadcasts(): Promise<{ broadcasts: Broadcast[] }> {
    return this.request(API_ENDPOINTS.broadcasts);
  }

  async getBroadcast(id: string): Promise<Broadcast> {
    return this.request(API_ENDPOINTS.broadcast(id));
  }

  async createBroadcast(data: CreateBroadcastInput): Promise<Broadcast> {
    return this.request(API_ENDPOINTS.broadcasts, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBroadcast(id: string, data: UpdateBroadcastInput): Promise<Broadcast> {
    return this.request(API_ENDPOINTS.broadcast(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBroadcast(id: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.broadcast(id), {
      method: 'DELETE',
    });
  }

  // Public broadcasts endpoint
  async getActiveBroadcasts(): Promise<{ broadcasts: Broadcast[] }> {
    return this.request(API_ENDPOINTS.statusBroadcasts, {}, false);
  }

  // Feature flags endpoints
  async getFeatureFlags(): Promise<{ flags: FeatureFlag[] }> {
    return this.request(API_ENDPOINTS.featureFlags);
  }

  async getFeatureFlag(id: string): Promise<FeatureFlag & { overrides: FeatureFlagOverride[] }> {
    return this.request(API_ENDPOINTS.featureFlag(id));
  }

  async createFeatureFlag(data: CreateFeatureFlagInput): Promise<FeatureFlag> {
    return this.request(API_ENDPOINTS.featureFlags, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFeatureFlag(id: string, data: UpdateFeatureFlagInput): Promise<FeatureFlag> {
    return this.request(API_ENDPOINTS.featureFlag(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFeatureFlag(id: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.featureFlag(id), {
      method: 'DELETE',
    });
  }

  async addFeatureFlagOverride(flagId: string, tenantId: string, isEnabled: boolean): Promise<FeatureFlagOverride> {
    return this.request(API_ENDPOINTS.featureFlagOverrides(flagId), {
      method: 'POST',
      body: JSON.stringify({ tenantId, isEnabled }),
    });
  }

  async removeFeatureFlagOverride(flagId: string, overrideId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.featureFlagOverride(flagId, overrideId), {
      method: 'DELETE',
    });
  }

  // Public feature flags endpoint (for BarkBase app)
  async getTenantFeatures(tenantId: string): Promise<{ features: string[] }> {
    return this.request(`${API_ENDPOINTS.publicFeatures}?tenant_id=${tenantId}`, {}, false);
  }
}

export const api = new ApiClient();
