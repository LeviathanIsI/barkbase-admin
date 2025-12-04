import { useState } from 'react';
import {
  Loader2,
  Plus,
  Webhook as WebhookIcon,
  Plug,
  Trash2,
  Edit2,
  Play,
  Check,
  X,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useWebhookDeliveries,
  useIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
} from '@/hooks/useApi';
import type {
  Webhook,
  WebhookEvent,
  WebhookDelivery,
  Integration,
  CreateWebhookInput,
  UpdateWebhookInput,
} from '@/types';

interface IntegrationDisplay extends Integration {
  logo: string;
  configFields?: { key: string; label: string; type: string; required: boolean }[];
}

const WEBHOOK_EVENTS: { event: WebhookEvent; label: string; description: string }[] = [
  { event: 'booking.created', label: 'Booking Created', description: 'When a new booking is made' },
  { event: 'booking.updated', label: 'Booking Updated', description: 'When a booking is modified' },
  { event: 'booking.cancelled', label: 'Booking Cancelled', description: 'When a booking is cancelled' },
  { event: 'payment.received', label: 'Payment Received', description: 'When a payment is processed' },
  { event: 'payment.failed', label: 'Payment Failed', description: 'When a payment fails' },
  { event: 'user.signup', label: 'User Signup', description: 'When a new user registers' },
  { event: 'user.updated', label: 'User Updated', description: 'When user profile changes' },
  { event: 'pet.created', label: 'Pet Added', description: 'When a new pet is added' },
  { event: 'tenant.created', label: 'Tenant Created', description: 'When a new tenant signs up' },
];

// Display-specific data for integrations (logos and config fields)
const INTEGRATION_UI_DATA: Record<string, { logo: string; configFields?: { key: string; label: string; type: string; required: boolean }[] }> = {
  slack: {
    logo: '💬',
    configFields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'channel', label: 'Default Channel', type: 'text', required: false },
    ],
  },
  zapier: {
    logo: '⚡',
    configFields: [
      { key: 'webhook_url', label: 'Zapier Webhook URL', type: 'url', required: true },
    ],
  },
  quickbooks: {
    logo: '📊',
    configFields: [
      { key: 'company_id', label: 'Company ID', type: 'text', required: true },
    ],
  },
  mailchimp: {
    logo: '📧',
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'list_id', label: 'Audience List ID', type: 'text', required: true },
    ],
  },
  twilio: {
    logo: '📱',
    configFields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
      { key: 'from_number', label: 'From Number', type: 'text', required: true },
    ],
  },
  'google-calendar': {
    logo: '📅',
  },
};

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--color-success)';
  if (status >= 400 && status < 500) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export function Integrations() {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'integrations' | 'usage'>('webhooks');
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDisplay | null>(null);
  const [expandedDeliveries, setExpandedDeliveries] = useState<Record<string, boolean>>({});

  // API hooks
  const { data: webhooksData, isLoading: isLoadingWebhooks } = useWebhooks();
  const { data: integrationsData, isLoading: isLoadingIntegrations } = useIntegrations();
  const { data: deliveriesData } = useWebhookDeliveries(selectedWebhookId || '');
  const createWebhook = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook(selectedWebhookId || '');
  const deleteWebhookMutation = useDeleteWebhook();
  const testWebhookMutation = useTestWebhook(selectedWebhookId || '');
  const connectIntegration = useConnectIntegration();
  const disconnectIntegration = useDisconnectIntegration();

  const webhooks = webhooksData?.webhooks || [];
  const integrations = integrationsData?.integrations || [];
  const deliveries = deliveriesData?.deliveries || [];
  const selectedWebhook = webhooks.find((w: Webhook) => w.id === selectedWebhookId) || null;

  const isLoading = isLoadingWebhooks || isLoadingIntegrations;

  // Form state
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as WebhookEvent[],
    headers: {} as Record<string, string>,
    tenantId: '',
    isActive: true,
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreateWebhook = () => {
    // Reset form
    setWebhookForm({
      name: '',
      url: '',
      secret: crypto.randomUUID().slice(0, 32),
      events: [],
      headers: {},
      tenantId: '',
      isActive: true,
    });
    setShowCreateWebhook(true);
  };

  const handleSaveWebhook = async () => {
    try {
      const webhookData: CreateWebhookInput = {
        name: webhookForm.name,
        url: webhookForm.url,
        events: webhookForm.events,
        headers: webhookForm.headers,
        tenantId: webhookForm.tenantId || undefined,
      };
      await createWebhook.mutateAsync(webhookData);
      setShowCreateWebhook(false);
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const handleUpdateWebhook = async (data: UpdateWebhookInput) => {
    try {
      await updateWebhookMutation.mutateAsync(data);
    } catch (error) {
      console.error('Failed to update webhook:', error);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await deleteWebhookMutation.mutateAsync(id);
      setSelectedWebhookId(null);
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setTestResult(null);
      const result = await testWebhookMutation.mutateAsync();
      setTestResult({ success: result.success, message: result.message });
    } catch (error) {
      setTestResult({ success: false, message: 'Test failed' });
    }
  };

  const handleConnectIntegration = async (key: string, config: Record<string, string>) => {
    try {
      await connectIntegration.mutateAsync({ key, config });
    } catch (error) {
      console.error('Failed to connect integration:', error);
    }
  };

  const handleDisconnectIntegration = async (key: string) => {
    try {
      await disconnectIntegration.mutateAsync(key);
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  const toggleEvent = (event: WebhookEvent) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  // Merge API data with UI-specific display data
  const integrationsWithUI = integrations.map((i: Integration) => ({
    ...i,
    logo: INTEGRATION_UI_DATA[i.integrationKey]?.logo || '🔌',
    configFields: INTEGRATION_UI_DATA[i.integrationKey]?.configFields,
  }));
  const connectedIntegrations = integrationsWithUI.filter((i: IntegrationDisplay) => i.isConnected);
  const availableIntegrations = integrationsWithUI.filter((i: IntegrationDisplay) => !i.isConnected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Integration Hub</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage webhooks and third-party connections</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg w-fit">
        {(['webhooks', 'integrations', 'usage'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab === 'webhooks' && <WebhookIcon size={14} className="inline mr-1.5" />}
            {tab === 'integrations' && <Plug size={14} className="inline mr-1.5" />}
            {tab === 'usage' && <BarChart3 size={14} className="inline mr-1.5" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured</span>
            <button
              onClick={handleCreateWebhook}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
            >
              <Plus size={14} />
              Create Webhook
            </button>
          </div>

          <div className="space-y-3">
            {webhooks.map(webhook => (
              <div
                key={webhook.id}
                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${webhook.isActive ? 'bg-[var(--color-success)]' : 'bg-[var(--text-muted)]'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{webhook.name}</span>
                        {webhook.tenantId && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded">
                            TENANT-SPECIFIC
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{webhook.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map(event => (
                          <span
                            key={event}
                            className="text-[10px] px-1.5 py-0.5 bg-[var(--color-brand-subtle)] text-[var(--color-brand)] rounded"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {webhook.lastDeliveryStatus && (
                      <div className="text-right mr-4">
                        <p className="text-xs text-[var(--text-muted)]">Last delivery</p>
                        <p className="text-xs font-medium" style={{ color: getStatusColor(webhook.lastDeliveryStatus) }}>
                          {webhook.lastDeliveryStatus}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedWebhookId(webhook.id)}
                      className="p-2 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="p-2 rounded hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Delivery Log */}
                <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
                  <button
                    onClick={() => setExpandedDeliveries(prev => ({ ...prev, [webhook.id]: !prev[webhook.id] }))}
                    className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {expandedDeliveries[webhook.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    Recent Deliveries
                  </button>
                  {expandedDeliveries[webhook.id] && (
                    <div className="mt-2 space-y-1">
                      {deliveries.filter((d: WebhookDelivery) => d.webhookId === webhook.id).map((delivery: WebhookDelivery) => (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] rounded text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="font-bold"
                              style={{ color: getStatusColor(delivery.responseStatus) }}
                            >
                              {delivery.responseStatus}
                            </span>
                            <span className="text-[var(--text-muted)]">{delivery.eventType}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[var(--text-muted)]">
                            {delivery.attempts > 1 && (
                              <span className="flex items-center gap-1">
                                <RefreshCw size={10} />
                                {delivery.attempts} attempts
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(delivery.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Connected */}
          {connectedIntegrations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Connected ({connectedIntegrations.length})
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {connectedIntegrations.map(integration => (
                  <div
                    key={integration.id}
                    className="bg-[var(--bg-secondary)] border border-[var(--color-success)]/30 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.logo}</span>
                        <div>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{integration.name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Check size={10} className="text-[var(--color-success)]" />
                            <span className="text-[10px] text-[var(--color-success)]">Connected</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-3">{integration.description}</p>
                    <button
                      onClick={() => setSelectedIntegration(integration)}
                      className="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
                    >
                      Configure
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Available ({availableIntegrations.length})
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {availableIntegrations.map(integration => (
                <div
                  key={integration.id}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.logo}</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{integration.name}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-3">{integration.description}</p>
                  <button
                    onClick={() => setSelectedIntegration(integration)}
                    className="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Total Requests (24h)
              </span>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">12,847</div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Success Rate
              </span>
              <div className="mt-2 text-2xl font-bold text-[var(--color-success)]">98.7%</div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Failed Deliveries
              </span>
              <div className="mt-2 text-2xl font-bold text-[var(--color-error)]">167</div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Avg Response Time
              </span>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">245ms</div>
            </div>
          </div>

          {/* Per-Integration Stats */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg">
            <div className="px-4 py-3 border-b border-[var(--border-primary)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Requests by Integration</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-tertiary)]">
                  <th className="px-4 py-3">Integration</th>
                  <th className="px-4 py-3">Requests (24h)</th>
                  <th className="px-4 py-3">Success Rate</th>
                  <th className="px-4 py-3">Avg Latency</th>
                  <th className="px-4 py-3">Rate Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {connectedIntegrations.map(integration => (
                  <tr key={integration.id} className="hover:bg-[var(--hover-overlay)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{integration.logo}</span>
                        <span className="text-sm text-[var(--text-primary)]">{integration.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {Math.floor(Math.random() * 5000)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--color-success)]">
                        {(95 + Math.random() * 5).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {Math.floor(100 + Math.random() * 200)}ms
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full max-w-[60px]">
                          <div
                            className="h-full bg-[var(--color-success)] rounded-full"
                            style={{ width: `${30 + Math.random() * 40}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">OK</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Webhook Panel */}
      <SlideOutPanel
        isOpen={showCreateWebhook || !!selectedWebhook}
        onClose={() => {
          setShowCreateWebhook(false);
          setSelectedWebhookId(null);
          setTestResult(null);
        }}
        title={selectedWebhook ? 'Edit Webhook' : 'Create Webhook'}
        width="lg"
        footer={
          <div className="flex items-center justify-between">
            <button
              onClick={() => selectedWebhookId && handleTestWebhook()}
              disabled={!webhookForm.url || testWebhookMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] disabled:opacity-50"
            >
              {testWebhookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={14} />}
              Test Webhook
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateWebhook(false);
                  setSelectedWebhookId(null);
                }}
                className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                Cancel
              </button>
              <button
                onClick={selectedWebhook ? () => handleUpdateWebhook(webhookForm) : handleSaveWebhook}
                disabled={!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0}
                className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                {selectedWebhook ? 'Save Changes' : 'Create Webhook'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {testResult && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              testResult.success ? 'bg-[var(--color-success-soft)]' : 'bg-[var(--color-error-soft)]'
            }`}>
              {testResult.success ? (
                <Check size={16} className="text-[var(--color-success)]" />
              ) : (
                <X size={16} className="text-[var(--color-error)]" />
              )}
              <span className={`text-sm ${testResult.success ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                {testResult.message}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Webhook Name
            </label>
            <input
              type="text"
              value={webhookForm.name}
              onChange={(e) => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Production Notifications"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Endpoint URL
            </label>
            <input
              type="url"
              value={webhookForm.url}
              onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://api.example.com/webhooks"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Signing Secret
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)]"
              />
              <button
                onClick={() => setWebhookForm(prev => ({ ...prev, secret: crypto.randomUUID().slice(0, 32) }))}
                className="px-3 py-2 rounded-md text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                Regenerate
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Use this secret to verify webhook signatures
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Tenant (optional)
            </label>
            <input
              type="text"
              value={webhookForm.tenantId}
              onChange={(e) => setWebhookForm(prev => ({ ...prev, tenantId: e.target.value }))}
              placeholder="Leave empty for global webhook"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Events to Subscribe
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {WEBHOOK_EVENTS.map(({ event, label, description }) => (
                <label
                  key={event}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    webhookForm.events.includes(event)
                      ? 'bg-[var(--color-brand-subtle)] border border-[var(--color-brand)]/30'
                      : 'bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-primary)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={webhookForm.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
                    <p className="text-xs text-[var(--text-muted)]">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </SlideOutPanel>

      {/* Integration Config Panel */}
      <SlideOutPanel
        isOpen={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
        title={`${selectedIntegration?.isConnected ? 'Configure' : 'Connect'} ${selectedIntegration?.name}`}
        width="md"
        footer={
          <div className="flex justify-end gap-2">
            {selectedIntegration?.isConnected && (
              <button 
                onClick={() => selectedIntegration && handleDisconnectIntegration(selectedIntegration.integrationKey)}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
              >
                <X size={14} />
                Disconnect
              </button>
            )}
            <button
              onClick={() => setSelectedIntegration(null)}
              className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
            >
              Cancel
            </button>
            <button 
              onClick={() => selectedIntegration && handleConnectIntegration(selectedIntegration.integrationKey, {})}
              className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
            >
              {selectedIntegration?.isConnected ? 'Save' : 'Connect'}
            </button>
          </div>
        }
      >
        {selectedIntegration && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{selectedIntegration.logo}</span>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{selectedIntegration.name}</h3>
                <p className="text-sm text-[var(--text-muted)]">{selectedIntegration.description}</p>
              </div>
            </div>

            {selectedIntegration.configFields ? (
              <div className="space-y-4">
                {selectedIntegration.configFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      {field.label}
                      {field.required && <span className="text-[var(--color-error)] ml-1">*</span>}
                    </label>
                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      placeholder={field.label}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  This integration uses OAuth for authentication
                </p>
                <button className="flex items-center gap-2 mx-auto px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]">
                  <ExternalLink size={14} />
                  Connect with {selectedIntegration.name}
                </button>
              </div>
            )}
          </div>
        )}
      </SlideOutPanel>
    </div>
  );
}
