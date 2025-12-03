import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Loader2,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Building2,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowUpCircle,
  ExternalLink,
  ChevronRight,
  X,
  Send,
  Lock,
} from 'lucide-react';
import {
  useTickets,
  useTicket,
  useTicketMessages,
  useTicketActivity,
  useTicketStats,
  useCreateTicket,
  useUpdateTicket,
  useCreateTicketMessage,
  usePortalLookup,
  useGenerateImpersonationToken,
} from '@/hooks/useTickets';
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  CreateTicketInput,
} from '@/types';

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'text-blue-400 bg-blue-400/10', icon: <Circle size={12} /> },
  in_progress: { label: 'In Progress', color: 'text-yellow-400 bg-yellow-400/10', icon: <Clock size={12} /> },
  pending_customer: { label: 'Pending', color: 'text-orange-400 bg-orange-400/10', icon: <AlertCircle size={12} /> },
  resolved: { label: 'Resolved', color: 'text-green-400 bg-green-400/10', icon: <CheckCircle2 size={12} /> },
  closed: { label: 'Closed', color: 'text-gray-400 bg-gray-400/10', icon: <CheckCircle2 size={12} /> },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-400' },
  normal: { label: 'Normal', color: 'text-blue-400' },
  high: { label: 'High', color: 'text-orange-400' },
  urgent: { label: 'Urgent', color: 'text-red-400' },
};

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'billing', label: 'Billing' },
  { value: 'account', label: 'Account' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
];

function TicketStats() {
  const { data, isLoading } = useTicketStats();
  const stats = data?.stats;

  if (isLoading) {
    return (
      <div className="flex items-center gap-6 py-2 px-4 bg-[var(--bg-tertiary)] rounded-lg animate-pulse">
        <div className="h-4 w-32 bg-[var(--bg-secondary)] rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 py-2 px-4 bg-[var(--bg-tertiary)] rounded-lg text-sm">
      <div className="flex items-center gap-2">
        <Circle size={8} className="text-blue-400 fill-blue-400" />
        <span className="text-[var(--text-muted)]">Open:</span>
        <span className="font-semibold text-[var(--text-primary)]">{stats?.open_count || 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock size={12} className="text-yellow-400" />
        <span className="text-[var(--text-muted)]">In Progress:</span>
        <span className="font-semibold text-[var(--text-primary)]">{stats?.in_progress_count || 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <AlertCircle size={12} className="text-orange-400" />
        <span className="text-[var(--text-muted)]">Pending:</span>
        <span className="font-semibold text-[var(--text-primary)]">{stats?.pending_count || 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle2 size={12} className="text-green-400" />
        <span className="text-[var(--text-muted)]">Resolved Today:</span>
        <span className="font-semibold text-[var(--text-primary)]">{stats?.resolved_today || 0}</span>
      </div>
      {stats?.avg_response_hours !== null && (
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-muted)]">Avg Response:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {stats?.avg_response_hours?.toFixed(1) || '-'}h
          </span>
        </div>
      )}
    </div>
  );
}

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const [portalId, setPortalId] = useState('');
  const [formData, setFormData] = useState<Partial<CreateTicketInput>>({
    priority: 'normal',
    category: 'technical',
  });

  const { data: portalData, isLoading: isLookingUp, error: lookupError } = usePortalLookup(portalId);
  const createTicket = useCreateTicket();

  const handleLookup = () => {
    if (portalData?.portal) {
      setFormData(prev => ({
        ...prev,
        portal_id: portalData.portal.id,
        customer_name: portalData.portal.owner_name || '',
        customer_email: portalData.portal.owner_email || '',
        business_name: portalData.portal.name,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.portal_id || !formData.customer_name || !formData.customer_email || !formData.subject) {
      return;
    }

    try {
      await createTicket.mutateAsync(formData as CreateTicketInput);
      onClose();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-lg w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create New Ticket</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Portal ID Lookup */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Portal ID *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={portalId}
                onChange={(e) => setPortalId(e.target.value)}
                placeholder="Enter tenant UUID..."
                className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={!portalData?.portal || isLookingUp}
                className="px-3 py-2 bg-[var(--color-brand)] text-white rounded-md text-sm hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                {isLookingUp ? <Loader2 size={16} className="animate-spin" /> : 'Lookup'}
              </button>
            </div>
            {lookupError && (
              <p className="mt-1 text-xs text-red-400">Portal not found</p>
            )}
            {portalData?.portal && (
              <div className="mt-2 p-2 bg-[var(--bg-tertiary)] rounded text-xs">
                <p className="font-medium text-[var(--text-primary)]">{portalData.portal.name}</p>
                <p className="text-[var(--text-muted)]">{portalData.portal.owner_email}</p>
              </div>
            )}
          </div>

          {/* Auto-populated fields */}
          {formData.portal_id && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of the issue..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category || 'technical'}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TicketCategory }))}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority || 'normal'}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TicketPriority }))}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Detailed description of the issue..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm resize-none"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.portal_id || !formData.subject || createTicket.isPending}
              className="px-4 py-2 bg-[var(--color-brand)] text-white rounded-md text-sm hover:bg-[var(--color-brand-hover)] disabled:opacity-50 flex items-center gap-2"
            >
              {createTicket.isPending && <Loader2 size={14} className="animate-spin" />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketDetailPanel({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const { data: ticketData, isLoading: isLoadingTicket } = useTicket(ticketId);
  const { data: messagesData, isLoading: isLoadingMessages } = useTicketMessages(ticketId);
  const { data: activityData } = useTicketActivity(ticketId);
  const updateTicket = useUpdateTicket(ticketId);
  const createMessage = useCreateTicketMessage(ticketId);
  const generateToken = useGenerateImpersonationToken();

  const ticket = ticketData?.ticket;
  const messages = messagesData?.messages || [];
  const activity = activityData?.activity || [];

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    await createMessage.mutateAsync({ message: replyText, isInternal });
    setReplyText('');
  };

  const handleImpersonate = async () => {
    if (!ticket) return;
    try {
      const result = await generateToken.mutateAsync({
        portalId: ticket.portal_id,
        ticketId: ticket.id,
      });
      window.open(result.url, '_blank');
    } catch (error) {
      console.error('Failed to generate impersonation token:', error);
    }
  };

  if (isLoadingTicket) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
        Ticket not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
            &larr; Back to Tickets
          </button>
          <span className="text-sm font-mono text-[var(--text-muted)]">#{ticket.ticket_number}</span>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{ticket.subject}</h2>
      </div>

      {/* Customer & Ticket Info */}
      <div className="p-4 border-b border-[var(--border-primary)] grid grid-cols-2 gap-4">
        {/* Customer Info */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Customer</h3>
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[var(--color-brand)]" />
            <span className="text-sm text-[var(--text-primary)]">{ticket.business_name || 'Unknown'}</span>
          </div>
          <button
            onClick={handleImpersonate}
            className="flex items-center gap-2 text-sm text-[var(--color-brand)] hover:underline"
          >
            <span className="font-mono text-xs">{ticket.portal_id.slice(0, 8)}...</span>
            <ExternalLink size={12} />
          </button>
          <div className="flex items-center gap-2">
            <User size={14} className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)]">{ticket.customer_name}</span>
          </div>
          <div className="text-sm text-[var(--text-muted)]">{ticket.customer_email}</div>
        </div>

        {/* Ticket Info */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Ticket Info</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Status:</span>
            <select
              value={ticket.status}
              onChange={(e) => updateTicket.mutate({ status: e.target.value as TicketStatus })}
              className={`text-xs px-2 py-1 rounded ${STATUS_CONFIG[ticket.status].color} bg-transparent border border-current`}
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Priority:</span>
            <select
              value={ticket.priority}
              onChange={(e) => updateTicket.mutate({ priority: e.target.value as TicketPriority })}
              className={`text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)] ${PRIORITY_CONFIG[ticket.priority].color}`}
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            Created: {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
          </div>
          {ticket.assigned_to_name && (
            <div className="text-xs text-[var(--text-muted)]">
              Assigned to: {ticket.assigned_to_name}
            </div>
          )}
        </div>
      </div>

      {/* Messages/Activity Toggle */}
      <div className="flex border-b border-[var(--border-primary)]">
        <button
          onClick={() => setShowActivity(false)}
          className={`flex-1 py-2 text-sm font-medium ${!showActivity ? 'text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]' : 'text-[var(--text-muted)]'}`}
        >
          Conversation
        </button>
        <button
          onClick={() => setShowActivity(true)}
          className={`flex-1 py-2 text-sm font-medium ${showActivity ? 'text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]' : 'text-[var(--text-muted)]'}`}
        >
          Activity
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {showActivity ? (
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] mt-1.5" />
                <div>
                  <span className="text-[var(--text-secondary)]">{item.action.replace(/_/g, ' ')}</span>
                  {item.actor_name && (
                    <span className="text-[var(--text-muted)]"> by {item.actor_name}</span>
                  )}
                  <span className="text-[var(--text-disabled)] ml-2">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">No messages yet</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.sender_type === 'agent'
                      ? msg.is_internal
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-[var(--color-brand)]/10 border border-[var(--color-brand)]/20'
                      : 'bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {msg.is_internal && <Lock size={12} className="text-yellow-400" />}
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {msg.sender_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        ({msg.sender_type})
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-disabled)]">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Reply Box */}
      {!showActivity && (
        <div className="p-4 border-t border-[var(--border-primary)]">
          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              Internal Note
            </label>
          </div>
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={isInternal ? 'Add internal note...' : 'Write a reply...'}
              rows={2}
              className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm resize-none"
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || createMessage.isPending}
              className="px-4 py-2 bg-[var(--color-brand)] text-white rounded-md hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {createMessage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SupportDesk() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    assigned_to?: string;
    search?: string;
  }>({});

  const { data, isLoading } = useTickets(filters);
  const tickets = data?.tickets || [];

  return (
    <div className="h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Support Desk</h1>
            <p className="text-sm text-[var(--text-muted)]">Manage support tickets and customer issues</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] text-white rounded-md hover:bg-[var(--color-brand-hover)]"
          >
            <Plus size={16} />
            New Ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4">
        <TicketStats />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-muted)]" />
          <select
            value={filters.assigned_to || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, assigned_to: e.target.value || undefined }))}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
          >
            <option value="">All Tickets</option>
            <option value="me">My Tickets</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_customer">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value || undefined }))}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm"
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 h-[calc(100%-180px)]">
        {/* Ticket List */}
        <div className={`${selectedTicketId ? 'w-1/2' : 'w-full'} overflow-y-auto`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No tickets found</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {filters.search || filters.status || filters.priority
                  ? 'Try adjusting your filters'
                  : 'Create a new ticket to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedTicketId === ticket.id
                      ? 'bg-[var(--color-brand)]/10 border-[var(--color-brand)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[var(--text-muted)]">#{ticket.ticket_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_CONFIG[ticket.status].color}`}>
                          {STATUS_CONFIG[ticket.status].label}
                        </span>
                        {ticket.priority !== 'normal' && (
                          <ArrowUpCircle size={14} className={PRIORITY_CONFIG[ticket.priority].color} />
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                        <span>{ticket.business_name || ticket.customer_name}</span>
                        <span>&bull;</span>
                        <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0 ml-2" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ticket Detail Panel */}
        {selectedTicketId && (
          <div className="w-1/2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
            <TicketDetailPanel
              ticketId={selectedTicketId}
              onClose={() => setSelectedTicketId(null)}
            />
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && <CreateTicketModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
