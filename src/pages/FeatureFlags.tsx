import { useState, useMemo, useEffect } from 'react';
import {
  Loader2, Flag, Plus, X, ChevronRight, Edit, Trash2, Search, Copy, Check,
  AlertTriangle, Zap, FlaskConical, Crown, AlertOctagon, Wrench,
  ToggleLeft, ToggleRight, Users, History, Code, ArrowLeft
} from 'lucide-react';
import {
  useFeatureFlags, useFeatureFlagStats, useFeatureFlag,
  useFeatureFlagTenants, useFeatureFlagHistory,
  useCreateFeatureFlag, useUpdateFeatureFlag, useDeleteFeatureFlag,
  useToggleFeatureFlag, useUpdateFeatureFlagRollout, useKillFeatureFlag,
  useArchiveFeatureFlag, useAddFeatureFlagOverride, useRemoveFeatureFlagOverride,
  useTenants
} from '@/hooks/useApi';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import type {
  FeatureFlag, FeatureFlagCategory, FeatureFlagRolloutStrategy,
  FeatureFlagHistoryEntry, FeatureFlagTenantStatus,
  CreateFeatureFlagInput
} from '@/types';

// =============================================================================
// Stats Card Component
// =============================================================================

function StatsCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
      <div className={`text-2xl font-semibold ${color || 'text-[var(--text-primary)]'}`}>
        {value}
      </div>
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

// =============================================================================
// Badge Components
// =============================================================================

const categoryConfig: Record<FeatureFlagCategory, { icon: React.ReactNode; label: string; color: string }> = {
  core: { icon: <Zap size={12} />, label: 'Core Feature', color: 'text-blue-400 bg-blue-400/10' },
  beta: { icon: <FlaskConical size={12} />, label: 'Beta Feature', color: 'text-purple-400 bg-purple-400/10' },
  experiment: { icon: <FlaskConical size={12} />, label: 'Experiment', color: 'text-pink-400 bg-pink-400/10' },
  tier_gate: { icon: <Crown size={12} />, label: 'Tier Gating', color: 'text-amber-400 bg-amber-400/10' },
  kill_switch: { icon: <AlertOctagon size={12} />, label: 'Kill Switch', color: 'text-red-400 bg-red-400/10' },
  ops: { icon: <Wrench size={12} />, label: 'Ops/Debug', color: 'text-gray-400 bg-gray-400/10' },
};

function CategoryBadge({ category }: { category: FeatureFlagCategory }) {
  const config = categoryConfig[category] || categoryConfig.core;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function StatusBadge({ enabled, rolloutPercentage, rolloutStrategy }: {
  enabled: boolean;
  rolloutPercentage: number;
  rolloutStrategy: FeatureFlagRolloutStrategy;
}) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">
        OFF
      </span>
    );
  }

  if (rolloutStrategy === 'percentage' && rolloutPercentage < 100) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-amber-400/10 text-amber-400">
        <span className="relative w-3 h-3">
          <span className="absolute inset-0 rounded-full bg-amber-400 opacity-30"></span>
          <span
            className="absolute inset-0 rounded-full bg-amber-400"
            style={{
              clipPath: `polygon(0 0, ${rolloutPercentage}% 0, ${rolloutPercentage}% 100%, 0 100%)`
            }}
          ></span>
        </span>
        ROLLOUT {rolloutPercentage}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-400/10 text-green-400">
      ON
    </span>
  );
}

// =============================================================================
// Create/Edit Flag Modal
// =============================================================================

function FlagModal({
  flag,
  isOpen,
  onClose,
}: {
  flag?: FeatureFlag;
  isOpen: boolean;
  onClose: () => void;
}) {
  const createFlag = useCreateFeatureFlag();
  const updateFlag = useUpdateFeatureFlag(flag?.id || '');
  const { data: tenantsData } = useTenants({ limit: 100 });

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateFeatureFlagInput>>({
    flagKey: '',
    displayName: '',
    description: '',
    category: 'core',
    enabled: false,
    rolloutStrategy: 'all_or_nothing',
    rolloutPercentage: 0,
    rolloutSticky: true,
    allowedTiers: [],
    isKillSwitch: false,
    requireConfirmation: false,
    logChecks: false,
    environments: ['production', 'staging'],
  });

  useEffect(() => {
    if (flag) {
      setFormData({
        flagKey: flag.flagKey,
        displayName: flag.displayName,
        description: flag.description || '',
        category: flag.category,
        enabled: flag.enabled,
        rolloutStrategy: flag.rolloutStrategy,
        rolloutPercentage: flag.rolloutPercentage,
        rolloutSticky: flag.rolloutSticky,
        allowedTiers: flag.allowedTiers || [],
        isKillSwitch: flag.isKillSwitch,
        requireConfirmation: flag.requireConfirmation,
        logChecks: flag.logChecks,
        environments: flag.environments || ['production', 'staging'],
      });
    } else {
      setFormData({
        flagKey: '',
        displayName: '',
        description: '',
        category: 'core',
        enabled: false,
        rolloutStrategy: 'all_or_nothing',
        rolloutPercentage: 0,
        rolloutSticky: true,
        allowedTiers: [],
        isKillSwitch: false,
        requireConfirmation: false,
        logChecks: false,
        environments: ['production', 'staging'],
      });
    }
    setStep(1);
  }, [flag, isOpen]);

  const generateKey = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  const handleSubmit = async () => {
    if (flag) {
      await updateFlag.mutateAsync({
        displayName: formData.displayName,
        description: formData.description,
        category: formData.category,
        rolloutStrategy: formData.rolloutStrategy,
        rolloutPercentage: formData.rolloutPercentage,
        rolloutSticky: formData.rolloutSticky,
        allowedTiers: formData.allowedTiers,
        isKillSwitch: formData.isKillSwitch,
        requireConfirmation: formData.requireConfirmation,
        logChecks: formData.logChecks,
        environments: formData.environments,
      });
    } else {
      await createFlag.mutateAsync(formData as CreateFeatureFlagInput);
    }
    onClose();
  };

  const isValid = formData.flagKey && formData.displayName && /^[a-z][a-z0-9_]*$/.test(formData.flagKey || '');

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title={flag ? 'Edit Feature Flag' : 'Create Feature Flag'}
      width="md"
      footer={
        <div className="flex justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
            >
              Cancel
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !isValid}
                className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createFlag.isPending || updateFlag.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                {(createFlag.isPending || updateFlag.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {flag ? 'Update Flag' : 'Create Flag'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-6">
        {['Basics', 'Targeting', 'Options'].map((label, i) => (
          <div key={i} className="flex items-center">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
              step > i + 1 ? 'bg-[var(--color-success)] text-white' :
              step === i + 1 ? 'bg-[var(--color-brand)] text-white' :
              'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}>
              {step > i + 1 ? <Check size={12} /> : i + 1}
            </div>
            <span className={`ml-2 text-sm ${step === i + 1 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
              {label}
            </span>
            {i < 2 && <ChevronRight size={16} className="mx-2 text-[var(--text-muted)]" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Flag Key <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.flagKey}
              onChange={(e) => setFormData(prev => ({ ...prev, flagKey: e.target.value }))}
              disabled={!!flag}
              placeholder="e.g., ai_scheduling_v2"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)] disabled:opacity-50"
            />
            {!flag && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Lowercase snake_case. Cannot be changed after creation.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Display Name <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => {
                const name = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  displayName: name,
                  flagKey: flag ? prev.flagKey : generateKey(name),
                }));
              }}
              placeholder="e.g., AI-Powered Smart Scheduling"
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
              placeholder="Describe what this feature does..."
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(categoryConfig) as FeatureFlagCategory[]).map(cat => {
                const config = categoryConfig[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm ${
                      formData.category === cat
                        ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]'
                        : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
                    }`}
                  >
                    <span className={config.color.split(' ')[0]}>{config.icon}</span>
                    <span className="text-[var(--text-primary)]">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Targeting */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Rollout Strategy
            </label>
            <div className="space-y-2">
              {[
                { value: 'all_or_nothing', label: 'All or Nothing', desc: 'Flag is either ON or OFF for everyone' },
                { value: 'percentage', label: 'Percentage Rollout', desc: 'Gradual rollout to X% of tenants' },
                { value: 'tier', label: 'Subscription Tier', desc: 'Based on customer plan (Free, Pro, Enterprise)' },
                { value: 'specific', label: 'Specific Tenants', desc: 'Manually select tenants via overrides' },
              ].map(strategy => (
                <button
                  key={strategy.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, rolloutStrategy: strategy.value as FeatureFlagRolloutStrategy }))}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left ${
                    formData.rolloutStrategy === strategy.value
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]'
                      : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    formData.rolloutStrategy === strategy.value
                      ? 'border-[var(--color-brand)]'
                      : 'border-[var(--border-secondary)]'
                  }`}>
                    {formData.rolloutStrategy === strategy.value && (
                      <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{strategy.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{strategy.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {formData.rolloutStrategy === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Rollout Percentage: {formData.rolloutPercentage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.rolloutPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, rolloutPercentage: Number(e.target.value) }))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[var(--bg-tertiary)]"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-[var(--text-muted)]">0%</span>
                <span className="text-xs text-[var(--text-muted)]">50%</span>
                <span className="text-xs text-[var(--text-muted)]">100%</span>
              </div>
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={formData.rolloutSticky}
                  onChange={(e) => setFormData(prev => ({ ...prev, rolloutSticky: e.target.checked }))}
                  className="rounded border-[var(--border-primary)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Sticky (same tenants stay in rollout)</span>
              </label>
            </div>
          )}

          {formData.rolloutStrategy === 'tier' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Allowed Tiers
              </label>
              <div className="space-y-2">
                {['free', 'pro', 'enterprise'].map(tier => (
                  <label key={tier} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.allowedTiers?.includes(tier)}
                      onChange={(e) => {
                        const tiers = formData.allowedTiers || [];
                        setFormData(prev => ({
                          ...prev,
                          allowedTiers: e.target.checked
                            ? [...tiers, tier]
                            : tiers.filter(t => t !== tier)
                        }));
                      }}
                      className="rounded border-[var(--border-primary)]"
                    />
                    <span className="text-sm text-[var(--text-secondary)] capitalize">{tier}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Options */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Additional Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Enable Kill Switch</div>
                  <div className="text-xs text-[var(--text-muted)]">Adds emergency disable button</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isKillSwitch}
                  onChange={(e) => setFormData(prev => ({ ...prev, isKillSwitch: e.target.checked }))}
                  className="rounded border-[var(--border-primary)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Require Confirmation</div>
                  <div className="text-xs text-[var(--text-muted)]">Ask for confirmation before toggling</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.requireConfirmation}
                  onChange={(e) => setFormData(prev => ({ ...prev, requireConfirmation: e.target.checked }))}
                  className="rounded border-[var(--border-primary)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Log All Checks</div>
                  <div className="text-xs text-[var(--text-muted)]">Log every flag evaluation (for debugging)</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.logChecks}
                  onChange={(e) => setFormData(prev => ({ ...prev, logChecks: e.target.checked }))}
                  className="rounded border-[var(--border-primary)]"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Environments
            </label>
            <div className="flex gap-2">
              {['production', 'staging', 'development'].map(env => (
                <label key={env} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.environments?.includes(env)}
                    onChange={(e) => {
                      const envs = formData.environments || [];
                      setFormData(prev => ({
                        ...prev,
                        environments: e.target.checked
                          ? [...envs, env]
                          : envs.filter(e => e !== env)
                      }));
                    }}
                    className="rounded border-[var(--border-primary)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)] capitalize">{env}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </SlideOutPanel>
  );
}

// =============================================================================
// Flag Detail View
// =============================================================================

function FlagDetailView({
  flag,
  onBack,
  onEdit,
}: {
  flag: FeatureFlag;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'history' | 'code'>('overview');
  const [tenantFilter, setTenantFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [tenantSearch, setTenantSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfirmKill, setShowConfirmKill] = useState(false);
  const [showAddOverride, setShowAddOverride] = useState(false);

  const { data: tenantsData } = useFeatureFlagTenants(flag.id, { filter: tenantFilter, search: tenantSearch });
  const { data: historyData } = useFeatureFlagHistory(flag.id);
  const { data: allTenantsData } = useTenants({ limit: 100 });

  const toggleFlag = useToggleFeatureFlag(flag.id);
  const updateRollout = useUpdateFeatureFlagRollout(flag.id);
  const killFlag = useKillFeatureFlag(flag.id);
  const archiveFlag = useArchiveFeatureFlag(flag.id);
  const addOverride = useAddFeatureFlagOverride(flag.id);
  const removeOverride = useRemoveFeatureFlagOverride(flag.id);

  const copyFlagKey = () => {
    navigator.clipboard.writeText(flag.flagKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async () => {
    await toggleFlag.mutateAsync({ enabled: !flag.enabled, confirmed: true });
  };

  const handleRollout = async (percentage: number) => {
    await updateRollout.mutateAsync({ percentage });
  };

  const handleKill = async () => {
    await killFlag.mutateAsync({ reason: 'Emergency kill switch activated' });
    setShowConfirmKill(false);
  };

  const handleAddOverride = async (tenantId: string, enabled: boolean) => {
    await addOverride.mutateAsync({ tenantId, data: { enabled } });
    setShowAddOverride(false);
  };

  const handleRemoveOverride = async (tenantId: string) => {
    if (confirm('Remove this override?')) {
      await removeOverride.mutateAsync(tenantId);
    }
  };

  const codeExamples = {
    backend: `const { isFeatureEnabled } = require('./feature-flags');

// Check if feature is enabled for this tenant
if (await isFeatureEnabled('${flag.flagKey}', tenantId)) {
  // Feature is enabled
}`,
    frontend: `import { useFeatureFlag } from '@/hooks/useFeatureFlag';

function MyComponent() {
  const isEnabled = useFeatureFlag('${flag.flagKey}');

  return (
    <>
      {isEnabled && <NewFeature />}
    </>
  );
}`,
    api: `GET /api/v1/feature-flags/:tenantId

Response:
{
  "${flag.flagKey}": true,
  ...
}`
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2"
          >
            <ArrowLeft size={16} />
            Back to Feature Flags
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{flag.displayName}</h1>
            <StatusBadge
              enabled={flag.enabled}
              rolloutPercentage={flag.rolloutPercentage}
              rolloutStrategy={flag.rolloutStrategy}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="text-sm px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-mono">
              {flag.flagKey}
            </code>
            <button
              onClick={copyFlagKey}
              className="p-1 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
            >
              {copied ? <Check size={14} className="text-[var(--color-success)]" /> : <Copy size={14} />}
            </button>
            <CategoryBadge category={flag.category} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            disabled={toggleFlag.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
              flag.enabled
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--hover-overlay)]'
                : 'bg-[var(--color-success)] text-white hover:opacity-90'
            }`}
          >
            {toggleFlag.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : flag.enabled ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            {flag.enabled ? 'Disable' : 'Enable'}
          </button>

          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--hover-overlay)]"
          >
            <Edit size={16} />
            Edit
          </button>

          {flag.isKillSwitch && (
            <button
              onClick={() => setShowConfirmKill(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-error)] text-white hover:opacity-90"
            >
              <AlertOctagon size={16} />
              Kill Switch
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border-primary)]">
        {[
          { id: 'overview', label: 'Overview', icon: Flag },
          { id: 'tenants', label: 'Tenants', icon: Users },
          { id: 'history', label: 'History', icon: History },
          { id: 'code', label: 'Code Example', icon: Code },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="text-sm text-[var(--text-muted)]">Strategy</div>
              <div className="text-lg font-medium text-[var(--text-primary)] capitalize mt-1">
                {flag.rolloutStrategy.replace('_', ' ')}
              </div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="text-sm text-[var(--text-muted)]">Rollout</div>
              <div className="text-lg font-medium text-[var(--text-primary)] mt-1">
                {flag.rolloutPercentage}%
              </div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="text-sm text-[var(--text-muted)]">Tenants Enabled</div>
              <div className="text-lg font-medium text-[var(--text-primary)] mt-1">
                {flag.enabledTenantCount || 0} / {flag.totalTenantCount || 0}
              </div>
            </div>
          </div>

          {/* Rollout Progress */}
          {flag.rolloutStrategy === 'percentage' && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">Current Rollout</span>
                <span className="text-sm text-[var(--text-muted)]">{flag.rolloutPercentage}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-brand)] rounded-full transition-all"
                  style={{ width: `${flag.rolloutPercentage}%` }}
                />
              </div>
              <div className="flex gap-2 mt-4">
                {[10, 25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => handleRollout(pct)}
                    disabled={updateRollout.isPending}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${
                      flag.rolloutPercentage === pct
                        ? 'bg-[var(--color-brand)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {flag.description && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="text-sm font-medium text-[var(--text-muted)] mb-2">Description</div>
              <p className="text-sm text-[var(--text-primary)]">{flag.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <div className="text-sm font-medium text-[var(--text-muted)] mb-3">Details</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">Created by:</span>
                <span className="text-[var(--text-primary)] ml-2">{flag.createdByName || flag.createdBy}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Created:</span>
                <span className="text-[var(--text-primary)] ml-2">{new Date(flag.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Environments:</span>
                <span className="text-[var(--text-primary)] ml-2">{flag.environments?.join(', ')}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Last updated:</span>
                <span className="text-[var(--text-primary)] ml-2">{new Date(flag.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tenants' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Search tenants..."
                  className="pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] w-64"
                />
              </div>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value as typeof tenantFilter)}
                className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)]"
              >
                <option value="all">All</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <button
              onClick={() => setShowAddOverride(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]"
            >
              <Plus size={16} />
              Add Override
            </button>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-tertiary)]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Source</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {tenantsData?.tenants?.map((tenant: FeatureFlagTenantStatus) => (
                  <tr key={tenant.tenantId} className="hover:bg-[var(--hover-overlay)]">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{tenant.tenantName}</div>
                      {tenant.tenantPlan && (
                        <div className="text-xs text-[var(--text-muted)]">{tenant.tenantPlan}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        tenant.enabled
                          ? 'bg-green-400/10 text-green-400'
                          : 'bg-gray-400/10 text-gray-400'
                      }`}>
                        {tenant.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--text-muted)] capitalize">{tenant.source}</span>
                      {tenant.overrideReason && (
                        <div className="text-xs text-[var(--text-muted)]">{tenant.overrideReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tenant.source === 'override' ? (
                        <button
                          onClick={() => handleRemoveOverride(tenant.tenantId)}
                          className="text-sm text-[var(--color-error)] hover:underline"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddOverride(tenant.tenantId, !tenant.enabled)}
                          className="text-sm text-[var(--color-brand)] hover:underline"
                        >
                          {tenant.enabled ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {historyData?.history?.map((entry: FeatureFlagHistoryEntry) => (
            <div key={entry.id} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    entry.changeType === 'enabled' ? 'bg-green-400/10 text-green-400' :
                    entry.changeType === 'disabled' ? 'bg-red-400/10 text-red-400' :
                    entry.changeType === 'created' ? 'bg-blue-400/10 text-blue-400' :
                    'bg-gray-400/10 text-gray-400'
                  }`}>
                    {entry.changeType.replace('_', ' ')}
                  </span>
                  {entry.reason && (
                    <p className="text-sm text-[var(--text-primary)] mt-2">{entry.reason}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-[var(--text-primary)]">{entry.createdByName || entry.createdBy}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'code' && (
        <div className="space-y-4">
          {Object.entries(codeExamples).map(([lang, code]) => (
            <div key={lang} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{lang}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="text-xs text-[var(--color-brand)] hover:underline"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 text-sm text-[var(--text-primary)] font-mono overflow-x-auto">
                {code}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Kill Switch Confirmation Dialog */}
      {showConfirmKill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6 max-w-md">
            <div className="flex items-center gap-3 text-[var(--color-error)] mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-semibold">Emergency Kill Switch</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              This will immediately disable <strong>{flag.displayName}</strong> for all tenants. This action will be logged.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmKill(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                Cancel
              </button>
              <button
                onClick={handleKill}
                disabled={killFlag.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-error)] text-white hover:opacity-90"
              >
                {killFlag.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Kill Feature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Override Dialog */}
      {showAddOverride && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add Tenant Override</h3>
            <div className="space-y-4">
              {allTenantsData?.tenants?.slice(0, 10).map((tenant: { id: string; name: string }) => (
                <div key={tenant.id} className="flex items-center justify-between p-2 rounded hover:bg-[var(--hover-overlay)]">
                  <span className="text-sm text-[var(--text-primary)]">{tenant.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddOverride(tenant.id, true)}
                      className="px-2 py-1 rounded text-xs bg-green-400/10 text-green-400 hover:bg-green-400/20"
                    >
                      Enable
                    </button>
                    <button
                      onClick={() => handleAddOverride(tenant.id, false)}
                      className="px-2 py-1 rounded text-xs bg-red-400/10 text-red-400 hover:bg-red-400/20"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAddOverride(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Flag Card Component
// =============================================================================

function FlagCard({
  flag,
  onClick,
}: {
  flag: FeatureFlag;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 cursor-pointer hover:border-[var(--color-brand)] transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-mono">
            {flag.flagKey}
          </code>
        </div>
        <StatusBadge
          enabled={flag.enabled}
          rolloutPercentage={flag.rolloutPercentage}
          rolloutStrategy={flag.rolloutStrategy}
        />
      </div>

      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{flag.displayName}</h3>
      {flag.description && (
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{flag.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <CategoryBadge category={flag.category} />
        {flag.rolloutStrategy === 'percentage' && flag.rolloutPercentage < 100 && (
          <span className="flex items-center gap-1">
            <div className="w-12 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-brand)] rounded-full"
                style={{ width: `${flag.rolloutPercentage}%` }}
              />
            </div>
            {flag.rolloutPercentage}%
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users size={12} />
          {flag.enabledTenantCount || 0}/{flag.totalTenantCount || 0}
        </span>
      </div>

      <div className="text-xs text-[var(--text-muted)] mt-3">
        Last changed: {new Date(flag.updatedAt).toLocaleDateString()} by {flag.createdByName || flag.createdBy}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FeatureFlags() {
  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | undefined>();
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | undefined>();
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled' | 'rollout' | 'archived'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useFeatureFlags({
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });
  const { data: statsData } = useFeatureFlagStats();

  const stats = statsData?.stats || { total: 0, enabled: 0, inRollout: 0, recentlyChanged: 0 };
  const flags = data?.flags || [];

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingFlag(undefined);
    setShowModal(true);
  };

  if (selectedFlag) {
    return (
      <FlagDetailView
        flag={selectedFlag}
        onBack={() => setSelectedFlag(undefined)}
        onEdit={() => handleEdit(selectedFlag)}
      />
    );
  }

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
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
        >
          <Plus size={16} />
          Create Flag
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Flags" value={stats.total} />
        <StatsCard label="Enabled" value={stats.enabled} color="text-green-400" />
        <StatsCard label="In Rollout" value={stats.inRollout} color="text-amber-400" />
        <StatsCard label="Recently Changed" value={stats.recentlyChanged} color="text-blue-400" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-1 p-1 bg-[var(--bg-tertiary)] rounded-lg">
          {['all', 'enabled', 'disabled', 'rollout', 'archived'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)]"
        >
          <option value="">All Categories</option>
          {Object.keys(categoryConfig).map(cat => (
            <option key={cat} value={cat}>
              {categoryConfig[cat as FeatureFlagCategory].label}
            </option>
          ))}
        </select>

        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flags..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
        </div>
      ) : flags.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {flags.map(flag => (
            <FlagCard
              key={flag.id}
              flag={flag}
              onClick={() => setSelectedFlag(flag)}
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

      {/* Create/Edit Modal */}
      <FlagModal
        flag={editingFlag}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingFlag(undefined);
        }}
      />
    </div>
  );
}
