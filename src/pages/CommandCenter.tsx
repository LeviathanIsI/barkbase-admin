import { Loader2, Activity, Database, AlertTriangle, CheckCircle, Server, Gauge, Clock, Zap } from 'lucide-react';
import { useHealthLambdas, useHealthApi, useHealthDatabase, useHealthAlerts } from '@/hooks/useApi';
import { Link } from 'react-router-dom';

export function CommandCenter() {
  const { data: lambdasData, isLoading: lambdasLoading } = useHealthLambdas();
  const { data: apiData, isLoading: apiLoading } = useHealthApi();
  const { data: dbData, isLoading: dbLoading } = useHealthDatabase();
  const { data: alertsData, isLoading: alertsLoading } = useHealthAlerts();

  const isLoading = lambdasLoading || apiLoading || dbLoading || alertsLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-[var(--color-success)]';
      case 'degraded':
        return 'text-[var(--color-warning)]';
      case 'error':
        return 'text-[var(--color-error)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-[var(--color-success)]';
      case 'degraded':
        return 'bg-[var(--color-warning)]';
      case 'error':
        return 'bg-[var(--color-error)]';
      default:
        return 'bg-[var(--text-muted)]';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Command Center</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time system health and monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
          Auto-refreshing every 30s
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Alerts Section */}
          {alertsData && alertsData.alerts.length > 0 && (
            <div className="bg-[var(--color-error-soft)] border border-[var(--color-error)]/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
                <h2 className="text-base font-semibold text-[var(--color-error)]">
                  Active Alerts ({alertsData.alerts.length})
                </h2>
              </div>
              <div className="space-y-2">
                {alertsData.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-md"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{alert.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {alert.metric}: {alert.currentValue} (threshold: {alert.threshold})
                      </p>
                    </div>
                    <Link
                      to="/incidents"
                      className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-error)] rounded-md hover:bg-[var(--color-error)]/90"
                    >
                      Declare Incident
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert Summary */}
          {alertsData && (
            <div className="flex gap-4">
              <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Total Alarms</span>
                  <span className="text-2xl font-semibold text-[var(--text-primary)]">{alertsData.summary.total}</span>
                </div>
              </div>
              <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">In Alarm</span>
                  <span className={`text-2xl font-semibold ${alertsData.summary.alarm > 0 ? 'text-[var(--color-error)]' : 'text-[var(--text-primary)]'}`}>
                    {alertsData.summary.alarm}
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">OK</span>
                  <span className="text-2xl font-semibold text-[var(--color-success)]">{alertsData.summary.ok}</span>
                </div>
              </div>
              <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">No Data</span>
                  <span className="text-2xl font-semibold text-[var(--text-muted)]">{alertsData.summary.insufficientData}</span>
                </div>
              </div>
            </div>
          )}

          {/* Lambda Functions Grid */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                Lambda Functions
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {lambdasData?.lambdas.map((lambda) => (
                <div
                  key={lambda.name}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${getStatusBg(lambda.status)}`} />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{lambda.name}</span>
                    </div>
                    <span className={`text-xs font-medium ${getStatusColor(lambda.status)}`}>
                      {lambda.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Invocations (1h)</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {lambda.invocations.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Errors</p>
                      <p className={`text-lg font-semibold ${lambda.errors > 0 ? 'text-[var(--color-error)]' : 'text-[var(--text-primary)]'}`}>
                        {lambda.errors}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Avg Duration</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{lambda.avgDuration}ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">P99 Duration</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{lambda.p99Duration}ms</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Gateway Stats */}
          {apiData && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  API Gateway
                </h2>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Requests/min</span>
                  </div>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">
                    {apiData.requestsPerMinute}
                  </p>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Error Rate</span>
                  </div>
                  <p className={`text-2xl font-semibold ${apiData.errorRate > 0.05 ? 'text-[var(--color-error)]' : apiData.errorRate > 0.01 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                    {(apiData.errorRate * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Latency (p50/p95/p99)</span>
                  </div>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {apiData.latency.p50} / {apiData.latency.p95} / {apiData.latency.p99}ms
                  </p>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Status Codes</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--color-success)]">2xx: {apiData.statusCodes['2xx']}%</span>
                    <span className="text-[var(--color-warning)]">4xx: {apiData.statusCodes['4xx']}%</span>
                    <span className="text-[var(--color-error)]">5xx: {apiData.statusCodes['5xx']}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Database Health */}
          {dbData && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-[var(--text-muted)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Databases
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Ops Database */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-[var(--color-brand)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">Ops Database</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getStatusBg(dbData.ops.status)}`} />
                      <span className={`text-xs font-medium ${getStatusColor(dbData.ops.status)}`}>
                        {dbData.ops.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Connections</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {dbData.ops.connections} / {dbData.ops.maxConnections}
                      </p>
                      <div className="mt-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-brand)] rounded-full"
                          style={{ width: `${(dbData.ops.connections / dbData.ops.maxConnections) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">CPU Utilization</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {dbData.ops.cpuUtilization}%
                      </p>
                      <div className="mt-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${dbData.ops.cpuUtilization > 80 ? 'bg-[var(--color-error)]' : dbData.ops.cpuUtilization > 60 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'}`}
                          style={{ width: `${dbData.ops.cpuUtilization}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-[var(--text-muted)]">Storage</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {dbData.ops.storageUsed} GB / {dbData.ops.storageTotal} GB
                      </p>
                      <div className="mt-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-info)] rounded-full"
                          style={{ width: `${(dbData.ops.storageUsed / dbData.ops.storageTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BarkBase Database */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-[var(--color-info)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">BarkBase Database</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getStatusBg(dbData.barkbase.status)}`} />
                      <span className={`text-xs font-medium ${getStatusColor(dbData.barkbase.status)}`}>
                        {dbData.barkbase.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Connections</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {dbData.barkbase.connections} / {dbData.barkbase.maxConnections}
                      </p>
                      <div className="mt-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-brand)] rounded-full"
                          style={{ width: `${(dbData.barkbase.connections / dbData.barkbase.maxConnections) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">CPU Utilization</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {dbData.barkbase.cpuUtilization}%
                      </p>
                      <div className="mt-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${dbData.barkbase.cpuUtilization > 80 ? 'bg-[var(--color-error)]' : dbData.barkbase.cpuUtilization > 60 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'}`}
                          style={{ width: `${dbData.barkbase.cpuUtilization}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-[var(--text-muted)]">Storage</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {dbData.barkbase.storageUsed} GB / {dbData.barkbase.storageTotal} GB
                      </p>
                      <div className="mt-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-info)] rounded-full"
                          style={{ width: `${(dbData.barkbase.storageUsed / dbData.barkbase.storageTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
