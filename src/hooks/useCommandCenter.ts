import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

// Query keys
export const commandCenterKeys = {
  all: ['command-center'] as const,
  overview: () => [...commandCenterKeys.all, 'overview'] as const,
  services: () => [...commandCenterKeys.all, 'services'] as const,
  metrics: () => [...commandCenterKeys.all, 'metrics'] as const,
  lambdas: () => [...commandCenterKeys.all, 'lambdas'] as const,
  lambdaMetrics: (name: string) => [...commandCenterKeys.all, 'lambda-metrics', name] as const,
  lambdaErrors: (name: string) => [...commandCenterKeys.all, 'lambda-errors', name] as const,
  database: () => [...commandCenterKeys.all, 'database'] as const,
  apiTraffic: (range?: string) => [...commandCenterKeys.all, 'api-traffic', range] as const,
  errors: (params?: { limit?: number; service?: string }) => [...commandCenterKeys.all, 'errors', params] as const,
  tenantsActivity: () => [...commandCenterKeys.all, 'tenants-activity'] as const,
};

// Overview - system status
export function useCommandCenterOverview(refreshInterval = 30000) {
  return useQuery({
    queryKey: commandCenterKeys.overview(),
    queryFn: () => api.getCommandCenterOverview(),
    refetchInterval: refreshInterval,
  });
}

// Services health grid
export function useCommandCenterServices(refreshInterval = 30000) {
  return useQuery({
    queryKey: commandCenterKeys.services(),
    queryFn: () => api.getCommandCenterServices(),
    refetchInterval: refreshInterval,
  });
}

// Real-time metrics
export function useCommandCenterMetrics(refreshInterval = 30000) {
  return useQuery({
    queryKey: commandCenterKeys.metrics(),
    queryFn: () => api.getCommandCenterMetrics(),
    refetchInterval: refreshInterval,
  });
}

// Lambda functions list
export function useCommandCenterLambdas(refreshInterval = 30000) {
  return useQuery({
    queryKey: commandCenterKeys.lambdas(),
    queryFn: () => api.getCommandCenterLambdas(),
    refetchInterval: refreshInterval,
  });
}

// Detailed Lambda metrics (24h)
export function useCommandCenterLambdaMetrics(functionName: string) {
  return useQuery({
    queryKey: commandCenterKeys.lambdaMetrics(functionName),
    queryFn: () => api.getCommandCenterLambdaMetrics(functionName),
    enabled: !!functionName,
  });
}

// Lambda errors log
export function useCommandCenterLambdaErrors(functionName: string) {
  return useQuery({
    queryKey: commandCenterKeys.lambdaErrors(functionName),
    queryFn: () => api.getCommandCenterLambdaErrors(functionName),
    enabled: !!functionName,
  });
}

// Database health
export function useCommandCenterDatabase(refreshInterval = 30000) {
  return useQuery({
    queryKey: commandCenterKeys.database(),
    queryFn: () => api.getCommandCenterDatabase(),
    refetchInterval: refreshInterval,
  });
}

// API traffic chart
export function useCommandCenterApiTraffic(range?: '1h' | '6h' | '24h', refreshInterval = 60000) {
  return useQuery({
    queryKey: commandCenterKeys.apiTraffic(range),
    queryFn: () => api.getCommandCenterApiTraffic(range),
    refetchInterval: refreshInterval,
  });
}

// Recent errors feed
export function useCommandCenterErrors(params?: { limit?: number; service?: string }, refreshInterval = 30000) {
  return useQuery({
    queryKey: commandCenterKeys.errors(params),
    queryFn: () => api.getCommandCenterErrors(params),
    refetchInterval: refreshInterval,
  });
}

// Tenants activity heatmap
export function useCommandCenterTenantsActivity(refreshInterval = 60000) {
  return useQuery({
    queryKey: commandCenterKeys.tenantsActivity(),
    queryFn: () => api.getCommandCenterTenantsActivity(),
    refetchInterval: refreshInterval,
  });
}
