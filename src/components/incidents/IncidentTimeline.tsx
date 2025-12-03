import { format, formatDistanceToNow } from 'date-fns';
import { StatusBadge } from '@/components/status/StatusBadge';
import type { IncidentUpdate } from '@/types';
import { MessageSquare } from 'lucide-react';

interface IncidentTimelineProps {
  updates: IncidentUpdate[];
}

export function IncidentTimeline({ updates }: IncidentTimelineProps) {
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">No updates yet</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Add an update to track incident progress</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-3 bottom-3 w-px bg-[var(--border-primary)]" />

      <div className="space-y-4">
        {updates.map((update, index) => {
          const isLatest = index === 0;

          return (
            <div key={update.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isLatest
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                  }`}
                >
                  <span className="text-xs font-medium">
                    {(update.createdByEmail?.charAt(0) || 'U').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Update content */}
              <div className="flex-1 min-w-0">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={update.status} size="sm" />
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {update.createdByEmail}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <time
                        className="text-xs text-[var(--text-muted)]"
                        title={format(new Date(update.createdAt), 'PPpp')}
                      >
                        {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                      </time>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                    {update.message}
                  </p>

                  {/* Timestamp detail */}
                  <p className="text-xs text-[var(--text-disabled)] mt-2">
                    {format(new Date(update.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
