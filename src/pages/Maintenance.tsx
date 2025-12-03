import { useState } from 'react';
import { format, isWithinInterval, isFuture, isPast } from 'date-fns';
import { Loader2, Calendar, Plus, X, Clock, CheckCircle, XCircle, Wrench, Edit, Trash2 } from 'lucide-react';
import { useMaintenanceList, useCreateMaintenance, useUpdateMaintenance, useDeleteMaintenance } from '@/hooks/useApi';
import type { ScheduledMaintenance, MaintenanceStatus, CreateMaintenanceInput, UpdateMaintenanceInput } from '@/types';

const COMPONENTS = [
  'API',
  'Web App',
  'Mobile App',
  'Database',
  'Authentication',
  'Payments',
  'Notifications',
  'File Storage',
];

const statusConfig: Record<MaintenanceStatus, { color: string; icon: typeof Clock; label: string }> = {
  scheduled: {
    color: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
    icon: Clock,
    label: 'Scheduled',
  },
  in_progress: {
    color: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
    icon: Wrench,
    label: 'In Progress',
  },
  completed: {
    color: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
    icon: CheckCircle,
    label: 'Completed',
  },
  cancelled: {
    color: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
    icon: XCircle,
    label: 'Cancelled',
  },
};

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

interface MaintenanceFormData {
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  affectedComponents: string[];
  notifyCustomers: boolean;
}

function MaintenanceModal({
  maintenance,
  onClose,
  onSave,
  isSaving,
}: {
  maintenance?: ScheduledMaintenance;
  onClose: () => void;
  onSave: (data: CreateMaintenanceInput | UpdateMaintenanceInput) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<MaintenanceFormData>({
    title: maintenance?.title || '',
    description: maintenance?.description || '',
    scheduledStart: maintenance?.scheduledStart
      ? format(new Date(maintenance.scheduledStart), "yyyy-MM-dd'T'HH:mm")
      : '',
    scheduledEnd: maintenance?.scheduledEnd
      ? format(new Date(maintenance.scheduledEnd), "yyyy-MM-dd'T'HH:mm")
      : '',
    affectedComponents: maintenance?.affectedComponents || [],
    notifyCustomers: maintenance?.notifyCustomers ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: formData.title,
      description: formData.description || undefined,
      scheduledStart: new Date(formData.scheduledStart).toISOString(),
      scheduledEnd: new Date(formData.scheduledEnd).toISOString(),
      affectedComponents: formData.affectedComponents,
      notifyCustomers: formData.notifyCustomers,
    });
  };

  const toggleComponent = (component: string) => {
    setFormData(prev => ({
      ...prev,
      affectedComponents: prev.affectedComponents.includes(component)
        ? prev.affectedComponents.filter(c => c !== component)
        : [...prev.affectedComponents, component],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[var(--z-modal)]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {maintenance ? 'Edit Maintenance' : 'Schedule Maintenance'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Title <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="e.g., Database Migration"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe the maintenance work..."
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Affected Components
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPONENTS.map(component => (
                <button
                  key={component}
                  type="button"
                  onClick={() => toggleComponent(component)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    formData.affectedComponents.includes(component)
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                  }`}
                >
                  {component}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifyCustomers}
                onChange={(e) => setFormData(prev => ({ ...prev, notifyCustomers: e.target.checked }))}
                className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Notify customers about this maintenance
              </span>
            </label>
          </div>
        </form>

        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-primary)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.title || !formData.scheduledStart || !formData.scheduledEnd}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {maintenance ? 'Update' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MaintenanceCard({
  maintenance,
  onEdit,
  onDelete,
  onUpdateStatus,
}: {
  maintenance: ScheduledMaintenance;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: MaintenanceStatus) => void;
}) {
  const startDate = new Date(maintenance.scheduledStart);
  const endDate = new Date(maintenance.scheduledEnd);
  const now = new Date();

  const isUpcoming = isFuture(startDate);
  const isOngoing = isWithinInterval(now, { start: startDate, end: endDate });

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)]">{maintenance.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={maintenance.status} />
            {maintenance.notifyCustomers && (
              <span className="text-[10px] text-[var(--text-muted)]">Customers notified</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
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

      {maintenance.description && (
        <p className="text-xs text-[var(--text-muted)] mb-3">{maintenance.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-3">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>{format(startDate, 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}</span>
        </div>
      </div>

      {maintenance.affectedComponents.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {maintenance.affectedComponents.map(component => (
            <span
              key={component}
              className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
            >
              {component}
            </span>
          ))}
        </div>
      )}

      {/* Quick status actions */}
      {maintenance.status === 'scheduled' && isOngoing && (
        <button
          onClick={() => onUpdateStatus('in_progress')}
          className="w-full mt-2 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-warning-soft)] text-[var(--color-warning)] hover:bg-[var(--color-warning)] hover:text-black transition-colors"
        >
          Start Maintenance
        </button>
      )}
      {maintenance.status === 'in_progress' && (
        <button
          onClick={() => onUpdateStatus('completed')}
          className="w-full mt-2 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-success-soft)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white transition-colors"
        >
          Mark Completed
        </button>
      )}
      {maintenance.status === 'scheduled' && isUpcoming && (
        <button
          onClick={() => onUpdateStatus('cancelled')}
          className="w-full mt-2 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

export function Maintenance() {
  const [showModal, setShowModal] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<ScheduledMaintenance | undefined>();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  const { data, isLoading } = useMaintenanceList();
  const createMaintenance = useCreateMaintenance();
  const updateMaintenance = useUpdateMaintenance(editingMaintenance?.id || '');
  const deleteMaintenance = useDeleteMaintenance();

  const handleSave = async (data: CreateMaintenanceInput | UpdateMaintenanceInput) => {
    if (editingMaintenance) {
      await updateMaintenance.mutateAsync(data as UpdateMaintenanceInput);
    } else {
      await createMaintenance.mutateAsync(data as CreateMaintenanceInput);
    }
    setShowModal(false);
    setEditingMaintenance(undefined);
  };

  const handleEdit = (maintenance: ScheduledMaintenance) => {
    setEditingMaintenance(maintenance);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this maintenance window?')) {
      await deleteMaintenance.mutateAsync(id);
    }
  };

  const handleUpdateStatus = async (_maintenance: ScheduledMaintenance, status: MaintenanceStatus) => {
    await updateMaintenance.mutateAsync({ status });
  };

  const filteredMaintenance = data?.maintenance?.filter(m => {
    const endDate = new Date(m.scheduledEnd);
    if (filter === 'upcoming') {
      return isFuture(endDate) || m.status === 'in_progress';
    }
    if (filter === 'past') {
      return isPast(endDate) && m.status !== 'in_progress';
    }
    return true;
  }) || [];

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
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
        >
          <Plus size={16} />
          Schedule Maintenance
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--hover-overlay)]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
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
              onUpdateStatus={(status) => handleUpdateStatus(maintenance, status)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] mb-4">
            <Calendar className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-medium text-[var(--text-primary)]">No maintenance scheduled</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {filter === 'upcoming' ? 'No upcoming maintenance windows' : 'No maintenance windows found'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <MaintenanceModal
          maintenance={editingMaintenance}
          onClose={() => {
            setShowModal(false);
            setEditingMaintenance(undefined);
          }}
          onSave={handleSave}
          isSaving={createMaintenance.isPending || updateMaintenance.isPending}
        />
      )}
    </div>
  );
}
