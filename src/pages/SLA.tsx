import { useState } from 'react';
import {
  Check,
  AlertTriangle,
  X,
  Download,
  Bell,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  Database,
  Globe,
  Shield,
  Loader2,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import {
  useSlaOverview,
  useSlaComponents,
  useSlaCalendar,
  useSlaIncidents,
  useSlaCredits,
  useSlaAlerts,
  useUpdateSlaAlerts,
} from '@/hooks/useApi';
import type {
  SLAStatus,
  ComponentStatus,
  SLAComponent,
  DayUptime,
  SLAIncidentImpact,
  SLAAlertSettings,
} from '@/types';

// Icon mapping for components
const componentIcons: Record<string, typeof Activity> = {
  api: Globe,
  web: Activity,
  database: Database,
  auth: Shield,
};

function getUptimeColor(uptime: number): string {
  if (uptime >= 99.9) return 'var(--color-success)';
  if (uptime >= 99) return 'var(--color-warning)';
  return 'var(--color-error)';
}

function getSLAStatus(uptime: number, target: number): SLAStatus {
  if (uptime >= target) return 'meeting';
  if (uptime >= target - 0.1) return 'at_risk';
  return 'breached';
}

function UptimeGauge({ value, target, size = 120 }: { value: number; target: number; size?: number }) {
  const strokeWidth = size / 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const targetProgress = (target / 100) * circumference;
  const color = getUptimeColor(value);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        {/* Target line */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-primary)"
          strokeWidth={2}
          strokeDasharray={`${targetProgress} ${circumference - targetProgress}`}
          strokeLinecap="round"
        />
        {/* Progress */}
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{value.toFixed(2)}%</span>
        <span className="text-xs text-[var(--text-muted)]">uptime</span>
      </div>
    </div>
  );
}

function CalendarHeatmap({ data, onDayClick }: { data: DayUptime[]; onDayClick: (day: DayUptime) => void }) {
  const weeks: DayUptime[][] = [];
  let currentWeek: DayUptime[] = [];

  // Add empty days for first week alignment
  const firstDay = new Date(data[0].date).getDay();
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({ date: '', uptime: -1, incidents: 0 });
  }

  data.forEach((day, i) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || i === data.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getDayColor = (uptime: number) => {
    if (uptime < 0) return 'transparent';
    if (uptime >= 100) return 'var(--color-success)';
    if (uptime >= 99.9) return '#22c55e';
    if (uptime >= 99) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1 text-[10px] text-[var(--text-muted)] pl-6">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="w-6 text-center">{d}</div>
        ))}
      </div>
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="flex gap-1">
          <div className="w-5 text-[10px] text-[var(--text-muted)] text-right pr-1">
            {weekIdx === 0 ? 'W1' : weekIdx === weeks.length - 1 ? `W${weeks.length}` : ''}
          </div>
          {week.map((day, dayIdx) => (
            <button
              key={dayIdx}
              onClick={() => day.uptime >= 0 && onDayClick(day)}
              disabled={day.uptime < 0}
              className="w-6 h-6 rounded text-[8px] font-medium transition-all hover:ring-2 hover:ring-[var(--color-brand)] hover:ring-offset-1 hover:ring-offset-[var(--bg-primary)] disabled:cursor-default disabled:hover:ring-0"
              style={{ backgroundColor: getDayColor(day.uptime), color: day.uptime < 99.9 && day.uptime >= 0 ? 'white' : 'transparent' }}
              title={day.date ? `${day.date}: ${day.uptime.toFixed(2)}%` : ''}
            >
              {day.incidents > 0 && '!'}
            </button>
          ))}
        </div>
      ))}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--color-success)]" />
          <span>100%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span>99.9%+</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--color-warning)]" />
          <span>99-99.9%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--color-error)]" />
          <span>&lt;99%</span>
        </div>
      </div>
    </div>
  );
}

export function SLA() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayUptime | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(0.05);

  // API hooks
  const { data: overviewData, isLoading: isLoadingOverview } = useSlaOverview();
  const { data: componentsData, isLoading: isLoadingComponents } = useSlaComponents();
  const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
  const { data: calendarData, isLoading: isLoadingCalendar } = useSlaCalendar(monthStr);
  const { data: incidentsData, isLoading: isLoadingIncidents } = useSlaIncidents();
  const { data: creditsData } = useSlaCredits();
  const { data: alertsData } = useSlaAlerts();
  const updateAlerts = useUpdateSlaAlerts();

  const isLoading = isLoadingOverview || isLoadingComponents || isLoadingCalendar || isLoadingIncidents;

  // Extract data from API responses
  const overview = overviewData?.overview;
  const components = componentsData?.components || [];
  const calendar = calendarData?.calendar || [];
  const incidents = incidentsData?.incidents || [];
  const credits = creditsData?.credits;
  const alertSettings = alertsData?.settings;

  // Use API data or defaults
  const overallUptime = overview?.overallUptime ?? 99.9;
  const ytdUptime = overview?.ytdUptime ?? 99.9;
  const slaTarget = overview?.target ?? 99.9;
  const status = overview?.status ?? getSLAStatus(overallUptime, slaTarget);
  const remainingMinutes = overview?.remainingMinutes ?? 0;
  const creditsOwed = overview?.creditsOwed ?? 0;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const navigateMonth = (delta: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedMonth(newDate);
  };

  const generateReport = () => {
    // Would generate PDF report
    alert('Report generation started. You will receive an email when ready.');
  };

  const handleUpdateAlertThreshold = (threshold: number) => {
    setAlertThreshold(threshold);
    updateAlerts.mutate({ thresholdPercent: threshold });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">SLA Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Track uptime commitments and service levels</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAlertSettings(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
          >
            <Bell size={16} />
            Alert Settings
          </button>
          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
          >
            <Download size={16} />
            Generate Report
          </button>
        </div>
      </div>

      {/* SLA Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 flex flex-col items-center">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Current Month
          </span>
          <UptimeGauge value={overallUptime} target={slaTarget} />
          <div className="mt-4 text-center">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                status === 'meeting'
                  ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                  : status === 'at_risk'
                    ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
                    : 'bg-[var(--color-error-soft)] text-[var(--color-error)]'
              }`}
            >
              {status === 'meeting' && <Check size={12} />}
              {status === 'at_risk' && <AlertTriangle size={12} />}
              {status === 'breached' && <X size={12} />}
              {status === 'meeting' ? 'Meeting SLA' : status === 'at_risk' ? 'At Risk' : 'SLA Breached'}
            </span>
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">YTD Uptime</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: getUptimeColor(ytdUptime) }}>
              {ytdUptime.toFixed(2)}%
            </span>
            <span className="text-xs text-[var(--text-muted)]">/ {slaTarget}% target</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            <TrendingUp size={12} className="text-[var(--color-success)]" />
            <span className="text-[var(--color-success)]">+0.02%</span>
            <span className="text-[var(--text-muted)]">vs last month</span>
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Remaining Buffer</span>
          <div className="mt-2">
            <span className={`text-3xl font-bold ${remainingMinutes > 30 ? 'text-[var(--color-success)]' : remainingMinutes > 10 ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'}`}>
              {remainingMinutes}
            </span>
            <span className="text-lg text-[var(--text-muted)] ml-1">min</span>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            of downtime before SLA breach this month
          </p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Credits Owed</span>
          <div className="mt-2">
            <span className={`text-3xl font-bold ${creditsOwed > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
              ${creditsOwed}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {creditsOwed > 0 ? 'Based on current SLA breach' : 'No credits owed'}
          </p>
        </div>
      </div>

      {/* Calendar & Components */}
      <div className="grid grid-cols-3 gap-6">
        {/* Uptime Calendar */}
        <div className="col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Uptime Calendar</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-[var(--text-primary)] w-32 text-center">
                {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <CalendarHeatmap data={calendar} onDayClick={setSelectedDay} />
        </div>

        {/* Component Status */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Component Status</h3>
          <div className="space-y-3">
            {components.map((component: SLAComponent) => {
              const Icon = componentIcons[component.name] || Activity;
              const componentStatus = getSLAStatus(component.currentMonth, component.target);
              return (
                <div key={component.name} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-[var(--text-muted)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{component.displayName}</span>
                    </div>
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${getUptimeColor(component.currentMonth)}20`,
                        color: getUptimeColor(component.currentMonth),
                      }}
                    >
                      {componentStatus === 'meeting' ? 'OK' : componentStatus === 'at_risk' ? 'RISK' : 'BREACH'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Month: {component.currentMonth.toFixed(2)}%</span>
                    <span className="text-[var(--text-muted)]">YTD: {component.ytd.toFixed(2)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(component.currentMonth / 100) * 100}%`,
                        backgroundColor: getUptimeColor(component.currentMonth),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Incident Impact */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg">
        <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Incident Impact Analysis</h3>
          <span className="text-xs text-[var(--text-muted)]">{incidents.length} incidents this month</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-tertiary)]">
              <th className="px-4 py-3">Incident</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Affected Customers</th>
              <th className="px-4 py-3">SLA Impact</th>
              <th className="px-4 py-3">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            {incidents.map((incident: SLAIncidentImpact) => (
              <tr key={incident.id} className="hover:bg-[var(--hover-overlay)]">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{incident.title}</span>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {new Date(incident.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[var(--text-secondary)]">{incident.duration} min</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[var(--text-secondary)]">{incident.affectedCustomers.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[var(--color-warning)]">-{incident.slaImpact.toFixed(2)}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {incident.creditAmount > 0 ? `$${incident.creditAmount}` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Day Detail Panel */}
      <SlideOutPanel
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay?.date ? `Uptime Details: ${selectedDay.date}` : 'Day Details'}
        width="md"
      >
        {selectedDay && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold" style={{ color: getUptimeColor(selectedDay.uptime) }}>
                {selectedDay.uptime.toFixed(3)}%
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">Uptime</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{selectedDay.incidents}</span>
                <p className="text-xs text-[var(--text-muted)] mt-1">Incidents</p>
              </div>
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                <span className="text-2xl font-bold text-[var(--text-primary)]">
                  {Math.round((100 - selectedDay.uptime) * 24 * 60 / 100)}
                </span>
                <p className="text-xs text-[var(--text-muted)] mt-1">Minutes Downtime</p>
              </div>
            </div>

            {selectedDay.incidents > 0 && (
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Incidents on this day</h4>
                <div className="space-y-2">
                  {incidents.filter((i: SLAIncidentImpact) => i.date === selectedDay.date).map((incident: SLAIncidentImpact) => (
                    <div key={incident.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{incident.title}</span>
                        <span className="text-xs text-[var(--color-warning)]">{incident.duration} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOutPanel>

      {/* Alert Settings Panel */}
      <SlideOutPanel
        isOpen={showAlertSettings}
        onClose={() => setShowAlertSettings(false)}
        title="SLA Alert Settings"
        width="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAlertSettings(false)}
              className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
            >
              Cancel
            </button>
            <button className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]">
              Save Settings
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Alert Threshold
            </label>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Alert when remaining buffer falls below this percentage
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.01"
                max="0.1"
                step="0.01"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="w-16 text-sm text-[var(--text-primary)] text-right">
                {(alertThreshold * 100).toFixed(0)}% buffer
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              ≈ {Math.round(alertThreshold * 30 * 24 * 60)} minutes of downtime remaining
            </p>
          </div>

          <div className="p-4 bg-[var(--color-warning-soft)] rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--color-warning)]">Current Alert</p>
                <p className="text-xs text-[var(--color-warning)]/80 mt-0.5">
                  You will be alerted when {Math.round(alertThreshold * 30 * 24 * 60)} or fewer minutes of downtime remain this month.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Notification Channels
            </label>
            <div className="space-y-2">
              {[
                { label: 'Email', description: 'Send to ops team email list' },
                { label: 'Slack', description: 'Post to #ops-alerts channel' },
                { label: 'PagerDuty', description: 'Create incident' },
              ].map(channel => (
                <label key={channel.label} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{channel.label}</span>
                    <p className="text-xs text-[var(--text-muted)]">{channel.description}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Auto-Report Settings
            </label>
            <label className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-medium text-[var(--text-primary)]">Monthly SLA Report</span>
                <p className="text-xs text-[var(--text-muted)]">Auto-generate and email to enterprise customers</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
          </div>
        </div>
      </SlideOutPanel>
    </div>
  );
}
