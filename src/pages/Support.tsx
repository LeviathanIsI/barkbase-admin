import { useState, useCallback } from 'react';
import { SearchBar } from '@/components/support/SearchBar';
import { SearchResults } from '@/components/support/SearchResults';
import { TenantDetail } from '@/components/support/TenantDetail';
import { useSearch, useTenant } from '@/hooks/useApi';
import type { SearchResult } from '@/types';
import { Loader2, Search, Building2, Users, PawPrint } from 'lucide-react';

export function Support() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const { data: searchData, isLoading: isSearching } = useSearch(searchQuery);
  const { data: tenantData, isLoading: isLoadingTenant, refetch: refetchTenant } = useTenant(selectedTenantId || '');

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSelectResult = useCallback((result: SearchResult) => {
    if (result.type === 'tenant') {
      setSelectedTenantId(result.id);
    } else if (result.tenantId) {
      setSelectedTenantId(result.tenantId);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedTenantId(null);
  }, []);

  return (
    <div className="h-[calc(100vh-48px)]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Support Desk</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Search and manage tenants, users, and customer accounts
        </p>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex gap-6 h-[calc(100%-80px)]">
        {/* Left Panel - Search & Results (60%) */}
        <div className={`flex flex-col ${selectedTenantId ? 'w-[55%]' : 'w-full max-w-3xl'}`}>
          {/* Search Bar */}
          <div className="mb-4">
            <SearchBar
              onSearch={handleSearch}
              isLoading={isSearching}
              placeholder="Search tenants, users, pets, bookings..."
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {searchQuery.length >= 2 ? (
              isSearching ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
                </div>
              ) : (
                <SearchResults
                  results={searchData?.results || []}
                  onSelect={handleSelectResult}
                  selectedId={selectedTenantId}
                />
              )
            ) : searchQuery.length === 1 ? (
              <div className="text-center py-16 text-[var(--text-muted)]">
                Type at least 2 characters to search
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">
                  Search for anything
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">
                  Find tenants by name, users by email, or look up specific accounts
                </p>
                <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-[var(--color-brand)]" />
                    <span>Tenants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-[var(--color-info)]" />
                    <span>Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PawPrint size={16} className="text-[var(--color-success)]" />
                    <span>Pets</span>
                  </div>
                </div>
                <div className="mt-6 text-xs text-[var(--text-disabled)]">
                  Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded border border-[var(--border-primary)] font-mono">Ctrl+K</kbd> to focus search
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Detail (40%) */}
        {selectedTenantId && (
          <div className="w-[45%] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden flex flex-col">
            {isLoadingTenant ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
              </div>
            ) : tenantData ? (
              <TenantDetail
                tenant={tenantData}
                onClose={handleCloseDetail}
                onRefresh={() => refetchTenant()}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                Tenant not found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
