import { useState } from 'react';
import { format } from 'date-fns';
import { X, Building2, Users, Calendar, Key, Clock, Ban, CheckCircle, Loader2, Activity, Eye } from 'lucide-react';
import { useSuspendTenant, useUnsuspendTenant, useExtendTrial, useResetUserPassword } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { ImpersonateModal } from './ImpersonateModal';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import type { TenantDetail as TenantDetailType, TenantUser } from '@/types';

interface TenantDetailProps {
  tenant: TenantDetailType;
  onClose: () => void;
  onRefresh?: () => void;
}

type TabType = 'overview' | 'users' | 'activity' | 'actions';

export function TenantDetail({ tenant, onClose, onRefresh }: TenantDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showExtendTrialModal, setShowExtendTrialModal] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [trialDays, setTrialDays] = useState(7);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);

  const { user } = useAuth();
  const { isImpersonating, impersonatedTenant } = useImpersonation();

  const suspendTenant = useSuspendTenant(tenant.id);
  const unsuspendTenant = useUnsuspendTenant(tenant.id);
  const extendTrial = useExtendTrial(tenant.id);
  const resetPassword = useResetUserPassword(tenant.id);

  const canImpersonate = user?.role === 'super_admin' || user?.role === 'support_lead';
  const isCurrentlyImpersonating = isImpersonating && impersonatedTenant?.id === tenant.id;

  const handleSuspend = async () => {
    if (confirm('Are you sure you want to suspend this tenant? All users will lose access.')) {
      await suspendTenant.mutateAsync();
      onRefresh?.();
    }
  };

  const handleUnsuspend = async () => {
    await unsuspendTenant.mutateAsync();
    onRefresh?.();
  };

  const handleExtendTrial = async () => {
    await extendTrial.mutateAsync(trialDays);
    setShowExtendTrialModal(false);
    setTrialDays(7);
    onRefresh?.();
  };

  const handleResetPassword = async (userId: string) => {
    if (confirm('This will send a password reset email to the user. Continue?')) {
      setResetPasswordUserId(userId);
      await resetPassword.mutateAsync(userId);
      setResetPasswordUserId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[var(--color-success-soft)] text-[var(--color-success)]';
      case 'suspended':
        return 'bg-[var(--color-error-soft)] text-[var(--color-error)]';
      case 'trial':
        return 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]';
      default:
        return 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]';
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: `Users (${tenant.users?.length || 0})` },
    { id: 'activity', label: 'Activity' },
    { id: 'actions', label: 'Actions' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-subtle)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--color-brand)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {tenant.name}
              </h2>
              <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${getStatusColor(tenant.status)}`}>
                {tenant.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canImpersonate && (
              <button
                onClick={() => setShowImpersonateModal(true)}
                disabled={isCurrentlyImpersonating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isCurrentlyImpersonating
                    ? 'bg-[var(--color-warning)] text-black cursor-not-allowed'
                    : 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] hover:bg-[var(--color-warning)] hover:text-black'
                }`}
                title={isCurrentlyImpersonating ? 'Currently impersonating this tenant' : 'Impersonate this tenant'}
              >
                <Eye size={14} />
                {isCurrentlyImpersonating ? 'Impersonating' : 'Impersonate'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors relative ${
                activeTab === tab.id
                  ? 'text-[var(--color-brand)] bg-[var(--bg-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-primary)]">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Users} label="Users" value={tenant.userCount?.toString() || '0'} />
              <StatCard icon={Calendar} label="Bookings" value={tenant.bookingCount?.toString() || '0'} />
              <StatCard icon={Building2} label="Plan" value={tenant.plan || 'Free'} />
            </div>

            {/* Info */}
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 space-y-3">
              <InfoRow label="Subdomain" value={tenant.subdomain || '-'} />
              <InfoRow label="Created" value={tenant.createdAt ? format(new Date(tenant.createdAt), 'MMM d, yyyy') : '-'} />
              <InfoRow label="Plan" value={tenant.plan || 'Free'} />
              <InfoRow label="Status" value={tenant.status} />
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-2">
            {tenant.users && tenant.users.length > 0 ? (
              tenant.users.map((user: TenantUser) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-info-soft)] flex items-center justify-center">
                      <span className="text-xs font-medium text-[var(--color-info)]">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {user.name || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                      {user.role?.toUpperCase() || 'USER'}
                    </span>
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      disabled={resetPasswordUserId === user.id}
                      className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                      title="Reset password"
                    >
                      {resetPasswordUserId === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Key size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)]">
                No users found
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Activity timeline coming soon</p>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-4">
            {/* Suspend/Unsuspend */}
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                {tenant.status === 'suspended' ? 'Reactivate Tenant' : 'Suspend Tenant'}
              </h4>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {tenant.status === 'suspended'
                  ? 'Restore access for all users in this organization.'
                  : 'Temporarily disable access for all users in this organization.'}
              </p>
              {tenant.status === 'suspended' ? (
                <button
                  onClick={handleUnsuspend}
                  disabled={unsuspendTenant.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-success)] text-white text-sm font-medium hover:bg-[var(--color-success)]/90 transition-colors disabled:opacity-50"
                >
                  {unsuspendTenant.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  Unsuspend Tenant
                </button>
              ) : (
                <button
                  onClick={handleSuspend}
                  disabled={suspendTenant.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-error)] text-white text-sm font-medium hover:bg-[var(--color-error)]/90 transition-colors disabled:opacity-50"
                >
                  {suspendTenant.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban size={14} />
                  )}
                  Suspend Tenant
                </button>
              )}
            </div>

            {/* Extend Trial */}
            {tenant.plan?.toLowerCase().includes('trial') && (
              <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                  Extend Trial
                </h4>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Grant additional trial time for this organization.
                </p>
                <button
                  onClick={() => setShowExtendTrialModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-hover)] transition-colors"
                >
                  <Clock size={14} />
                  Extend Trial
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extend Trial Panel */}
      <SlideOutPanel
        isOpen={showExtendTrialModal}
        onClose={() => setShowExtendTrialModal(false)}
        title="Extend Trial Period"
        subtitle={tenant.name}
        width="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowExtendTrialModal(false)}
              className="px-3 py-1.5 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExtendTrial}
              disabled={extendTrial.isPending}
              className="px-3 py-1.5 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {extendTrial.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Extend
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-muted)] mb-4">
          How many days would you like to extend the trial period?
        </p>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Days to extend
          </label>
          <select
            value={trialDays}
            onChange={(e) => setTrialDays(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </SlideOutPanel>

      {/* Impersonate Modal */}
      <ImpersonateModal
        tenant={{ id: tenant.id, name: tenant.name }}
        isOpen={showImpersonateModal}
        onClose={() => setShowImpersonateModal(false)}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-[var(--text-muted)]" />
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-sm text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
