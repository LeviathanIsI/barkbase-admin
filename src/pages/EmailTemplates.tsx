import { useState } from 'react';
import {
  Loader2,
  Edit2,
  Eye,
  Smartphone,
  Monitor,
  History,
  Trash2,
  GripVertical,
  Type,
  Image,
  Square,
  Minus,
  Send,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Check,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';

type BlockType = 'header' | 'text' | 'button' | 'image' | 'divider' | 'footer';
type PreviewMode = 'desktop' | 'mobile';

interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  settings: Record<string, unknown>;
}

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  subject: string;
  previewText: string;
  blocks: EmailBlock[];
  tenantId: string | null;
  version: number;
  isActive: boolean;
  lastEditedAt: string;
  lastEditedBy: string;
}

interface TemplateVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: '1',
    key: 'booking_confirmation',
    name: 'Booking Confirmation',
    description: 'Sent when a booking is confirmed',
    subject: 'Your booking is confirmed! - {{business_name}}',
    previewText: 'Your appointment for {{pet_name}} is all set.',
    blocks: [
      { id: '1', type: 'header', content: '', settings: { logo: true } },
      { id: '2', type: 'text', content: 'Hi {{owner_name}},\n\nYour booking has been confirmed!', settings: {} },
      { id: '3', type: 'text', content: '**Pet:** {{pet_name}}\n**Service:** {{service_name}}\n**Date:** {{booking_date}}\n**Time:** {{booking_time}}', settings: { background: '#f3f4f6' } },
      { id: '4', type: 'button', content: 'View Booking Details', settings: { url: '{{booking_url}}', color: '#3b82f6' } },
      { id: '5', type: 'divider', content: '', settings: {} },
      { id: '6', type: 'footer', content: '{{business_name}} | {{business_address}}', settings: {} },
    ],
    tenantId: null,
    version: 3,
    isActive: true,
    lastEditedAt: '2024-01-10T14:30:00Z',
    lastEditedBy: 'admin@barkbase.com',
  },
  {
    id: '2',
    key: 'reminder_24h',
    name: '24-Hour Reminder',
    description: 'Sent 24 hours before appointment',
    subject: 'Reminder: {{pet_name}}\'s appointment tomorrow',
    previewText: 'Don\'t forget about your appointment tomorrow!',
    blocks: [],
    tenantId: null,
    version: 2,
    isActive: true,
    lastEditedAt: '2024-01-08T10:00:00Z',
    lastEditedBy: 'admin@barkbase.com',
  },
  {
    id: '3',
    key: 'reminder_1h',
    name: '1-Hour Reminder',
    description: 'Sent 1 hour before appointment',
    subject: 'Starting soon: {{pet_name}}\'s appointment',
    previewText: 'Your appointment starts in 1 hour!',
    blocks: [],
    tenantId: null,
    version: 1,
    isActive: true,
    lastEditedAt: '2024-01-05T09:00:00Z',
    lastEditedBy: 'admin@barkbase.com',
  },
  {
    id: '4',
    key: 'payment_receipt',
    name: 'Payment Receipt',
    description: 'Sent after successful payment',
    subject: 'Receipt for your payment - {{business_name}}',
    previewText: 'Thank you for your payment of {{amount}}',
    blocks: [],
    tenantId: null,
    version: 2,
    isActive: true,
    lastEditedAt: '2024-01-12T16:45:00Z',
    lastEditedBy: 'admin@barkbase.com',
  },
  {
    id: '5',
    key: 'welcome',
    name: 'Welcome Email',
    description: 'Sent to new users',
    subject: 'Welcome to {{business_name}}!',
    previewText: 'We\'re excited to have you!',
    blocks: [],
    tenantId: null,
    version: 4,
    isActive: true,
    lastEditedAt: '2024-01-15T11:20:00Z',
    lastEditedBy: 'admin@barkbase.com',
  },
  {
    id: '6',
    key: 'password_reset',
    name: 'Password Reset',
    description: 'Sent when user requests password reset',
    subject: 'Reset your password',
    previewText: 'Click to reset your password',
    blocks: [],
    tenantId: null,
    version: 1,
    isActive: true,
    lastEditedAt: '2024-01-01T00:00:00Z',
    lastEditedBy: 'admin@barkbase.com',
  },
  {
    id: '7',
    key: 'vaccination_reminder',
    name: 'Vaccination Reminder',
    description: 'Sent when vaccinations are due',
    subject: '{{pet_name}}\'s vaccination reminder',
    previewText: 'Time to update vaccinations!',
    blocks: [],
    tenantId: null,
    version: 1,
    isActive: true,
    lastEditedAt: '2024-01-03T08:00:00Z',
    lastEditedBy: 'admin@barkbase.com',
  },
];

const AVAILABLE_VARIABLES = [
  { key: '{{owner_name}}', label: 'Owner Name' },
  { key: '{{owner_email}}', label: 'Owner Email' },
  { key: '{{pet_name}}', label: 'Pet Name' },
  { key: '{{pet_type}}', label: 'Pet Type' },
  { key: '{{service_name}}', label: 'Service Name' },
  { key: '{{booking_date}}', label: 'Booking Date' },
  { key: '{{booking_time}}', label: 'Booking Time' },
  { key: '{{booking_url}}', label: 'Booking URL' },
  { key: '{{business_name}}', label: 'Business Name' },
  { key: '{{business_address}}', label: 'Business Address' },
  { key: '{{amount}}', label: 'Payment Amount' },
  { key: '{{unsubscribe_url}}', label: 'Unsubscribe URL' },
];

const BLOCK_TYPES: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: 'header', label: 'Header', icon: Square },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'button', label: 'Button', icon: Square },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'footer', label: 'Footer', icon: Square },
];

function BlockEditor({
  block,
  onUpdate,
  onDelete,
}: {
  block: EmailBlock;
  onUpdate: (block: EmailBlock) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative bg-[var(--bg-tertiary)] rounded-lg p-3 border border-transparent hover:border-[var(--border-primary)]">
      <div className="flex items-start gap-2">
        <button className="p-1 cursor-grab text-[var(--text-muted)] opacity-0 group-hover:opacity-100">
          <GripVertical size={14} />
        </button>
        <div className="flex-1">
          <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            {block.type}
          </span>
          {block.type === 'text' && (
            <textarea
              value={block.content}
              onChange={(e) => onUpdate({ ...block, content: e.target.value })}
              rows={3}
              className="w-full mt-1 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          )}
          {block.type === 'button' && (
            <div className="mt-1 space-y-2">
              <input
                type="text"
                value={block.content}
                onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                placeholder="Button text"
                className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              />
              <input
                type="text"
                value={(block.settings.url as string) || ''}
                onChange={(e) => onUpdate({ ...block, settings: { ...block.settings, url: e.target.value } })}
                placeholder="Button URL (use {{variables}})"
                className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          )}
          {block.type === 'header' && (
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Displays tenant logo and header styling
            </div>
          )}
          {block.type === 'footer' && (
            <textarea
              value={block.content}
              onChange={(e) => onUpdate({ ...block, content: e.target.value })}
              rows={2}
              placeholder="Footer content..."
              className="w-full mt-1 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          )}
          {block.type === 'divider' && (
            <div className="mt-1 border-t border-[var(--border-primary)]" />
          )}
          {block.type === 'image' && (
            <div className="mt-1 p-4 border-2 border-dashed border-[var(--border-primary)] rounded text-center">
              <Image size={20} className="mx-auto mb-1 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Click to upload</span>
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function EmailPreview({
  template,
  mode,
}: {
  template: EmailTemplate;
  mode: PreviewMode;
}) {
  const width = mode === 'mobile' ? 'max-w-[320px]' : 'max-w-[600px]';

  return (
    <div className={`mx-auto ${width} bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700`}>
      {/* Preview header */}
      <div className="p-3 bg-slate-700 border-b border-slate-600 text-xs text-slate-300">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-slate-400">Subject:</span>
          <span className="text-slate-200">{template.subject}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-medium">Preview:</span>
          <span>{template.previewText}</span>
        </div>
      </div>

      {/* Email content */}
      <div className="p-4">
        {template.blocks.map(block => (
          <div key={block.id} className="mb-3">
            {block.type === 'header' && (
              <div className="p-4 bg-slate-600 rounded text-center">
                <div className="w-24 h-8 bg-slate-400/30 rounded mx-auto" />
              </div>
            )}
            {block.type === 'text' && (
              <div
                className="text-sm text-slate-200 whitespace-pre-wrap"
                style={block.settings.background ? { backgroundColor: '#334155', padding: '12px', borderRadius: '4px' } : {}}
              >
                {block.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-semibold text-slate-100">{line.slice(2, -2)}</p>;
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>
            )}
            {block.type === 'button' && (
              <div className="text-center">
                <button
                  className="px-6 py-2 rounded text-sm text-white font-medium"
                  style={{ backgroundColor: (block.settings.color as string) || 'var(--color-brand)' }}
                >
                  {block.content}
                </button>
              </div>
            )}
            {block.type === 'divider' && (
              <hr className="border-slate-600 my-4" />
            )}
            {block.type === 'image' && (
              <div className="w-full h-32 bg-slate-700 rounded flex items-center justify-center border border-slate-600">
                <Image size={24} className="text-slate-500" />
              </div>
            )}
            {block.type === 'footer' && (
              <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-700">
                {block.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmailTemplates() {
  const [templates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [showVariables, setShowVariables] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({ ...template });
    setIsEditing(true);
  };

  const handleAddBlock = (type: BlockType) => {
    if (!editedTemplate) return;
    const newBlock: EmailBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      settings: {},
    };
    setEditedTemplate({
      ...editedTemplate,
      blocks: [...editedTemplate.blocks, newBlock],
    });
  };

  const handleUpdateBlock = (index: number, block: EmailBlock) => {
    if (!editedTemplate) return;
    const newBlocks = [...editedTemplate.blocks];
    newBlocks[index] = block;
    setEditedTemplate({ ...editedTemplate, blocks: newBlocks });
  };

  const handleDeleteBlock = (index: number) => {
    if (!editedTemplate) return;
    setEditedTemplate({
      ...editedTemplate,
      blocks: editedTemplate.blocks.filter((_, i) => i !== index),
    });
  };

  const handleSendTest = async () => {
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSending(false);
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 3000);
  };

  const insertVariable = (variable: string) => {
    // In real app, would insert at cursor position
    navigator.clipboard.writeText(variable);
  };

  const mockVersions: TemplateVersion[] = [
    { id: '1', version: 3, createdAt: '2024-01-10T14:30:00Z', createdBy: 'admin@barkbase.com' },
    { id: '2', version: 2, createdAt: '2024-01-05T10:00:00Z', createdBy: 'admin@barkbase.com' },
    { id: '3', version: 1, createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Email Templates</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Customize transactional email templates</p>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-3 gap-4">
        {templates.map(template => (
          <div
            key={template.id}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden hover:border-[var(--color-brand)]/50 transition-colors"
          >
            {/* Preview thumbnail */}
            <div className="h-32 bg-[#1e293b] p-3 flex items-center justify-center border-b border-[var(--border-primary)]">
              <div className="w-full max-w-[120px]">
                <div className="h-4 bg-slate-600 rounded-t mb-1" />
                <div className="space-y-1 p-1.5 bg-slate-800 rounded-b border border-slate-700">
                  <div className="h-1 bg-slate-600 rounded w-3/4" />
                  <div className="h-1 bg-slate-600 rounded w-full" />
                  <div className="h-2 bg-[var(--color-brand)] rounded w-1/2 mx-auto mt-2" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">{template.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{template.description}</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 bg-slate-600 text-slate-300 rounded font-medium">
                  v{template.version}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Last edited {new Date(template.lastEditedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsEditing(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
                >
                  <Eye size={12} />
                  Preview
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                >
                  <Edit2 size={12} />
                  Customize
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview/Edit Panel */}
      <SlideOutPanel
        isOpen={!!selectedTemplate}
        onClose={() => {
          setSelectedTemplate(null);
          setEditedTemplate(null);
          setIsEditing(false);
        }}
        title={isEditing ? `Edit: ${selectedTemplate?.name}` : selectedTemplate?.name || ''}
        width="xl"
        footer={
          isEditing ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowTestEmail(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                <Send size={14} />
                Send Test
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]">
                  Save Template
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                <History size={14} />
                Version History
              </button>
              <button
                onClick={() => selectedTemplate && handleEdit(selectedTemplate)}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
              >
                <Edit2 size={14} />
                Edit Template
              </button>
            </div>
          )
        }
      >
        {selectedTemplate && (
          <div className="flex gap-6 h-full">
            {/* Editor */}
            {isEditing && editedTemplate ? (
              <div className="w-1/2 space-y-4 overflow-y-auto pr-4">
                {/* Subject & Preview Text */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={editedTemplate.subject}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Preview Text
                  </label>
                  <input
                    type="text"
                    value={editedTemplate.previewText}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, previewText: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
                  />
                </div>

                {/* Variables */}
                <div>
                  <button
                    onClick={() => setShowVariables(!showVariables)}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showVariables ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    Available Variables
                  </button>
                  {showVariables && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {AVAILABLE_VARIABLES.map(v => (
                        <button
                          key={v.key}
                          onClick={() => insertVariable(v.key)}
                          className="text-[10px] px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--color-brand)] rounded hover:bg-[var(--color-brand-subtle)] font-mono"
                          title={`Click to copy: ${v.label}`}
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blocks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                      Content Blocks
                    </label>
                  </div>
                  <div className="space-y-2">
                    {editedTemplate.blocks.map((block, index) => (
                      <BlockEditor
                        key={block.id}
                        block={block}
                        onUpdate={(b) => handleUpdateBlock(index, b)}
                        onDelete={() => handleDeleteBlock(index)}
                      />
                    ))}
                  </div>

                  {/* Add Block */}
                  <div className="mt-3 pt-3 border-t border-[var(--border-primary)]">
                    <span className="text-xs font-medium text-[var(--text-muted)]">Add Block</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                        <button
                          key={type}
                          onClick={() => handleAddBlock(type)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-1/2 overflow-y-auto pr-4">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">Template Key</span>
                    <p className="text-sm text-[var(--text-primary)] font-mono">{selectedTemplate.key}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">Description</span>
                    <p className="text-sm text-[var(--text-secondary)]">{selectedTemplate.description}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">Subject</span>
                    <p className="text-sm text-[var(--text-primary)]">{selectedTemplate.subject}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">Version</span>
                    <p className="text-sm text-[var(--text-primary)]">v{selectedTemplate.version}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">Last Modified</span>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {new Date(selectedTemplate.lastEditedAt).toLocaleString()} by {selectedTemplate.lastEditedBy}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="w-1/2 bg-[var(--bg-tertiary)] rounded-lg p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[var(--text-muted)]">Preview</span>
                <div className="flex gap-1 p-0.5 bg-[var(--bg-secondary)] rounded">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-[var(--bg-primary)] shadow-sm' : ''}`}
                  >
                    <Monitor size={14} className={previewMode === 'desktop' ? 'text-[var(--color-brand)]' : 'text-[var(--text-muted)]'} />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-[var(--bg-primary)] shadow-sm' : ''}`}
                  >
                    <Smartphone size={14} className={previewMode === 'mobile' ? 'text-[var(--color-brand)]' : 'text-[var(--text-muted)]'} />
                  </button>
                </div>
              </div>
              <EmailPreview template={editedTemplate || selectedTemplate} mode={previewMode} />
            </div>
          </div>
        )}
      </SlideOutPanel>

      {/* Version History Panel */}
      <SlideOutPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Version History"
        width="md"
      >
        <div className="space-y-2">
          {mockVersions.map((version, idx) => (
            <div
              key={version.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                idx === 0 ? 'bg-[var(--color-brand-subtle)] border border-[var(--color-brand)]/30' : 'bg-[var(--bg-tertiary)]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Version {version.version}</span>
                  {idx === 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-[var(--color-brand)] text-white rounded font-medium">
                      CURRENT
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {new Date(version.createdAt).toLocaleString()} by {version.createdBy}
                </p>
              </div>
              {idx > 0 && (
                <button className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--color-brand)] hover:bg-[var(--hover-overlay)]">
                  <RotateCcw size={12} />
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>
      </SlideOutPanel>

      {/* Send Test Email Modal */}
      <SlideOutPanel
        isOpen={showTestEmail}
        onClose={() => {
          setShowTestEmail(false);
          setTestEmail('');
        }}
        title="Send Test Email"
        width="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowTestEmail(false)}
              className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSendTest}
              disabled={!testEmail || isSending}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : sendSuccess ? <Check size={14} /> : <Send size={14} />}
              {sendSuccess ? 'Sent!' : 'Send Test'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Send to Email
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Test email will be sent with sample data filled in for all variables.
          </p>
        </div>
      </SlideOutPanel>
    </div>
  );
}
