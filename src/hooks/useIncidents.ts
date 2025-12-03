import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  CreateIncidentUpdateInput,
  SavePostmortemInput,
  CreateActionItemInput,
  UpdateActionItemInput,
} from '@/types';

// Query keys
export const incidentKeys = {
  all: ['incidents'] as const,
  lists: () => [...incidentKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...incidentKeys.lists(), params] as const,
  stats: () => [...incidentKeys.all, 'stats'] as const,
  details: () => [...incidentKeys.all, 'detail'] as const,
  detail: (id: string) => [...incidentKeys.details(), id] as const,
  updates: (id: string) => [...incidentKeys.detail(id), 'updates'] as const,
  affected: (id: string) => [...incidentKeys.detail(id), 'affected'] as const,
  postmortem: (id: string) => [...incidentKeys.detail(id), 'postmortem'] as const,
};

// List incidents with filters
export function useIncidents(params?: {
  status?: string;
  severity?: string;
  service?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: incidentKeys.list(params),
    queryFn: () => api.getIncidents(params),
  });
}

// Get incident stats
export function useIncidentStats() {
  return useQuery({
    queryKey: incidentKeys.stats(),
    queryFn: () => api.getIncidentStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Get single incident
export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => api.getIncident(id),
    enabled: !!id,
  });
}

// Create incident
export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncidentInput) => api.createIncident(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: incidentKeys.stats() });
    },
  });
}

// Update incident
export function useUpdateIncident(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateIncidentInput) => api.updateIncident(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: incidentKeys.stats() });
    },
  });
}

// Delete incident
export function useDeleteIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: incidentKeys.stats() });
    },
  });
}

// Get incident updates/timeline
export function useIncidentUpdates(incidentId: string) {
  return useQuery({
    queryKey: incidentKeys.updates(incidentId),
    queryFn: () => api.getIncidentUpdates(incidentId),
    enabled: !!incidentId,
  });
}

// Add incident update
export function useAddIncidentUpdate(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncidentUpdateInput) => api.addIncidentUpdate(incidentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.updates(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
  });
}

// Get affected customers
export function useIncidentAffected(incidentId: string) {
  return useQuery({
    queryKey: incidentKeys.affected(incidentId),
    queryFn: () => api.getIncidentAffected(incidentId),
    enabled: !!incidentId,
  });
}

// Add affected customer
export function useAddIncidentAffected(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { tenant_id: string; notes?: string }) => api.addIncidentAffected(incidentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.affected(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
    },
  });
}

// Remove affected customer
export function useRemoveIncidentAffected(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (affectedId: string) => api.removeIncidentAffected(incidentId, affectedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.affected(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
    },
  });
}

// Notify affected customers
export function useNotifyIncidentAffected(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message?: string) => api.notifyIncidentAffected(incidentId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.affected(incidentId) });
    },
  });
}

// Get postmortem
export function useIncidentPostmortem(incidentId: string) {
  return useQuery({
    queryKey: incidentKeys.postmortem(incidentId),
    queryFn: () => api.getIncidentPostmortem(incidentId),
    enabled: !!incidentId,
  });
}

// Save postmortem
export function useSavePostmortem(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SavePostmortemInput) => api.saveIncidentPostmortem(incidentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.postmortem(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
    },
  });
}

// Publish postmortem
export function usePublishPostmortem(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.publishIncidentPostmortem(incidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.postmortem(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
    },
  });
}

// Create action item
export function useCreatePostmortemAction(postmortemId: string, incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateActionItemInput) => api.createPostmortemAction(postmortemId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.postmortem(incidentId) });
    },
  });
}

// Update action item
export function useUpdatePostmortemAction(postmortemId: string, incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ actionId, ...input }: UpdateActionItemInput & { actionId: string }) =>
      api.updatePostmortemAction(postmortemId, actionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.postmortem(incidentId) });
    },
  });
}

// Delete action item
export function useDeletePostmortemAction(postmortemId: string, incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => api.deletePostmortemAction(postmortemId, actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.postmortem(incidentId) });
    },
  });
}
