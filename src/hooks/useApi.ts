import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  CreateIncidentUpdateInput,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  CreateBroadcastInput,
  UpdateBroadcastInput,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  OpsSettings,
} from '@/types';

// Query keys
export const queryKeys = {
  search: (query: string) => ['search', query] as const,
  tenant: (id: string) => ['tenant', id] as const,
  tenants: (params?: Record<string, unknown>) => ['tenants', params] as const,
  tenantUsers: (id: string) => ['tenant', id, 'users'] as const,
  incidents: (params?: { status?: string }) => ['incidents', params] as const,
  incident: (id: string) => ['incident', id] as const,
  status: ['status'] as const,
  statusBanner: ['status', 'banner'] as const,
  healthLambdas: ['health', 'lambdas'] as const,
  healthApi: ['health', 'api'] as const,
  healthDatabase: ['health', 'database'] as const,
  healthAlerts: ['health', 'alerts'] as const,
  auditLogs: (params?: Record<string, unknown>) => ['audit-logs', params] as const,
  maintenance: ['maintenance'] as const,
  maintenanceItem: (id: string) => ['maintenance', id] as const,
  broadcasts: ['broadcasts'] as const,
  broadcast: (id: string) => ['broadcast', id] as const,
  activeBroadcasts: ['broadcasts', 'active'] as const,
  featureFlags: ['feature-flags'] as const,
  featureFlag: (id: string) => ['feature-flag', id] as const,
  analytics: (period: string) => ['analytics', period] as const,
  settings: ['settings'] as const,
  apiKeys: ['api-keys'] as const,
  dbTables: ['db-tables'] as const,
  dbSchema: (table: string) => ['db-schema', table] as const,
  savedQueries: ['saved-queries'] as const,
};

// Support hooks
export function useSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => api.search(query),
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

export function useTenant(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.tenant(tenantId),
    queryFn: () => api.getTenant(tenantId),
    enabled: !!tenantId,
  });
}

export function useTenantUsers(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.tenantUsers(tenantId),
    queryFn: () => api.getTenantUsers(tenantId),
    enabled: !!tenantId,
  });
}

export function useSuspendTenant(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.suspendTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenantId) });
    },
  });
}

export function useUnsuspendTenant(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.unsuspendTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenantId) });
    },
  });
}

export function useExtendTrial(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days: number) => api.extendTrial(tenantId, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenantId) });
    },
  });
}

export function useResetUserPassword(tenantId: string) {
  return useMutation({
    mutationFn: (userId: string) => api.resetUserPassword(tenantId, userId),
  });
}

// Incident hooks
export function useIncidents(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.incidents(params),
    queryFn: () => api.getIncidents(params),
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: queryKeys.incident(id),
    queryFn: () => api.getIncident(id),
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateIncidentInput) => api.createIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useUpdateIncident(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateIncidentInput) => api.updateIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incident(id) });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useAddIncidentUpdate(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateIncidentUpdateInput) => api.addIncidentUpdate(incidentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incident(incidentId) });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

// Health monitoring hooks
export function useHealthLambdas() {
  return useQuery({
    queryKey: queryKeys.healthLambdas,
    queryFn: () => api.getHealthLambdas(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useHealthApi() {
  return useQuery({
    queryKey: queryKeys.healthApi,
    queryFn: () => api.getHealthApi(),
    refetchInterval: 30000,
  });
}

export function useHealthDatabase() {
  return useQuery({
    queryKey: queryKeys.healthDatabase,
    queryFn: () => api.getHealthDatabase(),
    refetchInterval: 30000,
  });
}

export function useHealthAlerts() {
  return useQuery({
    queryKey: queryKeys.healthAlerts,
    queryFn: () => api.getHealthAlerts(),
    refetchInterval: 30000,
  });
}

// Audit log hooks
export function useAuditLogs(params?: {
  page?: number;
  action?: string;
  admin?: string;
  targetType?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(params),
    queryFn: () => api.getAuditLogs(params),
  });
}

// Status hooks
export function useStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => api.getStatus(),
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useStatusBanner() {
  return useQuery({
    queryKey: queryKeys.statusBanner,
    queryFn: () => api.getStatusBanner(),
    refetchInterval: 60000,
  });
}

// Maintenance hooks
export function useMaintenanceList() {
  return useQuery({
    queryKey: queryKeys.maintenance,
    queryFn: () => api.getMaintenanceList(),
  });
}

export function useMaintenance(id: string) {
  return useQuery({
    queryKey: queryKeys.maintenanceItem(id),
    queryFn: () => api.getMaintenance(id),
    enabled: !!id,
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaintenanceInput) => api.createMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useUpdateMaintenance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMaintenanceInput) => api.updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItem(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

// Broadcast hooks
export function useBroadcasts() {
  return useQuery({
    queryKey: queryKeys.broadcasts,
    queryFn: () => api.getBroadcasts(),
  });
}

export function useBroadcast(id: string) {
  return useQuery({
    queryKey: queryKeys.broadcast(id),
    queryFn: () => api.getBroadcast(id),
    enabled: !!id,
  });
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBroadcastInput) => api.createBroadcast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcasts });
    },
  });
}

export function useUpdateBroadcast(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBroadcastInput) => api.updateBroadcast(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcasts });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcast(id) });
    },
  });
}

export function useDeleteBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcasts });
    },
  });
}

export function useActiveBroadcasts() {
  return useQuery({
    queryKey: queryKeys.activeBroadcasts,
    queryFn: () => api.getActiveBroadcasts(),
    refetchInterval: 60000,
  });
}

// Feature flag hooks
export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.featureFlags,
    queryFn: () => api.getFeatureFlags(),
  });
}

export function useFeatureFlag(id: string) {
  return useQuery({
    queryKey: queryKeys.featureFlag(id),
    queryFn: () => api.getFeatureFlag(id),
    enabled: !!id,
  });
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeatureFlagInput) => api.createFeatureFlag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags });
    },
  });
}

export function useUpdateFeatureFlag(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFeatureFlagInput) => api.updateFeatureFlag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(id) });
    },
  });
}

export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteFeatureFlag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags });
    },
  });
}

export function useAddFeatureFlagOverride(flagId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, isEnabled }: { tenantId: string; isEnabled: boolean }) =>
      api.addFeatureFlagOverride(flagId, tenantId, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(flagId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags });
    },
  });
}

export function useRemoveFeatureFlagOverride(flagId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrideId: string) => api.removeFeatureFlagOverride(flagId, overrideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(flagId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags });
    },
  });
}

// Tenants list hook (for selectors)
export function useTenants(params?: { search?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.tenants(params),
    queryFn: () => api.getTenants(params),
  });
}

// Analytics hooks
export function useAnalytics(period: string = '30d') {
  return useQuery({
    queryKey: queryKeys.analytics(period),
    queryFn: () => api.getAnalytics(period),
  });
}

// Settings hooks
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.getSettings(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OpsSettings>) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

// API Keys hooks
export function useApiKeys() {
  return useQuery({
    queryKey: queryKeys.apiKeys,
    queryFn: () => api.getApiKeys(),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createApiKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
    },
  });
}

// API Proxy hook
export function useApiProxy() {
  return useMutation({
    mutationFn: (params: {
      method: string;
      path: string;
      headers?: Record<string, string>;
      body?: unknown;
      tenantId?: string;
    }) => api.apiProxy(params),
  });
}

// Database explorer hooks
export function useDbTables() {
  return useQuery({
    queryKey: queryKeys.dbTables,
    queryFn: () => api.getDbTables(),
  });
}

export function useDbSchema(table: string) {
  return useQuery({
    queryKey: queryKeys.dbSchema(table),
    queryFn: () => api.getDbSchema(table),
    enabled: !!table,
  });
}

export function useDbQuery() {
  return useMutation({
    mutationFn: (query: string) => api.executeDbQuery(query),
  });
}

export function useSavedQueries() {
  return useQuery({
    queryKey: queryKeys.savedQueries,
    queryFn: () => api.getSavedQueries(),
  });
}

export function useSaveQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, query }: { name: string; query: string }) => api.saveQuery(name, query),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedQueries });
    },
  });
}

export function useDeleteSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSavedQuery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedQueries });
    },
  });
}
