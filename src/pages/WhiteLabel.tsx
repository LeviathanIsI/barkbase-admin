import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2,
  Save,
  Palette,
  Globe,
  Mail,
  LogIn,
  Smartphone,
  Upload,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw,
  Eye,
  ArrowLeft,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Sparkles,
  ChevronRight,
  Search,
  Settings,
  Maximize2,
} from 'lucide-react';
import {
  useWhiteLabelStats,
  useWhiteLabelTenants,
  useWhiteLabelBranding,
  useUpdateWhiteLabelBranding,
  useWhiteLabelHistory,
  useVerifyWhiteLabelDomain,
} from '@/hooks/useApi';
import type {
  WhiteLabelBranding,
  WhiteLabelTenant,
  WhiteLabelHistoryEntry,
  WhiteLabelConfigStatus,
  WhiteLabelDomainStatus,
} from '@/types';

// =============================================================================
// Types (local aliases for convenience)
// =============================================================================

type TabType = 'branding' | 'domain' | 'email' | 'login' | 'mobile' | 'history';

// =============================================================================
// Constants & Config
// =============================================================================

const TABS: { id: TabType; label: string; icon: typeof Palette }[] = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'domain', label: 'Custom Domain', icon: Globe },
  { id: 'email', label: 'Email Branding', icon: Mail },
  { id: 'login', label: 'Login Page', icon: LogIn },
  { id: 'mobile', label: 'Mobile App', icon: Smartphone },
  { id: 'history', label: 'History', icon: History },
];

const DEFAULT_BRANDING: WhiteLabelBranding = {
  tenantId: '',
  logoLightUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  primaryColor: '#3b82f6',
  secondaryColor: '#64748b',
  accentColor: '#8b5cf6',
  customDomain: null,
  domainVerified: false,
  domainSslStatus: 'pending',
  emailFromName: null,
  emailReplyTo: null,
  emailHeaderLogoUrl: null,
  emailFooterMarkdown: null,
  loginBackgroundUrl: null,
  loginWelcomeMessage: null,
  customCss: null,
  appIconUrl: null,
  splashScreenUrl: null,
  mobileThemeColors: null,
};

const BRAND_PRESETS = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple - just the essentials',
    colors: { primary: '#3b82f6', secondary: '#64748b', accent: '#8b5cf6' },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate and trustworthy',
    colors: { primary: '#1e40af', secondary: '#334155', accent: '#0ea5e9' },
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Bold and energetic',
    colors: { primary: '#dc2626', secondary: '#f97316', accent: '#facc15' },
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Earthy and organic tones',
    colors: { primary: '#059669', secondary: '#84cc16', accent: '#14b8a6' },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Dark theme optimized',
    colors: { primary: '#6366f1', secondary: '#475569', accent: '#a855f7' },
  },
];

// =============================================================================
// Helper Components
// =============================================================================

function StatsCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number;
  icon: typeof Building2;
  color?: string;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
        <Icon size={14} style={{ color: color || 'var(--text-muted)' }} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-semibold" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function ConfigStatusBadge({ status }: { status: WhiteLabelConfigStatus }) {
  const config = {
    complete: { color: 'text-green-400 bg-green-400/10', label: 'Complete', icon: CheckCircle2 },
    partial: { color: 'text-amber-400 bg-amber-400/10', label: 'Partial', icon: AlertCircle },
    not_started: { color: 'text-gray-400 bg-gray-400/10', label: 'Not Started', icon: Settings },
  }[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function DomainStatusBadge({ status, domain }: { status: WhiteLabelDomainStatus; domain?: string }) {
  const config = {
    verified: { color: 'text-green-400', icon: Check, label: 'Verified' },
    pending: { color: 'text-amber-400', icon: Clock, label: 'Pending' },
    none: { color: 'text-gray-500', icon: Globe, label: 'Not Set' },
  }[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon size={12} className={config.color} />
      <span className="text-[var(--text-muted)]">
        {domain || config.label}
      </span>
    </div>
  );
}

function CompletenessBar({ percentage }: { percentage: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage === 100 ? 'bg-green-500' : percentage > 50 ? 'bg-amber-500' : 'bg-gray-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-muted)] w-8">{percentage}%</span>
    </div>
  );
}

function TenantCard({ tenant, onClick }: { tenant: WhiteLabelTenant; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 hover:border-[var(--color-brand)] transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
            <Building2 size={20} className="text-[var(--text-muted)]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">{tenant.name}</h3>
            <span className="text-xs text-[var(--text-muted)]">{tenant.subdomain}.barkbase.app</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-[var(--text-muted)]" />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <ConfigStatusBadge status={tenant.configStatus} />
        {tenant.plan === 'enterprise' && (
          <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-medium">
            ENTERPRISE
          </span>
        )}
      </div>

      <div className="space-y-2">
        <DomainStatusBadge status={tenant.domainStatus} domain={tenant.customDomain} />
        <CompletenessBar percentage={tenant.completeness} />
      </div>

      {tenant.updatedAt && (
        <div className="text-[10px] text-[var(--text-muted)] mt-3">
          Updated {new Date(tenant.updatedAt).toLocaleDateString()}
        </div>
      )}
    </button>
  );
}

function ColorPreview({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  return (
    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
      <p className="text-xs font-medium text-[var(--text-muted)] mb-3">UI Preview</p>
      <div className="space-y-3">
        <div className="h-8 rounded" style={{ backgroundColor: primary }}>
          <div className="flex items-center h-full px-3">
            <div className="w-4 h-4 bg-white/30 rounded" />
            <div className="ml-auto flex gap-2">
              <div className="w-12 h-3 bg-white/20 rounded" />
              <div className="w-12 h-3 bg-white/20 rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-20 bg-[var(--bg-secondary)] rounded p-2">
            <div className="w-16 h-2 rounded mb-2" style={{ backgroundColor: secondary }} />
            <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded mb-1" />
            <div className="w-3/4 h-2 bg-[var(--bg-tertiary)] rounded" />
          </div>
          <div className="w-20 h-20 rounded p-2" style={{ backgroundColor: `${accent}20` }}>
            <div className="w-full h-3 rounded mb-2" style={{ backgroundColor: accent }} />
            <div className="w-12 h-2 bg-[var(--bg-tertiary)] rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded text-xs text-white" style={{ backgroundColor: primary }}>
            Primary
          </button>
          <button className="px-3 py-1 rounded text-xs text-white" style={{ backgroundColor: secondary }}>
            Secondary
          </button>
          <button className="px-3 py-1 rounded text-xs text-white" style={{ backgroundColor: accent }}>
            Accent
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageUploader({
  label,
  currentUrl,
  onUpload,
  accept = 'image/*',
  hint
}: {
  label: string;
  currentUrl: string | null;
  onUpload: (url: string) => void;
  accept?: string;
  hint?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onUpload('/placeholder-image.png');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragging
            ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]'
            : 'border-[var(--border-primary)] hover:border-[var(--text-muted)]'
        }`}
      >
        {currentUrl ? (
          <div className="flex items-center gap-3">
            <img src={currentUrl} alt={label} className="w-12 h-12 object-contain rounded" />
            <div className="flex-1 text-left">
              <p className="text-sm text-[var(--text-primary)]">Image uploaded</p>
              <button className="text-xs text-[var(--color-brand)] hover:underline">Replace</button>
            </div>
            <button
              onClick={() => onUpload('')}
              className="p-1 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-secondary)]">Drag & drop or click to upload</p>
            {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
          </>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={() => onUpload('/placeholder-image.png')}
        />
      </div>
    </div>
  );
}

function SectionStatus({ sections }: { sections: { name: string; complete: boolean }[] }) {
  const completed = sections.filter(s => s.complete).length;
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
      <div className="flex -space-x-1">
        {sections.map((section, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              section.complete
                ? 'bg-green-500 text-white'
                : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-muted)]'
            }`}
            title={section.name}
          >
            {section.complete ? <Check size={10} /> : i + 1}
          </div>
        ))}
      </div>
      <span className="text-sm text-[var(--text-secondary)]">
        {completed} of {sections.length} sections complete
      </span>
    </div>
  );
}

// =============================================================================
// Brand Presets Panel
// =============================================================================

function BrandPresetsPanel({
  onSelect,
  onClose,
}: {
  onSelect: (preset: typeof BRAND_PRESETS[0]) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[var(--color-brand)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Brand Presets</h3>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Quick-start with a pre-configured color scheme. You can customize further after applying.
        </p>
        <div className="space-y-2">
          {BRAND_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className="w-full flex items-center gap-4 p-3 rounded-lg border border-[var(--border-primary)] hover:border-[var(--color-brand)] hover:bg-[var(--hover-overlay)] transition-colors text-left"
            >
              <div className="flex -space-x-1">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--bg-secondary)]" style={{ backgroundColor: preset.colors.primary }} />
                <div className="w-6 h-6 rounded-full border-2 border-[var(--bg-secondary)]" style={{ backgroundColor: preset.colors.secondary }} />
                <div className="w-6 h-6 rounded-full border-2 border-[var(--bg-secondary)]" style={{ backgroundColor: preset.colors.accent }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--text-primary)]">{preset.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{preset.description}</div>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Login Preview Modal
// =============================================================================

function LoginPreviewModal({
  branding,
  tenantName,
  onClose,
}: {
  branding: WhiteLabelBranding;
  tenantName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="relative w-full max-w-4xl mx-4">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 flex items-center gap-2 text-white/70 hover:text-white"
        >
          <X size={20} />
          Close Preview
        </button>
        <div
          className="relative rounded-xl overflow-hidden shadow-2xl"
          style={{
            backgroundImage: branding.loginBackgroundUrl ? `url(${branding.loginBackgroundUrl})` : undefined,
            backgroundColor: branding.loginBackgroundUrl ? undefined : '#1e293b',
            aspectRatio: '16/10',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
              {branding.logoLightUrl ? (
                <img src={branding.logoLightUrl} alt="Logo" className="h-10 mx-auto mb-6" />
              ) : (
                <div className="h-10 w-32 mx-auto mb-6 bg-gray-200 rounded" />
              )}
              <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Welcome to {tenantName}
              </h2>
              {branding.loginWelcomeMessage && (
                <p className="text-sm text-gray-600 text-center mb-6">
                  {branding.loginWelcomeMessage}
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="you@example.com"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="••••••••"
                    disabled
                  />
                </div>
                <button
                  className="w-full py-3 rounded-lg text-white font-medium"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  Sign In
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-6">
                Don't have an account? <span style={{ color: branding.primaryColor }}>Sign up</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// History Tab
// =============================================================================

function HistoryTab({ history }: { history: WhiteLabelHistoryEntry[] }) {
  return (
    <div className="space-y-3">
      {history.length > 0 ? (
        history.map(entry => (
          <div key={entry.id} className="flex gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
              <History size={14} className="text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-[var(--text-primary)]">{entry.field}</span>
                {entry.oldValue && entry.newValue && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {entry.oldValue} → {entry.newValue}
                  </span>
                )}
                {!entry.oldValue && entry.newValue && (
                  <span className="text-xs text-green-400">Added</span>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {entry.changedBy} • {new Date(entry.changedAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-sm text-[var(--text-muted)]">
          No changes recorded yet.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function WhiteLabel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('branding');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string; subdomain: string } | null>(null);
  const [branding, setBranding] = useState<WhiteLabelBranding>(DEFAULT_BRANDING);
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedDns, setCopiedDns] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showLoginPreview, setShowLoginPreview] = useState(false);

  // API Hooks
  const { data: statsData } = useWhiteLabelStats();
  const { data: tenantsData, isLoading: tenantsLoading } = useWhiteLabelTenants();
  const { data: brandingData, isLoading: brandingLoading } = useWhiteLabelBranding(selectedTenantId || '');
  const { data: historyData } = useWhiteLabelHistory(selectedTenantId || '');
  const updateBranding = useUpdateWhiteLabelBranding(selectedTenantId || '');
  const verifyDomain = useVerifyWhiteLabelDomain(selectedTenantId || '');

  const stats = statsData?.stats || { configuredTenants: 0, customDomains: 0, pendingVerification: 0, recentlyUpdated: 0 };
  const tenants = tenantsData?.tenants || [];
  const history = historyData?.history || [];

  // Filter tenants for the list view
  const filteredTenants = useMemo(() => {
    if (!searchQuery) return tenants;
    const query = searchQuery.toLowerCase();
    return tenants.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.subdomain.toLowerCase().includes(query)
    );
  }, [searchQuery, tenants]);

  // Calculate section completion status
  const sectionStatus = useMemo(() => [
    { name: 'Branding', complete: !!(branding.logoLightUrl && branding.primaryColor !== '#3b82f6') },
    { name: 'Domain', complete: branding.domainVerified },
    { name: 'Email', complete: !!(branding.emailFromName && branding.emailReplyTo) },
    { name: 'Login', complete: !!branding.loginWelcomeMessage },
    { name: 'Mobile', complete: !!branding.appIconUrl },
  ], [branding]);

  // Load tenant from URL params
  useEffect(() => {
    const tenantId = searchParams.get('tenant');
    if (tenantId && !selectedTenantId) {
      setSelectedTenantId(tenantId);
    }
  }, [searchParams, selectedTenantId]);

  // Sync branding data from API
  useEffect(() => {
    if (brandingData?.branding && selectedTenantId) {
      setBranding(brandingData.branding);
      // Also set the tenant info
      if (!selectedTenant && brandingData.branding.tenantName) {
        setSelectedTenant({
          id: selectedTenantId,
          name: brandingData.branding.tenantName || '',
          subdomain: brandingData.branding.tenantSubdomain || '',
        });
      }
    }
  }, [brandingData, selectedTenantId, selectedTenant]);

  const handleSelectTenant = (tenant: WhiteLabelTenant) => {
    setSelectedTenant({ id: tenant.tenantId, name: tenant.name, subdomain: tenant.subdomain });
    setSelectedTenantId(tenant.tenantId);
    setSearchParams({ tenant: tenant.tenantId });
  };

  const handleBack = () => {
    setSelectedTenant(null);
    setSelectedTenantId(null);
    setSearchParams({});
    setBranding(DEFAULT_BRANDING);
    setHasChanges(false);
  };

  const handleChange = <K extends keyof WhiteLabelBranding>(field: K, value: WhiteLabelBranding[K]) => {
    setBranding(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedTenantId) return;
    try {
      await updateBranding.mutateAsync({
        logoLightUrl: branding.logoLightUrl,
        logoDarkUrl: branding.logoDarkUrl,
        faviconUrl: branding.faviconUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        customDomain: branding.customDomain,
        emailFromName: branding.emailFromName,
        emailReplyTo: branding.emailReplyTo,
        emailHeaderLogoUrl: branding.emailHeaderLogoUrl,
        emailFooterMarkdown: branding.emailFooterMarkdown,
        loginBackgroundUrl: branding.loginBackgroundUrl,
        loginWelcomeMessage: branding.loginWelcomeMessage,
        customCss: branding.customCss,
        appIconUrl: branding.appIconUrl,
        splashScreenUrl: branding.splashScreenUrl,
        mobileThemeColors: branding.mobileThemeColors,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save branding:', error);
    }
  };

  const handleVerifyDomain = async () => {
    if (!selectedTenantId) return;
    try {
      await verifyDomain.mutateAsync();
    } catch (error) {
      console.error('Failed to verify domain:', error);
    }
  };

  const isLoading = brandingLoading;
  const isSaving = updateBranding.isPending;

  const handleApplyPreset = (preset: typeof BRAND_PRESETS[0]) => {
    handleChange('primaryColor', preset.colors.primary);
    handleChange('secondaryColor', preset.colors.secondary);
    handleChange('accentColor', preset.colors.accent);
    setShowPresets(false);
  };

  const copyDnsRecord = (type: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedDns(type);
    setTimeout(() => setCopiedDns(null), 2000);
  };

  const openPreview = () => {
    if (selectedTenant) {
      window.open(`https://${selectedTenant.subdomain}.barkbase.app/login?preview=true`, '_blank');
    }
  };

  const dnsRecords = branding.customDomain ? [
    { type: 'CNAME', name: branding.customDomain, value: 'custom.barkbase.app' },
    { type: 'TXT', name: `_barkbase.${branding.customDomain}`, value: `barkbase-verify=${selectedTenant?.id}` },
  ] : [];

  // ===========================================
  // LIST VIEW (no tenant selected)
  // ===========================================
  if (!selectedTenant) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">White-Label Configuration</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Customize branding for enterprise tenants</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <StatsCard label="Configured Tenants" value={stats.configuredTenants} icon={Building2} color="#22c55e" />
          <StatsCard label="Custom Domains" value={stats.customDomains} icon={Globe} color="#3b82f6" />
          <StatsCard label="Pending Verification" value={stats.pendingVerification} icon={Clock} color="#f59e0b" />
          <StatsCard label="Recently Updated" value={stats.recentlyUpdated} icon={History} color="#8b5cf6" />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenants..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
          />
        </div>

        {/* Tenant Grid */}
        {tenantsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[var(--color-brand)] animate-spin" />
          </div>
        ) : filteredTenants.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {filteredTenants.map(tenant => (
              <TenantCard
                key={tenant.tenantId}
                tenant={tenant}
                onClick={() => handleSelectTenant(tenant)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] mb-4">
              <Palette className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-base font-medium text-[var(--text-primary)]">No tenants found</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {tenants.length === 0 ? 'Configure white-label branding for tenants' : 'Try adjusting your search query'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ===========================================
  // DETAIL VIEW (tenant selected)
  // ===========================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2"
          >
            <ArrowLeft size={16} />
            Back to Tenants
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{selectedTenant.name}</h1>
            <span className="text-sm text-[var(--text-muted)]">{selectedTenant.subdomain}.barkbase.app</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPresets(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
          >
            <Sparkles size={16} />
            Brand Presets
          </button>
          <button
            onClick={openPreview}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
          >
            <Eye size={16} />
            Preview
            <ExternalLink size={14} />
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Section Status */}
      <SectionStatus sections={sectionStatus} />

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isComplete = sectionStatus.find(s => s.name === tab.label)?.complete;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--hover-overlay)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    {tab.label}
                  </div>
                  {tab.id !== 'history' && isComplete && (
                    <Check size={14} className="text-green-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6">
              {/* Branding Tab */}
              {activeTab === 'branding' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <ImageUploader
                      label="Logo (Light Mode)"
                      currentUrl={branding.logoLightUrl}
                      onUpload={(url) => handleChange('logoLightUrl', url || null)}
                      hint="PNG or SVG, 200x50px recommended"
                    />
                    <ImageUploader
                      label="Logo (Dark Mode)"
                      currentUrl={branding.logoDarkUrl}
                      onUpload={(url) => handleChange('logoDarkUrl', url || null)}
                      hint="PNG or SVG, 200x50px recommended"
                    />
                    <ImageUploader
                      label="Favicon"
                      currentUrl={branding.faviconUrl}
                      onUpload={(url) => handleChange('faviconUrl', url || null)}
                      hint="ICO or PNG, 32x32px"
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-[var(--text-primary)]">Brand Colors</h3>
                        <button
                          onClick={() => setShowPresets(true)}
                          className="text-xs text-[var(--color-brand)] hover:underline"
                        >
                          Use Preset
                        </button>
                      </div>
                      {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map(colorKey => (
                        <div key={colorKey} className="flex items-center gap-3">
                          <input
                            type="color"
                            value={branding[colorKey]}
                            onChange={(e) => handleChange(colorKey, e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border-0"
                          />
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-[var(--text-muted)] capitalize">
                              {colorKey.replace('Color', '')}
                            </label>
                            <input
                              type="text"
                              value={branding[colorKey]}
                              onChange={(e) => handleChange(colorKey, e.target.value)}
                              className="w-24 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-xs font-mono text-[var(--text-primary)]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ColorPreview
                    primary={branding.primaryColor}
                    secondary={branding.secondaryColor}
                    accent={branding.accentColor}
                  />
                </div>
              )}

              {/* Custom Domain Tab */}
              {activeTab === 'domain' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Custom Domain
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={branding.customDomain || ''}
                        onChange={(e) => handleChange('customDomain', e.target.value || null)}
                        placeholder="booking.happypaws.com"
                        className="flex-1 max-w-md px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                      />
                      {branding.customDomain && !branding.domainVerified && (
                        <button
                          onClick={handleVerifyDomain}
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                        >
                          <RefreshCw size={14} />
                          Verify DNS
                        </button>
                      )}
                    </div>
                  </div>

                  {branding.customDomain && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            {branding.domainVerified ? (
                              <Check size={16} className="text-[var(--color-success)]" />
                            ) : (
                              <AlertTriangle size={16} className="text-[var(--color-warning)]" />
                            )}
                            <span className="text-sm font-medium text-[var(--text-primary)]">DNS Verification</span>
                          </div>
                          <span className={`text-xs ${branding.domainVerified ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                            {branding.domainVerified ? 'Verified' : 'Pending verification'}
                          </span>
                        </div>
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            {branding.domainSslStatus === 'active' ? (
                              <Check size={16} className="text-[var(--color-success)]" />
                            ) : branding.domainSslStatus === 'provisioning' ? (
                              <Loader2 size={16} className="text-[var(--color-info)] animate-spin" />
                            ) : (
                              <AlertTriangle size={16} className="text-[var(--text-muted)]" />
                            )}
                            <span className="text-sm font-medium text-[var(--text-primary)]">SSL Certificate</span>
                          </div>
                          <span className={`text-xs ${
                            branding.domainSslStatus === 'active' ? 'text-[var(--color-success)]' :
                            branding.domainSslStatus === 'provisioning' ? 'text-[var(--color-info)]' :
                            'text-[var(--text-muted)]'
                          }`}>
                            {branding.domainSslStatus === 'active' ? 'Active' :
                             branding.domainSslStatus === 'provisioning' ? 'Provisioning...' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Required DNS Records</h3>
                        <div className="space-y-2">
                          {dnsRecords.map(record => (
                            <div key={record.type + record.name} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                              <span className="w-16 text-xs font-bold text-[var(--color-info)]">{record.type}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-[var(--text-muted)]">Name</p>
                                <p className="text-sm font-mono text-[var(--text-primary)] truncate">{record.name}</p>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-[var(--text-muted)]">Value</p>
                                <p className="text-sm font-mono text-[var(--text-primary)] truncate">{record.value}</p>
                              </div>
                              <button
                                onClick={() => copyDnsRecord(record.type, record.value)}
                                className="p-1.5 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
                              >
                                {copiedDns === record.type ? (
                                  <Check size={14} className="text-[var(--color-success)]" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-3">
                          Add these records to your DNS provider. Verification may take up to 24 hours.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Email Branding Tab */}
              {activeTab === 'email' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                        From Name
                      </label>
                      <input
                        type="text"
                        value={branding.emailFromName || ''}
                        onChange={(e) => handleChange('emailFromName', e.target.value || null)}
                        placeholder="Happy Paws Grooming"
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                        Reply-To Address
                      </label>
                      <input
                        type="email"
                        value={branding.emailReplyTo || ''}
                        onChange={(e) => handleChange('emailReplyTo', e.target.value || null)}
                        placeholder="hello@happypaws.com"
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                      />
                    </div>

                    <ImageUploader
                      label="Email Header Logo"
                      currentUrl={branding.emailHeaderLogoUrl}
                      onUpload={(url) => handleChange('emailHeaderLogoUrl', url || null)}
                      hint="PNG, max 600px wide"
                    />

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                        Email Footer (Markdown)
                      </label>
                      <textarea
                        value={branding.emailFooterMarkdown || ''}
                        onChange={(e) => handleChange('emailFooterMarkdown', e.target.value || null)}
                        placeholder="**Happy Paws Grooming**&#10;123 Main St, Anytown USA&#10;[Unsubscribe]({{unsubscribe_url}})"
                        rows={4}
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)] resize-none"
                      />
                    </div>
                  </div>

                  {/* Email Preview */}
                  <div className="p-4 bg-white rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-3">Email Preview</p>
                    <div className="border border-gray-200 rounded">
                      <div className="p-4 border-b border-gray-100" style={{ backgroundColor: branding.primaryColor }}>
                        {branding.emailHeaderLogoUrl ? (
                          <img src={branding.emailHeaderLogoUrl} alt="Logo" className="h-8" />
                        ) : (
                          <div className="h-8 w-24 bg-white/30 rounded" />
                        )}
                      </div>
                      <div className="p-4">
                        <div className="w-3/4 h-3 bg-gray-200 rounded mb-2" />
                        <div className="w-full h-2 bg-gray-100 rounded mb-1" />
                        <div className="w-full h-2 bg-gray-100 rounded mb-1" />
                        <div className="w-2/3 h-2 bg-gray-100 rounded mb-4" />
                        <button
                          className="px-4 py-2 rounded text-xs text-white"
                          style={{ backgroundColor: branding.primaryColor }}
                        >
                          View Booking
                        </button>
                      </div>
                      <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-[10px] text-gray-500">
                          {branding.emailFromName || selectedTenant.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Page Tab */}
              {activeTab === 'login' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <ImageUploader
                      label="Background Image"
                      currentUrl={branding.loginBackgroundUrl}
                      onUpload={(url) => handleChange('loginBackgroundUrl', url || null)}
                      hint="JPG or PNG, 1920x1080px recommended"
                    />

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                        Welcome Message
                      </label>
                      <textarea
                        value={branding.loginWelcomeMessage || ''}
                        onChange={(e) => handleChange('loginWelcomeMessage', e.target.value || null)}
                        placeholder="Welcome back to Happy Paws! Sign in to manage your appointments."
                        rows={3}
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                          Custom CSS (Advanced)
                        </label>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-warning-soft)] text-[var(--color-warning)] rounded">
                          ADVANCED
                        </span>
                      </div>
                      <textarea
                        value={branding.customCss || ''}
                        onChange={(e) => handleChange('customCss', e.target.value || null)}
                        placeholder=".login-card { border-radius: 16px; }&#10;.login-button { font-weight: 600; }"
                        rows={6}
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)] resize-none"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        CSS is sanitized and validated before applying.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowLoginPreview(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--hover-overlay)]"
                    >
                      <Maximize2 size={16} />
                      Full Page Preview
                    </button>
                  </div>

                  {/* Login Preview */}
                  <div
                    className="relative rounded-lg overflow-hidden h-80"
                    style={{
                      backgroundImage: branding.loginBackgroundUrl ? `url(${branding.loginBackgroundUrl})` : undefined,
                      backgroundColor: branding.loginBackgroundUrl ? undefined : '#1e293b'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="w-full max-w-xs bg-white rounded-lg shadow-xl p-6">
                        {branding.logoLightUrl ? (
                          <img src={branding.logoLightUrl} alt="Logo" className="h-8 mx-auto mb-4" />
                        ) : (
                          <div className="h-8 w-24 mx-auto mb-4 bg-gray-200 rounded" />
                        )}
                        {branding.loginWelcomeMessage && (
                          <p className="text-xs text-gray-600 text-center mb-4">
                            {branding.loginWelcomeMessage}
                          </p>
                        )}
                        <div className="space-y-3">
                          <div className="h-9 bg-gray-100 rounded" />
                          <div className="h-9 bg-gray-100 rounded" />
                          <button
                            className="w-full h-9 rounded text-xs text-white font-medium"
                            style={{ backgroundColor: branding.primaryColor }}
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile App Tab */}
              {activeTab === 'mobile' && (
                <div className="space-y-6">
                  <div className="p-4 bg-[var(--color-info-soft)] rounded-lg flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-[var(--color-info)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-info)]">Future Feature</p>
                      <p className="text-xs text-[var(--color-info)]/80 mt-0.5">
                        Mobile app theming will be available when the BarkBase native app launches.
                        Configure these settings now to be ready.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <ImageUploader
                        label="App Icon"
                        currentUrl={branding.appIconUrl}
                        onUpload={(url) => handleChange('appIconUrl', url || null)}
                        hint="PNG, 1024x1024px"
                      />

                      <ImageUploader
                        label="Splash Screen"
                        currentUrl={branding.splashScreenUrl}
                        onUpload={(url) => handleChange('splashScreenUrl', url || null)}
                        hint="PNG, 1242x2688px"
                      />

                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[var(--text-primary)]">Theme Colors</h3>
                        {(['primary', 'secondary', 'background'] as const).map(key => (
                          <div key={key} className="flex items-center gap-3">
                            <input
                              type="color"
                              value={branding.mobileThemeColors?.[key] || branding.primaryColor}
                              onChange={(e) => handleChange('mobileThemeColors', {
                                ...branding.mobileThemeColors,
                                primary: branding.mobileThemeColors?.primary || branding.primaryColor,
                                secondary: branding.mobileThemeColors?.secondary || branding.secondaryColor,
                                background: branding.mobileThemeColors?.background || '#ffffff',
                                [key]: e.target.value,
                              })}
                              className="w-10 h-10 rounded cursor-pointer border-0"
                            />
                            <span className="text-sm text-[var(--text-secondary)] capitalize">{key}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Phone Preview */}
                    <div className="flex justify-center">
                      <div className="relative w-48 h-96 bg-gray-900 rounded-[2rem] p-2">
                        <div className="w-full h-full bg-white rounded-[1.5rem] overflow-hidden">
                          <div className="h-6 bg-gray-100 flex items-center justify-between px-4">
                            <span className="text-[8px] text-gray-600">9:41</span>
                            <div className="flex gap-1">
                              <div className="w-3 h-2 bg-gray-400 rounded-sm" />
                              <div className="w-3 h-2 bg-gray-400 rounded-sm" />
                            </div>
                          </div>
                          <div
                            className="p-3"
                            style={{ backgroundColor: branding.mobileThemeColors?.background || '#ffffff' }}
                          >
                            <div
                              className="h-10 rounded-lg mb-3 flex items-center justify-center"
                              style={{ backgroundColor: branding.mobileThemeColors?.primary || branding.primaryColor }}
                            >
                              <span className="text-[10px] text-white font-medium">Header</span>
                            </div>
                            <div className="space-y-2">
                              <div className="h-12 bg-gray-100 rounded-lg" />
                              <div className="h-12 bg-gray-100 rounded-lg" />
                              <div className="h-12 bg-gray-100 rounded-lg" />
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <HistoryTab history={history} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Brand Presets Modal */}
      {showPresets && (
        <BrandPresetsPanel
          onSelect={handleApplyPreset}
          onClose={() => setShowPresets(false)}
        />
      )}

      {/* Login Preview Modal */}
      {showLoginPreview && (
        <LoginPreviewModal
          branding={branding}
          tenantName={selectedTenant.name}
          onClose={() => setShowLoginPreview(false)}
        />
      )}
    </div>
  );
}
