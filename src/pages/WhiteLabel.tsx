import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useSearch } from '@/hooks/useApi';

type TabType = 'branding' | 'domain' | 'email' | 'login' | 'mobile';

interface TenantBranding {
  tenantId: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customDomain: string | null;
  domainVerified: boolean;
  domainSslStatus: 'pending' | 'provisioning' | 'active' | 'failed';
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
}

const TABS: { id: TabType; label: string; icon: typeof Palette }[] = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'domain', label: 'Custom Domain', icon: Globe },
  { id: 'email', label: 'Email Branding', icon: Mail },
  { id: 'login', label: 'Login Page', icon: LogIn },
  { id: 'mobile', label: 'Mobile App', icon: Smartphone },
];

const DEFAULT_BRANDING: TenantBranding = {
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

function ColorPreview({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  return (
    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
      <p className="text-xs font-medium text-[var(--text-muted)] mb-3">UI Preview</p>
      <div className="space-y-3">
        {/* Header preview */}
        <div className="h-8 rounded" style={{ backgroundColor: primary }}>
          <div className="flex items-center h-full px-3">
            <div className="w-4 h-4 bg-white/30 rounded" />
            <div className="ml-auto flex gap-2">
              <div className="w-12 h-3 bg-white/20 rounded" />
              <div className="w-12 h-3 bg-white/20 rounded" />
            </div>
          </div>
        </div>
        {/* Content preview */}
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
        {/* Button preview */}
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
    // In real app, would upload file and get URL
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

export function WhiteLabel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('branding');
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string; subdomain: string } | null>(null);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedDns, setCopiedDns] = useState<string | null>(null);

  const { data: searchData } = useSearch(tenantSearch);
  const tenantResults = searchData?.results?.filter(r => r.type === 'tenant') || [];

  // Load tenant from URL params
  useEffect(() => {
    const tenantId = searchParams.get('tenant');
    if (tenantId && !selectedTenant) {
      // Would fetch tenant details
      setIsLoading(true);
      setTimeout(() => {
        setSelectedTenant({ id: tenantId, name: 'Happy Paws Grooming', subdomain: 'happypaws' });
        setBranding({ ...DEFAULT_BRANDING, tenantId });
        setIsLoading(false);
      }, 500);
    }
  }, [searchParams, selectedTenant]);

  const handleSelectTenant = (tenant: { id: string; name: string; subdomain?: string }) => {
    setSelectedTenant({ id: tenant.id, name: tenant.name, subdomain: tenant.subdomain || '' });
    setTenantSearch(tenant.name);
    setShowTenantDropdown(false);
    setSearchParams({ tenant: tenant.id });
    setIsLoading(true);
    // Simulate loading branding
    setTimeout(() => {
      setBranding({ ...DEFAULT_BRANDING, tenantId: tenant.id });
      setIsLoading(false);
    }, 500);
  };

  const handleChange = <K extends keyof TenantBranding>(field: K, value: TenantBranding[K]) => {
    setBranding(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  const handleVerifyDomain = async () => {
    // Simulate DNS verification
    handleChange('domainVerified', true);
    handleChange('domainSslStatus', 'provisioning');
    setTimeout(() => {
      handleChange('domainSslStatus', 'active');
    }, 2000);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">White-Label Configuration</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Customize branding for enterprise tenants</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedTenant && (
            <button
              onClick={openPreview}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
            >
              <Eye size={16} />
              Preview as Tenant
              <ExternalLink size={14} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !selectedTenant}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Tenant Selector */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Select Tenant</label>
        <div className="relative max-w-md">
          <input
            type="text"
            value={tenantSearch}
            onChange={(e) => {
              setTenantSearch(e.target.value);
              setShowTenantDropdown(true);
              if (!e.target.value) setSelectedTenant(null);
            }}
            onFocus={() => setShowTenantDropdown(true)}
            placeholder="Search for an enterprise tenant..."
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
          />
          {selectedTenant && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check size={16} className="text-[var(--color-success)]" />
            </span>
          )}
          {showTenantDropdown && tenantSearch.length >= 2 && (
            <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md shadow-lg max-h-48 overflow-y-auto">
              {tenantResults.length > 0 ? (
                tenantResults.map(tenant => (
                  <button
                    key={tenant.id}
                    onClick={() => handleSelectTenant({ id: tenant.id, name: tenant.name, subdomain: tenant.subdomain })}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--hover-overlay)] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[var(--text-primary)]">{tenant.name}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">{tenant.subdomain}</span>
                    </div>
                    {tenant.plan === 'enterprise' && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-medium">
                        ENTERPRISE
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-[var(--text-muted)]">No tenants found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedTenant && (
        <div className="flex gap-6">
          {/* Tabs */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--hover-overlay)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
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
                        <h3 className="text-sm font-medium text-[var(--text-primary)]">Brand Colors</h3>
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
                        {/* Status */}
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

                        {/* DNS Records */}
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
                        {/* Email header */}
                        <div className="p-4 border-b border-gray-100" style={{ backgroundColor: branding.primaryColor }}>
                          {branding.emailHeaderLogoUrl ? (
                            <img src={branding.emailHeaderLogoUrl} alt="Logo" className="h-8" />
                          ) : (
                            <div className="h-8 w-24 bg-white/30 rounded" />
                          )}
                        </div>
                        {/* Email body */}
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
                        {/* Email footer */}
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
                            {/* Status bar */}
                            <div className="h-6 bg-gray-100 flex items-center justify-between px-4">
                              <span className="text-[8px] text-gray-600">9:41</span>
                              <div className="flex gap-1">
                                <div className="w-3 h-2 bg-gray-400 rounded-sm" />
                                <div className="w-3 h-2 bg-gray-400 rounded-sm" />
                              </div>
                            </div>
                            {/* App content */}
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
                          {/* Notch */}
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedTenant && (
        <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
          <div className="text-center">
            <Palette size={48} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Select a tenant to configure white-label settings</p>
          </div>
        </div>
      )}
    </div>
  );
}
