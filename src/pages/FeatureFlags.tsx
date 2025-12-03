import { useState } from 'react';
import { Loader2, Flag, Plus, X, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Edit, Trash2, Users, Search } from 'lucide-react';
import { useFeatureFlags, useFeatureFlag, useCreateFeatureFlag, useUpdateFeatureFlag, useDeleteFeatureFlag, useAddFeatureFlagOverride, useRemoveFeatureFlagOverride, useSearch } from '@/hooks/useApi';
import type { FeatureFlag, CreateFeatureFlagInput, UpdateFeatureFlagInput, FeatureFlagOverride } from '@/types';

function FlagModal({
  flag,
  onClose,
  onSave,
  isSaving,
}: {
  flag?: FeatureFlag;
  onClose: () => void;
  onSave: (data: CreateFeatureFlagInput | UpdateFeatureFlagInput) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    key: flag?.key || '',
    name: flag?.name || '',
    description: flag?.description || '',
    isEnabled: flag?.isEnabled ?? false,
    rolloutPercentage: flag?.rolloutPercentage ?? 100,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(flag ? {
      name: formData.name,
      description: formData.description || undefined,
      isEnabled: formData.isEnabled,
      rolloutPercentage: formData.rolloutPercentage,
    } : {
      key: formData.key,
      name: formData.name,
      description: formData.description || undefined,
      isEnabled: formData.isEnabled,
      rolloutPercentage: formData.rolloutPercentage,
    });
  };

  const generateKey = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[var(--z-modal)]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {flag ? 'Edit Feature Flag' : 'Create Feature Flag'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!flag && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Key <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                required
                pattern="[a-z0-9_]+"
                placeholder="e.g., ai_scheduling"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Name <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  name: e.target.value,
                  key: flag ? prev.key : generateKey(e.target.value),
                }));
              }}
              required
              placeholder="e.g., AI Scheduling"
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
              rows={2}
              placeholder="Describe what this feature does..."
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-md">
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Enabled</span>
              <p className="text-xs text-[var(--text-muted)]">Turn this feature on globally</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={`p-1 ${formData.isEnabled ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]'}`}
            >
              {formData.isEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Rollout Percentage: {formData.rolloutPercentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.rolloutPercentage}
              onChange={(e) => setFormData(prev => ({ ...prev, rolloutPercentage: Number(e.target.value) }))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[var(--bg-tertiary)]"
            />
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
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
            disabled={isSaving || !formData.name || (!flag && !formData.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {flag ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OverrideModal({
  flagId,
  onClose,
}: {
  flagId: string;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [enableOverride, setEnableOverride] = useState(true);

  const { data: searchData, isLoading: isSearching } = useSearch(searchQuery);
  const addOverride = useAddFeatureFlagOverride(flagId);

  const tenantResults = searchData?.results?.filter(r => r.type === 'tenant') || [];

  const handleAdd = async () => {
    if (!selectedTenantId) return;
    await addOverride.mutateAsync({ tenantId: selectedTenantId, isEnabled: enableOverride });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[var(--z-modal)]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Add Tenant Override
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Search Tenant
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedTenantId('');
                }}
                placeholder="Search by tenant name..."
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              />
            </div>
            {searchQuery.length >= 2 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-[var(--border-primary)] rounded-md">
                {isSearching ? (
                  <div className="p-3 text-center">
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  </div>
                ) : tenantResults.length > 0 ? (
                  tenantResults.map(tenant => (
                    <button
                      key={tenant.id}
                      onClick={() => {
                        setSelectedTenantId(tenant.id);
                        setSearchQuery(tenant.name);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--hover-overlay)] ${
                        selectedTenantId === tenant.id ? 'bg-[var(--color-brand-subtle)]' : ''
                      }`}
                    >
                      <span className="text-[var(--text-primary)]">{tenant.name}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">{tenant.subdomain}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-sm text-[var(--text-muted)]">
                    No tenants found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-md">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Enable for this tenant
            </span>
            <button
              type="button"
              onClick={() => setEnableOverride(!enableOverride)}
              className={`p-1 ${enableOverride ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}
            >
              {enableOverride ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
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
            onClick={handleAdd}
            disabled={!selectedTenantId || addOverride.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {addOverride.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Override
          </button>
        </div>
      </div>
    </div>
  );
}

function FlagRow({
  flag,
  onEdit,
  onDelete,
  onToggle,
}: {
  flag: FeatureFlag;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const { data: flagDetail, isLoading: isLoadingDetail } = useFeatureFlag(expanded ? flag.id : '');
  const removeOverride = useRemoveFeatureFlagOverride(flag.id);

  const handleRemoveOverride = async (overrideId: string) => {
    if (confirm('Remove this override?')) {
      await removeOverride.mutateAsync(overrideId);
    }
  };

  return (
    <>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg">
        <div className="flex items-center p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 mr-2 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">{flag.name}</span>
              <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-mono">
                {flag.key}
              </code>
            </div>
            {flag.description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{flag.description}</p>
            )}
          </div>

          <div className="flex items-center gap-4 ml-4">
            {/* Rollout */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-brand)] rounded-full"
                  style={{ width: `${flag.rolloutPercentage}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] w-8">{flag.rolloutPercentage}%</span>
            </div>

            {/* Override count */}
            {flag.overrideCount && flag.overrideCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Users size={12} />
                {flag.overrideCount}
              </span>
            )}

            {/* Toggle */}
            <button
              onClick={onToggle}
              className={`p-1 ${flag.isEnabled ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]'}`}
            >
              {flag.isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>

            {/* Actions */}
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
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-[var(--border-primary)] p-4 bg-[var(--bg-tertiary)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Tenant Overrides
              </h4>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]"
              >
                <Plus size={12} />
                Add Override
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-4 text-center">
                <Loader2 className="w-4 h-4 animate-spin inline" />
              </div>
            ) : flagDetail?.overrides && flagDetail.overrides.length > 0 ? (
              <div className="space-y-2">
                {flagDetail.overrides.map((override: FeatureFlagOverride) => (
                  <div
                    key={override.id}
                    className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]"
                  >
                    <div>
                      <span className="text-sm text-[var(--text-primary)]">
                        {override.tenantName || override.tenantId.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        override.isEnabled
                          ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                          : 'bg-[var(--color-error-soft)] text-[var(--color-error)]'
                      }`}>
                        {override.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => handleRemoveOverride(override.id)}
                        className="p-1 rounded hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">
                No tenant overrides. This flag uses the global setting for all tenants.
              </p>
            )}
          </div>
        )}
      </div>

      {showOverrideModal && (
        <OverrideModal
          flagId={flag.id}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
    </>
  );
}

export function FeatureFlags() {
  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | undefined>();

  const { data, isLoading } = useFeatureFlags();
  const createFlag = useCreateFeatureFlag();
  const updateFlag = useUpdateFeatureFlag(editingFlag?.id || '');
  const deleteFlag = useDeleteFeatureFlag();

  const handleSave = async (data: CreateFeatureFlagInput | UpdateFeatureFlagInput) => {
    if (editingFlag) {
      await updateFlag.mutateAsync(data as UpdateFeatureFlagInput);
    } else {
      await createFlag.mutateAsync(data as CreateFeatureFlagInput);
    }
    setShowModal(false);
    setEditingFlag(undefined);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this feature flag? This cannot be undone.')) {
      await deleteFlag.mutateAsync(id);
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    await updateFlag.mutateAsync({ isEnabled: !flag.isEnabled });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Feature Flags</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Control feature rollout across tenants
          </p>
        </div>
        <button
          onClick={() => {
            setEditingFlag(undefined);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
        >
          <Plus size={16} />
          Create Flag
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
        </div>
      ) : data?.flags && data.flags.length > 0 ? (
        <div className="space-y-3">
          {data.flags.map(flag => (
            <FlagRow
              key={flag.id}
              flag={flag}
              onEdit={() => handleEdit(flag)}
              onDelete={() => handleDelete(flag.id)}
              onToggle={() => handleToggle(flag)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] mb-4">
            <Flag className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-medium text-[var(--text-primary)]">No feature flags</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Create feature flags to control feature rollout
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <FlagModal
          flag={editingFlag}
          onClose={() => {
            setShowModal(false);
            setEditingFlag(undefined);
          }}
          onSave={handleSave}
          isSaving={createFlag.isPending || updateFlag.isPending}
        />
      )}
    </div>
  );
}
