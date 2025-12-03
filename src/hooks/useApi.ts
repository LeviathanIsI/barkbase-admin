import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  CreateIncidentUpdateInput,
} from '@/types';

// Query keys
export const queryKeys = {
  search: (query: string) => ['search', query] as const,
  tenant: (id: string) => ['tenant', id] as const,
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
