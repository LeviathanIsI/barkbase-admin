import { useState } from 'react';
import { format, isPast, isFuture } from 'date-fns';
import { Loader2, Megaphone, Plus, X, Edit, Trash2, Info, AlertTriangle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { useBroadcasts, useCreateBroadcast, useUpdateBroadcast, useDeleteBroadcast } from '@/hooks/useApi';
import type { Broadcast, BroadcastType, BroadcastTarget, BroadcastLocation, CreateBroadcastInput, UpdateBroadcastInput } from '@/types';

const typeConfig: Record<BroadcastType, { color: string; bgColor: string; icon: typeof Info; label: string }> = {
  info: {
    color: 'text-[var(--color-info)]',
    bgColor: 'bg-[var(--color-info)]',
    icon: Info,
    label: 'Info',
  },
  warning: {
    color: 'text-[var(--color-warning)]',
    bgColor: 'bg-[var(--color-warning)]',
    icon: AlertTriangle,
    label: 'Warning',
  },
  critical: {
    color: 'text-[var(--color-error)]',
    bgColor: 'bg-[var(--color-error)]',
    icon: AlertCircle,
    label: 'Critical',
  },
};

const targetLabels: Record<BroadcastTarget, string> = {
  all: 'All Tenants',
  'plan:free': 'Free Plan',
  'plan:pro': 'Pro Plan',
  'plan:enterprise': 'Enterprise',
};

const locationLabels: Record<BroadcastLocation, string> = {
  app_banner: 'In-App Banner',
  email: 'Email',
  status_page: 'Status Page',
};

function TypeBadge({ type }: { type: BroadcastType }) {
  const config = typeConfig[type];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${config.color} bg-opacity-10`}
      style={{ backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)` }}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

interface BroadcastFormData {
  title: string;
  message: string;
  type: BroadcastType;
  target: BroadcastTarget;
  displayLocations: BroadcastLocation[];
  startsAt: string;
  expiresAt: string;
}

function BroadcastModal({
  broadcast,
  onClose,
  onSave,
  isSaving,
}: {
  broadcast?: Broadcast;
  onClose: () => void;
  onSave: (data: CreateBroadcastInput | UpdateBroadcastInput) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<BroadcastFormData>({
    title: broadcast?.title || '',
    message: broadcast?.message || '',
    type: broadcast?.type || 'info',
    target: broadcast?.target || 'all',
    displayLocations: broadcast?.displayLocations || ['app_banner'],
    startsAt: broadcast?.startsAt
      ? format(new Date(broadcast.startsAt), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    expiresAt: broadcast?.expiresAt
      ? format(new Date(broadcast.expiresAt), "yyyy-MM-dd'T'HH:mm")
      : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: formData.title,
      message: formData.message,
      type: formData.type,
      target: formData.target,
      displayLocations: formData.displayLocations,
      startsAt: new Date(formData.startsAt).toISOString(),
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
    });
  };

  const toggleLocation = (location: BroadcastLocation) => {
    setFormData(prev => ({
      ...prev,
      displayLocations: prev.displayLocations.includes(location)
        ? prev.displayLocations.filter(l => l !== location)
        : [...prev.displayLocations, location],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[var(--z-modal)]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {broadcast ? 'Edit Broadcast' : 'New Broadcast'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4 overflow-y-auto border-r border-[var(--border-primary)]">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Title <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="e.g., New Feature: AI Scheduling"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Message <span className="text-[var(--color-error)]">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                required
                rows={4}
                placeholder="Markdown supported..."
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Type
                </label>
                <div className="flex gap-2">
                  {(Object.keys(typeConfig) as BroadcastType[]).map(type => {
                    const config = typeConfig[type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                          formData.type === type
                            ? `${config.bgColor} text-white`
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                        }`}
                      >
                        <Icon size={14} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Target Audience
                </label>
                <select
                  value={formData.target}
                  onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value as BroadcastTarget }))}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                >
                  {(Object.entries(targetLabels) as [BroadcastTarget, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Display Locations
              </label>
              <div className="flex gap-2">
                {(Object.entries(locationLabels) as [BroadcastLocation, string][]).map(([location, label]) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => toggleLocation(location)}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      formData.displayLocations.includes(location)
                        ? 'bg-[var(--color-brand)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Start Time <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, startsAt: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Expiration (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                />
              </div>
            </div>
          </form>

          {/* Preview */}
          <div className="w-80 p-4 overflow-y-auto bg-[var(--bg-tertiary)]">
            <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Preview
            </div>
            <div className="space-y-3">
              {formData.displayLocations.includes('app_banner') && (
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] mb-1">In-App Banner</div>
                  <div className={`p-3 rounded-md ${typeConfig[formData.type].bgColor} text-white`}>
                    <div className="flex items-start gap-2">
                      {(() => {
                        const Icon = typeConfig[formData.type].icon;
                        return <Icon size={16} className="flex-shrink-0 mt-0.5" />;
                      })()}
                      <div>
                        <div className="font-medium text-sm">{formData.title || 'Title'}</div>
                        <div className="text-xs opacity-90 mt-0.5">{formData.message || 'Message...'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {formData.displayLocations.includes('status_page') && (
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] mb-1">Status Page</div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeBadge type={formData.type} />
                    </div>
                    <div className="font-medium text-sm text-[var(--text-primary)]">{formData.title || 'Title'}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">{formData.message || 'Message...'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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
            disabled={isSaving || !formData.title || !formData.message || formData.displayLocations.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {broadcast ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BroadcastCard({
  broadcast,
  onEdit,
  onDelete,
  onToggle,
}: {
  broadcast: Broadcast;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const config = typeConfig[broadcast.type];
  const Icon = config.icon;
  const isExpired = broadcast.expiresAt && isPast(new Date(broadcast.expiresAt));
  const isScheduled = isFuture(new Date(broadcast.startsAt));

  return (
    <div className={`bg-[var(--bg-secondary)] border rounded-lg p-4 ${
      broadcast.isActive && !isExpired ? 'border-[var(--color-brand)]' : 'border-[var(--border-primary)]'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={config.color} size={18} />
          <div>
            <h4 className="text-sm font-medium text-[var(--text-primary)]">{broadcast.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <TypeBadge type={broadcast.type} />
              <span className="text-[10px] text-[var(--text-muted)]">
                {targetLabels[broadcast.target]}
              </span>
              {isExpired && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  Expired
                </span>
              )}
              {isScheduled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-info-soft)] text-[var(--color-info)]">
                  Scheduled
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-md transition-colors ${
              broadcast.isActive
                ? 'text-[var(--color-success)] hover:bg-[var(--color-success-soft)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--hover-overlay)]'
            }`}
            title={broadcast.isActive ? 'Deactivate' : 'Activate'}
          >
            {broadcast.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
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

      <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">{broadcast.message}</p>

      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div className="flex gap-2">
          {broadcast.displayLocations.map(location => (
            <span key={location} className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)]">
              {locationLabels[location]}
            </span>
          ))}
        </div>
        <span>
          {format(new Date(broadcast.startsAt), 'MMM d, h:mm a')}
          {broadcast.expiresAt && ` - ${format(new Date(broadcast.expiresAt), 'MMM d, h:mm a')}`}
        </span>
      </div>
    </div>
  );
}

export function Broadcasts() {
  const [showModal, setShowModal] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | undefined>();
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('all');

  const { data, isLoading } = useBroadcasts();
  const createBroadcast = useCreateBroadcast();
  const updateBroadcast = useUpdateBroadcast(editingBroadcast?.id || '');
  const deleteBroadcast = useDeleteBroadcast();

  const handleSave = async (data: CreateBroadcastInput | UpdateBroadcastInput) => {
    if (editingBroadcast) {
      await updateBroadcast.mutateAsync(data as UpdateBroadcastInput);
    } else {
      await createBroadcast.mutateAsync(data as CreateBroadcastInput);
    }
    setShowModal(false);
    setEditingBroadcast(undefined);
  };

  const handleEdit = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this broadcast?')) {
      await deleteBroadcast.mutateAsync(id);
    }
  };

  const handleToggle = async (broadcast: Broadcast) => {
    await updateBroadcast.mutateAsync({ isActive: !broadcast.isActive });
  };

  const filteredBroadcasts = data?.broadcasts?.filter(b => {
    if (filter === 'active') return b.isActive;
    if (filter === 'inactive') return !b.isActive;
    return true;
  }) || [];

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Broadcasts</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Send announcements to tenants
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBroadcast(undefined);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
        >
          <Plus size={16} />
          New Broadcast
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'inactive'] as const).map(f => (
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
      ) : filteredBroadcasts.length > 0 ? (
        <div className="space-y-3">
          {filteredBroadcasts.map(broadcast => (
            <BroadcastCard
              key={broadcast.id}
              broadcast={broadcast}
              onEdit={() => handleEdit(broadcast)}
              onDelete={() => handleDelete(broadcast.id)}
              onToggle={() => handleToggle(broadcast)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] mb-4">
            <Megaphone className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-medium text-[var(--text-primary)]">No broadcasts</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Create a broadcast to communicate with tenants
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <BroadcastModal
          broadcast={editingBroadcast}
          onClose={() => {
            setShowModal(false);
            setEditingBroadcast(undefined);
          }}
          onSave={handleSave}
          isSaving={createBroadcast.isPending || updateBroadcast.isPending}
        />
      )}
    </div>
  );
}
