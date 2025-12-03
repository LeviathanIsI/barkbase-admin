import { useState, useEffect } from 'react';
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Plus,
  Send,
  Edit3,
  Trash2,
  Bell,
  FileText,
  Timer,
  TrendingDown,
  Activity,
  Circle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  useIncidents,
  useIncidentStats,
  useIncident,
  useCreateIncident,
  useUpdateIncident,
  useDeleteIncident,
  useIncidentUpdates,
  useAddIncidentUpdate,
  useIncidentAffected,
  useAddIncidentAffected,
  useRemoveIncidentAffected,
  useNotifyIncidentAffected,
  useIncidentPostmortem,
  useSavePostmortem,
  usePublishPostmortem,
  useCreatePostmortemAction,
  useUpdatePostmortemAction,
  useDeletePostmortemAction,
} from '@/hooks/useIncidents';
import { useTenants } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentUpdateType,
  IncidentUpdate,
  IncidentAffectedCustomer,
  IncidentPostmortem,
  PostmortemActionItem,
  CreateIncidentInput,
  CreateIncidentUpdateInput,
  SavePostmortemInput,
} from '@/types';

// Constants
const SERVICES = [
  'API Gateway',
  'Authentication',
  'Database',
  'Payment Processing',
  'Email Service',
  'File Storage',
  'Search Service',
  'Webhooks',
  'Mobile API',
  'Admin Portal',
];

const SEVERITY_CONFIG = {
  critical: { color: 'var(--color-error)', bg: 'var(--color-error-soft)', icon: '🔴', label: 'Critical' },
  major: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', icon: '🟠', label: 'Major' },
  minor: { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', icon: '🟡', label: 'Minor' },
  low: { color: 'var(--color-brand)', bg: 'var(--color-brand-soft)', icon: '🔵', label: 'Low' },
};

const STATUS_CONFIG = {
  investigating: { color: 'var(--color-error)', icon: AlertCircle, label: 'Investigating' },
  identified: { color: '#f97316', icon: Circle, label: 'Identified' },
  monitoring: { color: 'var(--color-warning)', icon: Activity, label: 'Monitoring' },
  resolved: { color: 'var(--color-success)', icon: CheckCircle2, label: 'Resolved' },
};

const UPDATE_TYPE_LABELS: Record<IncidentUpdateType, string> = {
  status_change: 'Status Change',
  investigation: 'Investigation Update',
  resolution: 'Resolution',
  communication: 'Communication',
  escalation: 'Escalation',
};

// Helper functions
function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

// StatCard Component
function StatCard({
  label,
  value,
  trend,
  trendLabel,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 flex-1">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md" style={{ backgroundColor: color ? `${color}20` : 'var(--bg-tertiary)' }}>
          <Icon size={14} style={{ color: color || 'var(--text-muted)' }} />
        </div>
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold" style={{ color: color || 'var(--text-primary)' }}>
          {value}
        </span>
        {trendLabel && (
          <span className={`text-xs ${trend === 'down' ? 'text-[var(--color-success)]' : trend === 'up' ? 'text-[var(--color-error)]' : 'text-[var(--text-muted)]'}`}>
            {trend === 'down' && <TrendingDown size={12} className="inline mr-1" />}
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// IncidentCard Component
function IncidentCard({
  incident,
  isSelected,
  onClick,
}: {
  incident: Incident;
  isSelected: boolean;
  onClick: () => void;
}) {
  const severity = SEVERITY_CONFIG[incident.severity];
  const status = STATUS_CONFIG[incident.status];
  const StatusIcon = status.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-tertiary)] ${
        isSelected ? 'bg-[var(--bg-tertiary)]' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg" title={severity.label}>{severity.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[var(--text-muted)]">INC-{incident.incidentNumber}</span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${status.color}20`, color: status.color }}
            >
              <StatusIcon size={10} />
              {status.label}
            </span>
          </div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{incident.title}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
            <span>{incident.affectedService || 'Multiple Services'}</span>
            {incident.affectedCustomersCount > 0 && (
              <span className="flex items-center gap-1">
                <Users size={10} />
                {incident.affectedCustomersCount}
              </span>
            )}
            <span>{formatRelativeTime(incident.createdAt)}</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// StatusDropdown Component
function StatusDropdown({
  value,
  onChange,
  disabled,
}: {
  value: IncidentStatus;
  onChange: (status: IncidentStatus) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const config = STATUS_CONFIG[value];
  const StatusIcon = config.icon;

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        <StatusIcon size={14} />
        {config.label}
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
            {(Object.keys(STATUS_CONFIG) as IncidentStatus[]).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              return (
                <button
                  key={status}
                  onClick={() => {
                    onChange(status);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: cfg.color }}
                >
                  <Icon size={14} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// SeverityDropdown Component
function SeverityDropdown({
  value,
  onChange,
  disabled,
}: {
  value: IncidentSeverity;
  onChange: (severity: IncidentSeverity) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const config = SEVERITY_CONFIG[value];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
      >
        <span>{config.icon}</span>
        {config.label}
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
            {(Object.keys(SEVERITY_CONFIG) as IncidentSeverity[]).map((severity) => {
              const cfg = SEVERITY_CONFIG[severity];
              return (
                <button
                  key={severity}
                  onClick={() => {
                    onChange(severity);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// TimelineEntry Component
function TimelineEntry({ update, isLast }: { update: IncidentUpdate; isLast: boolean }) {
  const status = update.newStatus ? STATUS_CONFIG[update.newStatus] : null;
  const Icon = status?.icon || Circle;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: status ? `${status.color}20` : 'var(--bg-tertiary)' }}
        >
          <Icon size={14} style={{ color: status?.color || 'var(--text-muted)' }} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-[var(--border-primary)] my-1" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            {UPDATE_TYPE_LABELS[update.updateType]}
          </span>
          {update.isPublic && (
            <span className="text-xs text-[var(--color-brand)]">Public</span>
          )}
        </div>
        <p className="text-sm text-[var(--text-primary)] mb-1">{update.message}</p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{update.createdByName || 'System'}</span>
          <span>•</span>
          <span>{formatDateTime(update.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// TimelineTab Component
function TimelineTab({ incidentId, status }: { incidentId: string; status: IncidentStatus }) {
  const { data: updates, isLoading } = useIncidentUpdates(incidentId);
  const addUpdate = useAddIncidentUpdate(incidentId);
  const [message, setMessage] = useState('');
  const [updateType, setUpdateType] = useState<IncidentUpdateType>('investigation');
  const [isPublic, setIsPublic] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await addUpdate.mutateAsync({
      message: message.trim(),
      updateType,
      isPublic,
    });
    setMessage('');
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Add Update Button/Form */}
      {status !== 'resolved' && (
        <div className="mb-4">
          {showForm ? (
            <form onSubmit={handleSubmit} className="bg-[var(--bg-tertiary)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={updateType}
                  onChange={(e) => setUpdateType(e.target.value as IncidentUpdateType)}
                  className="px-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-[var(--text-primary)]"
                >
                  <option value="investigation">Investigation</option>
                  <option value="status_change">Status Change</option>
                  <option value="communication">Communication</option>
                  <option value="escalation">Escalation</option>
                  <option value="resolution">Resolution</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-[var(--border-primary)]"
                  />
                  Public
                </label>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's the latest update?"
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--color-brand)]"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!message.trim() || addUpdate.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-brand)] text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {addUpdate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Post Update
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
            >
              <Plus size={16} />
              Add Update
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div>
        {updates && updates.length > 0 ? (
          updates.map((update, idx) => (
            <TimelineEntry key={update.id} update={update} isLast={idx === updates.length - 1} />
          ))
        ) : (
          <div className="text-center py-8 text-sm text-[var(--text-muted)]">
            No updates yet. Add the first update to start tracking this incident.
          </div>
        )}
      </div>
    </div>
  );
}

// AffectedTab Component
function AffectedTab({ incidentId }: { incidentId: string }) {
  const { data: affected, isLoading } = useIncidentAffected(incidentId);
  const { data: tenantsData } = useTenants();
  const addAffected = useAddIncidentAffected(incidentId);
  const removeAffected = useRemoveIncidentAffected(incidentId);
  const notifyAffected = useNotifyIncidentAffected(incidentId);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!selectedTenant) return;
    await addAffected.mutateAsync({ tenant_id: selectedTenant, notes: notes || undefined });
    setSelectedTenant('');
    setNotes('');
    setShowAdd(false);
  };

  const handleNotify = async () => {
    if (confirm('Send notification to all affected customers?')) {
      await notifyAffected.mutateAsync();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  const tenants = tenantsData?.tenants || [];
  const affectedIds = new Set((affected || []).map((a) => a.tenantId));
  const availableTenants = tenants.filter((t) => !affectedIds.has(t.id));

  return (
    <div className="p-4">
      {/* Actions */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--border-primary)] transition-colors"
        >
          <Plus size={14} />
          Add Customer
        </button>
        {affected && affected.length > 0 && (
          <button
            onClick={handleNotify}
            disabled={notifyAffected.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-brand)] text-white rounded-md text-sm font-medium disabled:opacity-50"
          >
            {notifyAffected.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            Notify All
          </button>
        )}
      </div>

      {/* Add Customer Form */}
      {showAdd && (
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Add Affected Customer</h4>
          <div className="space-y-3">
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)]"
            >
              <option value="">Select a customer...</option>
              {availableTenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-sm text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!selectedTenant || addAffected.isPending}
                className="px-3 py-1.5 bg-[var(--color-brand)] text-white rounded-md text-sm font-medium disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Affected List */}
      {affected && affected.length > 0 ? (
        <div className="space-y-2">
          {affected.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg"
            >
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{customer.tenantName}</div>
                {customer.notes && (
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{customer.notes}</div>
                )}
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  Added {formatRelativeTime(customer.addedAt)}
                  {customer.notifiedAt && ` • Notified ${formatRelativeTime(customer.notifiedAt)}`}
                </div>
              </div>
              <button
                onClick={() => removeAffected.mutate(customer.id)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-[var(--text-muted)]">
          No affected customers tracked yet.
        </div>
      )}
    </div>
  );
}

// ActionItems Component
function ActionItems({
  actions,
  postmortemId,
  incidentId,
}: {
  actions: PostmortemActionItem[];
  postmortemId: string;
  incidentId: string;
}) {
  const createAction = useCreatePostmortemAction(postmortemId, incidentId);
  const updateAction = useUpdatePostmortemAction(postmortemId, incidentId);
  const deleteAction = useDeletePostmortemAction(postmortemId, incidentId);
  const [showAdd, setShowAdd] = useState(false);
  const [newAction, setNewAction] = useState({ title: '', assignee: '', dueDate: '' });

  const handleAdd = async () => {
    if (!newAction.title) return;
    await createAction.mutateAsync({
      title: newAction.title,
      assignee: newAction.assignee || undefined,
      dueDate: newAction.dueDate || undefined,
    });
    setNewAction({ title: '', assignee: '', dueDate: '' });
    setShowAdd(false);
  };

  const handleToggle = async (action: PostmortemActionItem) => {
    await updateAction.mutateAsync({
      actionId: action.id,
      status: action.status === 'completed' ? 'pending' : 'completed',
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">Action Items</h4>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs text-[var(--color-brand)] hover:underline"
        >
          + Add Item
        </button>
      </div>

      {showAdd && (
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 mb-2">
          <input
            type="text"
            value={newAction.title}
            onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
            placeholder="Action item..."
            className="w-full px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] mb-2"
          />
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newAction.assignee}
              onChange={(e) => setNewAction({ ...newAction, assignee: e.target.value })}
              placeholder="Assignee"
              className="flex-1 px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)]"
            />
            <input
              type="date"
              value={newAction.dueDate}
              onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
              className="px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs text-[var(--text-muted)]">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={!newAction.title || createAction.isPending}
              className="px-2 py-1 bg-[var(--color-brand)] text-white rounded text-xs disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {actions.length > 0 ? (
        actions.map((action) => (
          <div key={action.id} className="flex items-start gap-2 p-2 bg-[var(--bg-tertiary)] rounded">
            <button
              onClick={() => handleToggle(action)}
              className={`mt-0.5 ${action.status === 'completed' ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]'}`}
            >
              {action.status === 'completed' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${action.status === 'completed' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                {action.title}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                {action.assignee && <span>{action.assignee}</span>}
                {action.dueDate && <span>Due {formatDate(action.dueDate)}</span>}
              </div>
            </div>
            <button
              onClick={() => deleteAction.mutate(action.id)}
              className="text-[var(--text-muted)] hover:text-[var(--color-error)]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))
      ) : (
        <div className="text-xs text-[var(--text-muted)] text-center py-2">No action items yet.</div>
      )}
    </div>
  );
}

// PostmortemTab Component
function PostmortemTab({ incidentId }: { incidentId: string }) {
  const { data: postmortem, isLoading } = useIncidentPostmortem(incidentId);
  const savePostmortem = useSavePostmortem(incidentId);
  const publishPostmortem = usePublishPostmortem(incidentId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SavePostmortemInput>({
    summary: '',
    rootCause: '',
    impact: '',
    lessonsLearned: '',
  });

  useEffect(() => {
    if (postmortem) {
      setForm({
        summary: postmortem.summary || '',
        rootCause: postmortem.rootCause || '',
        impact: postmortem.impact || '',
        lessonsLearned: postmortem.lessonsLearned || '',
      });
    }
  }, [postmortem]);

  const handleSave = async () => {
    await savePostmortem.mutateAsync(form);
    setEditing(false);
  };

  const handlePublish = async () => {
    if (confirm('Publish this postmortem? It will become visible to customers.')) {
      await publishPostmortem.mutateAsync();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  const isPublished = postmortem?.status === 'published';

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Postmortem</span>
          {postmortem && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isPublished
                  ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              }`}
            >
              {postmortem.status}
            </span>
          )}
        </div>
        {!isPublished && (
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-[var(--color-brand)] hover:underline"
              >
                <Edit3 size={12} />
                Edit
              </button>
            )}
            {postmortem && form.summary && !editing && (
              <button
                onClick={handlePublish}
                disabled={publishPostmortem.isPending}
                className="flex items-center gap-1 px-2 py-1 bg-[var(--color-success)] text-white rounded text-xs font-medium disabled:opacity-50"
              >
                Publish
              </button>
            )}
          </div>
        )}
      </div>

      {/* Form/Content */}
      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Summary</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Brief summary of what happened..."
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Root Cause</label>
            <textarea
              value={form.rootCause}
              onChange={(e) => setForm({ ...form, rootCause: e.target.value })}
              placeholder="What caused the incident..."
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Impact</label>
            <textarea
              value={form.impact}
              onChange={(e) => setForm({ ...form, impact: e.target.value })}
              placeholder="What was the business/customer impact..."
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Lessons Learned</label>
            <textarea
              value={form.lessonsLearned}
              onChange={(e) => setForm({ ...form, lessonsLearned: e.target.value })}
              placeholder="What can we learn from this..."
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] resize-none"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-sm text-[var(--text-muted)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={savePostmortem.isPending}
              className="px-3 py-1.5 bg-[var(--color-brand)] text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {savePostmortem.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : postmortem ? (
        <div className="space-y-4">
          {form.summary && (
            <div>
              <h5 className="text-xs font-medium text-[var(--text-muted)] mb-1">Summary</h5>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{form.summary}</p>
            </div>
          )}
          {form.rootCause && (
            <div>
              <h5 className="text-xs font-medium text-[var(--text-muted)] mb-1">Root Cause</h5>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{form.rootCause}</p>
            </div>
          )}
          {form.impact && (
            <div>
              <h5 className="text-xs font-medium text-[var(--text-muted)] mb-1">Impact</h5>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{form.impact}</p>
            </div>
          )}
          {form.lessonsLearned && (
            <div>
              <h5 className="text-xs font-medium text-[var(--text-muted)] mb-1">Lessons Learned</h5>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{form.lessonsLearned}</p>
            </div>
          )}

          {/* Action Items */}
          <div className="border-t border-[var(--border-primary)] pt-4">
            <ActionItems
              actions={postmortem.actionItems || []}
              postmortemId={postmortem.id}
              incidentId={incidentId}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--text-muted)] mb-2">No postmortem created yet.</p>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-[var(--color-brand)] hover:underline"
          >
            Start Writing
          </button>
        </div>
      )}
    </div>
  );
}

// IncidentDetailPanel Component
function IncidentDetailPanel({
  incidentId,
  onClose,
}: {
  incidentId: string;
  onClose: () => void;
}) {
  const { data: incident, isLoading } = useIncident(incidentId);
  const updateIncident = useUpdateIncident(incidentId);
  const deleteIncident = useDeleteIncident();
  const [activeTab, setActiveTab] = useState<'timeline' | 'affected' | 'postmortem'>('timeline');

  const handleStatusChange = async (status: IncidentStatus) => {
    await updateIncident.mutateAsync({ status });
  };

  const handleSeverityChange = async (severity: IncidentSeverity) => {
    await updateIncident.mutateAsync({ severity });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
      await deleteIncident.mutateAsync(incidentId);
      onClose();
    }
  };

  if (isLoading || !incident) {
    return (
      <div className="w-[480px] border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  const severity = SEVERITY_CONFIG[incident.severity];

  return (
    <div className="w-[480px] border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-primary)]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{severity.icon}</span>
            <span className="text-xs font-mono text-[var(--text-muted)]">INC-{incident.incidentNumber}</span>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={18} />
          </button>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{incident.title}</h2>
        <div className="flex items-center gap-2 mb-3">
          <StatusDropdown
            value={incident.status}
            onChange={handleStatusChange}
            disabled={updateIncident.isPending}
          />
          <SeverityDropdown
            value={incident.severity}
            onChange={handleSeverityChange}
            disabled={updateIncident.isPending}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>{incident.affectedService || 'Multiple Services'}</span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatDuration(incident.duration)} duration
          </span>
          {incident.affectedCustomersCount > 0 && (
            <span className="flex items-center gap-1">
              <Users size={10} />
              {incident.affectedCustomersCount} affected
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-primary)]">
        {[
          { key: 'timeline', label: 'Timeline' },
          { key: 'affected', label: 'Affected' },
          { key: 'postmortem', label: 'Postmortem' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'timeline' && <TimelineTab incidentId={incidentId} status={incident.status} />}
        {activeTab === 'affected' && <AffectedTab incidentId={incidentId} />}
        {activeTab === 'postmortem' && <PostmortemTab incidentId={incidentId} />}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-primary)]">
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors"
        >
          <Trash2 size={12} />
          Delete Incident
        </button>
      </div>
    </div>
  );
}

// CreateIncidentPanel Component (slide-out from right)
function CreateIncidentPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const createIncident = useCreateIncident();
  const [form, setForm] = useState<CreateIncidentInput>({
    title: '',
    description: '',
    severity: 'minor',
    status: 'investigating',
    affectedService: '',
    impactScope: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    await createIncident.mutateAsync(form);
    onClose();
    setForm({
      title: '',
      description: '',
      severity: 'minor',
      status: 'investigating',
      affectedService: '',
      impactScope: '',
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-[var(--bg-primary)] border-l border-[var(--border-primary)] shadow-xl z-50 transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle size={18} className="text-[var(--color-error)]" />
              Report Incident
            </h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Title <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Brief description of the incident"
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as IncidentSeverity })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)]"
                >
                  {(Object.keys(SEVERITY_CONFIG) as IncidentSeverity[]).map((sev) => (
                    <option key={sev} value={sev}>
                      {SEVERITY_CONFIG[sev].icon} {SEVERITY_CONFIG[sev].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Affected Service</label>
                <select
                  value={form.affectedService}
                  onChange={(e) => setForm({ ...form, affectedService: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)]"
                >
                  <option value="">Select service...</option>
                  {SERVICES.map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Impact Scope</label>
                <input
                  type="text"
                  value={form.impactScope || ''}
                  onChange={(e) => setForm({ ...form, impactScope: e.target.value })}
                  placeholder="e.g., All users, US region, Enterprise tier"
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description of what's happening..."
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                  rows={6}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-primary)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.title || createIncident.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-error)] text-white rounded-md text-sm font-medium disabled:opacity-50"
              >
                {createIncident.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <AlertTriangle size={16} />
                )}
                Create Incident
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Main Incidents Component
export function Incidents() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useIncidentStats();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const { data, isLoading } = useIncidents({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    service: serviceFilter || undefined,
    search: searchQuery || undefined,
  });

  const incidents = data?.incidents || [];

  // Calculate stats
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const criticalCount = activeIncidents.filter((i) => i.severity === 'critical').length;

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Incidents</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Track, manage, and resolve platform incidents
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-error)] text-white rounded-md text-sm font-medium hover:bg-[var(--color-error)]/90 transition-colors"
            >
              <AlertTriangle size={16} />
              Report Incident
            </button>
          </div>

          {/* Stats Row */}
          <div className="flex gap-4 mb-6">
            <StatCard
              label="Active Incidents"
              value={stats?.activeCount ?? activeIncidents.length}
              icon={AlertTriangle}
              color={criticalCount > 0 ? 'var(--color-error)' : 'var(--color-warning)'}
            />
            <StatCard
              label="P1s This Year"
              value={stats?.criticalThisYear ?? 0}
              icon={XCircle}
              color="var(--color-error)"
            />
            <StatCard
              label="MTTR"
              value={stats?.mttr ? formatDuration(stats.mttr) : '-'}
              icon={Timer}
              trend={stats?.mttrTrend === 'down' ? 'down' : stats?.mttrTrend === 'up' ? 'up' : undefined}
              trendLabel={stats?.mttrTrendLabel}
            />
            <StatCard
              label="Resolved This Month"
              value={stats?.resolvedThisMonth ?? 0}
              icon={CheckCircle}
              color="var(--color-success)"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            {/* Status Tabs */}
            <div className="flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-1">
              {[
                { value: '', label: 'All' },
                { value: 'investigating', label: 'Investigating' },
                { value: 'identified', label: 'Identified' },
                { value: 'monitoring', label: 'Monitoring' },
                { value: 'resolved', label: 'Resolved' },
              ].map((filter) => (
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
              className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)]"
            >
              <option value="">All Severities</option>
              {(Object.keys(SEVERITY_CONFIG) as IncidentSeverity[]).map((sev) => (
                <option key={sev} value={sev}>
                  {SEVERITY_CONFIG[sev].icon} {SEVERITY_CONFIG[sev].label}
                </option>
              ))}
            </select>

            {/* Service Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)]"
            >
              <option value="">All Services</option>
              {SERVICES.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search incidents..."
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          </div>
        </div>

        {/* Incident List */}
        <div className="flex-1 overflow-y-auto border-t border-[var(--border-primary)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
            </div>
          ) : incidents.length > 0 ? (
            <div className="bg-[var(--bg-secondary)]">
              {incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  isSelected={incident.id === selectedIncidentId}
                  onClick={() => setSelectedIncidentId(incident.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-success-soft)] mb-4">
                <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
              </div>
              <p className="text-base font-medium text-[var(--text-primary)]">All clear</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">No incidents matching your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedIncidentId && (
        <IncidentDetailPanel
          incidentId={selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}

      {/* Create Panel */}
      <CreateIncidentPanel
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
