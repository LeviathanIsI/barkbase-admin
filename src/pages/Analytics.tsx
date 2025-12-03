import { useState } from 'react';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAnalytics } from '@/hooks/useApi';

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
];

const PLAN_COLORS = {
  free: '#64748b',
  pro: '#3b82f6',
  enterprise: '#8b5cf6',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: typeof DollarSign;
  loading?: boolean;
}

function MetricCard({ title, value, change, changeLabel, icon: Icon, loading }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{title}</span>
        <Icon size={16} className="text-[var(--text-muted)]" />
      </div>
      {loading ? (
        <div className="h-8 bg-[var(--bg-tertiary)] rounded animate-pulse" />
      ) : (
        <>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {formatPercent(change)}
              {changeLabel && <span className="text-[var(--text-muted)] ml-1">{changeLabel}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
}

function Sparkline({ data, color = 'var(--color-brand)' }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 30;
  const width = 80;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-2 shadow-lg">
        <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue')
              ? formatCurrency(entry.value)
              : formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Analytics() {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading } = useAnalytics(period);

  // Mock data for visualization (API would return real data)
  const signupData = data?.signups || [
    { date: 'Jan', count: 45 },
    { date: 'Feb', count: 52 },
    { date: 'Mar', count: 61 },
    { date: 'Apr', count: 58 },
    { date: 'May', count: 75 },
    { date: 'Jun', count: 89 },
  ];

  const revenueData = data?.revenue || [
    { date: 'Jan', revenue: 12500 },
    { date: 'Feb', revenue: 14200 },
    { date: 'Mar', revenue: 15800 },
    { date: 'Apr', revenue: 16100 },
    { date: 'May', revenue: 18500 },
    { date: 'Jun', revenue: 21200 },
  ];

  const planDistribution = data?.planDistribution || [
    { name: 'Free', value: 245, color: PLAN_COLORS.free },
    { name: 'Pro', value: 128, color: PLAN_COLORS.pro },
    { name: 'Enterprise', value: 42, color: PLAN_COLORS.enterprise },
  ];

  const featureUsage = data?.featureUsage || [
    { name: 'Bookings', usage: 95 },
    { name: 'Scheduling', usage: 82 },
    { name: 'Payments', usage: 67 },
    { name: 'Notifications', usage: 58 },
    { name: 'Reports', usage: 45 },
    { name: 'API', usage: 23 },
  ];

  const topTenants = data?.topTenants || [
    { name: 'Happy Paws Grooming', plan: 'enterprise', bookings: 1247, users: 12, mrr: 299 },
    { name: 'Bark & Bath', plan: 'pro', bookings: 892, users: 6, mrr: 79 },
    { name: 'Pawsome Care', plan: 'pro', bookings: 756, users: 4, mrr: 79 },
    { name: 'The Dog House', plan: 'enterprise', bookings: 623, users: 8, mrr: 299 },
    { name: 'Fluffy Friends', plan: 'pro', bookings: 512, users: 3, mrr: 79 },
  ];

  const sparklineData = [12, 15, 13, 18, 16, 22, 25, 24, 28, 32];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Business metrics and insights</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
        >
          {PERIOD_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Revenue Metrics */}
      <div>
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Revenue</h2>
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="MRR"
            value={formatCurrency(data?.mrr || 21200)}
            change={12.5}
            changeLabel="vs last month"
            icon={DollarSign}
            loading={isLoading}
          />
          <MetricCard
            title="ARR"
            value={formatCurrency(data?.arr || 254400)}
            change={18.2}
            changeLabel="vs last year"
            icon={TrendingUp}
            loading={isLoading}
          />
          <MetricCard
            title="Revenue This Month"
            value={formatCurrency(data?.revenueThisMonth || 21200)}
            change={8.3}
            changeLabel="vs last month"
            icon={DollarSign}
            loading={isLoading}
          />
          <MetricCard
            title="Avg Revenue/Tenant"
            value={formatCurrency(data?.avgRevenuePerTenant || 51)}
            change={3.2}
            icon={Building2}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Growth Metrics */}
      <div>
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Growth</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Total Tenants</span>
              <Sparkline data={sparklineData} />
            </div>
            {isLoading ? (
              <div className="h-8 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-[var(--text-primary)]">{formatNumber(data?.totalTenants || 415)}</div>
            )}
          </div>
          <MetricCard
            title="New Signups"
            value={formatNumber(data?.newSignups || 89)}
            change={15.7}
            changeLabel="this month"
            icon={Users}
            loading={isLoading}
          />
          <MetricCard
            title="Churn Rate"
            value={`${data?.churnRate || 2.1}%`}
            change={-0.3}
            icon={TrendingDown}
            loading={isLoading}
          />
          <MetricCard
            title="Net Growth"
            value={`+${formatNumber(data?.netGrowth || 82)}`}
            change={22.4}
            icon={TrendingUp}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Signups Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Signups Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={signupData}>
              <defs>
                <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Signups"
                stroke="var(--color-brand)"
                fill="url(#signupGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v: number) => `$${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="var(--color-success)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-success)', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => <span className="text-sm text-[var(--text-secondary)]">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Usage */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Feature Usage</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={featureUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="usage" name="Usage %" fill="var(--color-brand)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Tenants Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Top Tenants</h3>
          <div className="flex gap-2">
            {['bookings', 'revenue', 'users'].map(metric => (
              <button
                key={metric}
                className="px-3 py-1 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                By {metric}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-right">Bookings</th>
                <th className="px-4 py-3 text-right">Users</th>
                <th className="px-4 py-3 text-right">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {topTenants.map((tenant, idx) => (
                <tr key={idx} className="hover:bg-[var(--hover-overlay)]">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{tenant.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      tenant.plan === 'enterprise'
                        ? 'bg-purple-500/20 text-purple-400'
                        : tenant.plan === 'pro'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[var(--text-secondary)]">
                    {formatNumber(tenant.bookings)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[var(--text-secondary)]">
                    {tenant.users}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[var(--color-success)]">
                    {formatCurrency(tenant.mrr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
