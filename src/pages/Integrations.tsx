import { useState } from 'react';
import {
  Loader2,
  Plus,
  Webhook,
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

type WebhookEvent =
  | 'booking.created'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'payment.received'
  | 'payment.failed'
  | 'user.signup'
  | 'user.updated'
  | 'pet.created'
  | 'tenant.created';

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  headers: Record<string, string>;
  tenantId: string | null;
  isActive: boolean;
  createdAt: string;
  lastDelivery?: {
    status: number;
    timestamp: string;
  };
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: WebhookEvent;
  payload: object;
  responseStatus: number;
  responseBody: string;
  attempts: number;
  deliveredAt: string;
  createdAt: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: 'communication' | 'automation' | 'finance' | 'calendar' | 'marketing';
  connected: boolean;
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

const INTEGRATIONS: Integration[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    logo: '💬',
    category: 'communication',
    connected: true,
    configFields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'channel', label: 'Default Channel', type: 'text', required: false },
    ],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5000+ apps via Zapier',
    logo: '⚡',
    category: 'automation',
    connected: false,
    configFields: [
      { key: 'webhook_url', label: 'Zapier Webhook URL', type: 'url', required: true },
    ],
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices and payments',
    logo: '📊',
    category: 'finance',
    connected: false,
    configFields: [
      { key: 'company_id', label: 'Company ID', type: 'text', required: true },
    ],
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sync customer emails for marketing',
    logo: '📧',
    category: 'marketing',
    connected: true,
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'list_id', label: 'Audience List ID', type: 'text', required: true },
    ],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS notifications for bookings',
    logo: '📱',
    category: 'communication',
    connected: false,
    configFields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
      { key: 'from_number', label: 'From Number', type: 'text', required: true },
    ],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync bookings to Google Calendar',
    logo: '📅',
    category: 'calendar',
    connected: false,
  },
];

const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: '1',
    name: 'Production Notifications',
    url: 'https://api.example.com/webhooks/barkbase',
    secret: 'whsec_abc123',
    events: ['booking.created', 'booking.cancelled', 'payment.received'],
    headers: { 'X-Custom-Header': 'value' },
    tenantId: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastDelivery: { status: 200, timestamp: '2024-01-15T10:30:00Z' },
  },
  {
    id: '2',
    name: 'Happy Paws Integration',
    url: 'https://happypaws.com/api/barkbase-webhook',
    secret: 'whsec_xyz789',
    events: ['booking.created', 'user.signup'],
    headers: {},
    tenantId: 'tenant_123',
    isActive: true,
    createdAt: '2024-01-10T00:00:00Z',
    lastDelivery: { status: 500, timestamp: '2024-01-14T15:00:00Z' },
  },
];

const MOCK_DELIVERIES: WebhookDelivery[] = [
  {
    id: '1',
    webhookId: '1',
    eventType: 'booking.created',
    payload: { booking_id: 'book_123', pet_name: 'Max', service: 'Grooming' },
    responseStatus: 200,
    responseBody: '{"success": true}',
    attempts: 1,
    deliveredAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    webhookId: '2',
    eventType: 'user.signup',
    payload: { user_id: 'user_456', email: 'john@example.com' },
    responseStatus: 500,
    responseBody: 'Internal Server Error',
    attempts: 3,
    deliveredAt: '2024-01-14T15:00:00Z',
    createdAt: '2024-01-14T14:55:00Z',
  },
];

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--color-success)';
  if (status >= 400 && status < 500) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export function Integrations() {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'integrations' | 'usage'>('webhooks');
  const [webhooks] = useState<Webhook[]>(MOCK_WEBHOOKS);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [expandedDeliveries, setExpandedDeliveries] = useState<Record<string, boolean>>({});

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

  const [isTesting, setIsTesting] = useState(false);
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

  const handleTestWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate test
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsTesting(false);
    setTestResult({
      success: Math.random() > 0.3,
      message: Math.random() > 0.3 ? 'Webhook received successfully' : 'Connection refused',
    });
  };

  const toggleEvent = (event: WebhookEvent) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const connectedIntegrations = INTEGRATIONS.filter(i => i.connected);
  const availableIntegrations = INTEGRATIONS.filter(i => !i.connected);

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
            {tab === 'webhooks' && <Webhook size={14} className="inline mr-1.5" />}
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
                    {webhook.lastDelivery && (
                      <div className="text-right mr-4">
                        <p className="text-xs text-[var(--text-muted)]">Last delivery</p>
                        <p className="text-xs font-medium" style={{ color: getStatusColor(webhook.lastDelivery.status) }}>
                          {webhook.lastDelivery.status}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedWebhook(webhook)}
                      className="p-2 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-muted)]"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button className="p-2 rounded hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]">
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
                      {MOCK_DELIVERIES.filter(d => d.webhookId === webhook.id).map(delivery => (
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
          setSelectedWebhook(null);
          setTestResult(null);
        }}
        title={selectedWebhook ? 'Edit Webhook' : 'Create Webhook'}
        width="lg"
        footer={
          <div className="flex items-center justify-between">
            <button
              onClick={handleTestWebhook}
              disabled={!webhookForm.url || isTesting}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={14} />}
              Test Webhook
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateWebhook(false);
                  setSelectedWebhook(null);
                }}
                className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                Cancel
              </button>
              <button
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
        title={`${selectedIntegration?.connected ? 'Configure' : 'Connect'} ${selectedIntegration?.name}`}
        width="md"
        footer={
          <div className="flex justify-end gap-2">
            {selectedIntegration?.connected && (
              <button className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-soft)]">
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
            <button className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]">
              {selectedIntegration?.connected ? 'Save' : 'Connect'}
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
