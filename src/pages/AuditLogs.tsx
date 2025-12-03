import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, FileText, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useApi';
import { Link } from 'react-router-dom';
import type { AuditLogEntry } from '@/types';

const actionColors: Record<string, string> = {
  search: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  view_tenant: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
  suspend_tenant: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
  unsuspend_tenant: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  extend_trial: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  reset_password: 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]',
  create_incident: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
  update_incident: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  add_incident_update: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
};

function ActionBadge({ action }: { action: string }) {
  const color = actionColors[action] || 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${color}`}>
      {action.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

function LogRow({ log }: { log: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const getTargetLink = () => {
    if (!log.targetType || !log.targetId) return null;

    switch (log.targetType) {
      case 'tenant':
        return `/support?tenant=${log.targetId}`;
      case 'incident':
        return `/incidents/${log.targetId}`;
      case 'user':
        return null; // Users are shown in tenant detail
      default:
        return null;
    }
  };

  const targetLink = getTargetLink();

  return (
    <>
      <tr className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <time
              className="text-xs text-[var(--text-muted)]"
              title={format(new Date(log.createdAt), 'PPpp')}
            >
              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
            </time>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--color-brand-subtle)] flex items-center justify-center">
              <span className="text-[10px] font-medium text-[var(--color-brand)]">
                {(log.adminEmail?.charAt(0) || 'A').toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-[var(--text-primary)]">{log.adminEmail}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <ActionBadge action={log.action} />
        </td>
        <td className="py-3 px-4">
          {log.targetType && log.targetId ? (
            targetLink ? (
              <Link
                to={targetLink}
                className="text-sm text-[var(--color-brand)] hover:underline"
              >
                {log.targetType}:{log.targetId.slice(0, 8)}...
              </Link>
            ) : (
              <span className="text-sm text-[var(--text-secondary)]">
                {log.targetType}:{log.targetId.slice(0, 8)}...
              </span>
            )
          ) : (
            <span className="text-sm text-[var(--text-muted)]">-</span>
          )}
        </td>
        <td className="py-3 px-4">
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {log.ipAddress || '-'}
          </span>
        </td>
        <td className="py-3 px-4">
          {log.details && Object.keys(log.details).length > 0 ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Details
            </button>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">-</span>
          )}
        </td>
      </tr>
      {expanded && log.details && (
        <tr className="bg-[var(--bg-tertiary)]">
          <td colSpan={6} className="px-4 py-3">
            <pre className="text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap overflow-x-auto max-w-full">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [admin, setAdmin] = useState('');
  const [targetType, setTargetType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useAuditLogs({
    page,
    action: action || undefined,
    admin: admin || undefined,
    targetType: targetType || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  });

  const clearFilters = () => {
    setAction('');
    setAdmin('');
    setTargetType('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasFilters = action || admin || targetType || fromDate || toDate;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Audit Logs</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Track all admin actions and system events
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            showFilters || hasFilters
              ? 'bg-[var(--color-brand)] text-white'
              : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Filter size={16} />
          Filters
          {hasFilters && (
            <span className="w-5 h-5 rounded-full bg-white text-[var(--color-brand)] text-xs flex items-center justify-center">
              {[action, admin, targetType, fromDate, toDate].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 mb-6">
          <div className="grid grid-cols-5 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Action Type
              </label>
              <select
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              >
                <option value="">All Actions</option>
                {data?.filters.actions.map((a) => (
                  <option key={a} value={a}>
                    {a.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin Filter */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Admin User
              </label>
              <select
                value={admin}
                onChange={(e) => { setAdmin(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              >
                <option value="">All Admins</option>
                {data?.filters.admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Type Filter */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Target Type
              </label>
              <select
                value={targetType}
                onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              >
                <option value="">All Types</option>
                {data?.filters.targetTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-3 pt-3 border-t border-[var(--border-primary)]">
              <button
                onClick={clearFilters}
                className="text-sm text-[var(--color-brand)] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
        </div>
      ) : data?.logs && data.logs.length > 0 ? (
        <>
          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 text-sm text-[var(--text-muted)]">
            <span>
              Showing {((page - 1) * data.pagination.limit) + 1}-{Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} entries
            </span>
          </div>

          {/* Table */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Target
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-[var(--text-muted)]">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] mb-4">
            <FileText className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-medium text-[var(--text-primary)]">No audit logs found</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {hasFilters ? 'Try adjusting your filters' : 'Admin actions will appear here'}
          </p>
        </div>
      )}
    </div>
  );
}
