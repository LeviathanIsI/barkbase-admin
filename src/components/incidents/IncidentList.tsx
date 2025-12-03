import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { ChevronRight, CheckCircle, Server } from 'lucide-react';
import { StatusBadge } from '@/components/status/StatusBadge';
import type { Incident } from '@/types';

interface IncidentListProps {
  incidents: Incident[];
}

export function IncidentList({ incidents }: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-16 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-success-soft)] mb-4">
          <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
        </div>
        <p className="text-base font-medium text-[var(--text-primary)]">All clear</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">No incidents matching your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
      {incidents.map((incident, index) => (
        <Link
          key={incident.id}
          to={`/incidents/${incident.id}`}
          className={`block p-4 hover:bg-[var(--bg-tertiary)] transition-colors ${
            index > 0 ? 'border-t border-[var(--border-primary)]' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Badges and time */}
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={incident.severity} size="sm" />
                <StatusBadge status={incident.status} size="sm" />
                <span className="text-xs text-[var(--text-muted)]">
                  {incident.status !== 'resolved'
                    ? formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })
                    : `Resolved ${formatDistanceToNow(new Date(incident.resolvedAt || incident.updatedAt), { addSuffix: true })}`}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1.5">
                {incident.title}
              </h3>

              {/* Metadata row */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-[var(--text-muted)]">
                  {format(new Date(incident.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                </span>
                {incident.components.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {incident.components.slice(0, 3).map((component) => (
                      <span
                        key={component}
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                      >
                        <Server size={10} />
                        {component}
                      </span>
                    ))}
                    {incident.components.length > 3 && (
                      <span className="text-[10px] text-[var(--text-disabled)]">
                        +{incident.components.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] mt-1 flex-shrink-0" />
          </div>
        </Link>
      ))}
    </div>
  );
}
