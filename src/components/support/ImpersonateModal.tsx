import { useState } from 'react';
import { Loader2, Eye, AlertTriangle, X } from 'lucide-react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuth } from '@/hooks/useAuth';

interface ImpersonateModalProps {
  tenant: {
    id: string;
    name: string;
  };
  onClose: () => void;
}

export function ImpersonateModal({ tenant, onClose }: ImpersonateModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startImpersonation } = useImpersonation();
  const { user } = useAuth();

  // Check if user has permission
  const canImpersonate = user?.role === 'super_admin' || user?.role === 'support_lead';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Please provide a reason for impersonation');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await startImpersonation(tenant.id, tenant.name, reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start impersonation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canImpersonate) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[var(--z-modal)]">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--color-error-soft)] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Permission Denied
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Only Super Admins and Support Leads can impersonate tenants
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[var(--z-modal)]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-warning-soft)] flex items-center justify-center">
              <Eye className="w-5 h-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Impersonate Tenant
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {tenant.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning */}
        <div className="p-4 bg-[var(--color-warning-soft)] border-b border-[var(--color-warning)]/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--color-warning)]">
              <p className="font-medium mb-1">This action is logged</p>
              <p className="text-[var(--color-warning)]/80">
                All actions taken while impersonating will be recorded in the audit log.
                Session expires after 30 minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Reason for impersonation <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer reported issue with booking calendar, investigating..."
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-warning)] text-black hover:bg-[var(--color-warning)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <Eye size={16} />
              Start Impersonation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
