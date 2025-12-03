import { useState, useEffect } from 'react';
import { format, formatDistanceToNow, isFuture, isPast, differenceInMinutes, addHours } from 'date-fns';
import {
  Loader2, Calendar, Plus, Clock, CheckCircle, XCircle, Wrench, Edit, Trash2,
  AlertTriangle, ChevronRight, ChevronDown, Bell, Users, RefreshCw, Play,
  Square, SkipForward, Ban, MessageSquare, Send, X
} from 'lucide-react';
import {
  useMaintenanceList,
  useCreateMaintenance,
  useUpdateMaintenance,
  useDeleteMaintenance,
  useStartMaintenance,
  useCompleteMaintenance,
  useCancelMaintenance,
  useMaintenanceUpdates,
  usePostMaintenanceUpdate,
  useSendMaintenanceNotification,
} from '@/hooks/useApi';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import type {
  MaintenanceWindow,
  MaintenanceStatus,
  MaintenanceType,
  MaintenanceImpactLevel,
  MaintenanceOutcome,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  CompleteMaintenanceInput,
} from '@/types';

// ============================================================================
// Constants
// ============================================================================

const SERVICES = [
  'API',
  'Database',
  'Authentication',
  'Scheduler',
  'Payments',
  'Notifications',
  'File Storage',
  'Frontend',
];

const statusConfig: Record<MaintenanceStatus, { color: string; bg: string; icon: typeof Clock; label: string }> = {
  scheduled: {
    color: 'var(--color-info)',
    bg: 'var(--color-info-soft)',
    icon: Clock,
    label: 'Scheduled',
  },
  in_progress: {
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-soft)',
    icon: Wrench,
    label: 'In Progress',
  },
  completed: {
    color: 'var(--color-success)',
    bg: 'var(--color-success-soft)',
    icon: CheckCircle,
    label: 'Completed',
  },
  cancelled: {
    color: 'var(--text-muted)',
    bg: 'var(--bg-tertiary)',
    icon: XCircle,
    label: 'Cancelled',
  },
};

const impactConfig: Record<MaintenanceImpactLevel, { color: string; label: string }> = {
  none: { color: 'var(--color-success)', label: 'No Impact' },
  minor: { color: 'var(--color-info)', label: 'Minor' },
  moderate: { color: 'var(--color-warning)', label: 'Moderate' },
  major: { color: 'var(--color-error)', label: 'Major' },
};

const typeConfig: Record<MaintenanceType, { label: string; color: string }> = {
  planned: { label: 'Planned', color: 'var(--color-info)' },
  emergency: { label: 'Emergency', color: 'var(--color-error)' },
  recurring: { label: 'Recurring', color: 'var(--color-brand)' },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(start: string, end: string): string {
  const minutes = differenceInMinutes(new Date(end), new Date(start));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getProgressPercent(start: string, end: string): number {
  const now = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (now < startDate) return 0;
  if (now > endDate) return 100;
  const total = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  return Math.round((elapsed / total) * 100);
}

// ============================================================================
// Components
// ============================================================================

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <Icon size={10} />
      {config.label.toUpperCase()}
    </span>
  );
}

function ImpactBadge({ level }: { level: MaintenanceImpactLevel }) {
  const config = impactConfig[level];
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: MaintenanceType }) {
  const config = typeConfig[type];
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// Stats Header
// ============================================================================

function StatsHeader({ stats }: {
  stats: {
    upcoming: number;
    inProgress: number;
    completed: number;
    nextWindow?: { id: string; title: string; scheduledStart: string } | null;
  };
}) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Upcoming</div>
        <div className="text-2xl font-semibold text-[var(--color-info)]">{stats.upcoming}</div>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">In Progress</div>
        <div className="text-2xl font-semibold text-[var(--color-warning)]">{stats.inProgress}</div>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Completed</div>
        <div className="text-2xl font-semibold text-[var(--color-success)]">{stats.completed}</div>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Next Window</div>
        {stats.nextWindow ? (
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{stats.nextWindow.title}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {format(new Date(stats.nextWindow.scheduledStart), 'MMM d, h:mm a')}
            </div>
          </div>
        ) : (
          <div className="text-sm text-[var(--text-muted)]">None scheduled</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Maintenance Card
// ============================================================================

function MaintenanceCard({
  maintenance,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  onCancel,
  onViewDetails,
}: {
  maintenance: MaintenanceWindow;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onViewDetails: () => void;
}) {
  const startDate = new Date(maintenance.scheduledStart);
  const endDate = new Date(maintenance.scheduledEnd);
  const isUpcoming = isFuture(startDate) && maintenance.status === 'scheduled';
  const isInProgress = maintenance.status === 'in_progress';
  const isPastWindow = isPast(endDate);

  return (
    <div
      className={`bg-[var(--bg-secondary)] border rounded-lg p-4 transition-all ${
        isInProgress
          ? 'border-[var(--color-warning)] ring-1 ring-[var(--color-warning)]'
          : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={maintenance.status} />
            <TypeBadge type={maintenance.maintenanceType} />
            {maintenance.isRecurring && (
              <span className="text-[10px] text-[var(--text-muted)]">
                <RefreshCw size={10} className="inline mr-0.5" />
                Recurring
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{maintenance.title}</h4>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
            title="Edit"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Timing */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-3">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>{format(startDate, 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>
            {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
          </span>
        </div>
        <span className="text-[var(--text-muted)]">({formatDuration(maintenance.scheduledStart, maintenance.scheduledEnd)})</span>
      </div>

      {/* Progress bar for in-progress */}
      {isInProgress && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--color-warning)]">In Progress</span>
            <span className="text-[var(--text-muted)]">
              {getProgressPercent(maintenance.actualStart || maintenance.scheduledStart, maintenance.scheduledEnd)}%
            </span>
          </div>
          <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-warning)] rounded-full transition-all"
              style={{
                width: `${getProgressPercent(maintenance.actualStart || maintenance.scheduledStart, maintenance.scheduledEnd)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Services */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-[var(--text-muted)]">Services:</span>
        <div className="flex flex-wrap gap-1">
          {maintenance.affectedServices.slice(0, 3).map(service => (
            <span
              key={service}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >
              {service}
            </span>
          ))}
          {maintenance.affectedServices.length > 3 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              +{maintenance.affectedServices.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Impact */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-[var(--text-muted)]">Impact:</span>
        <ImpactBadge level={maintenance.impactLevel} />
        {maintenance.impactDescription && (
          <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
            {maintenance.impactDescription}
          </span>
        )}
      </div>

      {/* Description */}
      {maintenance.description && (
        <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">{maintenance.description}</p>
      )}

      {/* Completion summary for completed */}
      {maintenance.status === 'completed' && maintenance.completionSummary && (
        <div className="mb-3 p-2 bg-[var(--color-success-soft)] rounded text-xs">
          <div className="flex items-center gap-1 text-[var(--color-success)] font-medium mb-1">
            <CheckCircle size={12} />
            <span>Completed: {maintenance.outcome}</span>
          </div>
          <p className="text-[var(--text-secondary)]">{maintenance.completionSummary}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-3">
        <span>Created by {maintenance.createdByName || maintenance.createdBy}</span>
        <span>{formatDistanceToNow(new Date(maintenance.createdAt), { addSuffix: true })}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-primary)]">
        <button
          onClick={onViewDetails}
          className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] transition-colors"
        >
          View Details
        </button>

        {isUpcoming && !isPastWindow && (
          <>
            <button
              onClick={onStart}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-warning-soft)] text-[var(--color-warning)] hover:bg-[var(--color-warning)] hover:text-black transition-colors"
            >
              <Play size={12} className="inline mr-1" />
              Start
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {isInProgress && (
          <button
            onClick={onComplete}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-success-soft)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white transition-colors"
          >
            <CheckCircle size={12} className="inline mr-1" />
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// In-Progress Maintenance Card (Expanded View)
// ============================================================================

function InProgressCard({
  maintenance,
  onComplete,
  onPostUpdate,
}: {
  maintenance: MaintenanceWindow;
  onComplete: () => void;
  onPostUpdate: () => void;
}) {
  const { data: updatesData } = useMaintenanceUpdates(maintenance.id);
  const progress = getProgressPercent(
    maintenance.actualStart || maintenance.scheduledStart,
    maintenance.scheduledEnd
  );
  const elapsed = differenceInMinutes(
    new Date(),
    new Date(maintenance.actualStart || maintenance.scheduledStart)
  );

  return (
    <div className="bg-[var(--color-warning-soft)] border border-[var(--color-warning)] rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--color-warning)] rounded-lg">
            <Wrench size={20} className="text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-warning)] uppercase">In Progress</span>
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{maintenance.title}</h3>
          </div>
        </div>
        <div className="text-right text-xs text-[var(--text-muted)]">
          <div>Started: {format(new Date(maintenance.actualStart || maintenance.scheduledStart), 'h:mm a')}</div>
          <div>Est. End: {format(new Date(maintenance.scheduledEnd), 'h:mm a')}</div>
          <div>Elapsed: {Math.floor(elapsed / 60)}h {elapsed % 60}m</div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--text-secondary)]">Progress</span>
          <span className="text-[var(--color-warning)] font-medium">{progress}%</span>
        </div>
        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-warning)] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Live Updates */}
      {updatesData?.updates && updatesData.updates.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Live Updates
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {updatesData.updates.slice(0, 3).map(update => (
              <div key={update.id} className="flex gap-2 text-xs">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{
                    backgroundColor:
                      update.updateType === 'started' ? 'var(--color-info)' :
                      update.updateType === 'completed' ? 'var(--color-success)' :
                      'var(--color-warning)',
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-muted)]">
                      {format(new Date(update.createdAt), 'h:mm a')}
                    </span>
                    <span className="text-[var(--text-secondary)]">{update.createdByName}</span>
                  </div>
                  <p className="text-[var(--text-primary)]">{update.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPostUpdate}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-black/20 text-[var(--text-primary)] hover:bg-black/30 transition-colors"
        >
          <MessageSquare size={12} />
          Post Update
        </button>
        <button
          onClick={onComplete}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-success)] text-white hover:bg-[var(--color-success-hover)] transition-colors"
        >
          <CheckCircle size={12} />
          Complete
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Create/Edit Panel
// ============================================================================

interface MaintenanceFormData {
  title: string;
  description: string;
  internalNotes: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  isRecurring: boolean;
  maintenanceType: MaintenanceType;
  impactLevel: MaintenanceImpactLevel;
  impactDescription: string;
  affectedServices: string[];
  notifyCustomers: boolean;
  notify48h: boolean;
  notify24h: boolean;
  notifyOnStart: boolean;
  notifyOnComplete: boolean;
}

function MaintenancePanel({
  maintenance,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: {
  maintenance?: MaintenanceWindow;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateMaintenanceInput | UpdateMaintenanceInput) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<MaintenanceFormData>(() => getInitialFormData(maintenance));

  useEffect(() => {
    setFormData(getInitialFormData(maintenance));
  }, [maintenance]);

  function getInitialFormData(m?: MaintenanceWindow): MaintenanceFormData {
    return {
      title: m?.title || '',
      description: m?.description || '',
      internalNotes: m?.internalNotes || '',
      scheduledStart: m?.scheduledStart
        ? format(new Date(m.scheduledStart), "yyyy-MM-dd'T'HH:mm")
        : '',
      scheduledEnd: m?.scheduledEnd
        ? format(new Date(m.scheduledEnd), "yyyy-MM-dd'T'HH:mm")
        : '',
      timezone: m?.timezone || 'America/New_York',
      isRecurring: m?.isRecurring || false,
      maintenanceType: m?.maintenanceType || 'planned',
      impactLevel: m?.impactLevel || 'minor',
      impactDescription: m?.impactDescription || '',
      affectedServices: m?.affectedServices || [],
      notifyCustomers: m?.notifyCustomers ?? true,
      notify48h: m?.notificationConfig?.notify48h ?? true,
      notify24h: m?.notificationConfig?.notify24h ?? true,
      notifyOnStart: m?.notificationConfig?.onStart ?? true,
      notifyOnComplete: m?.notificationConfig?.onComplete ?? true,
    };
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: formData.title,
      description: formData.description || undefined,
      internalNotes: formData.internalNotes || undefined,
      scheduledStart: new Date(formData.scheduledStart).toISOString(),
      scheduledEnd: new Date(formData.scheduledEnd).toISOString(),
      timezone: formData.timezone,
      isRecurring: formData.isRecurring,
      maintenanceType: formData.maintenanceType,
      impactLevel: formData.impactLevel,
      impactDescription: formData.impactDescription || undefined,
      affectedServices: formData.affectedServices,
      notifyCustomers: formData.notifyCustomers,
      notificationConfig: {
        notify48h: formData.notify48h,
        notify24h: formData.notify24h,
        onStart: formData.notifyOnStart,
        onComplete: formData.notifyOnComplete,
      },
    });
  };

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      affectedServices: prev.affectedServices.includes(service)
        ? prev.affectedServices.filter(s => s !== service)
        : [...prev.affectedServices, service],
    }));
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title={maintenance ? 'Edit Maintenance' : 'Schedule Maintenance'}
      width="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.title || !formData.scheduledStart || !formData.scheduledEnd || formData.affectedServices.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <Calendar size={16} />
            {maintenance ? 'Update' : 'Schedule Maintenance'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Title <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
            placeholder="e.g., Database Performance Optimization"
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Maintenance Type
          </label>
          <div className="flex gap-3">
            {(['planned', 'emergency', 'recurring'] as MaintenanceType[]).map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="maintenanceType"
                  checked={formData.maintenanceType === type}
                  onChange={() => setFormData(prev => ({ ...prev, maintenanceType: type, isRecurring: type === 'recurring' }))}
                  className="w-4 h-4 text-[var(--color-brand)]"
                />
                <span className="text-sm text-[var(--text-secondary)] capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Start Time <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledStart}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledStart: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              End Time <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledEnd}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledEnd: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>
        </div>

        {formData.scheduledStart && formData.scheduledEnd && (
          <div className="text-xs text-[var(--text-muted)]">
            Duration: {formatDuration(formData.scheduledStart, formData.scheduledEnd)}
          </div>
        )}

        {/* Affected Services */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Affected Services <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map(service => (
              <button
                key={service}
                type="button"
                onClick={() => toggleService(service)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  formData.affectedServices.includes(service)
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                }`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>

        {/* Impact Level */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Expected Impact
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['none', 'minor', 'moderate', 'major'] as MaintenanceImpactLevel[]).map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, impactLevel: level }))}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  formData.impactLevel === level
                    ? 'ring-2 ring-[var(--color-brand)]'
                    : ''
                }`}
                style={{
                  backgroundColor: formData.impactLevel === level ? `${impactConfig[level].color}30` : 'var(--bg-tertiary)',
                  color: formData.impactLevel === level ? impactConfig[level].color : 'var(--text-secondary)',
                }}
              >
                {impactConfig[level].label}
              </button>
            ))}
          </div>
        </div>

        {/* Impact Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Impact Description (shown to customers)
          </label>
          <textarea
            value={formData.impactDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, impactDescription: e.target.value }))}
            rows={2}
            placeholder="Brief connection interruptions expected. Estimated downtime: 30-60 seconds."
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Description (Internal)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Detailed description of the maintenance work..."
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
          />
        </div>

        {/* Notifications Section */}
        <div className="border-t border-[var(--border-primary)] pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Customer Notifications</span>
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notifyCustomers}
              onChange={(e) => setFormData(prev => ({ ...prev, notifyCustomers: e.target.checked }))}
              className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--color-brand)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Send notifications to customers
            </span>
          </label>

          {formData.notifyCustomers && (
            <div className="ml-6 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notify48h}
                  onChange={(e) => setFormData(prev => ({ ...prev, notify48h: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--color-brand)]"
                />
                <span className="text-xs text-[var(--text-muted)]">48 hours before</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notify24h}
                  onChange={(e) => setFormData(prev => ({ ...prev, notify24h: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--color-brand)]"
                />
                <span className="text-xs text-[var(--text-muted)]">24 hours before</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifyOnStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifyOnStart: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--color-brand)]"
                />
                <span className="text-xs text-[var(--text-muted)]">When maintenance starts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifyOnComplete}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifyOnComplete: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--color-brand)]"
                />
                <span className="text-xs text-[var(--text-muted)]">When maintenance completes</span>
              </label>
            </div>
          )}
        </div>
      </form>
    </SlideOutPanel>
  );
}

// ============================================================================
// Complete Maintenance Modal
// ============================================================================

function CompleteMaintenancePanel({
  maintenance,
  isOpen,
  onClose,
  onComplete,
  isCompleting,
}: {
  maintenance: MaintenanceWindow;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: CompleteMaintenanceInput) => void;
  isCompleting: boolean;
}) {
  const [outcome, setOutcome] = useState<MaintenanceOutcome>('success');
  const [completionSummary, setCompletionSummary] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [customerImpactOccurred, setCustomerImpactOccurred] = useState(false);
  const [customerImpactDescription, setCustomerImpactDescription] = useState('');
  const [sendNotification, setSendNotification] = useState(true);

  const handleSubmit = () => {
    onComplete({
      outcome,
      completionSummary,
      completionNotes: completionNotes || undefined,
      customerImpactOccurred,
      customerImpactDescription: customerImpactDescription || undefined,
      sendNotification,
    });
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Complete: ${maintenance.title}`}
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCompleting || !completionSummary}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-success)] text-white hover:bg-[var(--color-success-hover)] disabled:opacity-50"
          >
            {isCompleting && <Loader2 className="w-4 h-4 animate-spin" />}
            <CheckCircle size={16} />
            Complete Maintenance
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Outcome <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="space-y-2">
            {([
              { value: 'success', label: 'Completed successfully', color: 'var(--color-success)' },
              { value: 'issues', label: 'Completed with issues', color: 'var(--color-warning)' },
              { value: 'partial', label: 'Partially completed', color: 'var(--color-warning)' },
              { value: 'aborted', label: 'Aborted', color: 'var(--color-error)' },
            ] as const).map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  checked={outcome === opt.value}
                  onChange={() => setOutcome(opt.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: outcome === opt.value ? opt.color : 'var(--text-secondary)' }}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Summary (shown to customers) <span className="text-[var(--color-error)]">*</span>
          </label>
          <textarea
            value={completionSummary}
            onChange={(e) => setCompletionSummary(e.target.value)}
            rows={3}
            required
            placeholder="Database optimization completed successfully. Query performance improved by approximately 40%."
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
          />
        </div>

        {/* Internal Notes */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Internal Notes
          </label>
          <textarea
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            rows={3}
            placeholder="Technical details, issues encountered, follow-up items..."
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
          />
        </div>

        {/* Customer Impact */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Customer Impact
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="impact"
                checked={!customerImpactOccurred}
                onChange={() => setCustomerImpactOccurred(false)}
                className="w-4 h-4"
              />
              <span className="text-sm text-[var(--text-secondary)]">No customer impact</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="impact"
                checked={customerImpactOccurred}
                onChange={() => setCustomerImpactOccurred(true)}
                className="w-4 h-4"
              />
              <span className="text-sm text-[var(--text-secondary)]">Impact occurred</span>
            </label>
          </div>

          {customerImpactOccurred && (
            <textarea
              value={customerImpactDescription}
              onChange={(e) => setCustomerImpactDescription(e.target.value)}
              rows={2}
              placeholder="Describe the customer impact..."
              className="mt-2 w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          )}
        </div>

        {/* Notification */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sendNotification}
            onChange={(e) => setSendNotification(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--color-brand)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">
            Send completion notification to customers
          </span>
        </label>
      </div>
    </SlideOutPanel>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Maintenance() {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceWindow | undefined>();
  const [completingMaintenance, setCompletingMaintenance] = useState<MaintenanceWindow | undefined>();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'in_progress' | 'past'>('upcoming');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');

  const { data, isLoading } = useMaintenanceList();
  const createMaintenance = useCreateMaintenance();
  const updateMaintenance = useUpdateMaintenance(editingMaintenance?.id || '');
  const deleteMaintenance = useDeleteMaintenance();
  const startMaintenanceMutation = useStartMaintenance(editingMaintenance?.id || '');
  const completeMaintenance = useCompleteMaintenance(completingMaintenance?.id || '');
  const cancelMaintenanceMutation = useCancelMaintenance(editingMaintenance?.id || '');

  const handleSave = async (formData: CreateMaintenanceInput | UpdateMaintenanceInput) => {
    if (editingMaintenance) {
      await updateMaintenance.mutateAsync(formData as UpdateMaintenanceInput);
    } else {
      await createMaintenance.mutateAsync(formData as CreateMaintenanceInput);
    }
    setShowCreatePanel(false);
    setEditingMaintenance(undefined);
  };

  const handleEdit = (maintenance: MaintenanceWindow) => {
    setEditingMaintenance(maintenance);
    setShowCreatePanel(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this maintenance window?')) {
      await deleteMaintenance.mutateAsync(id);
    }
  };

  const handleStart = async (maintenance: MaintenanceWindow) => {
    setEditingMaintenance(maintenance);
    await startMaintenanceMutation.mutateAsync();
    setEditingMaintenance(undefined);
  };

  const handleComplete = async (data: CompleteMaintenanceInput) => {
    await completeMaintenance.mutateAsync(data);
    setCompletingMaintenance(undefined);
  };

  const handleCancel = async (maintenance: MaintenanceWindow) => {
    if (confirm('Are you sure you want to cancel this maintenance?')) {
      setEditingMaintenance(maintenance);
      await cancelMaintenanceMutation.mutateAsync();
      setEditingMaintenance(undefined);
    }
  };

  // Filter maintenance items
  const filteredMaintenance = data?.maintenance?.filter(m => {
    const endDate = new Date(m.scheduledEnd);
    const startDate = new Date(m.scheduledStart);
    const now = new Date();

    // Status filter
    if (filter === 'upcoming' && !(m.status === 'scheduled' && isFuture(startDate))) return false;
    if (filter === 'in_progress' && m.status !== 'in_progress') return false;
    if (filter === 'past' && !(isPast(endDate) || m.status === 'completed' || m.status === 'cancelled')) return false;

    // Type filter
    if (typeFilter && m.maintenanceType !== typeFilter) return false;

    // Service filter
    if (serviceFilter && !m.affectedServices.includes(serviceFilter)) return false;

    return true;
  }) || [];

  // Get in-progress maintenance for the prominent card
  const inProgressMaintenance = data?.maintenance?.filter(m => m.status === 'in_progress') || [];

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Scheduled Maintenance</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Plan and manage maintenance windows
          </p>
        </div>
        <button
          onClick={() => {
            setEditingMaintenance(undefined);
            setShowCreatePanel(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
        >
          <Plus size={16} />
          Schedule Maintenance
        </button>
      </div>

      {/* Stats */}
      {data?.stats && <StatsHeader stats={data.stats} />}

      {/* In-Progress Maintenance */}
      {inProgressMaintenance.map(m => (
        <InProgressCard
          key={m.id}
          maintenance={m}
          onComplete={() => setCompletingMaintenance(m)}
          onPostUpdate={() => {/* TODO: implement post update modal */}}
        />
      ))}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['upcoming', 'in_progress', 'past', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--hover-overlay)]'
              }`}
            >
              {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)]"
          >
            <option value="">All Types</option>
            <option value="planned">Planned</option>
            <option value="emergency">Emergency</option>
            <option value="recurring">Recurring</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)]"
          >
            <option value="">All Services</option>
            {SERVICES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
        </div>
      ) : filteredMaintenance.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredMaintenance.map(maintenance => (
            <MaintenanceCard
              key={maintenance.id}
              maintenance={maintenance}
              onEdit={() => handleEdit(maintenance)}
              onDelete={() => handleDelete(maintenance.id)}
              onStart={() => handleStart(maintenance)}
              onComplete={() => setCompletingMaintenance(maintenance)}
              onCancel={() => handleCancel(maintenance)}
              onViewDetails={() => {/* TODO: implement detail view */}}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] mb-4">
            <Calendar className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-medium text-[var(--text-primary)]">No maintenance windows</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {filter === 'upcoming' ? 'No upcoming maintenance scheduled' :
             filter === 'in_progress' ? 'No maintenance currently in progress' :
             filter === 'past' ? 'No past maintenance found' :
             'No maintenance windows found'}
          </p>
        </div>
      )}

      {/* Create/Edit Panel */}
      <MaintenancePanel
        maintenance={editingMaintenance}
        isOpen={showCreatePanel}
        onClose={() => {
          setShowCreatePanel(false);
          setEditingMaintenance(undefined);
        }}
        onSave={handleSave}
        isSaving={createMaintenance.isPending || updateMaintenance.isPending}
      />

      {/* Complete Maintenance Panel */}
      {completingMaintenance && (
        <CompleteMaintenancePanel
          maintenance={completingMaintenance}
          isOpen={!!completingMaintenance}
          onClose={() => setCompletingMaintenance(undefined)}
          onComplete={handleComplete}
          isCompleting={completeMaintenance.isPending}
        />
      )}
    </div>
  );
}
