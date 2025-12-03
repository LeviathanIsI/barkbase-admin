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
} from '@/types';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = apiConfig.baseUrl;
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

  // Public status endpoints (no auth)
  async getStatus(): Promise<StatusResponse> {
    return this.request(API_ENDPOINTS.status, {}, false);
  }

  async getStatusBanner(): Promise<StatusBanner> {
    return this.request(API_ENDPOINTS.statusBanner, {}, false);
  }
}

export const api = new ApiClient();
