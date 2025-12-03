import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useStatus } from '@/hooks/useApi';
import { StatusBadge } from '@/components/status/StatusBadge';
import type { SystemStatus, ComponentStatus, Incident } from '@/types';

const statusConfig: Record<SystemStatus, { icon: React.ElementType; bgClass: string; textClass: string; label: string }> = {
  operational: {
    icon: CheckCircle,
    bgClass: 'bg-[var(--color-success-soft)]',
    textClass: 'text-[var(--color-success)]',
    label: 'All Systems Operational',
  },
  degraded: {
    icon: AlertTriangle,
    bgClass: 'bg-[var(--color-warning-soft)]',
    textClass: 'text-[var(--color-warning)]',
    label: 'Degraded Performance',
  },
  partial_outage: {
    icon: AlertTriangle,
    bgClass: 'bg-[var(--color-error-soft)]',
    textClass: 'text-[var(--color-error)]',
    label: 'Partial System Outage',
  },
  major_outage: {
    icon: XCircle,
    bgClass: 'bg-[var(--color-error-soft)]',
    textClass: 'text-[var(--color-error)]',
    label: 'Major System Outage',
  },
};

const componentStatusDot: Record<SystemStatus, string> = {
  operational: 'bg-[var(--color-success)]',
  degraded: 'bg-[var(--color-warning)]',
  partial_outage: 'bg-[var(--color-error)]',
  major_outage: 'bg-[var(--color-error)]',
};

export function StatusPage() {
  const { data, isLoading, error, refetch, isFetching } = useStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-xl bg-[var(--color-error-soft)] flex items-center justify-center mb-4">
          <XCircle className="w-7 h-7 text-[var(--color-error)]" />
        </div>
        <p className="text-base font-medium text-[var(--text-primary)]">Unable to load status</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Please try again later</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const status = data?.status || 'operational';
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-subtle)] flex items-center justify-center">
              <span className="text-lg">🐕</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              BarkBase Status
            </h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Real-time system status and incident updates
          </p>
        </header>

        {/* Overall Status Banner */}
        <div className={`rounded-xl p-6 mb-8 ${config.bgClass}`}>
          <div className="flex items-center justify-center gap-3">
            <Icon className={`w-7 h-7 ${config.textClass}`} />
            <span className={`text-lg font-semibold ${config.textClass}`}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Components Section */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
            System Components
          </h2>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
            {data?.components.map((component: ComponentStatus, index: number) => (
              <div
                key={component.name}
                className={`flex items-center justify-between p-4 ${
                  index > 0 ? 'border-t border-[var(--border-primary)]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${componentStatusDot[component.status]}`} />
                  <span className="text-sm text-[var(--text-primary)]">
                    {component.displayName}
                  </span>
                </div>
                <span className={`text-xs font-medium ${
                  component.status === 'operational'
                    ? 'text-[var(--color-success)]'
                    : component.status === 'degraded'
                    ? 'text-[var(--color-warning)]'
                    : 'text-[var(--color-error)]'
                }`}>
                  {component.status === 'operational' ? 'Operational' :
                   component.status === 'degraded' ? 'Degraded' :
                   component.status === 'partial_outage' ? 'Partial Outage' : 'Major Outage'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Active Incidents */}
        {data?.activeIncidents && data.activeIncidents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Active Incidents
            </h2>
            <div className="space-y-3">
              {data.activeIncidents.map((incident: Incident) => (
                <div
                  key={incident.id}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={incident.severity} size="sm" />
                    <StatusBadge status={incident.status} size="sm" />
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                    {incident.title}
                  </h3>

                  {/* Message */}
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    {incident.customerMessage}
                  </p>

                  {/* Affected components */}
                  {incident.components.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-[var(--text-muted)]">Affected:</span>
                      <div className="flex flex-wrap gap-1">
                        {incident.components.map((component) => (
                          <span
                            key={component}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                          >
                            {component}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-[var(--text-disabled)]">
                    Started {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                    {' · '}
                    {format(new Date(incident.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past Incidents Placeholder */}
        {(!data?.activeIncidents || data.activeIncidents.length === 0) && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Recent Incidents
            </h2>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-success-soft)] flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                No incidents in the past 7 days
              </p>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-4 border-t border-[var(--border-primary)]">
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
            <span>
              Last updated: {format(new Date(), 'MMM d, yyyy \'at\' h:mm a')}
            </span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-xs text-[var(--text-disabled)] mt-2">
            For issues, contact support@barkbase.com
          </p>
        </footer>
      </div>
    </div>
  );
}
