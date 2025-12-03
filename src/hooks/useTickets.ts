import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateTicketInput, UpdateTicketInput } from '@/types';

// Query keys
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...ticketKeys.lists(), params] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  messages: (id: string) => [...ticketKeys.detail(id), 'messages'] as const,
  activity: (id: string) => [...ticketKeys.detail(id), 'activity'] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
  portal: (id: string) => ['portal', id] as const,
};

// List tickets
export function useTickets(params?: {
  status?: string;
  priority?: string;
  assigned_to?: string;
  portal_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => api.getTickets(params),
  });
}

// Get single ticket
export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => api.getTicket(id),
    enabled: !!id,
  });
}

// Get ticket messages
export function useTicketMessages(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.messages(ticketId),
    queryFn: () => api.getTicketMessages(ticketId),
    enabled: !!ticketId,
  });
}

// Get ticket activity
export function useTicketActivity(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.activity(ticketId),
    queryFn: () => api.getTicketActivity(ticketId),
    enabled: !!ticketId,
  });
}

// Get ticket stats
export function useTicketStats() {
  return useQuery({
    queryKey: ticketKeys.stats(),
    queryFn: () => api.getTicketStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Create ticket
export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => api.createTicket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
  });
}

// Update ticket
export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTicketInput) => api.updateTicket(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
  });
}

// Delete/close ticket
export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
  });
}

// Add message to ticket
export function useCreateTicketMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ message, isInternal }: { message: string; isInternal?: boolean }) =>
      api.createTicketMessage(ticketId, message, isInternal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.messages(ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.activity(ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
    },
  });
}

// Portal lookup
export function usePortalLookup(portalId: string) {
  return useQuery({
    queryKey: ticketKeys.portal(portalId),
    queryFn: () => api.lookupPortal(portalId),
    enabled: !!portalId && portalId.length > 10, // Only search for valid UUIDs
    retry: false,
  });
}

// Generate impersonation token
export function useGenerateImpersonationToken() {
  return useMutation({
    mutationFn: ({ portalId, ticketId }: { portalId: string; ticketId?: string }) =>
      api.generateImpersonationToken(portalId, ticketId),
  });
}
