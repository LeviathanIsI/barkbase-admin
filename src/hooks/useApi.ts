import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  CreateIncidentUpdateInput,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  StartMaintenanceInput,
  CompleteMaintenanceInput,
  ExtendMaintenanceInput,
  PostMaintenanceUpdateInput,
  CreateBroadcastInput,
  UpdateBroadcastInput,
  SendBroadcastInput,
  BroadcastAudienceConfig,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  ToggleFeatureFlagInput,
  UpdateRolloutInput,
  CreateOverrideInput,
  KillFlagInput,
  OpsSettings,
  UpdateWhiteLabelInput,
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
  maintenance: (params?: Record<string, unknown>) => ['maintenance', params] as const,
  maintenanceStats: ['maintenance', 'stats'] as const,
  maintenanceItem: (id: string) => ['maintenance', id] as const,
  maintenanceUpdates: (id: string) => ['maintenance', id, 'updates'] as const,
  maintenanceNotifications: (id: string) => ['maintenance', id, 'notifications'] as const,
  maintenanceAffected: (id: string) => ['maintenance', id, 'affected'] as const,
  broadcasts: (params?: Record<string, unknown>) => ['broadcasts', params] as const,
  broadcastStats: ['broadcasts', 'stats'] as const,
  broadcast: (id: string) => ['broadcast', id] as const,
  broadcastAnalytics: (id: string) => ['broadcast', id, 'analytics'] as const,
  broadcastRecipients: (id: string, params?: Record<string, unknown>) => ['broadcast', id, 'recipients', params] as const,
  activeBroadcasts: ['broadcasts', 'active'] as const,
  audienceEstimate: (type: string, config: BroadcastAudienceConfig) => ['audience-estimate', type, config] as const,
  featureFlags: (params?: Record<string, unknown>) => ['feature-flags', params] as const,
  featureFlagStats: ['feature-flags', 'stats'] as const,
  featureFlag: (id: string) => ['feature-flag', id] as const,
  featureFlagTenants: (id: string, params?: Record<string, unknown>) => ['feature-flag', id, 'tenants', params] as const,
  featureFlagHistory: (id: string) => ['feature-flag', id, 'history'] as const,
  analytics: (period: string) => ['analytics', period] as const,
  settings: ['settings'] as const,
  apiKeys: ['api-keys'] as const,
  dbTables: ['db-tables'] as const,
  dbSchema: (table: string) => ['db-schema', table] as const,
  savedQueries: ['saved-queries'] as const,
  // White-label keys
  whiteLabelStats: ['white-label', 'stats'] as const,
  whiteLabelTenants: ['white-label', 'tenants'] as const,
  whiteLabelBranding: (tenantId: string) => ['white-label', 'branding', tenantId] as const,
  whiteLabelHistory: (tenantId: string) => ['white-label', 'history', tenantId] as const,
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
  limit?: number;
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
export function useMaintenanceList(params?: { status?: string; type?: string; service?: string }) {
  return useQuery({
    queryKey: queryKeys.maintenance(params),
    queryFn: () => api.getMaintenanceList(params),
  });
}

export function useMaintenanceStats() {
  return useQuery({
    queryKey: queryKeys.maintenanceStats,
    queryFn: () => api.getMaintenanceStats(),
  });
}

export function useMaintenance(id: string) {
  return useQuery({
    queryKey: queryKeys.maintenanceItem(id),
    queryFn: () => api.getMaintenance(id),
    enabled: !!id,
  });
}

export function useMaintenanceUpdates(id: string) {
  return useQuery({
    queryKey: queryKeys.maintenanceUpdates(id),
    queryFn: () => api.getMaintenanceUpdates(id),
    enabled: !!id,
  });
}

export function useMaintenanceNotifications(id: string) {
  return useQuery({
    queryKey: queryKeys.maintenanceNotifications(id),
    queryFn: () => api.getMaintenanceNotifications(id),
    enabled: !!id,
  });
}

export function useMaintenanceAffectedCustomers(id: string) {
  return useQuery({
    queryKey: queryKeys.maintenanceAffected(id),
    queryFn: () => api.getMaintenanceAffectedCustomers(id),
    enabled: !!id,
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaintenanceInput) => api.createMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useUpdateMaintenance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMaintenanceInput) => api.updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItem(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useStartMaintenance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: StartMaintenanceInput) => api.startMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItem(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceUpdates(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useCompleteMaintenance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompleteMaintenanceInput) => api.completeMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItem(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceUpdates(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function useExtendMaintenance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExtendMaintenanceInput) => api.extendMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItem(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceUpdates(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
    },
  });
}

export function useCancelMaintenance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItem(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceUpdates(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

export function usePostMaintenanceUpdate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostMaintenanceUpdateInput) => api.postMaintenanceUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceUpdates(id) });
    },
  });
}

export function useSendMaintenanceNotification(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationType: string) => api.sendMaintenanceNotification(id, notificationType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceNotifications(id) });
    },
  });
}

export function useAddMaintenanceAffectedCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, tenantName }: { tenantId: string; tenantName?: string }) =>
      api.addMaintenanceAffectedCustomer(id, tenantId, tenantName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceAffected(id) });
    },
  });
}

export function useRemoveMaintenanceAffectedCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => api.removeMaintenanceAffectedCustomer(id, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceAffected(id) });
    },
  });
}

export function useSkipMaintenanceOccurrence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.skipMaintenanceOccurrence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItem(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
    },
  });
}

export function useDisableRecurringMaintenance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.disableRecurringMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItem(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceStats });
    },
  });
}

// Broadcast hooks - Enhanced Enterprise
export function useBroadcasts(params?: { status?: string; type?: string; audience?: string }) {
  return useQuery({
    queryKey: queryKeys.broadcasts(params),
    queryFn: () => api.getBroadcasts(params),
  });
}

export function useBroadcastStats() {
  return useQuery({
    queryKey: queryKeys.broadcastStats,
    queryFn: () => api.getBroadcastStats(),
  });
}

export function useBroadcast(id: string) {
  return useQuery({
    queryKey: queryKeys.broadcast(id),
    queryFn: () => api.getBroadcast(id),
    enabled: !!id,
  });
}

export function useBroadcastAnalytics(id: string) {
  return useQuery({
    queryKey: queryKeys.broadcastAnalytics(id),
    queryFn: () => api.getBroadcastAnalytics(id),
    enabled: !!id,
  });
}

export function useBroadcastRecipients(id: string, params?: {
  limit?: number;
  offset?: number;
  filter?: 'opened' | 'clicked' | 'dismissed' | 'unopened';
}) {
  return useQuery({
    queryKey: queryKeys.broadcastRecipients(id, params),
    queryFn: () => api.getBroadcastRecipients(id, params),
    enabled: !!id,
  });
}

export function useAudienceEstimate(audienceType: string, config: BroadcastAudienceConfig) {
  return useQuery({
    queryKey: queryKeys.audienceEstimate(audienceType, config),
    queryFn: () => api.estimateBroadcastAudience(audienceType, config),
    enabled: !!audienceType,
  });
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBroadcastInput) => api.createBroadcast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcastStats });
    },
  });
}

export function useUpdateBroadcast(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBroadcastInput) => api.updateBroadcast(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcast(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcastStats });
    },
  });
}

export function useDeleteBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcastStats });
    },
  });
}

export function useSendBroadcast(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: SendBroadcastInput) => api.sendBroadcast(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcast(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcastStats });
    },
  });
}

export function useScheduleBroadcast(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduledAt: string) => api.scheduleBroadcast(id, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcast(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcastStats });
    },
  });
}

export function useCancelBroadcast(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcast(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcastStats });
    },
  });
}

export function useEndBroadcast(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.endBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcast(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcastStats });
    },
  });
}

export function usePreviewBroadcastEmail(id: string) {
  return useMutation({
    mutationFn: () => api.previewBroadcastEmail(id),
  });
}

export function useActiveBroadcasts() {
  return useQuery({
    queryKey: queryKeys.activeBroadcasts,
    queryFn: () => api.getActiveBroadcasts(),
    refetchInterval: 60000,
  });
}

// Feature flag hooks - Enterprise
export function useFeatureFlags(params?: {
  status?: 'enabled' | 'disabled' | 'rollout' | 'archived';
  category?: string;
  environment?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.featureFlags(params),
    queryFn: () => api.getFeatureFlags(params),
  });
}

export function useFeatureFlagStats() {
  return useQuery({
    queryKey: queryKeys.featureFlagStats,
    queryFn: () => api.getFeatureFlagStats(),
  });
}

export function useFeatureFlag(id: string) {
  return useQuery({
    queryKey: queryKeys.featureFlag(id),
    queryFn: () => api.getFeatureFlag(id),
    enabled: !!id,
  });
}

export function useFeatureFlagTenants(id: string, params?: {
  filter?: 'all' | 'enabled' | 'disabled';
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.featureFlagTenants(id, params),
    queryFn: () => api.getFeatureFlagTenants(id, params),
    enabled: !!id,
  });
}

export function useFeatureFlagHistory(id: string) {
  return useQuery({
    queryKey: queryKeys.featureFlagHistory(id),
    queryFn: () => api.getFeatureFlagHistory(id),
    enabled: !!id,
  });
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeatureFlagInput) => api.createFeatureFlag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagStats });
    },
  });
}

export function useUpdateFeatureFlag(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFeatureFlagInput) => api.updateFeatureFlag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagStats });
    },
  });
}

export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteFeatureFlag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagStats });
    },
  });
}

export function useToggleFeatureFlag(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ToggleFeatureFlagInput) => api.toggleFeatureFlag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagHistory(id) });
    },
  });
}

export function useUpdateFeatureFlagRollout(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRolloutInput) => api.updateFeatureFlagRollout(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagHistory(id) });
    },
  });
}

export function useKillFeatureFlag(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: KillFlagInput) => api.killFeatureFlag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagHistory(id) });
    },
  });
}

export function useArchiveFeatureFlag(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.archiveFeatureFlag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagStats });
    },
  });
}

export function useAddFeatureFlagOverride(flagId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: CreateOverrideInput }) =>
      api.addFeatureFlagOverride(flagId, tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(flagId) });
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagTenants(flagId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagHistory(flagId) });
    },
  });
}

export function useRemoveFeatureFlagOverride(flagId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => api.removeFeatureFlagOverride(flagId, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlag(flagId) });
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagTenants(flagId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlagHistory(flagId) });
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

// =========================================================================
// White-label hooks
// =========================================================================

export function useWhiteLabelStats() {
  return useQuery({
    queryKey: queryKeys.whiteLabelStats,
    queryFn: () => api.getWhiteLabelStats(),
    staleTime: 60000,
  });
}

export function useWhiteLabelTenants() {
  return useQuery({
    queryKey: queryKeys.whiteLabelTenants,
    queryFn: () => api.getWhiteLabelTenants(),
    staleTime: 30000,
  });
}

export function useWhiteLabelBranding(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.whiteLabelBranding(tenantId),
    queryFn: () => api.getWhiteLabelBranding(tenantId),
    enabled: !!tenantId,
  });
}

export function useUpdateWhiteLabelBranding(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWhiteLabelInput) => api.updateWhiteLabelBranding(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whiteLabelBranding(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.whiteLabelTenants });
      queryClient.invalidateQueries({ queryKey: queryKeys.whiteLabelStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.whiteLabelHistory(tenantId) });
    },
  });
}

export function useWhiteLabelHistory(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.whiteLabelHistory(tenantId),
    queryFn: () => api.getWhiteLabelHistory(tenantId),
    enabled: !!tenantId,
    staleTime: 30000,
  });
}

export function useVerifyWhiteLabelDomain(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.verifyWhiteLabelDomain(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whiteLabelBranding(tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.whiteLabelTenants });
      queryClient.invalidateQueries({ queryKey: queryKeys.whiteLabelStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.whiteLabelHistory(tenantId) });
    },
  });
}
