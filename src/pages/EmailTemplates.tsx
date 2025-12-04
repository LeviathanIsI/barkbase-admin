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
import {
  useEmailTemplates,
  useEmailTemplate,
  useUpdateEmailTemplate,
  useEmailTemplateVersions,
  useRestoreEmailTemplateVersion,
  useSendTestEmail,
} from '@/hooks/useApi';
import type {
  EmailTemplate,
  EmailBlock,
  EmailTemplateVersion,
  EmailBlockType,
} from '@/types';

type PreviewMode = 'desktop' | 'mobile';


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

const BLOCK_TYPES: { type: EmailBlockType; label: string; icon: typeof Type }[] = [
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [showVariables, setShowVariables] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  // API hooks
  const { data: templatesData, isLoading: isLoadingTemplates } = useEmailTemplates();
  const { data: selectedTemplateData } = useEmailTemplate(selectedTemplateId || '');
  const { data: versionsData } = useEmailTemplateVersions(selectedTemplateId || '');
  const updateTemplate = useUpdateEmailTemplate(selectedTemplateId || '');
  const restoreVersion = useRestoreEmailTemplateVersion(selectedTemplateId || '');
  const sendTestEmailMutation = useSendTestEmail(selectedTemplateId || '');

  const templates = templatesData?.templates || [];
  const selectedTemplate = selectedTemplateData?.template || null;
  const versions = versionsData?.versions || [];

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplateId(template.id);
    setEditedTemplate({ ...template });
    setIsEditing(true);
  };

  const handleAddBlock = (type: EmailBlockType) => {
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
    if (!testEmail) return;
    try {
      await sendTestEmailMutation.mutateAsync(testEmail);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to send test email:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editedTemplate || !selectedTemplateId) return;
    try {
      await updateTemplate.mutateAsync({
        subject: editedTemplate.subject,
        previewText: editedTemplate.previewText,
        blocks: editedTemplate.blocks,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleRestoreVersion = async (version: number) => {
    try {
      await restoreVersion.mutateAsync(version);
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  const insertVariable = (variable: string) => {
    // In real app, would insert at cursor position
    navigator.clipboard.writeText(variable);
  };

  if (isLoadingTemplates) {
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
          {versions.map((version: EmailTemplateVersion, idx: number) => (
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
                <button 
                  onClick={() => handleRestoreVersion(version.version)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--color-brand)] hover:bg-[var(--hover-overlay)]"
                >
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
