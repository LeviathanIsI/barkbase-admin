import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Loader2, Megaphone, Plus, Edit, Trash2, Send, Calendar, X, Eye,
  Mail, Monitor, Bell, Users, TrendingUp, Clock, Check, XCircle,
  ChevronLeft, ChevronRight, BarChart3, MousePointer, ArrowRight,
  Rocket, Package, Lightbulb, FileText, FlaskConical, Star, MessageSquare,
  Copy
} from 'lucide-react';
import {
  useBroadcasts, useCreateBroadcast, useUpdateBroadcast, useDeleteBroadcast,
  useSendBroadcast, useScheduleBroadcast, useCancelBroadcast, useEndBroadcast,
  useBroadcastAnalytics, useTenants
} from '@/hooks/useApi';
import { api } from '@/services/api';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import type {
  Broadcast, BroadcastType, BroadcastStatus, BroadcastAudienceType,
  BroadcastChannel, BroadcastBannerStyle, BroadcastAudienceConfig,
  CreateBroadcastInput, UpdateBroadcastInput
} from '@/types';

// =========================================================================
// Configuration
// =========================================================================

const typeConfig: Record<BroadcastType, { icon: typeof Rocket; label: string; description: string }> = {
  feature: { icon: Rocket, label: 'Feature Announcement', description: 'New features or capabilities' },
  update: { icon: Package, label: 'Product Update', description: 'General improvements and fixes' },
  tips: { icon: Lightbulb, label: 'Tips & Best Practices', description: 'Help customers succeed' },
  policy: { icon: FileText, label: 'Policy Update', description: 'Terms, pricing, or policy changes' },
  beta: { icon: FlaskConical, label: 'Beta Invitation', description: 'Invite to try new features' },
  promo: { icon: Star, label: 'Promotional', description: 'Upgrades, offers, campaigns' },
  general: { icon: MessageSquare, label: 'General', description: 'Other announcements' },
};

const statusConfig: Record<BroadcastStatus, { color: string; bgColor: string; label: string }> = {
  draft: { color: 'text-[var(--text-muted)]', bgColor: 'bg-[var(--bg-tertiary)]', label: 'Draft' },
  scheduled: { color: 'text-[var(--color-info)]', bgColor: 'bg-[var(--color-info-soft)]', label: 'Scheduled' },
  active: { color: 'text-[var(--color-success)]', bgColor: 'bg-[var(--color-success-soft)]', label: 'Active' },
  completed: { color: 'text-[var(--text-muted)]', bgColor: 'bg-[var(--bg-tertiary)]', label: 'Completed' },
  cancelled: { color: 'text-[var(--color-error)]', bgColor: 'bg-[var(--color-error-soft)]', label: 'Cancelled' },
};

const bannerStyleConfig: Record<BroadcastBannerStyle, { color: string; bgColor: string; label: string }> = {
  info: { color: '#3b82f6', bgColor: 'bg-blue-500', label: 'Info (Blue)' },
  success: { color: '#22c55e', bgColor: 'bg-green-500', label: 'Success (Green)' },
  warning: { color: '#f59e0b', bgColor: 'bg-amber-500', label: 'Warning (Yellow)' },
  promo: { color: '#8b5cf6', bgColor: 'bg-purple-500', label: 'Promo (Purple)' },
};

const audienceTypeLabels: Record<BroadcastAudienceType, string> = {
  all: 'All customers',
  tier: 'By subscription tier',
  activity: 'By activity',
  age: 'By account age',
  specific: 'Specific customers',
  segment: 'Custom segment',
};

// =========================================================================
// Helper Components
// =========================================================================

function StatusBadge({ status }: { status: BroadcastStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${config.color} ${config.bgColor}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: BroadcastType }) {
  const config = typeConfig[type];
  const Icon = config.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
      <Icon size={10} />
      {config.label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: BroadcastChannel }) {
  const icons: Record<BroadcastChannel, { icon: typeof Mail; label: string }> = {
    in_app: { icon: Monitor, label: 'In-App Banner' },
    email: { icon: Mail, label: 'Email' },
    push: { icon: Bell, label: 'Push' },
  };
  const { icon: Icon, label } = icons[channel];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
      <Icon size={10} />
      {label}
    </span>
  );
}

function StatsCard({ label, value, subValue, icon: Icon }: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: typeof TrendingUp;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
        <Icon size={14} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
      {subValue && (
        <div className="text-xs text-[var(--text-muted)] mt-1">{subValue}</div>
      )}
    </div>
  );
}

// =========================================================================
// Broadcast Card Component
// =========================================================================

function BroadcastCard({
  broadcast,
  onEdit,
  onDelete,
  onSend,
  onEnd,
  onViewStats,
  onClone,
}: {
  broadcast: Broadcast;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
  onEnd: () => void;
  onViewStats: () => void;
  onClone: () => void;
}) {
  const config = typeConfig[broadcast.broadcastType];
  const Icon = config.icon;

  const getAudienceLabel = () => {
    if (broadcast.audienceType === 'all') return 'All customers';
    if (broadcast.audienceType === 'tier' && broadcast.audienceConfig?.tiers) {
      return `${broadcast.audienceConfig.tiers.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')} customers`;
    }
    return audienceTypeLabels[broadcast.audienceType];
  };

  return (
    <div className={`bg-[var(--bg-secondary)] border rounded-lg p-4 ${
      broadcast.status === 'active' ? 'border-[var(--color-success)]' : 'border-[var(--border-primary)]'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            broadcast.status === 'active' ? 'bg-[var(--color-success-soft)]' : 'bg-[var(--bg-tertiary)]'
          }`}>
            <Icon size={18} className={broadcast.status === 'active' ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]'} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">{broadcast.title}</h4>
              <StatusBadge status={broadcast.status} />
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <TypeBadge type={broadcast.broadcastType} />
              <span className="text-[10px] text-[var(--text-muted)]">
                {broadcast.channels.map((c, i) => (
                  <span key={c}>
                    {i > 0 && ' + '}
                    <ChannelBadge channel={c} />
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {broadcast.status === 'draft' && (
            <>
              <button
                onClick={onSend}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                title="Send Now"
              >
                <Send size={12} />
                Send
              </button>
              <button onClick={onEdit} className="p-1.5 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]" title="Edit">
                <Edit size={14} />
              </button>
            </>
          )}
          {broadcast.status === 'scheduled' && (
            <>
              <button onClick={onEdit} className="p-1.5 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]" title="Edit">
                <Edit size={14} />
              </button>
            </>
          )}
          {broadcast.status === 'active' && (
            <>
              <button onClick={onViewStats} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]" title="View Stats">
                <BarChart3 size={12} />
                Stats
              </button>
              <button
                onClick={onEnd}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                title="End Early"
              >
                <XCircle size={12} />
                End
              </button>
            </>
          )}
          {broadcast.status === 'completed' && (
            <>
              <button onClick={onViewStats} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]" title="View Stats">
                <BarChart3 size={12} />
                Stats
              </button>
              <button onClick={onClone} className="p-1.5 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]" title="Clone">
                <Copy size={14} />
              </button>
            </>
          )}
          {['draft', 'scheduled'].includes(broadcast.status) && (
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]" title="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
        <Users size={12} />
        <span>{getAudienceLabel()} ({broadcast.estimatedRecipients} recipients)</span>
      </div>

      {broadcast.bannerHeadline && (
        <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">
          {broadcast.bannerHeadline}
        </p>
      )}

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1">
          <Clock size={10} />
          {broadcast.status === 'scheduled' && broadcast.scheduledAt && (
            <span>Scheduled: {format(new Date(broadcast.scheduledAt), 'MMM d, yyyy h:mm a')}</span>
          )}
          {broadcast.status === 'active' && broadcast.startedAt && (
            <span>Started: {formatDistanceToNow(new Date(broadcast.startedAt))} ago</span>
          )}
          {broadcast.status === 'completed' && broadcast.endedAt && (
            <span>Ended: {format(new Date(broadcast.endedAt), 'MMM d, yyyy')}</span>
          )}
          {broadcast.status === 'draft' && (
            <span>Created: {format(new Date(broadcast.createdAt), 'MMM d, yyyy')}</span>
          )}
        </div>
        {broadcast.expiresAt && (
          <span>Expires: {format(new Date(broadcast.expiresAt), 'MMM d, yyyy')}</span>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Active Broadcast Card (Expanded)
// =========================================================================

function ActiveBroadcastCard({
  broadcast,
  onViewStats,
  onEnd,
}: {
  broadcast: Broadcast;
  onViewStats: () => void;
  onEnd: () => void;
}) {
  const { data: analytics } = useBroadcastAnalytics(broadcast.id);
  const config = typeConfig[broadcast.broadcastType];
  const Icon = config.icon;

  return (
    <div className="bg-gradient-to-r from-[var(--color-success-soft)] to-[var(--bg-secondary)] border-2 border-[var(--color-success)] rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--color-success-soft)]">
            <Icon size={24} className="text-[var(--color-success)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--color-success)] text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE NOW
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">{broadcast.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <TypeBadge type={broadcast.broadcastType} />
              <span className="text-xs text-[var(--text-muted)]">
                {broadcast.channels.join(' + ').replace('in_app', 'In-App')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
          >
            <BarChart3 size={14} />
            View Stats
          </button>
          <button
            onClick={onEnd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
          >
            <XCircle size={14} />
            End Early
          </button>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
            <div className="text-xs text-[var(--text-muted)] mb-1">Emails Sent</div>
            <div className="text-xl font-semibold text-[var(--text-primary)]">{analytics.stats.emailsSent}</div>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
            <div className="text-xs text-[var(--text-muted)] mb-1">Open Rate</div>
            <div className="text-xl font-semibold text-[var(--text-primary)]">{analytics.stats.openRate}%</div>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
            <div className="text-xs text-[var(--text-muted)] mb-1">Click Rate</div>
            <div className="text-xl font-semibold text-[var(--text-primary)]">{analytics.stats.clickRate}%</div>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
            <div className="text-xs text-[var(--text-muted)] mb-1">Banner Views</div>
            <div className="text-xl font-semibold text-[var(--text-primary)]">{analytics.stats.bannerViews}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 text-xs text-[var(--text-muted)]">
        <span>Started {broadcast.startedAt && formatDistanceToNow(new Date(broadcast.startedAt))} ago</span>
        {broadcast.expiresAt && (
          <span>Expires: {format(new Date(broadcast.expiresAt), 'MMM d, yyyy h:mm a')}</span>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Wizard Panel Component
// =========================================================================

interface WizardFormData {
  title: string;
  broadcastType: BroadcastType;
  audienceType: BroadcastAudienceType;
  audienceConfig: BroadcastAudienceConfig;
  channels: BroadcastChannel[];
  bannerStyle: BroadcastBannerStyle;
  bannerHeadline: string;
  bannerBody: string;
  bannerCtaText: string;
  bannerCtaUrl: string;
  bannerDismissable: boolean;
  emailSubject: string;
  emailBody: string;
  sendNow: boolean;
  scheduledAt: string;
  expiresAt: string;
}

function BroadcastWizard({
  broadcast,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: {
  broadcast?: Broadcast;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateBroadcastInput, sendImmediately?: boolean, scheduledAt?: string) => void;
  isSaving: boolean;
}) {
  const [step, setStep] = useState(1);
  const [audienceCount, setAudienceCount] = useState(0);
  const { data: tenantsData } = useTenants({ limit: 100 });

  const [formData, setFormData] = useState<WizardFormData>({
    title: broadcast?.title || '',
    broadcastType: broadcast?.broadcastType || 'feature',
    audienceType: broadcast?.audienceType || 'all',
    audienceConfig: broadcast?.audienceConfig || {},
    channels: broadcast?.channels || ['in_app', 'email'],
    bannerStyle: broadcast?.bannerStyle || 'info',
    bannerHeadline: broadcast?.bannerHeadline || '',
    bannerBody: broadcast?.bannerBody || '',
    bannerCtaText: broadcast?.bannerCtaText || '',
    bannerCtaUrl: broadcast?.bannerCtaUrl || '',
    bannerDismissable: broadcast?.bannerDismissable ?? true,
    emailSubject: broadcast?.emailSubject || '',
    emailBody: broadcast?.emailBody || '',
    sendNow: false,
    scheduledAt: broadcast?.scheduledAt
      ? format(new Date(broadcast.scheduledAt), "yyyy-MM-dd'T'HH:mm")
      : '',
    expiresAt: broadcast?.expiresAt
      ? format(new Date(broadcast.expiresAt), "yyyy-MM-dd'T'HH:mm")
      : '',
  });

  // Estimate audience when audience changes
  useEffect(() => {
    const estimateAudience = async () => {
      try {
        const result = await api.estimateBroadcastAudience(formData.audienceType, formData.audienceConfig);
        setAudienceCount(result.count);
      } catch {
        setAudienceCount(0);
      }
    };
    estimateAudience();
  }, [formData.audienceType, formData.audienceConfig]);

  const handleSubmit = () => {
    const data: CreateBroadcastInput = {
      title: formData.title,
      broadcastType: formData.broadcastType,
      audienceType: formData.audienceType,
      audienceConfig: formData.audienceConfig,
      channels: formData.channels,
      bannerStyle: formData.bannerStyle,
      bannerHeadline: formData.bannerHeadline,
      bannerBody: formData.bannerBody,
      bannerCtaText: formData.bannerCtaText,
      bannerCtaUrl: formData.bannerCtaUrl,
      bannerDismissable: formData.bannerDismissable,
      emailSubject: formData.emailSubject,
      emailBody: formData.emailBody,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
    };

    if (formData.sendNow) {
      onSave(data, true);
    } else if (formData.scheduledAt) {
      onSave(data, false, new Date(formData.scheduledAt).toISOString());
    } else {
      onSave(data);
    }
  };

  const canProceed = () => {
    if (step === 1) return formData.title && formData.broadcastType;
    if (step === 2) return formData.audienceType;
    if (step === 3) {
      if (formData.channels.includes('in_app') && !formData.bannerHeadline) return false;
      if (formData.channels.includes('email') && (!formData.emailSubject || !formData.emailBody)) return false;
      return formData.channels.length > 0;
    }
    return true;
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title={broadcast ? 'Edit Broadcast' : 'New Broadcast'}
      width="xl"
      footer={
        <div className="flex justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                <ChevronLeft size={16} />
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
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSaving || !canProceed()}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {formData.sendNow ? 'Send Now' : formData.scheduledAt ? 'Schedule' : 'Save as Draft'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Progress Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => s <= step && setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                s === step
                  ? 'bg-[var(--color-brand)] text-white'
                  : s < step
                  ? 'bg-[var(--color-success)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              }`}
            >
              {s < step ? <Check size={14} /> : s}
            </button>
            {s < 4 && (
              <div className={`w-12 h-0.5 ${s < step ? 'bg-[var(--color-success)]' : 'bg-[var(--border-primary)]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">Basics</h3>
            <p className="text-sm text-[var(--text-muted)]">Give your broadcast a name and choose its type</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Title (internal) <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., December Feature Announcement"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Type <span className="text-[var(--color-error)]">*</span>
            </label>
            <div className="space-y-2">
              {(Object.entries(typeConfig) as [BroadcastType, typeof typeConfig.feature][]).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, broadcastType: type }))}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      formData.broadcastType === type
                        ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]'
                        : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
                    }`}
                  >
                    <Icon size={18} className={formData.broadcastType === type ? 'text-[var(--color-brand)]' : 'text-[var(--text-muted)]'} />
                    <div>
                      <div className={`text-sm font-medium ${formData.broadcastType === type ? 'text-[var(--color-brand)]' : 'text-[var(--text-primary)]'}`}>
                        {config.label}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">{config.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Audience */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">Audience</h3>
            <p className="text-sm text-[var(--text-muted)]">Who should receive this broadcast?</p>
          </div>

          <div className="space-y-3">
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.audienceType === 'all' ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
              }`}
            >
              <input
                type="radio"
                name="audienceType"
                checked={formData.audienceType === 'all'}
                onChange={() => setFormData(prev => ({ ...prev, audienceType: 'all', audienceConfig: {} }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.audienceType === 'all' ? 'border-[var(--color-brand)]' : 'border-[var(--border-secondary)]'}`}>
                {formData.audienceType === 'all' && <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />}
              </div>
              <span className="text-sm text-[var(--text-primary)]">All customers</span>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.audienceType === 'tier' ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
              }`}
            >
              <input
                type="radio"
                name="audienceType"
                checked={formData.audienceType === 'tier'}
                onChange={() => setFormData(prev => ({ ...prev, audienceType: 'tier', audienceConfig: { tiers: [] } }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.audienceType === 'tier' ? 'border-[var(--color-brand)]' : 'border-[var(--border-secondary)]'}`}>
                {formData.audienceType === 'tier' && <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />}
              </div>
              <div className="flex-1">
                <span className="text-sm text-[var(--text-primary)]">By subscription tier</span>
                {formData.audienceType === 'tier' && (
                  <div className="mt-2 flex gap-2">
                    {['free', 'pro', 'enterprise'].map(tier => (
                      <label key={tier} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.audienceConfig.tiers?.includes(tier) || false}
                          onChange={(e) => {
                            const tiers = formData.audienceConfig.tiers || [];
                            setFormData(prev => ({
                              ...prev,
                              audienceConfig: {
                                ...prev.audienceConfig,
                                tiers: e.target.checked ? [...tiers, tier] : tiers.filter(t => t !== tier)
                              }
                            }));
                          }}
                          className="rounded border-[var(--border-primary)]"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">{tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.audienceType === 'activity' ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
              }`}
            >
              <input
                type="radio"
                name="audienceType"
                checked={formData.audienceType === 'activity'}
                onChange={() => setFormData(prev => ({ ...prev, audienceType: 'activity', audienceConfig: { activity: 'active_30d' } }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.audienceType === 'activity' ? 'border-[var(--color-brand)]' : 'border-[var(--border-secondary)]'}`}>
                {formData.audienceType === 'activity' && <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />}
              </div>
              <div className="flex-1">
                <span className="text-sm text-[var(--text-primary)]">By activity</span>
                {formData.audienceType === 'activity' && (
                  <div className="mt-2 space-y-1">
                    {[
                      { value: 'active_7d', label: 'Active in last 7 days' },
                      { value: 'active_30d', label: 'Active in last 30 days' },
                      { value: 'inactive_30d', label: 'Inactive 30+ days' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={formData.audienceConfig.activity === opt.value}
                          onChange={() => setFormData(prev => ({ ...prev, audienceConfig: { activity: opt.value } }))}
                          className="text-[var(--color-brand)]"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.audienceType === 'specific' ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
              }`}
            >
              <input
                type="radio"
                name="audienceType"
                checked={formData.audienceType === 'specific'}
                onChange={() => setFormData(prev => ({ ...prev, audienceType: 'specific', audienceConfig: { tenantIds: [] } }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.audienceType === 'specific' ? 'border-[var(--color-brand)]' : 'border-[var(--border-secondary)]'}`}>
                {formData.audienceType === 'specific' && <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />}
              </div>
              <div className="flex-1">
                <span className="text-sm text-[var(--text-primary)]">Specific customers</span>
                {formData.audienceType === 'specific' && tenantsData?.tenants && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {tenantsData.tenants.slice(0, 20).map(tenant => (
                      <label key={tenant.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.audienceConfig.tenantIds?.includes(tenant.id) || false}
                          onChange={(e) => {
                            const ids = formData.audienceConfig.tenantIds || [];
                            setFormData(prev => ({
                              ...prev,
                              audienceConfig: {
                                ...prev.audienceConfig,
                                tenantIds: e.target.checked ? [...ids, tenant.id] : ids.filter(id => id !== tenant.id)
                              }
                            }));
                          }}
                          className="rounded border-[var(--border-primary)]"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">{tenant.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Users size={16} className="text-[var(--color-brand)]" />
              <span className="text-[var(--text-primary)]">Estimated audience: <strong>{audienceCount}</strong> customers</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Content */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">Content</h3>
            <p className="text-sm text-[var(--text-muted)]">Create your broadcast message</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Delivery Channels <span className="text-[var(--color-error)]">*</span>
            </label>
            <div className="flex gap-2">
              {[
                { value: 'in_app' as BroadcastChannel, label: 'In-App Banner', icon: Monitor },
                { value: 'email' as BroadcastChannel, label: 'Email', icon: Mail },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      channels: prev.channels.includes(value)
                        ? prev.channels.filter(c => c !== value)
                        : [...prev.channels, value]
                    }));
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.channels.includes(value)
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {formData.channels.includes('in_app') && (
            <div className="space-y-4 p-4 border border-[var(--border-primary)] rounded-lg">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">In-App Banner</h4>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Banner Style</label>
                <div className="flex gap-2">
                  {(Object.entries(bannerStyleConfig) as [BroadcastBannerStyle, typeof bannerStyleConfig.info][]).map(([style, config]) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, bannerStyle: style }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                        formData.bannerStyle === style
                          ? `${config.bgColor} text-white`
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Headline <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bannerHeadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, bannerHeadline: e.target.value }))}
                  placeholder="e.g., New: Automated Vaccination Reminders"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Body Text</label>
                <textarea
                  value={formData.bannerBody}
                  onChange={(e) => setFormData(prev => ({ ...prev, bannerBody: e.target.value }))}
                  rows={2}
                  placeholder="Brief description..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CTA Button Text</label>
                  <input
                    type="text"
                    value={formData.bannerCtaText}
                    onChange={(e) => setFormData(prev => ({ ...prev, bannerCtaText: e.target.value }))}
                    placeholder="Learn More"
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CTA Link URL</label>
                  <input
                    type="text"
                    value={formData.bannerCtaUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, bannerCtaUrl: e.target.value }))}
                    placeholder="/settings/notifications"
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.bannerDismissable}
                  onChange={(e) => setFormData(prev => ({ ...prev, bannerDismissable: e.target.checked }))}
                  className="rounded border-[var(--border-primary)]"
                />
                <span className="text-xs text-[var(--text-secondary)]">Dismissable (user can close banner)</span>
              </label>

              {/* Banner Preview */}
              <div>
                <div className="text-xs font-medium text-[var(--text-muted)] mb-2">Preview</div>
                <div
                  className="p-3 rounded-md text-white"
                  style={{ backgroundColor: bannerStyleConfig[formData.bannerStyle].color }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{formData.bannerHeadline || 'Headline'}</strong>
                      {formData.bannerBody && <span className="ml-2 opacity-90">{formData.bannerBody}</span>}
                    </div>
                    {formData.bannerCtaText && (
                      <span className="underline">{formData.bannerCtaText}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {formData.channels.includes('email') && (
            <div className="space-y-4 p-4 border border-[var(--border-primary)] rounded-lg">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">Email</h4>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Subject Line <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.emailSubject}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailSubject: e.target.value }))}
                  placeholder="e.g., New Feature: Automated Vaccination Reminders"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Email Body <span className="text-[var(--color-error)]">*</span>
                </label>
                <textarea
                  value={formData.emailBody}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailBody: e.target.value }))}
                  rows={8}
                  placeholder="Hi {{tenant_name}},&#10;&#10;We're excited to announce..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none font-mono"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Available variables: {'{{tenant_name}}'}, {'{{owner_name}}'}, {'{{owner_email}}'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Schedule */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">Schedule</h3>
            <p className="text-sm text-[var(--text-muted)]">When should this broadcast go out?</p>
          </div>

          <div className="space-y-3">
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.sendNow ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
              }`}
            >
              <input
                type="radio"
                name="schedule"
                checked={formData.sendNow}
                onChange={() => setFormData(prev => ({ ...prev, sendNow: true, scheduledAt: '' }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.sendNow ? 'border-[var(--color-brand)]' : 'border-[var(--border-secondary)]'}`}>
                {formData.sendNow && <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />}
              </div>
              <div className="flex items-center gap-2">
                <Send size={16} className="text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-primary)]">Send immediately</span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                !formData.sendNow && formData.scheduledAt ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
              }`}
            >
              <input
                type="radio"
                name="schedule"
                checked={!formData.sendNow && !!formData.scheduledAt}
                onChange={() => setFormData(prev => ({ ...prev, sendNow: false }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${!formData.sendNow && formData.scheduledAt ? 'border-[var(--color-brand)]' : 'border-[var(--border-secondary)]'}`}>
                {!formData.sendNow && formData.scheduledAt && <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-primary)]">Schedule for later</span>
                </div>
                {(!formData.sendNow || formData.scheduledAt) && (
                  <div className="mt-2">
                    <input
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value, sendNow: false }))}
                      className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                    />
                  </div>
                )}
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                !formData.sendNow && !formData.scheduledAt ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--border-primary)] hover:bg-[var(--hover-overlay)]'
              }`}
            >
              <input
                type="radio"
                name="schedule"
                checked={!formData.sendNow && !formData.scheduledAt}
                onChange={() => setFormData(prev => ({ ...prev, sendNow: false, scheduledAt: '' }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!formData.sendNow && !formData.scheduledAt ? 'border-[var(--color-brand)]' : 'border-[var(--border-secondary)]'}`}>
                {!formData.sendNow && !formData.scheduledAt && <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />}
              </div>
              <span className="text-sm text-[var(--text-primary)]">Save as draft</span>
            </label>
          </div>

          {formData.channels.includes('in_app') && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Banner Expiration (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">Summary</h4>
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <div><strong>Type:</strong> {typeConfig[formData.broadcastType].label}</div>
              <div><strong>Audience:</strong> {audienceCount} customers</div>
              <div><strong>Channels:</strong> {formData.channels.map(c => c === 'in_app' ? 'In-App Banner' : c.charAt(0).toUpperCase() + c.slice(1)).join(' + ')}</div>
              {formData.sendNow && <div><strong>Schedule:</strong> Send immediately</div>}
              {formData.scheduledAt && <div><strong>Schedule:</strong> {format(new Date(formData.scheduledAt), 'MMM d, yyyy h:mm a')}</div>}
              {!formData.sendNow && !formData.scheduledAt && <div><strong>Status:</strong> Draft</div>}
              {formData.expiresAt && <div><strong>Expires:</strong> {format(new Date(formData.expiresAt), 'MMM d, yyyy h:mm a')}</div>}
            </div>
          </div>
        </div>
      )}
    </SlideOutPanel>
  );
}

// =========================================================================
// Analytics Panel
// =========================================================================

function AnalyticsPanel({
  broadcastId,
  isOpen,
  onClose,
}: {
  broadcastId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: analytics, isLoading } = useBroadcastAnalytics(broadcastId);

  if (!isOpen) return null;

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Broadcast Analytics"
      width="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Broadcast Info */}
          <div className="flex items-start gap-3 p-4 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="flex-1">
              <h3 className="text-base font-medium text-[var(--text-primary)]">{analytics.broadcast.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={analytics.broadcast.status} />
                <TypeBadge type={analytics.broadcast.broadcastType} />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                <Mail size={14} />
                <span className="text-xs font-medium">Emails Sent</span>
              </div>
              <div className="text-2xl font-semibold text-[var(--text-primary)]">{analytics.stats.emailsSent}</div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                <Eye size={14} />
                <span className="text-xs font-medium">Open Rate</span>
              </div>
              <div className="text-2xl font-semibold text-[var(--text-primary)]">{analytics.stats.openRate}%</div>
              <div className="text-xs text-[var(--text-muted)]">({analytics.stats.emailsOpened} of {analytics.stats.emailsSent})</div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                <MousePointer size={14} />
                <span className="text-xs font-medium">Click Rate</span>
              </div>
              <div className="text-2xl font-semibold text-[var(--text-primary)]">{analytics.stats.clickRate}%</div>
              <div className="text-xs text-[var(--text-muted)]">({analytics.stats.emailsClicked} of {analytics.stats.emailsSent})</div>
            </div>
          </div>

          {/* Banner Stats */}
          {analytics.broadcast.channels.includes('in_app') && (
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Banner Engagement</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                    <Monitor size={14} />
                    <span className="text-xs font-medium">Banner Views</span>
                  </div>
                  <div className="text-2xl font-semibold text-[var(--text-primary)]">{analytics.stats.bannerViews}</div>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                    <MousePointer size={14} />
                    <span className="text-xs font-medium">CTA Clicks</span>
                  </div>
                  <div className="text-2xl font-semibold text-[var(--text-primary)]">{analytics.stats.bannerClicks}</div>
                  <div className="text-xs text-[var(--text-muted)]">({analytics.stats.bannerClickRate}%)</div>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                    <X size={14} />
                    <span className="text-xs font-medium">Dismissals</span>
                  </div>
                  <div className="text-2xl font-semibold text-[var(--text-primary)]">{analytics.stats.bannerDismissals}</div>
                  <div className="text-xs text-[var(--text-muted)]">({analytics.stats.bannerDismissRate}%)</div>
                </div>
              </div>
            </div>
          )}

          {/* Recipients */}
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Recipients</h4>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)]">
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] px-4 py-2">Customer</th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] px-4 py-2">Email</th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] px-4 py-2">Opened</th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] px-4 py-2">Clicked</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recipients.slice(0, 20).map(recipient => (
                    <tr key={recipient.id} className="border-t border-[var(--border-primary)]">
                      <td className="px-4 py-2 text-sm text-[var(--text-primary)]">{recipient.tenantName || 'Unknown'}</td>
                      <td className="px-4 py-2 text-center">
                        {recipient.emailSentAt ? (
                          <Check size={14} className="inline text-[var(--color-success)]" />
                        ) : (
                          <X size={14} className="inline text-[var(--text-muted)]" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {recipient.emailOpenedAt ? (
                          <Check size={14} className="inline text-[var(--color-success)]" />
                        ) : (
                          <X size={14} className="inline text-[var(--text-muted)]" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {recipient.emailClickedAt ? (
                          <Check size={14} className="inline text-[var(--color-success)]" />
                        ) : (
                          <X size={14} className="inline text-[var(--text-muted)]" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-[var(--text-muted)]">No analytics available</p>
        </div>
      )}
    </SlideOutPanel>
  );
}

// =========================================================================
// Main Component
// =========================================================================

export function Broadcasts() {
  const [showWizard, setShowWizard] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | undefined>();
  const [viewingAnalytics, setViewingAnalytics] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'sent' | 'drafts'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data, isLoading } = useBroadcasts();
  const createBroadcast = useCreateBroadcast();
  const updateBroadcast = useUpdateBroadcast(editingBroadcast?.id || '');
  const deleteBroadcast = useDeleteBroadcast();
  const sendBroadcast = useSendBroadcast(editingBroadcast?.id || '');
  const scheduleBroadcast = useScheduleBroadcast(editingBroadcast?.id || '');
  const endBroadcast = useEndBroadcast(editingBroadcast?.id || '');

  const handleSave = async (data: CreateBroadcastInput, sendImmediately?: boolean, scheduledAt?: string) => {
    let broadcast: Broadcast;
    if (editingBroadcast) {
      const result = await updateBroadcast.mutateAsync(data as UpdateBroadcastInput);
      broadcast = result.broadcast;
    } else {
      const result = await createBroadcast.mutateAsync(data);
      broadcast = result.broadcast;
    }

    if (sendImmediately) {
      await api.sendBroadcast(broadcast.id);
    } else if (scheduledAt) {
      await api.scheduleBroadcast(broadcast.id, scheduledAt);
    }

    setShowWizard(false);
    setEditingBroadcast(undefined);
  };

  const handleEdit = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast);
    setShowWizard(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this broadcast?')) {
      await deleteBroadcast.mutateAsync(id);
    }
  };

  const handleSend = async (broadcast: Broadcast) => {
    if (confirm('Send this broadcast immediately?')) {
      await api.sendBroadcast(broadcast.id);
    }
  };

  const handleEnd = async (broadcast: Broadcast) => {
    if (confirm('End this broadcast early?')) {
      await api.endBroadcast(broadcast.id);
    }
  };

  const handleClone = (broadcast: Broadcast) => {
    setEditingBroadcast({
      ...broadcast,
      id: '',
      title: `${broadcast.title} (Copy)`,
      status: 'draft',
      scheduledAt: undefined,
      startedAt: undefined,
      endedAt: undefined,
    });
    setShowWizard(true);
  };

  const filteredBroadcasts = data?.broadcasts?.filter(b => {
    if (filter === 'active') return b.status === 'active';
    if (filter === 'scheduled') return b.status === 'scheduled';
    if (filter === 'sent') return b.status === 'completed';
    if (filter === 'drafts') return b.status === 'draft';
    return true;
  }).filter(b => {
    if (typeFilter) return b.broadcastType === typeFilter;
    return true;
  }) || [];

  const activeBroadcasts = data?.broadcasts?.filter(b => b.status === 'active') || [];
  const scheduledBroadcasts = data?.broadcasts?.filter(b => b.status === 'scheduled') || [];

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
            setShowWizard(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
        >
          <Plus size={16} />
          New Broadcast
        </button>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatsCard
            label="Total Sent"
            value={data.stats.totalSent}
            icon={Send}
          />
          <StatsCard
            label="Active Now"
            value={data.stats.activeNow}
            icon={Megaphone}
          />
          <StatsCard
            label="Scheduled"
            value={data.stats.scheduled}
            icon={Calendar}
          />
          <StatsCard
            label="Avg Open Rate"
            value={`${data.stats.avgOpenRate}%`}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['all', 'active', 'scheduled', 'sent', 'drafts'] as const).map(f => (
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
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
        >
          <option value="">All Types</option>
          {Object.entries(typeConfig).map(([type, config]) => (
            <option key={type} value={type}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Broadcasts Section */}
          {activeBroadcasts.length > 0 && filter === 'all' && (
            <div>
              <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Active Broadcasts
              </h3>
              <div className="space-y-3">
                {activeBroadcasts.map(broadcast => (
                  <ActiveBroadcastCard
                    key={broadcast.id}
                    broadcast={broadcast}
                    onViewStats={() => setViewingAnalytics(broadcast.id)}
                    onEnd={() => handleEnd(broadcast)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Broadcasts Section */}
          {scheduledBroadcasts.length > 0 && filter === 'all' && (
            <div>
              <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Scheduled
              </h3>
              <div className="space-y-3">
                {scheduledBroadcasts.map(broadcast => (
                  <BroadcastCard
                    key={broadcast.id}
                    broadcast={broadcast}
                    onEdit={() => handleEdit(broadcast)}
                    onDelete={() => handleDelete(broadcast.id)}
                    onSend={() => handleSend(broadcast)}
                    onEnd={() => handleEnd(broadcast)}
                    onViewStats={() => setViewingAnalytics(broadcast.id)}
                    onClone={() => handleClone(broadcast)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All/Filtered Broadcasts */}
          {(filter !== 'all' || (activeBroadcasts.length === 0 && scheduledBroadcasts.length === 0)) && (
            filteredBroadcasts.length > 0 ? (
              <div className="space-y-3">
                {filteredBroadcasts.map(broadcast => (
                  <BroadcastCard
                    key={broadcast.id}
                    broadcast={broadcast}
                    onEdit={() => handleEdit(broadcast)}
                    onDelete={() => handleDelete(broadcast.id)}
                    onSend={() => handleSend(broadcast)}
                    onEnd={() => handleEnd(broadcast)}
                    onViewStats={() => setViewingAnalytics(broadcast.id)}
                    onClone={() => handleClone(broadcast)}
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
            )
          )}

          {/* Past/Completed Section */}
          {filter === 'all' && filteredBroadcasts.filter(b => !['active', 'scheduled'].includes(b.status)).length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Past & Drafts
              </h3>
              <div className="space-y-3">
                {filteredBroadcasts.filter(b => !['active', 'scheduled'].includes(b.status)).map(broadcast => (
                  <BroadcastCard
                    key={broadcast.id}
                    broadcast={broadcast}
                    onEdit={() => handleEdit(broadcast)}
                    onDelete={() => handleDelete(broadcast.id)}
                    onSend={() => handleSend(broadcast)}
                    onEnd={() => handleEnd(broadcast)}
                    onViewStats={() => setViewingAnalytics(broadcast.id)}
                    onClone={() => handleClone(broadcast)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wizard Panel */}
      <BroadcastWizard
        broadcast={editingBroadcast}
        isOpen={showWizard}
        onClose={() => {
          setShowWizard(false);
          setEditingBroadcast(undefined);
        }}
        onSave={handleSave}
        isSaving={createBroadcast.isPending || updateBroadcast.isPending}
      />

      {/* Analytics Panel */}
      <AnalyticsPanel
        broadcastId={viewingAnalytics || ''}
        isOpen={!!viewingAnalytics}
        onClose={() => setViewingAnalytics(null)}
      />
    </div>
  );
}
