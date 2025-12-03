import { apiConfig, API_ENDPOINTS } from '@/config/api';
import { getIdToken } from './auth';
import type {
  SupportTicket,
  TicketMessage,
  TicketActivity,
  TicketStats,
  CreateTicketInput,
  UpdateTicketInput,
  PortalLookup,
  ImpersonationToken,
  SearchResult,
  TenantDetail,
  TenantUser,
  Tenant,
  Incident,
  IncidentUpdate,
  IncidentStats,
  IncidentAffectedCustomer,
  IncidentPostmortem,
  PostmortemActionItem,
  CreateIncidentInput,
  UpdateIncidentInput,
  CreateIncidentUpdateInput,
  SavePostmortemInput,
  CreateActionItemInput,
  UpdateActionItemInput,
  StatusResponse,
  StatusBanner,
  LambdaHealth,
  ApiHealth,
  DatabaseHealth,
  HealthAlert,
  HealthAlertsSummary,
  AuditLogResponse,
  MaintenanceWindow,
  MaintenanceListResponse,
  MaintenanceStats,
  MaintenanceUpdate,
  MaintenanceNotification,
  MaintenanceAffectedCustomer,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  StartMaintenanceInput,
  CompleteMaintenanceInput,
  ExtendMaintenanceInput,
  PostMaintenanceUpdateInput,
  Broadcast,
  BroadcastListResponse,
  BroadcastStats,
  BroadcastAnalytics,
  BroadcastRecipient,
  AudienceEstimate,
  BroadcastAudienceConfig,
  CreateBroadcastInput,
  UpdateBroadcastInput,
  SendBroadcastInput,
  FeatureFlag,
  FeatureFlagOverride,
  FeatureFlagHistoryEntry,
  FeatureFlagTenantStatus,
  FeatureFlagStats,
  FeatureFlagListResponse,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  ToggleFeatureFlagInput,
  UpdateRolloutInput,
  CreateOverrideInput,
  KillFlagInput,
  AnalyticsData,
  OpsSettings,
  ApiKey,
  DbTableSchema,
  DbQueryResult,
  SavedQuery,
  CustomerProfile,
  CustomerUser,
  CustomerActivity,
  CustomerBilling,
  CustomerNote,
  CreateCustomerNoteInput,
  CustomerFlagUpdate,
  CommandCenterOverview,
  CommandCenterServicesResponse,
  CommandCenterMetrics,
  CommandCenterLambdasResponse,
  CommandCenterLambdaMetrics,
  CommandCenterLambdaError,
  CommandCenterDatabaseHealth,
  CommandCenterApiTraffic,
  CommandCenterErrorsResponse,
  CommandCenterTenantsActivity,
  WhiteLabelBranding,
  WhiteLabelTenant,
  WhiteLabelStats,
  WhiteLabelHistoryEntry,
  UpdateWhiteLabelInput,
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

  // Incident endpoints - Enhanced
  async getIncidents(params?: {
    status?: string;
    severity?: string;
    service?: string;
    from?: string;
    to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ incidents: Incident[]; total: number; services: { id: string; name: string }[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.service) searchParams.set('service', params.service);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.incidents}?${query}` : API_ENDPOINTS.incidents;
    return this.request(endpoint);
  }

  async getIncidentStats(): Promise<{ stats: IncidentStats }> {
    return this.request(API_ENDPOINTS.incidentStats);
  }

  async getIncident(id: string): Promise<{ incident: Incident }> {
    return this.request(API_ENDPOINTS.incident(id));
  }

  async createIncident(data: CreateIncidentInput): Promise<{ incident: Incident }> {
    return this.request(API_ENDPOINTS.incidents, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIncident(id: string, data: UpdateIncidentInput): Promise<{ incident: Incident }> {
    return this.request(API_ENDPOINTS.incident(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIncident(id: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.incident(id), {
      method: 'DELETE',
    });
  }

  async getIncidentUpdates(incidentId: string): Promise<{ updates: IncidentUpdate[] }> {
    return this.request(API_ENDPOINTS.incidentUpdates(incidentId));
  }

  async addIncidentUpdate(
    incidentId: string,
    data: CreateIncidentUpdateInput
  ): Promise<{ update: IncidentUpdate }> {
    return this.request(API_ENDPOINTS.incidentUpdates(incidentId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIncidentAffected(incidentId: string): Promise<{ affected: IncidentAffectedCustomer[] }> {
    return this.request(API_ENDPOINTS.incidentAffected(incidentId));
  }

  async addIncidentAffected(incidentId: string, data: { tenant_id: string; notes?: string }): Promise<{ affected: IncidentAffectedCustomer }> {
    return this.request(API_ENDPOINTS.incidentAffected(incidentId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeIncidentAffected(incidentId: string, affectedId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.incidentAffectedCustomer(incidentId, affectedId), {
      method: 'DELETE',
    });
  }

  async notifyIncidentAffected(incidentId: string, message?: string): Promise<{ success: boolean; notifiedCount: number }> {
    return this.request(API_ENDPOINTS.incidentNotify(incidentId), {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getIncidentPostmortem(incidentId: string): Promise<{ postmortem: IncidentPostmortem }> {
    return this.request(API_ENDPOINTS.incidentPostmortem(incidentId));
  }

  async saveIncidentPostmortem(incidentId: string, data: SavePostmortemInput): Promise<{ postmortem: IncidentPostmortem }> {
    return this.request(API_ENDPOINTS.incidentPostmortem(incidentId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async publishIncidentPostmortem(incidentId: string): Promise<{ postmortem: IncidentPostmortem }> {
    return this.request(API_ENDPOINTS.incidentPostmortemPublish(incidentId), {
      method: 'PUT',
    });
  }

  async createPostmortemAction(postmortemId: string, data: CreateActionItemInput): Promise<{ actionItem: PostmortemActionItem }> {
    return this.request(API_ENDPOINTS.postmortemActions(postmortemId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePostmortemAction(postmortemId: string, actionId: string, data: UpdateActionItemInput): Promise<{ actionItem: PostmortemActionItem }> {
    return this.request(API_ENDPOINTS.postmortemAction(postmortemId, actionId), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePostmortemAction(postmortemId: string, actionId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.postmortemAction(postmortemId, actionId), {
      method: 'DELETE',
    });
  }

  // Health monitoring endpoints (legacy)
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

  // Command Center endpoints
  async getCommandCenterOverview(): Promise<CommandCenterOverview> {
    return this.request(API_ENDPOINTS.commandCenterOverview);
  }

  async getCommandCenterServices(): Promise<CommandCenterServicesResponse> {
    return this.request(API_ENDPOINTS.commandCenterServices);
  }

  async getCommandCenterMetrics(): Promise<CommandCenterMetrics> {
    return this.request(API_ENDPOINTS.commandCenterMetrics);
  }

  async getCommandCenterLambdas(): Promise<CommandCenterLambdasResponse> {
    return this.request(API_ENDPOINTS.commandCenterLambdas);
  }

  async getCommandCenterLambdaMetrics(functionName: string): Promise<CommandCenterLambdaMetrics> {
    return this.request(API_ENDPOINTS.commandCenterLambdaMetrics(functionName));
  }

  async getCommandCenterLambdaErrors(functionName: string): Promise<{ functionName: string; errors: CommandCenterLambdaError[] }> {
    return this.request(API_ENDPOINTS.commandCenterLambdaErrors(functionName));
  }

  async getCommandCenterDatabase(): Promise<CommandCenterDatabaseHealth> {
    return this.request(API_ENDPOINTS.commandCenterDatabase);
  }

  async getCommandCenterApiTraffic(range?: '1h' | '6h' | '24h'): Promise<CommandCenterApiTraffic> {
    const params = range ? `?range=${range}` : '';
    return this.request(`${API_ENDPOINTS.commandCenterApiTraffic}${params}`);
  }

  async getCommandCenterErrors(params?: { limit?: number; service?: string }): Promise<CommandCenterErrorsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.service) searchParams.set('service', params.service);
    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.commandCenterErrors}?${query}` : API_ENDPOINTS.commandCenterErrors;
    return this.request(endpoint);
  }

  async getCommandCenterErrorDetails(errorId: string): Promise<unknown> {
    return this.request(API_ENDPOINTS.commandCenterErrorDetails(errorId));
  }

  async getCommandCenterTenantsActivity(): Promise<CommandCenterTenantsActivity> {
    return this.request(API_ENDPOINTS.commandCenterTenantsActivity);
  }

  // Audit log endpoints
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    admin?: string;
    targetType?: string;
    from?: string;
    to?: string;
  }): Promise<AuditLogResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
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
  async getMaintenanceList(params?: {
    status?: string;
    type?: string;
    service?: string;
  }): Promise<MaintenanceListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.service) searchParams.set('service', params.service);
    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.maintenance}?${query}` : API_ENDPOINTS.maintenance;
    return this.request(endpoint);
  }

  async getMaintenanceStats(): Promise<MaintenanceStats> {
    return this.request(API_ENDPOINTS.maintenanceStats);
  }

  async getMaintenance(id: string): Promise<MaintenanceWindow> {
    return this.request(API_ENDPOINTS.maintenanceItem(id));
  }

  async createMaintenance(data: CreateMaintenanceInput): Promise<MaintenanceWindow> {
    return this.request(API_ENDPOINTS.maintenance, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaintenance(id: string, data: UpdateMaintenanceInput): Promise<MaintenanceWindow> {
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

  // Maintenance lifecycle actions
  async startMaintenance(id: string, data?: StartMaintenanceInput): Promise<MaintenanceWindow> {
    return this.request(API_ENDPOINTS.maintenanceStart(id), {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async completeMaintenance(id: string, data: CompleteMaintenanceInput): Promise<MaintenanceWindow> {
    return this.request(API_ENDPOINTS.maintenanceComplete(id), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async extendMaintenance(id: string, data: ExtendMaintenanceInput): Promise<MaintenanceWindow> {
    return this.request(API_ENDPOINTS.maintenanceExtend(id), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelMaintenance(id: string): Promise<MaintenanceWindow> {
    return this.request(API_ENDPOINTS.maintenanceCancel(id), {
      method: 'POST',
    });
  }

  // Maintenance updates (timeline)
  async getMaintenanceUpdates(id: string): Promise<{ updates: MaintenanceUpdate[] }> {
    return this.request(API_ENDPOINTS.maintenanceUpdates(id));
  }

  async postMaintenanceUpdate(id: string, data: PostMaintenanceUpdateInput): Promise<MaintenanceUpdate> {
    return this.request(API_ENDPOINTS.maintenanceUpdates(id), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Maintenance notifications
  async sendMaintenanceNotification(id: string, notificationType: string): Promise<MaintenanceNotification> {
    return this.request(API_ENDPOINTS.maintenanceNotify(id), {
      method: 'POST',
      body: JSON.stringify({ notificationType }),
    });
  }

  async getMaintenanceNotifications(id: string): Promise<{ notifications: MaintenanceNotification[] }> {
    return this.request(API_ENDPOINTS.maintenanceNotifications(id));
  }

  // Maintenance affected customers
  async getMaintenanceAffectedCustomers(id: string): Promise<{ customers: MaintenanceAffectedCustomer[] }> {
    return this.request(API_ENDPOINTS.maintenanceAffected(id));
  }

  async addMaintenanceAffectedCustomer(id: string, tenantId: string, tenantName?: string): Promise<MaintenanceAffectedCustomer> {
    return this.request(API_ENDPOINTS.maintenanceAffected(id), {
      method: 'POST',
      body: JSON.stringify({ tenantId, tenantName }),
    });
  }

  async removeMaintenanceAffectedCustomer(id: string, customerId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.maintenanceAffectedCustomer(id, customerId), {
      method: 'DELETE',
    });
  }

  // Recurring maintenance actions
  async skipMaintenanceOccurrence(id: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.maintenanceSkip(id), {
      method: 'POST',
    });
  }

  async disableRecurringMaintenance(id: string): Promise<MaintenanceWindow> {
    return this.request(API_ENDPOINTS.maintenanceDisable(id), {
      method: 'POST',
    });
  }

  // Broadcast endpoints - Enhanced Enterprise
  async getBroadcasts(params?: {
    status?: string;
    type?: string;
    audience?: string;
  }): Promise<BroadcastListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.audience) searchParams.set('audience', params.audience);
    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.broadcasts}?${query}` : API_ENDPOINTS.broadcasts;
    return this.request(endpoint);
  }

  async getBroadcastStats(): Promise<BroadcastStats> {
    return this.request(API_ENDPOINTS.broadcastStats);
  }

  async getBroadcast(id: string): Promise<{ broadcast: Broadcast }> {
    return this.request(API_ENDPOINTS.broadcast(id));
  }

  async createBroadcast(data: CreateBroadcastInput): Promise<{ broadcast: Broadcast }> {
    return this.request(API_ENDPOINTS.broadcasts, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBroadcast(id: string, data: UpdateBroadcastInput): Promise<{ broadcast: Broadcast }> {
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

  // Broadcast lifecycle actions
  async sendBroadcast(id: string, data?: SendBroadcastInput): Promise<{ broadcast: Broadcast }> {
    return this.request(API_ENDPOINTS.broadcastSend(id), {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async scheduleBroadcast(id: string, scheduledAt: string): Promise<{ broadcast: Broadcast }> {
    return this.request(API_ENDPOINTS.broadcastSchedule(id), {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    });
  }

  async cancelBroadcast(id: string): Promise<{ broadcast: Broadcast }> {
    return this.request(API_ENDPOINTS.broadcastCancel(id), {
      method: 'POST',
    });
  }

  async endBroadcast(id: string): Promise<{ broadcast: Broadcast }> {
    return this.request(API_ENDPOINTS.broadcastEnd(id), {
      method: 'POST',
    });
  }

  // Broadcast analytics
  async getBroadcastAnalytics(id: string): Promise<BroadcastAnalytics> {
    return this.request(API_ENDPOINTS.broadcastAnalytics(id));
  }

  async getBroadcastRecipients(id: string, params?: {
    limit?: number;
    offset?: number;
    filter?: 'opened' | 'clicked' | 'dismissed' | 'unopened';
  }): Promise<{ recipients: BroadcastRecipient[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.filter) searchParams.set('filter', params.filter);
    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.broadcastRecipients(id)}?${query}` : API_ENDPOINTS.broadcastRecipients(id);
    return this.request(endpoint);
  }

  // Broadcast preview
  async previewBroadcastEmail(id: string): Promise<{ html: string; text: string }> {
    return this.request(API_ENDPOINTS.broadcastPreview(id), {
      method: 'POST',
    });
  }

  async previewBroadcastBanner(id: string): Promise<{ html: string }> {
    return this.request(API_ENDPOINTS.broadcastPreviewBanner(id));
  }

  // Audience estimation
  async estimateBroadcastAudience(audienceType: string, config: BroadcastAudienceConfig): Promise<AudienceEstimate> {
    return this.request(API_ENDPOINTS.broadcastAudienceEstimate, {
      method: 'POST',
      body: JSON.stringify({ audienceType, config }),
    });
  }

  // Public broadcasts endpoint
  async getActiveBroadcasts(): Promise<{ broadcasts: Broadcast[] }> {
    return this.request(API_ENDPOINTS.statusBroadcasts, {}, false);
  }

  // Feature flags endpoints - Enterprise
  async getFeatureFlags(params?: {
    status?: 'enabled' | 'disabled' | 'rollout' | 'archived';
    category?: string;
    environment?: string;
    search?: string;
  }): Promise<FeatureFlagListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.environment) searchParams.set('environment', params.environment);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.featureFlags}?${query}` : API_ENDPOINTS.featureFlags;
    return this.request(endpoint);
  }

  async getFeatureFlagStats(): Promise<{ stats: FeatureFlagStats }> {
    return this.request(API_ENDPOINTS.featureFlagStats);
  }

  async getFeatureFlag(id: string): Promise<{ flag: FeatureFlag }> {
    return this.request(API_ENDPOINTS.featureFlag(id));
  }

  async createFeatureFlag(data: CreateFeatureFlagInput): Promise<{ flag: FeatureFlag }> {
    return this.request(API_ENDPOINTS.featureFlags, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFeatureFlag(id: string, data: UpdateFeatureFlagInput): Promise<{ flag: FeatureFlag }> {
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

  // Feature flag operations
  async toggleFeatureFlag(id: string, data: ToggleFeatureFlagInput): Promise<{ flag: FeatureFlag }> {
    return this.request(API_ENDPOINTS.featureFlagToggle(id), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFeatureFlagRollout(id: string, data: UpdateRolloutInput): Promise<{ flag: FeatureFlag }> {
    return this.request(API_ENDPOINTS.featureFlagRollout(id), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async killFeatureFlag(id: string, data?: KillFlagInput): Promise<{ flag: FeatureFlag }> {
    return this.request(API_ENDPOINTS.featureFlagKill(id), {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async archiveFeatureFlag(id: string): Promise<{ flag: FeatureFlag }> {
    return this.request(API_ENDPOINTS.featureFlagArchive(id), {
      method: 'POST',
    });
  }

  // Feature flag tenant overrides
  async getFeatureFlagTenants(id: string, params?: {
    filter?: 'all' | 'enabled' | 'disabled';
    search?: string;
  }): Promise<{ tenants: FeatureFlagTenantStatus[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.filter) searchParams.set('filter', params.filter);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.featureFlagTenants(id)}?${query}` : API_ENDPOINTS.featureFlagTenants(id);
    return this.request(endpoint);
  }

  async addFeatureFlagOverride(flagId: string, tenantId: string, data: CreateOverrideInput): Promise<{ override: FeatureFlagOverride }> {
    return this.request(API_ENDPOINTS.featureFlagTenantOverride(flagId, tenantId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeFeatureFlagOverride(flagId: string, tenantId: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.featureFlagTenantOverride(flagId, tenantId), {
      method: 'DELETE',
    });
  }

  // Feature flag history
  async getFeatureFlagHistory(id: string): Promise<{ history: FeatureFlagHistoryEntry[] }> {
    return this.request(API_ENDPOINTS.featureFlagHistory(id));
  }

  // Public feature flags endpoint (for BarkBase app)
  async evaluateFeatureFlags(tenantId: string): Promise<{ flags: Record<string, boolean> }> {
    return this.request(API_ENDPOINTS.featureFlagEvaluate(tenantId), {}, false);
  }

  async evaluateFeatureFlag(tenantId: string, flagKey: string): Promise<{ enabled: boolean }> {
    return this.request(API_ENDPOINTS.featureFlagEvaluateOne(tenantId, flagKey), {}, false);
  }

  // Legacy compatibility
  async getTenantFeatures(tenantId: string): Promise<{ features: string[] }> {
    return this.request(`${API_ENDPOINTS.publicFeatures}?tenant_id=${tenantId}`, {}, false);
  }

  // Tenants list endpoint
  async getTenants(params?: {
    search?: string;
    status?: string;
    limit?: number;
  }): Promise<{ tenants: Tenant[] }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.tenants}?${query}` : API_ENDPOINTS.tenants;
    return this.request(endpoint);
  }

  // Analytics endpoints
  async getAnalytics(period: string = '30d'): Promise<AnalyticsData> {
    return this.request(`${API_ENDPOINTS.analytics}?period=${period}`);
  }

  // Settings endpoints
  async getSettings(): Promise<OpsSettings> {
    return this.request(API_ENDPOINTS.settings);
  }

  async updateSettings(data: Partial<OpsSettings>): Promise<OpsSettings> {
    return this.request(API_ENDPOINTS.settings, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // API Keys endpoints
  async getApiKeys(): Promise<{ keys: ApiKey[] }> {
    return this.request(API_ENDPOINTS.apiKeys);
  }

  async createApiKey(name: string): Promise<{ key: ApiKey; secret: string }> {
    return this.request(API_ENDPOINTS.apiKeys, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async revokeApiKey(id: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.apiKey(id), {
      method: 'DELETE',
    });
  }

  // API Proxy endpoint
  async apiProxy(params: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
    tenantId?: string;
  }): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    duration: number;
  }> {
    return this.request(API_ENDPOINTS.apiProxy, {
      method: 'POST',
      body: JSON.stringify({
        method: params.method,
        path: params.path,
        headers: params.headers,
        body: params.body,
        tenant_id: params.tenantId,
      }),
    });
  }

  // Database explorer endpoints
  async getDbTables(): Promise<{ tables: string[] }> {
    return this.request(API_ENDPOINTS.dbTables);
  }

  async getDbSchema(table: string): Promise<{ schema: DbTableSchema[] }> {
    return this.request(API_ENDPOINTS.dbSchema(table));
  }

  async executeDbQuery(query: string): Promise<DbQueryResult> {
    return this.request(API_ENDPOINTS.dbQuery, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  async getSavedQueries(): Promise<{ queries: SavedQuery[] }> {
    return this.request(API_ENDPOINTS.savedQueries);
  }

  async saveQuery(name: string, query: string): Promise<SavedQuery> {
    return this.request(API_ENDPOINTS.savedQueries, {
      method: 'POST',
      body: JSON.stringify({ name, query }),
    });
  }

  async deleteSavedQuery(id: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.savedQuery(id), {
      method: 'DELETE',
    });
  }

  // Support Ticket endpoints
  async getTickets(params?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    portal_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tickets: SupportTicket[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.assigned_to) searchParams.set('assigned_to', params.assigned_to);
    if (params?.portal_id) searchParams.set('portal_id', params.portal_id);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const queryString = searchParams.toString();
    return this.request(`${API_ENDPOINTS.tickets}${queryString ? `?${queryString}` : ''}`);
  }

  async getTicket(id: string): Promise<{ ticket: SupportTicket }> {
    return this.request(API_ENDPOINTS.ticket(id));
  }

  async createTicket(input: CreateTicketInput): Promise<{ ticket: SupportTicket }> {
    return this.request(API_ENDPOINTS.tickets, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTicket(id: string, input: UpdateTicketInput): Promise<{ ticket: SupportTicket }> {
    return this.request(API_ENDPOINTS.ticket(id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteTicket(id: string): Promise<{ message: string }> {
    return this.request(API_ENDPOINTS.ticket(id), {
      method: 'DELETE',
    });
  }

  async getTicketMessages(ticketId: string): Promise<{ messages: TicketMessage[] }> {
    return this.request(API_ENDPOINTS.ticketMessages(ticketId));
  }

  async createTicketMessage(ticketId: string, message: string, isInternal = false): Promise<{ message: TicketMessage }> {
    return this.request(API_ENDPOINTS.ticketMessages(ticketId), {
      method: 'POST',
      body: JSON.stringify({ message, is_internal: isInternal }),
    });
  }

  async getTicketActivity(ticketId: string): Promise<{ activity: TicketActivity[] }> {
    return this.request(API_ENDPOINTS.ticketActivity(ticketId));
  }

  async getTicketStats(): Promise<{ stats: TicketStats }> {
    return this.request(API_ENDPOINTS.ticketStats);
  }

  async lookupPortal(portalId: string): Promise<{ portal: PortalLookup }> {
    return this.request(API_ENDPOINTS.portalLookup(portalId));
  }

  async generateImpersonationToken(portalId: string, ticketId?: string): Promise<ImpersonationToken> {
    return this.request(API_ENDPOINTS.generateImpersonationToken(portalId), {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId }),
    });
  }

  // Customer 360 endpoints
  async getCustomerProfile(portalId: string): Promise<{ customer: CustomerProfile }> {
    return this.request(API_ENDPOINTS.customer(portalId));
  }

  async getCustomerUsers(portalId: string): Promise<{ users: CustomerUser[] }> {
    return this.request(API_ENDPOINTS.customerUsers(portalId));
  }

  async getCustomerActivity(portalId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ activity: CustomerActivity[] }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const queryString = searchParams.toString();
    return this.request(`${API_ENDPOINTS.customerActivity(portalId)}${queryString ? `?${queryString}` : ''}`);
  }

  async getCustomerBilling(portalId: string): Promise<{ billing: CustomerBilling }> {
    return this.request(API_ENDPOINTS.customerBilling(portalId));
  }

  async getCustomerTickets(portalId: string): Promise<{ tickets: SupportTicket[] }> {
    return this.request(API_ENDPOINTS.customerTickets(portalId));
  }

  async getCustomerNotes(portalId: string): Promise<{ notes: CustomerNote[] }> {
    return this.request(API_ENDPOINTS.customerNotes(portalId));
  }

  async createCustomerNote(portalId: string, input: CreateCustomerNoteInput): Promise<{ note: CustomerNote }> {
    return this.request(API_ENDPOINTS.customerNotes(portalId), {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getCustomerFlags(portalId: string): Promise<{ flags: Record<string, { value: boolean; setBy: string; setAt: string; notes?: string }> }> {
    return this.request(API_ENDPOINTS.customerFlags(portalId));
  }

  async updateCustomerFlags(portalId: string, flags: CustomerFlagUpdate): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.customerFlags(portalId), {
      method: 'PUT',
      body: JSON.stringify({ flags }),
    });
  }

  // White-label endpoints
  async getWhiteLabelStats(): Promise<{ stats: WhiteLabelStats }> {
    return this.request(API_ENDPOINTS.whiteLabelStats);
  }

  async getWhiteLabelTenants(): Promise<{ tenants: WhiteLabelTenant[] }> {
    return this.request(API_ENDPOINTS.whiteLabel);
  }

  async getWhiteLabelBranding(tenantId: string): Promise<{ branding: WhiteLabelBranding }> {
    return this.request(API_ENDPOINTS.whiteLabelBranding(tenantId));
  }

  async updateWhiteLabelBranding(tenantId: string, data: UpdateWhiteLabelInput): Promise<{ branding: WhiteLabelBranding }> {
    return this.request(API_ENDPOINTS.whiteLabelBranding(tenantId), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getWhiteLabelHistory(tenantId: string): Promise<{ history: WhiteLabelHistoryEntry[] }> {
    return this.request(API_ENDPOINTS.whiteLabelHistory(tenantId));
  }

  async verifyWhiteLabelDomain(tenantId: string): Promise<{ verified: boolean; sslStatus: string; message: string }> {
    return this.request(API_ENDPOINTS.whiteLabelVerifyDomain(tenantId), {
      method: 'POST',
    });
  }

}

export const api = new ApiClient();
