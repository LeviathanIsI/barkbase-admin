import { useState, useEffect } from 'react';
import {
  Loader2,
  Save,
  Bell,
  Shield,
  Palette,
  Key,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useSettings, useUpdateSettings, useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/hooks/useApi';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

type TabType = 'general' | 'notifications' | 'security' | 'appearance' | 'api-keys';

const TABS: { id: TabType; label: string; icon: typeof SettingsIcon }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'api-keys', label: 'API Keys', icon: Key },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: apiKeysData } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();

  // Local state for form
  const [formData, setFormData] = useState({
    // General
    opsCenterName: 'BarkBase Ops Center',
    supportEmail: 'support@barkbase.com',
    defaultTimezone: 'America/New_York',
    // Notifications
    slackWebhookUrl: '',
    alertEmailRecipients: '',
    errorRateThreshold: 5,
    responseTimeThreshold: 2000,
    // Security
    sessionTimeout: 30,
    impersonationTimeLimit: 30,
    requireReasonForSensitiveActions: true,
    ipWhitelist: '',
    // Appearance
    primaryColor: '#3b82f6',
  });

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings,
      }));
    }
  }, [settings]);

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData);
    setHasChanges(false);
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    const result = await createApiKey.mutateAsync(newKeyName);
    setNewApiKey(result.secret);
    setNewKeyName('');
  };

  const handleCopyKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      await revokeApiKey.mutateAsync(keyId);
    }
  };

  const apiKeys: ApiKey[] = apiKeysData?.keys || [];

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Settings</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Configure Ops Center preferences
            </p>
          </div>
          {activeTab !== 'api-keys' && (
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateSettings.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Changes
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
          </div>
        ) : (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Ops Center Name
                  </label>
                  <input
                    type="text"
                    value={formData.opsCenterName}
                    onChange={(e) => handleChange('opsCenterName', e.target.value)}
                    className="w-full max-w-md px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Displayed in the header</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={formData.supportEmail}
                    onChange={(e) => handleChange('supportEmail', e.target.value)}
                    className="w-full max-w-md px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Default Timezone
                  </label>
                  <select
                    value={formData.defaultTimezone}
                    onChange={(e) => handleChange('defaultTimezone', e.target.value)}
                    className="w-full max-w-md px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Slack Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formData.slackWebhookUrl}
                    onChange={(e) => handleChange('slackWebhookUrl', e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Receive incident alerts in Slack</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Alert Email Recipients
                  </label>
                  <textarea
                    value={formData.alertEmailRecipients}
                    onChange={(e) => handleChange('alertEmailRecipients', e.target.value)}
                    placeholder="email1@example.com&#10;email2@example.com"
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">One email per line</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Error Rate Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.errorRateThreshold}
                      onChange={(e) => handleChange('errorRateThreshold', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Alert when error rate exceeds this</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Response Time Threshold (ms)
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={formData.responseTimeThreshold}
                      onChange={(e) => handleChange('responseTimeThreshold', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Alert when p95 exceeds this</p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={formData.sessionTimeout}
                      onChange={(e) => handleChange('sessionTimeout', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Impersonation Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={formData.impersonationTimeLimit}
                      onChange={(e) => handleChange('impersonationTimeLimit', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Require Reason for Sensitive Actions
                    </span>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Force users to provide a reason for impersonation, suspension, etc.
                    </p>
                  </div>
                  <button
                    onClick={() => handleChange('requireReasonForSensitiveActions', !formData.requireReasonForSensitiveActions)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.requireReasonForSensitiveActions ? 'bg-[var(--color-success)]' : 'bg-[var(--bg-primary)]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.requireReasonForSensitiveActions ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    IP Whitelist (optional)
                  </label>
                  <textarea
                    value={formData.ipWhitelist}
                    onChange={(e) => handleChange('ipWhitelist', e.target.value)}
                    placeholder="192.168.1.0/24&#10;10.0.0.1"
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)] resize-none"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    CIDR notation or single IPs, one per line. Leave empty to allow all.
                  </p>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg flex items-center justify-center">
                      <SettingsIcon size={24} className="text-[var(--text-muted)]" />
                    </div>
                    <button className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]">
                      Upload Logo
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Recommended: 128x128px PNG or SVG
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="w-28 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* API Keys */}
            {activeTab === 'api-keys' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">API Keys</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Manage API keys for external integrations
                    </p>
                  </div>
                  <button
                    onClick={() => setShowApiKeyPanel(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                  >
                    <Plus size={14} />
                    Generate Key
                  </button>
                </div>

                {apiKeys.length > 0 ? (
                  <div className="space-y-2">
                    {apiKeys.map(key => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--text-primary)]">{key.name}</span>
                            <code className="text-xs px-1.5 py-0.5 bg-[var(--bg-primary)] rounded text-[var(--text-muted)]">
                              {key.prefix}...
                            </code>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                            <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                            {key.lastUsedAt && (
                              <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="p-1.5 rounded hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <Key size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No API keys yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate API Key Panel */}
      <SlideOutPanel
        isOpen={showApiKeyPanel}
        onClose={() => {
          setShowApiKeyPanel(false);
          setNewApiKey(null);
          setNewKeyName('');
        }}
        title="Generate API Key"
        width="sm"
        footer={
          !newApiKey ? (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowApiKeyPanel(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateApiKey}
                disabled={!newKeyName.trim() || createApiKey.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                {createApiKey.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowApiKeyPanel(false);
                setNewApiKey(null);
                setNewKeyName('');
              }}
              className="w-full px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
            >
              Done
            </button>
          )
        }
      >
        {!newApiKey ? (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production Integration"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Give this key a descriptive name to identify its purpose.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-[var(--color-warning-soft)] rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0" />
                <div className="text-sm text-[var(--color-warning)]">
                  <p className="font-medium">Copy this key now!</p>
                  <p className="text-[var(--color-warning)]/80 mt-0.5">
                    This is the only time you'll see the full key. Store it securely.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Your API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm font-mono text-[var(--text-primary)] break-all">
                  {newApiKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="p-2 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
                >
                  {copiedKey ? <Check size={16} className="text-[var(--color-success)]" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </SlideOutPanel>
    </div>
  );
}
