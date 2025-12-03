import { useState } from 'react';
import {
  Loader2,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  Server,
  Gauge,
  Clock,
  Zap,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  X,
  Terminal,
  MemoryStick,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useCommandCenterOverview,
  useCommandCenterServices,
  useCommandCenterMetrics,
  useCommandCenterLambdas,
  useCommandCenterLambdaMetrics,
  useCommandCenterLambdaErrors,
  useCommandCenterDatabase,
  useCommandCenterApiTraffic,
  useCommandCenterErrors,
  useCommandCenterTenantsActivity,
} from '@/hooks/useCommandCenter';
import type {
  CommandCenterStatus,
  CommandCenterService,
  CommandCenterLambda,
  CommandCenterError,
  LambdaStatus,
  ServiceStatus,
} from '@/types';

// ============================================================================
// Constants & Config
// ============================================================================

const STATUS_CONFIG: Record<CommandCenterStatus, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  operational: { color: 'var(--color-success)', bg: 'var(--color-success-soft)', label: 'All Systems Operational', icon: CheckCircle },
  degraded: { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', label: 'Degraded Performance', icon: AlertCircle },
  partial_outage: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', label: 'Partial System Outage', icon: AlertTriangle },
  major_outage: { color: 'var(--color-error)', bg: 'var(--color-error-soft)', label: 'Major System Outage', icon: XCircle },
};

const SERVICE_STATUS_CONFIG: Record<ServiceStatus, { color: string; bg: string }> = {
  healthy: { color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
  degraded: { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)' },
  down: { color: 'var(--color-error)', bg: 'var(--color-error-soft)' },
};

const LAMBDA_STATUS_CONFIG: Record<LambdaStatus, { color: string; bg: string; label: string }> = {
  active: { color: 'var(--color-success)', bg: 'var(--color-success-soft)', label: 'Active' },
  idle: { color: 'var(--text-muted)', bg: 'var(--bg-tertiary)', label: 'Idle' },
  slow: { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', label: 'Slow' },
  degraded: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', label: 'Degraded' },
  error: { color: 'var(--color-error)', bg: 'var(--color-error-soft)', label: 'Error' },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(date).toLocaleDateString();
}

// ============================================================================
// Sparkline Component
// ============================================================================

function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'var(--color-brand)',
  showArea = false,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M0,${height} L${points} L${width},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {showArea && (
        <path
          d={areaPath}
          fill={color}
          fillOpacity={0.1}
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// Global Health Banner
// ============================================================================

function GlobalHealthBanner() {
  const { data, isLoading } = useCommandCenterOverview();

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 animate-pulse">
        <div className="h-6 w-48 bg-[var(--bg-tertiary)] rounded" />
      </div>
    );
  }

  if (!data) return null;

  const config = STATUS_CONFIG[data.status];
  const StatusIcon = config.icon;

  return (
    <div
      className="rounded-lg p-4 border transition-all"
      style={{
        backgroundColor: config.bg,
        borderColor: `${config.color}40`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon
            className="w-6 h-6"
            style={{ color: config.color }}
          />
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: config.color }}
            >
              {config.label}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {data.statusMessage} • Uptime: {data.uptime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {data.alarms.inAlarm > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-error-soft)] rounded-full">
              <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />
              <span className="text-sm font-medium text-[var(--color-error)]">
                {data.alarms.inAlarm} Alarm{data.alarms.inAlarm > 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div className="text-xs text-[var(--text-muted)]">
            Updated {formatRelativeTime(data.lastUpdated)}
          </div>
        </div>
      </div>

      {/* Active Incidents */}
      {data.activeIncidents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-secondary)]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Active Incidents ({data.activeIncidents.length})
            </span>
          </div>
          <div className="space-y-2">
            {data.activeIncidents.map((incident) => (
              <Link
                key={incident.id}
                to={`/incidents/${incident.id}`}
                className="flex items-center justify-between p-3 bg-white/5 rounded-md hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        incident.severity === 'critical' ? 'var(--color-error)' :
                        incident.severity === 'major' ? '#f97316' :
                        incident.severity === 'minor' ? 'var(--color-warning)' :
                        'var(--color-brand)',
                    }}
                  />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {incident.title}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {incident.affectedService}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatRelativeTime(incident.startedAt)}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Key Metrics Row
// ============================================================================

function MetricCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  sparkline,
  status,
  max,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'steady';
  trendLabel?: string;
  sparkline?: number[];
  status?: 'healthy' | 'warning' | 'critical';
  max?: number;
  icon?: React.ElementType;
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? 'text-[var(--color-success)]' : trend === 'down' ? 'text-[var(--color-error)]' : 'text-[var(--text-muted)]';
  const statusColor =
    status === 'critical' ? 'var(--color-error)' :
    status === 'warning' ? 'var(--color-warning)' :
    'var(--color-success)';

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 flex-1 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded-md bg-[var(--bg-tertiary)]">
              <Icon size={14} className="text-[var(--text-muted)]" />
            </div>
          )}
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
        </div>
        {status && (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span
            className="text-2xl font-semibold"
            style={{ color: status === 'critical' ? 'var(--color-error)' : status === 'warning' ? 'var(--color-warning)' : 'var(--text-primary)' }}
          >
            {typeof value === 'number' ? formatNumber(value) : value}
          </span>
          {unit && <span className="text-sm text-[var(--text-muted)]">{unit}</span>}
          {max && (
            <span className="text-xs text-[var(--text-muted)]">/ {formatNumber(max)}</span>
          )}
        </div>

        {sparkline && sparkline.length > 0 && (
          <Sparkline
            data={sparkline}
            color={statusColor}
            width={60}
            height={20}
          />
        )}
      </div>

      {trendLabel && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
          <TrendIcon size={12} />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function KeyMetricsRow() {
  const { data, isLoading } = useCommandCenterMetrics();

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 animate-pulse">
            <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded mb-2" />
            <div className="h-8 w-16 bg-[var(--bg-tertiary)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <MetricCard
        label="Active Users"
        value={data.activeUsers.value}
        trend={data.activeUsers.trend}
        trendLabel={data.activeUsers.trendLabel}
        sparkline={data.activeUsers.sparkline}
        icon={Users}
      />
      <MetricCard
        label="Requests/min"
        value={data.requestsPerMin.value}
        trend={data.requestsPerMin.trend}
        trendLabel={data.requestsPerMin.trendLabel}
        sparkline={data.requestsPerMin.sparkline}
        icon={Activity}
      />
      <MetricCard
        label="Avg Latency"
        value={formatLatency(data.avgLatency.value)}
        status={data.avgLatency.status}
        sparkline={data.avgLatency.sparkline}
        icon={Clock}
      />
      <MetricCard
        label="Error Rate"
        value={data.errorRate.value}
        unit="%"
        status={data.errorRate.status}
        sparkline={data.errorRate.sparkline}
        icon={AlertTriangle}
      />
      <MetricCard
        label="DB Connections"
        value={data.dbConnections.value}
        max={data.dbConnections.max}
        status={data.dbConnections.status}
        sparkline={data.dbConnections.sparkline}
        icon={Database}
      />
    </div>
  );
}

// ============================================================================
// Service Health Grid
// ============================================================================

function ServiceCard({ service, onExpand }: { service: CommandCenterService; onExpand: () => void }) {
  const statusConfig = SERVICE_STATUS_CONFIG[service.status];

  return (
    <button
      onClick={onExpand}
      className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 text-left hover:border-[var(--border-secondary)] transition-colors w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: statusConfig.color }}
          />
          <span className="text-sm font-medium text-[var(--text-primary)]">{service.name}</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
        >
          {service.status.toUpperCase()}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {service.metrics.invocationsPerMin !== undefined && (
            <>
              <span className="text-[var(--text-muted)]">Invocations</span>
              <span className="text-[var(--text-primary)] font-medium">{formatNumber(service.metrics.invocationsPerMin)}/min</span>
            </>
          )}
          {service.metrics.latency !== undefined && (
            <>
              <span className="text-[var(--text-muted)]">Latency</span>
              <span className="text-[var(--text-primary)] font-medium">{formatLatency(service.metrics.latency)}</span>
            </>
          )}
          {service.metrics.errorRate !== undefined && (
            <>
              <span className="text-[var(--text-muted)]">Error Rate</span>
              <span className="text-[var(--text-primary)] font-medium">{service.metrics.errorRate}</span>
            </>
          )}
          {service.metrics.connections !== undefined && (
            <>
              <span className="text-[var(--text-muted)]">Connections</span>
              <span className="text-[var(--text-primary)] font-medium">
                {service.metrics.connections}/{service.metrics.maxConnections}
              </span>
            </>
          )}
          {service.metrics.cpu !== undefined && (
            <>
              <span className="text-[var(--text-muted)]">CPU</span>
              <span className="text-[var(--text-primary)] font-medium">{service.metrics.cpu}%</span>
            </>
          )}
        </div>

        {service.sparkline && service.sparkline.length > 0 && (
          <Sparkline
            data={service.sparkline}
            color={statusConfig.color}
            width={50}
            height={20}
          />
        )}
      </div>
    </button>
  );
}

function ServicesHealthGrid() {
  const { data, isLoading } = useCommandCenterServices();
  const [expandedService, setExpandedService] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Service Health
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 animate-pulse">
              <div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded mb-3" />
              <div className="h-6 w-16 bg-[var(--bg-tertiary)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Service Health
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
            <span className="text-[var(--text-muted)]">{data.summary.healthy} Healthy</span>
          </span>
          {data.summary.degraded > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
              <span className="text-[var(--text-muted)]">{data.summary.degraded} Degraded</span>
            </span>
          )}
          {data.summary.down > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-error)]" />
              <span className="text-[var(--text-muted)]">{data.summary.down} Down</span>
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {data.services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onExpand={() => setExpandedService(service.id === expandedService ? null : service.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Lambda Functions Table
// ============================================================================

function LambdaRow({ lambda, isExpanded, onToggle }: { lambda: CommandCenterLambda; isExpanded: boolean; onToggle: () => void }) {
  const statusConfig = LAMBDA_STATUS_CONFIG[lambda.status];

  return (
    <>
      <tr
        className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            )}
            <span className="text-sm font-medium text-[var(--text-primary)]">{lambda.name}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
        </td>
        <td className="py-3 px-4 text-right">
          <span className="text-sm text-[var(--text-primary)]">{formatNumber(lambda.metrics.invocations)}</span>
          <span className="text-xs text-[var(--text-muted)] ml-1">({lambda.metrics.invocationsPerMin}/min)</span>
        </td>
        <td className="py-3 px-4 text-right">
          <span className="text-sm text-[var(--text-primary)]">{formatLatency(lambda.metrics.avgDuration)}</span>
        </td>
        <td className="py-3 px-4 text-right">
          <span
            className={`text-sm ${lambda.metrics.errors > 0 ? 'text-[var(--color-error)]' : 'text-[var(--text-primary)]'}`}
          >
            {lambda.metrics.errors}
          </span>
          <span className="text-xs text-[var(--text-muted)] ml-1">({lambda.metrics.errorRate})</span>
        </td>
        <td className="py-3 px-4">
          <Sparkline
            data={lambda.sparkline}
            color={statusConfig.color}
            width={60}
            height={16}
          />
        </td>
      </tr>
      {isExpanded && <LambdaDetailRow functionName={lambda.name} />}
    </>
  );
}

function LambdaDetailRow({ functionName }: { functionName: string }) {
  const { data: metricsData, isLoading: metricsLoading } = useCommandCenterLambdaMetrics(functionName);
  const { data: errorsData, isLoading: errorsLoading } = useCommandCenterLambdaErrors(functionName);

  return (
    <tr className="bg-[var(--bg-tertiary)]">
      <td colSpan={6} className="py-4 px-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Metrics */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              24h Metrics
            </h4>
            {metricsLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-full bg-[var(--bg-secondary)] rounded" />
                <div className="h-4 w-3/4 bg-[var(--bg-secondary)] rounded" />
              </div>
            ) : metricsData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Total Invocations</span>
                  <span className="text-[var(--text-primary)] font-medium">{formatNumber(metricsData.invocations.total)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Total Errors</span>
                  <span className={metricsData.errors.total > 0 ? 'text-[var(--color-error)]' : 'text-[var(--text-primary)]'}>
                    {formatNumber(metricsData.errors.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Avg Duration</span>
                  <span className="text-[var(--text-primary)] font-medium">{formatLatency(metricsData.duration.avg)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Max Duration</span>
                  <span className="text-[var(--text-primary)]">{formatLatency(metricsData.duration.max)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Throttles</span>
                  <span className="text-[var(--text-primary)]">{metricsData.throttles.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Max Concurrent</span>
                  <span className="text-[var(--text-primary)]">{metricsData.concurrentExecutions.max}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No metrics available</p>
            )}
          </div>

          {/* Recent Errors */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Recent Errors
            </h4>
            {errorsLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-full bg-[var(--bg-secondary)] rounded" />
                <div className="h-4 w-3/4 bg-[var(--bg-secondary)] rounded" />
              </div>
            ) : errorsData && errorsData.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {errorsData.slice(0, 5).map((error, idx) => (
                  <div key={idx} className="text-xs p-2 bg-[var(--bg-secondary)] rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[var(--text-muted)]">{formatRelativeTime(error.timestamp)}</span>
                    </div>
                    <p className="text-[var(--color-error)] font-mono truncate">{error.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-success)]">No recent errors</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function LambdaFunctionsTable() {
  const { data, isLoading } = useCommandCenterLambdas();
  const [expandedLambda, setExpandedLambda] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Lambda Functions
          </h2>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
          <div className="animate-pulse p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--bg-tertiary)] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Lambda Functions
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[var(--text-muted)]">{data.summary.total} functions</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
            <span className="text-[var(--text-muted)]">{data.summary.healthy} healthy</span>
          </span>
          {data.summary.errors > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-error)]" />
              <span className="text-[var(--text-muted)]">{data.summary.errors} errors</span>
            </span>
          )}
        </div>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
              <th className="text-left py-2 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Function</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
              <th className="text-right py-2 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Invocations (1h)</th>
              <th className="text-right py-2 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Avg Duration</th>
              <th className="text-right py-2 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Errors</th>
              <th className="py-2 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase w-20">Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.lambdas.map((lambda) => (
              <LambdaRow
                key={lambda.name}
                lambda={lambda}
                isExpanded={expandedLambda === lambda.name}
                onToggle={() => setExpandedLambda(expandedLambda === lambda.name ? null : lambda.name)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Error Feed
// ============================================================================

function ErrorFeed() {
  const { data, isLoading } = useCommandCenterErrors({ limit: 10 });
  const [expandedError, setExpandedError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Error Feed
          </h2>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 animate-pulse">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[var(--bg-tertiary)] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Error Feed
          </h2>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {data.stats.total} errors in last hour
        </span>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
        {data.errors.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-8 h-8 text-[var(--color-success)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-success)]">No recent errors</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-primary)] max-h-[400px] overflow-y-auto">
            {data.errors.map((error) => (
              <ErrorItem
                key={error.id}
                error={error}
                isExpanded={expandedError === error.id}
                onToggle={() => setExpandedError(expandedError === error.id ? null : error.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorItem({ error, isExpanded, onToggle }: { error: CommandCenterError; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="p-3 hover:bg-[var(--bg-tertiary)] transition-colors">
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-[var(--color-error-soft)] text-[var(--color-error)] rounded">
                {error.service}
              </span>
              <span className="text-xs text-[var(--text-muted)]">{error.errorType}</span>
            </div>
            <p className="text-sm text-[var(--text-primary)] truncate font-mono">
              {error.message}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              {formatRelativeTime(error.timestamp)}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 p-3 bg-[var(--bg-tertiary)] rounded text-xs font-mono">
          <div className="space-y-2">
            <div>
              <span className="text-[var(--text-muted)]">Full Message:</span>
              <pre className="mt-1 text-[var(--color-error)] whitespace-pre-wrap break-all">
                {error.fullMessage}
              </pre>
            </div>
            {error.requestId && (
              <div>
                <span className="text-[var(--text-muted)]">Request ID:</span>
                <span className="ml-2 text-[var(--text-primary)]">{error.requestId}</span>
              </div>
            )}
            {error.tenantId && (
              <div>
                <span className="text-[var(--text-muted)]">Tenant ID:</span>
                <span className="ml-2 text-[var(--text-primary)]">{error.tenantId}</span>
              </div>
            )}
            <div>
              <span className="text-[var(--text-muted)]">Log Stream:</span>
              <span className="ml-2 text-[var(--text-primary)]">{error.logStream}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Database Health Panel
// ============================================================================

function DatabaseHealthPanel() {
  const { data, isLoading } = useCommandCenterDatabase();

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Database Health
          </h2>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 animate-pulse">
          <div className="space-y-4">
            <div className="h-20 bg-[var(--bg-tertiary)] rounded" />
            <div className="h-20 bg-[var(--bg-tertiary)] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'critical': return 'var(--color-error)';
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-4 h-4 text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Database Health
        </h2>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 space-y-4">
        {/* Ops Database */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--color-brand)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Ops Database</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(data.ops.status) }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: getStatusColor(data.ops.status) }}
              >
                {data.ops.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-muted)]">Connections</span>
                <span className="text-xs text-[var(--text-primary)]">
                  {data.ops.connections} / {data.ops.maxConnections}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(data.ops.connections / data.ops.maxConnections) * 100}%`,
                    backgroundColor: data.ops.connections / data.ops.maxConnections > 0.8 ? 'var(--color-error)' : 'var(--color-brand)',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-muted)]">Storage</span>
                <span className="text-xs text-[var(--text-primary)]">
                  {data.ops.sizeGB.toFixed(1)} GB / {data.ops.maxSizeGB} GB
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-info)] rounded-full transition-all"
                  style={{ width: `${(data.ops.sizeGB / data.ops.maxSizeGB) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BarkBase Database */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--color-info)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">BarkBase Database</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(data.barkbase.status) }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: getStatusColor(data.barkbase.status) }}
              >
                {data.barkbase.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-muted)]">Connections</span>
                <span className="text-xs text-[var(--text-primary)]">
                  {data.barkbase.connections} / {data.barkbase.maxConnections}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(data.barkbase.connections / data.barkbase.maxConnections) * 100}%`,
                    backgroundColor: data.barkbase.connections / data.barkbase.maxConnections > 0.8 ? 'var(--color-error)' : 'var(--color-brand)',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-muted)]">Storage</span>
                <span className="text-xs text-[var(--text-primary)]">
                  {data.barkbase.sizeGB.toFixed(1)} GB / {data.barkbase.maxSizeGB} GB
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-info)] rounded-full transition-all"
                  style={{ width: `${(data.barkbase.sizeGB / data.barkbase.maxSizeGB) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Slow Queries */}
        {data.slowQueries && data.slowQueries.length > 0 && (
          <div className="pt-3 border-t border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-3 h-3 text-[var(--color-warning)]" />
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                Slow Queries
              </span>
            </div>
            <div className="space-y-2">
              {data.slowQueries.slice(0, 3).map((query, idx) => (
                <div key={idx} className="text-xs p-2 bg-[var(--bg-tertiary)] rounded">
                  <p className="font-mono text-[var(--text-primary)] truncate mb-1">{query.query}</p>
                  <div className="flex items-center gap-3 text-[var(--text-muted)]">
                    <span>Calls: {query.calls}</span>
                    <span>Avg: {query.avgTime.toFixed(2)}ms</span>
                    <span>Total: {query.totalTime.toFixed(2)}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// API Traffic Chart
// ============================================================================

function ApiTrafficChart() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const { data, isLoading } = useCommandCenterApiTraffic(timeRange);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            API Traffic
          </h2>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 animate-pulse">
          <div className="h-40 bg-[var(--bg-tertiary)] rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxRequests = Math.max(...data.timeSeries.requests, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            API Traffic
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {(['1h', '6h', '24h'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === range
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        {/* Summary Stats */}
        <div className="flex items-center gap-6 mb-4 text-xs">
          <div>
            <span className="text-[var(--text-muted)]">Total Requests: </span>
            <span className="text-[var(--text-primary)] font-medium">{formatNumber(data.summary.totalRequests)}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">4xx Errors: </span>
            <span className="text-[var(--color-warning)] font-medium">{formatNumber(data.summary.total4xxErrors)}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">5xx Errors: </span>
            <span className="text-[var(--color-error)] font-medium">{formatNumber(data.summary.total5xxErrors)}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">P95 Latency: </span>
            <span className="text-[var(--text-primary)] font-medium">{formatLatency(data.summary.avgLatencyP95)}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Error Rate: </span>
            <span className={`font-medium ${parseFloat(data.summary.errorRate) > 1 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
              {data.summary.errorRate}
            </span>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="h-32 flex items-end gap-0.5">
          {data.timeSeries.requests.map((value, idx) => {
            const height = (value / maxRequests) * 100;
            const errors = (data.timeSeries.errors4xx[idx] || 0) + (data.timeSeries.errors5xx[idx] || 0);
            const errorHeight = value > 0 ? (errors / value) * height : 0;

            return (
              <div
                key={idx}
                className="flex-1 relative group"
                style={{ minWidth: 2 }}
              >
                {/* Requests bar */}
                <div
                  className="w-full bg-[var(--color-brand)] rounded-t transition-all hover:bg-[var(--color-brand-hover)]"
                  style={{ height: `${height}%` }}
                />
                {/* Error overlay */}
                {errorHeight > 0 && (
                  <div
                    className="absolute bottom-0 w-full bg-[var(--color-error)] rounded-t"
                    style={{ height: `${errorHeight}%` }}
                  />
                )}
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                    <div className="text-[var(--text-primary)]">{formatNumber(value)} req</div>
                    {errors > 0 && (
                      <div className="text-[var(--color-error)]">{errors} errors</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Labels */}
        <div className="flex justify-between mt-2 text-[10px] text-[var(--text-muted)]">
          <span>{timeRange === '1h' ? '60m ago' : timeRange === '6h' ? '6h ago' : '24h ago'}</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tenant Activity Heatmap
// ============================================================================

function formatHourLabel(hourString: string): string {
  // Handle ISO timestamps like "2025-12-02T22:00:00.000Z"
  if (hourString.includes('T')) {
    const date = new Date(hourString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  }
  // Already formatted (e.g., "9am", "12pm")
  return hourString;
}

function formatHourTooltip(hourString: string): string {
  if (hourString.includes('T')) {
    const date = new Date(hourString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  return hourString;
}

function TenantActivityHeatmap() {
  const { data, isLoading } = useCommandCenterTenantsActivity();

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Tenant Activity
          </h2>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 animate-pulse">
          <div className="h-24 bg-[var(--bg-tertiary)] rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxUsers = Math.max(...data.hourlyActivity.map(h => h.activeUsers), 1);
  const totalHours = data.hourlyActivity.length;

  // Show labels every 4 hours (6 labels for 24 hours)
  const labelInterval = Math.max(1, Math.floor(totalHours / 6));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Tenant Activity (24h)
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-[var(--text-muted)]">Current: </span>
            <span className="text-[var(--text-primary)] font-medium">{data.currentActiveUsers} users</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Peak: </span>
            <span className="text-[var(--text-primary)] font-medium">
              {data.peakHour.users} @ {formatHourLabel(data.peakHour.hour)}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Active Tenants: </span>
            <span className="text-[var(--text-primary)] font-medium">{data.totalActiveTenants}</span>
          </div>
        </div>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 pb-8">
        {/* Heatmap */}
        <div className="flex items-end gap-0.5 h-12">
          {data.hourlyActivity.map((hour, idx) => {
            const intensity = hour.activeUsers / maxUsers;
            const isPeak = hour.hour === data.peakHour.hour;
            const showLabel = idx === 0 || idx === totalHours - 1 || idx % labelInterval === 0;

            return (
              <div
                key={idx}
                className="flex-1 relative group"
              >
                <div
                  className={`w-full rounded-sm transition-all cursor-pointer hover:opacity-80 ${isPeak ? 'ring-2 ring-[var(--color-brand)] ring-offset-1 ring-offset-[var(--bg-secondary)]' : ''}`}
                  style={{
                    height: '100%',
                    backgroundColor: `rgba(99, 102, 241, ${0.15 + intensity * 0.75})`,
                  }}
                />
                {/* X-axis label - only show at intervals */}
                {showLabel && (
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                    {idx === totalHours - 1 ? 'Now' : formatHourLabel(hour.hour)}
                  </span>
                )}
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-xs whitespace-nowrap shadow-lg">
                    <div className="text-[var(--text-primary)] font-medium">{hour.activeUsers} active users</div>
                    <div className="text-[var(--text-muted)]">{formatHourTooltip(hour.hour)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Command Center Component
// ============================================================================

export function CommandCenter() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Command Center</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time system health and monitoring dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
          Auto-refreshing every 30s
        </div>
      </div>

      {/* Global Health Banner */}
      <GlobalHealthBanner />

      {/* Key Metrics Row */}
      <KeyMetricsRow />

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="col-span-2 space-y-6">
          {/* Service Health Grid */}
          <ServicesHealthGrid />

          {/* Lambda Functions Table */}
          <LambdaFunctionsTable />

          {/* API Traffic Chart */}
          <ApiTrafficChart />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Error Feed */}
          <ErrorFeed />

          {/* Database Health */}
          <DatabaseHealthPanel />

          {/* Tenant Activity */}
          <TenantActivityHeatmap />
        </div>
      </div>
    </div>
  );
}
