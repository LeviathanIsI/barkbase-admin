// User and Auth types
export type AdminRole = 'super_admin' | 'engineer' | 'support_lead' | 'support';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Subscription status types
export type SubscriptionStatus = 'active' | 'trial' | 'churned' | 'suspended';

// Tenant and User types (from BarkBase)
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: SubscriptionStatus;
  createdAt: string;
  userCount?: number;
  petCount?: number;
  bookingCount?: number;
  plan?: string;
  trialEndsAt?: string;
  lastActivityAt?: string;      // Track when tenant was last active
  daysSinceActivity?: number;   // Computed days since last activity
}

export interface TenantUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt?: string;
}

export interface TenantStats {
  totalPets: number;
  totalBookings: number;
  totalRevenue: number | null;      // null = no Stripe connected, 0 = connected but zero revenue
  bookingsThisMonth: number;
  activeUsers: number;
  stripeConnected?: boolean;         // Whether Stripe is connected
}

export interface TenantActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userName?: string;
}

export interface TenantDetail extends Tenant {
  users: TenantUser[];
  stats?: TenantStats;
  recentActivity?: TenantActivity[];
  settings?: Record<string, unknown>;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  userId?: string;
  userEmail?: string;
}

// Search types
export interface SearchResult {
  type: 'tenant' | 'user';
  id: string;
  name: string;
  email?: string;
  role?: string;
  subdomain?: string;
  status?: string;
  plan?: string;
  userCount?: number;
  tenantName?: string;
  tenantId?: string;
  lastLogin?: string;
  createdAt?: string;
}

// Incident types - Enhanced Enterprise Version
export type IncidentSeverity = 'critical' | 'major' | 'minor' | 'low';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentUpdateType = 'created' | 'status_change' | 'update' | 'resolved' | 'reopened' | 'assigned' | 'severity_change';

export interface IncidentService {
  id: string;
  name: string;
}

export interface Incident {
  id: string;
  incidentNumber: number;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedService: string;
  impactScope: 'all' | 'specific';
  affectedCustomersCount: number;
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  customerMessage?: string;
  internalNotes?: string;
  startedAt: string;
  identifiedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  duration?: number; // minutes
  // Extended fields when getting single incident
  updates?: IncidentUpdate[];
  hasPostmortem?: boolean;
  postmortemStatus?: 'draft' | 'review' | 'published' | null;
  services?: IncidentService[];
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  updateType: IncidentUpdateType;
  message: string;
  previousStatus?: string;
  newStatus?: string;
  previousSeverity?: string;
  newSeverity?: string;
  isInternal: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface IncidentStats {
  total: number;
  active: number;
  resolvedThisMonth: number;
  mttrMinutes: number;
  p1sThisYear: number;
}

export interface IncidentAffectedCustomer {
  id: string;
  incidentId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug?: string;
  tenantPlan?: string;
  notified: boolean;
  notifiedAt?: string;
  notifiedBy?: string;
  ticketId?: string;
  notes?: string;
  createdAt: string;
}

export interface IncidentPostmortem {
  id: string | null;
  incidentId: string;
  incidentTitle?: string;
  summary: string;
  rootCause: string;
  impactDurationMinutes?: number;
  impactCustomersCount?: number;
  impactBookingsCount?: number;
  impactRevenueEstimate?: number;
  impactDescription: string;
  lessonsLearned: string;
  status: 'draft' | 'review' | 'published';
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  actionItems: PostmortemActionItem[];
}

export interface PostmortemActionItem {
  id: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  completedAt?: string;
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  affected_service: string;
  impact_scope?: 'all' | 'specific';
  customer_message?: string;
  internal_notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  status_message?: string;
  severity?: IncidentSeverity;
  affected_service?: string;
  impact_scope?: 'all' | 'specific';
  customer_message?: string;
  internal_notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
}

export interface CreateIncidentUpdateInput {
  message: string;
  is_internal?: boolean;
  new_status?: IncidentStatus;
}

export interface SavePostmortemInput {
  summary?: string;
  root_cause?: string;
  impact_duration_minutes?: number;
  impact_customers_count?: number;
  impact_bookings_count?: number;
  impact_revenue_estimate?: number;
  impact_description?: string;
  lessons_learned?: string;
}

export interface CreateActionItemInput {
  description: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface UpdateActionItemInput {
  description?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  completed?: boolean;
}

// Legacy compatibility
export interface IncidentWithUpdates extends Incident {
  updates: IncidentUpdate[];
}

// System Component types
export interface SystemComponent {
  name: string;
  displayName: string;
  description?: string;
  displayOrder: number;
}

// Status types
export type SystemStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';

export interface ComponentStatus {
  name: string;
  displayName: string;
  status: SystemStatus;
}

export interface StatusResponse {
  status: SystemStatus;
  components: ComponentStatus[];
  activeIncidents: Incident[];
}

export interface StatusBanner {
  active: boolean;
  severity?: IncidentSeverity;
  message?: string;
  url?: string;
}

// Health monitoring types (legacy)
export interface LambdaHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'error';
  invocations: number;
  errors: number;
  avgDuration: number;
  p99Duration: number;
}

export interface ApiHealth {
  requestsPerMinute: number;
  errorRate: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  statusCodes: {
    '2xx': number;
    '4xx': number;
    '5xx': number;
  };
}

export interface DatabaseHealth {
  connections: number;
  maxConnections: number;
  cpuUtilization: number;
  storageUsed: number;
  storageTotal: number;
  status: 'healthy' | 'degraded' | 'error';
}

export interface HealthAlert {
  id: string;
  name: string;
  state: 'ALARM' | 'OK' | 'INSUFFICIENT_DATA';
  metric: string;
  threshold: number;
  currentValue: number;
  updatedAt: string;
}

export interface HealthAlertsSummary {
  total: number;
  alarm: number;
  ok: number;
  insufficientData: number;
}

// =========================================================================
// Command Center Types (Enterprise System Health Dashboard)
// =========================================================================

export type CommandCenterStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
export type ServiceStatus = 'healthy' | 'degraded' | 'down';
export type LambdaStatus = 'active' | 'idle' | 'slow' | 'degraded' | 'error';

export interface CommandCenterOverview {
  status: CommandCenterStatus;
  statusMessage: string;
  uptime: string;
  activeIncidents: {
    id: string;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    startedAt: string;
    affectedService?: string;
  }[];
  alarms: {
    total: number;
    inAlarm: number;
  };
  lastUpdated: string;
}

export interface CommandCenterService {
  id: string;
  name: string;
  type: 'lambda' | 'rds' | 'api' | 's3';
  status: ServiceStatus;
  metrics: {
    invocationsPerMin?: number;
    latency?: number;
    errorRate?: string;
    errors?: number;
    connections?: number;
    maxConnections?: number;
    cpu?: number;
    storage?: number;
  };
  sparkline: number[];
}

export interface CommandCenterServicesResponse {
  services: CommandCenterService[];
  summary: {
    healthy: number;
    degraded: number;
    down: number;
  };
}

export interface MetricValue {
  value: number;
  trend?: 'up' | 'down' | 'steady';
  trendLabel?: string;
  sparkline?: number[];
  threshold?: {
    warning: number;
    critical: number;
  };
  max?: number;
  status?: 'healthy' | 'warning' | 'critical';
}

export interface CommandCenterMetrics {
  activeUsers: MetricValue;
  requestsPerMin: MetricValue;
  avgLatency: MetricValue;
  errorRate: MetricValue;
  dbConnections: MetricValue;
  lastUpdated: string;
}

export interface CommandCenterLambda {
  name: string;
  runtime: string;
  memorySize: number;
  timeout: number;
  lastModified: string;
  status: LambdaStatus;
  metrics: {
    invocations: number;
    invocationsPerMin: number;
    errors: number;
    errorRate: string;
    avgDuration: number;
    throttles: number;
  };
  sparkline: number[];
}

export interface CommandCenterLambdasResponse {
  lambdas: CommandCenterLambda[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    errors: number;
  };
}

export interface CommandCenterLambdaMetrics {
  functionName: string;
  period: string;
  invocations: {
    total: number;
    timeSeries: number[];
  };
  errors: {
    total: number;
    timeSeries: number[];
  };
  duration: {
    avg: number;
    max: number;
    timeSeries: number[];
  };
  throttles: {
    total: number;
  };
  concurrentExecutions: {
    max: number;
  };
}

export interface CommandCenterLambdaError {
  timestamp: string;
  message: string;
  logStreamName: string;
}

export interface CommandCenterDatabaseHealth {
  ops: {
    connections: number;
    maxConnections: number;
    sizeGB: number;
    maxSizeGB: number;
    status: 'healthy' | 'warning' | 'critical';
    connectionsByState: Record<string, number>;
  };
  barkbase: {
    connections: number;
    maxConnections: number;
    sizeGB: number;
    maxSizeGB: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  slowQueries: {
    query: string;
    calls: number;
    totalTime: number;
    avgTime: number;
  }[];
  lastUpdated: string;
}

export interface CommandCenterApiTraffic {
  timeRange: string;
  period: number;
  summary: {
    totalRequests: number;
    total4xxErrors: number;
    total5xxErrors: number;
    avgLatencyP95: number;
    errorRate: string;
  };
  timeSeries: {
    timestamps: string[];
    requests: number[];
    errors4xx: number[];
    errors5xx: number[];
    latencyP95: number[];
  };
  lastUpdated: string;
}

export interface CommandCenterError {
  id: string;
  timestamp: string;
  service: string;
  errorType: string;
  message: string;
  fullMessage: string;
  requestId?: string;
  tenantId?: string;
  logStream: string;
}

export interface CommandCenterErrorsResponse {
  errors: CommandCenterError[];
  stats: {
    total: number;
    byService: Record<string, number>;
  };
  lastUpdated: string;
}

export interface CommandCenterTenantsActivity {
  currentActiveUsers: number;
  totalActiveTenants: number;
  peakHour: {
    hour: string;
    users: number;
  };
  hourlyActivity: {
    hour: string;
    activeUsers: number;
  }[];
  lastUpdated: string;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogFilters {
  admins: { id: string; email: string }[];
  actions: string[];
  targetTypes: string[];
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: AuditLogPagination;
  filters: AuditLogFilters;
}

// Scheduled Maintenance types
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenanceType = 'planned' | 'emergency' | 'recurring';
export type MaintenanceImpactLevel = 'none' | 'minor' | 'moderate' | 'major';
export type MaintenanceOutcome = 'success' | 'issues' | 'partial' | 'aborted';
export type MaintenanceNotifyScope = 'all' | 'affected' | 'specific';
export type MaintenanceNotificationType = '48h_reminder' | '24h_reminder' | 'started' | 'update' | 'completed';

export interface MaintenanceRecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  day?: number; // 0-6 for weekly, 1-31 for monthly
  time: string; // HH:mm format
  durationMinutes: number;
  endsAfter?: number; // Number of occurrences
  endsOn?: string; // Date string
}

export interface MaintenanceNotificationConfig {
  notify48h: boolean;
  notify24h: boolean;
  onStart: boolean;
  onComplete: boolean;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description?: string;
  internalNotes?: string;

  // Timing
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  timezone: string;

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: MaintenanceRecurrenceRule;
  parentId?: string;
  nextOccurrence?: string;

  // Classification
  status: MaintenanceStatus;
  maintenanceType: MaintenanceType;
  impactLevel: MaintenanceImpactLevel;
  impactDescription?: string;
  affectedServices: string[];

  // Completion
  outcome?: MaintenanceOutcome;
  completionSummary?: string;
  completionNotes?: string;
  customerImpactOccurred: boolean;
  customerImpactDescription?: string;

  // Notifications
  notifyCustomers: boolean;
  notificationConfig: MaintenanceNotificationConfig;
  notifyScope: MaintenanceNotifyScope;

  // Metadata
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceUpdate {
  id: string;
  maintenanceId: string;
  message: string;
  updateType: 'started' | 'update' | 'extended' | 'completed' | 'cancelled';
  isPublic: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface MaintenanceNotification {
  id: string;
  maintenanceId: string;
  notificationType: MaintenanceNotificationType;
  sentAt: string;
  recipientCount: number;
  createdBy?: string;
}

export interface MaintenanceAffectedCustomer {
  id: string;
  maintenanceId: string;
  tenantId: string;
  tenantName?: string;
  notified: boolean;
  notifiedAt?: string;
}

export interface MaintenanceStats {
  upcoming: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  nextWindow?: {
    id: string;
    title: string;
    scheduledStart: string;
  };
}

export interface MaintenanceListResponse {
  maintenance: MaintenanceWindow[];
  stats: MaintenanceStats;
}

export interface CreateMaintenanceInput {
  title: string;
  description?: string;
  internalNotes?: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: MaintenanceRecurrenceRule;
  maintenanceType?: MaintenanceType;
  impactLevel?: MaintenanceImpactLevel;
  impactDescription?: string;
  affectedServices: string[];
  notifyCustomers?: boolean;
  notificationConfig?: MaintenanceNotificationConfig;
  notifyScope?: MaintenanceNotifyScope;
}

export interface UpdateMaintenanceInput {
  title?: string;
  description?: string;
  internalNotes?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: MaintenanceRecurrenceRule;
  maintenanceType?: MaintenanceType;
  impactLevel?: MaintenanceImpactLevel;
  impactDescription?: string;
  affectedServices?: string[];
  notifyCustomers?: boolean;
  notificationConfig?: MaintenanceNotificationConfig;
  notifyScope?: MaintenanceNotifyScope;
}

export interface StartMaintenanceInput {
  message?: string;
}

export interface CompleteMaintenanceInput {
  actualEnd?: string;
  outcome: MaintenanceOutcome;
  completionSummary: string;
  completionNotes?: string;
  customerImpactOccurred?: boolean;
  customerImpactDescription?: string;
  sendNotification?: boolean;
}

export interface ExtendMaintenanceInput {
  newEndTime: string;
  reason?: string;
}

export interface PostMaintenanceUpdateInput {
  message: string;
  isPublic?: boolean;
}

// Legacy alias for backwards compatibility
export type ScheduledMaintenance = MaintenanceWindow;

// =========================================================================
// Enterprise Broadcast / Announcement Types
// =========================================================================

export type BroadcastType = 'feature' | 'update' | 'tips' | 'policy' | 'beta' | 'promo' | 'general';
export type BroadcastStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
export type BroadcastAudienceType = 'all' | 'tier' | 'activity' | 'age' | 'specific' | 'segment';
export type BroadcastChannel = 'in_app' | 'email' | 'push';
export type BroadcastBannerStyle = 'info' | 'success' | 'warning' | 'promo';

export interface BroadcastAudienceConfig {
  tiers?: string[];                      // ['free', 'pro', 'enterprise']
  activity?: string;                      // 'active_7d', 'active_30d', 'inactive_30d'
  age?: string;                           // 'new_30d', 'established_1_6m', 'veteran_6m'
  tenantIds?: string[];                   // For specific targeting
  segment?: string;                       // Custom segment query
}

export interface Broadcast {
  id: string;
  title: string;
  broadcastType: BroadcastType;
  status: BroadcastStatus;

  // Audience
  audienceType: BroadcastAudienceType;
  audienceConfig: BroadcastAudienceConfig;
  estimatedRecipients: number;

  // Channels
  channels: BroadcastChannel[];

  // In-app banner content
  bannerStyle: BroadcastBannerStyle;
  bannerHeadline?: string;
  bannerBody?: string;
  bannerCtaText?: string;
  bannerCtaUrl?: string;
  bannerDismissable: boolean;

  // Email content
  emailSubject?: string;
  emailBody?: string;

  // Scheduling
  scheduledAt?: string;
  startedAt?: string;
  expiresAt?: string;
  endedAt?: string;

  // Metadata
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastRecipient {
  id: string;
  broadcastId: string;
  tenantId: string;
  tenantName?: string;

  // Email engagement
  emailSentAt?: string;
  emailOpenedAt?: string;
  emailClickedAt?: string;
  emailBouncedAt?: string;

  // Banner engagement
  bannerViewedAt?: string;
  bannerClickedAt?: string;
  bannerDismissedAt?: string;

  createdAt: string;
}

export interface BroadcastAnalyticsSnapshot {
  id: string;
  broadcastId: string;
  recordedAt: string;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  bannerViews: number;
  bannerClicks: number;
  bannerDismissals: number;
}

export interface BroadcastStats {
  totalSent: number;
  activeNow: number;
  scheduled: number;
  avgOpenRate: number;
}

export interface BroadcastAnalytics {
  broadcast: Broadcast;
  stats: {
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    emailsBounced: number;
    bannerViews: number;
    bannerClicks: number;
    bannerDismissals: number;
    openRate: number;
    clickRate: number;
    bannerClickRate: number;
    bannerDismissRate: number;
  };
  timeSeries: BroadcastAnalyticsSnapshot[];
  recipients: BroadcastRecipient[];
}

export interface BroadcastListResponse {
  broadcasts: Broadcast[];
  stats: BroadcastStats;
}

export interface AudienceEstimate {
  count: number;
  tenants: { id: string; name: string }[];
}

export interface CreateBroadcastInput {
  title: string;
  broadcastType: BroadcastType;

  // Audience
  audienceType?: BroadcastAudienceType;
  audienceConfig?: BroadcastAudienceConfig;

  // Channels
  channels: BroadcastChannel[];

  // Banner content
  bannerStyle?: BroadcastBannerStyle;
  bannerHeadline?: string;
  bannerBody?: string;
  bannerCtaText?: string;
  bannerCtaUrl?: string;
  bannerDismissable?: boolean;

  // Email content
  emailSubject?: string;
  emailBody?: string;

  // Scheduling
  scheduledAt?: string;
  expiresAt?: string;
}

export interface UpdateBroadcastInput {
  title?: string;
  broadcastType?: BroadcastType;

  // Audience
  audienceType?: BroadcastAudienceType;
  audienceConfig?: BroadcastAudienceConfig;

  // Channels
  channels?: BroadcastChannel[];

  // Banner content
  bannerStyle?: BroadcastBannerStyle;
  bannerHeadline?: string;
  bannerBody?: string;
  bannerCtaText?: string;
  bannerCtaUrl?: string;
  bannerDismissable?: boolean;

  // Email content
  emailSubject?: string;
  emailBody?: string;

  // Scheduling
  scheduledAt?: string;
  expiresAt?: string;
}

export interface SendBroadcastInput {
  sendNow?: boolean;
  scheduledAt?: string;
}

// Legacy compatibility
export type BroadcastTarget = 'all' | 'plan:free' | 'plan:pro' | 'plan:enterprise';
export type BroadcastLocation = 'app_banner' | 'email' | 'status_page';

// =========================================================================
// Enterprise Feature Flag Management Types
// =========================================================================

export type FeatureFlagCategory = 'core' | 'beta' | 'experiment' | 'tier_gate' | 'kill_switch' | 'ops';
export type FeatureFlagRolloutStrategy = 'all_or_nothing' | 'percentage' | 'tier' | 'specific' | 'custom';
export type FeatureFlagChangeType = 'created' | 'enabled' | 'disabled' | 'rollout_change' | 'targeting_change' | 'tenant_override' | 'override_removed' | 'archived' | 'updated';

export interface FeatureFlag {
  id: string;
  flagKey: string;
  displayName: string;
  description?: string;
  category: FeatureFlagCategory;

  // State
  enabled: boolean;

  // Rollout strategy
  rolloutStrategy: FeatureFlagRolloutStrategy;
  rolloutPercentage: number;
  rolloutSticky: boolean;
  allowedTiers?: string[];
  specificTenantIds?: string[];
  customRules?: Record<string, unknown>;

  // Options
  isKillSwitch: boolean;
  requireConfirmation: boolean;
  logChecks: boolean;

  // Environments
  environments: string[];

  // Counts (computed)
  enabledTenantCount?: number;
  totalTenantCount?: number;
  overrideCount?: number;

  // Metadata
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface FeatureFlagOverride {
  id: string;
  flagId: string;
  tenantId: string;
  tenantName?: string;
  enabled: boolean;
  reason?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagHistoryEntry {
  id: string;
  flagId: string;
  changeType: FeatureFlagChangeType;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface FeatureFlagAssignment {
  id: string;
  flagId: string;
  tenantId: string;
  assignedBucket: number;
  inRollout: boolean;
  assignedAt: string;
}

export interface FeatureFlagTenantStatus {
  tenantId: string;
  tenantName: string;
  tenantPlan?: string;
  enabled: boolean;
  source: 'override' | 'rollout' | 'tier' | 'default';
  overrideReason?: string;
  assignedBucket?: number;
  enabledSince?: string;
}

export interface FeatureFlagStats {
  total: number;
  enabled: number;
  inRollout: number;
  recentlyChanged: number;
}

export interface FeatureFlagListResponse {
  flags: FeatureFlag[];
  stats: FeatureFlagStats;
}

export interface CreateFeatureFlagInput {
  flagKey: string;
  displayName: string;
  description?: string;
  category?: FeatureFlagCategory;
  enabled?: boolean;
  rolloutStrategy?: FeatureFlagRolloutStrategy;
  rolloutPercentage?: number;
  rolloutSticky?: boolean;
  allowedTiers?: string[];
  specificTenantIds?: string[];
  customRules?: Record<string, unknown>;
  isKillSwitch?: boolean;
  requireConfirmation?: boolean;
  logChecks?: boolean;
  environments?: string[];
}

export interface UpdateFeatureFlagInput {
  displayName?: string;
  description?: string;
  category?: FeatureFlagCategory;
  enabled?: boolean;
  rolloutStrategy?: FeatureFlagRolloutStrategy;
  rolloutPercentage?: number;
  rolloutSticky?: boolean;
  allowedTiers?: string[];
  specificTenantIds?: string[];
  customRules?: Record<string, unknown>;
  isKillSwitch?: boolean;
  requireConfirmation?: boolean;
  logChecks?: boolean;
  environments?: string[];
}

export interface ToggleFeatureFlagInput {
  enabled: boolean;
  reason?: string;
}

export interface UpdateRolloutInput {
  percentage: number;
  reason?: string;
}

export interface CreateOverrideInput {
  enabled: boolean;
  reason?: string;
}

export interface KillFlagInput {
  reason?: string;
}

// Analytics types
export interface AnalyticsData {
  mrr: number;
  arr: number;
  revenueThisMonth: number;
  avgRevenuePerTenant: number;
  totalTenants: number;
  newSignups: number;
  churnRate: number;
  netGrowth: number;
  signups: { date: string; count: number }[];
  revenue: { date: string; revenue: number }[];
  planDistribution: { name: string; value: number; color: string }[];
  featureUsage: { name: string; usage: number }[];
  topTenants: {
    name: string;
    plan: string;
    bookings: number;
    users: number;
    mrr: number;
  }[];
}

// Settings types
export interface OpsSettings {
  opsCenterName: string;
  supportEmail: string;
  defaultTimezone: string;
  slackWebhookUrl: string;
  alertEmailRecipients: string;
  errorRateThreshold: number;
  responseTimeThreshold: number;
  sessionTimeout: number;
  impersonationTimeLimit: number;
  requireReasonForSensitiveActions: boolean;
  ipWhitelist: string;
  primaryColor: string;
}

// API Key types
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

// Database Explorer types
export interface DbTableSchema {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  constraint_type?: string;
}

export interface DbQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  createdAt: string;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Support Ticket types
export type TicketStatus = 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'billing' | 'technical' | 'account' | 'feature_request' | 'bug' | 'other';

export interface SupportTicket {
  id: string;
  ticket_number: number;
  portal_id: string;
  customer_name: string;
  customer_email: string;
  business_name?: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_at?: string;
  created_at: string;
  updated_at: string;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  source: string;
  message_count?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_id?: string;
  sender_name?: string;
  sender_email?: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  action: string;
  actor_id?: string;
  actor_name?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TicketStats {
  open_count: number;
  in_progress_count: number;
  pending_count: number;
  resolved_today: number;
  unassigned_count: number;
  avg_response_hours: number | null;
}

export interface CreateTicketInput {
  portal_id: string;
  customer_name: string;
  customer_email: string;
  business_name?: string;
  subject: string;
  description?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string | null;
  assigned_to_name?: string;
}

export interface PortalLookup {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  user_count: number;
  pet_count: number;
  owner_email?: string;
  owner_name?: string;
}

export interface ImpersonationToken {
  token: string;
  url: string;
  expires_in: number;
}

// Customer 360 types
export interface CustomerFlags {
  isVip: boolean;
  isAtRisk: boolean;
  isBetaTester: boolean;
  isEnterprise: boolean;
}

export interface CustomerOwner {
  id: string;
  email: string;
  name: string;
}

export interface FeatureUsage {
  feature: string;
  usagePercent: number;  // 0-100
  trend: 'up' | 'down' | 'stable';
  lastUsed?: string;
}

export interface CustomerStats {
  userCount: number;
  petCount: number;
  bookingCount: number;
  totalRevenue: number | null;
  activeUsers: number;
  ticketCount: number;
  stripeConnected?: boolean;
  featureUsage?: FeatureUsage[];  // Feature adoption data
}

export type CustomerAlertSeverity = 'critical' | 'warning' | 'info';
export type CustomerAlertType = 'payment_failed' | 'account_suspended' | 'trial_expiring' | 'low_engagement' | 'feature_available' | 'billing_issue' | 'usage_limit' | 'security';

export interface CustomerAlert {
  id: string;
  severity: CustomerAlertSeverity;
  type: CustomerAlertType;
  title: string;
  message: string;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface HealthScoreBreakdown {
  activity: number;      // 25% weight - Login frequency, sessions
  payment: number;       // 25% weight - Billing health, on-time payments
  engagement: number;    // 25% weight - Feature usage, bookings
  support: number;       // 25% weight - Ticket sentiment, resolution rate
}

export interface CustomerProfile {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  subscriptionStatus?: string;
  trialEndsAt?: string;
  createdAt: string;
  settings?: Record<string, unknown>;
  owner: CustomerOwner;
  stats: CustomerStats;
  healthScore: number;
  healthScoreBreakdown?: HealthScoreBreakdown;  // Breakdown by category
  lastActivity?: string;
  flags: CustomerFlags;
  recentActivity: CustomerActivity[];
  alerts?: CustomerAlert[];  // Active alerts for this customer
}

export interface CustomerActivity {
  id: string;
  action: string;
  description?: string;
  created_at: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CustomerBilling {
  plan: string;
  subscriptionStatus?: string;
  trialEndsAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  mrr: number;
  invoices: CustomerInvoice[];
}

export interface CustomerInvoice {
  id: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  noteType: 'general' | 'escalation' | 'billing' | 'technical' | 'onboarding';
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerNoteInput {
  content: string;
  note_type?: 'general' | 'escalation' | 'billing' | 'technical' | 'onboarding';
  is_pinned?: boolean;
}

export interface CustomerFlagUpdate {
  vip?: boolean | { value: boolean; notes?: string };
  at_risk?: boolean | { value: boolean; notes?: string };
  beta_tester?: boolean | { value: boolean; notes?: string };
  enterprise?: boolean | { value: boolean; notes?: string };
  churned?: boolean | { value: boolean; notes?: string };
}

// =========================================================================
// White-Label Types
// =========================================================================

export type WhiteLabelConfigStatus = 'not_started' | 'partial' | 'complete';
export type WhiteLabelDomainStatus = 'verified' | 'pending' | 'none';
export type WhiteLabelDomainSslStatus = 'pending' | 'provisioning' | 'active' | 'failed';

export interface WhiteLabelBranding {
  id?: string;
  tenantId: string;
  tenantName?: string;
  tenantSubdomain?: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customDomain: string | null;
  domainVerified: boolean;
  domainSslStatus: WhiteLabelDomainSslStatus;
  emailFromName: string | null;
  emailReplyTo: string | null;
  emailHeaderLogoUrl: string | null;
  emailFooterMarkdown: string | null;
  loginBackgroundUrl: string | null;
  loginWelcomeMessage: string | null;
  customCss: string | null;
  appIconUrl: string | null;
  splashScreenUrl: string | null;
  mobileThemeColors: {
    primary: string;
    secondary: string;
    background: string;
  } | null;
  configStatus?: WhiteLabelConfigStatus;
  completeness?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface WhiteLabelTenant {
  id: string;
  tenantId: string;
  name: string;
  subdomain: string;
  plan?: string;
  configStatus: WhiteLabelConfigStatus;
  domainStatus: WhiteLabelDomainStatus;
  customDomain?: string;
  completeness: number;
  updatedAt?: string;
}

export interface WhiteLabelStats {
  configuredTenants: number;
  customDomains: number;
  pendingVerification: number;
  recentlyUpdated: number;
}

export interface WhiteLabelHistoryEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: string;
}

export interface UpdateWhiteLabelInput {
  tenantName?: string;
  tenantSubdomain?: string;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  customDomain?: string | null;
  emailFromName?: string | null;
  emailReplyTo?: string | null;
  emailHeaderLogoUrl?: string | null;
  emailFooterMarkdown?: string | null;
  loginBackgroundUrl?: string | null;
  loginWelcomeMessage?: string | null;
  customCss?: string | null;
  appIconUrl?: string | null;
  splashScreenUrl?: string | null;
  mobileThemeColors?: {
    primary: string;
    secondary: string;
    background: string;
  } | null;
}

// =========================================================================
// Customer Health Types
// =========================================================================

export type HealthTrend = 'up' | 'down' | 'stable';
export type ChurnAlertType = 'score_drop' | 'no_login' | 'payment_failed' | 'feature_decline' | 'support_negative';
export type ChurnAlertSeverity = 'info' | 'warning' | 'critical';

export interface HealthScoreBreakdown {
  loginFrequency: number;
  featureAdoption: number;
  bookingTrend: number;
  supportSentiment: number;
  paymentHistory: number;
  userEngagement: number;
}

export interface TenantHealthScore {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSubdomain: string;
  plan: string;
  healthScore: number;
  previousScore?: number;
  trend: HealthTrend;
  trendChange: number;
  breakdown: HealthScoreBreakdown;
  daysSinceLogin: number;
  lastActivityAt?: string;
  riskFactors: string[];
  calculatedAt: string;
}

export interface HealthScoreStats {
  avgScore: number;
  atRisk: number;        // <50 - Critical
  needsAttention: number; // 50-69 - Orange
  good: number;           // 70-89 - Yellow/Gold
  excellent: number;      // 90+ - Green
  healthy: number;        // Combined good + excellent for backwards compatibility
  total: number;
}

export interface ChurnAlert {
  id: string;
  tenantId: string;
  tenantName: string;
  alertType: ChurnAlertType;
  message: string;
  severity: ChurnAlertSeverity;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

// =========================================================================
// SLA Types
// =========================================================================

export type SLAStatus = 'meeting' | 'at_risk' | 'breached';
export type ComponentStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';

export interface SLAComponent {
  name: string;
  displayName: string;
  currentMonth: number;
  ytd: number;
  target: number;
  status: ComponentStatus;
}

export interface SLAOverview {
  overallUptime: number;
  ytdUptime: number;
  slaTarget: number;
  status: SLAStatus;
  remainingMinutes: number;
  creditsOwed: number;
}

export interface DayUptime {
  date: string;
  uptime: number;
  incidents: number;
}

export interface SLAIncidentImpact {
  id: string;
  title: string;
  date: string;
  duration: number;
  affectedCustomers: number;
  slaImpact: number;
  creditAmount: number;
}

export interface SLAAlertSettings {
  thresholdPercent: number;
  notificationChannels: string[];
  isActive: boolean;
}

// =========================================================================
// Email Template Types
// =========================================================================

export type EmailBlockType = 'header' | 'text' | 'button' | 'image' | 'divider' | 'footer';

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  content: string;
  settings: Record<string, unknown>;
}

export interface EmailTemplate {
  id: string;
  templateKey: string;
  name: string;
  description: string;
  subject: string;
  previewText: string;
  blocks: EmailBlock[];
  tenantId: string | null;
  version: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface EmailTemplateVersion {
  id: string;
  version: number;
  createdBy: string;
  createdAt: string;
}

export interface UpdateEmailTemplateInput {
  subject?: string;
  previewText?: string;
  blocks?: EmailBlock[];
}

// =========================================================================
// Integration & Webhook Types
// =========================================================================

export type WebhookEvent =
  | 'booking.created'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'payment.received'
  | 'payment.failed'
  | 'user.signup'
  | 'user.updated'
  | 'pet.created'
  | 'tenant.created';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  headers: Record<string, string>;
  tenantId: string | null;
  isActive: boolean;
  lastDeliveryStatus?: number;
  lastDeliveryAt?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: WebhookEvent;
  payload: object;
  responseStatus: number;
  responseBody: string;
  attempts: number;
  deliveredAt?: string;
  createdAt: string;
}

export interface CreateWebhookInput {
  name: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  tenantId?: string;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  headers?: Record<string, string>;
  isActive?: boolean;
}

export type IntegrationCategory = 'communication' | 'automation' | 'finance' | 'calendar' | 'marketing';

export interface Integration {
  id: string;
  integrationKey: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  isConnected: boolean;
  connectedBy?: string;
  connectedAt?: string;
}

export interface IntegrationUsageStats {
  totalRequests24h: number;
  successRate: number;
  failedDeliveries: number;
  avgResponseTime: number;
}
