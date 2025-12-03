import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { IncidentDetailComponent } from '@/components/incidents/IncidentDetail';
import { useIncident, useUpdateIncident, useAddIncidentUpdate } from '@/hooks/useApi';
import type { CreateIncidentUpdateInput } from '@/types';

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: incident, isLoading, error } = useIncident(id || '');
  const updateIncident = useUpdateIncident(id || '');
  const addUpdate = useAddIncidentUpdate(id || '');

  const handleAddUpdate = async (data: CreateIncidentUpdateInput) => {
    await addUpdate.mutateAsync(data);
    if (data.status !== incident?.status) {
      await updateIncident.mutateAsync({ status: data.status });
    }
  };

  const handleResolve = async () => {
    await updateIncident.mutateAsync({
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  };

  if (!id) {
    return <Navigate to="/incidents" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h2 className="text-base font-medium text-[var(--text-primary)] mb-1">
          Incident not found
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          The incident you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <IncidentDetailComponent
      incident={incident}
      onAddUpdate={handleAddUpdate}
      onResolve={handleResolve}
      isUpdating={updateIncident.isPending || addUpdate.isPending}
    />
  );
}
