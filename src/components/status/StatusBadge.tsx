import clsx from 'clsx';
import type { SystemStatus, IncidentSeverity, IncidentStatus } from '@/types';

interface StatusBadgeProps {
  status: SystemStatus | IncidentSeverity | IncidentStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // System status
  operational: {
    label: 'Operational',
    className: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  },
  degraded: {
    label: 'Degraded',
    className: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  },
  partial: {
    label: 'Partial Outage',
    className: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
  },
  partial_outage: {
    label: 'Partial Outage',
    className: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
  },
  major: {
    label: 'Major Outage',
    className: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
  },
  major_outage: {
    label: 'Major Outage',
    className: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
  },
  // Incident status
  investigating: {
    label: 'Investigating',
    className: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  },
  identified: {
    label: 'Identified',
    className: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
  },
  monitoring: {
    label: 'Monitoring',
    className: 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {config.label}
    </span>
  );
}
