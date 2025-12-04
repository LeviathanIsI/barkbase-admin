import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Calendar,
  Users,
  CreditCard,
  Activity,
  MessageSquare,
  Clock,
  Filter,
  Bell,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import {
  useHealthScores,
  useHealthScoresStats,
  useChurnAlerts,
  useAcknowledgeChurnAlert,
} from '@/hooks/useApi';
import type { TenantHealthScore, ChurnAlert, HealthTrend, HealthScoreStats } from '@/types';

type HealthFilter = 'all' | 'at_risk' | 'needs_attention' | 'good' | 'excellent';

function getHealthColor(score: number): string {
  if (score >= 90) return 'var(--color-success)';   // 🟢 Excellent
  if (score >= 70) return 'var(--color-warning)';   // 🟡 Good (yellow/gold)
  if (score >= 50) return 'var(--color-orange)';    // 🟠 Needs attention
  return 'var(--color-error)';                       // 🔴 Critical
}

function getHealthBand(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Attention';
  return 'At Risk';
}

function TrendIndicator({ trend, change }: { trend: HealthTrend; change: number }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-0.5 text-xs text-[var(--color-success)]">
        <TrendingUp size={12} />
        +{change}
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-0.5 text-xs text-[var(--color-error)]">
        <TrendingDown size={12} />
        {change}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
      <Minus size={12} />
      0
    </span>
  );
}

function HealthScoreRing({ score, size = 60 }: { score: number; size?: number }) {
  const strokeWidth = size / 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getHealthColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Activity }) {
  const color = getHealthColor(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <Icon size={12} />
          {label}
        </span>
        <span className="font-medium" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function CustomerHealth() {
  const [filter, setFilter] = useState<HealthFilter>('all');
  const [selectedTenant, setSelectedTenant] = useState<TenantHealthScore | null>(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // API hooks
  const { data: healthScoresData, isLoading: isLoadingScores } = useHealthScores(filter === 'all' ? undefined : filter);
  const { data: statsData, isLoading: isLoadingStats } = useHealthScoresStats();
  const { data: alertsData, isLoading: isLoadingAlerts } = useChurnAlerts();
  const acknowledgeAlert = useAcknowledgeChurnAlert();

  const isLoading = isLoadingScores || isLoadingStats || isLoadingAlerts;

  const healthScores = healthScoresData?.scores || [];
  const stats = statsData?.stats;
  const alerts = alertsData?.alerts || [];

  const filteredTenants = [...healthScores].sort((a: TenantHealthScore, b: TenantHealthScore) => a.healthScore - b.healthScore);
  const unacknowledgedAlerts = alerts.filter((a: ChurnAlert) => !a.acknowledged);

  const handleAcknowledgeAlert = (alertId: string) => {
    acknowledgeAlert.mutate(alertId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  const displayStats: HealthScoreStats = stats || { atRisk: 0, needsAttention: 0, good: 0, excellent: 0, healthy: 0, avgScore: 0, total: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Customer Health</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Monitor tenant engagement and identify churn risk</p>
        </div>
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            showAlerts
              ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
          }`}
        >
          <Bell size={16} />
          Churn Alerts
          {unacknowledgedAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-error)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unacknowledgedAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Alerts Banner */}
      {showAlerts && unacknowledgedAlerts.length > 0 && (
        <div className="bg-[var(--color-error-soft)] border border-[var(--color-error)]/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-[var(--color-error)]" />
            <span className="text-sm font-medium text-[var(--color-error)]">
              {unacknowledgedAlerts.length} Active Churn Alert{unacknowledgedAlerts.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {unacknowledgedAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-2 bg-white/50 rounded">
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{alert.tenantName}</span>
                  <span className="text-sm text-[var(--text-muted)] ml-2">— {alert.message}</span>
                </div>
                <button 
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                  className="text-xs text-[var(--color-brand)] hover:underline"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Avg Score</span>
            <Activity size={16} className="text-[var(--text-muted)]" />
          </div>
          <div className="mt-2 text-2xl font-bold" style={{ color: getHealthColor(displayStats.avgScore) }}>
            {displayStats.avgScore}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">{getHealthBand(displayStats.avgScore)}</div>
        </div>
        <button
          onClick={() => setFilter('excellent')}
          className={`text-left bg-[var(--bg-secondary)] border rounded-lg p-4 transition-colors ${
            filter === 'excellent' ? 'border-[var(--color-success)]' : 'border-[var(--border-primary)] hover:border-[var(--color-success)]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Excellent</span>
            <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-success)]">{displayStats.excellent}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">90+</div>
        </button>
        <button
          onClick={() => setFilter('good')}
          className={`text-left bg-[var(--bg-secondary)] border rounded-lg p-4 transition-colors ${
            filter === 'good' ? 'border-[var(--color-warning)]' : 'border-[var(--border-primary)] hover:border-[var(--color-warning)]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Good</span>
            <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-warning)]">{displayStats.good}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">70-89</div>
        </button>
        <button
          onClick={() => setFilter('needs_attention')}
          className={`text-left bg-[var(--bg-secondary)] border rounded-lg p-4 transition-colors ${
            filter === 'needs_attention' ? 'border-[var(--color-orange)]' : 'border-[var(--border-primary)] hover:border-[var(--color-orange)]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Needs Attn</span>
            <div className="w-2 h-2 rounded-full bg-[var(--color-orange)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-orange)]">{displayStats.needsAttention}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">50-69</div>
        </button>
        <button
          onClick={() => setFilter('at_risk')}
          className={`text-left bg-[var(--bg-secondary)] border rounded-lg p-4 transition-colors ${
            filter === 'at_risk' ? 'border-[var(--color-error)]' : 'border-[var(--border-primary)] hover:border-[var(--color-error)]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">At Risk</span>
            <div className="w-2 h-2 rounded-full bg-[var(--color-error)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-error)]">{displayStats.atRisk}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">&lt;50</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-muted)]">
            Showing {filteredTenants.length} of {displayStats.total} tenants
          </span>
        </div>
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="text-xs text-[var(--color-brand)] hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Tenant List */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-tertiary)]">
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Health Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trend</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Risk Factors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            {filteredTenants.map(tenant => (
              <tr
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant)}
                className="hover:bg-[var(--hover-overlay)] cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{tenant.tenantName}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--text-muted)]">{tenant.tenantSubdomain}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        tenant.plan === 'enterprise'
                          ? 'bg-purple-500/20 text-purple-400'
                          : tenant.plan === 'pro'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {tenant.plan.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <HealthScoreRing score={tenant.healthScore} size={40} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: `${getHealthColor(tenant.healthScore)}20`,
                      color: getHealthColor(tenant.healthScore),
                    }}
                  >
                    {getHealthBand(tenant.healthScore)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <TrendIndicator trend={tenant.trend} change={tenant.trendChange} />
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${tenant.daysSinceLogin > 7 ? 'text-[var(--color-error)]' : 'text-[var(--text-secondary)]'}`}>
                    {tenant.lastActivityAt ? new Date(tenant.lastActivityAt).toLocaleDateString() : 'Never'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {tenant.riskFactors.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <AlertTriangle size={12} className="text-[var(--color-warning)]" />
                      <span className="text-xs text-[var(--text-muted)]">
                        {tenant.riskFactors.length} issue{tenant.riskFactors.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tenant Detail Panel */}
      <SlideOutPanel
        isOpen={!!selectedTenant}
        onClose={() => setSelectedTenant(null)}
        title="Tenant Health Details"
        width="lg"
      >
        {selectedTenant && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <HealthScoreRing score={selectedTenant.healthScore} size={80} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{selectedTenant.tenantName}</h3>
                <p className="text-sm text-[var(--text-muted)]">{selectedTenant.tenantSubdomain}.barkbase.app</p>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: `${getHealthColor(selectedTenant.healthScore)}20`,
                      color: getHealthColor(selectedTenant.healthScore),
                    }}
                  >
                    {getHealthBand(selectedTenant.healthScore)}
                  </span>
                  <TrendIndicator trend={selectedTenant.trend} change={selectedTenant.trendChange} />
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            {selectedTenant.riskFactors.length > 0 && (
              <div className="p-4 bg-[var(--color-error-soft)] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-[var(--color-error)]" />
                  <span className="text-sm font-medium text-[var(--color-error)]">Risk Factors</span>
                </div>
                <ul className="space-y-1">
                  {selectedTenant.riskFactors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-[var(--color-error)]/80 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[var(--color-error)]" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Score Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Score Breakdown</h4>
              <div className="space-y-3">
                <BreakdownBar label="Login Frequency" value={selectedTenant.breakdown.loginFrequency} icon={Clock} />
                <BreakdownBar label="Feature Adoption" value={selectedTenant.breakdown.featureAdoption} icon={Activity} />
                <BreakdownBar label="Booking Trend" value={selectedTenant.breakdown.bookingTrend} icon={Calendar} />
                <BreakdownBar label="Support Sentiment" value={selectedTenant.breakdown.supportSentiment} icon={MessageSquare} />
                <BreakdownBar label="Payment History" value={selectedTenant.breakdown.paymentHistory} icon={CreditCard} />
                <BreakdownBar label="User Engagement" value={selectedTenant.breakdown.userEngagement} icon={Users} />
              </div>
            </div>

            {/* Recommended Actions */}
            <div>
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Recommended Actions</h4>
              <div className="space-y-2">
                {selectedTenant.daysSinceLogin > 7 && (
                  <div className="flex items-start gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-brand-subtle)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[var(--color-brand)]">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Re-engagement outreach</p>
                      <p className="text-xs text-[var(--text-muted)]">Send personalized email to check in and offer assistance</p>
                    </div>
                  </div>
                )}
                {selectedTenant.breakdown.featureAdoption < 50 && (
                  <div className="flex items-start gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-brand-subtle)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[var(--color-brand)]">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Feature training session</p>
                      <p className="text-xs text-[var(--text-muted)]">Schedule demo of underutilized features</p>
                    </div>
                  </div>
                )}
                {selectedTenant.breakdown.bookingTrend < 60 && (
                  <div className="flex items-start gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-brand-subtle)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[var(--color-brand)]">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Business review call</p>
                      <p className="text-xs text-[var(--text-muted)]">Discuss declining usage and identify pain points</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add Note */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">Notes & Follow-ups</h4>
                <button
                  onClick={() => setShowAddNote(!showAddNote)}
                  className="flex items-center gap-1 text-xs text-[var(--color-brand)] hover:underline"
                >
                  {showAddNote ? <X size={12} /> : <Plus size={12} />}
                  {showAddNote ? 'Cancel' : 'Add Note'}
                </button>
              </div>

              {showAddNote && (
                <div className="space-y-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this customer..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-[var(--text-muted)] mb-1">Follow-up Date (optional)</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                      />
                    </div>
                    <button className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]">
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 text-center text-xs text-[var(--text-muted)]">
                No notes yet
              </div>
            </div>
          </div>
        )}
      </SlideOutPanel>
    </div>
  );
}
