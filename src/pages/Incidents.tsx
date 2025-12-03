import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { IncidentList } from '@/components/incidents/IncidentList';
import { IncidentForm } from '@/components/incidents/IncidentForm';
import { useIncidents, useCreateIncident } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { canCreateIncident } from '@/config/cognito';
import type { CreateIncidentInput } from '@/types';

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'identified', label: 'Identified' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'resolved', label: 'Resolved' },
];

const severityFilters = [
  { value: '', label: 'All Severities' },
  { value: 'degraded', label: 'Degraded' },
  { value: 'partial', label: 'Partial Outage' },
  { value: 'major', label: 'Major Outage' },
];

export function Incidents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useIncidents({
    status: statusFilter || undefined,
  });
  const createIncident = useCreateIncident();

  const canCreate = user && canCreateIncident(user.role);

  const handleCreateIncident = async (formData: CreateIncidentInput) => {
    try {
      const incident = await createIncident.mutateAsync(formData);
      setShowForm(false);
      navigate(`/incidents/${incident.id}`);
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  };

  // Filter and count incidents
  const filteredIncidents = data?.incidents?.filter(i => {
    if (severityFilter && i.severity !== severityFilter) return false;
    return true;
  }) || [];

  const activeCount = data?.incidents?.filter(i => i.status !== 'resolved').length || 0;
  const resolvedThisMonth = data?.incidents?.filter(i => {
    if (i.status !== 'resolved') return false;
    const resolved = new Date(i.resolvedAt || i.updatedAt);
    const now = new Date();
    return resolved.getMonth() === now.getMonth() && resolved.getFullYear() === now.getFullYear();
  }).length || 0;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Incidents</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Track and manage platform incidents
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-error)] text-white rounded-md text-sm font-medium hover:bg-[var(--color-error)]/90 transition-colors"
          >
            <AlertTriangle size={16} />
            Report Incident
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 mb-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-4 py-3 flex-1">
          <div className="text-xs text-[var(--text-muted)] mb-1">Total Incidents</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)]">{data?.total || 0}</div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-4 py-3 flex-1">
          <div className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
            {activeCount > 0 && <span className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />}
            Active
          </div>
          <div className={`text-2xl font-semibold ${activeCount > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--text-primary)]'}`}>
            {activeCount}
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-4 py-3 flex-1">
          <div className="text-xs text-[var(--text-muted)] mb-1">Resolved This Month</div>
          <div className="text-2xl font-semibold text-[var(--color-success)]">{resolvedThisMonth}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-1">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                statusFilter === filter.value
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
        >
          {severityFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
        </div>
      ) : filteredIncidents.length > 0 ? (
        <IncidentList incidents={filteredIncidents} />
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-success-soft)] mb-4">
            <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
          </div>
          <p className="text-base font-medium text-[var(--text-primary)]">All clear</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">No incidents matching your filters</p>
        </div>
      )}

      {/* Create Incident Modal */}
      {showForm && (
        <IncidentForm
          onSubmit={handleCreateIncident}
          onCancel={() => setShowForm(false)}
          isLoading={createIncident.isPending}
        />
      )}
    </div>
  );
}
