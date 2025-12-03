import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateCustomerNoteInput, CustomerFlagUpdate } from '@/types';

// Query keys
export const customerKeys = {
  all: ['customers'] as const,
  profile: (portalId: string) => [...customerKeys.all, 'profile', portalId] as const,
  users: (portalId: string) => [...customerKeys.all, 'users', portalId] as const,
  activity: (portalId: string) => [...customerKeys.all, 'activity', portalId] as const,
  billing: (portalId: string) => [...customerKeys.all, 'billing', portalId] as const,
  tickets: (portalId: string) => [...customerKeys.all, 'tickets', portalId] as const,
  notes: (portalId: string) => [...customerKeys.all, 'notes', portalId] as const,
  flags: (portalId: string) => [...customerKeys.all, 'flags', portalId] as const,
};

// Get customer profile (main data)
export function useCustomerProfile(portalId: string) {
  return useQuery({
    queryKey: customerKeys.profile(portalId),
    queryFn: () => api.getCustomerProfile(portalId),
    enabled: !!portalId,
  });
}

// Get customer users
export function useCustomerUsers(portalId: string) {
  return useQuery({
    queryKey: customerKeys.users(portalId),
    queryFn: () => api.getCustomerUsers(portalId),
    enabled: !!portalId,
  });
}

// Get customer activity
export function useCustomerActivity(portalId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...customerKeys.activity(portalId), params],
    queryFn: () => api.getCustomerActivity(portalId, params),
    enabled: !!portalId,
  });
}

// Get customer billing
export function useCustomerBilling(portalId: string) {
  return useQuery({
    queryKey: customerKeys.billing(portalId),
    queryFn: () => api.getCustomerBilling(portalId),
    enabled: !!portalId,
  });
}

// Get customer tickets
export function useCustomerTickets(portalId: string) {
  return useQuery({
    queryKey: customerKeys.tickets(portalId),
    queryFn: () => api.getCustomerTickets(portalId),
    enabled: !!portalId,
  });
}

// Get customer notes
export function useCustomerNotes(portalId: string) {
  return useQuery({
    queryKey: customerKeys.notes(portalId),
    queryFn: () => api.getCustomerNotes(portalId),
    enabled: !!portalId,
  });
}

// Create customer note
export function useCreateCustomerNote(portalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerNoteInput) => api.createCustomerNote(portalId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.notes(portalId) });
    },
  });
}

// Get customer flags
export function useCustomerFlags(portalId: string) {
  return useQuery({
    queryKey: customerKeys.flags(portalId),
    queryFn: () => api.getCustomerFlags(portalId),
    enabled: !!portalId,
  });
}

// Update customer flags
export function useUpdateCustomerFlags(portalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flags: CustomerFlagUpdate) => api.updateCustomerFlags(portalId, flags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.flags(portalId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.profile(portalId) });
    },
  });
}
