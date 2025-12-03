import { Building2, User, SearchX } from 'lucide-react';
import type { SearchResult } from '@/types';

interface SearchResultsProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  selectedId?: string | null;
}

export function SearchResults({ results, onSelect, selectedId }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
          <SearchX className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">No results found</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Try a different search term</p>
      </div>
    );
  }

  // Group results by type
  const tenants = results.filter(r => r.type === 'tenant');
  const users = results.filter(r => r.type === 'user');

  return (
    <div className="space-y-4">
      {tenants.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
            Tenants ({tenants.length})
          </h4>
          <div className="space-y-1">
            {tenants.map((result) => {
              const isSelected = result.id === selectedId;
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => onSelect(result)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-brand-subtle)] border border-[var(--color-brand)]'
                      : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[var(--color-brand)]/20' : 'bg-[var(--color-brand-subtle)]'
                  }`}>
                    <Building2 className="w-4 h-4 text-[var(--color-brand)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {result.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      Tenant organization
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                    TENANT
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
            Users ({users.length})
          </h4>
          <div className="space-y-1">
            {users.map((result) => {
              const isSelected = result.tenantId === selectedId;
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => onSelect(result)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-brand-subtle)] border border-[var(--color-brand)]'
                      : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[var(--color-info)]/20' : 'bg-[var(--color-info-soft)]'
                  }`}>
                    <User className="w-4 h-4 text-[var(--color-info)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {result.name || result.email}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {result.email}
                      {result.tenantName && <span> · {result.tenantName}</span>}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                    USER
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
