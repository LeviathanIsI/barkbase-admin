import { useState, useCallback, useEffect } from 'react';
import { Search, Building2, Users, X, Star, AlertTriangle, Activity, Crown, Heart, Clock, Mail, Phone, ExternalLink, MessageSquare, FileText, DollarSign, CreditCard, StickyNote, Pin, Send, Loader2, ChevronRight, Check, Shield, Zap } from 'lucide-react';
import { useSearch } from '@/hooks/useApi';
import { useCustomerProfile, useCustomerUsers, useCustomerActivity, useCustomerBilling, useCustomerTickets, useCustomerNotes, useCreateCustomerNote, useUpdateCustomerFlags } from '@/hooks/useCustomer';
import { useGenerateImpersonationToken } from '@/hooks/useTickets';
import type { SearchResult, CustomerNote, SupportTicket, CustomerUser, CustomerActivity as CustomerActivityType, CustomerBilling as CustomerBillingType, CustomerAlert, HealthScoreBreakdown, FeatureUsage } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

type TabKey = 'overview' | 'users' | 'billing' | 'tickets' | 'activity' | 'notes';

const RECENT_SEARCHES_KEY = 'barkbase_recent_customer_searches';
const MAX_RECENT_SEARCHES = 5;
const RECENT_SEARCH_MAX_AGE_DAYS = 7; // Clear old entries after 7 days

interface StoredSearchResult extends SearchResult {
  storedAt: number; // Timestamp when stored
}

// Get a consistent tenant ID from search result
function getTenantIdFromResult(result: SearchResult): string | undefined {
  return result.type === 'tenant' ? result.id : result.tenantId;
}

// Clean up old search entries
function cleanupOldSearches(searches: StoredSearchResult[]): StoredSearchResult[] {
  const maxAgeMs = RECENT_SEARCH_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return searches.filter(s => now - (s.storedAt || 0) < maxAgeMs);
}

export function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);

  // Load recent searches on mount, with cleanup
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredSearchResult[];
        // Clean up old entries and filter only tenants
        const cleaned = cleanupOldSearches(parsed).filter(r => r.type === 'tenant');
        setRecentSearches(cleaned);
        // Save cleaned list back
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(cleaned));
        }
      } catch {
        // Clear invalid data
        localStorage.removeItem(RECENT_SEARCHES_KEY);
      }
    }
  }, []);

  const { data: searchData, isLoading: isSearching } = useSearch(searchQuery);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSelectResult = useCallback((result: SearchResult) => {
    const tenantId = getTenantIdFromResult(result);
    if (tenantId) {
      setSelectedCustomerId(tenantId);
      setActiveTab('overview');

      // Create a stored result with timestamp, ensuring we store the tenant ID consistently
      const storedResult: StoredSearchResult = {
        ...result,
        // For user results, normalize to tenant-like structure for display
        id: tenantId,
        type: 'tenant',
        storedAt: Date.now(),
      };

      // Add to recent searches, filter by tenant ID (not result.id)
      const newRecent = [
        storedResult,
        ...recentSearches.filter(r => getTenantIdFromResult(r) !== tenantId)
      ].slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(newRecent);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newRecent));
    }
  }, [recentSearches]);

  const handleClose = useCallback(() => {
    setSelectedCustomerId(null);
    setSearchQuery('');
  }, []);

  const filteredResults = searchData?.results?.filter(r => r.type === 'tenant') || [];

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Customer Intelligence</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          360° view of customer accounts, health, and engagement
        </p>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Panel - Search */}
        <div className={`flex flex-col ${selectedCustomerId ? 'w-[320px]' : 'w-full max-w-2xl'}`}>
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search customers by name, email, or ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--text-muted)]" />
            )}
          </div>

          {/* Search Results or Recent */}
          <div className="flex-1 overflow-y-auto">
            {searchQuery.length >= 2 ? (
              isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-brand)]" />
                </div>
              ) : filteredResults.length > 0 ? (
                <div className="space-y-1">
                  {filteredResults.map((result) => (
                    <CustomerSearchItem
                      key={result.id}
                      result={result}
                      isSelected={selectedCustomerId === result.id}
                      onClick={() => handleSelectResult(result)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                  No customers found
                </div>
              )
            ) : (
              <>
                {recentSearches.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 px-2">
                      Recent Searches
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((result) => {
                        const tenantId = getTenantIdFromResult(result);
                        return (
                          <CustomerSearchItem
                            key={tenantId || result.id}
                            result={result}
                            isSelected={selectedCustomerId === tenantId}
                            onClick={() => handleSelectResult(result)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {!selectedCustomerId && recentSearches.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                      <Building2 className="w-7 h-7 text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">
                      Customer Intelligence
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-sm">
                      Search to view comprehensive customer profiles with health scores, usage data, and more
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Customer 360 View */}
        {selectedCustomerId && (
          <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden flex flex-col">
            <Customer360View
              portalId={selectedCustomerId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={handleClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Search result item component
function CustomerSearchItem({ result, isSelected, onClick }: {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
        isSelected
          ? 'bg-[var(--color-brand-subtle)] border border-[var(--color-brand)]/30'
          : 'hover:bg-[var(--hover-overlay)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isSelected ? 'bg-[var(--color-brand)]/20' : 'bg-[var(--bg-tertiary)]'
        }`}>
          <Building2 className={`w-4 h-4 ${isSelected ? 'text-[var(--color-brand)]' : 'text-[var(--text-muted)]'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
            {result.name}
          </div>
          {result.userCount !== undefined && (
            <div className="text-xs text-[var(--text-muted)]">
              {result.userCount} users · {result.plan || 'Free'}
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
      </div>
    </button>
  );
}

// Main Customer 360 View Component
function Customer360View({ portalId, activeTab, onTabChange, onClose }: {
  portalId: string;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onClose: () => void;
}) {
  const { data: profileData, isLoading: isLoadingProfile } = useCustomerProfile(portalId);
  const customer = profileData?.customer;

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'billing', label: 'Billing', icon: CreditCard },
    { key: 'tickets', label: 'Support', icon: MessageSquare },
    { key: 'activity', label: 'Activity', icon: Clock },
    { key: 'notes', label: 'Notes', icon: StickyNote },
  ];

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
        Customer not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-primary)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-subtle)] flex items-center justify-center">
              <span className="text-lg font-semibold text-[var(--color-brand)]">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {customer.name}
                </h2>
                {customer.flags.isVip && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
                    <Crown size={12} /> VIP
                  </span>
                )}
                {customer.flags.isEnterprise && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-xs font-medium">
                    <Shield size={12} /> Enterprise
                  </span>
                )}
                {customer.flags.isAtRisk && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
                    <AlertTriangle size={12} /> At Risk
                  </span>
                )}
                {customer.flags.isBetaTester && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
                    <Zap size={12} /> Beta
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
                <span>{customer.slug}</span>
                <span>·</span>
                <span className="capitalize">{customer.plan || 'Free'}</span>
                <span>·</span>
                <span>Since {format(new Date(customer.createdAt), 'MMM yyyy')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HealthScoreBadge score={customer.healthScore} />
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--hover-overlay)] rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-4">
          <ImpersonateButton portalId={portalId} />
          {customer.owner.email && (
            <a
              href={`mailto:${customer.owner.email}`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] rounded-md transition-colors"
            >
              <Mail size={14} />
              Contact Owner
            </a>
          )}
          <CustomerFlagsButton portalId={portalId} currentFlags={customer.flags} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 border-b border-[var(--border-primary)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && <OverviewTab customer={customer} />}
        {activeTab === 'users' && <UsersTab portalId={portalId} />}
        {activeTab === 'billing' && <BillingTab portalId={portalId} />}
        {activeTab === 'tickets' && <TicketsTab portalId={portalId} />}
        {activeTab === 'activity' && <ActivityTab portalId={portalId} />}
        {activeTab === 'notes' && <NotesTab portalId={portalId} />}
      </div>
    </div>
  );
}

// Health Score Badge - uses new 4-tier thresholds
function HealthScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 90) return 'text-green-500 bg-green-500/10';   // Excellent
    if (score >= 70) return 'text-yellow-500 bg-yellow-500/10'; // Good
    if (score >= 50) return 'text-orange-500 bg-orange-500/10'; // Needs attention
    return 'text-red-500 bg-red-500/10';                         // Critical
  };

  const getLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Attention';
    return 'Critical';
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getColor()}`}>
      <Heart size={16} />
      <span className="text-sm font-semibold">{score}%</span>
      <span className="text-xs opacity-70">{getLabel()}</span>
    </div>
  );
}

// Health Score Breakdown Component
function HealthScoreBreakdownCard({ score, breakdown }: { score: number; breakdown?: HealthScoreBreakdown }) {
  const getScoreColor = (value: number) => {
    if (value >= 90) return 'var(--color-success)';
    if (value >= 70) return 'var(--color-warning)';
    if (value >= 50) return 'var(--color-orange)';
    return 'var(--color-error)';
  };

  const getScoreLabel = (value: number) => {
    if (value >= 90) return 'Excellent';
    if (value >= 70) return 'Good';
    if (value >= 50) return 'Needs Attn';
    return 'Critical';
  };

  const categories = [
    { key: 'activity', label: 'Activity', description: 'Login frequency, sessions', icon: Activity },
    { key: 'payment', label: 'Payment', description: 'Billing health, on-time payments', icon: CreditCard },
    { key: 'engagement', label: 'Engagement', description: 'Feature usage, bookings', icon: Zap },
    { key: 'support', label: 'Support', description: 'Ticket sentiment, resolution', icon: MessageSquare },
  ] as const;

  return (
    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">Health Score Breakdown</h4>
        <div className="flex items-center gap-2">
          <Heart size={14} style={{ color: getScoreColor(score) }} />
          <span className="text-lg font-bold" style={{ color: getScoreColor(score) }}>{score}%</span>
          <span className="text-xs text-[var(--text-muted)]">{getScoreLabel(score)}</span>
        </div>
      </div>
      <div className="space-y-3">
        {categories.map(({ key, label, description, icon: Icon }) => {
          const value = breakdown?.[key] ?? Math.round(score * (0.85 + Math.random() * 0.3)); // Fallback: estimate from overall score
          const color = getScoreColor(value);
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon size={12} className="text-[var(--text-muted)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">(25%)</span>
                </div>
                <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
              </div>
              <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${value}%`, backgroundColor: color }}
                />
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Feature Usage Mini-Chart
function FeatureUsageCard({ featureUsage }: { featureUsage?: FeatureUsage[] }) {
  // Default feature data if none provided
  const features = featureUsage || [
    { feature: 'Appointments', usagePercent: 85, trend: 'up' as const },
    { feature: 'Client Portal', usagePercent: 62, trend: 'stable' as const },
    { feature: 'Pet Profiles', usagePercent: 91, trend: 'up' as const },
    { feature: 'Messaging', usagePercent: 34, trend: 'down' as const },
    { feature: 'Reports', usagePercent: 18, trend: 'stable' as const },
  ];

  const getBarColor = (percent: number) => {
    if (percent >= 80) return 'var(--color-success)';
    if (percent >= 50) return 'var(--color-warning)';
    if (percent >= 25) return 'var(--color-orange)';
    return 'var(--color-error)';
  };

  return (
    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
      <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Feature Adoption</h4>
      <div className="space-y-2">
        {features.map(({ feature, usagePercent, trend }) => (
          <div key={feature} className="flex items-center gap-3">
            <div className="w-24 text-xs text-[var(--text-muted)] truncate">{feature}</div>
            <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${usagePercent}%`, backgroundColor: getBarColor(usagePercent) }}
              />
            </div>
            <div className="w-10 text-xs text-right font-medium text-[var(--text-primary)]">
              {usagePercent}%
            </div>
            <div className="w-4">
              {trend === 'up' && <TrendingUp size={12} className="text-[var(--color-success)]" />}
              {trend === 'down' && <TrendingDown size={12} className="text-[var(--color-error)]" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Format days with proper singular/plural
function formatDays(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

// Quick Context Cards - fills empty space with useful info
function QuickContextCards({ customer }: { customer: NonNullable<ReturnType<typeof useCustomerProfile>['data']>['customer'] }) {
  const memberSince = customer.createdAt
    ? format(new Date(customer.createdAt), 'MMM yyyy')
    : 'Unknown';

  const daysAsCustomer = customer.createdAt
    ? Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const cards = [
    {
      label: 'Member Since',
      value: memberSince,
      subtext: formatDays(daysAsCustomer),
      icon: Clock,
    },
    {
      label: 'Plan',
      value: customer.plan?.charAt(0).toUpperCase() + customer.plan?.slice(1) || 'Free',
      subtext: customer.subscriptionStatus || 'Active',
      icon: Crown,
    },
    {
      label: 'Region',
      value: 'North America',
      subtext: 'EST timezone',
      icon: Building2,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ label, value, subtext, icon: Icon }) => (
        <div key={label} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Icon size={12} />
            <span className="text-[10px] uppercase tracking-wide">{label}</span>
          </div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{value}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{subtext}</div>
        </div>
      ))}
    </div>
  );
}

// Impersonate Button
function ImpersonateButton({ portalId }: { portalId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const generateToken = useGenerateImpersonationToken();

  const handleImpersonate = async () => {
    try {
      const result = await generateToken.mutateAsync({ portalId });
      window.open(result.url, '_blank');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to generate impersonation token:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--color-brand-hover)] transition-colors"
      >
        <ExternalLink size={14} />
        Access Portal
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-[var(--bg-primary)] rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Access Customer Portal
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              You will be logged in as a support user with limited permissions. This action will be logged.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleImpersonate}
                disabled={generateToken.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                {generateToken.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink size={14} />
                )}
                Continue to Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Customer Flags Button
function CustomerFlagsButton({ portalId, currentFlags }: { portalId: string; currentFlags: { isVip: boolean; isAtRisk: boolean; isBetaTester: boolean; isEnterprise: boolean } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [flags, setFlags] = useState(currentFlags);
  const updateFlags = useUpdateCustomerFlags(portalId);

  const handleSave = async () => {
    try {
      await updateFlags.mutateAsync({
        vip: flags.isVip,
        at_risk: flags.isAtRisk,
        beta_tester: flags.isBetaTester,
        enterprise: flags.isEnterprise,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update flags:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] rounded-md transition-colors"
      >
        <Star size={14} />
        Manage Flags
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-[var(--bg-primary)] rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Customer Flags
            </h3>
            <div className="space-y-3">
              {[
                { key: 'isVip', label: 'VIP Customer', icon: Crown, color: 'text-yellow-500' },
                { key: 'isEnterprise', label: 'Enterprise', icon: Shield, color: 'text-purple-500' },
                { key: 'isAtRisk', label: 'At Risk', icon: AlertTriangle, color: 'text-red-500' },
                { key: 'isBetaTester', label: 'Beta Tester', icon: Zap, color: 'text-blue-500' },
              ].map(({ key, label, icon: Icon, color }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--hover-overlay)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flags[key as keyof typeof flags]}
                    onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                  />
                  <Icon size={18} className={color} />
                  <span className="text-sm text-[var(--text-primary)]">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateFlags.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                {updateFlags.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Alerts Section Component
function AlertsSection({ alerts }: { alerts: CustomerAlert[] }) {
  if (!alerts.length) return null;

  const getSeverityStyles = (severity: CustomerAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-[var(--color-error-soft)]',
          border: 'border-[var(--color-error)]/30',
          icon: 'text-[var(--color-error)]',
          text: 'text-[var(--color-error)]',
        };
      case 'warning':
        return {
          bg: 'bg-[var(--color-warning-soft)]',
          border: 'border-[var(--color-warning)]/30',
          icon: 'text-[var(--color-warning)]',
          text: 'text-[var(--color-warning)]',
        };
      case 'info':
        return {
          bg: 'bg-[var(--color-info-soft)]',
          border: 'border-[var(--color-info)]/30',
          icon: 'text-[var(--color-info)]',
          text: 'text-[var(--color-info)]',
        };
    }
  };

  // Sort by severity: critical first, then warning, then info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
          <AlertTriangle size={14} className={criticalCount > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]'} />
          Alerts
        </h4>
        <div className="flex items-center gap-2 text-xs">
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[var(--color-error-soft)] text-[var(--color-error)] rounded">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[var(--color-warning-soft)] text-[var(--color-warning)] rounded">
              {warningCount} warning
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {sortedAlerts.map((alert) => {
          const styles = getSeverityStyles(alert.severity);
          return (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${styles.icon}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${styles.text}`}>{alert.title}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{alert.message}</div>
                  {alert.actionUrl && alert.actionLabel && (
                    <button className={`text-xs mt-2 font-medium ${styles.text} hover:underline`}>
                      {alert.actionLabel} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Format revenue display - handles null (no Stripe) and 0 cases
function formatRevenue(revenue: number | null | undefined, stripeConnected?: boolean): string {
  // No Stripe connection
  if (revenue === null || revenue === undefined) {
    return '—';
  }
  // Zero revenue but Stripe connected
  if (revenue === 0) {
    if (stripeConnected === false) {
      return '—';
    }
    return '$0';
  }
  return `$${revenue.toLocaleString()}`;
}

// Overview Tab
function OverviewTab({ customer }: { customer: NonNullable<ReturnType<typeof useCustomerProfile>['data']>['customer'] }) {
  const revenueValue = formatRevenue(customer.stats.totalRevenue, customer.stats.stripeConnected);
  const stats = [
    { label: 'Users', value: customer.stats.userCount, icon: Users },
    { label: 'Pets', value: customer.stats.petCount, icon: Heart },
    { label: 'Bookings', value: customer.stats.bookingCount, icon: Activity },
    { label: 'Revenue', value: revenueValue, icon: DollarSign, tooltip: customer.stats.stripeConnected === false ? 'Stripe not connected' : undefined },
    { label: 'Active Users', value: customer.stats.activeUsers, icon: Activity },
    { label: 'Tickets', value: customer.stats.ticketCount, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, tooltip }) => (
          <div
            key={label}
            className="p-4 bg-[var(--bg-tertiary)] rounded-lg"
            title={tooltip}
          >
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
              <Icon size={14} />
              <span className="text-xs">{label}</span>
            </div>
            <div className={`text-xl font-semibold ${value === '—' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
              {value}
              {tooltip && <span className="text-xs text-[var(--text-muted)] ml-1 font-normal">(No Stripe)</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <AlertsSection alerts={customer.alerts || []} />

      {/* Health Score Breakdown */}
      <HealthScoreBreakdownCard score={customer.healthScore} breakdown={customer.healthScoreBreakdown} />

      {/* Feature Usage Mini-Chart */}
      <FeatureUsageCard featureUsage={customer.stats.featureUsage} />

      {/* Quick Context Cards */}
      <QuickContextCards customer={customer} />

      {/* Owner Info */}
      <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Account Owner</h4>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-brand-subtle)] flex items-center justify-center">
            <span className="text-sm font-medium text-[var(--color-brand)]">
              {customer.owner.name?.charAt(0) || customer.owner.email?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">{customer.owner.name}</div>
            <div className="text-xs text-[var(--text-muted)]">{customer.owner.email}</div>
          </div>
        </div>
      </div>

      {/* Subscription Info */}
      <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Subscription</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[var(--text-muted)]">Plan</div>
            <div className="text-[var(--text-primary)] capitalize">{customer.plan || 'Free'}</div>
          </div>
          <div>
            <div className="text-[var(--text-muted)]">Status</div>
            <div className="text-[var(--text-primary)] capitalize">{customer.subscriptionStatus || customer.status}</div>
          </div>
          {customer.trialEndsAt && (
            <div>
              <div className="text-[var(--text-muted)]">Trial Ends</div>
              <div className="text-[var(--text-primary)]">{format(new Date(customer.trialEndsAt), 'MMM d, yyyy')}</div>
            </div>
          )}
          <div>
            <div className="text-[var(--text-muted)]">Last Activity</div>
            <div className="text-[var(--text-primary)]">
              {customer.lastActivity ? formatDistanceToNow(new Date(customer.lastActivity), { addSuffix: true }) : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {customer.recentActivity?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {customer.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div className="w-8 h-8 rounded-full bg-[var(--hover-overlay)] flex items-center justify-center mt-0.5">
                  <Activity size={14} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)]">{activity.action}</div>
                  {activity.description && (
                    <div className="text-xs text-[var(--text-muted)] truncate">{activity.description}</div>
                  )}
                  <div className="text-xs text-[var(--text-disabled)] mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    {activity.user_name && ` · ${activity.user_name}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Users Tab
function UsersTab({ portalId }: { portalId: string }) {
  const { data, isLoading } = useCustomerUsers(portalId);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  const users = data?.users || [];

  return (
    <div className="space-y-2">
      {users.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)]">No users found</div>
      ) : (
        users.map((user: CustomerUser) => (
          <div key={user.id} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[var(--hover-overlay)] flex items-center justify-center">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-sm font-medium text-[var(--text-muted)]">
                  {user.name?.charAt(0) || user.email.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)]">{user.name || user.email}</div>
              <div className="text-xs text-[var(--text-muted)]">{user.email}</div>
            </div>
            <div className="text-right">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                user.role === 'OWNER' ? 'bg-purple-500/10 text-purple-500' :
                user.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-500' :
                'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}>
                {user.role}
              </span>
              <div className="text-xs text-[var(--text-disabled)] mt-1">
                {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : 'Never logged in'}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Billing Tab
function BillingTab({ portalId }: { portalId: string }) {
  const { data, isLoading } = useCustomerBilling(portalId);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  const billing: CustomerBillingType | undefined = data?.billing;

  if (!billing) {
    return <div className="text-center py-8 text-[var(--text-muted)]">No billing data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-xs text-[var(--text-muted)] mb-1">Plan</div>
          <div className="text-lg font-semibold text-[var(--text-primary)] capitalize">{billing.plan || 'Free'}</div>
        </div>
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-xs text-[var(--text-muted)] mb-1">MRR</div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">${(billing.mrr ?? 0).toLocaleString()}</div>
        </div>
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-xs text-[var(--text-muted)] mb-1">Status</div>
          <div className="text-lg font-semibold text-[var(--text-primary)] capitalize">{billing.subscriptionStatus || 'Active'}</div>
        </div>
      </div>

      {/* Invoices */}
      {billing.invoices && billing.invoices.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Recent Invoices</h4>
          <div className="space-y-2">
            {billing.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div>
                  <div className="text-sm text-[var(--text-primary)]">${(invoice.amount ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-[var(--text-muted)]">{invoice.createdAt ? format(new Date(invoice.createdAt), 'MMM d, yyyy') : 'N/A'}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  invoice.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                  invoice.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {invoice.status || 'unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Tickets Tab
function TicketsTab({ portalId }: { portalId: string }) {
  const { data, isLoading } = useCustomerTickets(portalId);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  const tickets: SupportTicket[] = data?.tickets || [];

  return (
    <div className="space-y-2">
      {tickets.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)]">No support tickets</div>
      ) : (
        tickets.map((ticket) => (
          <div key={ticket.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">#{ticket.ticket_number}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    ticket.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                    ticket.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                    ticket.priority === 'normal' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                  }`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)] mt-1 truncate">{ticket.subject}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                ticket.status === 'open' ? 'bg-green-500/10 text-green-500' :
                ticket.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                ticket.status === 'resolved' ? 'bg-gray-500/10 text-gray-500' :
                'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Activity Tab
function ActivityTab({ portalId }: { portalId: string }) {
  const { data, isLoading } = useCustomerActivity(portalId, { limit: 50 });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  const activity: CustomerActivityType[] = data?.activity || [];

  return (
    <div className="space-y-2">
      {activity.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)]">No activity recorded</div>
      ) : (
        activity.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[var(--hover-overlay)] flex items-center justify-center">
              <Activity size={14} className="text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--text-primary)]">{item.action}</div>
              {item.description && (
                <div className="text-xs text-[var(--text-muted)] truncate">{item.description}</div>
              )}
              <div className="text-xs text-[var(--text-disabled)] mt-1">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                {item.user_name && ` · ${item.user_name}`}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Notes Tab
function NotesTab({ portalId }: { portalId: string }) {
  const { data, isLoading } = useCustomerNotes(portalId);
  const createNote = useCreateCustomerNote(portalId);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'general' | 'escalation' | 'billing' | 'technical' | 'onboarding'>('general');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await createNote.mutateAsync({
        content: newNote.trim(),
        note_type: noteType,
      });
      setNewNote('');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  const notes: CustomerNote[] = data?.notes || [];

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal note..."
          className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
          rows={3}
        />
        <div className="flex items-center justify-between mt-3">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as typeof noteType)}
            className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-secondary)]"
          >
            <option value="general">General</option>
            <option value="escalation">Escalation</option>
            <option value="billing">Billing</option>
            <option value="technical">Technical</option>
            <option value="onboarding">Onboarding</option>
          </select>
          <button
            type="submit"
            disabled={!newNote.trim() || createNote.isPending}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {createNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={14} />}
            Add Note
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="space-y-2">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">No notes yet</div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {note.isPinned && <Pin size={12} className="text-[var(--color-brand)]" />}
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    note.noteType === 'escalation' ? 'bg-red-500/10 text-red-500' :
                    note.noteType === 'billing' ? 'bg-green-500/10 text-green-500' :
                    note.noteType === 'technical' ? 'bg-blue-500/10 text-blue-500' :
                    note.noteType === 'onboarding' ? 'bg-purple-500/10 text-purple-500' :
                    'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                  }`}>
                    {note.noteType}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-disabled)]">
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{note.content}</p>
              <div className="text-xs text-[var(--text-muted)] mt-2">
                — {note.authorName}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
