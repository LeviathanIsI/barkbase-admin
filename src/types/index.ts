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

// Tenant and User types (from BarkBase)
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  createdAt: string;
  userCount?: number;
  petCount?: number;
  bookingCount?: number;
  plan?: string;
  trialEndsAt?: string;
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
  totalRevenue: number;
  bookingsThisMonth: number;
  activeUsers: number;
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

// Incident types
export type IncidentSeverity = 'degraded' | 'partial_outage' | 'major_outage';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  customerMessage: string;
  internalNotes?: string;
  components: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  createdById: string;
  createdByEmail: string;
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  message: string;
  status: IncidentStatus;
  createdAt: string;
  createdById: string;
  createdByEmail: string;
}

export interface IncidentWithUpdates extends Incident {
  updates: IncidentUpdate[];
}

export interface CreateIncidentInput {
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  customerMessage: string;
  internalNotes?: string;
  components: string[];
}

export interface UpdateIncidentInput {
  status?: IncidentStatus;
  customerMessage?: string;
  internalNotes?: string;
  resolvedAt?: string;
}

export interface CreateIncidentUpdateInput {
  message: string;
  status: IncidentStatus;
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

// Health monitoring types
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

export interface ScheduledMaintenance {
  id: string;
  title: string;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  affectedComponents: string[];
  status: MaintenanceStatus;
  notifyCustomers: boolean;
  createdById: string;
  createdByEmail: string;
  createdAt: string;
}

export interface CreateMaintenanceInput {
  title: string;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  affectedComponents: string[];
  notifyCustomers?: boolean;
}

export interface UpdateMaintenanceInput {
  title?: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  affectedComponents?: string[];
  status?: MaintenanceStatus;
  notifyCustomers?: boolean;
}

// Broadcast types
export type BroadcastType = 'info' | 'warning' | 'critical';
export type BroadcastTarget = 'all' | 'plan:free' | 'plan:pro' | 'plan:enterprise';
export type BroadcastLocation = 'app_banner' | 'email' | 'status_page';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: BroadcastType;
  target: BroadcastTarget;
  displayLocations: BroadcastLocation[];
  startsAt: string;
  expiresAt?: string;
  isActive: boolean;
  createdById: string;
  createdByEmail: string;
  createdAt: string;
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  type: BroadcastType;
  target?: BroadcastTarget;
  displayLocations: BroadcastLocation[];
  startsAt: string;
  expiresAt?: string;
}

export interface UpdateBroadcastInput {
  title?: string;
  message?: string;
  type?: BroadcastType;
  target?: BroadcastTarget;
  displayLocations?: BroadcastLocation[];
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
}

// Feature Flag types
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
  overrideCount?: number;
}

export interface FeatureFlagOverride {
  id: string;
  flagId: string;
  tenantId: string;
  tenantName?: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
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
