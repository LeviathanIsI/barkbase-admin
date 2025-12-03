import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Plus, Loader2, Clock, User, Server, AlertTriangle, Pencil, CheckCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/status/StatusBadge';
import { IncidentTimeline } from './IncidentTimeline';
import { useAuth } from '@/hooks/useAuth';
import { canModifyIncident } from '@/config/cognito';
import type { IncidentWithUpdates, CreateIncidentUpdateInput, IncidentStatus, IncidentSeverity } from '@/types';

interface IncidentDetailProps {
  incident: IncidentWithUpdates;
  onAddUpdate: (data: CreateIncidentUpdateInput) => void;
  onResolve: () => void;
  isUpdating?: boolean;
}

const statusOptions: { value: IncidentStatus; label: string }[] = [
  { value: 'investigating', label: 'Investigating' },
  { value: 'identified', label: 'Identified' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'resolved', label: 'Resolved' },
];

const severityLabels: Record<IncidentSeverity, string> = {
  degraded: 'Degraded Performance',
  partial_outage: 'Partial Outage',
  major_outage: 'Major Outage',
};

export function IncidentDetailComponent({
  incident,
  onAddUpdate,
  onResolve,
  isUpdating,
}: IncidentDetailProps) {
  const { user } = useAuth();
  const canEdit = user && canModifyIncident(user.role);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateData, setUpdateData] = useState<CreateIncidentUpdateInput>({
    message: '',
    status: incident.status,
  });

  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateData.message.trim()) return;
    onAddUpdate(updateData);
    setUpdateData({ message: '', status: incident.status });
    setShowUpdateForm(false);
  };

  const isResolved = incident.status === 'resolved';
  const duration = incident.resolvedAt
    ? formatDistanceToNow(new Date(incident.createdAt), { addSuffix: false })
    : formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true });

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <Link
          to="/incidents"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span>Back to incidents</span>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              {incident.title}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {isResolved ? `Resolved in ${duration}` : `Started ${duration}`}
            </p>
          </div>

          {canEdit && !isResolved && (
            <button
              onClick={onResolve}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-success)] text-white rounded-md text-sm font-medium hover:bg-[var(--color-success)]/90 transition-colors disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              Mark Resolved
            </button>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex gap-6">
        {/* Main Column - Timeline (65%) */}
        <div className="w-[65%] space-y-4">
          {/* Timeline Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Timeline
            </h2>
            {canEdit && !isResolved && (
              <button
                onClick={() => setShowUpdateForm(!showUpdateForm)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-hover)] transition-colors"
              >
                <Plus size={14} />
                Add Update
              </button>
            )}
          </div>

          {/* Add Update Form */}
          {showUpdateForm && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <form onSubmit={handleSubmitUpdate}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">
                    Post Update
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowUpdateForm(false)}
                    className="p-1 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Status
                    </label>
                    <select
                      value={updateData.status}
                      onChange={(e) =>
                        setUpdateData({ ...updateData, status: e.target.value as IncidentStatus })
                      }
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Message
                    </label>
                    <textarea
                      value={updateData.message}
                      onChange={(e) => setUpdateData({ ...updateData, message: e.target.value })}
                      required
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
                      placeholder="Describe the current status..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUpdateForm(false)}
                      className="px-3 py-1.5 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating || !updateData.message.trim()}
                      className="px-3 py-1.5 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
                      Post Update
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <IncidentTimeline updates={incident.updates || []} />
          </div>
        </div>

        {/* Sidebar - Metadata (35%) */}
        <div className="w-[35%] space-y-4">
          {/* Status Card */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Status
            </h3>
            <div className="flex items-center gap-2">
              <StatusBadge status={incident.status} />
              {isResolved && (
                <span className="text-xs text-[var(--text-muted)]">
                  {format(new Date(incident.resolvedAt!), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>

          {/* Severity Card */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Severity
            </h3>
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={16}
                className={
                  incident.severity === 'major_outage'
                    ? 'text-[var(--color-error)]'
                    : incident.severity === 'partial_outage'
                    ? 'text-[var(--color-error)]'
                    : 'text-[var(--color-warning)]'
                }
              />
              <span className="text-sm text-[var(--text-primary)]">
                {severityLabels[incident.severity] || incident.severity}
              </span>
            </div>
          </div>

          {/* Affected Components */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Affected Components
            </h3>
            <div className="flex flex-wrap gap-2">
              {incident.components.map((component) => (
                <span
                  key={component}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)]"
                >
                  <Server size={12} className="text-[var(--text-muted)]" />
                  {component}
                </span>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock size={14} className="text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Created</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {format(new Date(incident.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              {incident.resolvedAt && (
                <div className="flex items-start gap-3">
                  <CheckCircle size={14} className="text-[var(--color-success)] mt-0.5" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Resolved</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {format(new Date(incident.resolvedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <User size={14} className="text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Created by</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {incident.createdByEmail}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Message */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Customer Message
            </h3>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
              {incident.customerMessage}
            </p>
          </div>

          {/* Internal Notes */}
          {incident.internalNotes && (
            <div className="bg-[var(--color-warning-soft)] border border-[var(--color-warning)]/20 rounded-lg p-4">
              <h3 className="text-xs font-medium text-[var(--color-warning)] uppercase tracking-wider mb-3">
                Internal Notes
              </h3>
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                {incident.internalNotes}
              </p>
            </div>
          )}

          {/* Edit Incident Button */}
          {canEdit && (
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <Pencil size={14} />
              Edit Incident
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
